export function createHUD() {
  const root = document.getElementById("hud");
  const hint = document.getElementById("hint");
  const subhint = document.getElementById("subhint");

  let visible = false;

  function show(text, sub = "") {
    if (!root || !hint || !subhint) return;
    hint.textContent = text;
    subhint.textContent = sub;

    if (!visible) {
      root.style.display = "block";
      visible = true;
    }
  }

  function hide() {
    if (!root) return;
    if (visible) {
      root.style.display = "none";
      visible = false;
    }
  }

  return { show, hide };
}
