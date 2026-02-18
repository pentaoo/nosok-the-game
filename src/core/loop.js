export function createLoop(onTick) {
  let running = false;
  let last = 0;

  const frame = (now) => {
    if (!running) return;
    const rawDt = (now - last) / 1000;
    last = now;
    onTick(Math.min(rawDt, 1 / 20));
    requestAnimationFrame(frame);
  };

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
