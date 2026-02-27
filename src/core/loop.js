export function createLoop(onTick) {
  let running = false;
  let paused = false;
  let last = 0;
  let rafId = 0;
  let maxFps = null;

  const cancelFrame = () => {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const scheduleFrame = () => {
    if (!running || paused || rafId) return;
    rafId = window.requestAnimationFrame(frame);
  };

  const frame = (now) => {
    rafId = 0;
    if (!running || paused) return;

    if (typeof maxFps === "number" && maxFps > 0) {
      const minFrameMs = 1000 / maxFps;
      if (now - last < minFrameMs) {
        scheduleFrame();
        return;
      }
    }

    const rawDt = (now - last) / 1000;
    last = now;
    onTick(Math.min(rawDt, 1 / 20));
    scheduleFrame();
  };

  const api = {
    start() {
      if (running && paused) {
        api.resume();
        return;
      }
      if (running) return;
      running = true;
      paused = false;
      last = performance.now();
      scheduleFrame();
    },
    pause() {
      if (!running || paused) return;
      paused = true;
      cancelFrame();
    },
    resume() {
      if (!running) return;
      if (!paused) return;
      paused = false;
      last = performance.now();
      scheduleFrame();
    },
    setMaxFps(nextMaxFps) {
      if (!Number.isFinite(nextMaxFps) || nextMaxFps <= 0) {
        maxFps = null;
        return;
      }
      maxFps = nextMaxFps;
    },
    isRunning() {
      return running && !paused;
    },
    isPaused() {
      return paused;
    },
    stop() {
      running = false;
      paused = false;
      cancelFrame();
    },
  };

  return api;
}
