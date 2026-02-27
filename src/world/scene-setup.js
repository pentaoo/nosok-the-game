import * as THREE from "three";
import { createInteractables } from "./interactables.js";
import { createCameraController } from "./scene/camera-controller.js";
import { isLowPowerDevice } from "./scene/device-profile.js";
import { setupEnvironment } from "./scene/environment.js";
import { buildLaundryRoom, PLATFORM_TOPS } from "./scene/laundry-room.js";
import { createBoxMeshFactory } from "./scene/object-utils.js";
import { spawnWorldContent } from "./scene/spawners.js";

function disposeSceneGraph(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;

    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          value.dispose?.();
        }
      }
      material.dispose?.();
    }
  });
}

export function createGameScene(
  mountEl,
  { quests = null, onDocOpen = null, onItemFound = null } = {}
) {
  const scene = new THREE.Scene();
  const isLowPower = isLowPowerDevice();

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

  const cameraController = createCameraController({ camera, domElement: renderer.domElement });

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

  let resizeObserver = null;
  let hasWindowResizeFallback = false;
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resizeToContainer);
    resizeObserver.observe(mountEl);
  } else {
    hasWindowResizeFallback = true;
    window.addEventListener("resize", resizeToContainer);
  }

  setupEnvironment({ scene, isLowPower });

  const addBoxMesh = createBoxMeshFactory({ scene, world });
  buildLaundryRoom({ scene, isLowPower, addBoxMesh, platformTops: PLATFORM_TOPS });

  const lifecycle = { disposed: false };

  spawnWorldContent({
    scene,
    world,
    interactables,
    quests,
    platformTops: PLATFORM_TOPS,
    isLowPower,
    onDocOpen,
    onItemFound,
    lifecycle,
  });

  const render = () => {
    if (lifecycle.disposed) return;
    renderer.render(scene, camera);
  };

  const destroy = () => {
    if (lifecycle.disposed) return;
    lifecycle.disposed = true;

    resizeObserver?.disconnect();
    resizeObserver = null;

    if (hasWindowResizeFallback) {
      window.removeEventListener("resize", resizeToContainer);
      hasWindowResizeFallback = false;
    }

    cameraController.destroy();
    interactables.clear?.();

    disposeSceneGraph(scene);
    scene.clear();

    renderer.renderLists?.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss?.();

    const canvas = renderer.domElement;
    if (canvas?.parentElement === mountEl) {
      mountEl.removeChild(canvas);
    }
  };

  return {
    scene,
    camera,
    renderer,
    followCamera: cameraController.follow,
    render,
    world,
    getCameraYaw: cameraController.getYaw,
    interactables,
    destroy,
  };
}
