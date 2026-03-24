import * as THREE from "three";
import { applyToyMaterials, createFrontInteractionAnchor } from "./object-utils.js";

export const PLATFORM_TOPS = {
  stepA: 1.15,
  frontLeftRun: 1.95,
  frontCenter: 2.2,
  stepB: 2.8,
  midCenter: 3.35,
  shelfLeftLow: 3.55,
  shelfLeftHigh: 5.2,
  bridgeMid: 4.1,
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

export function buildLaundryRoom({
  scene,
  isLowPower,
  addBoxMesh,
  world,
  platformTops = PLATFORM_TOPS,
}) {
  const roomMeta = { mapSwitches: [] };
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

  const makeConsoleSwitch = ({
    x,
    z,
    platformY,
    label,
    description,
    activeText,
    inactiveText,
    targets = [],
    activeColor = 0xb4ff3b,
    inactiveColor = 0xfe4aae,
    startsActive = false,
  }) => {
    const pedestalHeight = 0.82;
    const pedestal = addBoxMesh({
      x,
      y: platformY + pedestalHeight * 0.5,
      z,
      width: 0.9,
      height: pedestalHeight,
      depth: 0.9,
      material: materials.frameDark,
      collision: { pad: -0.08, preserveMinY: true, maxY: platformY + pedestalHeight },
    });

    const buttonMaterial = new THREE.MeshStandardMaterial({
      color: startsActive ? activeColor : inactiveColor,
      roughness: 0.42,
      metalness: 0.08,
      emissive: startsActive ? activeColor : inactiveColor,
      emissiveIntensity: startsActive ? 0.16 : 0.08,
    });

    const button = addBoxMesh({
      x,
      y: platformY + pedestalHeight + 0.19,
      z,
      width: 0.74,
      height: 0.22,
      depth: 0.74,
      material: buttonMaterial,
      collision: { pad: -0.14, preserveMinY: true, maxY: platformY + pedestalHeight + 0.22 },
    });

    const anchor = createFrontInteractionAnchor(button, {
      frontInset: 0.22,
      heightFromBase: 0.24,
    });

    const state = { active: false };
    const setActive = (active) => {
      state.active = active;
      button.material.color.setHex(active ? activeColor : inactiveColor);
      button.material.emissive.setHex(active ? activeColor : inactiveColor);
      button.material.emissiveIntensity = active ? 0.16 : 0.08;
      targets.forEach((mesh) => {
        if (!mesh) return;
        mesh.visible = active;
      });
    };

    setActive(startsActive);

    roomMeta.mapSwitches.push({
      mesh: pedestal,
      interactionTarget: anchor,
      label: () => label,
      description: () => description,
      onInteract: () => {
        setActive(!state.active);
        return state.active;
      },
      activeText,
      inactiveText,
    });
  };

  addBoxMesh({
    x: 0,
    y: 6.8,
    z: -15.2,
    width: 50.4,
    height: 13.6,
    depth: 0.8,
    material: materials.shellBounds,
    collision: { pad: 0, preserveMinY: false },
  });

  addBoxMesh({
    x: -24.4,
    y: 6.4,
    z: -1,
    width: 0.8,
    height: 12.8,
    depth: 34.8,
    material: materials.shellBounds,
    collision: { pad: 0.02, preserveMinY: false },
  });

  addBoxMesh({
    x: 24.4,
    y: 6.4,
    z: -1,
    width: 0.8,
    height: 12.8,
    depth: 34.8,
    material: materials.shellBounds,
    collision: { pad: 0.02, preserveMinY: false },
  });

  addBoxMesh({
    x: 0,
    y: 0.35,
    z: 16.2,
    width: 50.4,
    height: 0.7,
    depth: 1,
    material: materials.shellBounds,
    collision: { pad: 0.02, preserveMinY: false, maxY: 0.7 },
  });

  addBoxMesh({
    x: 0,
    y: 12.4,
    z: -1,
    width: 49.4,
    height: 0.25,
    depth: 34,
    material: materials.shellBounds,
  });

  [
    { x: -11.2, y: 11.5, z: -6.2, r: Math.PI / 2, len: 12.4 },
    { x: 13.4, y: 11.1, z: -4.8, r: Math.PI / 2, len: 10.8 },
    { x: 0.8, y: 10.9, z: -10.4, r: Math.PI / 2, len: 8.8 },
  ].forEach((pipe) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, pipe.len, 12),
      materials.frameDark
    );
    mesh.position.set(pipe.x, pipe.y, pipe.z);
    mesh.rotation.z = pipe.r;
    applyToyMaterials(mesh);
    scene.add(mesh);
  });

  [
    { x: 0, z: 4.8, w: 32, d: 0.35, m: materials.stripeWhite },
    { x: 0, z: 3.7, w: 32, d: 0.2, m: materials.stripePink },
    { x: 0, z: 2.95, w: 32, d: 0.18, m: materials.stripeGreen },
    { x: -13.8, z: 11.5, w: 8.4, d: 0.25, m: materials.stripePink },
    { x: 13.8, z: 11.5, w: 8.4, d: 0.25, m: materials.stripeGreen },
    { x: 0.6, z: -10.8, w: 10.8, d: 0.18, m: materials.stripeWhite },
  ].forEach((stripe) => {
    addBoxMesh({
      x: stripe.x,
      y: 0.03,
      z: stripe.z,
      width: stripe.w,
      height: 0.04,
      depth: stripe.d,
      material: stripe.m,
    });
  });

  addBoxMesh({
    x: -12.2,
    y: 8.4,
    z: -14.45,
    width: 5.8,
    height: 1.4,
    depth: 0.06,
    material: new THREE.MeshStandardMaterial({
      color: 0xfee7f4,
      roughness: 0.42,
      metalness: 0.06,
      emissive: 0xfe4aae,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.86,
    }),
  });

  addBoxMesh({
    x: 12.3,
    y: 7.7,
    z: -14.45,
    width: 6.2,
    height: 1.35,
    depth: 0.06,
    material: new THREE.MeshStandardMaterial({
      color: 0xf2ffd8,
      roughness: 0.42,
      metalness: 0.06,
      emissive: 0xb4ff3b,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.86,
    }),
  });

  // Broad, simple blocks to keep the route readable and spacious.
  makePlatform({
    x: -13.0,
    z: 7.8,
    width: 4.2,
    depth: 4.2,
    topY: platformTops.stepA,
    material: materials.blockPurple,
  });

  makePlatform({
    x: -6.5,
    z: 8.8,
    width: 4.8,
    depth: 3.2,
    topY: platformTops.frontLeftRun,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 0.4,
    z: 9.4,
    width: 5.4,
    depth: 4,
    topY: platformTops.frontCenter,
    material: materials.blockYellow,
  });

  makePlatform({
    x: -9.6,
    z: 3.2,
    width: 5.1,
    depth: 4.8,
    topY: platformTops.stepB,
    material: materials.blockPink,
  });

  makePlatform({
    x: 0.8,
    z: 4.7,
    width: 4.8,
    depth: 3.2,
    topY: platformTops.midCenter,
    material: materials.blockPink,
  });

  makePlatform({
    x: -11.2,
    z: -1.2,
    width: 6.8,
    depth: 3.6,
    topY: platformTops.shelfLeftLow,
    material: materials.blockYellow,
  });

  makePlatform({
    x: -11.2,
    z: -6.0,
    width: 5.8,
    depth: 3.2,
    topY: platformTops.shelfLeftHigh,
    material: materials.blockPink,
  });

  makePlatform({
    x: -4.2,
    z: -4.4,
    width: 5.6,
    depth: 2.8,
    topY: platformTops.bridgeMid,
    material: materials.blockPurple,
  });

  makePlatform({
    x: -15.2,
    z: -10.2,
    width: 4.8,
    depth: 2.8,
    topY: platformTops.loftLeft,
    material: materials.blockYellow,
  });

  makePlatform({
    x: 4.8,
    z: -5.7,
    width: 10.6,
    depth: 4.4,
    topY: platformTops.topCenter,
    material: materials.blockPurple,
  });

  makePlatform({
    x: 0.8,
    z: -12.1,
    width: 6,
    depth: 2.2,
    topY: platformTops.centerLedge,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 12.0,
    z: 7.5,
    width: 4,
    depth: 4,
    topY: platformTops.stepC,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 15.5,
    z: 4.4,
    width: 4.2,
    depth: 3.4,
    topY: platformTops.rightMid,
    material: materials.blockYellow,
  });

  makePlatform({
    x: 11.0,
    z: 1.9,
    width: 6.4,
    depth: 3.8,
    topY: platformTops.shelfRightLow,
    material: materials.blockGreen,
  });

  makePlatform({
    x: 11.1,
    z: -2.8,
    width: 5.8,
    depth: 3.2,
    topY: platformTops.shelfRightHigh,
    material: materials.blockYellow,
  });

  makePlatform({
    x: 16.0,
    z: -4.2,
    width: 4.6,
    depth: 3,
    topY: platformTops.rightBalcony,
    material: materials.blockPink,
  });

  makePlatform({
    x: 15.6,
    z: -9.0,
    width: 5.2,
    depth: 3,
    topY: platformTops.backRightDeck,
    material: materials.blockPurple,
  });

  makePlatform({
    x: -0.4,
    z: 7.0,
    width: 5.8,
    depth: 3.2,
    topY: 1.3,
    material: materials.blockGreen,
  });

  const rainbowBridge = addBoxMesh({
    x: 10.1,
    y: 5.15 - 0.18,
    z: -7.2,
    width: 8.4,
    height: 0.36,
    depth: 1.2,
    material: materials.stripeWhite,
    collision: { pad: -0.06, preserveMinY: true },
  });

  const serviceBridge = addBoxMesh({
    x: -2.1,
    y: 4.95 - 0.18,
    z: -9.9,
    width: 8.4,
    height: 0.36,
    depth: 1.2,
    material: materials.stripeGreen,
    collision: { pad: -0.06, preserveMinY: true },
  });

  makeConsoleSwitch({
    x: 1.9,
    z: 7.6,
    platformY: platformTops.frontCenter,
    label: "переключить радужный мост",
    description: "Откроет короткий путь к правой верхней секции.",
    activeText: "Радужный мост выдвинулся",
    inactiveText: "Радужный мост убран",
    targets: [rainbowBridge],
  });

  makeConsoleSwitch({
    x: -9.7,
    z: -4.7,
    platformY: platformTops.shelfLeftHigh,
    label: "открыть сервисный проход",
    description: "Соединит левую полку с центральным верхним маршрутом.",
    activeText: "Сервисный проход открыт",
    inactiveText: "Сервисный проход закрыт",
    targets: [serviceBridge],
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

  return roomMeta;
}
