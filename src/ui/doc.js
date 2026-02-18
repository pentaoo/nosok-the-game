import { DOCS, DOC_TYPES } from "../data/docs.js";
import { ITEMS } from "../data/items.js";
import { createItemViewer } from "./item-viewer.js";

const DOC_BY_ID = new Map(DOCS.map((doc) => [doc.id, doc]));
const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

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

function formatMeta(isLatest) {
  return isLatest ? "только что" : "найдено";
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

function renderDocSections(sections = []) {
  return sections
    .map(
      (section) => `
        <section class="doc-section">
          <h2>${section.title}</h2>
          <p>${section.body}</p>
        </section>
      `
    )
    .join("");
}

function renderDocsList() {
  if (!els.docsList) return;

  if (state.foundOrder.length === 0) {
    els.docsList.innerHTML =
      '<li class="doc-card doc-card--empty">Документы пока не найдены.</li>';
    return;
  }

  const latestId = state.foundOrder[0];
  els.docsList.innerHTML = state.foundOrder
    .map((docId) => {
      const doc = DOC_BY_ID.get(docId);
      if (!doc) return "";
      return `
        <li>
          <button type="button" class="doc-card" data-doc-id="${doc.id}">
            <span class="doc-title">${doc.title}</span>
            <span class="doc-meta">${formatMeta(docId === latestId)}</span>
          </button>
        </li>
      `;
    })
    .join("");
}

function renderItemsList() {
  if (!els.itemsList) return;
  els.itemsList.innerHTML = ITEMS.map((item) => {
    const isFound = state.foundItems.has(item.id);
    return `
      <button
        type="button"
        class="card card--yellow"
        data-item-id="${item.id}"
        data-found="${isFound}"
        aria-disabled="${isFound ? "false" : "true"}"
        aria-label="${isFound ? `Открыть карточку: ${item.title}` : "Предмет пока не найден"}"
        ${isFound ? "" : "disabled"}
      >
        <span class="upper">
          <img class="img" src="${item.image}" alt="${isFound ? item.title : "Неизвестный предмет"}" />
        </span>
        <span class="bottom">
          <h1>${isFound ? item.title : "???"}</h1>
          <h2>${isFound ? "->" : "LOCK"}</h2>
        </span>
      </button>
    `;
  }).join("");
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
  els.docSections.innerHTML = renderDocSections(doc.sections);
  els.docSections.closest(".doc-shell")?.scrollTo(0, 0);
}

function setItemContent(item) {
  if (!els.item || !els.itemTitle || !els.itemLead || !els.itemSections || !els.itemFacts) return;
  els.item.dataset.type = "item";
  els.itemTitle.textContent = item.title;
  els.itemLead.textContent = item.scienceLead ?? item.hint ?? "";

  const facts = (item.scienceFacts?.length ? item.scienceFacts : [item.hint]).filter(Boolean);
  els.itemFacts.innerHTML = `<h2>Научпоп</h2>${facts.map((fact) => `<p>${fact}</p>`).join("")}`;

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
  container?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest(selector);
    if (!(button instanceof HTMLElement)) return;
    handler(button);
  });
}

export function showDOC() {
  setDocVisible(true);
}

export function hideDOC() {
  setDocVisible(false);
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
  if (state.isBound) return;
  state.isBound = true;
  cacheEls();
  updateProgress();
  renderDocsList();
  renderItemsList();
  if (!state.itemViewer && els.itemViewer) {
    state.itemViewer = createItemViewer({ mountEl: els.itemViewer });
  }

  els.docCloseBtn?.addEventListener("click", hideDOC);
  els.itemCloseBtn?.addEventListener("click", hideITEM);

  onDelegatedClick(els.docsList, "button[data-doc-id]", (button) => {
    const docId = button.dataset.docId;
    if (!docId) return;
    const isRevisit = state.foundDocs.has(docId);
    openDocById(docId);
    if (isRevisit) flashRevisitDoc(docId);
  });

  onDelegatedClick(els.itemsList, "button[data-item-id]", (button) => {
    const itemId = button.dataset.itemId;
    if (!itemId || !state.foundItems.has(itemId)) return;
    openItemById(itemId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Escape") return;
    hideITEM();
    hideDOC();
  });
}
