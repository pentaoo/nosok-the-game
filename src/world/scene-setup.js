import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFlipbookPlane } from "./flipbook_animations.js";
import { createInteractables } from "./interactables.js";
import { openDocById, markItemFound } from "../ui/doc.js";
import { DOCS, DOC_TYPES } from "../data/docs.js";
import { ITEMS } from "../data/items.js";

const DOC_SPAWN_POINTS = [
  { x: 1.2, y: 0.05, z: 1.4, rot: Math.PI * 0.2 },
  { x: -1.1, y: 0.05, z: 1.6, rot: Math.PI * -0.2 },
  { x: 0.6, y: 0.05, z: -1.4, rot: Math.PI * 0.1 },
  { x: -1.4, y: 0.05, z: -1.1, rot: Math.PI * -0.15 },
  { x: 0.0, y: 0.05, z: 2.1, rot: Math.PI * 0.05 },
];
const DEFAULT_DOC_SPAWN = { x: 0, y: 0.05, z: 0, rot: 0 };
const ITEM_HINT_BY_ID = new Map(ITEMS.map((item) => [item.id, item.hint ?? ""]));

function applyToyMaterials(object) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function styleGridMaterial(material) {
  material.opacity = 0.25;
  material.transparent = true;
  material.depthWrite = false;
}

function createSpoolMesh() {
  const spool = new THREE.Group();
  const spoolCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0xffdce8, roughness: 0.5 })
  );
  spoolCore.position.y = 0.2;
  const spoolThread = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.08, 12, 24),
    new THREE.MeshStandardMaterial({ color: 0xfe4aae, roughness: 0.4 })
  );
  spoolThread.rotation.x = Math.PI / 2;
  spoolThread.position.y = 0.2;
  spool.add(spoolCore, spoolThread);
  return spool;
}

async function createAnimatedWasher(gltf, washerScale) {
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
  washerCenter.add(flipbook);
  washer.userData.FBA_WM_1 = flipbook;
  return washer;
}

export function createGameScene(mountEl, { quests = null } = {}) {
  const scene = new THREE.Scene();
  const isLowPower = isLowPowerDevice();
  scene.background = new THREE.Color(0x7fd8ff);

  const world = { washerObstacles: [], itemMeshes: [] };
  const interactables = createInteractables();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  const maxDpr = isLowPower ? 1.75 : 3;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isLowPower ? 1.05 : 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  mountEl.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(80, 1, 0.1, 200);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);
  let yaw = 0;
  let targetYaw = 0;

  const dragState = {
    isDragging: false,
    activePointerId: null,
    lastPointerX: 0,
    manualCooldown: 0,
  };
  const sensitivity = { mouse: 0.0016, touch: 0.0045 };
  const yawDamp = 6;

  const resizeToContainer = () => {
    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resizeToContainer();
  new ResizeObserver(resizeToContainer).observe(mountEl);

  renderer.domElement.addEventListener("pointerdown", (event) => {
    if (dragState.activePointerId !== null) return;
    dragState.isDragging = true;
    dragState.activePointerId = event.pointerId;
    dragState.lastPointerX = event.clientX;
    dragState.manualCooldown = 0.45;
    renderer.domElement.setPointerCapture?.(event.pointerId);
  });

  const endDrag = (event) => {
    if (event && dragState.activePointerId !== event.pointerId) return;
    dragState.isDragging = false;
    dragState.activePointerId = null;
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  window.addEventListener("pointermove", (event) => {
    if (!dragState.isDragging || dragState.activePointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.lastPointerX;
    dragState.lastPointerX = event.clientX;
    const pointerSensitivity =
      event.pointerType === "touch" ? sensitivity.touch : sensitivity.mouse;
    targetYaw -= dx * pointerSensitivity;
    dragState.manualCooldown = 0.45;
  });

  const cameraTarget = new THREE.Vector3();
  const followCamera = (playerPos, dt, playerFacing = null, playerSpeed = 0) => {
    cameraTarget.lerp(playerPos, 1 - Math.pow(0.01, dt));

    if (document.body.classList.contains("touch-ui")) {
      dragState.manualCooldown = Math.max(0, dragState.manualCooldown - dt);
      if (
        !dragState.isDragging &&
        dragState.manualCooldown <= 0 &&
        typeof playerFacing === "number"
      ) {
        const desiredYaw = normalizeAngle(playerFacing + Math.PI);
        const delta = shortestAngleDelta(yaw, desiredYaw);
        let followSpeed = 1.8;
        if (playerSpeed > 0.2) followSpeed = 2.4;
        if (playerSpeed > 0.2 && Math.abs(delta) > Math.PI * 0.6) followSpeed = 3.2;
        targetYaw = dampAngle(targetYaw, desiredYaw, followSpeed, dt);
      }
    }

    yaw = dampAngle(yaw, targetYaw, yawDamp, dt);

    const desired = new THREE.Vector3(
      cameraTarget.x + Math.sin(yaw) * 10,
      cameraTarget.y + 10,
      cameraTarget.z + Math.cos(yaw) * 10
    );
    camera.position.lerp(desired, 1 - Math.pow(0.01, dt));
    camera.lookAt(cameraTarget.x, cameraTarget.y + 0.8, cameraTarget.z);
  };

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, isLowPower ? 1.1 : 1.35);
  dir.position.set(8, 14, 6);
  dir.castShadow = true;
  const shadowMap = isLowPower ? 512 : 2048;
  dir.shadow.mapSize.set(shadowMap, shadowMap);
  dir.shadow.camera.near = 2;
  dir.shadow.camera.far = 55;
  const shadowSize = isLowPower ? 14 : 22;
  dir.shadow.camera.left = -shadowSize;
  dir.shadow.camera.right = shadowSize;
  dir.shadow.camera.top = shadowSize;
  dir.shadow.camera.bottom = -shadowSize;
  dir.shadow.bias = -0.00035;
  dir.shadow.normalBias = 0.03;
  dir.shadow.radius = 0;
  scene.add(dir);

  const fill = new THREE.DirectionalLight(0xffffff, isLowPower ? 0.35 : 0.5);
  fill.position.set(-8, 6, -10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, isLowPower ? 0.18 : 0.28);
  rim.position.set(0, 10, -12);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0xeaf7ff,
      roughness: 0.78,
      metalness: 0.05,
      emissive: 0x9fdfff,
      emissiveIntensity: 0.12,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(500, 500, 0x9fd6ff, 0xc9ecff);
  grid.position.y = 0.001;
  if (Array.isArray(grid.material)) {
    grid.material.forEach(styleGridMaterial);
  } else {
    styleGridMaterial(grid.material);
  }
  scene.add(grid);

  const highlightScale = isLowPower ? 0.7 : 1;
  const addHighlight = (
    object,
    { intensity = 0.24, distance = 4.2, yOffset = 1.2 } = {}
  ) => {
    if (!object) return;
    applyToyMaterials(object);
    if (intensity <= 0) return;
    const glow = new THREE.PointLight(0xffffff, intensity * highlightScale, distance, 2);
    glow.position.set(0, yOffset, 0);
    glow.castShadow = false;
    object.add(glow);
  };

  const collectItem = (mesh, itemId, radius) => {
    interactables.register({
      mesh,
      label: "подобрать вещь",
      description: ITEM_HINT_BY_ID.get(itemId) ?? "",
      onInteract: () => {
        if (mesh.userData.collected) return;
        mesh.userData.collected = true;
        mesh.visible = false;
        markItemFound(itemId);
        quests?.markItemCollected?.(itemId);
      },
      radius,
      isActive: () => !mesh.userData.collected,
    });
  };

  const loader = new GLTFLoader();
  const washerScale = 5;
  const placeWasher = (mesh, x, y, z, highlight = null) => {
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(washerScale);
    mesh.updateWorldMatrix(true, true);
    applyToyMaterials(mesh);
    if (highlight) addHighlight(mesh, highlight);
    scene.add(mesh);
    world.washerObstacles.push(mesh);
    return mesh;
  };

  loader.load("models/WM_err.glb", (gltf) => {
    const washerErr = placeWasher(gltf.scene, 0, 0, -10, {
      intensity: 0.18,
      distance: 3.6,
      yOffset: 1.0,
    });

    interactables.register({
      mesh: washerErr,
      label: () => quests?.getWasherLabel?.() ?? "постирать вещи",
      description: () => quests?.getWasherDescription?.() ?? "",
      radius: 2.6,
      onInteract: () => {
        quests?.tryWash?.();
      },
    });
  });

  loader.load("models/WM_1.glb", async (gltf) => {
    const washerA = await createAnimatedWasher(gltf, washerScale);
    washerA.position.set(-9, 0, -10);
    scene.add(washerA);

    const washerB = await createAnimatedWasher(gltf, washerScale);
    washerB.position.set(18, 0, -10);
    scene.add(washerB);

    world.washerObstacles.push(washerA, washerB);
  });

  loader.load("models/WM_off.glb", (gltf) => {
    placeWasher(gltf.scene, 9, 0, -10);
  });

  loader.load("models/DOC.glb", (gltf) => {
    const baseDocMesh = gltf.scene;
    DOCS.forEach((doc, index) => {
      const mesh = index === 0 ? baseDocMesh : baseDocMesh.clone(true);
      const spawn = DOC_SPAWN_POINTS[index] ?? DEFAULT_DOC_SPAWN;
      mesh.position.set(spawn.x, spawn.y, spawn.z);
      mesh.scale.set(2, 2, 2);
      mesh.rotation.y = spawn.rot ?? 0;
      addHighlight(mesh, {
        intensity: 0.28,
        distance: 4.8,
        yOffset: 1.1,
      });
      scene.add(mesh);

      interactables.register({
        mesh,
        label: "прочитать документ",
        description: DOC_TYPES[doc.type]?.hint ?? "Новая находка.",
        onInteract: () => openDocById(doc.id),
        radius: 1.6,
      });
    });
  });

  const collectibleConfigs = [
    {
      path: "models/vans.glb",
      itemId: "vans",
      radius: 4.6,
      highlight: { intensity: 0.24, distance: 4.4, yOffset: 1.3 },
      setup(mesh) {
        mesh.position.set(-10, 0, 0);
        mesh.scale.set(3, 3, 3);
        mesh.userData.collisionPad = 0.12;
        mesh.userData.collisionMaxY = 2.6;
      },
    },
    {
      path: "models/USHANKA.glb",
      itemId: "ushanka",
      radius: 2.4,
      highlight: { intensity: 0.26, distance: 4.6, yOffset: 1.0 },
      setup(mesh) {
        mesh.position.set(10, 0, 0);
        mesh.scale.set(2, 2, 2);
        mesh.rotateY(-1);
        mesh.userData.collisionPad = -0.2;
        mesh.userData.collisionMaxY = 1.4;
      },
    },
    {
      path: "models/trasher_old.glb",
      itemId: "trasher_old",
      radius: 3.2,
      highlight: { intensity: 0.24, distance: 4.2, yOffset: 1.1 },
      setup(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.2 / Math.max(size.x, size.y, size.z, 0.001);
        mesh.scale.setScalar(scale);
        mesh.updateWorldMatrix(true, true);
        const placedBox = new THREE.Box3().setFromObject(mesh);
        mesh.position.set(0, -placedBox.min.y, 8);
        mesh.userData.collisionPad = 0.08;
        mesh.userData.collisionMaxY = 2.2;
      },
    },
  ];

  quests?.setCollectibleItemIds?.(collectibleConfigs.map((config) => config.itemId));

  collectibleConfigs.forEach((config) => {
    loader.load(config.path, (gltf) => {
      const mesh = gltf.scene;
      config.setup(mesh);
      addHighlight(mesh, config.highlight);
      scene.add(mesh);
      world.itemMeshes.push(mesh);
      collectItem(mesh, config.itemId, config.radius);
    });
  });

  const spool = createSpoolMesh();
  spool.position.set(4.2, 0.02, -6.4);
  spool.userData.collisionPad = -0.12;
  spool.userData.collisionMaxY = 1.2;
  addHighlight(spool, {
    intensity: 0.22,
    distance: 3.8,
    yOffset: 0.5,
  });
  scene.add(spool);
  world.itemMeshes.push(spool);
  collectItem(spool, "spool", 2.0);

  const render = () => {
    renderer.render(scene, camera);
  };

  return {
    scene,
    camera,
    renderer,
    followCamera,
    render,
    world,
    getCameraYaw: () => yaw,
    interactables,
  };
}

function isLowPowerDevice() {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  const smallViewport = window.matchMedia?.("(max-width: 900px)")?.matches;
  const lowMemory =
    typeof navigator !== "undefined" &&
    navigator.deviceMemory &&
    navigator.deviceMemory <= 4;
  return Boolean(coarsePointer || smallViewport || lowMemory);
}

function normalizeAngle(angle) {
  let a = (angle + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

function shortestAngleDelta(current, target) {
  return normalizeAngle(target - current);
}

function dampAngle(current, target, lambda, dt) {
  const delta = shortestAngleDelta(current, target);
  const t = 1 - Math.exp(-lambda * dt);
  return current + delta * t;
}
