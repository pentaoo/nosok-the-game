import defaultTargetAsset from "../img/nosok.svg";

const DEFAULT_TARGET_ASSET = defaultTargetAsset;
const TARGET_SOCK_ASSETS = Object.entries(
  import.meta.glob("../img/socks/*.svg", {
    eager: true,
    import: "default",
  }),
)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, assetUrl]) => assetUrl);

const TARGETS = [
  { hp: 110, drop: [34, 46], tilt: -28 },
  { hp: 128, drop: [40, 54], tilt: -24 },
  { hp: 148, drop: [48, 64], tilt: -31 },
  { hp: 174, drop: [58, 78], tilt: -22 },
];

const UPGRADES = [
  { id: "sandpaper", power: 4, type: "click", cost: 90 },
  { id: "scissors", power: 16, type: "click", cost: 230 },
  { id: "cutters", power: 24, type: "click", cost: 460 },
  { id: "shredder", power: 60, type: "click", cost: 920 },
  { id: "flamethrower", power: 4, type: "auto", cost: 140 },
  { id: "overlock", power: 16, type: "auto", cost: 360 },
  { id: "press", power: 24, type: "auto", cost: 640 },
  { id: "turbine", power: 60, type: "auto", cost: 1240 },
];

const UPGRADE_BY_ID = new Map(UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function getShuffledAssetQueue(assets) {
  const queue = [...assets];
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[swapIndex]] = [queue[swapIndex], queue[i]];
  }
  return queue;
}

function toggleClassOnNextFrame(node, className, frameState, key) {
  node.classList.remove(className);
  if (frameState[key]) window.cancelAnimationFrame(frameState[key]);
  frameState[key] = window.requestAnimationFrame(() => {
    node.classList.add(className);
  });
}

function initTooltip(helpButton, tooltip) {
  if (!helpButton || !tooltip) return;

  const closeTooltip = () => {
    tooltip.classList.remove("is-open");
    helpButton.setAttribute("aria-expanded", "false");
  };

  helpButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = tooltip.classList.toggle("is-open");
    helpButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (helpButton.contains(target) || tooltip.contains(target)) return;
    closeTooltip();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTooltip();
  });
}

function getRecyclerNodes() {
  const stage = document.querySelector("#recycler-stage");
  const target = document.querySelector("#recycler-target");
  const targetImage = document.querySelector("#recycler-target-img");
  const hitFlash = document.querySelector("#recycler-hitflash");
  const popLayer = document.querySelector("#recycler-pop-layer");
  const lifeBar = document.querySelector("#recycler-life-bar");
  const drop = document.querySelector("#recycler-drop");
  const hitline = document.querySelector("#recycler-hitline");
  const resourceValue = document.querySelector("#recycler-resource-value");
  const clickValue = document.querySelector("#recycler-click-value");
  const autoValue = document.querySelector("#recycler-auto-value");
  const helpButton = document.querySelector("#recycler-help");
  const tooltip = document.querySelector("#recycler-tooltip");
  const tools = Array.from(document.querySelectorAll(".recycler-tool"));

  if (
    !stage ||
    !target ||
    !(targetImage instanceof HTMLImageElement) ||
    !hitFlash ||
    !popLayer ||
    !lifeBar ||
    !drop ||
    !hitline ||
    !resourceValue ||
    !clickValue ||
    !autoValue
  ) {
    return null;
  }

  if (tools.length !== UPGRADES.length) return null;

  return {
    stage,
    target,
    targetImage,
    hitFlash,
    popLayer,
    lifeBar,
    drop,
    hitline,
    resourceValue,
    clickValue,
    autoValue,
    helpButton,
    tooltip,
    tools,
  };
}

export function initRecyclerBlock() {
  const nodes = getRecyclerNodes();
  if (!nodes) return;

  const {
    stage,
    target,
    targetImage,
    hitFlash,
    popLayer,
    lifeBar,
    drop,
    hitline,
    resourceValue,
    clickValue,
    autoValue,
    helpButton,
    tooltip,
    tools,
  } = nodes;

  let requestedAsset = DEFAULT_TARGET_ASSET;
  const availableAssets = TARGET_SOCK_ASSETS.length
    ? TARGET_SOCK_ASSETS
    : [DEFAULT_TARGET_ASSET];

  const state = {
    targetIndex: 0,
    targetHp: TARGETS[0].hp,
    materials: 0,
    clickPower: 12,
    autoPower: 0,
    autoBuffer: 0,
    bought: new Set(),
    currentAsset: DEFAULT_TARGET_ASSET,
    assetQueue: getShuffledAssetQueue(availableAssets),
    switching: false,
    timers: { drop: 0, switch: 0 },
    frames: { hit: 0, strike: 0, drop: 0, flash: 0, auto: 0 },
  };

  targetImage.addEventListener("error", () => {
    if (requestedAsset === DEFAULT_TARGET_ASSET) return;
    requestedAsset = DEFAULT_TARGET_ASSET;
    state.currentAsset = DEFAULT_TARGET_ASSET;
    targetImage.src = DEFAULT_TARGET_ASSET;
  });

  const updateStats = () => {
    resourceValue.textContent = state.materials.toLocaleString("ru-RU");
    clickValue.textContent = state.clickPower.toLocaleString("ru-RU");
    autoValue.textContent = state.autoPower.toLocaleString("ru-RU");
  };

  const updateLife = () => {
    const maxHp = TARGETS[state.targetIndex].hp;
    const ratio = Math.max(0, state.targetHp / maxHp);
    lifeBar.style.transform = `scaleX(${ratio.toFixed(3)})`;
  };

  const syncTools = () => {
    tools.forEach((toolButton) => {
      const upgradeId = toolButton.dataset.toolId;
      const upgrade = UPGRADE_BY_ID.get(upgradeId ?? "");
      if (!upgrade) return;

      const isBought = state.bought.has(upgrade.id);
      const isReady = !isBought && state.materials >= upgrade.cost;

      toolButton.disabled = isBought;
      toolButton.classList.toggle("is-bought", isBought);
      toolButton.classList.toggle("is-ready", isReady);
      toolButton.classList.toggle("is-locked", !isBought && !isReady);

      const meta = toolButton.querySelector(".recycler-tool-meta");
      if (meta) meta.textContent = isBought ? "куплено" : `${upgrade.cost} сырья`;
    });
  };

  const showDrop = (value) => {
    drop.textContent = value;
    toggleClassOnNextFrame(drop, "is-show", state.frames, "drop");
    window.clearTimeout(state.timers.drop);
    state.timers.drop = window.setTimeout(() => {
      drop.classList.remove("is-show");
    }, 520);
  };

  const spawnHitPop = (damage) => {
    const pop = document.createElement("span");
    pop.className = "recycler-pop";
    pop.textContent = `-${damage}`;
    pop.style.setProperty("--pop_x", `${randomInt(-18, 18)}%`);
    pop.style.setProperty("--pop_y", `${randomInt(-8, 12)}%`);
    popLayer.append(pop);
    window.requestAnimationFrame(() => {
      pop.classList.add("is-show");
    });
    window.setTimeout(() => {
      pop.remove();
    }, 430);
  };

  const strike = (damage = 0) => {
    target.classList.remove("is-hit");
    target.style.setProperty("--hit_kick", `${randomInt(-4, 4)}deg`);
    toggleClassOnNextFrame(target, "is-hit", state.frames, "hit");

    hitline.style.setProperty("--strike_rot", `${randomInt(-42, 42)}deg`);
    hitline.style.setProperty("--strike_x", `${randomInt(-16, 16)}%`);
    hitline.style.setProperty("--strike_y", `${randomInt(-14, 14)}%`);
    toggleClassOnNextFrame(hitline, "is-active", state.frames, "strike");

    hitFlash.style.setProperty("--flash_x", `${randomInt(-26, 26)}%`);
    hitFlash.style.setProperty("--flash_y", `${randomInt(-20, 20)}%`);
    toggleClassOnNextFrame(hitFlash, "is-active", state.frames, "flash");

    if (damage > 0) spawnHitPop(damage);
    if (typeof navigator.vibrate === "function") navigator.vibrate(8);
  };

  const pullNextAsset = () => {
    if (!state.assetQueue.length) {
      state.assetQueue = getShuffledAssetQueue(availableAssets);
    }

    let nextAsset = state.assetQueue.pop() ?? DEFAULT_TARGET_ASSET;
    if (nextAsset === state.currentAsset && state.assetQueue.length) {
      state.assetQueue.unshift(nextAsset);
      nextAsset = state.assetQueue.pop() ?? nextAsset;
    }

    state.currentAsset = nextAsset;
    return nextAsset;
  };

  const setTarget = (index) => {
    const nextTarget = TARGETS[index];
    state.targetIndex = index;
    state.targetHp = nextTarget.hp;
    target.classList.remove("is-shredded");
    target.style.setProperty("--target_tilt", `${nextTarget.tilt}deg`);
    requestedAsset = pullNextAsset();
    targetImage.src = requestedAsset;
    updateLife();
  };

  const collectTargetDrop = () => {
    const targetData = TARGETS[state.targetIndex];
    const baseDrop = randomInt(targetData.drop[0], targetData.drop[1]);
    const gain = Math.round(baseDrop * (1 + state.bought.size * 0.05));

    state.materials += gain;
    updateStats();
    syncTools();
    showDrop(`+${gain}`);
  };

  const breakTarget = () => {
    collectTargetDrop();
    target.classList.add("is-shredded");
    state.switching = true;

    window.clearTimeout(state.timers.switch);
    state.timers.switch = window.setTimeout(() => {
      const nextIndex = (state.targetIndex + 1) % TARGETS.length;
      setTarget(nextIndex);
      state.switching = false;
    }, 320);
  };

  const applyDamage = (damage, withStrike = false) => {
    if (state.switching) return;
    if (damage <= 0) return;

    if (withStrike) strike(damage);
    state.targetHp = Math.max(0, state.targetHp - damage);
    updateLife();

    if (state.targetHp <= 0) breakTarget();
  };

  const breakDownCurrent = () => {
    const spread = 0.86 + Math.random() * 0.28;
    const damage = Math.max(1, Math.round(state.clickPower * spread));
    applyDamage(damage, true);
  };

  const onToolClick = (event) => {
    const upgradeId = event.currentTarget.dataset.toolId;
    const upgrade = UPGRADE_BY_ID.get(upgradeId ?? "");
    if (!upgrade) return;
    if (state.bought.has(upgrade.id)) return;
    if (state.materials < upgrade.cost) return;

    state.materials -= upgrade.cost;
    state.bought.add(upgrade.id);

    if (upgrade.type === "click") {
      state.clickPower += upgrade.power;
    } else {
      state.autoPower += upgrade.power;
    }

    updateStats();
    syncTools();
    showDrop(`-${upgrade.cost}`);

    stage.classList.remove("is-upgraded");
    window.requestAnimationFrame(() => {
      stage.classList.add("is-upgraded");
    });
  };

  const startAutoLoop = () => {
    let previousTime = window.performance.now();

    const step = (now) => {
      const dt = Math.min((now - previousTime) / 1000, 0.25);
      previousTime = now;

      if (state.autoPower > 0 && !state.switching) {
        state.autoBuffer += state.autoPower * dt;
        const autoDamage = Math.floor(state.autoBuffer);
        if (autoDamage > 0) {
          state.autoBuffer -= autoDamage;
          applyDamage(autoDamage, false);
        }
      }

      state.frames.auto = window.requestAnimationFrame(step);
    };

    state.frames.auto = window.requestAnimationFrame(step);
  };

  initTooltip(helpButton, tooltip);
  target.addEventListener("click", breakDownCurrent);
  tools.forEach((toolButton) => toolButton.addEventListener("click", onToolClick));

  setTarget(0);
  updateStats();
  syncTools();
  startAutoLoop();
}
