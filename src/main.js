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
  const interactables = createInteractables(game.scene);

  const loop = createLoop((dt) => {
    time.update(dt);
    player.update({ dt, input, collisionWorld });
    game.followCamera(player.position, dt);

    game.world.WM_1?.userData?.FBA_WM_1?.userData?.updateFlipbook?.(dt);

    game.world.WM_1?.userData?.mixer?.update(dt);

    const interaction = interactables.getBestInteraction(player.position);
    if (interaction) {
      hud.show(
        `Нажмите E — ${interaction.label}`,
        `Прототип. Дальше подключим квесты/истории предметов.`
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
