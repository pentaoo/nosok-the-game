export function createLoop(onTick) {
  let running = false;
  let last = performance.now();

  function frame(now) {
    if (!running) return;

    const rawDt = (now - last) / 1000;
    last = now;

    const dt = Math.min(rawDt, 1 / 20);
    onTick(dt);

    requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },
    stop() {
      running = false;
    },
  };
}
