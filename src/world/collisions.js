import * as THREE from "three";

export function createCollisionWorld() {
  const obstacles = [];
  const obstacleById = new Map();

  function getOrCreateObstacle(mesh) {
    let obs = obstacleById.get(mesh.uuid);
    if (!obs) {
      obs = { mesh, box: new THREE.Box3() };
      obstacles.push(obs);
      obstacleById.set(mesh.uuid, obs);
    }
    return obs;
  }

  function removeObstacle(mesh) {
    const obs = mesh ? obstacleById.get(mesh.uuid) : null;
    if (!obs) return;
    obstacleById.delete(mesh.uuid);
    const idx = obstacles.indexOf(obs);
    if (idx >= 0) obstacles.splice(idx, 1);
  }

  function updateObstacleBox(mesh, { padX = 0, padZ = padX, maxY = 0 } = {}) {
    if (!mesh) return;
    if (mesh.visible === false) return removeObstacle(mesh);

    mesh.updateWorldMatrix(true, true);
    const obs = getOrCreateObstacle(mesh);
    obs.box.setFromObject(mesh);
    obs.box.min.y = 0;
    obs.box.max.y = Math.max(maxY, obs.box.max.y);
    obs.box.min.x -= padX;
    obs.box.max.x += padX;
    obs.box.min.z -= padZ;
    obs.box.max.z += padZ;
  }

  function addWasherObstacle(mesh) {
    updateObstacleBox(mesh, { padX: 0.3, padZ: 0.2, maxY: 10 });
  }

  function addItemObstacle(mesh, { pad = -0.08, maxY = 2 } = {}) {
    if (!mesh) return;
    const padValue =
      typeof mesh.userData?.collisionPad === "number"
        ? mesh.userData.collisionPad
        : pad;
    const maxYValue =
      typeof mesh.userData?.collisionMaxY === "number"
        ? mesh.userData.collisionMaxY
        : maxY;
    updateObstacleBox(mesh, { padX: padValue, maxY: maxYValue });
  }

  function resolveCircleVsBoxes(position, radius) {
    const radiusSq = radius * radius;
    for (const obs of obstacles) {
      const b = obs.box;
      if (position.y >= b.max.y) continue;

      const closestX = clamp(position.x, b.min.x, b.max.x);
      const closestZ = clamp(position.z, b.min.z, b.max.z);
      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radiusSq) continue;

      const dist = Math.sqrt(distSq) || 0.0001;
      const overlap = radius - dist;
      position.x += (dx / dist) * overlap;
      position.z += (dz / dist) * overlap;
    }

    return position;
  }

  function getGroundYAt(x, z, baseGroundY = 0) {
    let groundY = baseGroundY;
    for (const obs of obstacles) {
      const b = obs.box;
      const insideXZ = x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z;
      if (insideXZ && Number.isFinite(b.max.y)) {
        groundY = Math.max(groundY, b.max.y);
      }
    }
    return groundY;
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
