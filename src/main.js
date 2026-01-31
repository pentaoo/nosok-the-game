import { createGameScene } from "./world/scene-setup.js";
import { createInput } from "./core/input.js";
import { createTime } from "./core/time.js";
import { createLoop } from "./core/loop.js";
import { createHUD } from "./ui/hud.js";
import { createTouchControls } from "./ui/touch-controls.js";
import { createPlayer } from "./world/player.js";
import { createCollisionWorld } from "./world/collisions.js";
import { initDOCControls, hideDOC } from "./ui/doc.js";

async function main() {
  initDOCControls();
  const appEl = document.querySelector("#game");
  const hud = createHUD();
  const input = createInput(window);
  const time = createTime();
  const game = createGameScene(appEl);
  createTouchControls({ container: appEl, input });
  const collisionWorld = createCollisionWorld(game.scene);
  const player = createPlayer(game.scene);
  const interactables = game.interactables;

  const loop = createLoop((dt) => {
    time.update(dt);
    player.update({
      dt,
      input,
      collisionWorld,
      cameraYaw: game.getCameraYaw(),
    });
    game.followCamera(player.position, dt, player.facing, player.moveSpeed);

    for (const w of game.world.washers ?? []) {
      collisionWorld.addWasherObstacle(w);
      w.userData.mixer?.update(dt);
      w.userData.FBA_WM_1?.userData?.updateFlipbook?.(dt);
    }

    const interaction = interactables.getBestInteraction(player.position);
    const isTouchUI = document.body.classList.contains("touch-ui");
    if (interaction) {
      const hintText = isTouchUI
        ? `Удерживайте E — ${interaction.label}`
        : `Нажмите E — ${interaction.label}`;
      hud.show(hintText, `${interaction.description}`);

      if (isTouchUI) {
        if (input.isDown("KeyE")) {
          interaction.onInteract();
        } else {
          hideDOC();
        }
      } else if (input.wasPressed("KeyE")) {
        interaction.onInteract();
      }
    } else {
      if (isTouchUI) hideDOC();
      hud.hide();
    }

    input.endFrame();
    game.render();
  });

  loop.start();
}

main().catch((err) => {
  console.error(err);
  alert("Ошибка запуска. Смотрите консоль.");
});
