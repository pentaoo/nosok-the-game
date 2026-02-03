export function createInteractables(scene) {
  const items = [];

  function register({
    mesh,
    label,
    description,
    onInteract,
    radius = 1.5,
    isActive = null,
  }) {
    items.push({ mesh, label, description, onInteract, radius, isActive });
  }

  function getBestInteraction(playerPos) {
    let best = null;
    let bestDist = Infinity;

    for (const it of items) {
      if (typeof it.isActive === "function" && !it.isActive()) continue;
      if (it.mesh?.visible === false) continue;
      const dist = it.mesh.position.distanceTo(playerPos);
      if (dist < it.radius && dist < bestDist) {
        best = it;
        bestDist = dist;
      }
    }

    if (!best) return null;

    return {
      label: best.label,
      description: best.description,
      onInteract: best.onInteract,
    };
  }

  return { getBestInteraction, register };
}
