import * as THREE from "three";

export function createPlayer(scene) {
  const geo = new THREE.CapsuleGeometry(0.35, 0.7, 8, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.position.set(0, 0.85, 0);
  scene.add(mesh);

  const radius = 0.45;

  const WALK_SPEED = 4.0;
  const RUN_SPEED = 6.5;

  const move = new THREE.Vector3();
  const desiredPos = new THREE.Vector3();

  function update({ dt, input, collisionWorld }) {
    const forward = input.isDown("KeyW") ? 1 : 0;
    const back = input.isDown("KeyS") ? 1 : 0;
    const left = input.isDown("KeyA") ? 1 : 0;
    const right = input.isDown("KeyD") ? 1 : 0;

    move.set(right - left, 0, back - forward);

    if (move.lengthSq() > 0) move.normalize();

    const speed =
      input.isDown("ShiftLeft") || input.isDown("ShiftRight")
        ? RUN_SPEED
        : WALK_SPEED;

    desiredPos.copy(mesh.position);
    desiredPos.x += move.x * speed * dt;
    desiredPos.z += move.z * speed * dt;

    const resolved = collisionWorld.resolveCircleVsBoxes(desiredPos, radius);

    mesh.position.x = resolved.x;
    mesh.position.z = resolved.z;

    if (move.lengthSq() > 0.001) {
      mesh.rotation.y = Math.atan2(move.x, move.z);
    }
  }

  return {
    update,
    get position() {
      return mesh.position;
    },
  };
}
