import { DOCS, DOC_TYPES } from "../data/docs.js";
import { ITEMS } from "../data/items.js";
import { createItemViewer } from "./item-viewer.js";

const DOC_BY_ID = new Map(DOCS.map((doc) => [doc.id, doc]));
const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
const NOOP_CONTROLLER = { destroy() {} };

const state = {
  isBound: false,
  docVisible: false,
  itemVisible: false,
  foundDocs: new Set(),
  foundItems: new Set(),
  foundOrder: [],
  revisitFlashTimeout: null,
  itemViewer: null,
  onDocFound: null,
  cleanupFns: [],
  controller: null,
};

const els = {};

function cacheEls() {
  Object.assign(els, {
    doc: document.getElementById("DOC"),
    docType: document.getElementById("doc-type"),
    docTitle: document.getElementById("doc-title"),
    docLead: document.getElementById("doc-lead"),
    docSections: document.getElementById("doc-sections"),
    item: document.getElementById("ITEM"),
    itemTitle: document.getElementById("item-title"),
    itemLead: document.getElementById("item-lead"),
    itemSections: document.getElementById("item-sections"),
    itemFacts: document.getElementById("item-facts"),
    itemViewer: document.getElementById("item-viewer"),
    itemModelLayer: document.getElementById("ITEM_MODEL_LAYER"),
    itemCloseBtn: document.getElementById("item-close"),
    itemsList: document.getElementById("items-list"),
    docsList: document.getElementById("docs-list"),
    docsCountTag: document.getElementById("docs-count-tag"),
    gameGrid: document.querySelector(".game-grid"),
  });
  els.docCloseBtn = els.doc?.querySelector(".doc-close") ?? null;
}

function clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function formatMeta(isLatest) {
  return isLatest ? "только что" : "найдено";
}

function getPlaceholderText(index) {
  return `Документ ${index + 1} пока не найден`;
}

function updateProgress() {
  if (!els.docsCountTag) return;
  els.docsCountTag.textContent = `найдено ${state.foundDocs.size} / ${DOCS.length}`;
}

function syncPanelState() {
  els.gameGrid?.classList.toggle("is-doc-open", state.docVisible);
  els.gameGrid?.classList.toggle("is-item-open", state.itemVisible);
}

function touchFoundDoc(docId) {
  const index = state.foundOrder.indexOf(docId);
  if (index === 0) return;
  if (index > 0) state.foundOrder.splice(index, 1);
  state.foundOrder.unshift(docId);
}

function createTextNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function renderDocSections(sections = []) {
  if (!els.docSections) return;
  clearNode(els.docSections);

  for (const section of sections) {
    const sectionEl = createTextNode("section", "doc-section");
    sectionEl.append(
      createTextNode("h2", "", section.title ?? ""),
      createTextNode("p", "", section.body ?? "")
    );
    els.docSections.append(sectionEl);
  }
}

function renderDocsList() {
  if (!els.docsList) return;
  clearNode(els.docsList);

  const fragment = document.createDocumentFragment();

  if (state.foundOrder.length === 0) {
    const placeholderCount = Math.max(1, Math.min(DOCS.length, 4));
    for (let index = 0; index < placeholderCount; index += 1) {
      const item = document.createElement("li");
      const card = createTextNode("span", "doc-card doc-card--empty");
      card.append(
        createTextNode("span", "doc-title", getPlaceholderText(index)),
        createTextNode("span", "doc-meta", "только что")
      );
      item.append(card);
      fragment.append(item);
    }
    els.docsList.append(fragment);
    return;
  }

  const latestId = state.foundOrder[0];
  for (const docId of state.foundOrder) {
    const doc = DOC_BY_ID.get(docId);
    if (!doc) continue;

    const item = document.createElement("li");
    const button = createTextNode("button", "doc-card");
    button.type = "button";
    button.dataset.docId = doc.id;

    button.append(
      createTextNode("span", "doc-title", doc.title),
      createTextNode("span", "doc-meta", formatMeta(docId === latestId))
    );

    item.append(button);
    fragment.append(item);
  }

  els.docsList.append(fragment);
}

function renderItemsList() {
  if (!els.itemsList) return;
  clearNode(els.itemsList);

  const fragment = document.createDocumentFragment();

  for (const item of ITEMS) {
    const isFound = state.foundItems.has(item.id);

    const button = createTextNode("button", "card card--yellow");
    button.type = "button";
    button.dataset.itemId = item.id;
    button.dataset.found = String(isFound);
    button.setAttribute("aria-disabled", isFound ? "false" : "true");
    button.setAttribute(
      "aria-label",
      isFound ? `Открыть карточку: ${item.title}` : "Предмет пока не найден"
    );
    button.disabled = !isFound;

    const upper = createTextNode("span", "upper");
    const img = createTextNode("img", "img");
    img.src = item.image;
    img.alt = isFound ? item.title : "Неизвестный предмет";
    upper.append(img);

    const bottom = createTextNode("span", "bottom");
    bottom.append(
      createTextNode("h1", "", isFound ? item.title : "???"),
      createTextNode("h2", "", isFound ? "->" : "LOCK")
    );

    button.append(upper, bottom);
    fragment.append(button);
  }

  els.itemsList.append(fragment);
}

function flashRevisitDoc(docId) {
  if (!els.docsList) return;
  const button = els.docsList.querySelector(`button[data-doc-id="${docId}"]`);
  if (!(button instanceof HTMLElement)) return;
  button.classList.remove("is-revisit");
  void button.offsetWidth;
  button.classList.add("is-revisit");
  if (state.revisitFlashTimeout) window.clearTimeout(state.revisitFlashTimeout);
  state.revisitFlashTimeout = window.setTimeout(() => {
    button.classList.remove("is-revisit");
  }, 320);
}

function setDocContent(doc) {
  if (!els.doc || !els.docType || !els.docTitle || !els.docLead || !els.docSections) return;
  const type = DOC_TYPES[doc.type];
  els.doc.dataset.type = doc.type;
  els.docType.textContent = type?.label ?? "DOC";
  els.docTitle.textContent = doc.title;
  els.docLead.textContent = doc.lead;
  renderDocSections(doc.sections);
  els.docSections.closest(".doc-shell")?.scrollTo(0, 0);
}

function setItemContent(item) {
  if (!els.item || !els.itemTitle || !els.itemLead || !els.itemSections || !els.itemFacts) return;

  els.item.dataset.type = "item";
  els.itemTitle.textContent = item.title;
  els.itemLead.textContent = item.scienceLead ?? item.hint ?? "";

  clearNode(els.itemFacts);
  els.itemFacts.append(createTextNode("h2", "", "Научпоп"));

  const facts = (item.scienceFacts?.length ? item.scienceFacts : [item.hint]).filter(Boolean);
  for (const fact of facts) {
    els.itemFacts.append(createTextNode("p", "", fact));
  }

  state.itemViewer?.showItem(item.id);
  els.itemSections.closest(".doc-shell")?.scrollTo(0, 0);
}

function setDocVisible(isVisible) {
  if (!els.doc) return;
  els.doc.classList.toggle("doc-open", isVisible);
  els.doc.setAttribute("aria-hidden", isVisible ? "false" : "true");
  state.docVisible = isVisible;
  syncPanelState();
}

function setItemVisible(isVisible) {
  if (!els.item) return;
  els.item.classList.toggle("doc-open", isVisible);
  els.item.setAttribute("aria-hidden", isVisible ? "false" : "true");
  els.itemModelLayer?.classList.toggle("is-open", isVisible);
  els.itemModelLayer?.setAttribute("aria-hidden", isVisible ? "false" : "true");
  state.itemVisible = isVisible;
  if (!isVisible) state.itemViewer?.hide();
  syncPanelState();
}

function showITEM() {
  setItemVisible(true);
}

function hideITEM() {
  setItemVisible(false);
}

function onDelegatedClick(container, selector, handler) {
  if (!container) return () => {};

  const listener = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest(selector);
    if (!(button instanceof HTMLElement)) return;
    handler(button);
  };

  container.addEventListener("click", listener);
  return () => container.removeEventListener("click", listener);
}

export function showDOC() {
  setDocVisible(true);
}

export function hideDOC() {
  setDocVisible(false);
}

function closePanels() {
  hideITEM();
  hideDOC();
}

function openItemById(itemId) {
  const item = ITEM_BY_ID.get(itemId);
  if (!item || !state.foundItems.has(itemId)) return;
  hideDOC();
  setItemContent(item);
  showITEM();
}

export function openDocById(docId) {
  const doc = DOC_BY_ID.get(docId);
  if (!doc) return;

  const isNewDoc = !state.foundDocs.has(docId);
  state.foundDocs.add(docId);
  touchFoundDoc(docId);
  if (isNewDoc) {
    state.onDocFound?.(docId);
    updateProgress();
  }
  renderDocsList();

  hideITEM();
  setDocContent(doc);
  showDOC();
}

export function markItemFound(itemId) {
  if (!ITEM_BY_ID.has(itemId)) return;
  if (state.foundItems.has(itemId)) return;
  state.foundItems.add(itemId);
  renderItemsList();
}

export function setDocFoundListener(listener) {
  state.onDocFound = typeof listener === "function" ? listener : null;
}

export function initDOCControls() {
  if (state.isBound) {
    return state.controller ?? NOOP_CONTROLLER;
  }

  cacheEls();
  if (!els.doc || !els.item || !els.docsList || !els.itemsList) {
    return NOOP_CONTROLLER;
  }

  state.isBound = true;
  updateProgress();
  renderDocsList();
  renderItemsList();

  if (!state.itemViewer && els.itemViewer) {
    state.itemViewer = createItemViewer({ mountEl: els.itemViewer });
  }

  const cleanupFns = [];

  const onDocClose = () => hideDOC();
  const onItemClose = () => hideITEM();
  els.docCloseBtn?.addEventListener("click", onDocClose);
  els.itemCloseBtn?.addEventListener("click", onItemClose);
  cleanupFns.push(() => els.docCloseBtn?.removeEventListener("click", onDocClose));
  cleanupFns.push(() => els.itemCloseBtn?.removeEventListener("click", onItemClose));

  cleanupFns.push(
    onDelegatedClick(els.docsList, "button[data-doc-id]", (button) => {
      const docId = button.dataset.docId;
      if (!docId) return;
      const isRevisit = state.foundDocs.has(docId);
      openDocById(docId);
      if (isRevisit) flashRevisitDoc(docId);
    })
  );

  cleanupFns.push(
    onDelegatedClick(els.itemsList, "button[data-item-id]", (button) => {
      const itemId = button.dataset.itemId;
      if (!itemId || !state.foundItems.has(itemId)) return;
      openItemById(itemId);
    })
  );

  const onKeyDown = (event) => {
    if (event.code !== "Escape") return;
    closePanels();
  };
  document.addEventListener("keydown", onKeyDown);
  cleanupFns.push(() => document.removeEventListener("keydown", onKeyDown));

  state.cleanupFns = cleanupFns;

  const destroy = () => {
    if (!state.isBound) return;
    state.isBound = false;

    if (state.revisitFlashTimeout) {
      window.clearTimeout(state.revisitFlashTimeout);
      state.revisitFlashTimeout = null;
    }

    while (state.cleanupFns.length) {
      const cleanup = state.cleanupFns.pop();
      try {
        cleanup?.();
      } catch (error) {
        console.error("DOC controls cleanup failed", error);
      }
    }

    closePanels();
    state.itemViewer?.dispose?.();
    state.itemViewer = null;
    state.controller = null;
    state.cleanupFns = [];
  };

  state.controller = { destroy };
  return state.controller;
}
