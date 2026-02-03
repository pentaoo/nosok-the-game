import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFlipbookPlane } from "./flipbook_animations.js";
import { createInteractables } from "./interactables.js";
import { openDocById, markItemFound } from "../ui/doc.js";
import { DOCS, DOC_TYPES } from "../data/docs.js";
import { ITEMS } from "../data/items.js";

export function createGameScene(mountEl) {
  const scene = new THREE.Scene();
  const isLowPower = isLowPowerDevice();
  const skyColor = new THREE.Color(0x7fd8ff);
  scene.background = skyColor;
  const world = {
    WM_1: null,
    WM_err: null,
    DOC: null,
    USHANKA: null,
    vans: null,
    washerObstacles: [],
    itemMeshes: [],
  };
  const interactables = createInteractables(scene);

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
  const mouseSensitivity = 0.0016;
  const touchSensitivity = 0.0045;
  const yawDamp = 6;
  let isDragging = false;
  let activePointerId = null;
  let lastPointerX = 0;
  let manualCooldown = 0;

  function resizeToContainer() {
    const w = mountEl.clientWidth;
    const h = mountEl.clientHeight;

    if (!w || !h) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resizeToContainer();

  const ro = new ResizeObserver(resizeToContainer);
  ro.observe(mountEl);

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (activePointerId !== null) return;
    isDragging = true;
    activePointerId = e.pointerId;
    lastPointerX = e.clientX;
    manualCooldown = 0.45;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  });

  function endDrag(e) {
    if (e && activePointerId !== e.pointerId) return;
    isDragging = false;
    activePointerId = null;
  }

  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  window.addEventListener("pointermove", (e) => {
    if (!isDragging || activePointerId !== e.pointerId) return;
    const dx = e.clientX - lastPointerX;
    lastPointerX = e.clientX;
    const sens =
      e.pointerType === "touch" ? touchSensitivity : mouseSensitivity;
    targetYaw -= dx * sens;
    manualCooldown = 0.45;
  });

  const cameraTarget = new THREE.Vector3(0, 0, 0);

  function followCamera(playerPos, dt, playerFacing = null, playerSpeed = 0) {
    cameraTarget.lerp(playerPos, 1 - Math.pow(0.01, dt));

    const height = 10;
    const radius = 10;

    const isTouchUI = document.body.classList.contains("touch-ui");
    if (isTouchUI) {
      manualCooldown = Math.max(0, manualCooldown - dt);
      if (
        !isDragging &&
        manualCooldown <= 0 &&
        typeof playerFacing === "number"
      ) {
        const desiredYaw = normalizeAngle(playerFacing + Math.PI);
        const delta = shortestAngleDelta(yaw, desiredYaw);
        let follow = 1.8;
        if (playerSpeed > 0.2) follow = 2.4;
        if (playerSpeed > 0.2 && Math.abs(delta) > Math.PI * 0.6) {
          follow = 3.2;
        }
        targetYaw = dampAngle(targetYaw, desiredYaw, follow, dt);
      }
    }

    yaw = dampAngle(yaw, targetYaw, yawDamp, dt);

    const desired = new THREE.Vector3(
      cameraTarget.x + Math.sin(yaw) * radius,
      cameraTarget.y + height,
      cameraTarget.z + Math.cos(yaw) * radius
    );

    camera.position.lerp(desired, 1 - Math.pow(0.01, dt));

    camera.lookAt(cameraTarget.x, cameraTarget.y + 0.8, cameraTarget.z);
  }

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

  //ПОЛ
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
    for (const mat of grid.material) {
      mat.opacity = 0.25;
      mat.transparent = true;
      mat.depthWrite = false;
    }
  } else {
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    grid.material.depthWrite = false;
  }
  scene.add(grid);

  const highlightScale = isLowPower ? 0.7 : 1;
  function applyToyMaterials(object) {
    if (!object) return;
    object.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  function addHighlight(
    object,
    { intensity = 0.24, distance = 4.2, yOffset = 1.2 } = {}
  ) {
    if (!object) return;
    applyToyMaterials(object);
    if (intensity > 0) {
      const glow = new THREE.PointLight(
        0xffffff,
        intensity * highlightScale,
        distance,
        2
      );
      glow.position.set(0, yOffset, 0);
      glow.castShadow = false;
      object.add(glow);
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  const docSpawnPoints = [
    { x: 1.2, y: 0.05, z: 1.4, rot: Math.PI * 0.2 },
    { x: -1.1, y: 0.05, z: 1.6, rot: Math.PI * -0.2 },
    { x: 0.6, y: 0.05, z: -1.4, rot: Math.PI * 0.1 },
    { x: -1.4, y: 0.05, z: -1.1, rot: Math.PI * -0.15 },
    { x: 0.0, y: 0.05, z: 2.1, rot: Math.PI * 0.05 },
  ];

  let WM_err = null;
  const loader = new GLTFLoader();
  loader.load("models/WM_err.glb", (gltf) => {
    WM_err = gltf.scene;
    WM_err.position.set(0, 0, -10);
    WM_err.scale.set(5, 5, 5);
    WM_err.updateWorldMatrix(true, true);
    applyToyMaterials(WM_err);
    addHighlight(WM_err, {
      intensity: 0.18,
      distance: 3.6,
      yOffset: 1.0,
    });
    scene.add(WM_err);
    world.WM_err = WM_err;
    world.washerObstacles.push(WM_err);
  });

  let WM_1 = null;

  async function spawnWasherFromGltf(gltf) {
    const WM_1 = gltf.scene.clone(true);
    const mixer = new THREE.AnimationMixer(WM_1);
    const clip =
      gltf.animations.find((a) => a.name.toLowerCase() === "on") ??
      gltf.animations[0];
    const action = clip ? mixer.clipAction(clip) : null;
    if (action) {
      action.loop = THREE.LoopRepeat;
      action.clampWhenFinished = false;
      action.play();
    }
    WM_1.userData.mixer = mixer;
    WM_1.userData.playOn = () => action?.reset().play();

    //позиционирование анимки барабабы
    const WM_center = new THREE.Object3D();
    WM_1.add(WM_center);
    const WM_box = new THREE.Box3().setFromObject(WM_1);
    const centerWorld = new THREE.Vector3();
    WM_box.getCenter(centerWorld);
    const WM_front = new THREE.Vector3(
      centerWorld.x,
      centerWorld.y,
      WM_box.max.z - 0.35
    );
    WM_1.worldToLocal(WM_front);
    WM_center.position.copy(WM_front);
    const FBA_WM_1 = await createFlipbookPlane({
      textureUrl: "flipbook_animations/FBA_WM_1.png",
      frameCols: 1,
      frameRows: 5,
      fps: 8,
      size: 0.75,
      transparent: true,
      emissive: true,
    });
    WM_center.add(FBA_WM_1);
    WM_1.userData.FBA_WM_1 = FBA_WM_1;

    // АНИМКА СТИРАЛКИ
    const onClip = gltf.animations.find((a) => a.name === "on");
    const onAction = mixer.clipAction(onClip);
    onAction.play();
    WM_1.userData.mixer = mixer;
    WM_1.userData.actions = {
      on: onAction,
    };

    applyToyMaterials(WM_1);
    return WM_1;
  }

  loader.load("models/WM_1.glb", async (gltf) => {
    WM_1 = gltf.scene;
    world.WM_1 = WM_1;
    WM_1.position.set(9, 0, -10);
    WM_1.scale.set(5, 5, 5);

    const WM_A = await spawnWasherFromGltf(gltf);
    WM_A.position.set(-9, 0, -10);
    scene.add(WM_A);

    const WM_B = await spawnWasherFromGltf(gltf);
    WM_B.position.set(18, 0, -10);
    scene.add(WM_B);

    world.washers = [WM_A, WM_B];
    world.washerObstacles.push(WM_A, WM_B);
    world.assets = world.assets || {};
  });

  let WM_off = null;
  loader.load("models/WM_off.glb", async (gltf) => {
    WM_off = gltf.scene;
    world.WM_off = WM_off;
    WM_off.position.set(9, 0, -10);
    WM_off.scale.set(5, 5, 5);
    applyToyMaterials(WM_off);
    scene.add(WM_off);
    world.washerObstacles.push(WM_off);
  });
  let vans = null;
  loader.load("models/vans.glb", async (gltf) => {
    vans = gltf.scene;
    world.vans = vans;
    vans.position.set(-10, 0, 0);
    vans.scale.set(3, 3, 3);
    vans.userData.collisionPad = 0.12;
    vans.userData.collisionMaxY = 2.6;
    addHighlight(vans, {
      intensity: 0.24,
      distance: 4.4,
      yOffset: 1.3,
    });
    scene.add(vans);
    world.itemMeshes.push(vans);
    interactables.register({
      mesh: vans,
      label: "подобрать вещь",
      description: ITEMS.find((item) => item.id === "vans")?.hint ?? "",
      onInteract: () => {
        if (vans.userData.collected) return;
        vans.userData.collected = true;
        vans.visible = false;
        markItemFound("vans");
      },
      radius: 4.6,
      isActive: () => !vans.userData.collected,
    });
  });
  let DOC = null;
  loader.load("models/DOC.glb", async (gltf) => {
    DOC = gltf.scene;
    world.DOC = DOC;
    DOCS.forEach((doc, index) => {
      const mesh = index === 0 ? DOC : DOC.clone(true);
      const spawn = docSpawnPoints[index] ?? { x: 0, y: 0.05, z: 0, rot: 0 };
      mesh.position.set(spawn.x, spawn.y, spawn.z);
      mesh.scale.set(2, 2, 2);
      mesh.rotation.y = spawn.rot ?? 0;
      addHighlight(mesh, {
        intensity: 0.28,
        distance: 4.8,
        yOffset: 1.1,
      });
      scene.add(mesh);

      const typeHint = DOC_TYPES[doc.type]?.hint ?? "Новая находка.";
      interactables.register({
        mesh,
        label: "прочитать документ",
        description: typeHint,
        onInteract: () => {
          openDocById(doc.id);
        },
        radius: 1.6,
      });
    });
  });
  let USHANKA = null;
  loader.load("models/USHANKA.glb", async (gltf) => {
    USHANKA = gltf.scene;
    world.USHANKA = USHANKA;
    USHANKA.position.set(10, 0, 0);
    USHANKA.scale.set(2, 2, 2);
    USHANKA.rotateY(-1);
    USHANKA.userData.collisionPad = -0.2;
    USHANKA.userData.collisionMaxY = 1.4;
    addHighlight(USHANKA, {
      intensity: 0.26,
      distance: 4.6,
      yOffset: 1.0,
    });
    scene.add(USHANKA);
    world.itemMeshes.push(USHANKA);
    interactables.register({
      mesh: USHANKA,
      label: "подобрать вещь",
      description: ITEMS.find((item) => item.id === "ushanka")?.hint ?? "",
      onInteract: () => {
        if (USHANKA.userData.collected) return;
        USHANKA.userData.collected = true;
        USHANKA.visible = false;
        markItemFound("ushanka");
      },
      radius: 2.4,
      isActive: () => !USHANKA.userData.collected,
    });
  });

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
  interactables.register({
    mesh: spool,
    label: "подобрать вещь",
    description: ITEMS.find((item) => item.id === "spool")?.hint ?? "",
    onInteract: () => {
      if (spool.userData.collected) return;
      spool.userData.collected = true;
      spool.visible = false;
      markItemFound("spool");
    },
    radius: 2.0,
    isActive: () => !spool.userData.collected,
  });

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
