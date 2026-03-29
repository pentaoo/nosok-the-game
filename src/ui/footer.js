import authorImage from "../img/footer/author-aleksey.jpg";
import curatorImage from "../img/footer/curator-nikolay.png";
import technologistImage from "../img/footer/technologist-anna.png";
import postersImage from "../img/footer/project-posters.png";
import webPosterImage from "../img/footer/project-web-poster.png";
import zineCoverA from "../img/footer/project-zine-cover-a.png";
import zineCoverB from "../img/footer/project-zine-cover-b.png";

const PANEL_DATA = [
  {
    key: "author",
    theme: "purple",
    title: "Автор",
    name: "Гудков Алексей",
    photo: authorImage,
    entries: [
      { type: "link", label: "tg: pentao", href: "https://t.me/pentao" },
      {
        type: "copy",
        label: "inst: aleksey_pnt",
        value: "aleksey_pnt",
        feedback: "Юзернейм aleksey_pnt скопирован",
      },
      { type: "link", label: "dp: penta", href: "https://dprofile.ru/penta" },
    ],
  },
  {
    key: "curator",
    theme: "pink",
    title: "Куратор",
    name: "Цветников Николай",
    photo: curatorImage,
    entries: [
      {
        type: "link",
        label: "tg: black_reaper228",
        href: "https://t.me/black_reaper228",
      },
      { type: "link", label: "РИПЕР", href: "https://kreaper.ru/" },
    ],
  },
  {
    key: "technologist",
    theme: "green",
    title: "Технолог",
    name: "Комкова Анна",
    photo: technologistImage,
    entries: [
      {
        type: "link",
        label: "tg: anna_i_dobro",
        href: "https://t.me/anna_i_dobro",
      },
      { type: "link", label: "tgc: skomkanno", href: "https://t.me/skomkanno" },
    ],
  },
  {
    key: "project",
    theme: "yellow",
    title: "Проект",
    projects: [
      {
        key: "posters",
        kind: "posters",
        label: "Плакаты Nosok",
        href: "https://hsedesign.ru/project/nosok-e8ed28e6a1994fce8045f196b2a50264",
      },
      {
        key: "zine",
        kind: "zine",
        label: "ЗИН Nosok",
        href: "https://hsedesign.ru/project/no-3e0cdb1fa63b4876bc99166362a24c93",
      },
      {
        key: "web-poster",
        kind: "web",
        label: "Веб-плакат Nosok — the web poster",
        href: "https://pentaoo.github.io/nosok_webposter/",
      },
    ],
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEntry(entry) {
  if (entry.type === "copy") {
    return `
      <button
        class="footer-entry footer-entry--button"
        type="button"
        data-copy-value="${escapeHtml(entry.value)}"
        data-copy-feedback="${escapeHtml(entry.feedback)}"
      >
        <span class="footer-entry__label">${escapeHtml(entry.label)}</span>
        <span class="footer-entry__badge">copy</span>
      </button>
    `;
  }

  return `
    <a class="footer-entry" href="${escapeHtml(entry.href)}" target="_blank" rel="noreferrer">
      <span class="footer-entry__label">${escapeHtml(entry.label)}</span>
      <span class="footer-entry__badge" aria-hidden="true">↗</span>
    </a>
  `;
}

function renderPersonPanel(panel) {
  const entriesMarkup = panel.entries.map(renderEntry).join("");
  return `
    <header class="footer-panel__header">
      <p class="footer-panel__title">${escapeHtml(panel.title)}</p>
    </header>
    <div class="footer-panel__body">
      <div class="footer-card footer-card--${panel.theme}">
        <p class="footer-person__name">${escapeHtml(panel.name)}</p>
        <div class="footer-person__entries">${entriesMarkup}</div>
      </div>
      <div class="footer-photo-shell footer-photo-shell--${panel.key}">
        <img class="footer-photo" src="${panel.photo}" alt="${escapeHtml(panel.name)}" loading="lazy" />
      </div>
    </div>
  `;
}

function renderProjectPreview(kind) {
  if (kind === "zine") {
    return `
      <div class="footer-project-card__stack footer-project-card__stack--zine">
        <div class="footer-project-card__cover footer-project-card__cover--back">
          <img src="${zineCoverA}" alt="" loading="lazy" />
        </div>
        <div class="footer-project-card__cover footer-project-card__cover--front">
          <img src="${zineCoverB}" alt="" loading="lazy" />
        </div>
      </div>
    `;
  }

  if (kind === "web") {
    return `
      <div class="footer-project-card__poster">
        <img src="${webPosterImage}" alt="" loading="lazy" />
      </div>
    `;
  }

  return `
    <div class="footer-project-card__poster">
      <img src="${postersImage}" alt="" loading="lazy" />
    </div>
  `;
}

function renderProjectPanel(panel) {
  const cardsMarkup = panel.projects
    .map(
      (project) => `
        <a
          class="footer-project-card footer-project-card--${project.kind}"
          href="${escapeHtml(project.href)}"
          target="_blank"
          rel="noreferrer"
        >
          <div class="footer-project-card__preview">
            ${renderProjectPreview(project.kind)}
          </div>
          <span class="footer-project-card__label">
            <span>${escapeHtml(project.label)}</span>
            <span aria-hidden="true">↗</span>
          </span>
        </a>
      `
    )
    .join("");

  return `
    <header class="footer-panel__header">
      <p class="footer-panel__title">${escapeHtml(panel.title)}</p>
    </header>
    <div class="footer-panel__body footer-panel__body--project">
      <div class="footer-projects">
        <div class="footer-projects__controls">
          <button class="footer-projects__control" type="button" data-project-control="prev" aria-label="Прокрутить проекты влево">
            ←
          </button>
          <button class="footer-projects__control" type="button" data-project-control="next" aria-label="Прокрутить проекты вправо">
            →
          </button>
        </div>
        <div class="footer-projects__viewport" data-project-viewport tabindex="-1">
          <div class="footer-projects__track">
            ${cardsMarkup}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPanel(panel) {
  const detailMarkup =
    panel.key === "project" ? renderProjectPanel(panel) : renderPersonPanel(panel);

  return `
    <article
      class="footer-panel footer-panel--${panel.theme}"
      data-panel-key="${escapeHtml(panel.key)}"
      tabindex="0"
      aria-label="${escapeHtml(panel.title)}"
    >
      <div class="footer-panel__collapsed" aria-hidden="true">
        <span class="footer-sock"></span>
      </div>
      <div class="footer-panel__expanded">
        ${detailMarkup}
      </div>
    </article>
  `;
}

function canHover() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
  return Promise.resolve();
}

export function initFooter({ notify } = {}) {
  const root = document.getElementById("home-footer");
  if (!(root instanceof HTMLElement)) {
    return {
      destroy() {},
    };
  }

  root.innerHTML = `
    ${PANEL_DATA.map(renderPanel).join("")}
    <p class="footer-live" id="footer-live" aria-live="polite"></p>
  `;

  const panels = Array.from(root.querySelectorAll(".footer-panel"));
  const liveRegion = root.querySelector("#footer-live");
  const viewport = root.querySelector("[data-project-viewport]");
  const prevButton = root.querySelector('[data-project-control="prev"]');
  const nextButton = root.querySelector('[data-project-control="next"]');
  const disposers = [];
  let fixedKey = null;
  let hoverKey = null;
  let feedbackTimer = 0;

  const sendFeedback = (message, tone = "success") => {
    if (liveRegion instanceof HTMLElement) {
      liveRegion.textContent = message;
    }

    if (typeof notify === "function") {
      notify(message, { tone, duration: 2200 });
    }

    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      if (liveRegion instanceof HTMLElement) {
        liveRegion.textContent = "";
      }
    }, 2200);
  };

  const syncPanels = () => {
    const activeKey = fixedKey ?? hoverKey;
    root.classList.toggle("has-active", Boolean(activeKey));

    for (const panel of panels) {
      const isActive = panel.dataset.panelKey === activeKey;
      const isFixed = panel.dataset.panelKey === fixedKey;
      panel.classList.toggle("is-active", isActive);
      panel.classList.toggle("is-fixed", isFixed);
      panel.setAttribute("aria-expanded", isActive ? "true" : "false");
    }
  };

  const toggleFixed = (key) => {
    fixedKey = fixedKey === key ? null : key;
    syncPanels();
  };

  const resetHover = () => {
    if (fixedKey || !canHover()) return;
    hoverKey = null;
    syncPanels();
  };

  for (const panel of panels) {
    const key = panel.dataset.panelKey;
    if (!key) continue;

    const onMouseEnter = () => {
      if (fixedKey || !canHover()) return;
      hoverKey = key;
      syncPanels();
    };

    const onFocusIn = () => {
      if (fixedKey) return;
      hoverKey = key;
      syncPanels();
    };

    const onKeyDown = (event) => {
      if (event.target !== panel) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleFixed(key);
    };

    const onClick = (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("a, button, .footer-projects")
      ) {
        return;
      }
      toggleFixed(key);
    };

    panel.addEventListener("mouseenter", onMouseEnter);
    panel.addEventListener("focusin", onFocusIn);
    panel.addEventListener("keydown", onKeyDown);
    panel.addEventListener("click", onClick);

    disposers.push(() => panel.removeEventListener("mouseenter", onMouseEnter));
    disposers.push(() => panel.removeEventListener("focusin", onFocusIn));
    disposers.push(() => panel.removeEventListener("keydown", onKeyDown));
    disposers.push(() => panel.removeEventListener("click", onClick));
  }

  const onMouseLeave = () => resetHover();
  const onFocusOut = () => {
    window.setTimeout(() => {
      if (root.contains(document.activeElement) || fixedKey) return;
      hoverKey = null;
      syncPanels();
    }, 0);
  };

  root.addEventListener("mouseleave", onMouseLeave);
  root.addEventListener("focusout", onFocusOut);
  disposers.push(() => root.removeEventListener("mouseleave", onMouseLeave));
  disposers.push(() => root.removeEventListener("focusout", onFocusOut));

  for (const button of root.querySelectorAll("[data-copy-value]")) {
    const onCopy = async () => {
      const value = button.getAttribute("data-copy-value") ?? "";
      const feedback = button.getAttribute("data-copy-feedback") ?? "Скопировано";
      try {
        await copyText(value);
        sendFeedback(feedback);
      } catch (error) {
        console.error("Copy failed", error);
        sendFeedback("Не удалось скопировать юзернейм", "danger");
      }
    };

    button.addEventListener("click", onCopy);
    disposers.push(() => button.removeEventListener("click", onCopy));
  }

  if (
    viewport instanceof HTMLElement &&
    prevButton instanceof HTMLButtonElement &&
    nextButton instanceof HTMLButtonElement
  ) {
    const syncProjectControls = () => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      prevButton.disabled = viewport.scrollLeft <= 8;
      nextButton.disabled = viewport.scrollLeft >= maxScroll - 8;
    };

    const moveProjects = (direction) => {
      const distance = Math.max(viewport.clientWidth * 0.72, 320);
      viewport.scrollBy({ left: distance * direction, behavior: "smooth" });
    };

    const onPrev = () => moveProjects(-1);
    const onNext = () => moveProjects(1);
    const onScroll = () => syncProjectControls();
    const onResize = () => syncProjectControls();

    prevButton.addEventListener("click", onPrev);
    nextButton.addEventListener("click", onNext);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    disposers.push(() => prevButton.removeEventListener("click", onPrev));
    disposers.push(() => nextButton.removeEventListener("click", onNext));
    disposers.push(() => viewport.removeEventListener("scroll", onScroll));
    disposers.push(() => window.removeEventListener("resize", onResize));

    syncProjectControls();
  }

  syncPanels();

  return {
    destroy() {
      window.clearTimeout(feedbackTimer);
      while (disposers.length) {
        const dispose = disposers.pop();
        dispose?.();
      }
    },
  };
}
