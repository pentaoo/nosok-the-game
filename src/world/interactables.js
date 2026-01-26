import * as THREE from "three";
import { showDOC } from "../ui/doc.js";

export function createInteractables(scene) {
  const items = [];

  function register({ mesh, label, description, onInteract, radius = 1.5 }) {
    items.push({ mesh, label, description, onInteract, radius });
  }

  function getBestInteraction(playerPos) {
    let best = null;
    let bestDist = Infinity;

    for (const it of items) {
      const dist = it.mesh.position.distanceTo(playerPos);
      if (dist < it.radius && dist < bestDist) {
        best = it;
        bestDist = dist;
      }
      const worldPos = new THREE.Vector3();
      it.mesh.getWorldPosition(worldPos);
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
