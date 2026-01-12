import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function createPlayer(scene) {
  // === Root (логическая сущность игрока) ===
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

  // === Загрузка модели ===
  const loader = new GLTFLoader();
  loader.load(
    "/models/player.glb",
    (gltf) => {
      const model = gltf.scene;
      root.add(model);

      model.scale.setScalar(0.05);

      // 1) Mixer
      mixer = new THREE.AnimationMixer(model);

      // 2) Ищем клипы по подстроке (это устойчивее, чем точное имя)
      const findClip = (needle) =>
        gltf.animations.find((c) => c.name.toLowerCase().includes(needle)) ||
        null;

      const idleClip = findClip("idle") || gltf.animations[0] || null;
      const walkClip = findClip("walk");
      const runClip = findClip("run");

      // 3) Создаём actions
      actions.idle = idleClip ? mixer.clipAction(idleClip) : null;
      actions.walk = walkClip ? mixer.clipAction(walkClip) : null;
      actions.run = runClip ? mixer.clipAction(runClip) : null;

      // (Опционально) скорость клипов
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

  function update({ dt, input, collisionWorld }) {
    const forward = input.isDown("KeyW") ? 1 : 0;
    const back = input.isDown("KeyS") ? 1 : 0;
    const left = input.isDown("KeyA") ? 1 : 0;
    const right = input.isDown("KeyD") ? 1 : 0;

    move.set(right - left, 0, back - forward);

    const isMoving = move.lengthSq() > 0.001;
    if (isMoving) move.normalize();

    const isRunning = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
    const speed = isRunning ? RUN_SPEED : WALK_SPEED;

    desiredPos.copy(root.position);
    desiredPos.x += move.x * speed * dt;
    desiredPos.z += move.z * speed * dt;

    const resolved = collisionWorld.resolveCircleVsBoxes(desiredPos, radius);
    root.position.x = resolved.x;
    root.position.z = resolved.z;

    if (isMoving) {
      const targetAngle = Math.atan2(move.x, move.z);
      facing = dampAngle(facing, targetAngle, TURN_SPEED, dt);
      root.rotation.y = facing;
    }

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

/**
 * Плавное приближение угла к цели (коротким путём)
 */
function dampAngle(current, target, lambda, dt) {
  let delta = target - current;
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
  const t = 1 - Math.exp(-lambda * dt);
  return current + delta * t;
}
