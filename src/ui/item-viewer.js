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
  topDisc.position.y = 0.52;
  const bottomDisc = topDisc.clone();
  bottomDisc.position.y = -0.52;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.9, 24),
    coreMaterial
  );
  const thread = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.31, 0.78, 32, 1, true),
    threadMaterial
  );

  group.add(topDisc, bottomDisc, core, thread);
  group.rotation.z = -0.22;
  return group;
}

function disposeObject(object) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) {
      for (const material of node.material) {
        material?.dispose?.();
      }
      return;
    }
    node.material?.dispose?.();
  });
}

function normalizeModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) {
    return;
  }

  root.position.sub(center);
  const maxSize = Math.max(size.x, size.y, size.z, 0.001);
  const scale = 1.9 / maxSize;
  root.scale.setScalar(scale);

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

  let rafId = 0;
  let isRunning = false;
  let loadVersion = 0;

  function render() {
    controls.update();
    renderer.render(scene, camera);
  }

  function frame() {
    if (!isRunning) return;
    render();
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    frame();
  }

  function stop() {
    isRunning = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function resize() {
    const width = Math.max(1, mountEl.clientWidth);
    const height = Math.max(1, mountEl.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mountEl);

  function clearModel() {
    while (modelRoot.children.length) {
      const child = modelRoot.children.pop();
      if (!child) continue;
      disposeObject(child);
    }
  }

  async function getItemModel(itemId) {
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
  }

  async function showItem(itemId) {
    const version = ++loadVersion;
    mountEl.dataset.state = "loading";

    try {
      const model = await getItemModel(itemId);
      if (version !== loadVersion) {
        disposeObject(model);
        return;
      }

      clearModel();
      prepareModel(model);
      modelRoot.add(model);
      mountEl.dataset.state = "ready";
      controls.update();
      resize();
      start();
    } catch (error) {
      if (version !== loadVersion) return;
      mountEl.dataset.state = "error";
      console.error("Не удалось загрузить модель предмета:", error);
    }
  }

  function hide() {
    stop();
  }

  function dispose() {
    stop();
    resizeObserver.disconnect();
    clearModel();
    controls.dispose();
    renderer.dispose();
    mountEl.innerHTML = "";
    mountEl.dataset.state = "idle";
  }

  return {
    showItem,
    hide,
    dispose,
  };
}
