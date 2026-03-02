import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MODEL_BY_ITEM_ID = {
  ushanka: "models/USHANKA.glb",
  vans: "models/vans.glb",
  trasher_old: "models/trasher_old.glb",
};

function loadGLTF(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function createSpoolModel() {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdce8,
    roughness: 0.52,
    metalness: 0.04,
  });
  const threadMaterial = new THREE.MeshStandardMaterial({
    color: 0xfe4aae,
    roughness: 0.44,
    metalness: 0.06,
  });

  const topDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24),
    coreMaterial
  );
  const bottomDisc = topDisc.clone();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.9, 24),
    coreMaterial
  );
  const thread = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.31, 0.78, 32, 1, true),
    threadMaterial
  );

  topDisc.position.y = 0.52;
  bottomDisc.position.y = -0.52;
  group.add(topDisc, bottomDisc, core, thread);
  group.rotation.z = -0.22;
  return group;
}

function disposeObject(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material?.dispose?.());
      return;
    }
    node.material?.dispose?.();
  });
}

function normalizeModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.x + size.y + size.z)) return;

  root.position.sub(center);
  root.scale.setScalar(1.9 / Math.max(size.x, size.y, size.z, 0.001));

  const floorBox = new THREE.Box3().setFromObject(root);
  root.position.y -= floorBox.min.y;
}

function prepareModel(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  normalizeModel(root);
}

export function createItemViewer({ mountEl }) {
  if (!(mountEl instanceof HTMLElement)) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 1.5, 3.6);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  mountEl.innerHTML = "";
  mountEl.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.maxWidth = "100%";
  renderer.domElement.style.display = "block";
  mountEl.dataset.state = "idle";

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.minDistance = 1.3;
  controls.maxDistance = 6.5;
  controls.target.set(0, 0.9, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 0.82);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2.8, 4.4, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0004;
  const rim = new THREE.DirectionalLight(0xffffff, 0.4);
  rim.position.set(-2, 2.4, -2.2);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xf1dff9, 0.42);
  scene.add(ambient, key, rim, hemi);

  const shadowDisk = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 48),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.76,
      roughness: 1,
    })
  );
  shadowDisk.rotation.x = -Math.PI / 2;
  shadowDisk.position.y = 0.002;
  shadowDisk.receiveShadow = true;
  scene.add(shadowDisk);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  const loader = new GLTFLoader();
  const sourceCache = new Map();
  const state = {
    rafId: 0,
    running: false,
    loadVersion: 0,
    activeModel: null,
  };

  const tmpCenter = new THREE.Vector3();
  const tmpSize = new THREE.Vector3();
  const tmpDirection = new THREE.Vector3();

  const render = () => {
    controls.update();
    renderer.render(scene, camera);
  };

  const frame = () => {
    if (!state.running) return;
    render();
    state.rafId = window.requestAnimationFrame(frame);
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    frame();
  };

  const stop = () => {
    state.running = false;
    if (!state.rafId) return;
    window.cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  };

  const fitCameraToObject = (object, resetDirection = false) => {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    box.getCenter(tmpCenter);
    box.getSize(tmpSize);
    const radius = Math.max(tmpSize.length() * 0.5, 0.6);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitHeightDistance = radius / Math.sin(fov * 0.5);
    const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.4);
    const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.25;

    controls.target.copy(tmpCenter);

    if (resetDirection) {
      tmpDirection.set(0.46, 0.38, 1).normalize();
    } else {
      tmpDirection.copy(camera.position).sub(controls.target).normalize();
      if (!Number.isFinite(tmpDirection.x) || tmpDirection.lengthSq() < 1e-6) {
        tmpDirection.set(0.46, 0.38, 1).normalize();
      }
    }

    camera.position.copy(tmpCenter).addScaledVector(tmpDirection, distance);
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = Math.max(distance * 12, 64);
    camera.updateProjectionMatrix();

    controls.minDistance = Math.max(distance * 0.45, 0.4);
    controls.maxDistance = Math.max(distance * 4.5, controls.minDistance + 1);
    controls.update();
  };

  const resize = () => {
    const width = Math.max(1, mountEl.clientWidth);
    const height = Math.max(1, mountEl.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (state.activeModel) fitCameraToObject(state.activeModel, false);
    render();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mountEl);

  const clearModel = () => {
    while (modelRoot.children.length) {
      const child = modelRoot.children[0];
      modelRoot.remove(child);
      disposeObject(child);
    }
    state.activeModel = null;
  };

  const getItemModel = async (itemId) => {
    if (itemId === "spool") return createSpoolModel();
    const modelPath = MODEL_BY_ITEM_ID[itemId];
    if (!modelPath) return createSpoolModel();

    let sourceScene = sourceCache.get(modelPath);
    if (!sourceScene) {
      const gltf = await loadGLTF(loader, modelPath);
      sourceScene = gltf.scene;
      sourceCache.set(modelPath, sourceScene);
    }
    return sourceScene.clone(true);
  };

  const showItem = async (itemId) => {
    const version = ++state.loadVersion;
    mountEl.dataset.state = "loading";

    try {
      const model = await getItemModel(itemId);
      if (version !== state.loadVersion) {
        disposeObject(model);
        return;
      }

      clearModel();
      prepareModel(model);
      modelRoot.add(model);
      state.activeModel = model;
      fitCameraToObject(model, true);
      mountEl.dataset.state = "ready";
      resize();
      start();
    } catch (error) {
      if (version !== state.loadVersion) return;
      mountEl.dataset.state = "error";
      console.error("Не удалось загрузить модель предмета:", error);
    }
  };

  const hide = () => stop();

  const dispose = () => {
    stop();
    resizeObserver.disconnect();
    clearModel();
    controls.dispose();
    renderer.dispose();
    mountEl.innerHTML = "";
    mountEl.dataset.state = "idle";
  };

  return { showItem, hide, dispose };
}
