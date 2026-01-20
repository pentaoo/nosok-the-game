import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createInteractables } from "./interactables.js";
import { createGameScene } from "./scene-setup.js";

export function createCollisionWorld(scene) {
  const obstacles = [];

  const loader = new GLTFLoader();
  loader.load("models/WM_err.glb", (gltf) => {
    const WM_err = gltf.scene;
    WM_err.position.set(0, 0, -10);
    WM_err.scale.set(5, 5, 5);

    WM_err.updateWorldMatrix(true, true);
    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(WM_err).getCenter(center);
    const halfW = 4;
    const halfD = 2.8;

    const WM_err_box = new THREE.Box3(
      new THREE.Vector3(center.x - halfW, 0, center.z - halfD - 0.5),
      new THREE.Vector3(center.x + halfW, 10, center.z + halfD),
    );
    obstacles.push({ mesh: WM_err, box: WM_err_box });
  });
  loader.load("models/WM_1.glb", (gltf) => {
    const WM_1 = gltf.scene;
    WM_1.position.set(9, 0, -10);
    WM_1.scale.set(5, 5, 5);

    WM_1.updateWorldMatrix(true, true);
    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(WM_1).getCenter(center);
    const halfW = 4;
    const halfD = 2.8;

    const WM_1_box = new THREE.Box3(
      new THREE.Vector3(center.x - halfW, 0, center.z - halfD - 0.5),
      new THREE.Vector3(center.x + halfW, 10, center.z + halfD),
    );
    obstacles.push({ mesh: WM_1, box: WM_1_box });
  });

  loader.load("models/USHANKA.glb", async (gltf) => {
    USHANKA = gltf.scene;
    world.USHANKA = USHANKA;
    USHANKA.position.set(0, 0, 0);
    USHANKA.scale.set(2, 2, 2);
    USHANKA.rotateY(-3);
    scene.add(USHANKA);

    WM_1.updateWorldMatrix(true, true);
    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(WM_1).getCenter(center);
    const halfW = 4;
    const halfD = 2.8;

    const WM_1_box = new THREE.Box3(
      new THREE.Vector3(center.x - halfW, 0, center.z - halfD - 0.5),
      new THREE.Vector3(center.x + halfW, 10, center.z + halfD),
    );
    obstacles.push({ mesh: WM_1, box: WM_1_box });
  });
  function addWasherObstacle(mesh) {
    mesh.updateWorldMatrix(true, true);

    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(mesh).getCenter(center);

    const halfW = 3.85;
    const halfD = 2.8;

    const aabb = new THREE.Box3(
      new THREE.Vector3(center.x - halfW, 0, center.z - halfD),
      new THREE.Vector3(center.x + halfW, 10, center.z + halfD),
    );

    obstacles.push({ mesh, box: aabb });
  }

  function resolveCircleVsBoxes(position, radius) {
    const pos = position.clone();

    for (const obs of obstacles) {
      const b = obs.box;

      if (pos.y >= b.max.y) continue;

      const closestX = clamp(pos.x, b.min.x, b.max.x);
      const closestZ = clamp(pos.z, b.min.z, b.max.z);

      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;

      const distSq = dx * dx + dz * dz;
      const rSq = radius * radius;

      if (distSq < rSq) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const overlap = radius - dist;

        const nx = dx / dist;
        const nz = dz / dist;

        pos.x += nx * overlap;
        pos.z += nz * overlap;
      }
    }

    return pos;
  }
  function getGroundYAt(x, z, baseGroundY = 0) {
    let y = baseGroundY;

    for (const obs of obstacles) {
      const b = obs.box;

      const insideXZ =
        x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z;

      if (!insideXZ) continue;

      // верхняя грань препятствия = потенциальный "пол"
      if (b.max.y > y && Number.isFinite(b.max.y)) {
        y = b.max.y;
      }
    }

    return y;
  }

  return { resolveCircleVsBoxes, addWasherObstacle, getGroundYAt };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
