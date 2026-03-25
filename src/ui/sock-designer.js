const BRUSH_SIZE_STEPS = [12, 24, 36];
const BRUSH_STEP_LABELS = ["Маленькая кисть", "Средняя кисть", "Большая кисть"];
const BRUSH_PROGRESS_STEPS = ["0%", "50%", "100%"];
const DEFAULT_BRUSH_STEP = 1;
const DEFAULT_BRUSH_COLOR = "#111111";
const WHITE_CHANNEL_THRESHOLD = 236;
const DESKTOP_BREAKPOINT = 1024;

function clampBrushStep(value) {
  return Math.max(0, Math.min(BRUSH_SIZE_STEPS.length - 1, Math.round(value)));
}

function getDesignerNodes() {
  const canvas = document.querySelector("#sock-designer-canvas");
  const baseImage = document.querySelector(".sock-designer-base");
  const palette = document.querySelector("#sock-palette");
  const brushInput = document.querySelector("#sock-brush-size");
  const toolToggle = document.querySelector("#sock-tool-toggle");
  const clearButton = document.querySelector("#sock-clear");
  const brushSlider = brushInput?.closest(".designer-slider");

  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(baseImage instanceof HTMLImageElement) ||
    !(palette instanceof HTMLElement) ||
    !(brushInput instanceof HTMLInputElement) ||
    !(brushSlider instanceof HTMLElement) ||
    !(toolToggle instanceof HTMLButtonElement) ||
    !(clearButton instanceof HTMLButtonElement)
  ) {
    return null;
  }

  const swatches = Array.from(palette.querySelectorAll("[data-sock-color]"));
  if (!swatches.length) return null;

  return {
    canvas,
    baseImage,
    brushInput,
    brushSlider,
    toolToggle,
    clearButton,
    swatches,
  };
}

function getEventPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return {
    x: Math.max(0, Math.min(canvas.width - 1, x)),
    y: Math.max(0, Math.min(canvas.height - 1, y)),
  };
}

function getPixelCell(point, canvas, pixelSize) {
  const maxColumn = Math.max(0, Math.ceil(canvas.width / pixelSize) - 1);
  const maxRow = Math.max(0, Math.ceil(canvas.height / pixelSize) - 1);

  return {
    column: Math.max(0, Math.min(maxColumn, Math.floor(point.x / pixelSize))),
    row: Math.max(0, Math.min(maxRow, Math.floor(point.y / pixelSize))),
  };
}

function getPixelRect(cell, canvas, pixelSize) {
  const x = cell.column * pixelSize;
  const y = cell.row * pixelSize;

  return {
    x,
    y,
    width: Math.min(pixelSize, canvas.width - x),
    height: Math.min(pixelSize, canvas.height - y),
  };
}

function getCellsOnPath(fromCell, toCell) {
  const cells = [];
  let column = fromCell.column;
  let row = fromCell.row;
  const deltaColumn = Math.abs(toCell.column - column);
  const deltaRow = Math.abs(toCell.row - row);
  const stepColumn = column < toCell.column ? 1 : -1;
  const stepRow = row < toCell.row ? 1 : -1;
  let error = deltaColumn - deltaRow;

  while (true) {
    cells.push({ column, row });
    if (column === toCell.column && row === toCell.row) break;

    const doubledError = error * 2;
    if (doubledError > -deltaRow) {
      error -= deltaRow;
      column += stepColumn;
    }
    if (doubledError < deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
  }

  return cells;
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

function getRoundedRect(rect) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function initSockDesigner() {
  const nodes = getDesignerNodes();
  if (!nodes) {
    return {
      getSnapshot() {
        return {
          hasDrawings: false,
          imageDataUrl: "",
        };
      },
      getImageDataUrl() {
        return "";
      },
      clear() {},
      destroy() {},
    };
  }

  const { canvas, baseImage, brushInput, brushSlider, toolToggle, clearButton, swatches } = nodes;

  const displayCtx = canvas.getContext("2d");
  if (!displayCtx) {
    return {
      getSnapshot() {
        return {
          hasDrawings: false,
          imageDataUrl: "",
        };
      },
      getImageDataUrl() {
        return "";
      },
      clear() {},
      destroy() {},
    };
  }

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

  if (!paintCtx || !maskCtx || !sourceCtx) {
    return {
      getSnapshot() {
        return {
          hasDrawings: false,
          imageDataUrl: "",
        };
      },
      getImageDataUrl() {
        return "";
      },
      clear() {},
      destroy() {},
    };
  }

  const listeners = [];
  const addListener = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  };

  const state = {
    isDrawing: false,
    lastCell: null,
    brushStep: DEFAULT_BRUSH_STEP,
    brushSize: BRUSH_SIZE_STEPS[DEFAULT_BRUSH_STEP],
    brushColor: DEFAULT_BRUSH_COLOR,
    isEraser: false,
    isDesktopPrimaryAction: window.innerWidth > DESKTOP_BREAKPOINT,
    imageReady: false,
    imageRect: { x: 0, y: 0, width: canvas.width, height: canvas.height },
    hasDrawings: false,
  };

  const setActiveSwatch = (nextActive) => {
    swatches.forEach((swatch) => {
      swatch.classList.toggle("is-active", swatch === nextActive);
    });
  };

  const syncBrushSize = () => {
    const nextStep = clampBrushStep(Number(brushInput.value));
    state.brushStep = nextStep;
    state.brushSize = BRUSH_SIZE_STEPS[nextStep];
    brushInput.value = String(nextStep);
    brushInput.setAttribute("aria-valuetext", BRUSH_STEP_LABELS[nextStep]);
    brushSlider.style.setProperty("--designer-slider-progress", BRUSH_PROGRESS_STEPS[nextStep]);
    brushSlider.dataset.brushStep = String(nextStep);
  };

  const syncToolToggle = () => {
    toolToggle.classList.toggle("is-eraser", !state.isDesktopPrimaryAction && state.isEraser);
    toolToggle.dataset.mode = state.isDesktopPrimaryAction ? "fill" : "eraser";
    toolToggle.setAttribute(
      "aria-pressed",
      state.isDesktopPrimaryAction ? "false" : String(state.isEraser)
    );
    toolToggle.textContent = state.isDesktopPrimaryAction ? "Залить" : "Ластик";
  };

  const syncPrimaryActionMode = () => {
    state.isDesktopPrimaryAction = window.innerWidth > DESKTOP_BREAKPOINT;
    if (state.isDesktopPrimaryAction) {
      state.isEraser = false;
    }
    syncToolToggle();
  };

  const rebuildMask = () => {
    maskCtx.clearRect(0, 0, maskLayer.width, maskLayer.height);
    sourceCtx.clearRect(0, 0, sourceLayer.width, sourceLayer.height);
    if (!state.imageReady) return;

    state.imageRect = getRoundedRect(
      getContainRect(canvas.width, canvas.height, baseImage.naturalWidth, baseImage.naturalHeight)
    );

    sourceCtx.drawImage(
      baseImage,
      state.imageRect.x,
      state.imageRect.y,
      state.imageRect.width,
      state.imageRect.height
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

  const applyMaskToPaintLayer = () => {
    if (!state.imageReady) return;
    paintCtx.save();
    paintCtx.globalCompositeOperation = "destination-in";
    paintCtx.drawImage(maskLayer, 0, 0);
    paintCtx.restore();
  };

  const redraw = () => {
    displayCtx.clearRect(0, 0, canvas.width, canvas.height);
    displayCtx.drawImage(paintLayer, 0, 0);

    if (!state.imageReady) return;

    displayCtx.globalCompositeOperation = "destination-in";
    displayCtx.drawImage(maskLayer, 0, 0);
    displayCtx.globalCompositeOperation = "source-over";
  };

  const drawCells = (cells) => {
    if (!cells.length) return;

    paintCtx.save();

    if (state.isEraser) {
      paintCtx.globalCompositeOperation = "destination-out";
      paintCtx.fillStyle = "#000000";
    } else {
      paintCtx.globalCompositeOperation = "source-over";
      paintCtx.fillStyle = state.brushColor;
      state.hasDrawings = true;
    }

    cells.forEach((cell) => {
      const rect = getPixelRect(cell, canvas, state.brushSize);
      paintCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
    });

    paintCtx.restore();
    redraw();
  };

  const getEventCell = (event) => {
    const point = getEventPoint(event, canvas);
    return getPixelCell(point, canvas, state.brushSize);
  };

  const startDrawing = (event) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.isDrawing = true;
    state.lastCell = getEventCell(event);
    drawCells([state.lastCell]);
  };

  const draw = (event) => {
    if (!state.isDrawing || !state.lastCell) return;
    event.preventDefault();
    const nextCell = getEventCell(event);

    if (nextCell.column === state.lastCell.column && nextCell.row === state.lastCell.row) {
      return;
    }

    drawCells(getCellsOnPath(state.lastCell, nextCell));
    state.lastCell = nextCell;
  };

  const stopDrawing = (event) => {
    if (!state.isDrawing) return;
    if (event && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.isDrawing = false;
    state.lastCell = null;
  };

  const clearCanvas = () => {
    paintCtx.clearRect(0, 0, paintLayer.width, paintLayer.height);
    state.hasDrawings = false;
    redraw();
  };

  const fillCanvas = () => {
    paintCtx.save();
    paintCtx.clearRect(0, 0, paintLayer.width, paintLayer.height);
    paintCtx.globalCompositeOperation = "source-over";
    paintCtx.fillStyle = state.brushColor;
    paintCtx.fillRect(0, 0, paintLayer.width, paintLayer.height);

    applyMaskToPaintLayer();
    paintCtx.restore();
    state.hasDrawings = true;
    state.isEraser = false;
    redraw();
    syncToolToggle();
  };

  const buildExportDataUrl = () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return "";

    if (state.imageReady) {
      const maskedPaintCanvas = document.createElement("canvas");
      maskedPaintCanvas.width = canvas.width;
      maskedPaintCanvas.height = canvas.height;
      const maskedPaintCtx = maskedPaintCanvas.getContext("2d");
      if (!maskedPaintCtx) return "";

      maskedPaintCtx.drawImage(paintLayer, 0, 0);
      maskedPaintCtx.globalCompositeOperation = "destination-in";
      maskedPaintCtx.drawImage(maskLayer, 0, 0);
      maskedPaintCtx.globalCompositeOperation = "source-over";

      exportCtx.drawImage(
        baseImage,
        state.imageRect.x,
        state.imageRect.y,
        state.imageRect.width,
        state.imageRect.height
      );
      exportCtx.drawImage(maskedPaintCanvas, 0, 0);
    } else {
      exportCtx.drawImage(paintLayer, 0, 0);
    }

    return exportCanvas.toDataURL("image/png");
  };

  swatches.forEach((swatch) => {
    addListener(swatch, "click", () => {
      const nextColor = swatch.getAttribute("data-sock-color");
      if (!nextColor) return;
      state.brushColor = nextColor;
      state.isEraser = false;
      setActiveSwatch(swatch);
      syncToolToggle();
    });
  });

  addListener(brushInput, "input", syncBrushSize);
  addListener(window, "resize", syncPrimaryActionMode);
  addListener(toolToggle, "click", () => {
    if (state.isDesktopPrimaryAction) {
      fillCanvas();
      return;
    }

    state.isEraser = !state.isEraser;
    syncToolToggle();
  });
  addListener(clearButton, "click", clearCanvas);

  addListener(canvas, "pointerdown", startDrawing);
  addListener(canvas, "pointermove", draw);
  addListener(canvas, "pointerup", stopDrawing);
  addListener(canvas, "pointercancel", stopDrawing);
  addListener(canvas, "lostpointercapture", stopDrawing);

  const onImageReady = () => {
    state.imageReady = true;
    rebuildMask();
    if (state.hasDrawings) {
      applyMaskToPaintLayer();
    }
    redraw();
  };

  if (baseImage.complete && baseImage.naturalWidth > 0) {
    onImageReady();
  } else {
    addListener(baseImage, "load", onImageReady, { once: true });
    addListener(baseImage, "error", redraw, { once: true });
  }

  const initialSwatch =
    swatches.find((swatch) => swatch.classList.contains("is-active")) ?? swatches[0];
  const initialColor = initialSwatch.getAttribute("data-sock-color");
  if (initialColor) state.brushColor = initialColor;

  brushInput.value = String(DEFAULT_BRUSH_STEP);
  setActiveSwatch(initialSwatch);
  syncBrushSize();
  syncPrimaryActionMode();
  redraw();

  return {
    getSnapshot() {
      return {
        hasDrawings: state.hasDrawings,
        imageDataUrl: buildExportDataUrl(),
        brushSize: state.brushSize,
        brushColor: state.brushColor,
        isEraser: state.isEraser,
      };
    },
    getImageDataUrl() {
      return buildExportDataUrl();
    },
    clear: clearCanvas,
    destroy() {
      while (listeners.length) {
        const remove = listeners.pop();
        remove?.();
      }
      stopDrawing();
    },
  };
}
