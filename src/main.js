import { createGameScene } from "./world/scene-setup.js";
import { createInput } from "./core/input.js";
import { createTime } from "./core/time.js";
import { createLoop } from "./core/loop.js";
import { createHUD } from "./ui/hud.js";
import { createPlayer } from "./world/player.js";
import { createCollisionWorld } from "./world/collisions.js";
import { createInteractables } from "./world/interactables.js";

async function main() {
  const appEl = document.querySelector("#app");
  const hud = createHUD();
  const input = createInput(window);
  const time = createTime();
  const game = createGameScene(appEl);
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
    game.followCamera(player.position, dt);

    for (const w of game.world.washers ?? []) {
      collisionWorld.addWasherObstacle(w);
      w.userData.mixer?.update(dt);
      w.userData.FBA_WM_1?.userData?.updateFlipbook?.(dt);
    }

    const interaction = interactables.getBestInteraction(player.position);
    if (interaction) {
      hud.show(
        `Нажмите E — ${interaction.label}`,
        `Прототип. Дальше подключим квесты/истории предметов.`,
      );

      if (input.wasPressed("KeyE")) interaction.onInteract();
    } else {
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
