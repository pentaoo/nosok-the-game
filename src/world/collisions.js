import * as THREE from "three";

export function createCollisionWorld() {
  const obstacles = [];
  const obstacleById = new Map();
  const EPSILON = 1e-6;

  function getOrCreateObstacle(mesh) {
    let obs = obstacleById.get(mesh.uuid);
    if (!obs) {
      obs = {
        mesh,
        box: new THREE.Box3(),
        lastVisible: null,
        transformSnapshot: null,
      };
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

  function readTransformSnapshot(mesh, snapshot = {}) {
    const { position, quaternion, scale } = mesh;
    snapshot.px = position.x;
    snapshot.py = position.y;
    snapshot.pz = position.z;
    snapshot.qx = quaternion.x;
    snapshot.qy = quaternion.y;
    snapshot.qz = quaternion.z;
    snapshot.qw = quaternion.w;
    snapshot.sx = scale.x;
    snapshot.sy = scale.y;
    snapshot.sz = scale.z;
    return snapshot;
  }

  function hasTransformChanged(mesh, snapshot) {
    if (!snapshot) return true;
    const { position, quaternion, scale } = mesh;
    return (
      Math.abs(position.x - snapshot.px) > EPSILON ||
      Math.abs(position.y - snapshot.py) > EPSILON ||
      Math.abs(position.z - snapshot.pz) > EPSILON ||
      Math.abs(quaternion.x - snapshot.qx) > EPSILON ||
      Math.abs(quaternion.y - snapshot.qy) > EPSILON ||
      Math.abs(quaternion.z - snapshot.qz) > EPSILON ||
      Math.abs(quaternion.w - snapshot.qw) > EPSILON ||
      Math.abs(scale.x - snapshot.sx) > EPSILON ||
      Math.abs(scale.y - snapshot.sy) > EPSILON ||
      Math.abs(scale.z - snapshot.sz) > EPSILON
    );
  }

  function updateObstacleBox(
    mesh,
    { padX = 0, padZ = padX, maxY = 0, preserveMinY = false } = {}
  ) {
    if (!mesh) return;
    const obs = getOrCreateObstacle(mesh);
    const visibilityChanged = obs.lastVisible !== mesh.visible;
    const transformChanged = hasTransformChanged(mesh, obs.transformSnapshot);

    if (!visibilityChanged && !transformChanged) return;

    obs.lastVisible = mesh.visible;
    if (mesh.visible === false) return removeObstacle(mesh);

    mesh.updateWorldMatrix(true, true);
    obs.box.setFromObject(mesh);
    if (!preserveMinY) obs.box.min.y = 0;
    obs.box.max.y = Math.max(maxY, obs.box.max.y);
    obs.box.min.x -= padX;
    obs.box.max.x += padX;
    obs.box.min.z -= padZ;
    obs.box.max.z += padZ;
    obs.transformSnapshot = readTransformSnapshot(mesh, obs.transformSnapshot);
  }

  function addWasherObstacle(mesh) {
    updateObstacleBox(mesh, { padX: 0.3, padZ: 0.2, maxY: 10 });
  }

  function addItemObstacle(mesh, { pad = -0.08, maxY = 2 } = {}) {
    if (!mesh) return;
    const padXValue =
      typeof mesh.userData?.collisionPadX === "number"
        ? mesh.userData.collisionPadX
        : typeof mesh.userData?.collisionPad === "number"
          ? mesh.userData.collisionPad
          : pad;
    const padZValue =
      typeof mesh.userData?.collisionPadZ === "number"
        ? mesh.userData.collisionPadZ
        : padXValue;
    const padValue =
      typeof mesh.userData?.collisionPad === "number" ? mesh.userData.collisionPad : pad;
    const maxYValue =
      typeof mesh.userData?.collisionMaxY === "number"
        ? mesh.userData.collisionMaxY
        : maxY;
    const preserveMinY = Boolean(mesh.userData?.collisionPreserveMinY);
    updateObstacleBox(mesh, {
      padX: typeof mesh.userData?.collisionPadX === "number" ? padXValue : padValue,
      padZ: padZValue,
      maxY: maxYValue,
      preserveMinY,
    });
  }

  function resolveCircleVsBoxes(position, radius, actorBounds = null) {
    const radiusSq = radius * radius;
    const actorMinY =
      typeof actorBounds?.actorMinY === "number" ? actorBounds.actorMinY : position.y;
    const actorMaxY =
      typeof actorBounds?.actorMaxY === "number" ? actorBounds.actorMaxY : position.y;

    for (const obs of obstacles) {
      const b = obs.box;
      if (actorMinY >= b.max.y || actorMaxY <= b.min.y) continue;

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

  function getGroundYAt(x, z, options = 0) {
    const resolvedOptions =
      typeof options === "number"
        ? { baseGroundY: options }
        : options && typeof options === "object"
          ? options
          : {};

    const baseGroundY = resolvedOptions.baseGroundY ?? 0;
    const feetY = resolvedOptions.feetY;
    const stepUp = resolvedOptions.stepUp ?? Infinity;
    const probeDown = resolvedOptions.probeDown ?? Infinity;
    let groundY = baseGroundY;

    for (const obs of obstacles) {
      const b = obs.box;
      const insideXZ = x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z;
      if (!insideXZ || !Number.isFinite(b.max.y)) continue;

      const topY = b.max.y;
      if (typeof feetY === "number") {
        const maxAllowedY = feetY + stepUp;
        const minAllowedY = feetY - probeDown;
        if (topY > maxAllowedY || topY < minAllowedY) continue;
      }

      groundY = Math.max(groundY, topY);
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
