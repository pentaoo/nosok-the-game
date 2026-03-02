const SOCK_ASSETS = Object.values(
  import.meta.glob("../img/socks/*.svg", { eager: true, import: "default" })
);

const MAX_DT_SEC = 0.05;
const GRAVITY = 920;
const DRAG = 0.985;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createSockState(index, assets) {
  const asset = assets[index % assets.length];
  const el = document.createElement("button");
  el.type = "button";
  el.className = "hero-sock";
  el.setAttribute("aria-label", "Перетащить носок");
  el.innerHTML = `<img src="${asset}" alt="" loading="lazy" draggable="false" />`;

  return {
    el,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    spin: 0,
    size: 72,
    dragging: false,
    pointerId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    lastDragTs: 0,
    lastDragX: 0,
    lastDragY: 0,
  };
}

function respawnSock(sock, width, height, { fromTop = true } = {}) {
  sock.size = randomBetween(44, 148);
  sock.x = randomBetween(-sock.size * 0.2, width - sock.size * 0.8);
  sock.y = fromTop ? randomBetween(-height * 0.8, -sock.size * 1.2) : randomBetween(0, height);
  sock.vx = randomBetween(-22, 22);
  sock.vy = randomBetween(42, 130);
  sock.rotation = randomBetween(-28, 28);
  sock.spin = randomBetween(-22, 22);
}

function applySockTransform(sock) {
  sock.el.style.transform = `translate3d(${sock.x}px, ${sock.y}px, 0) rotate(${sock.rotation}deg)`;
  sock.el.style.width = `${sock.size}px`;
  sock.el.style.height = `${sock.size}px`;
}

export function initHeroSocks() {
  const field = document.getElementById("hero-sock-field");
  if (!(field instanceof HTMLElement) || SOCK_ASSETS.length === 0) {
    return {
      destroy() {},
    };
  }

  const bounds = {
    width: Math.max(1, field.clientWidth),
    height: Math.max(1, field.clientHeight),
  };

  const sockCount = Math.max(14, Math.min(28, Math.round(bounds.width / 86)));
  const socks = [];

  for (let index = 0; index < sockCount; index += 1) {
    const sock = createSockState(index, SOCK_ASSETS);
    respawnSock(sock, bounds.width, bounds.height, { fromTop: false });
    applySockTransform(sock);
    field.append(sock.el);
    socks.push(sock);
  }

  const onResize = () => {
    bounds.width = Math.max(1, field.clientWidth);
    bounds.height = Math.max(1, field.clientHeight);
  };

  const resizeObserver =
    "ResizeObserver" in window
      ? new ResizeObserver(() => {
          onResize();
        })
      : null;

  resizeObserver?.observe(field);
  window.addEventListener("resize", onResize);

  const pointerState = {
    sock: null,
  };

  const getFieldPoint = (event) => {
    const rect = field.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const onPointerMove = (event) => {
    const activeSock = pointerState.sock;
    if (!activeSock || event.pointerId !== activeSock.pointerId) return;

    const now = window.performance.now();
    const point = getFieldPoint(event);
    const nextX = point.x - activeSock.dragOffsetX;
    const nextY = point.y - activeSock.dragOffsetY;

    if (activeSock.lastDragTs > 0) {
      const dtMs = Math.max(16, now - activeSock.lastDragTs);
      activeSock.vx = ((nextX - activeSock.lastDragX) / dtMs) * 24;
      activeSock.vy = ((nextY - activeSock.lastDragY) / dtMs) * 24;
    }

    activeSock.lastDragTs = now;
    activeSock.lastDragX = nextX;
    activeSock.lastDragY = nextY;

    activeSock.x = nextX;
    activeSock.y = nextY;
    applySockTransform(activeSock);
  };

  const releasePointer = (event) => {
    const activeSock = pointerState.sock;
    if (!activeSock || event.pointerId !== activeSock.pointerId) return;

    activeSock.dragging = false;
    activeSock.pointerId = null;
    activeSock.el.classList.remove("is-dragging");
    pointerState.sock = null;
  };

  const onPointerDown = (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest(".hero-sock") : null;
    if (!(target instanceof HTMLElement)) return;

    const sock = socks.find((item) => item.el === target);
    if (!sock || pointerState.sock) return;

    event.preventDefault();
    const point = getFieldPoint(event);
    pointerState.sock = sock;
    sock.dragging = true;
    sock.pointerId = event.pointerId;
    sock.dragOffsetX = point.x - sock.x;
    sock.dragOffsetY = point.y - sock.y;
    sock.lastDragTs = window.performance.now();
    sock.lastDragX = sock.x;
    sock.lastDragY = sock.y;
    sock.el.classList.add("is-dragging");
  };

  field.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);

  let rafId = 0;
  let prevTs = window.performance.now();

  const tick = (ts) => {
    const dt = Math.min(MAX_DT_SEC, (ts - prevTs) / 1000 || 0.016);
    prevTs = ts;

    for (const sock of socks) {
      if (sock.dragging) continue;

      sock.vy = Math.min(sock.vy + GRAVITY * dt, 540);
      sock.vx *= DRAG;
      sock.x += sock.vx * dt * 60;
      sock.y += sock.vy * dt;
      sock.rotation += sock.spin * dt;

      if (sock.x < -sock.size * 1.3) sock.x = bounds.width + sock.size * 0.3;
      if (sock.x > bounds.width + sock.size * 1.3) sock.x = -sock.size * 0.3;

      if (sock.y > bounds.height + sock.size * 1.4) {
        respawnSock(sock, bounds.width, bounds.height, { fromTop: true });
      }

      applySockTransform(sock);
    }

    rafId = window.requestAnimationFrame(tick);
  };

  rafId = window.requestAnimationFrame(tick);

  return {
    destroy() {
      window.cancelAnimationFrame(rafId);
      field.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      socks.forEach((sock) => sock.el.remove());
      pointerState.sock = null;
    },
  };
}
