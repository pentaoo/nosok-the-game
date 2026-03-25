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
import { DISPLAY_STANDS } from "./laundry-room.js";

const DEFAULT_DOC_SPAWN = { x: 0, y: 0.05, z: 0, rot: 0, radius: 1.4 };
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

    const washerErr = placeWasher(gltf.scene, 0.2, 0, -15.0, {
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
      washerA.position.set(-13.6, 0, -15.2);
      scene.add(washerA);
      world.washerObstacles.push(washerA);
    }

    const washerB = await createAnimatedWasher(gltf, washerScale, isAlive);
    if (washerB && isAlive()) {
      washerB.position.set(14.8, 0, -10.0);
      scene.add(washerB);
      world.washerObstacles.push(washerB);
    }
  });

  loader.load("models/WM_off.glb", (gltf) => {
    if (!isAlive()) return;

    placeWasher(gltf.scene, 12.4, 0, -15.2, {
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
      const stand = DISPLAY_STANDS.docs[doc.id];
      const spawn = stand
        ? {
            x: stand.x,
            y: stand.topY + 0.04,
            z: stand.z,
            rot: stand.rotation ?? 0,
            radius: stand.radius ?? 1.4,
          }
        : DEFAULT_DOC_SPAWN;

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

  const collectibleConfigs = [
    {
      path: "models/vans.glb",
      itemId: "vans",
      radius: 2.1,
      highlight: { intensity: 0.24, distance: 4.4, yOffset: 1.3 },
      setup(mesh) {
        const stand = DISPLAY_STANDS.items.vans;
        mesh.scale.set(3, 3, 3);
        mesh.updateWorldMatrix(true, true);
        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(stand.x, stand.topY - placedBox.min.y, stand.z);
        mesh.rotation.y = stand.rotation ?? 0;
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
        const stand = DISPLAY_STANDS.items.ushanka;
        mesh.scale.set(2, 2, 2);
        mesh.updateWorldMatrix(true, true);
        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(stand.x, stand.topY - placedBox.min.y, stand.z);
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
        const stand = DISPLAY_STANDS.items.trasher_old;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.2 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(stand.x, stand.topY - placedBox.min.y, stand.z);
        mesh.rotation.y = stand.rotation ?? 0;
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
        const stand = DISPLAY_STANDS.items.uggi;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.95 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(stand.x, stand.topY - placedBox.min.y, stand.z);
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
        const stand = DISPLAY_STANDS.items.jeans;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.1 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(stand.x, stand.topY - placedBox.min.y, stand.z);
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
        const stand = DISPLAY_STANDS.items.sumka;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.8 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);

        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(stand.x, stand.topY - placedBox.min.y, stand.z);
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
