import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createCollisionWorld(scene) {
  const obstacles = [];

  const loader = new GLTFLoader();
  loader.load("/models/WM_err.glb", (gltf) => {
    const WM = gltf.scene;

    WM.position.set(0, 0, -10);
    WM.scale.set(5, 5, 5);

    scene.add(WM);

    // посчитать AABB по модели
    washingMachine.updateWorldMatrix(true, true);
    const aabb = new THREE.Box3().setFromObject(washingMachine);

    // превратить Box3 в "плоский" бокс для твоей 2D-коллизии (XZ)
    boxes.push({
      minX: aabb.min.x,
      maxX: aabb.max.x,
      minZ: aabb.min.z,
      maxZ: aabb.max.z,
    });
  });

  function addBoxObstacle({ x, z, w, d, h = 2 }) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    obstacles.push({ mesh, box });
  }

  function resolveCircleVsBoxes(position, radius) {
    const pos = position.clone();

    for (const obs of obstacles) {
      const b = obs.box;

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

  return { resolveCircleVsBoxes };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
