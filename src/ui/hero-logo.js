import logoYellow from "../img/logo_yellow.svg";
import logoPink from "../img/logo_pink.svg";
import logoGreen from "../img/logo_green.svg";
import logoPurple from "../img/logo_purple.svg";

const prefersReducedMotion = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;

const logoVariants = [
  { id: "yellow", src: logoYellow, color: "var(--yellow)" },
  { id: "pink", src: logoPink, color: "var(--pink)" },
  { id: "green", src: logoGreen, color: "var(--green)" },
  { id: "purple", src: logoPurple, color: "var(--purple)" },
];

function getLogoIndexById(id) {
  return logoVariants.findIndex((variant) => variant.id === id);
}

const preloadLogo = (src) => {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
};

const swapLogo = async (logo, nextVariant) => {
  const img = new Image();
  img.src = nextVariant.src;
  try {
    await img.decode();
  } catch {
    // Ignore decode errors and still swap.
  }
  logo.src = nextVariant.src;
};

function getEdgePoint(logoRect, heroRect) {
  const edge = Math.floor(Math.random() * 4);
  const offsetX = Math.random() * logoRect.width;
  const offsetY = Math.random() * logoRect.height;

  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = offsetX;
    y = 0;
  } else if (edge === 1) {
    x = offsetX;
    y = logoRect.height;
  } else if (edge === 2) {
    x = 0;
    y = offsetY;
  } else {
    x = logoRect.width;
    y = offsetY;
  }

  return {
    x: logoRect.left - heroRect.left + x,
    y: logoRect.top - heroRect.top + y,
  };
}

function spawnParticle(stream, heroRect, logoRect, color) {
  const particle = document.createElement("span");
  const size = 6 + Math.random() * 12;
  const rotation = -80 + Math.random() * 160;
  const origin = getEdgePoint(logoRect, heroRect);
  const centerX = logoRect.left - heroRect.left + logoRect.width / 2;
  const centerY = logoRect.top - heroRect.top + logoRect.height / 2;
  const dirX = origin.x - centerX;
  const dirY = origin.y - centerY;
  const length = Math.hypot(dirX, dirY) || 1;
  const distance =
    Math.max(heroRect.width, heroRect.height) * (0.6 + Math.random() * 0.5);

  particle.className = "hero-logo-particle";
  particle.style.left = `${origin.x}px`;
  particle.style.top = `${origin.y}px`;
  particle.style.setProperty("--size", `${size}px`);
  particle.style.setProperty("--rot", `${rotation}deg`);
  particle.style.setProperty("--color", color);
  particle.style.setProperty(
    "--tx",
    `${(dirX / length) * distance}px`
  );
  particle.style.setProperty(
    "--ty",
    `${(dirY / length) * distance}px`
  );
  particle.style.setProperty("--dur", `${2.6 + Math.random() * 1.4}s`);

  stream.appendChild(particle);
  particle.addEventListener("animationend", () => particle.remove());
  window.setTimeout(() => particle.remove(), 4200);
}

function animateWater(turbulence, displacement) {
  if (!turbulence || !displacement) return;

  const duration = 720;
  const start = performance.now();
  const startFreq = 0.02;
  const endFreq = 0.002;
  const startScale = 28;

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - t, 3);
    const freq = startFreq + (endFreq - startFreq) * ease;
    const scale = startScale * (1 - ease);

    turbulence.setAttribute("baseFrequency", `${freq} ${freq * 1.35}`);
    displacement.setAttribute("scale", scale.toFixed(2));

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      turbulence.setAttribute("baseFrequency", "0.001 0.001");
      displacement.setAttribute("scale", "0");
    }
  }

  requestAnimationFrame(step);
}

export function initHeroLogo() {
  const button = document.querySelector(".hero-logo-button");
  const logo = document.querySelector("#hero-logo");
  const stream = document.querySelector(".hero-logo-stream");
  const hero = document.querySelector(".home-hero");
  const turbulence = document.querySelector("#hero-water-turbulence");
  const displacement = document.querySelector("#hero-water-displacement");

  if (!button || !logo || !stream || !hero) return;

  const initialId = logo.dataset.logo;
  let currentIndex = getLogoIndexById(initialId);
  if (currentIndex < 0) currentIndex = 0;
  hero.style.setProperty("--logo-accent", logoVariants[currentIndex].color);

  Promise.allSettled(logoVariants.map((variant) => preloadLogo(variant.src)));

  let rippleTimeout = null;
  let streamTimer = null;
  let streamStopTimeout = null;
  let isSwapping = false;

  function stopStream() {
    if (streamTimer) window.clearInterval(streamTimer);
    if (streamStopTimeout) window.clearTimeout(streamStopTimeout);
    streamTimer = null;
    streamStopTimeout = null;
  }

  function startStream(color) {
    if (prefersReducedMotion) return;

    stopStream();

    streamTimer = window.setInterval(() => {
      const heroRect = hero.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i += 1) {
        spawnParticle(stream, heroRect, logoRect, color);
      }
    }, 90);

    streamStopTimeout = window.setTimeout(() => {
      stopStream();
    }, 3400);
  }

  button.addEventListener("click", async () => {
    if (isSwapping) return;
    isSwapping = true;
    const currentVariant = logoVariants[currentIndex];

    startStream(currentVariant.color);

    const nextIndex = (currentIndex + 1) % logoVariants.length;
    const nextVariant = logoVariants[nextIndex];
    const swapPromise = swapLogo(logo, nextVariant);

    if (!prefersReducedMotion) {
      button.classList.remove("is-rippling");
      void button.offsetWidth;
      button.classList.add("is-rippling");

      animateWater(turbulence, displacement);

      if (rippleTimeout) window.clearTimeout(rippleTimeout);
      rippleTimeout = window.setTimeout(() => {
        button.classList.remove("is-rippling");
      }, 760);
    }

    await swapPromise;
    logo.dataset.logo = nextVariant.id;
    hero.style.setProperty("--logo-accent", nextVariant.color);
    currentIndex = nextIndex;

    isSwapping = false;
  });
}
