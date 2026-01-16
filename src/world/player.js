import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createPlayer(scene) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);
  scene.add(root);

  // КОЛИЗИЯ ЧЕЛА
  const collider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 8, 16),
    new THREE.MeshStandardMaterial({ visible: false })
  );

  collider.position.set(0, 0.85, 0);
  root.add(collider);
  const radius = 0.45;
  const WALK_SPEED = 4.0;
  const RUN_SPEED = 6.5;
  const TURN_SPEED = 12.0;
  const GRAVITY = 22;
  const JUMP_SPEED = 22;
  const GROUND_Y = 0;
  let vy = 0;
  let isGrounded = true;
  let facing = 0;
  const move = new THREE.Vector3();
  const desiredPos = new THREE.Vector3();
  let mixer = null;
  let activeAction = null;
  const actions = { idle: null, walk: null, run: null };

  function playAction(name, fade = 0.15) {
    const next = actions[name];
    if (!next || next === activeAction) return;
    next.reset();
    next.fadeIn(fade);
    next.play();
    if (activeAction) activeAction.fadeOut(fade);
    activeAction = next;
  }

  const loader = new GLTFLoader();

  loader.load(
    "models/player.glb",
    (gltf) => {
      const model = gltf.scene;
      root.add(model);
      model.scale.setScalar(0.05), (mixer = new THREE.AnimationMixer(model));
      const findClip = (needle) =>
        gltf.animations.find((c) => c.name.toLowerCase().includes(needle)) ||
        null;

      const idleClip = findClip("idle") || gltf.animations[0] || null;
      const walkClip = findClip("walk");
      const runClip = findClip("run");

      actions.idle = idleClip ? mixer.clipAction(idleClip) : null;
      actions.walk = walkClip ? mixer.clipAction(walkClip) : null;
      actions.run = runClip ? mixer.clipAction(runClip) : null;

      if (actions.walk) actions.walk.timeScale = 1.0;
      if (actions.run) actions.run.timeScale = 4;

      if (actions.idle) {
        activeAction = actions.idle;
        activeAction.play();
      }
    },
    undefined,
    (err) => {
      console.error("Failed to load /models/player.glb", err);
    }
  );

  function update({ dt, input, collisionWorld, cameraYaw }) {
    const forward = input.isDown("KeyW") ? 1 : 0;
    const back = input.isDown("KeyS") ? 1 : 0;
    const left = input.isDown("KeyA") ? 1 : 0;
    const right = input.isDown("KeyD") ? 1 : 0;
    const up = input.isDown("Space") ? 1 : 0;

    if (up && isGrounded) {
      vy = JUMP_SPEED;
      isGrounded = false;
    }
    vy -= GRAVITY * dt;
    root.position.y += vy * dt;

    if (root.position.y <= GROUND_Y) {
      root.position.y = 0;
      vy = 0;
      isGrounded = true;
    }
    const groundY = collisionWorld.getGroundYAt(
      root.position.x,
      root.position.z,
      0
    );

    // приземляемся на "самый высокий пол под ногами"
    if (vy <= 0 && root.position.y <= groundY) {
      root.position.y = groundY;
      vy = 0;
      isGrounded = true;
    } else {
      isGrounded = false;
    }

    const inputX = right - left;
    const inputZ = back - forward;

    const isInput = inputX ** 2 + inputZ ** 2 > 0.001;

    const camForward = new THREE.Vector3(
      Math.sin(cameraYaw),
      0,
      Math.cos(cameraYaw)
    );

    camForward.y = 0;
    camForward.normalize();

    const camRight = new THREE.Vector3(
      Math.cos(cameraYaw),
      0,
      -Math.sin(cameraYaw)
    );

    move.set(0, 0, 0);
    if (isInput) {
      move
        .addScaledVector(camForward, inputZ)
        .addScaledVector(camRight, inputX)
        .normalize();
    }

    const isRunning = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
    const speed = isRunning ? RUN_SPEED : WALK_SPEED;
    desiredPos.copy(root.position);
    desiredPos.x += move.x * speed * dt;
    desiredPos.z += move.z * speed * dt;

    const resolved = collisionWorld.resolveCircleVsBoxes(
      desiredPos,
      radius,
      root.position.y
    );
    root.position.x = resolved.x;
    root.position.z = resolved.z;

    if (isInput) {
      const targetAngle = Math.atan2(move.x, move.z);
      facing = dampAngle(facing, targetAngle, TURN_SPEED, dt);
      root.rotation.y = facing;
    }

    move.set(right - left, 0, back - forward);

    const isMoving = move.lengthSq() > 0.001;
    if (isMoving) move.normalize();
    if (mixer) {
      if (!isMoving) {
        playAction("idle");
      } else if (isRunning && actions.run) {
        playAction("run");
      } else if (actions.walk) {
        playAction("walk");
      } else {
        playAction("idle");
      }

      mixer.update(dt);
    }
  }

  return {
    update,
    get position() {
      return root.position;
    },
  };
}

function dampAngle(current, target, lambda, dt) {
  let delta = target - current;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  const t = 1 - Math.exp(-lambda * dt);
  return current + delta * t;
}
