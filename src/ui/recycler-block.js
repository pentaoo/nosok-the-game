const TARGET_SOCK_ASSETS = Object.values(
  import.meta.glob("../img/socks/*.svg", { eager: true, import: "default" })
);

const DEFAULT_TARGET_ASSET = TARGET_SOCK_ASSETS[0] ?? "";

const TARGETS = [
  { hp: 110, drop: [34, 46], tilt: -28 },
  { hp: 128, drop: [40, 54], tilt: -24 },
  { hp: 148, drop: [48, 64], tilt: -31 },
  { hp: 174, drop: [58, 78], tilt: -22 },
];

const UPGRADES = [
  { id: "sandpaper", power: 4, type: "click", cost: 90, label: "наждачка", rate: "+4/клик" },
  { id: "scissors", power: 16, type: "click", cost: 230, label: "ножницы", rate: "+16/клик" },
  { id: "cutters", power: 24, type: "click", cost: 460, label: "нож", rate: "+24/клик" },
  {
    id: "shredder",
    power: 60,
    type: "click",
    cost: 920,
    label: "лазерный резак",
    rate: "+60/клик",
  },
  { id: "flamethrower", power: 4, type: "auto", cost: 140, label: "пресс", rate: "+4/сек" },
  { id: "overlock", power: 16, type: "auto", cost: 360, label: "роборука", rate: "+16/сек" },
  { id: "press", power: 24, type: "auto", cost: 640, label: "огнемет", rate: "+24/сек" },
  { id: "turbine", power: 60, type: "auto", cost: 1240, label: "шредер", rate: "+60/сек" },
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
  if (!helpButton || !tooltip) return () => {};

  const closeTooltip = () => {
    tooltip.classList.remove("is-open");
    helpButton.setAttribute("aria-expanded", "false");
  };

  const onHelpClick = (event) => {
    event.stopPropagation();
    const isOpen = tooltip.classList.toggle("is-open");
    helpButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  const onDocumentClick = (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (helpButton.contains(target) || tooltip.contains(target)) return;
    closeTooltip();
  };

  const onDocumentKeyDown = (event) => {
    if (event.key === "Escape") closeTooltip();
  };

  helpButton.addEventListener("click", onHelpClick);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeyDown);

  return () => {
    helpButton.removeEventListener("click", onHelpClick);
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeyDown);
  };
}

function getRecyclerNodes() {
  const stage = document.querySelector("#recycler-stage");
  const target = document.querySelector("#recycler-target");
  const targetImage = document.querySelector("#recycler-target-img");
  const hitFlash = document.querySelector("#recycler-hitflash");
  const popLayer = document.querySelector("#recycler-pop-layer");
  const lifeBar = document.querySelector("#recycler-life-bar");
  const hpLabel = document.querySelector("#recycler-hp-label");
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
    !hpLabel ||
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
    hpLabel,
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
  if (!nodes) {
    return {
      setActive() {},
      syncVisibility() {},
      destroy() {},
    };
  }

  const {
    target,
    targetImage,
    hitFlash,
    popLayer,
    lifeBar,
    hpLabel,
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
  const availableAssets = TARGET_SOCK_ASSETS.length ? TARGET_SOCK_ASSETS : [DEFAULT_TARGET_ASSET];

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
    timers: { drop: 0, switch: 0, auto: 0 },
    frames: { hit: 0, strike: 0, drop: 0, flash: 0 },
    auto: {
      active: true,
      intervalMs: 125,
      lastUpdateTs: window.performance.now(),
    },
  };

  const onTargetImageError = () => {
    if (!DEFAULT_TARGET_ASSET || requestedAsset === DEFAULT_TARGET_ASSET) return;
    requestedAsset = DEFAULT_TARGET_ASSET;
    state.currentAsset = DEFAULT_TARGET_ASSET;
    targetImage.src = DEFAULT_TARGET_ASSET;
  };
  targetImage.addEventListener("error", onTargetImageError);

  const updateStats = () => {
    resourceValue.textContent = state.materials.toLocaleString("ru-RU");
    clickValue.textContent = state.clickPower.toLocaleString("ru-RU");
    autoValue.textContent = state.autoPower.toLocaleString("ru-RU");
  };

  const updateLife = () => {
    const maxHp = TARGETS[state.targetIndex].hp;
    const ratio = Math.max(0, Math.min(1, state.targetHp / maxHp));

    const isMobile = window.innerWidth <= 1024;
    lifeBar.style.transform = "none";

    if (isMobile) {
      const hiddenRight = (1 - ratio) * 100;
      lifeBar.style.clipPath = `inset(0 ${hiddenRight.toFixed(3)}% 0 0)`;
    } else {
      const hiddenTop = (1 - ratio) * 100;
      lifeBar.style.clipPath = `inset(${hiddenTop.toFixed(3)}% 0 0 0)`;
    }

    hpLabel.textContent = `${Math.ceil(state.targetHp)} HP`;
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

      const nameEl = toolButton.querySelector(".recycler-tool-name");
      if (nameEl) nameEl.textContent = upgrade.label;

      const rateEl = toolButton.querySelector(".recycler-tool-rate");
      if (rateEl) rateEl.textContent = upgrade.rate;

      toolButton.setAttribute("aria-label", `Купить ${upgrade.label} ${upgrade.rate}`);

      const meta = toolButton.querySelector(".recycler-tool-meta");
      if (meta) meta.textContent = isBought ? "" : `${upgrade.cost} сырья`;
    });
  };

  const showDrop = (value) => {
    drop.textContent = value;
    toggleClassOnNextFrame(drop, "is-show", state.frames, "drop");
    window.clearTimeout(state.timers.drop);
    state.timers.drop = window.setTimeout(() => {
      drop.classList.remove("is-show");
    }, 420);
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
    target.style.setProperty("--hit_kick", `${randomInt(-2, 2)}deg`);
    toggleClassOnNextFrame(target, "is-hit", state.frames, "hit");

    hitline.style.setProperty("--strike_rot", `${randomInt(-18, 18)}deg`);
    hitline.style.setProperty("--strike_x", `${randomInt(-10, 10)}%`);
    hitline.style.setProperty("--strike_y", `${randomInt(-8, 8)}%`);
    toggleClassOnNextFrame(hitline, "is-active", state.frames, "strike");

    hitFlash.style.setProperty("--flash_x", `${randomInt(-14, 14)}%`);
    hitFlash.style.setProperty("--flash_y", `${randomInt(-12, 12)}%`);
    toggleClassOnNextFrame(hitFlash, "is-active", state.frames, "flash");

    if (damage > 0) spawnHitPop(damage);
    if (typeof navigator.vibrate === "function") navigator.vibrate(5);
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
    if (requestedAsset) {
      targetImage.src = requestedAsset;
    }

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
  };

  const applyAutoProgress = (elapsedSec) => {
    if (elapsedSec <= 0) return;
    if (state.autoPower <= 0 || state.switching) return;

    state.autoBuffer += state.autoPower * elapsedSec;

    for (let i = 0; i < 160; i += 1) {
      if (state.switching) break;
      const autoDamage = Math.floor(state.autoBuffer);
      if (autoDamage <= 0) break;
      const damageChunk = Math.min(autoDamage, 120);
      state.autoBuffer -= damageChunk;
      applyDamage(damageChunk, false);
    }
  };

  const consumeAutoElapsed = (now = window.performance.now()) => {
    const elapsedSec = Math.min((now - state.auto.lastUpdateTs) / 1000, 120);
    state.auto.lastUpdateTs = now;
    applyAutoProgress(elapsedSec);
  };

  const scheduleAutoTick = () => {
    if (!state.auto.active || state.timers.auto) return;
    state.timers.auto = window.setTimeout(() => {
      state.timers.auto = 0;
      consumeAutoElapsed();
      scheduleAutoTick();
    }, state.auto.intervalMs);
  };

  const setActive = (isActive) => {
    const nextActive = Boolean(isActive);
    if (nextActive === state.auto.active) {
      if (nextActive) {
        consumeAutoElapsed();
        scheduleAutoTick();
      }
      return;
    }

    if (!nextActive) {
      state.auto.active = false;
      window.clearTimeout(state.timers.auto);
      state.timers.auto = 0;
      return;
    }

    state.auto.active = true;
    consumeAutoElapsed();
    scheduleAutoTick();
  };

  const tooltipCleanup = initTooltip(helpButton, tooltip);
  target.addEventListener("click", breakDownCurrent);
  tools.forEach((toolButton) => toolButton.addEventListener("click", onToolClick));

  let resizeTimeout = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      updateLife();
    }, 100);
  };
  window.addEventListener("resize", onResize);

  setTarget(0);
  updateStats();
  syncTools();
  scheduleAutoTick();

  const destroy = () => {
    setActive(false);
    window.clearTimeout(resizeTimeout);
    window.clearTimeout(state.timers.drop);
    window.clearTimeout(state.timers.switch);
    window.removeEventListener("resize", onResize);
    target.removeEventListener("click", breakDownCurrent);
    targetImage.removeEventListener("error", onTargetImageError);
    tools.forEach((toolButton) => toolButton.removeEventListener("click", onToolClick));
    Object.values(state.frames).forEach((frameId) => {
      if (frameId) window.cancelAnimationFrame(frameId);
    });
    tooltipCleanup();
  };

  return {
    setActive,
    syncVisibility: setActive,
    destroy,
  };
}
