const DEFAULT_BRUSH_SIZE = 18;
const DEFAULT_BRUSH_COLOR = "#111111";
const FILENAME_PREFIX = "nosok-print";
const WHITE_CHANNEL_THRESHOLD = 236;

function getDesignerNodes() {
  const canvas = document.querySelector("#sock-designer-canvas");
  const baseImage = document.querySelector(".sock-designer-base");
  const palette = document.querySelector("#sock-palette");
  const brushInput = document.querySelector("#sock-brush-size");
  const brushOutput = document.querySelector("#sock-brush-output");
  const toolToggle = document.querySelector("#sock-tool-toggle");
  const clearButton = document.querySelector("#sock-clear");
  const downloadButton = document.querySelector("#sock-download");

  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(baseImage instanceof HTMLImageElement) ||
    !(palette instanceof HTMLElement) ||
    !(brushInput instanceof HTMLInputElement) ||
    !(brushOutput instanceof HTMLOutputElement) ||
    !(toolToggle instanceof HTMLButtonElement) ||
    !(clearButton instanceof HTMLButtonElement) ||
    !(downloadButton instanceof HTMLButtonElement)
  ) {
    return null;
  }

  const swatches = Array.from(palette.querySelectorAll("[data-sock-color]"));
  if (!swatches.length) return null;

  return {
    canvas,
    baseImage,
    brushInput,
    brushOutput,
    toolToggle,
    clearButton,
    downloadButton,
    swatches,
  };
}

function getEventPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return {
    x: Math.max(0, Math.min(canvas.width, x)),
    y: Math.max(0, Math.min(canvas.height, y)),
  };
}

function getContainRect(containerWidth, containerHeight, sourceWidth, sourceHeight) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const containerRatio = containerWidth / containerHeight;

  if (sourceRatio > containerRatio) {
    const width = containerWidth;
    const height = width / sourceRatio;
    return { x: 0, y: (containerHeight - height) / 2, width, height };
  }

  const height = containerHeight;
  const width = height * sourceRatio;
  return { x: (containerWidth - width) / 2, y: 0, width, height };
}

function formatBrushSize(size) {
  return `${Math.round(size)} px`;
}

export function initSockDesigner() {
  const nodes = getDesignerNodes();
  if (!nodes) return;

  const {
    canvas,
    baseImage,
    brushInput,
    brushOutput,
    toolToggle,
    clearButton,
    downloadButton,
    swatches,
  } = nodes;

  const displayCtx = canvas.getContext("2d");
  if (!displayCtx) return;

  const paintLayer = document.createElement("canvas");
  paintLayer.width = canvas.width;
  paintLayer.height = canvas.height;
  const paintCtx = paintLayer.getContext("2d");

  const maskLayer = document.createElement("canvas");
  maskLayer.width = canvas.width;
  maskLayer.height = canvas.height;
  const maskCtx = maskLayer.getContext("2d");

  const sourceLayer = document.createElement("canvas");
  sourceLayer.width = canvas.width;
  sourceLayer.height = canvas.height;
  const sourceCtx = sourceLayer.getContext("2d", { willReadFrequently: true });

  if (!paintCtx || !maskCtx || !sourceCtx) return;

  const state = {
    isDrawing: false,
    lastPoint: null,
    brushSize: Number(brushInput.value) || DEFAULT_BRUSH_SIZE,
    brushColor: DEFAULT_BRUSH_COLOR,
    isEraser: false,
    imageReady: false,
    imageRect: { x: 0, y: 0, width: canvas.width, height: canvas.height },
  };

  const setActiveSwatch = (nextActive) => {
    swatches.forEach((swatch) => {
      swatch.classList.toggle("is-active", swatch === nextActive);
    });
  };

  const syncBrushSize = () => {
    const parsed = Number(brushInput.value);
    state.brushSize = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BRUSH_SIZE;
    brushOutput.textContent = formatBrushSize(state.brushSize);
  };

  const syncToolToggle = () => {
    toolToggle.classList.toggle("is-eraser", state.isEraser);
    toolToggle.setAttribute("aria-pressed", String(state.isEraser));
    toolToggle.textContent = state.isEraser ? "Кисть" : "Ластик";
  };

  const rebuildMask = () => {
    maskCtx.clearRect(0, 0, maskLayer.width, maskLayer.height);
    sourceCtx.clearRect(0, 0, sourceLayer.width, sourceLayer.height);
    if (!state.imageReady) return;

    state.imageRect = getContainRect(
      canvas.width,
      canvas.height,
      baseImage.naturalWidth,
      baseImage.naturalHeight,
    );

    sourceCtx.drawImage(
      baseImage,
      state.imageRect.x,
      state.imageRect.y,
      state.imageRect.width,
      state.imageRect.height,
    );

    const maskPixels = sourceCtx.getImageData(0, 0, sourceLayer.width, sourceLayer.height);
    const data = maskPixels.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) continue;

      const isWhiteArea =
        data[i] >= WHITE_CHANNEL_THRESHOLD &&
        data[i + 1] >= WHITE_CHANNEL_THRESHOLD &&
        data[i + 2] >= WHITE_CHANNEL_THRESHOLD;

      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = isWhiteArea ? alpha : 0;
    }

    maskCtx.putImageData(maskPixels, 0, 0);
  };

  const redraw = () => {
    displayCtx.clearRect(0, 0, canvas.width, canvas.height);
    displayCtx.drawImage(paintLayer, 0, 0);

    if (!state.imageReady) return;

    displayCtx.globalCompositeOperation = "destination-in";
    displayCtx.drawImage(maskLayer, 0, 0);
    displayCtx.globalCompositeOperation = "source-over";
  };

  const drawSegment = (from, to) => {
    paintCtx.save();
    paintCtx.lineWidth = state.brushSize;
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";

    if (state.isEraser) {
      paintCtx.globalCompositeOperation = "destination-out";
    } else {
      paintCtx.globalCompositeOperation = "source-over";
      paintCtx.strokeStyle = state.brushColor;
    }

    paintCtx.beginPath();
    paintCtx.moveTo(from.x, from.y);
    paintCtx.lineTo(to.x, to.y);
    paintCtx.stroke();
    paintCtx.restore();
    redraw();
  };

  const startDrawing = (event) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.isDrawing = true;
    state.lastPoint = getEventPoint(event, canvas);
    drawSegment(state.lastPoint, state.lastPoint);
  };

  const draw = (event) => {
    if (!state.isDrawing || !state.lastPoint) return;
    event.preventDefault();
    const nextPoint = getEventPoint(event, canvas);
    drawSegment(state.lastPoint, nextPoint);
    state.lastPoint = nextPoint;
  };

  const stopDrawing = (event) => {
    if (!state.isDrawing) return;
    if (event && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.isDrawing = false;
    state.lastPoint = null;
  };

  const clearCanvas = () => {
    paintCtx.clearRect(0, 0, paintLayer.width, paintLayer.height);
    redraw();
  };

  const buildExportDataUrl = () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return "";

    if (state.imageReady) {
      exportCtx.drawImage(
        baseImage,
        state.imageRect.x,
        state.imageRect.y,
        state.imageRect.width,
        state.imageRect.height,
      );
      exportCtx.globalCompositeOperation = "source-atop";
      exportCtx.drawImage(paintLayer, 0, 0);
      exportCtx.globalCompositeOperation = "source-over";
    } else {
      exportCtx.drawImage(paintLayer, 0, 0);
    }

    return exportCanvas.toDataURL("image/png");
  };

  const downloadCanvas = () => {
    const dataUrl = buildExportDataUrl();
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${FILENAME_PREFIX}-${Date.now()}.png`;
    link.click();
  };

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const nextColor = swatch.getAttribute("data-sock-color");
      if (!nextColor) return;
      state.brushColor = nextColor;
      state.isEraser = false;
      setActiveSwatch(swatch);
      syncToolToggle();
    });
  });

  brushInput.addEventListener("input", syncBrushSize);
  toolToggle.addEventListener("click", () => {
    state.isEraser = !state.isEraser;
    syncToolToggle();
  });
  clearButton.addEventListener("click", clearCanvas);
  downloadButton.addEventListener("click", downloadCanvas);

  canvas.addEventListener("pointerdown", startDrawing);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  canvas.addEventListener("lostpointercapture", stopDrawing);

  const onImageReady = () => {
    state.imageReady = true;
    rebuildMask();
    redraw();
  };

  if (baseImage.complete && baseImage.naturalWidth > 0) {
    onImageReady();
  } else {
    baseImage.addEventListener("load", onImageReady, { once: true });
    baseImage.addEventListener("error", redraw, { once: true });
  }

  const initialSwatch =
    swatches.find((swatch) => swatch.classList.contains("is-active")) ?? swatches[0];
  const initialColor = initialSwatch.getAttribute("data-sock-color");
  if (initialColor) state.brushColor = initialColor;

  setActiveSwatch(initialSwatch);
  syncBrushSize();
  syncToolToggle();
  redraw();
}
