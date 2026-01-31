export function createTouchControls({ container, input }) {
  const root = document.getElementById("touch-controls");
  const stickZone = document.getElementById("stick-zone");
  const stickHandle = document.getElementById("stick-handle");
  const jumpBtn = document.getElementById("jump-btn");

  if (!root || !stickZone || !stickHandle || !jumpBtn) {
    return { destroy() {} };
  }

  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;

  if (!isTouch) {
    root.style.display = "none";
    return { destroy() {} };
  }

  document.body.classList.add("touch-ui");

  const maxRadius = 52;
  let activePointerId = null;
  let centerX = 0;
  let centerY = 0;

  function setStick(dx, dy) {
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    const handleX = nx * clamped;
    const handleY = ny * clamped;
    stickHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;

    let axisX = handleX / maxRadius;
    let axisZ = -handleY / maxRadius;
    let magnitude = Math.min(1, Math.hypot(axisX, axisZ));
    const deadzone = 0.12;
    if (magnitude < deadzone) {
      axisX = 0;
      axisZ = 0;
      magnitude = 0;
    }
    const run = magnitude > 0.7;
    input.setAxis(axisX, axisZ, magnitude > 0, run);
    input.setVirtualButton("ShiftLeft", run);
  }

  function resetStick() {
    stickHandle.style.transform = "translate(0px, 0px)";
    input.setAxis(0, 0, false, false);
    input.setVirtualButton("ShiftLeft", false);
  }

  function onPointerDown(e) {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    stickZone.setPointerCapture?.(e.pointerId);

    const rect = stickZone.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    setStick(e.clientX - centerX, e.clientY - centerY);
  }

  function onPointerMove(e) {
    if (activePointerId !== e.pointerId) return;
    setStick(e.clientX - centerX, e.clientY - centerY);
  }

  function onPointerUp(e) {
    if (activePointerId !== e.pointerId) return;
    activePointerId = null;
    resetStick();
  }

  stickZone.addEventListener("pointerdown", onPointerDown);
  stickZone.addEventListener("pointermove", onPointerMove);
  stickZone.addEventListener("pointerup", onPointerUp);
  stickZone.addEventListener("pointercancel", onPointerUp);
  stickZone.addEventListener("pointerleave", onPointerUp);

  function onJumpDown(e) {
    e.preventDefault();
    input.setVirtualButton("Space", true);
  }
  function onJumpUp() {
    input.setVirtualButton("Space", false);
  }

  jumpBtn.addEventListener("pointerdown", onJumpDown);
  jumpBtn.addEventListener("pointerup", onJumpUp);
  jumpBtn.addEventListener("pointercancel", onJumpUp);
  jumpBtn.addEventListener("pointerleave", onJumpUp);

  return {
    destroy() {
      stickZone.removeEventListener("pointerdown", onPointerDown);
      stickZone.removeEventListener("pointermove", onPointerMove);
      stickZone.removeEventListener("pointerup", onPointerUp);
      stickZone.removeEventListener("pointercancel", onPointerUp);
      stickZone.removeEventListener("pointerleave", onPointerUp);
      jumpBtn.removeEventListener("pointerdown", onJumpDown);
      jumpBtn.removeEventListener("pointerup", onJumpUp);
      jumpBtn.removeEventListener("pointercancel", onJumpUp);
      jumpBtn.removeEventListener("pointerleave", onJumpUp);
      resetStick();
      input.setVirtualButton("Space", false);
      document.body.classList.remove("touch-ui");
    },
  };
}
