export function createInput(target = window) {
  const keyboardDown = new Set();
  const keyboardPressed = new Set();
  const virtualDown = new Set();
  const virtualPressed = new Set();
  const axis = {
    x: 0,
    z: 0,
    magnitude: 0,
    active: false,
    run: false,
  };

  const onKeyDown = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
    }
    if (!keyboardDown.has(e.code)) keyboardPressed.add(e.code);
    keyboardDown.add(e.code);
  };

  const onKeyUp = (e) => keyboardDown.delete(e.code);

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    isDown(code) {
      return keyboardDown.has(code) || virtualDown.has(code);
    },
    wasPressed(code) {
      return keyboardPressed.has(code) || virtualPressed.has(code);
    },
    setVirtualButton(code, isPressed) {
      if (isPressed) {
        if (!virtualDown.has(code)) virtualPressed.add(code);
        virtualDown.add(code);
        return;
      }
      virtualDown.delete(code);
    },
    setAxis(x, z, active, run = false) {
      axis.x = x;
      axis.z = z;
      axis.magnitude = Math.min(1, Math.hypot(x, z));
      axis.active = active;
      axis.run = run;
    },
    getAxis() {
      return axis;
    },
    endFrame() {
      keyboardPressed.clear();
      virtualPressed.clear();
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      keyboardDown.clear();
      keyboardPressed.clear();
      virtualDown.clear();
      virtualPressed.clear();
    },
  };
}
