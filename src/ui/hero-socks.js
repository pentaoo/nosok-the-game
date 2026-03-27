const SOCK_ASSETS = Object.values(
  import.meta.glob("../img/socks/*.svg", { eager: true, import: "default" })
);

const MAX_DT_SEC = 0.05;
const GRAVITY = 250;
const HERO_BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};
const HERO_PROFILES = {
  mobile: {
    count: { min: 5, max: 7, divisor: 105 },
    size: [42, 112],
    speed: [360, 760],
    drift: [-8, 28],
    chaos: [18, 52],
    chaosFreq: [1.1, 2.3],
    chaosJitter: [8, 18],
    spin: [-22, 22],
    initialAge: [0, 0.35],
  },
  tablet: {
    count: { min: 7, max: 10, divisor: 98 },
    size: [44, 132],
    speed: [420, 900],
    drift: [-10, 42],
    chaos: [28, 84],
    chaosFreq: [1.2, 3.1],
    chaosJitter: [12, 30],
    spin: [-32, 32],
    initialAge: [0, 0.7],
  },
  desktop: {
    count: { min: 12, max: 28, divisor: 94 },
    size: [44, 148],
    speed: [460, 1040],
    drift: [-10, 55],
    chaos: [46, 128],
    chaosFreq: [1.2, 3.8],
    chaosJitter: [18, 54],
    spin: [-44, 44],
    initialAge: [0, 1.2],
  },
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function getHeroProfile(width) {
  if (width <= HERO_BREAKPOINTS.mobile) return HERO_PROFILES.mobile;
  if (width <= HERO_BREAKPOINTS.tablet) return HERO_PROFILES.tablet;
  return HERO_PROFILES.desktop;
}

function getSockCount(width, profile) {
  const estimated = Math.round(width / profile.count.divisor);
  return Math.max(profile.count.min, Math.min(profile.count.max, estimated));
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
    drift: 0,
    rotation: 0,
    spin: 0,
    chaos: 0,
    chaosFreq: 0,
    chaosPhase: 0,
    chaosJitter: 0,
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

function respawnSock(sock, width, height, profile, { initial = false } = {}) {
  sock.size = randomBetween(...profile.size);

  // Эмиттер в нижнем левом углу экрана hero.
  sock.x = randomBetween(-sock.size * 0.35, sock.size * 0.16);
  sock.y = height - randomBetween(sock.size * 0.15, sock.size * 0.85);

  // Полет в верх/право с разлетом: носки уходят за правую рамку секции.
  const angleDeg = randomBetween(-72, -12);
  const angleRad = (angleDeg * Math.PI) / 180;
  const speed = randomBetween(...profile.speed);

  sock.vx = Math.cos(angleRad) * speed;
  sock.vy = Math.sin(angleRad) * speed;
  sock.drift = randomBetween(...profile.drift);

  // Хаотичность: индивидуальная синусоида + микро-джиттер по X.
  sock.chaos = randomBetween(...profile.chaos);
  sock.chaosFreq = randomBetween(...profile.chaosFreq);
  sock.chaosPhase = randomBetween(0, Math.PI * 2);
  sock.chaosJitter = randomBetween(...profile.chaosJitter);

  sock.rotation = randomBetween(-36, 36);
  sock.spin = randomBetween(...profile.spin);

  // Стартовый джиттер, чтобы поле сразу не выглядело пустым.
  if (initial) {
    const age = randomBetween(...profile.initialAge);
    sock.x += sock.vx * age;
    sock.y += sock.vy * age + 0.5 * GRAVITY * age * age;
    sock.vy += GRAVITY * age;
    sock.rotation += sock.spin * age;

    const outOfBounds =
      sock.x < -sock.size * 1.6 ||
      sock.x > width + sock.size * 1.6 ||
      sock.y < -sock.size * 1.6 ||
      sock.y > height + sock.size * 1.8;

    if (outOfBounds) {
      respawnSock(sock, width, height, profile, { initial: false });
    }
  }
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

  const socks = [];
  let currentProfile = getHeroProfile(bounds.width);
  let nextSockIndex = 0;

  const createAndMountSock = ({ initial = true } = {}) => {
    const sock = createSockState(nextSockIndex, SOCK_ASSETS);
    nextSockIndex += 1;
    respawnSock(sock, bounds.width, bounds.height, currentProfile, { initial });
    applySockTransform(sock);
    field.append(sock.el);
    socks.push(sock);
    return sock;
  };

  const removeSock = (sock) => {
    const index = socks.indexOf(sock);
    if (index >= 0) socks.splice(index, 1);
    if (pointerState.sock === sock) pointerState.sock = null;
    sock.el.remove();
  };

  const syncSockPool = () => {
    currentProfile = getHeroProfile(bounds.width);
    const targetCount = getSockCount(bounds.width, currentProfile);

    while (socks.length < targetCount) {
      createAndMountSock({ initial: true });
    }

    while (socks.length > targetCount) {
      const removable = [...socks].reverse().find((sock) => !sock.dragging) ?? socks.at(-1);
      if (!removable) break;
      removeSock(removable);
    }
  };

  const pointerState = {
    sock: null,
  };

  syncSockPool();

  const onResize = () => {
    bounds.width = Math.max(1, field.clientWidth);
    bounds.height = Math.max(1, field.clientHeight);
    syncSockPool();
  };

  const resizeObserver =
    "ResizeObserver" in window
      ? new ResizeObserver(() => {
          onResize();
        })
      : null;

  resizeObserver?.observe(field);
  window.addEventListener("resize", onResize);

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
    const t = ts / 1000;

    for (const sock of socks) {
      if (sock.dragging) continue;

      const wave = Math.sin(t * sock.chaosFreq + sock.chaosPhase) * sock.chaos;
      const jitter = randomBetween(-sock.chaosJitter, sock.chaosJitter);
      sock.vx += (sock.drift + wave + jitter) * dt;
      sock.vy += GRAVITY * dt;
      sock.x += sock.vx * dt;
      sock.y += sock.vy * dt;
      sock.rotation += sock.spin * dt;

      const outOfBounds =
        sock.x < -sock.size * 1.8 ||
        sock.x > bounds.width + sock.size * 1.8 ||
        sock.y < -sock.size * 1.8 ||
        sock.y > bounds.height + sock.size * 2;

      if (outOfBounds) {
        respawnSock(sock, bounds.width, bounds.height, currentProfile, { initial: false });
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
