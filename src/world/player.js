import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const SETTINGS = {
  radius: 0.45,
  walkSpeed: 6,
  runSpeed: 9,
  gravity: 30,
  jumpSpeed: 25,
  groundY: 0,
  fallMult: 1.6,
  lowJumpMult: 4,
  accel: 22,
  decel: 26,
  turnAccel: 20,
  turnDamp: 16,
  maxTurnSpeed: 18,
  coyoteTime: 0.12,
  jumpBuffer: 0.12,
  apexThreshold: 3.2,
  apexGravityMult: 0.6,
};

function damp(current, target, lambda, dt) {
  const t = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * t;
}

function shortestAngleDelta(current, target) {
  let delta = target - current;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  return delta;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readMoveInput(input) {
  const digital = {
    x: (input.isDown("KeyD") || input.isDown("ArrowRight") ? 1 : 0) -
      (input.isDown("KeyA") || input.isDown("ArrowLeft") ? 1 : 0),
    z: (input.isDown("KeyS") || input.isDown("ArrowDown") ? 1 : 0) -
      (input.isDown("KeyW") || input.isDown("ArrowUp") ? 1 : 0),
  };
  const axis = input.getAxis ? input.getAxis() : null;
  if (axis?.active) {
    return { x: axis.x, z: axis.z, magnitude: axis.magnitude, axis };
  }
  return { x: digital.x, z: digital.z, magnitude: 1, axis };
}

function chooseActionName({ isMoving, isRunning, hasWalk, hasRun }) {
  if (!isMoving) return "idle";
  if (isRunning && hasRun) return "run";
  if (hasWalk) return "walk";
  return "idle";
}

export function createPlayer(scene) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);
  scene.add(root);

  const collider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 8, 16),
    new THREE.MeshStandardMaterial({ visible: false })
  );
  collider.position.set(0, 0.85, 0);
  root.add(collider);

  const vectors = {
    move: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    desiredVel: new THREE.Vector3(),
    desiredPos: new THREE.Vector3(),
    camForward: new THREE.Vector3(),
    camRight: new THREE.Vector3(),
  };

  const state = {
    vy: 0,
    isGrounded: true,
    facing: 0,
    facingVel: 0,
    moveSpeed: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    mixer: null,
    activeAction: null,
    actions: { idle: null, walk: null, run: null },
  };

  const playAction = (name, fade = 0.15) => {
    const next = state.actions[name];
    if (!next || next === state.activeAction) return;
    next.reset();
    next.fadeIn(fade);
    next.play();
    state.activeAction?.fadeOut(fade);
    state.activeAction = next;
  };

  const loader = new GLTFLoader();
  loader.load(
    "models/player.glb",
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(0.05);
      root.add(model);

      model.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      state.mixer = new THREE.AnimationMixer(model);
      const findClip = (needle) =>
        gltf.animations.find((clip) => clip.name.toLowerCase().includes(needle)) ?? null;

      const idleClip = findClip("idle") ?? gltf.animations[0] ?? null;
      const walkClip = findClip("walk");
      const runClip = findClip("run");

      state.actions.idle = idleClip ? state.mixer.clipAction(idleClip) : null;
      state.actions.walk = walkClip ? state.mixer.clipAction(walkClip) : null;
      state.actions.run = runClip ? state.mixer.clipAction(runClip) : null;

      if (state.actions.walk) state.actions.walk.timeScale = 3;
      if (state.actions.run) state.actions.run.timeScale = 5;

      if (state.actions.idle) {
        state.activeAction = state.actions.idle;
        state.activeAction.play();
      }
    },
    undefined,
    (error) => {
      console.error("Failed to load /models/player.glb", error);
    }
  );

  const updateVerticalMovement = ({ dt, input, collisionWorld }) => {
    const jumpPressed = input.wasPressed ? input.wasPressed("Space") : input.isDown("Space");
    const jumpHeld = input.isDown("Space");
    if (jumpPressed) state.jumpBufferTimer = SETTINGS.jumpBuffer;
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);

    state.coyoteTimer = state.isGrounded
      ? SETTINGS.coyoteTime
      : Math.max(0, state.coyoteTimer - dt);

    let jumpedThisFrame = false;
    if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0) {
      state.vy = SETTINGS.jumpSpeed;
      state.isGrounded = false;
      state.coyoteTimer = 0;
      state.jumpBufferTimer = 0;
      jumpedThisFrame = true;
    }

    let gravity = SETTINGS.gravity;
    if (state.vy < 0) gravity *= SETTINGS.fallMult;
    else if (state.vy > 0 && !jumpHeld) gravity *= SETTINGS.lowJumpMult;
    else if (state.vy > 0 && state.vy < SETTINGS.apexThreshold) {
      gravity *= SETTINGS.apexGravityMult;
    }

    state.vy -= gravity * dt;
    root.position.y += state.vy * dt;

    if (root.position.y <= SETTINGS.groundY) {
      root.position.y = SETTINGS.groundY;
      state.vy = 0;
      state.isGrounded = true;
    }

    const groundY = collisionWorld.getGroundYAt(root.position.x, root.position.z, SETTINGS.groundY);
    if (state.vy <= 0 && root.position.y <= groundY) {
      root.position.y = groundY;
      state.vy = 0;
      state.isGrounded = true;
    } else {
      state.isGrounded = false;
    }

    if (!jumpedThisFrame && state.jumpBufferTimer > 0 && state.isGrounded) {
      state.vy = SETTINGS.jumpSpeed;
      root.position.y += state.vy * dt;
      state.isGrounded = false;
      state.jumpBufferTimer = 0;
    }
  };

  const updateHorizontalMovement = ({ dt, input, collisionWorld, cameraYaw }) => {
    const movement = readMoveInput(input);
    const hasInput = movement.x ** 2 + movement.z ** 2 > 0.001;

    vectors.camForward.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw)).normalize();
    vectors.camRight.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    vectors.move.set(0, 0, 0);
    if (hasInput) {
      vectors.move
        .addScaledVector(vectors.camForward, movement.z)
        .addScaledVector(vectors.camRight, movement.x)
        .normalize();
    }

    const isRunning =
      input.isDown("ShiftLeft") ||
      input.isDown("ShiftRight") ||
      Boolean(movement.axis?.run);
    const speed = (isRunning ? SETTINGS.runSpeed : SETTINGS.walkSpeed) * movement.magnitude;
    const accel = hasInput ? SETTINGS.accel : SETTINGS.decel;

    vectors.desiredVel.copy(vectors.move).multiplyScalar(speed);
    vectors.velocity.x = damp(vectors.velocity.x, vectors.desiredVel.x, accel, dt);
    vectors.velocity.z = damp(vectors.velocity.z, vectors.desiredVel.z, accel, dt);
    state.moveSpeed = Math.hypot(vectors.velocity.x, vectors.velocity.z);

    vectors.desiredPos.copy(root.position);
    vectors.desiredPos.x += vectors.velocity.x * dt;
    vectors.desiredPos.z += vectors.velocity.z * dt;

    const resolved = collisionWorld.resolveCircleVsBoxes(vectors.desiredPos, SETTINGS.radius);
    root.position.x = resolved.x;
    root.position.z = resolved.z;

    if (hasInput) {
      const targetAngle = Math.atan2(vectors.move.x, vectors.move.z);
      const delta = shortestAngleDelta(state.facing, targetAngle);
      const targetVel = clamp(
        delta * SETTINGS.turnAccel,
        -SETTINGS.maxTurnSpeed,
        SETTINGS.maxTurnSpeed
      );
      state.facingVel = damp(state.facingVel, targetVel, SETTINGS.turnDamp, dt);
      state.facing += state.facingVel * dt;
      root.rotation.y = state.facing;
    }

    const isMoving = vectors.velocity.x * vectors.velocity.x + vectors.velocity.z * vectors.velocity.z > 0.02;
    return { isRunning, isMoving };
  };

  const updateAnimation = ({ dt, isRunning, isMoving }) => {
    if (!state.mixer) return;
    playAction(
      chooseActionName({
        isMoving,
        isRunning,
        hasWalk: Boolean(state.actions.walk),
        hasRun: Boolean(state.actions.run),
      })
    );
    state.mixer.update(dt);
  };

  const update = ({ dt, input, collisionWorld, cameraYaw }) => {
    updateVerticalMovement({ dt, input, collisionWorld });
    const movementState = updateHorizontalMovement({ dt, input, collisionWorld, cameraYaw });
    updateAnimation({ dt, ...movementState });
  };

  return {
    update,
    get position() {
      return root.position;
    },
    get facing() {
      return state.facing;
    },
    get moveSpeed() {
      return state.moveSpeed;
    },
  };
}
