function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function centerOfRect(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function initStainCleaner() {
  const stage = document.getElementById("stain-stage");
  const sponge = document.getElementById("stain-sponge");
  const status = document.getElementById("stain-status");
  const stainEls = Array.from(document.querySelectorAll("[data-stain-id]"));

  if (
    !(stage instanceof HTMLElement) ||
    !(sponge instanceof HTMLButtonElement) ||
    !(status instanceof HTMLElement) ||
    !stainEls.length
  ) {
    return {
      getState() {
        return {
          progress: 0,
          stains: [],
          isComplete: false,
        };
      },
      reset() {},
      destroy() {},
    };
  }

  const stains = stainEls.map((element) => ({
    id: element.getAttribute("data-stain-id") || `stain-${Math.random()}`,
    element,
    progress: 0,
  }));

  const state = {
    dragging: false,
    pointerId: null,
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    lastMoveX: 0,
    lastMoveY: 0,
  };

  const setSpongePosition = (x, y) => {
    const maxX = Math.max(0, stage.clientWidth - sponge.offsetWidth);
    const maxY = Math.max(0, stage.clientHeight - sponge.offsetHeight);
    state.x = clamp(x, 0, maxX);
    state.y = clamp(y, 0, maxY);
    sponge.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
  };

  const updateStatus = () => {
    const total = stains.reduce((sum, stain) => sum + stain.progress, 0);
    const progress = stains.length ? total / stains.length : 0;

    status.textContent = `${Math.round(progress * 100)}%`;
    stage.classList.toggle("is-clean", progress >= 1);
  };

  const updateStainVisual = (stain) => {
    const clamped = clamp(stain.progress, 0, 1);
    stain.element.style.setProperty("--stain_alpha", String(1 - clamped));
    stain.element.classList.toggle("is-cleaned", clamped >= 1);
  };

  const applyCleaning = (distanceStep) => {
    const spongeRect = sponge.getBoundingClientRect();
    const spongeCenter = centerOfRect(spongeRect);
    const spongeRadius = Math.max(spongeRect.width, spongeRect.height) * 0.46;

    for (const stain of stains) {
      if (stain.progress >= 1) continue;
      const stainRect = stain.element.getBoundingClientRect();
      const stainCenter = centerOfRect(stainRect);
      const stainRadius = Math.max(stainRect.width, stainRect.height) * 0.52;
      const reach = spongeRadius + stainRadius;

      const dx = stainCenter.x - spongeCenter.x;
      const dy = stainCenter.y - spongeCenter.y;
      const near = Math.hypot(dx, dy) <= reach;
      if (!near) continue;

      stain.progress = Math.min(1, stain.progress + distanceStep / 160);
      updateStainVisual(stain);
    }

    updateStatus();
  };

  const moveSpongeToPointer = (event) => {
    const stageRect = stage.getBoundingClientRect();
    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;
    setSpongePosition(pointerX - state.offsetX, pointerY - state.offsetY);

    const step = Math.hypot(pointerX - state.lastMoveX, pointerY - state.lastMoveY);
    state.lastMoveX = pointerX;
    state.lastMoveY = pointerY;

    if (state.dragging) applyCleaning(step);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    if (event.target !== sponge) return;

    const spongeRect = sponge.getBoundingClientRect();
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.offsetX = event.clientX - spongeRect.left;
    state.offsetY = event.clientY - spongeRect.top;

    const stageRect = stage.getBoundingClientRect();
    state.lastMoveX = event.clientX - stageRect.left;
    state.lastMoveY = event.clientY - stageRect.top;

    sponge.classList.add("is-dragging");
    sponge.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!state.dragging || state.pointerId !== event.pointerId) return;
    moveSpongeToPointer(event);
  };

  const stopDragging = (event) => {
    if (!state.dragging || state.pointerId !== event.pointerId) return;

    state.dragging = false;
    state.pointerId = null;
    sponge.classList.remove("is-dragging");
  };

  const placeInitial = () => {
    const x = Math.max(12, stage.clientWidth * 0.06);
    const y = Math.max(12, stage.clientHeight * 0.72);
    setSpongePosition(x, y);
  };

  placeInitial();
  stains.forEach(updateStainVisual);
  updateStatus();

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", stopDragging);
  stage.addEventListener("pointercancel", stopDragging);
  window.addEventListener("resize", placeInitial);

  return {
    getState() {
      const progress = stains.length
        ? stains.reduce((sum, stain) => sum + stain.progress, 0) / stains.length
        : 0;

      return {
        progress,
        stains: stains.map((stain) => ({
          id: stain.id,
          progress: stain.progress,
        })),
        isComplete: progress >= 1,
      };
    },
    reset() {
      stains.forEach((stain) => {
        stain.progress = 0;
        updateStainVisual(stain);
      });
      updateStatus();
      placeInitial();
    },
    destroy() {
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", stopDragging);
      stage.removeEventListener("pointercancel", stopDragging);
      window.removeEventListener("resize", placeInitial);
      sponge.classList.remove("is-dragging");
      stage.classList.remove("is-clean");
    },
  };
}
