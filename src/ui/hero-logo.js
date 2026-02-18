import logoYellow from "../img/logo_yellow.svg";
import logoPink from "../img/logo_pink.svg";
import logoGreen from "../img/logo_green.svg";
import logoPurple from "../img/logo_purple.svg";

const prefersReducedMotion = Boolean(
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
);

const logoVariants = [
  { id: "yellow", src: logoYellow, color: "var(--yellow)" },
  { id: "pink", src: logoPink, color: "var(--pink)" },
  { id: "green", src: logoGreen, color: "var(--green)" },
  { id: "purple", src: logoPurple, color: "var(--purple)" },
];
const logoIndexById = new Map(logoVariants.map((variant, index) => [variant.id, index]));

const decodeImage = (src) => {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
};

export function initHeroLogo() {
  const button = document.querySelector(".hero-logo-button");
  const logo = document.querySelector("#hero-logo");
  const hero = document.querySelector(".home-hero");

  if (!button || !logo || !hero) return;

  let currentIndex = logoIndexById.get(logo.dataset.logo) ?? 0;
  const setAccent = (color) => {
    hero.style.setProperty("--logo_accent", color);
    document.documentElement.style.setProperty("--logo_accent", color);
  };

  setAccent(logoVariants[currentIndex].color);

  void Promise.allSettled(logoVariants.map((variant) => decodeImage(variant.src)));

  let burstTimer = 0;
  let isSwapping = false;
  const runBurst = () => {
    if (prefersReducedMotion) return;
    button.classList.remove("is-burst");
    void button.offsetWidth;
    button.classList.add("is-burst");
    window.clearTimeout(burstTimer);
    burstTimer = window.setTimeout(() => {
      button.classList.remove("is-burst");
    }, 560);
  };

  button.addEventListener("click", async () => {
    if (isSwapping) return;
    isSwapping = true;

    const nextIndex = (currentIndex + 1) % logoVariants.length;
    const nextVariant = logoVariants[nextIndex];
    runBurst();

    try {
      await decodeImage(nextVariant.src);
      logo.src = nextVariant.src;
      logo.dataset.logo = nextVariant.id;
      setAccent(nextVariant.color);
      currentIndex = nextIndex;
    } finally {
      isSwapping = false;
    }
  });
}
