export function createInput(target = window) {
  const down = new Set();
  const pressedThisFrame = new Set();
  const virtualDown = new Set();
  const virtualPressedThisFrame = new Set();
  const axis = {
    x: 0,
    z: 0,
    magnitude: 0,
    active: false,
    run: false,
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
    }
  });

  function onKeyDown(e) {
    if (!down.has(e.code)) pressedThisFrame.add(e.code);
    down.add(e.code);
  }

  function onKeyUp(e) {
    down.delete(e.code);
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    isDown(code) {
      return down.has(code) || virtualDown.has(code);
    },
    wasPressed(code) {
      return pressedThisFrame.has(code) || virtualPressedThisFrame.has(code);
    },
    setVirtualButton(code, isPressed) {
      if (isPressed) {
        if (!virtualDown.has(code)) virtualPressedThisFrame.add(code);
        virtualDown.add(code);
      } else {
        virtualDown.delete(code);
      }
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
      pressedThisFrame.clear();
      virtualPressedThisFrame.clear();
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      down.clear();
      pressedThisFrame.clear();
      virtualDown.clear();
      virtualPressedThisFrame.clear();
    },
  };
}
