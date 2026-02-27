import * as THREE from "three";
import { dampAngle, normalizeAngle, shortestAngleDelta } from "./math-utils.js";

export function createCameraController({ camera, domElement }) {
  if (!camera || !domElement) {
    return {
      follow() {},
      getYaw: () => 0,
      destroy() {},
    };
  }

  let yaw = 0;
  let targetYaw = 0;

  const dragState = {
    isDragging: false,
    activePointerId: null,
    lastPointerX: 0,
    manualCooldown: 0,
  };

  const sensitivity = { mouse: 0.0016, touch: 0.0045 };
  const yawDamp = 6;
  const cameraTarget = new THREE.Vector3();

  const onPointerDown = (event) => {
    if (dragState.activePointerId !== null) return;
    dragState.isDragging = true;
    dragState.activePointerId = event.pointerId;
    dragState.lastPointerX = event.clientX;
    dragState.manualCooldown = 0.45;
    domElement.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragState.isDragging || dragState.activePointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.lastPointerX;
    dragState.lastPointerX = event.clientX;
    const pointerSensitivity =
      event.pointerType === "touch" ? sensitivity.touch : sensitivity.mouse;
    targetYaw -= dx * pointerSensitivity;
    dragState.manualCooldown = 0.45;
  };

  const endDrag = (event) => {
    if (event && dragState.activePointerId !== event.pointerId) return;
    dragState.isDragging = false;
    dragState.activePointerId = null;
  };

  domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  const follow = (playerPos, dt, playerFacing = null, playerSpeed = 0) => {
    cameraTarget.lerp(playerPos, 1 - Math.pow(0.01, dt));

    if (document.body.classList.contains("touch-ui")) {
      dragState.manualCooldown = Math.max(0, dragState.manualCooldown - dt);

      if (
        !dragState.isDragging &&
        dragState.manualCooldown <= 0 &&
        typeof playerFacing === "number"
      ) {
        const desiredYaw = normalizeAngle(playerFacing + Math.PI);
        const delta = shortestAngleDelta(yaw, desiredYaw);

        let followSpeed = 1.8;
        if (playerSpeed > 0.2) followSpeed = 2.4;
        if (playerSpeed > 0.2 && Math.abs(delta) > Math.PI * 0.6) followSpeed = 3.2;

        targetYaw = dampAngle(targetYaw, desiredYaw, followSpeed, dt);
      }
    }

    yaw = dampAngle(yaw, targetYaw, yawDamp, dt);

    const desired = new THREE.Vector3(
      cameraTarget.x + Math.sin(yaw) * 10,
      cameraTarget.y + 10,
      cameraTarget.z + Math.cos(yaw) * 10
    );

    camera.position.lerp(desired, 1 - Math.pow(0.01, dt));
    camera.lookAt(cameraTarget.x, cameraTarget.y + 0.8, cameraTarget.z);
  };

  const destroy = () => {
    domElement.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  };

  return {
    follow,
    getYaw: () => yaw,
    destroy,
  };
}
