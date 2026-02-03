import { DOCS, DOC_TYPES } from "../data/docs.js";
import { ITEMS } from "../data/items.js";

let docVisible = false;
let Bound = false;
const foundDocs = new Set();
const foundItems = new Set();
const foundOrder = [];

let docEl = null;
let docTypeEl = null;
let docTitleEl = null;
let docLeadEl = null;
let docSectionsEl = null;
let docCloseBtn = null;
let docsListEl = null;
let docsCountTagEl = null;
let docsProgressEl = null;
let itemsProgressEl = null;
let progressTagEl = null;
let gameGridEl = null;

function cacheEls() {
  docEl = document.getElementById("DOC");
  docTypeEl = document.getElementById("doc-type");
  docTitleEl = document.getElementById("doc-title");
  docLeadEl = document.getElementById("doc-lead");
  docSectionsEl = document.getElementById("doc-sections");
  docCloseBtn = document.querySelector(".doc-close");
  docsListEl = document.getElementById("docs-list");
  docsCountTagEl = document.getElementById("docs-count-tag");
  docsProgressEl = document.getElementById("docs-progress");
  itemsProgressEl = document.getElementById("items-progress");
  progressTagEl = document.getElementById("progress-tag");
  gameGridEl = document.querySelector(".game-grid");
}

function formatMeta(isLatest) {
  return isLatest ? "только что" : "найдено";
}

function updateProgress() {
  const docsFound = foundDocs.size;
  const itemsFound = foundItems.size;
  const docsTotal = DOCS.length;
  const itemsTotal = ITEMS.length;

  if (docsCountTagEl) {
    docsCountTagEl.textContent = `найдено ${docsFound} / ${docsTotal}`;
  }
  if (docsProgressEl) {
    docsProgressEl.textContent = `${docsFound} / ${docsTotal}`;
  }
  if (itemsProgressEl) {
    itemsProgressEl.textContent = `${itemsFound} / ${itemsTotal}`;
  }
  if (progressTagEl) {
    const totalFound = docsFound + itemsFound;
    const total = docsTotal + itemsTotal;
    const percent = total > 0 ? Math.round((totalFound / total) * 100) : 0;
    progressTagEl.textContent =
      docsFound === docsTotal && itemsFound === itemsTotal
        ? "ГОТОВО"
        : `${percent}%`;
  }
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

  const latestId = foundOrder[0]?.id;
  for (const entry of foundOrder) {
    const doc = DOCS.find((d) => d.id === entry.id);
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
    meta.textContent = formatMeta(doc.id === latestId);

    btn.append(title, meta);
    item.appendChild(btn);
    docsListEl.appendChild(item);
  }
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

export function showDOC() {
  if (!docEl) return;
  docEl.classList.add("doc-open");
  docEl.setAttribute("aria-hidden", "false");
  docVisible = true;
  gameGridEl?.classList.add("is-doc-open");
}

export function hideDOC() {
  if (!docEl) return;
  docEl.classList.remove("doc-open");
  docEl.setAttribute("aria-hidden", "true");
  docVisible = false;
  gameGridEl?.classList.remove("is-doc-open");
}

export function isDOCVisible() {
  return docVisible;
}

export function openDocById(docId) {
  const doc = DOCS.find((item) => item.id === docId);
  if (!doc) return;
  setDocContent(doc);
  showDOC();
  if (!foundDocs.has(docId)) {
    foundDocs.add(docId);
    foundOrder.unshift({ id: docId, foundAt: Date.now() });
    updateProgress();
    renderDocsList();
  } else {
    renderDocsList();
  }
}

export function markItemFound(itemId) {
  if (!ITEMS.find((item) => item.id === itemId)) return;
  if (foundItems.has(itemId)) return;
  foundItems.add(itemId);
  updateProgress();
}

export function initDOCControls() {
  if (Bound) return;
  Bound = true;
  cacheEls();
  updateProgress();
  renderDocsList();

  docCloseBtn?.addEventListener("click", hideDOC);

  docsListEl?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest("button[data-doc-id]");
    if (!button) return;
    const docId = button.dataset.docId;
    if (docId) openDocById(docId);
  });

  document.addEventListener("keydown", (e) => {
    if (docVisible && e.code === "Escape") {
      hideDOC();
    }
  });
}
