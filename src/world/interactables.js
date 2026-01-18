import * as THREE from "three";

export function createInteractables(scene) {
  const items = [];

  function register({ mesh, label, onInteract, radius = 1.5 }) {
    items.push({ mesh, label, onInteract, radius });
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
      onInteract: best.onInteract,
    };
  }

  return { getBestInteraction, register };
}

function createItem({ position, label, onInteract }) {
  const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.18, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfff2cc,
    roughness: 0.8,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.position.set(position.x, 0.09, position.z);

  return {
    mesh,
    label,
    onInteract,
    interactRadius: 1.4,
  };
}
