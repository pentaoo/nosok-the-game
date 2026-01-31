export function createTouchControls({ container, input }) {
  const root = document.getElementById("touch-controls");
  if (!root) return { destroy() {} };

  const buttons = Array.from(root.querySelectorAll("[data-code]"));
  if (buttons.length === 0) return { destroy() {} };

  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;

  if (!isTouch) {
    root.style.display = "none";
    return { destroy() {} };
  }

  document.body.classList.add("touch-ui");

  function setButton(code, isPressed) {
    input.setVirtualButton(code, isPressed);
  }

  function onPointerDown(e) {
    e.preventDefault();
    const code = e.currentTarget?.dataset?.code;
    if (!code) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setButton(code, true);
  }

  function onPointerUp(e) {
    const code = e.currentTarget?.dataset?.code;
    if (!code) return;
    setButton(code, false);
  }

  for (const btn of buttons) {
    btn.addEventListener("pointerdown", onPointerDown);
    btn.addEventListener("pointerup", onPointerUp);
    btn.addEventListener("pointercancel", onPointerUp);
    btn.addEventListener("pointerleave", onPointerUp);
  }

  return {
    destroy() {
      for (const btn of buttons) {
        btn.removeEventListener("pointerdown", onPointerDown);
        btn.removeEventListener("pointerup", onPointerUp);
        btn.removeEventListener("pointercancel", onPointerUp);
        btn.removeEventListener("pointerleave", onPointerUp);
        const code = btn.dataset?.code;
        if (code) setButton(code, false);
      }
      document.body.classList.remove("touch-ui");
    },
  };
}
