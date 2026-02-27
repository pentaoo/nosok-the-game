import * as THREE from "three";

export function createSpoolModel() {
  const spool = new THREE.Group();

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdce8,
    roughness: 0.5,
    metalness: 0.04,
  });
  const threadMaterial = new THREE.MeshStandardMaterial({
    color: 0xfe4aae,
    roughness: 0.44,
    metalness: 0.06,
  });

  const topDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24),
    coreMaterial
  );
  const bottomDisc = topDisc.clone();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.58, 24),
    coreMaterial
  );
  const thread = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.48, 28, 1, true),
    threadMaterial
  );

  topDisc.position.y = 0.32;
  bottomDisc.position.y = -0.32;
  spool.add(topDisc, bottomDisc, core, thread);
  spool.rotation.z = -0.22;

  return spool;
}
