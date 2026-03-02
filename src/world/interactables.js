import * as THREE from "three";

export function createInteractables() {
  const items = [];
  const tempWorldPos = new THREE.Vector3();

  const register = (entry) =>
    items.push({ radius: 1.5, isActive: null, interactionTarget: null, ...entry });
  const readValue = (value) => (typeof value === "function" ? value() : value);

  function getBestInteraction(playerPos) {
    let best = null;
    let bestDistSq = Infinity;

    for (const item of items) {
      if (typeof item.isActive === "function" && !item.isActive()) continue;
      if (!item.mesh || item.mesh.visible === false) continue;
      const target = item.interactionTarget ?? item.mesh;
      if (!target?.getWorldPosition) continue;
      target.getWorldPosition(tempWorldPos);
      const distSq = tempWorldPos.distanceToSquared(playerPos);
      const radiusSq = item.radius * item.radius;
      if (distSq < radiusSq && distSq < bestDistSq) {
        best = item;
        bestDistSq = distSq;
      }
    }

    return best
      ? {
          label: readValue(best.label),
          description: readValue(best.description),
          onInteract: best.onInteract,
        }
      : null;
  }

  return { getBestInteraction, register };
}
