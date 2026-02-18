const QUEST_IDS = {
  COLLECT_ITEMS: "collect-items",
  COLLECT_DOCS: "collect-docs",
  WASH_ITEMS: "wash-items",
};

const QUEST_ORDER = [
  QUEST_IDS.COLLECT_ITEMS,
  QUEST_IDS.COLLECT_DOCS,
  QUEST_IDS.WASH_ITEMS,
];

const QUEST_TITLE = {
  [QUEST_IDS.COLLECT_ITEMS]: "Собрать все вещи",
  [QUEST_IDS.COLLECT_DOCS]: "Собрать все документы",
  [QUEST_IDS.WASH_ITEMS]: "Постирать вещи",
};

export function createQuestController({ hud = null, totalDocs = 0, washDurationMs = 3200 } = {}) {
  const trackedItemIds = new Set();
  const foundItems = new Set();
  const foundDocs = new Set();
  const completedQuests = new Set();
  const cardsById = new Map();
  const countersById = new Map();

  const progressTag = document.getElementById("quests-progress-tag");
  document.querySelectorAll("[data-quest-id]").forEach((card) => {
    cardsById.set(card.dataset.questId, card);
  });
  document.querySelectorAll("[data-quest-counter]").forEach((counter) => {
    countersById.set(counter.dataset.questCounter, counter);
  });

  let isWashing = false;
  let finalNoticeShown = false;

  const getFoundItemsCount = () => Math.min(foundItems.size, trackedItemIds.size);
  const getFoundDocsCount = () => Math.min(foundDocs.size, totalDocs);

  const isItemsQuestDone = () => completedQuests.has(QUEST_IDS.COLLECT_ITEMS);
  const isDocsQuestDone = () => completedQuests.has(QUEST_IDS.COLLECT_DOCS);
  const isWashQuestDone = () => completedQuests.has(QUEST_IDS.WASH_ITEMS);

  const updateCardStatus = (questId, isDone) => {
    const card = cardsById.get(questId);
    if (!card) return;
    card.dataset.status = isDone ? "done" : "active";
  };

  const updateCounters = () => {
    const itemCounter = countersById.get(QUEST_IDS.COLLECT_ITEMS);
    if (itemCounter) {
      itemCounter.textContent = `${getFoundItemsCount()} / ${trackedItemIds.size}`;
    }

    const docCounter = countersById.get(QUEST_IDS.COLLECT_DOCS);
    if (docCounter) {
      docCounter.textContent = `${getFoundDocsCount()} / ${totalDocs}`;
    }

    const washCounter = countersById.get(QUEST_IDS.WASH_ITEMS);
    if (!washCounter) return;

    if (isWashQuestDone()) {
      washCounter.textContent = "выполнено";
      return;
    }
    if (isWashing) {
      washCounter.textContent = "стирка...";
      return;
    }
    washCounter.textContent = isItemsQuestDone() ? "готово к запуску" : "ожидает сбор вещей";
  };

  const updateProgressTag = () => {
    if (!progressTag) return;
    progressTag.textContent = `${completedQuests.size}/${QUEST_ORDER.length}`;
  };

  const render = () => {
    QUEST_ORDER.forEach((questId) => {
      updateCardStatus(questId, completedQuests.has(questId));
    });
    updateProgressTag();
    updateCounters();
  };

  const notifyQuestComplete = (questId) => {
    if (!hud?.notify) return;
    hud.notify(`Квест выполнен: ${QUEST_TITLE[questId]}`, {
      tone: "success",
      duration: 2500,
    });
  };

  const maybeNotifyFinal = () => {
    if (finalNoticeShown || completedQuests.size !== QUEST_ORDER.length) return;
    finalNoticeShown = true;
    hud?.notify?.("Отличная работа! Ты выполнил все квесты и завершил игру.", {
      tone: "success",
      duration: 5600,
    });
  };

  const completeQuest = (questId, { announce = true } = {}) => {
    if (completedQuests.has(questId)) return false;
    completedQuests.add(questId);
    render();
    if (announce) notifyQuestComplete(questId);
    maybeNotifyFinal();
    return true;
  };

  const maybeCompleteItemsQuest = () => {
    if (isItemsQuestDone()) return;
    if (trackedItemIds.size === 0) return;
    if (getFoundItemsCount() < trackedItemIds.size) return;
    completeQuest(QUEST_IDS.COLLECT_ITEMS);
  };

  const maybeCompleteDocsQuest = () => {
    if (isDocsQuestDone()) return;
    if (totalDocs <= 0) return;
    if (getFoundDocsCount() < totalDocs) return;
    completeQuest(QUEST_IDS.COLLECT_DOCS);
  };

  const finishWash = () => {
    isWashing = false;
    completeQuest(QUEST_IDS.WASH_ITEMS);
    render();
  };

  function setCollectibleItemIds(itemIds = []) {
    trackedItemIds.clear();
    itemIds.forEach((itemId) => {
      if (!itemId) return;
      trackedItemIds.add(itemId);
    });

    Array.from(foundItems).forEach((itemId) => {
      if (trackedItemIds.has(itemId)) return;
      foundItems.delete(itemId);
    });

    maybeCompleteItemsQuest();
    render();
  }

  function markItemCollected(itemId) {
    if (!trackedItemIds.has(itemId)) return;
    if (foundItems.has(itemId)) return;
    foundItems.add(itemId);
    maybeCompleteItemsQuest();
    render();
  }

  function markDocCollected(docId) {
    if (!docId || foundDocs.has(docId)) return;
    foundDocs.add(docId);
    maybeCompleteDocsQuest();
    render();
  }

  function getWasherLabel() {
    if (isWashQuestDone()) return "стирка завершена";
    if (isWashing) return "стирка запущена";
    return "постирать вещи";
  }

  function getWasherDescription() {
    if (isWashQuestDone()) return "Квест уже выполнен.";
    if (isWashing) return "Подождите, барабан еще крутится.";
    if (!isItemsQuestDone()) {
      return `Сначала соберите все вещи (${getFoundItemsCount()} / ${trackedItemIds.size}).`;
    }
    return "Нажмите E, чтобы запустить стирку.";
  }

  function tryWash() {
    if (isWashQuestDone()) {
      hud?.notify?.("Вещи уже постираны.", {
        tone: "success",
        duration: 2200,
      });
      return;
    }

    if (isWashing) {
      hud?.notify?.("Стирка уже идет.", {
        duration: 1800,
      });
      return;
    }

    if (!isItemsQuestDone()) {
      hud?.notify?.("Сначала соберите все вещи, потом запускайте стирку.", {
        tone: "warning",
        duration: 2800,
      });
      return;
    }

    isWashing = true;
    render();

    if (hud?.showLoading) {
      hud.showLoading("Стираем вещи...", {
        description: "Барабан набирает обороты.",
        duration: washDurationMs,
        onDone: finishWash,
      });
      return;
    }

    window.setTimeout(finishWash, washDurationMs);
  }

  render();

  return {
    setCollectibleItemIds,
    markItemCollected,
    markDocCollected,
    getWasherLabel,
    getWasherDescription,
    tryWash,
    isWashComplete: isWashQuestDone,
    isWashInProgress: () => isWashing,
    isItemsQuestComplete: isItemsQuestDone,
  };
}
