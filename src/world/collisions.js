import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createCollisionWorld(scene) {
  const obstacles = [];
  const obstacleById = new Map();
  const tmpCenter = new THREE.Vector3();

  function makeWasherBoxAt(position) {
    return new THREE.Box3(
      new THREE.Vector3(position.x - 4, 0, position.z - 3.2),
      new THREE.Vector3(position.x + 4, 10, position.z + 2.8),
    );
  }

  const loader = new GLTFLoader();
  loader.load("models/WM_err.glb", (gltf) => {
    let WM = gltf.scene;
    const WM_err = spawnWasher(0);
    const WM_1 = spawnWasher(-9);
    const WM_off = spawnWasher(9);

    function spawnWasher(x) {
      const mesh = WM.clone(true);
      mesh.position.set(x, 0, -10);
      mesh.updateWorldMatrix(true, true);

      const box = makeWasherBoxAt(mesh.position);
      obstacles.push({ mesh, box });

      return mesh;
    }
    WM_err.position.set(0, 0, -10);
    let box_err = makeWasherBoxAt(WM_err.position);

    WM_1.position.set(-9, 0, -10);
    WM_1.updateWorldMatrix(true, true);
    let box_1 = makeWasherBoxAt(WM_1.position);

    WM_off.position.set(9, 0, -10);
    WM_off.updateWorldMatrix(true, true);
    let box_off = makeWasherBoxAt(WM_off.position);

    obstacles.push(
      { mesh: WM_err, box: box_err },
      { mesh: WM_1, box: box_1 },
      { mesh: WM_off, box: box_off },
    );
  });

  let USHANKA = null;
  loader.load("models/USHANKA.glb", async (gltf) => {
    USHANKA = gltf.scene;
    USHANKA.position.set(10, 0, 0);
    USHANKA.scale.set(2, 2, 2);
    USHANKA.rotateY(-1);
    let box = new THREE.Box3().setFromObject(USHANKA);
    obstacles.push({ mesh: USHANKA, box: box });
  });

  function addWasherObstacle(mesh) {
    mesh.updateWorldMatrix(true, true);

    new THREE.Box3().setFromObject(mesh).getCenter(tmpCenter);

    const halfW = 3.85;
    const halfD = 2.8;

    let obs = obstacleById.get(mesh.uuid);
    if (!obs) {
      obs = { mesh, box: new THREE.Box3() };
      obstacles.push(obs);
      obstacleById.set(mesh.uuid, obs);
    }

    obs.box.set(
      new THREE.Vector3(tmpCenter.x - halfW, 0, tmpCenter.z - halfD),
      new THREE.Vector3(tmpCenter.x + halfW, 10, tmpCenter.z + halfD),
    );
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
