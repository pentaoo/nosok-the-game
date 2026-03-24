import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFlipbookPlane } from "../flipbook_animations.js";
import { DOCS, DOC_TYPES } from "../../data/docs.js";
import { ITEMS } from "../../data/items.js";
import {
  addHighlight,
  applyToyMaterials,
  createFrontInteractionAnchor,
} from "./object-utils.js";

const DOC_SPAWN_POINTS = [
  { x: -14.1, y: 0.05, z: 9.1, rot: Math.PI * 0.08, radius: 1.45 },
  { x: 0.9, y: 3.41, z: 4.8, rot: Math.PI * -0.14, radius: 1.35 },
  { x: -15.0, y: 5.81, z: -10.1, rot: Math.PI * -0.11, radius: 1.3 },
  { x: 16.0, y: 4.61, z: -4.1, rot: Math.PI * 0.1, radius: 1.4 },
  { x: 0.8, y: 6.31, z: -12.0, rot: Math.PI * -0.06, radius: 1.25 },
];

const DEFAULT_DOC_SPAWN = { x: 0, y: 0.05, z: 0, rot: 0 };
const ITEM_HINT_BY_ID = new Map(ITEMS.map((item) => [item.id, item.hint ?? ""]));

async function createAnimatedWasher(gltf, washerScale, isAlive) {
  if (!isAlive()) return null;

  const washer = gltf.scene.clone(true);
  washer.scale.setScalar(washerScale);
  washer.updateWorldMatrix(true, true);
  applyToyMaterials(washer);

  const mixer = new THREE.AnimationMixer(washer);
  const onClip = gltf.animations.find((clip) => clip.name.toLowerCase() === "on");
  const clip = onClip ?? gltf.animations[0] ?? null;
  const action = clip ? mixer.clipAction(clip) : null;
  if (action) {
    action.loop = THREE.LoopRepeat;
    action.clampWhenFinished = false;
    action.play();
  }
  washer.userData.mixer = mixer;

  const washerCenter = new THREE.Object3D();
  washer.add(washerCenter);

  const washerBox = new THREE.Box3().setFromObject(washer);
  const centerWorld = washerBox.getCenter(new THREE.Vector3());
  const washerFront = new THREE.Vector3(centerWorld.x, centerWorld.y, washerBox.max.z - 0.35);
  washer.worldToLocal(washerFront);
  washerCenter.position.copy(washerFront);

  const flipbook = await createFlipbookPlane({
    textureUrl: "flipbook_animations/FBA_WM_1.png",
    frameCols: 1,
    frameRows: 5,
    fps: 8,
    size: 0.75,
    transparent: true,
    emissive: true,
  });

  if (!isAlive()) {
    return null;
  }

  washerCenter.add(flipbook);
  washer.userData.FBA_WM_1 = flipbook;
  return washer;
}

export function spawnWorldContent({
  scene,
  world,
  interactables,
  quests,
  platformTops,
  isLowPower,
  onDocOpen,
  onItemFound,
  onWorldEvent,
  roomMeta,
  lifecycle,
}) {
  const isAlive = () => !lifecycle?.disposed;
  const highlightScale = isLowPower ? 0.7 : 1;

  const collectItem = (mesh, itemId, radius) => {
    interactables.register({
      mesh,
      label: "подобрать вещь",
      description: ITEM_HINT_BY_ID.get(itemId) ?? "",
      onInteract: () => {
        if (mesh.userData.collected || !isAlive()) return;
        mesh.userData.collected = true;
        mesh.visible = false;
        onItemFound?.(itemId);
        quests?.markItemCollected?.(itemId);
      },
      radius,
      isActive: () => !mesh.userData.collected,
    });
  };

  const loader = new GLTFLoader();
  const washerScale = 5;

  const placeWasher = (mesh, x, y, z, highlight = null) => {
    if (!isAlive()) return null;
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(washerScale);
    mesh.updateWorldMatrix(true, true);
    applyToyMaterials(mesh);

    if (highlight) {
      addHighlight(mesh, highlight, highlightScale);
    }

    scene.add(mesh);
    world.washerObstacles.push(mesh);
    return mesh;
  };

  loader.load("models/WM_err.glb", (gltf) => {
    if (!isAlive()) return;

    const washerErr = placeWasher(gltf.scene, 0, 0, -11.2, {
      intensity: 0.18,
      distance: 3.6,
      yOffset: 1.0,
    });

    if (!washerErr) return;

    const washerErrInteractionAnchor = createFrontInteractionAnchor(washerErr, {
      frontInset: 0.65,
      heightFromBase: 1.0,
    });

    interactables.register({
      mesh: washerErr,
      interactionTarget: washerErrInteractionAnchor,
      label: () => quests?.getWasherLabel?.() ?? "постирать вещи",
      description: () => quests?.getWasherDescription?.() ?? "",
      radius: 2.8,
      onInteract: () => {
        if (!isAlive()) return;
        quests?.tryWash?.();
      },
    });
  });

  loader.load("models/WM_1.glb", async (gltf) => {
    if (!isAlive()) return;

    const washerA = await createAnimatedWasher(gltf, washerScale, isAlive);
    if (washerA && isAlive()) {
      washerA.position.set(-10.8, 0, -11.2);
      scene.add(washerA);
      world.washerObstacles.push(washerA);
    }

    const washerB = await createAnimatedWasher(gltf, washerScale, isAlive);
    if (washerB && isAlive()) {
      washerB.position.set(13.0, 0, -6.2);
      scene.add(washerB);
      world.washerObstacles.push(washerB);
    }
  });

  loader.load("models/WM_off.glb", (gltf) => {
    if (!isAlive()) return;

    placeWasher(gltf.scene, 10.8, 0, -11.2, {
      intensity: 0.1,
      distance: 3.2,
      yOffset: 0.9,
    });
  });

  loader.load("models/DOC.glb", (gltf) => {
    if (!isAlive()) return;

    const baseDocMesh = gltf.scene;

    DOCS.forEach((doc, index) => {
      if (!isAlive()) return;

      const mesh = index === 0 ? baseDocMesh : baseDocMesh.clone(true);
      const spawn = DOC_SPAWN_POINTS[index] ?? DEFAULT_DOC_SPAWN;

      mesh.position.set(spawn.x, spawn.y, spawn.z);
      mesh.scale.set(2, 2, 2);
      mesh.rotation.y = spawn.rot ?? 0;

      addHighlight(
        mesh,
        {
          intensity: 0.28,
          distance: 4.8,
          yOffset: 1.1,
        },
        highlightScale
      );

      scene.add(mesh);

      interactables.register({
        mesh,
        label: "прочитать документ",
        description: DOC_TYPES[doc.type]?.hint ?? "Новая находка.",
        onInteract: () => onDocOpen?.(doc.id),
        radius: spawn.radius ?? 1.6,
      });
    });
  });

  for (const mapSwitch of roomMeta?.mapSwitches ?? []) {
    addHighlight(
      mapSwitch.mesh,
      {
        intensity: 0.18,
        distance: 3.6,
        yOffset: 1.2,
      },
      highlightScale
    );

    interactables.register({
      mesh: mapSwitch.mesh,
      interactionTarget: mapSwitch.interactionTarget,
      label: () => mapSwitch.label?.() ?? "переключить механизм",
      description: () => mapSwitch.description?.() ?? "",
      radius: 1.9,
      onInteract: () => {
        if (!isAlive()) return;
        const isActive = mapSwitch.onInteract?.();
        onWorldEvent?.(isActive ? mapSwitch.activeText : mapSwitch.inactiveText, {
          description: isActive
            ? "Маршрут в прачечной изменился."
            : "Карта снова стала компактнее.",
          tone: isActive ? "success" : "warning",
          duration: 1800,
        });
      },
    });
  }

  const collectibleConfigs = [
    {
      path: "models/vans.glb",
      itemId: "vans",
      radius: 2.1,
      highlight: { intensity: 0.24, distance: 4.4, yOffset: 1.3 },
      setup(mesh) {
        mesh.position.set(-15.2, platformTops.loftLeft, -10.0);
        mesh.scale.set(3, 3, 3);
        mesh.userData.collisionPad = 0.12;
        mesh.userData.collisionMaxY = 2.6;
        mesh.userData.collisionPreserveMinY = true;
      },
    },
    {
      path: "models/USHANKA.glb",
      itemId: "ushanka",
      radius: 2.0,
      highlight: { intensity: 0.26, distance: 4.6, yOffset: 1.0 },
      setup(mesh) {
        mesh.position.set(15.8, platformTops.backRightDeck, -8.9);
        mesh.scale.set(2, 2, 2);
        mesh.rotateY(-1);
        mesh.userData.collisionPad = -0.2;
        mesh.userData.collisionMaxY = 1.4;
        mesh.userData.collisionPreserveMinY = true;
      },
    },
    {
      path: "models/trasher_old.glb",
      itemId: "trasher_old",
      radius: 2.4,
      highlight: { intensity: 0.24, distance: 4.2, yOffset: 1.1 },
      setup(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.2 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(4.6, platformTops.topCenter - placedBox.min.y, -5.7);
        mesh.userData.collisionPad = 0.08;
        mesh.userData.collisionMaxY = 2.2;
        mesh.userData.collisionPreserveMinY = true;
      },
    },
    {
      path: "models/uggi.glb",
      itemId: "uggi",
      radius: 2.1,
      highlight: { intensity: 0.25, distance: 4.3, yOffset: 0.95 },
      setup(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.95 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(16.0, platformTops.rightBalcony - placedBox.min.y, -4.1);
        mesh.rotateY(-0.72);
        mesh.userData.collisionPad = 0.02;
        mesh.userData.collisionMaxY = 1.8;
        mesh.userData.collisionPreserveMinY = true;
      },
    },
    {
      path: "models/jeans.glb",
      itemId: "jeans",
      radius: 2.25,
      highlight: { intensity: 0.24, distance: 4.4, yOffset: 1.05 },
      setup(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.1 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(0.9, platformTops.centerLedge - placedBox.min.y, -12.0);
        mesh.rotateY(0.48);
        mesh.userData.collisionPad = 0.04;
        mesh.userData.collisionMaxY = 2.1;
        mesh.userData.collisionPreserveMinY = true;
      },
    },
    {
      path: "models/sumka.glb",
      itemId: "sumka",
      radius: 2.1,
      highlight: { intensity: 0.22, distance: 4.1, yOffset: 0.95 },
      setup(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.8 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(0.4, platformTops.frontCenter - placedBox.min.y, 9.4);
        mesh.rotateY(0.36);
        mesh.userData.collisionPad = 0.02;
        mesh.userData.collisionMaxY = 1.55;
        mesh.userData.collisionPreserveMinY = true;
      },
    },
  ];

  quests?.setCollectibleItemIds?.(collectibleConfigs.map((config) => config.itemId));

  collectibleConfigs.forEach((config) => {
    loader.load(config.path, (gltf) => {
      if (!isAlive()) return;

      const mesh = gltf.scene;
      config.setup(mesh);

      addHighlight(mesh, config.highlight, highlightScale);
      scene.add(mesh);
      world.itemMeshes.push(mesh);
      collectItem(mesh, config.itemId, config.radius);
    });
  });
}
