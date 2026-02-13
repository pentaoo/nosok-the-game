import * as THREE from "three";

export function createCollisionWorld() {
  const obstacles = [];
  const obstacleById = new Map();

  function upsertObstacle(mesh) {
    let obs = obstacleById.get(mesh.uuid);
    if (!obs) {
      obs = { mesh, box: new THREE.Box3() };
      obstacles.push(obs);
      obstacleById.set(mesh.uuid, obs);
    }
    return obs;
  }

  function removeObstacle(mesh) {
    const obs = obstacleById.get(mesh.uuid);
    if (!obs) return;
    obstacleById.delete(mesh.uuid);
    const idx = obstacles.indexOf(obs);
    if (idx >= 0) obstacles.splice(idx, 1);
  }

  function addWasherObstacle(mesh) {
    if (!mesh || mesh.visible === false) return;
    mesh.updateWorldMatrix(true, true);
    const obs = upsertObstacle(mesh);
    obs.box.setFromObject(mesh);
    obs.box.min.y = 0;
    obs.box.max.y = Math.max(10, obs.box.max.y);
    obs.box.min.x -= 0.3;
    obs.box.max.x += 0.3;
    obs.box.min.z -= 0.2;
    obs.box.max.z += 0.2;
  }

  function addItemObstacle(mesh, { pad = -0.08, maxY = 2 } = {}) {
    if (!mesh) return;
    if (mesh.visible === false) {
      removeObstacle(mesh);
      return;
    }
    mesh.updateWorldMatrix(true, true);
    const obs = upsertObstacle(mesh);
    const padValue =
      typeof mesh.userData?.collisionPad === "number"
        ? mesh.userData.collisionPad
        : pad;
    const maxYValue =
      typeof mesh.userData?.collisionMaxY === "number"
        ? mesh.userData.collisionMaxY
        : maxY;
    obs.box.setFromObject(mesh);
    obs.box.min.y = 0;
    obs.box.max.y = Math.max(maxYValue, obs.box.max.y);
    obs.box.min.x -= padValue;
    obs.box.max.x += padValue;
    obs.box.min.z -= padValue;
    obs.box.max.z += padValue;
  }
  function resolveCircleVsBoxes(position, radius) {
    const pos = position;

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

  return {
    resolveCircleVsBoxes,
    addWasherObstacle,
    addItemObstacle,
    getGroundYAt,
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
