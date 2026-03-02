const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SHARE_TEXT = "Я собрал свой Nosok-дизайн";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function drawFallbackQr(ctx, value, x, y, size) {
  const grid = 29;
  const cell = size / grid;
  const seed = hashString(value || "nosok");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#000000";

  const drawFinder = (fx, fy) => {
    ctx.fillRect(x + fx * cell, y + fy * cell, cell * 7, cell * 7);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 5, cell * 5);
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3);
  };

  drawFinder(1, 1);
  drawFinder(grid - 8, 1);
  drawFinder(1, grid - 8);

  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const inFinderTopLeft = row >= 1 && row <= 7 && col >= 1 && col <= 7;
      const inFinderTopRight = row >= 1 && row <= 7 && col >= grid - 8 && col <= grid - 2;
      const inFinderBottomLeft = row >= grid - 8 && row <= grid - 2 && col >= 1 && col <= 7;
      if (inFinderTopLeft || inFinderTopRight || inFinderBottomLeft) continue;

      const n = (seed + row * 73 + col * 151 + row * col * 13) & 1023;
      if (n % 3 !== 0) continue;

      ctx.fillRect(x + col * cell, y + row * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

async function drawQr(ctx, value, x, y, size) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;

  try {
    const response = await fetch(qrUrl, { mode: "cors", cache: "no-store" });
    if (!response.ok) throw new Error("QR service failed");

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const qrImage = await loadImage(objectUrl);
      ctx.drawImage(qrImage, x, y, size, size);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    drawFallbackQr(ctx, value, x, y, size);
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create story blob"));
      }
    }, "image/png");
  });
}

function drawBackplate(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
  gradient.addColorStop(0, "#7e5bff");
  gradient.addColorStop(0.33, "#fe4aae");
  gradient.addColorStop(0.66, "#b4ff3b");
  gradient.addColorStop(1, "#ffe600");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(64, 74, STORY_WIDTH - 128, STORY_HEIGHT - 148);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 6;
  ctx.strokeRect(64, 74, STORY_WIDTH - 128, STORY_HEIGHT - 148);
}

async function buildStoryCanvas(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas context unavailable");

  drawBackplate(ctx);

  ctx.fillStyle = "#000";
  ctx.font = "700 80px 'Mabry Pro', 'Arial Black', sans-serif";
  ctx.fillText("Nosok", 104, 190);

  ctx.font = "500 36px 'Mabry Pro', 'Arial Black', sans-serif";
  ctx.fillText("Собери свой дизайн носка", 104, 246);

  const cardX = 106;
  const cardY = 296;
  const cardWidth = 868;
  const cardHeight = 990;

  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

  if (snapshot.sockImageDataUrl) {
    try {
      const sockImage = await loadImage(snapshot.sockImageDataUrl);
      const maxWidth = cardWidth - 128;
      const maxHeight = cardHeight - 182;
      const scale = Math.min(maxWidth / sockImage.width, maxHeight / sockImage.height);
      const drawWidth = sockImage.width * scale;
      const drawHeight = sockImage.height * scale;
      const drawX = cardX + (cardWidth - drawWidth) / 2;
      const drawY = cardY + 72 + (maxHeight - drawHeight) / 2;
      ctx.drawImage(sockImage, drawX, drawY, drawWidth, drawHeight);
    } catch {
      ctx.fillStyle = "#000";
      ctx.font = "600 38px 'Mabry Pro', 'Arial Black', sans-serif";
      ctx.fillText("Носок не найден", cardX + 250, cardY + cardHeight / 2);
    }
  }

  const seamValue = Math.round((snapshot.seamProgress ?? 0) * 100);
  const stainValue = Math.round((snapshot.stainProgress ?? 0) * 100);

  ctx.fillStyle = "#111";
  ctx.font = "600 34px 'Mabry Pro', 'Arial Black', sans-serif";
  ctx.fillText(`Шов: ${seamValue}%`, cardX + 36, cardY + cardHeight - 68);
  ctx.fillText(`Очистка пятен: ${stainValue}%`, cardX + 420, cardY + cardHeight - 68);

  const qrSize = 230;
  const qrX = STORY_WIDTH - qrSize - 112;
  const qrY = STORY_HEIGHT - qrSize - 186;
  const qrUrl = snapshot.shareUrl || window.location.href;

  await drawQr(ctx, qrUrl, qrX, qrY, qrSize);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeRect(qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#111";
  ctx.font = "600 28px 'Mabry Pro', 'Arial Black', sans-serif";
  ctx.fillText("Открой Nosok", qrX - 2, qrY - 22);

  ctx.font = "500 20px 'Mabry Pro', 'Arial Black', sans-serif";
  ctx.fillText("qr url / ratio будут уточнены позже", 104, STORY_HEIGHT - 106);

  return canvas;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function createStoryShare({ getSnapshot, notify } = {}) {
  const button = document.getElementById("sock-share");
  if (!(button instanceof HTMLButtonElement)) {
    return {
      destroy() {},
    };
  }

  const sendNotice = (text, tone = "success") => {
    if (typeof notify === "function") {
      notify(text, { tone, duration: 2600 });
      return;
    }
    console.info(text);
  };

  const onClick = async () => {
    if (button.disabled) return;
    button.disabled = true;

    try {
      const snapshot = {
        ...(typeof getSnapshot === "function" ? getSnapshot() : null),
        shareUrl: window.location.href,
      };

      const storyCanvas = await buildStoryCanvas(snapshot);
      const storyBlob = await canvasToBlob(storyCanvas);
      const fileName = `nosok-story-${Date.now()}.png`;
      const file = new File([storyBlob], fileName, { type: "image/png" });

      const canNativeShareFiles =
        !!navigator.share &&
        (!!navigator.canShare ? navigator.canShare({ files: [file] }) : false);

      if (canNativeShareFiles) {
        await navigator.share({
          title: "Nosok",
          text: SHARE_TEXT,
          files: [file],
          url: snapshot.shareUrl,
        });
        sendNotice("Сторис готова: поделились успешно.");
      } else {
        downloadBlob(storyBlob, fileName);
        sendNotice("Сторис готова: PNG сохранён на устройство.");
      }
    } catch (error) {
      console.error(error);
      sendNotice("Не удалось собрать сторис. Попробуйте ещё раз.", "warning");
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener("click", onClick);

  return {
    destroy() {
      button.removeEventListener("click", onClick);
    },
  };
}
