import * as THREE from "three";

export function createCollisionWorld(scene) {
  const obstacles = [];

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

  addBoxObstacle({ x: 0, z: -8, w: 18, d: 1, h: 2.5 });
  addBoxObstacle({ x: 0, z: 8, w: 18, d: 1, h: 2.5 });
  addBoxObstacle({ x: -9, z: 0, w: 1, d: 16, h: 2.5 });
  addBoxObstacle({ x: 9, z: 0, w: 1, d: 16, h: 2.5 });

  addBoxObstacle({ x: -3, z: 0, w: 3, d: 2, h: 1.2 });
  addBoxObstacle({ x: 4, z: -2, w: 2, d: 2, h: 1.6 });

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
