import * as THREE from "three";
import { applyToyMaterials } from "./object-utils.js";

export const PLATFORM_TOPS = {
  stepA: 1.15,
  frontLeftRun: 1.95,
  frontCenter: 2.2,
  stepB: 2.8,
  midCenter: 3.35,
  shelfLeftLow: 3.55,
  shelfLeftHigh: 5.2,
  loftLeft: 5.75,
  topCenter: 5.55,
  centerLedge: 6.25,
  stepC: 1.45,
  rightMid: 2.6,
  shelfRightLow: 3.6,
  shelfRightHigh: 5.05,
  rightBalcony: 4.55,
  backRightDeck: 6.05,
};

const DOC_DISPLAY_HEIGHT = 0.12;
const ITEM_DISPLAY_HEIGHT = 0.28;

export const DISPLAY_STANDS = {
  docs: {
    "care-temp": {
      x: -20.4,
      z: 13.7,
      topY: DOC_DISPLAY_HEIGHT,
      height: DOC_DISPLAY_HEIGHT,
      width: 2.2,
      depth: 1.5,
      rotation: Math.PI * 0.08,
      radius: 1.4,
    },
    "care-sort": {
      x: -7.8,
      z: 5.6,
      topY: PLATFORM_TOPS.midCenter + DOC_DISPLAY_HEIGHT,
      height: DOC_DISPLAY_HEIGHT,
      width: 2.1,
      depth: 1.45,
      rotation: Math.PI * -0.14,
      radius: 1.35,
    },
    "history-denim": {
      x: -23.15,
      z: -13.55,
      topY: PLATFORM_TOPS.loftLeft + DOC_DISPLAY_HEIGHT,
      height: DOC_DISPLAY_HEIGHT,
      width: 1.9,
      depth: 1.35,
      rotation: Math.PI * -0.11,
      radius: 1.25,
    },
    "history-nylon": {
      x: 21.85,
      z: -8.35,
      topY: PLATFORM_TOPS.rightBalcony + DOC_DISPLAY_HEIGHT,
      height: DOC_DISPLAY_HEIGHT,
      width: 1.9,
      depth: 1.35,
      rotation: Math.PI * 0.1,
      radius: 1.3,
    },
    "note-missing": {
      x: 5.15,
      z: -10.45,
      topY: PLATFORM_TOPS.centerLedge + DOC_DISPLAY_HEIGHT,
      height: DOC_DISPLAY_HEIGHT,
      width: 2.05,
      depth: 1.4,
      rotation: Math.PI * -0.06,
      radius: 1.25,
    },
  },
  items: {
    vans: {
      x: -21.6,
      z: -12.55,
      topY: PLATFORM_TOPS.loftLeft + ITEM_DISPLAY_HEIGHT,
      height: ITEM_DISPLAY_HEIGHT,
      width: 2.2,
      depth: 1.9,
      rotation: 0,
    },
    ushanka: {
      x: 23.8,
      z: -12.7,
      topY: PLATFORM_TOPS.backRightDeck + ITEM_DISPLAY_HEIGHT,
      height: ITEM_DISPLAY_HEIGHT,
      width: 2,
      depth: 1.7,
      rotation: 0,
    },
    trasher_old: {
      x: 1.4,
      z: -3.7,
      topY: PLATFORM_TOPS.topCenter + ITEM_DISPLAY_HEIGHT,
      height: ITEM_DISPLAY_HEIGHT,
      width: 2.4,
      depth: 2,
      rotation: 0,
    },
    uggi: {
      x: 24.1,
      z: -8.0,
      topY: PLATFORM_TOPS.rightBalcony + ITEM_DISPLAY_HEIGHT,
      height: ITEM_DISPLAY_HEIGHT,
      width: 2.1,
      depth: 1.8,
      rotation: 0,
    },
    jeans: {
      x: 8.15,
      z: -10.2,
      topY: PLATFORM_TOPS.centerLedge + ITEM_DISPLAY_HEIGHT,
      height: ITEM_DISPLAY_HEIGHT,
      width: 2.1,
      depth: 1.7,
      rotation: 0,
    },
    sumka: {
      x: -2.4,
      z: 13.4,
      topY: PLATFORM_TOPS.frontCenter + ITEM_DISPLAY_HEIGHT,
      height: ITEM_DISPLAY_HEIGHT,
      width: 1.9,
      depth: 1.7,
      rotation: 0,
    },
  },
};

export function buildLaundryRoom({
  scene,
  isLowPower,
  addBoxMesh,
  world,
  platformTops = PLATFORM_TOPS,
}) {
  const materials = {
    shellBounds: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    frameDark: new THREE.MeshStandardMaterial({
      color: 0x202735,
      roughness: 0.54,
      metalness: 0.18,
    }),
    blockYellow: new THREE.MeshStandardMaterial({
      color: 0xffe600,
      roughness: 0.48,
      metalness: 0.05,
      emissive: 0xffd500,
      emissiveIntensity: 0.05,
    }),
    blockGreen: new THREE.MeshStandardMaterial({
      color: 0xb4ff3b,
      roughness: 0.5,
      metalness: 0.05,
      emissive: 0x8ad700,
      emissiveIntensity: 0.05,
    }),
    blockPink: new THREE.MeshStandardMaterial({
      color: 0xfe4aae,
      roughness: 0.48,
      metalness: 0.06,
      emissive: 0xf81c8e,
      emissiveIntensity: 0.06,
    }),
    blockPurple: new THREE.MeshStandardMaterial({
      color: 0x7e5bff,
      roughness: 0.52,
      metalness: 0.05,
      emissive: 0x4327b5,
      emissiveIntensity: 0.08,
    }),
    stripeWhite: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.02,
    }),
    stripePink: new THREE.MeshStandardMaterial({
      color: 0xfe4aae,
      roughness: 0.55,
      metalness: 0.04,
      emissive: 0xd81d79,
      emissiveIntensity: 0.05,
    }),
    stripeGreen: new THREE.MeshStandardMaterial({
      color: 0xb4ff3b,
      roughness: 0.55,
      metalness: 0.04,
      emissive: 0x71bb00,
      emissiveIntensity: 0.05,
    }),
    displayStand: new THREE.MeshStandardMaterial({
      color: 0xf7f4ea,
      roughness: 0.86,
      metalness: 0.01,
    }),
  };

  const makePlatform = ({ x, z, width, depth, topY, material }) =>
    addBoxMesh({
      x,
      y: topY * 0.5,
      z,
      width,
      height: topY,
      depth,
      material,
      collision: { pad: -0.04, preserveMinY: true },
    });

  const makeDisplayStand = ({ x, z, width, depth, topY, height, material }) =>
    addBoxMesh({
      x,
      y: topY - height * 0.5,
      z,
      width,
      height,
      depth,
      material,
      collision: null,
    });

  addBoxMesh({
    x: 0,
    y: 7.4,
    z: -18.8,
    width: 62,
    height: 14.8,
    depth: 0.8,
    material: materials.shellBounds,
    collision: { pad: 0, preserveMinY: false },
  });

  addBoxMesh({
    x: -30.2,
    y: 6.9,
    z: 0.1,
    width: 0.8,
    height: 13.8,
    depth: 42.4,
    material: materials.shellBounds,
    collision: { pad: 0.02, preserveMinY: false },
  });

  addBoxMesh({
    x: 30.2,
    y: 6.9,
    z: 0.1,
    width: 0.8,
    height: 13.8,
    depth: 42.4,
    material: materials.shellBounds,
    collision: { pad: 0.02, preserveMinY: false },
  });

  addBoxMesh({
    x: 0,
    y: 0.35,
    z: 20.9,
    width: 62,
    height: 0.7,
    depth: 1,
    material: materials.shellBounds,
    collision: { pad: 0.02, preserveMinY: false, maxY: 0.7 },
  });

  addBoxMesh({
    x: 0,
    y: 13.5,
    z: 0,
    width: 61,
    height: 0.25,
    depth: 42,
    material: materials.shellBounds,
  });

  // Broad, simple blocks to keep the route readable and spacious.
  makePlatform({
    x: -19.6,
    z: 12.3,
    width: 4.2,
    depth: 4.2,
    topY: platformTops.stepA,
    material: materials.blockPurple,
  });

  makePlatform({
    x: -12.6,
    z: 13.8,
    width: 5.4,
    depth: 3.6,
    topY: platformTops.frontLeftRun,
    material: materials.blockGreen,
  });

  makePlatform({
    x: -2.4,
    z: 13.4,
    width: 6.2,
    depth: 4,
    topY: platformTops.frontCenter,
    material: materials.blockYellow,
  });

  makePlatform({
    x: -17.0,
    z: 5.2,
    width: 5.6,
    depth: 5.2,
    topY: platformTops.stepB,
    material: materials.blockPink,
  });

  makePlatform({
    x: -6.6,
    z: 6.0,
    width: 5.4,
    depth: 3.8,
    topY: platformTops.midCenter,
    material: materials.blockPink,
  });

  makePlatform({
    x: -19.8,
    z: -1.3,
    width: 7.4,
    depth: 4,
    topY: platformTops.shelfLeftLow,
    material: materials.blockYellow,
  });

  makePlatform({
    x: -20.4,
    z: -7.5,
    width: 6.2,
    depth: 3.4,
    topY: platformTops.shelfLeftHigh,
    material: materials.blockPink,
  });

  makePlatform({
    x: -22.4,
    z: -13.4,
    width: 5.4,
    depth: 3.2,
    topY: platformTops.loftLeft,
    material: materials.blockYellow,
  });

  makePlatform({
    x: 1.2,
    z: -3.6,
    width: 8.2,
    depth: 4.6,
    topY: platformTops.topCenter,
    material: materials.blockPurple,
  });

  makePlatform({
    x: 6.6,
    z: -10.4,
    width: 7,
    depth: 3.6,
    topY: platformTops.centerLedge,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 16.6,
    z: 11.5,
    width: 4,
    depth: 4,
    topY: platformTops.stepC,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 21.2,
    z: 6.3,
    width: 4.6,
    depth: 3.8,
    topY: platformTops.rightMid,
    material: materials.blockYellow,
  });

  makePlatform({
    x: 17.8,
    z: 1.6,
    width: 7.2,
    depth: 4.2,
    topY: platformTops.shelfRightLow,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 19.2,
    z: -4.2,
    width: 6.2,
    depth: 3.4,
    topY: platformTops.shelfRightHigh,
    material: materials.blockYellow,
  });

  makePlatform({
    x: 23.0,
    z: -8.3,
    width: 5,
    depth: 3.2,
    topY: platformTops.rightBalcony,
    material: materials.blockPink,
  });

  makePlatform({
    x: 23.8,
    z: -12.8,
    width: 5.8,
    depth: 3.6,
    topY: platformTops.backRightDeck,
    material: materials.blockPurple,
  });

  makePlatform({
    x: 6.2,
    z: 10.1,
    width: 6.2,
    depth: 3.6,
    topY: 1.3,
    material: materials.blockGreen,
  });

  Object.values(DISPLAY_STANDS.docs).forEach((stand) => {
    makeDisplayStand({
      x: stand.x,
      z: stand.z,
      width: stand.width,
      depth: stand.depth,
      topY: stand.topY,
      height: stand.height,
      material: materials.displayStand,
    });
  });

  Object.values(DISPLAY_STANDS.items).forEach((stand) => {
    makeDisplayStand({
      x: stand.x,
      z: stand.z,
      width: stand.width,
      depth: stand.depth,
      topY: stand.topY,
      height: stand.height,
      material: materials.displayStand,
    });
  });

  if (!isLowPower) {
    const accentPink = new THREE.PointLight(0xfe4aae, 0.28, 11, 2);
    accentPink.position.set(-11.4, 7.4, -8.2);

    const accentGreen = new THREE.PointLight(0xb4ff3b, 0.24, 11, 2);
    accentGreen.position.set(11.4, 6.8, -7.5);

    const accentYellow = new THREE.PointLight(0xffe600, 0.2, 12, 2);
    accentYellow.position.set(1.5, 5.4, 4.8);

    const accentBlue = new THREE.PointLight(0xa8e6ff, 0.18, 12, 2);
    accentBlue.position.set(1.2, 6.2, -11.8);

    scene.add(accentPink, accentGreen, accentYellow, accentBlue);
  }
}
