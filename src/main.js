import { createGameScene } from "./world/scene-setup.js";
import { createInput } from "./core/input.js";
import { createLoop } from "./core/loop.js";
import { createHUD } from "./ui/hud.js";
import { createTouchControls } from "./ui/touch-controls.js";
import { createPlayer } from "./world/player.js";
import { createCollisionWorld } from "./world/collisions.js";
import { DOCS } from "./data/docs.js";
import { initDOCControls, setDocFoundListener } from "./ui/doc.js";
import { initHeroLogo } from "./ui/hero-logo.js";
import { initRecyclerBlock } from "./ui/recycler-block.js";
import { initSockDesigner } from "./ui/sock-designer.js";
import { createQuestController } from "./ui/quests.js";

function initHeroButtonFeedback() {
  const heroButton = document.querySelector(".button");
  if (!heroButton) return;

  let timer = 0;
  heroButton.addEventListener("click", () => {
    heroButton.classList.add("is-clicked");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      heroButton.classList.remove("is-clicked");
    }, 500);
  });
}

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
  const hintText = isTouchUI
    ? `Удерживайте E — ${interaction.label}`
    : `Нажмите E — ${interaction.label}`;
  hud.show(hintText, interaction.description);

  if (input.wasPressed("KeyE")) {
    interaction.onInteract();
  }
}

async function main() {
  initDOCControls();
  initHeroLogo();
  initRecyclerBlock();
  initSockDesigner();
  initHeroButtonFeedback();

  const appEl = document.querySelector("#game");
  if (!(appEl instanceof HTMLElement)) {
    throw new Error("Game mount element #game not found");
  }
  const hud = createHUD();
  const quests = createQuestController({ hud, totalDocs: DOCS.length });
  setDocFoundListener((docId) => quests.markDocCollected(docId));
  const input = createInput(window);
  const game = createGameScene(appEl, { quests });
  createTouchControls({ input });
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

  loop.start();
}

main().catch((err) => {
  console.error(err);
  alert("Ошибка запуска. Смотрите консоль.");
});
