export function isLowPowerDevice() {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  const smallViewport = window.matchMedia?.("(max-width: 900px)")?.matches;
  const lowMemory =
    typeof navigator !== "undefined" &&
    navigator.deviceMemory &&
    navigator.deviceMemory <= 4;

  return Boolean(coarsePointer || smallViewport || lowMemory);
}
