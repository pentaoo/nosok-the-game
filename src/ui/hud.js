export function createHUD() {
  const root = document.getElementById("hud");
  const interactionPanel = document.getElementById("hud-interaction");
  const hint = document.getElementById("hint");
  const subhint = document.getElementById("subhint");
  const toastPanel = document.getElementById("hud-toast");
  const toastTitle = document.getElementById("hud-toast-title");
  const toastSub = document.getElementById("hud-toast-sub");

  let interactionVisible = false;
  let noticeVisible = false;
  let noticeTimer = null;
  let loadingTimer = null;

  const clearNoticeTimers = () => {
    if (noticeTimer) {
      window.clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (loadingTimer) {
      window.clearTimeout(loadingTimer);
      loadingTimer = null;
    }
  };

  const syncRootVisibility = () => {
    if (!root) return;
    root.hidden = !(interactionVisible || noticeVisible);
  };

  const hideNotice = () => {
    if (!toastPanel) return;
    clearNoticeTimers();
    toastPanel.classList.remove("is-visible", "is-loading");
    toastPanel.removeAttribute("data-tone");
    toastPanel.style.removeProperty("--hud-progress-ms");
    toastPanel.setAttribute("aria-hidden", "true");
    noticeVisible = false;
    syncRootVisibility();
  };

  const showNotice = ({
    title,
    description = "",
    tone = "info",
    duration = 2600,
    loadingMs = 0,
    onDone = null,
  }) => {
    if (!toastPanel || !toastTitle || !toastSub) {
      if (typeof onDone === "function") onDone();
      return;
    }

    clearNoticeTimers();
    toastTitle.textContent = title;
    toastSub.textContent = description;
    if (tone && tone !== "info") {
      toastPanel.dataset.tone = tone;
    } else {
      toastPanel.removeAttribute("data-tone");
    }

    if (loadingMs > 0) {
      toastPanel.classList.add("is-loading");
      toastPanel.style.setProperty("--hud-progress-ms", `${loadingMs}ms`);
      loadingTimer = window.setTimeout(() => {
        hideNotice();
        if (typeof onDone === "function") onDone();
      }, loadingMs);
    } else {
      toastPanel.classList.remove("is-loading");
      toastPanel.style.removeProperty("--hud-progress-ms");
      if (duration > 0) {
        noticeTimer = window.setTimeout(hideNotice, duration);
      }
      if (typeof onDone === "function") onDone();
    }

    toastPanel.classList.add("is-visible");
    toastPanel.setAttribute("aria-hidden", "false");
    noticeVisible = true;
    syncRootVisibility();
  };

  function show(text, sub = "") {
    if (!interactionPanel || !hint || !subhint) return;
    hint.textContent = text;
    subhint.textContent = sub;
    interactionPanel.classList.add("is-visible");
    interactionPanel.setAttribute("aria-hidden", "false");
    interactionVisible = true;
    syncRootVisibility();
  }

  function hide() {
    if (!interactionPanel) return;
    interactionPanel.classList.remove("is-visible");
    interactionPanel.setAttribute("aria-hidden", "true");
    interactionVisible = false;
    syncRootVisibility();
  }

  function notify(title, { description = "", tone = "info", duration = 2600 } = {}) {
    showNotice({ title, description, tone, duration });
  }

  function showLoading(
    title,
    { description = "", tone = "info", duration = 2600, onDone = null } = {}
  ) {
    showNotice({
      title,
      description,
      tone,
      duration: 0,
      loadingMs: duration,
      onDone,
    });
  }

  syncRootVisibility();

  return { show, hide, notify, showLoading, hideNotice };
}
