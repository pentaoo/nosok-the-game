import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFlipbookPlane } from "./flipbook_animations.js";
import { createInteractables } from "./interactables.js";
import { showDOC, initDOCControls } from "../ui/doc.js";

export function createGameScene(mountEl) {
  const scene = new THREE.Scene();
  const world = {
    WM_1: null,
    WM_err: null,
    DOC: null,
    USHANKA: null,
    vans: null,
  };
  const interactables = createInteractables(scene);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
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

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resizeToContainer();

  const ro = new ResizeObserver(() => {
    const w = game.clientWidth;
    const h = game.clientHeight;

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  ro.observe(game);

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
    const sens = e.pointerType === "touch" ? touchSensitivity : mouseSensitivity;
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
      if (!isDragging && manualCooldown <= 0 && typeof playerFacing === "number") {
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
      cameraTarget.z + Math.cos(yaw) * radius,
    );

    camera.position.lerp(desired, 1 - Math.pow(0.01, dt));

    camera.lookAt(cameraTarget.x, cameraTarget.y + 0.8, cameraTarget.z);
  }

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(8, 14, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -20;
  dir.shadow.camera.right = 20;
  dir.shadow.camera.top = 20;
  dir.shadow.camera.bottom = -20;
  scene.add(dir);

  //ПОЛ
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0xfdfffd,
      roughness: 0.95,
      metalness: 0.5,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(500, 500, 0x2a2a2a, 0x1a1a1a);
  grid.position.y = 0.001;
  scene.add(grid);

  function render() {
    renderer.render(scene, camera);
  }

  let WM_err = null;
  const loader = new GLTFLoader();
  loader.load("models/WM_err.glb", (gltf) => {
    WM_err = gltf.scene;
    WM_err.position.set(0, 0, -10);
    WM_err.scale.set(5, 5, 5);
    WM_err.updateWorldMatrix(true, true);
    scene.add(WM_err);
    world.WM_err = WM_err;
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
      WM_box.max.z - 0.35,
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
    world.assets = world.assets || {};
  });

  let WM_off = null;
  loader.load("models/WM_off.glb", async (gltf) => {
    WM_off = gltf.scene;
    world.WM_off = WM_off;
    WM_off.position.set(9, 0, -10);
    WM_off.scale.set(5, 5, 5);
    scene.add(WM_off);
  });
  let vans = null;
  loader.load("models/vans.glb", async (gltf) => {
    vans = gltf.scene;
    world.vans = vans;
    vans.position.set(-10, 0, 0);
    vans.scale.set(3, 3, 3);
    scene.add(vans);
  });
  let DOC = null;
  loader.load("models/DOC.glb", async (gltf) => {
    DOC = gltf.scene;
    world.DOC = DOC;
    DOC.position.set(0, 0.01, 0);
    DOC.scale.set(2, 2, 2);
    DOC.rotateY(-4);
    scene.add(DOC);

    interactables.register({
      mesh: DOC,
      label: "прочитать документ",
      description: "В этом документе точно что-то важное",
      onInteract: () => {
        showDOC();
      },
      radius: 1.6,
    });
  });
  let USHANKA = null;
  loader.load("models/USHANKA.glb", async (gltf) => {
    USHANKA = gltf.scene;
    world.USHANKA = USHANKA;
    USHANKA.position.set(10, 0, 0);
    USHANKA.scale.set(2, 2, 2);
    USHANKA.rotateY(-1);
    scene.add(USHANKA);
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
