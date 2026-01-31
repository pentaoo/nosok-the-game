let docVisible = false;
let Bound = false;

export function getDocEl() {
  return document.getElementById("DOC");
}

export function showDOC() {
  const el = getDocEl();
  if (!el) return;
  const isTouch = document.body.classList.contains("touch-ui");
  el.classList.add("doc-open");
  el.style.display = isTouch ? "block" : "grid";
  docVisible = true;
}

export function hideDOC() {
  const el = getDocEl();
  if (!el) return;
  const isTouch = document.body.classList.contains("touch-ui");
  el.classList.remove("doc-open");
  if (!isTouch) el.style.display = "none";
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
  });
}
