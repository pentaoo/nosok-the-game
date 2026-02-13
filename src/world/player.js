import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createPlayer(scene) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);
  scene.add(root);

  // КОЛИЗИЯ ЧЕЛА
  const collider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 8, 16),
    new THREE.MeshStandardMaterial({ visible: false }),
  );

  collider.position.set(0, 0.85, 0);
  root.add(collider);
  const radius = 0.45;
  const WALK_SPEED = 6;
  const RUN_SPEED = 9;
  const GRAVITY = 30;
  const JUMP_SPEED = 25;
  const GROUND_Y = 0;
  const FALL_MULT = 1.6;
  const LOW_JUMP_MULT = 4;
  const ACCEL = 22;
  const DECEL = 26;
  const TURN_ACCEL = 20;
  const TURN_DAMP = 16;
  const MAX_TURN_SPEED = 18;
  const COYOTE_TIME = 0.12;
  const JUMP_BUFFER = 0.12;
  const APEX_THRESHOLD = 3.2;
  const APEX_GRAVITY_MULT = 0.6;
  let vy = 0;
  let isGrounded = true;
  let facing = 0;
  let facingVel = 0;
  const move = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const desiredVel = new THREE.Vector3();
  const desiredPos = new THREE.Vector3();
  const camForward = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  let moveSpeed = 0;
  let mixer = null;
  let activeAction = null;
  const actions = { idle: null, walk: null, run: null };
  let coyoteTimer = 0;
  let jumpBufferTimer = 0;

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
      model.scale.setScalar(0.05);
      mixer = new THREE.AnimationMixer(model);
      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      const findClip = (needle) =>
        gltf.animations.find((c) => c.name.toLowerCase().includes(needle)) ||
        null;

      const idleClip = findClip("idle") || gltf.animations[0] || null;
      const walkClip = findClip("walk");
      const runClip = findClip("run");

      actions.idle = idleClip ? mixer.clipAction(idleClip) : null;
      actions.walk = walkClip ? mixer.clipAction(walkClip) : null;
      actions.run = runClip ? mixer.clipAction(runClip) : null;

      if (actions.walk) actions.walk.timeScale = 3;
      if (actions.run) actions.run.timeScale = 5;

      if (actions.idle) {
        activeAction = actions.idle;
        activeAction.play();
      }
    },
    undefined,
    (err) => {
      console.error("Failed to load /models/player.glb", err);
    },
  );

  function update({ dt, input, collisionWorld, cameraYaw }) {
    const forward = input.isDown("KeyW") || input.isDown("ArrowUp") ? 1 : 0;
    const back = input.isDown("KeyS") || input.isDown("ArrowDown") ? 1 : 0;
    const left = input.isDown("KeyA") || input.isDown("ArrowLeft") ? 1 : 0;
    const right = input.isDown("KeyD") || input.isDown("ArrowRight") ? 1 : 0;
    const axis = input.getAxis ? input.getAxis() : null;

    const jumpPressed = input.wasPressed
      ? input.wasPressed("Space")
      : input.isDown("Space");
    const jumpHeld = input.isDown("Space");

    let jumpedThisFrame = false;
    if (jumpPressed) jumpBufferTimer = JUMP_BUFFER;
    jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);

    if (isGrounded) {
      coyoteTimer = COYOTE_TIME;
    } else {
      coyoteTimer = Math.max(0, coyoteTimer - dt);
    }

    if (jumpBufferTimer > 0 && coyoteTimer > 0) {
      vy = JUMP_SPEED;
      isGrounded = false;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      jumpedThisFrame = true;
    }

    let gravityThisFrame = GRAVITY;

    if (vy < 0) {
      gravityThisFrame *= FALL_MULT;
    } else if (vy > 0 && !jumpHeld) {
      gravityThisFrame *= LOW_JUMP_MULT;
    } else if (vy > 0 && vy < APEX_THRESHOLD) {
      gravityThisFrame *= APEX_GRAVITY_MULT;
    }

    vy -= gravityThisFrame * dt;
    root.position.y += vy * dt;

    if (root.position.y <= GROUND_Y) {
      root.position.y = 0;
      vy = 0;
      isGrounded = true;
    }
    const groundY = collisionWorld.getGroundYAt(
      root.position.x,
      root.position.z,
      0,
    );

    if (vy <= 0 && root.position.y <= groundY) {
      root.position.y = groundY;
      vy = 0;
      isGrounded = true;
    } else {
      isGrounded = false;
    }

    if (!jumpedThisFrame && jumpBufferTimer > 0 && isGrounded) {
      vy = JUMP_SPEED;
      root.position.y += vy * dt;
      isGrounded = false;
      jumpBufferTimer = 0;
    }

    let inputX = right - left;
    let inputZ = back - forward;
    let analogMag = 1;

    if (axis && axis.active) {
      inputX = axis.x;
      inputZ = axis.z;
      analogMag = axis.magnitude;
    }

    const isInput = inputX ** 2 + inputZ ** 2 > 0.001;

    camForward.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
    camForward.normalize();
    camRight.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    move.set(0, 0, 0);
    if (isInput) {
      move
        .addScaledVector(camForward, inputZ)
        .addScaledVector(camRight, inputX)
        .normalize();
    }

    const isRunning =
      input.isDown("ShiftLeft") ||
      input.isDown("ShiftRight") ||
      (axis && axis.run);
    const baseSpeed = isRunning ? RUN_SPEED : WALK_SPEED;
    const speed = baseSpeed * analogMag;
    const accel = isInput ? ACCEL : DECEL;

    desiredVel.copy(move).multiplyScalar(speed);
    velocity.x = damp(velocity.x, desiredVel.x, accel, dt);
    velocity.z = damp(velocity.z, desiredVel.z, accel, dt);
    moveSpeed = Math.hypot(velocity.x, velocity.z);

    desiredPos.copy(root.position);
    desiredPos.x += velocity.x * dt;
    desiredPos.z += velocity.z * dt;

    const resolved = collisionWorld.resolveCircleVsBoxes(desiredPos, radius);
    root.position.x = resolved.x;
    root.position.z = resolved.z;

    if (isInput) {
      const targetAngle = Math.atan2(move.x, move.z);
      const delta = shortestAngleDelta(facing, targetAngle);
      const targetVel = clamp(
        delta * TURN_ACCEL,
        -MAX_TURN_SPEED,
        MAX_TURN_SPEED,
      );
      facingVel = damp(facingVel, targetVel, TURN_DAMP, dt);
      facing += facingVel * dt;
      root.rotation.y = facing;
    }

    const isMoving = velocity.x * velocity.x + velocity.z * velocity.z > 0.02;
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
    get facing() {
      return facing;
    },
    get moveSpeed() {
      return moveSpeed;
    },
  };
}

function damp(current, target, lambda, dt) {
  const t = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * t;
}

function shortestAngleDelta(current, target) {
  let delta = target - current;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  return delta;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
