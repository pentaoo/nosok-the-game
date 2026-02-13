const GARMENTS = [
  { className: "garment--hoodie", hp: 100, drop: [14, 20] },
  { className: "garment--shirt", hp: 92, drop: [11, 17] },
  { className: "garment--jeans", hp: 108, drop: [16, 24] },
  { className: "garment--coat", hp: 122, drop: [18, 28] },
  { className: "garment--sweater", hp: 94, drop: [13, 19] },
];

const TOOLS = [
  { damage: [16, 23], efficiency: 1, cost: 0 },
  { damage: [24, 32], efficiency: 1.18, cost: 80 },
  { damage: [32, 42], efficiency: 1.36, cost: 160 },
  { damage: [42, 54], efficiency: 1.58, cost: 260 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rafClassToggle(node, className, frameRef) {
  node.classList.remove(className);
  if (frameRef.id) window.cancelAnimationFrame(frameRef.id);
  frameRef.id = window.requestAnimationFrame(() => {
    node.classList.add(className);
  });
}

function setGarmentClass(target, garmentClass) {
  for (const item of GARMENTS) target.classList.remove(item.className);
  target.classList.add(garmentClass);
}

export function initRecyclerBlock() {
  const stage = document.querySelector("#recycler-stage");
  const target = document.querySelector("#recycler-target");
  const hpWall = document.querySelector("#recycler-hp-wall");
  const lifeBar = document.querySelector("#recycler-life-bar");
  const drop = document.querySelector("#recycler-drop");
  const hitline = document.querySelector("#recycler-hitline");
  const resourceValue = document.querySelector("#recycler-resource-value");
  const tools = Array.from(document.querySelectorAll(".recycler-tool"));

  if (
    !stage ||
    !target ||
    !lifeBar ||
    !drop ||
    !hitline ||
    !resourceValue ||
    tools.length !== TOOLS.length
  ) {
    return;
  }

  const hitFrame = { id: 0 };
  const strikeFrame = { id: 0 };
  const dropFrame = { id: 0 };
  let dropTimer = 0;
  let switchTimer = 0;
  let garmentIndex = 0;
  let garmentHp = GARMENTS[garmentIndex].hp;
  let materials = 0;
  let unlockedTools = 1;
  let activeTool = 0;
  let switching = false;
  const hpRows = [];

  if (hpWall) {
    const isTablet = window.matchMedia("(max-width: 980px)").matches;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const rowsCount = isMobile ? 6 : isTablet ? 7 : 8;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < rowsCount; i += 1) {
      const row = document.createElement("span");
      row.className = "recycler-hp-row";
      row.style.setProperty("--hp_row_shift", i % 2 === 0 ? "-8%" : "-22%");
      fragment.append(row);
      hpRows.push(row);
    }

    hpWall.replaceChildren(fragment);
  }

  const updateResource = () => {
    resourceValue.textContent = materials.toLocaleString("ru-RU");
  };

  const updateHpWall = () => {
    if (!hpRows.length) return;
    const maxHp = GARMENTS[garmentIndex].hp;
    const currentHp = Math.ceil(garmentHp);
    const tape = `HP ${currentHp} / ${maxHp} • `.repeat(14);
    hpRows.forEach((row) => {
      row.textContent = tape;
    });
  };

  const updateLife = () => {
    const maxHp = GARMENTS[garmentIndex].hp;
    const ratio = Math.max(0, garmentHp / maxHp);
    lifeBar.style.transform = `scaleX(${ratio})`;
    target.style.setProperty("--tear", `${(1 - ratio).toFixed(3)}`);
    updateHpWall();
  };

  const syncTools = () => {
    tools.forEach((toolButton, index) => {
      const cost = TOOLS[index].cost;
      const isUnlocked = index < unlockedTools;
      const isNext = index === unlockedTools;
      const canUnlock = isNext && materials >= cost;

      toolButton.classList.toggle("is-unlocked", isUnlocked);
      toolButton.classList.toggle(
        "is-selected",
        isUnlocked && index === activeTool,
      );
      toolButton.classList.toggle("is-ready", canUnlock);
      toolButton.disabled = !isUnlocked && !isNext;

      const costLabel = toolButton.querySelector("span");
      if (costLabel) costLabel.hidden = isUnlocked;

      if (!isUnlocked && !canUnlock) {
        toolButton.setAttribute("aria-disabled", "true");
      } else {
        toolButton.removeAttribute("aria-disabled");
      }
    });
  };

  const showDrop = (value) => {
    drop.textContent = value;
    rafClassToggle(drop, "is-show", dropFrame);
    if (dropTimer) window.clearTimeout(dropTimer);
    dropTimer = window.setTimeout(() => {
      drop.classList.remove("is-show");
    }, 520);
  };

  const pulseTarget = () => {
    rafClassToggle(target, "is-hit", hitFrame);
  };

  const strike = () => {
    hitline.style.setProperty("--strike_rot", `${randomInt(-42, 42)}deg`);
    hitline.style.setProperty("--strike_x", `${randomInt(-18, 18)}%`);
    hitline.style.setProperty("--strike_y", `${randomInt(-16, 16)}%`);
    rafClassToggle(hitline, "is-active", strikeFrame);
  };

  const setGarment = (index) => {
    garmentIndex = index;
    garmentHp = GARMENTS[index].hp;
    setGarmentClass(target, GARMENTS[index].className);
    target.classList.remove("is-shredded");
    updateLife();
  };

  const breakDownCurrent = () => {
    if (switching) return;

    const tool = TOOLS[activeTool];
    const damage = randomInt(tool.damage[0], tool.damage[1]);
    garmentHp = Math.max(0, garmentHp - damage);

    pulseTarget();
    strike();
    updateLife();

    if (garmentHp > 0) return;

    const garment = GARMENTS[garmentIndex];
    const baseDrop = randomInt(garment.drop[0], garment.drop[1]);
    const gain = Math.round(baseDrop * tool.efficiency);

    materials += gain;
    updateResource();
    syncTools();
    showDrop(`+${gain}`);
    target.classList.add("is-shredded");
    switching = true;

    if (switchTimer) window.clearTimeout(switchTimer);
    switchTimer = window.setTimeout(() => {
      const nextIndex = (garmentIndex + 1) % GARMENTS.length;
      setGarment(nextIndex);
      switching = false;
    }, 360);
  };

  const onToolClick = (event) => {
    const button = event.currentTarget;
    const index = Number(button.dataset.toolIndex);

    if (Number.isNaN(index) || index < 0 || index >= TOOLS.length) return;

    if (index < unlockedTools) {
      activeTool = index;
      syncTools();
      return;
    }

    if (index !== unlockedTools) return;

    const price = TOOLS[index].cost;
    if (materials < price) return;

    materials -= price;
    unlockedTools = Math.min(unlockedTools + 1, TOOLS.length);
    activeTool = index;
    updateResource();
    syncTools();
    showDrop(`-${price}`);
    stage.classList.remove("is-upgraded");
    window.requestAnimationFrame(() => {
      stage.classList.add("is-upgraded");
    });
  };

  target.addEventListener("click", breakDownCurrent);
  tools.forEach((toolButton) => {
    toolButton.addEventListener("click", onToolClick);
  });

  setGarment(garmentIndex);
  updateResource();
  syncTools();
}
