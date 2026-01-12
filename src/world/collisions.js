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

    WM.updateWorldMatrix(true, true);
    const center = new THREE.Vector3();
    new THREE.Box3().setFromObject(WM).getCenter(center);
    const halfW = 3.85;
    const halfD = 2.8;

    const aabb = new THREE.Box3(
      new THREE.Vector3(center.x - halfW, -Infinity, center.z - halfD),
      new THREE.Vector3(center.x + halfW, Infinity, center.z + halfD)
    );
    obstacles.push({ mesh: WM, box: aabb });
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
