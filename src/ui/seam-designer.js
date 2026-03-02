function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function toViewPoint(point, rect) {
  return {
    x: clamp(((point.x - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((point.y - rect.top) / rect.height) * 100, 0, 100),
  };
}

function formatPath(points) {
  if (!points.length) return "";
  const [first, ...rest] = points;
  const head = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  const tail = rest.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  return tail ? `${head} ${tail}` : head;
}

export function initSeamDesigner() {
  const stage = document.getElementById("seam-stage");
  const stitchedPathEl = document.getElementById("seam-stitched-path");
  const previewPathEl = document.getElementById("seam-preview-path");
  const progressEl = document.getElementById("seam-progress");
  const pointEls = Array.from(document.querySelectorAll("[data-seam-point]"));

  if (
    !(stage instanceof HTMLElement) ||
    !(stitchedPathEl instanceof SVGPathElement) ||
    !(previewPathEl instanceof SVGPathElement) ||
    !(progressEl instanceof HTMLElement) ||
    !pointEls.length
  ) {
    return {
      getState() {
        return {
          progress: 0,
          completedPoints: 0,
          totalPoints: 0,
          isComplete: false,
        };
      },
      reset() {},
      destroy() {},
    };
  }

  const points = pointEls
    .map((element) => {
      const order = Number(element.getAttribute("data-seam-point"));
      return Number.isFinite(order) ? { order, element } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  const state = {
    stitchedOrders: [],
    active: null,
    errorTimer: 0,
  };

  const getPointCenters = () => {
    const stageRect = stage.getBoundingClientRect();
    return points.map(({ order, element }) => {
      const rect = element.getBoundingClientRect();
      return {
        order,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        view: toViewPoint({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, stageRect),
      };
    });
  };

  const isComplete = () => state.stitchedOrders.length === points.length;

  const getCompletedPointsCount = () => state.stitchedOrders.length;

  const getProgress = () => {
    if (!points.length) return 0;
    return getCompletedPointsCount() / points.length;
  };

  const updateStatus = () => {
    const completed = getCompletedPointsCount();
    progressEl.textContent = `Шов: ${completed}/${points.length}`;
    stage.classList.toggle("is-complete", isComplete());

    const nextOrder = completed + 1;
    points.forEach(({ order, element }) => {
      element.classList.toggle("is-complete", order <= completed);
      element.classList.toggle("is-next", order === nextOrder && !isComplete());
    });
  };

  const renderPaths = (previewPoint = null) => {
    const centers = getPointCenters();
    const stitched = state.stitchedOrders
      .map((order) => centers.find((center) => center.order === order))
      .filter(Boolean)
      .map((center) => center.view);

    stitchedPathEl.setAttribute("d", formatPath(stitched));

    if (!state.active || !previewPoint) {
      previewPathEl.setAttribute("d", "");
      return;
    }

    const startCenter = centers.find((center) => center.order === state.active.startOrder);
    if (!startCenter) {
      previewPathEl.setAttribute("d", "");
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const nextPoint = toViewPoint(previewPoint, stageRect);
    previewPathEl.setAttribute("d", formatPath([startCenter.view, nextPoint]));
  };

  const flashError = () => {
    stage.classList.remove("is-error");
    stage.offsetWidth;
    stage.classList.add("is-error");

    window.clearTimeout(state.errorTimer);
    state.errorTimer = window.setTimeout(() => {
      stage.classList.remove("is-error");
    }, 280);
  };

  const findNearPointOrder = (point, expectedOrder) => {
    const centers = getPointCenters();
    const center = centers.find((item) => item.order === expectedOrder);
    if (!center) return null;

    const snapRadius = Math.max(22, Math.min(46, stage.clientWidth * 0.08));
    return distance(point, center) <= snapRadius ? expectedOrder : null;
  };

  const completeStep = ({ startOrder, targetOrder }) => {
    if (state.stitchedOrders.length === 0) {
      state.stitchedOrders.push(startOrder);
    }
    state.stitchedOrders.push(targetOrder);
    state.active = null;
    renderPaths();
    updateStatus();
  };

  const onPointerDown = (event) => {
    if (state.active || isComplete()) return;

    const expectedOrder =
      state.stitchedOrders.length > 0
        ? state.stitchedOrders[state.stitchedOrders.length - 1]
        : 1;
    const point = { x: event.clientX, y: event.clientY };

    if (!findNearPointOrder(point, expectedOrder)) {
      flashError();
      return;
    }

      state.active = {
        pointerId: event.pointerId,
        startOrder: expectedOrder,
      targetOrder: expectedOrder + 1,
    };

    stage.setPointerCapture(event.pointerId);
    renderPaths(point);
  };

  const onPointerMove = (event) => {
    if (!state.active || state.active.pointerId !== event.pointerId) return;

    const point = { x: event.clientX, y: event.clientY };
    renderPaths(point);

    if (state.active.targetOrder > points.length) {
      state.active = null;
      renderPaths();
      updateStatus();
      return;
    }

    const targetOrder = findNearPointOrder(point, state.active.targetOrder);
    if (targetOrder) {
      completeStep({
        startOrder: state.active.startOrder,
        targetOrder,
      });
    }
  };

  const stopActivePointer = (event) => {
    if (!state.active || state.active.pointerId !== event.pointerId) return;
    state.active = null;
    renderPaths();
  };

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", stopActivePointer);
  stage.addEventListener("pointercancel", stopActivePointer);

  updateStatus();

  return {
    getState() {
      return {
        progress: getProgress(),
        completedPoints: getCompletedPointsCount(),
        totalPoints: points.length,
        isComplete: isComplete(),
      };
    },
    reset() {
      state.stitchedOrders = [];
      state.active = null;
      renderPaths();
      updateStatus();
    },
    destroy() {
      window.clearTimeout(state.errorTimer);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", stopActivePointer);
      stage.removeEventListener("pointercancel", stopActivePointer);
      stage.classList.remove("is-error", "is-complete");
    },
  };
}
