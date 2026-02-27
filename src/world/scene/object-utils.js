import * as THREE from "three";

export function applyToyMaterials(object) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function trackCollisionMesh(
  world,
  mesh,
  { pad = 0, padX = undefined, padZ = undefined, maxY = undefined, preserveMinY = false } = {}
) {
  if (!mesh) return mesh;

  if (typeof pad === "number") mesh.userData.collisionPad = pad;
  if (typeof padX === "number") mesh.userData.collisionPadX = padX;
  if (typeof padZ === "number") mesh.userData.collisionPadZ = padZ;
  if (typeof maxY === "number") mesh.userData.collisionMaxY = maxY;
  if (preserveMinY) mesh.userData.collisionPreserveMinY = true;

  world.itemMeshes.push(mesh);
  return mesh;
}

export function createBoxMeshFactory({ scene, world }) {
  return ({
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    depth = 1,
    material,
    collision = null,
  }) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    applyToyMaterials(mesh);
    scene.add(mesh);
    if (collision) trackCollisionMesh(world, mesh, collision);
    return mesh;
  };
}

export function addHighlight(
  object,
  { intensity = 0.24, distance = 4.2, yOffset = 1.2 } = {},
  scale = 1
) {
  if (!object) return;
  applyToyMaterials(object);
  if (intensity <= 0) return;

  const glow = new THREE.PointLight(0xffffff, intensity * scale, distance, 2);
  glow.position.set(0, yOffset, 0);
  glow.castShadow = false;
  object.add(glow);
}

export function createFrontInteractionAnchor(
  mesh,
  { frontInset = 0.55, heightFromBase = 1.0 } = {}
) {
  if (!mesh) return null;
  mesh.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const anchorWorldPos = new THREE.Vector3(
    center.x,
    box.min.y + heightFromBase,
    box.max.z - frontInset
  );

  const anchor = new THREE.Object3D();
  mesh.add(anchor);
  mesh.worldToLocal(anchorWorldPos);
  anchor.position.copy(anchorWorldPos);
  return anchor;
}
