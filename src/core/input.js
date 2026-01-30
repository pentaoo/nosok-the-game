export function createInput(target = window) {
  const down = new Set();
  const pressedThisFrame = new Set();

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
      return down.has(code);
    },
    wasPressed(code) {
      return pressedThisFrame.has(code);
    },
    endFrame() {
      pressedThisFrame.clear();
    },
    destroy() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      down.clear();
      pressedThisFrame.clear();
    },
  };
}
