export function createTouchControls({ input }) {
  const root = document.getElementById("touch-controls");
  if (!root) return { destroy() {} };

  const buttons = Array.from(root.querySelectorAll("[data-code]"));
  if (buttons.length === 0) return { destroy() {} };

  const isTouch = Boolean(
    "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
  );
  const gamepadBreakpoint = window.matchMedia("(max-width: 980px)");
  const touchCameraBreakpoint = window.matchMedia("(max-width: 800px)");

  const setButton = (code, isPressed) => input.setVirtualButton(code, isPressed);
  const getCode = (node) => node?.dataset?.code || "";

  const releaseAllButtons = () => {
    for (const btn of buttons) {
      const code = getCode(btn);
      if (code) setButton(code, false);
    }
  };

  const syncControlModes = () => {
    const gamepadMode = gamepadBreakpoint.matches;
    document.body.classList.toggle("gamepad-ui", gamepadMode);
    root.setAttribute("aria-hidden", gamepadMode ? "false" : "true");

    const touchCameraMode = gamepadMode && isTouch && touchCameraBreakpoint.matches;
    document.body.classList.toggle("touch-ui", touchCameraMode);
    if (!gamepadMode || !touchCameraMode) releaseAllButtons();
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const code = getCode(e.currentTarget);
    if (!code) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setButton(code, true);
  };

  const onPointerUp = (e) => {
    const code = getCode(e.currentTarget);
    if (!code) return;
    setButton(code, false);
  };

  const pointerEvents = ["pointerdown", "pointerup", "pointercancel", "pointerleave"];
  for (const btn of buttons) {
    btn.addEventListener("pointerdown", onPointerDown);
    for (const eventName of pointerEvents.slice(1)) {
      btn.addEventListener(eventName, onPointerUp);
    }
  }

  syncControlModes();
  if (typeof gamepadBreakpoint.addEventListener === "function") {
    gamepadBreakpoint.addEventListener("change", syncControlModes);
  } else if (typeof gamepadBreakpoint.addListener === "function") {
    gamepadBreakpoint.addListener(syncControlModes);
  }
  if (typeof touchCameraBreakpoint.addEventListener === "function") {
    touchCameraBreakpoint.addEventListener("change", syncControlModes);
  } else if (typeof touchCameraBreakpoint.addListener === "function") {
    touchCameraBreakpoint.addListener(syncControlModes);
  }
  window.addEventListener("blur", releaseAllButtons);

  return {
    destroy() {
      for (const btn of buttons) {
        btn.removeEventListener("pointerdown", onPointerDown);
        for (const eventName of pointerEvents.slice(1)) {
          btn.removeEventListener(eventName, onPointerUp);
        }
        const code = getCode(btn);
        if (code) setButton(code, false);
      }
      if (typeof touchCameraBreakpoint.removeEventListener === "function") {
        touchCameraBreakpoint.removeEventListener("change", syncControlModes);
      } else if (typeof touchCameraBreakpoint.removeListener === "function") {
        touchCameraBreakpoint.removeListener(syncControlModes);
      }
      if (typeof gamepadBreakpoint.removeEventListener === "function") {
        gamepadBreakpoint.removeEventListener("change", syncControlModes);
      } else if (typeof gamepadBreakpoint.removeListener === "function") {
        gamepadBreakpoint.removeListener(syncControlModes);
      }
      window.removeEventListener("blur", releaseAllButtons);
      root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("gamepad-ui");
      document.body.classList.remove("touch-ui");
    },
  };
}
