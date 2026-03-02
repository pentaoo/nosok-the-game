import { createGameScene } from "./world/scene-setup.js";
import { createInput } from "./core/input.js";
import { createLoop } from "./core/loop.js";
import { createHUD } from "./ui/hud.js";
import { createTouchControls } from "./ui/touch-controls.js";
import { createPlayer } from "./world/player.js";
import { createCollisionWorld } from "./world/collisions.js";
import { DOCS } from "./data/docs.js";
import {
  initDOCControls,
  markItemFound,
  openDocById,
  setDocFoundListener,
} from "./ui/doc.js";
import { initRecyclerBlock } from "./ui/recycler-block.js";
import { initSockDesigner } from "./ui/sock-designer.js";
import { initHeroSocks } from "./ui/hero-socks.js";
import { initSeamDesigner } from "./ui/seam-designer.js";
import { initStainCleaner } from "./ui/stain-cleaner.js";
import { createStoryShare } from "./ui/story-share.js";
import { createQuestController } from "./ui/quests.js";
import { isLowPowerDevice } from "./world/scene/device-profile.js";

function updateWorldObstacles(world, collisionWorld, dt) {
  for (const washer of world.washerObstacles ?? []) {
    collisionWorld.addWasherObstacle(washer);
    washer.userData.mixer?.update(dt);
    washer.userData.FBA_WM_1?.userData?.updateFlipbook?.(dt);
  }

  for (const item of world.itemMeshes ?? []) {
    collisionWorld.addItemObstacle(item);
  }
}

function handleInteraction({ interaction, hud, input }) {
  if (!interaction) {
    hud.hide();
    return;
  }

  const isTouchUI = document.body.classList.contains("touch-ui");
  const hintText = isTouchUI ? `Удерживайте E — ${interaction.label}` : `Нажмите E — ${interaction.label}`;

  hud.show(hintText, interaction.description);

  if (input.wasPressed("KeyE")) {
    interaction.onInteract();
  }
}

function createPerformanceController({
  loop,
  input,
  recycler,
  gameSection,
  recyclerSection,
}) {
  const isSectionInitiallyVisible = (section) => {
    if (!(section instanceof HTMLElement)) return true;
    const rect = section.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  };

  const sectionState = {
    gameVisible: isSectionInitiallyVisible(gameSection),
    recyclerVisible: isSectionInitiallyVisible(recyclerSection),
  };

  const pageState = {
    visible: document.visibilityState !== "hidden",
    focused: typeof document.hasFocus === "function" ? document.hasFocus() : true,
  };

  const activeFps = isLowPowerDevice() ? 30 : 45;
  loop.setMaxFps(activeFps);

  const sync = () => {
    const gameActive = pageState.visible && pageState.focused && sectionState.gameVisible;
    const recyclerVisible = recyclerSection ? sectionState.recyclerVisible : true;
    const recyclerActive = pageState.visible && recyclerVisible;

    if (gameActive) {
      loop.resume();
    } else {
      loop.pause();
      input.reset?.();
    }

    recycler?.setActive?.(recyclerActive);

    gameSection?.classList.toggle("is-offscreen", !sectionState.gameVisible);
    recyclerSection?.classList.toggle("is-offscreen", !sectionState.recyclerVisible);
  };

  const onVisibilityChange = () => {
    pageState.visible = document.visibilityState !== "hidden";
    sync();
  };

  const onWindowBlur = () => {
    pageState.focused = false;
    input.reset?.();
    sync();
  };

  const onWindowFocus = () => {
    pageState.focused = true;
    sync();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onWindowBlur);
  window.addEventListener("focus", onWindowFocus);

  let observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === gameSection) {
            sectionState.gameVisible = entry.isIntersecting && entry.intersectionRatio > 0.03;
          }
          if (entry.target === recyclerSection) {
            sectionState.recyclerVisible = entry.isIntersecting && entry.intersectionRatio > 0.03;
          }
        }
        sync();
      },
      {
        threshold: [0, 0.03, 0.15],
      }
    );

    if (gameSection) observer.observe(gameSection);
    if (recyclerSection) observer.observe(recyclerSection);
  }

  sync();

  return {
    destroy() {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    },
  };
}

function createDisposerRegistry() {
  const stack = [];
  let isDisposed = false;

  const register = (resource, destroyFn = null) => {
    if (!resource) return resource;

    if (typeof destroyFn === "function") {
      stack.push(destroyFn);
      return resource;
    }

    if (typeof resource.destroy === "function") {
      stack.push(() => resource.destroy());
      return resource;
    }

    return resource;
  };

  const dispose = () => {
    if (isDisposed) return;
    isDisposed = true;

    while (stack.length) {
      const destroy = stack.pop();
      try {
        destroy?.();
      } catch (error) {
        console.error("Cleanup failed", error);
      }
    }
  };

  return { register, dispose };
}

async function main() {
  const { register, dispose } = createDisposerRegistry();

  const onPageHide = () => {
    dispose();
  };
  window.addEventListener("pagehide", onPageHide, { once: true });

  try {
    register(initDOCControls());
    register(initHeroSocks());
    const recycler = register(initRecyclerBlock());
    const sockDesigner = register(initSockDesigner());
    const seamDesigner = register(initSeamDesigner());
    const stainCleaner = register(initStainCleaner());

    const appEl = document.querySelector("#game");
    if (!(appEl instanceof HTMLElement)) {
      throw new Error("Game mount element #game not found");
    }

    const hud = createHUD();
    const quests = createQuestController({ hud, totalDocs: DOCS.length });

    register(
      createStoryShare({
        notify: (text, options) => hud.notify(text, options),
        getSnapshot: () => ({
          sockImageDataUrl: sockDesigner?.getImageDataUrl?.() ?? "",
          seamProgress: seamDesigner?.getState?.().progress ?? 0,
          stainProgress: stainCleaner?.getState?.().progress ?? 0,
          drawState: sockDesigner?.getSnapshot?.() ?? null,
        }),
      })
    );

    setDocFoundListener((docId) => quests.markDocCollected(docId));
    register({}, () => setDocFoundListener(null));

    const input = register(createInput(window));
    const game = register(
      createGameScene(appEl, {
        quests,
        onDocOpen: openDocById,
        onItemFound: markItemFound,
      })
    );

    register(createTouchControls({ input }));

    const collisionWorld = createCollisionWorld();
    const player = createPlayer(game.scene);
    const interactables = game.interactables;

    const loop = createLoop((dt) => {
      player.update({
        dt,
        input,
        collisionWorld,
        cameraYaw: game.getCameraYaw(),
      });

      game.followCamera(player.position, dt, player.facing, player.moveSpeed);
      updateWorldObstacles(game.world, collisionWorld, dt);

      handleInteraction({
        interaction: interactables.getBestInteraction(player.position),
        hud,
        input,
      });

      input.endFrame();
      game.render();
    });

    register(loop, () => loop.stop());
    loop.start();

    register(
      createPerformanceController({
        loop,
        input,
        recycler,
        gameSection: document.getElementById("home-game"),
        recyclerSection: document.getElementById("home-recycler"),
      })
    );
  } catch (error) {
    dispose();
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  alert("Ошибка запуска. Смотрите консоль.");
});
