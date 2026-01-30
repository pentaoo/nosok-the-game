import { createInput } from "../core/input";
let docVisible = false;
let Bound = false;

export function getDocEl() {
  return document.getElementById("DOC");
}

export function showDOC() {
  const el = getDocEl();
  if (!el) return;
  el.style.display = "grid";
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
  if (Bound) return;
  Bound = true;

  document.addEventListener("keydown", (e) => {
    if (docVisible && e.code === "Escape") {
      hideDOC();
    }
    document.addEventListener("keydown", (e) => {
      console.log(e.code);
    });
  });
}
