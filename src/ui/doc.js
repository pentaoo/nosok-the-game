import { DOCS, DOC_TYPES } from "../data/docs.js";
import { ITEMS } from "../data/items.js";
import { createItemViewer } from "./item-viewer.js";

const DOC_BY_ID = new Map(DOCS.map((doc) => [doc.id, doc]));
const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

let docVisible = false;
let itemVisible = false;
let isBound = false;
const foundDocs = new Set();
const foundItems = new Set();
const foundOrder = [];

let docEl = null;
let docTypeEl = null;
let docTitleEl = null;
let docLeadEl = null;
let docSectionsEl = null;
let docCloseBtn = null;
let itemEl = null;
let itemTitleEl = null;
let itemLeadEl = null;
let itemSectionsEl = null;
let itemFactsEl = null;
let itemViewerEl = null;
let itemModelLayerEl = null;
let itemCloseBtn = null;
let itemsListEl = null;
let docsListEl = null;
let docsCountTagEl = null;
let gameGridEl = null;
let revisitFlashTimeout = null;
let itemViewer = null;

function cacheEls() {
  docEl = document.getElementById("DOC");
  docTypeEl = document.getElementById("doc-type");
  docTitleEl = document.getElementById("doc-title");
  docLeadEl = document.getElementById("doc-lead");
  docSectionsEl = document.getElementById("doc-sections");
  docCloseBtn = docEl?.querySelector(".doc-close") ?? null;
  itemEl = document.getElementById("ITEM");
  itemTitleEl = document.getElementById("item-title");
  itemLeadEl = document.getElementById("item-lead");
  itemSectionsEl = document.getElementById("item-sections");
  itemFactsEl = document.getElementById("item-facts");
  itemViewerEl = document.getElementById("item-viewer");
  itemModelLayerEl = document.getElementById("ITEM_MODEL_LAYER");
  itemCloseBtn = document.getElementById("item-close");
  itemsListEl = document.getElementById("items-list");
  docsListEl = document.getElementById("docs-list");
  docsCountTagEl = document.getElementById("docs-count-tag");
  gameGridEl = document.querySelector(".game-grid");
}

function formatMeta(isLatest) {
  return isLatest ? "только что" : "найдено";
}

function updateProgress() {
  const docsFound = foundDocs.size;
  const docsTotal = DOCS.length;

  if (docsCountTagEl) {
    docsCountTagEl.textContent = `найдено ${docsFound} / ${docsTotal}`;
  }
}

function syncPanelState() {
  gameGridEl?.classList.toggle("is-doc-open", docVisible);
  gameGridEl?.classList.toggle("is-item-open", itemVisible);
}

function touchFoundDoc(docId) {
  const index = foundOrder.indexOf(docId);
  if (index === 0) return;
  if (index > 0) foundOrder.splice(index, 1);
  foundOrder.unshift(docId);
}

function renderDocsList() {
  if (!docsListEl) return;
  docsListEl.innerHTML = "";

  if (foundOrder.length === 0) {
    const empty = document.createElement("li");
    empty.className = "doc-card doc-card--empty";
    empty.textContent = "Документы пока не найдены.";
    docsListEl.appendChild(empty);
    return;
  }

  const latestId = foundOrder[0];
  for (const docId of foundOrder) {
    const doc = DOC_BY_ID.get(docId);
    if (!doc) continue;
    const item = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "doc-card";
    btn.dataset.docId = doc.id;

    const title = document.createElement("span");
    title.className = "doc-title";
    title.textContent = doc.title;

    const meta = document.createElement("span");
    meta.className = "doc-meta";
    meta.textContent = formatMeta(docId === latestId);

    btn.append(title, meta);
    item.appendChild(btn);
    docsListEl.appendChild(item);
  }
}

function renderItemsList() {
  if (!itemsListEl) return;
  itemsListEl.innerHTML = "";

  for (const item of ITEMS) {
    const isFound = foundItems.has(item.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card card--yellow";
    button.dataset.itemId = item.id;
    button.dataset.found = isFound ? "true" : "false";
    button.disabled = !isFound;
    button.setAttribute("aria-disabled", isFound ? "false" : "true");
    button.setAttribute(
      "aria-label",
      isFound ? `Открыть карточку: ${item.title}` : "Предмет пока не найден"
    );

    const upper = document.createElement("span");
    upper.className = "upper";
    const image = document.createElement("img");
    image.className = "img";
    image.src = item.image;
    image.alt = isFound ? item.title : "Неизвестный предмет";
    upper.appendChild(image);

    const bottom = document.createElement("span");
    bottom.className = "bottom";
    const title = document.createElement("h1");
    title.textContent = isFound ? item.title : "???";
    const action = document.createElement("h2");
    action.textContent = isFound ? "->" : "LOCK";
    bottom.append(title, action);

    button.append(upper, bottom);
    itemsListEl.appendChild(button);
  }
}

function flashRevisitDoc(docId) {
  if (!docsListEl) return;
  const button = docsListEl.querySelector(`button[data-doc-id="${docId}"]`);
  if (!(button instanceof HTMLElement)) return;
  button.classList.remove("is-revisit");
  void button.offsetWidth;
  button.classList.add("is-revisit");
  if (revisitFlashTimeout) window.clearTimeout(revisitFlashTimeout);
  revisitFlashTimeout = window.setTimeout(() => {
    button.classList.remove("is-revisit");
  }, 320);
}

function setDocContent(doc) {
  if (!docEl || !docTypeEl || !docTitleEl || !docLeadEl || !docSectionsEl)
    return;
  const type = DOC_TYPES[doc.type];
  docEl.dataset.type = doc.type;
  docTypeEl.textContent = type?.label ?? "DOC";
  docTitleEl.textContent = doc.title;
  docLeadEl.textContent = doc.lead;
  docSectionsEl.innerHTML = "";

  for (const section of doc.sections ?? []) {
    const sectionEl = document.createElement("section");
    sectionEl.className = "doc-section";
    const titleEl = document.createElement("h2");
    titleEl.textContent = section.title;
    const bodyEl = document.createElement("p");
    bodyEl.textContent = section.body;
    sectionEl.append(titleEl, bodyEl);
    docSectionsEl.appendChild(sectionEl);
  }
  docSectionsEl.closest(".doc-shell")?.scrollTo(0, 0);
}

function setItemContent(item) {
  if (!itemEl || !itemTitleEl || !itemLeadEl || !itemSectionsEl || !itemFactsEl)
    return;
  itemEl.dataset.type = "item";
  itemTitleEl.textContent = item.title;
  itemLeadEl.textContent = item.scienceLead ?? item.hint ?? "";
  itemFactsEl.innerHTML = "";
  const factsTitle = document.createElement("h2");
  factsTitle.textContent = "Научпоп";
  itemFactsEl.appendChild(factsTitle);

  const facts = item.scienceFacts?.length ? item.scienceFacts : [item.hint];
  for (const fact of facts) {
    const factLine = document.createElement("p");
    factLine.textContent = fact;
    itemFactsEl.appendChild(factLine);
  }

  itemViewer?.showItem(item.id);
  itemSectionsEl.closest(".doc-shell")?.scrollTo(0, 0);
}

export function showDOC() {
  if (!docEl) return;
  docEl.classList.add("doc-open");
  docEl.setAttribute("aria-hidden", "false");
  docVisible = true;
  syncPanelState();
}

export function hideDOC() {
  if (!docEl) return;
  docEl.classList.remove("doc-open");
  docEl.setAttribute("aria-hidden", "true");
  docVisible = false;
  syncPanelState();
}

function showITEM() {
  if (!itemEl) return;
  itemEl.classList.add("doc-open");
  itemEl.setAttribute("aria-hidden", "false");
  itemModelLayerEl?.classList.add("is-open");
  itemModelLayerEl?.setAttribute("aria-hidden", "false");
  itemVisible = true;
  syncPanelState();
}

function hideITEM() {
  if (!itemEl) return;
  itemEl.classList.remove("doc-open");
  itemEl.setAttribute("aria-hidden", "true");
  itemModelLayerEl?.classList.remove("is-open");
  itemModelLayerEl?.setAttribute("aria-hidden", "true");
  itemVisible = false;
  itemViewer?.hide();
  syncPanelState();
}

function openItemById(itemId) {
  const item = ITEM_BY_ID.get(itemId);
  if (!item || !foundItems.has(itemId)) return;
  hideDOC();
  setItemContent(item);
  showITEM();
}

export function openDocById(docId) {
  const doc = DOC_BY_ID.get(docId);
  if (!doc) return;

  const isNewDoc = !foundDocs.has(docId);
  foundDocs.add(docId);
  touchFoundDoc(docId);
  if (isNewDoc) updateProgress();
  renderDocsList();

  hideITEM();
  setDocContent(doc);
  showDOC();
}

export function markItemFound(itemId) {
  if (!ITEM_BY_ID.has(itemId)) return;
  if (foundItems.has(itemId)) return;
  foundItems.add(itemId);
  renderItemsList();
}

export function initDOCControls() {
  if (isBound) return;
  isBound = true;
  cacheEls();
  updateProgress();
  renderDocsList();
  renderItemsList();
  if (!itemViewer && itemViewerEl) {
    itemViewer = createItemViewer({ mountEl: itemViewerEl });
  }

  docCloseBtn?.addEventListener("click", hideDOC);
  itemCloseBtn?.addEventListener("click", hideITEM);

  docsListEl?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest("button[data-doc-id]");
    if (!button) return;
    const docId = button.dataset.docId;
    if (!docId) return;
    const isRevisit = foundDocs.has(docId);
    openDocById(docId);
    if (isRevisit) flashRevisitDoc(docId);
  });

  itemsListEl?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest("button[data-item-id]");
    if (!button) return;
    const itemId = button.dataset.itemId;
    if (!itemId || !foundItems.has(itemId)) return;
    openItemById(itemId);
  });

  document.addEventListener("keydown", (e) => {
    if (e.code !== "Escape") return;
    if (itemVisible) {
      hideITEM();
    }
    if (docVisible) {
      hideDOC();
    }
  });
}
