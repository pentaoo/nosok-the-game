import { createInput } from "../core/input";
let docVisible = false;
let escBound = false;

export function getDocEl() {
  return document.getElementById("DOC");
}

export function showDOC() {
  const el = getDocEl();
  if (!el) return;
  el.style.display = "block";
  docVisible = true;
}

export function hideDOC() {
  const el = getDocEl();
  if (!el) return;
  el.style.display = "none";
  docVisible = false;
}

export function isDOCVisible() {
  return docVisible;
}

export function initDOCControls() {
  if (escBound) return;
  escBound = true;

  document.addEventListener("keydown", (e) => {
    if ((e.key === "Escape" && docVisible) || (e.key === "e" && docVisible)) {
      hideDOC();
    }
  });
}
