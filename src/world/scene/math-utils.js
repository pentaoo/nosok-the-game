export function normalizeAngle(angle) {
  let value = (angle + Math.PI) % (2 * Math.PI);
  if (value < 0) value += 2 * Math.PI;
  return value - Math.PI;
}

export function shortestAngleDelta(current, target) {
  return normalizeAngle(target - current);
}

export function dampAngle(current, target, lambda, dt) {
  const delta = shortestAngleDelta(current, target);
  const t = 1 - Math.exp(-lambda * dt);
  return current + delta * t;
}
