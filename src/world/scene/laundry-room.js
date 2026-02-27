import * as THREE from "three";
import { applyToyMaterials } from "./object-utils.js";

export const PLATFORM_TOPS = {
  stepA: 1.05,
  stepB: 2.35,
  shelfLeftLow: 3.2,
  shelfLeftHigh: 5.6,
  bridgeMid: 6.25,
  topCenter: 7.55,
  stepC: 4.15,
  shelfRightLow: 3.4,
  shelfRightHigh: 5.8,
};

export function buildLaundryRoom({ scene, isLowPower, addBoxMesh, platformTops = PLATFORM_TOPS }) {
  const materials = {
    wallBack: new THREE.MeshStandardMaterial({
      color: 0xf3fbff,
      roughness: 0.78,
      metalness: 0.04,
      emissive: 0xa8e6ff,
      emissiveIntensity: 0.05,
    }),
    wallSide: new THREE.MeshStandardMaterial({
      color: 0xe9f4ff,
      roughness: 0.8,
      metalness: 0.03,
      transparent: true,
      opacity: 0.78,
    }),
    frameDark: new THREE.MeshStandardMaterial({
      color: 0x202735,
      roughness: 0.52,
      metalness: 0.18,
    }),
    shelfYellow: new THREE.MeshStandardMaterial({
      color: 0xffe600,
      roughness: 0.5,
      metalness: 0.06,
      emissive: 0xffd500,
      emissiveIntensity: 0.05,
    }),
    shelfGreen: new THREE.MeshStandardMaterial({
      color: 0xb4ff3b,
      roughness: 0.52,
      metalness: 0.05,
      emissive: 0x8ad700,
      emissiveIntensity: 0.05,
    }),
    shelfPink: new THREE.MeshStandardMaterial({
      color: 0xfe4aae,
      roughness: 0.5,
      metalness: 0.07,
      emissive: 0xf81c8e,
      emissiveIntensity: 0.06,
    }),
    shelfPurple: new THREE.MeshStandardMaterial({
      color: 0x7e5bff,
      roughness: 0.52,
      metalness: 0.06,
      emissive: 0x4327b5,
      emissiveIntensity: 0.08,
    }),
    stripeWhite: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.02,
    }),
    stripePink: new THREE.MeshStandardMaterial({
      color: 0xfe4aae,
      roughness: 0.55,
      metalness: 0.04,
      emissive: 0xd81d79,
      emissiveIntensity: 0.06,
    }),
    stripeGreen: new THREE.MeshStandardMaterial({
      color: 0xb4ff3b,
      roughness: 0.55,
      metalness: 0.04,
      emissive: 0x71bb00,
      emissiveIntensity: 0.06,
    }),
  };

  const makeShelf = ({
    x,
    z,
    width,
    depth,
    topY,
    colorMaterial,
    postMaterial = materials.frameDark,
    postInset = 0.5,
  }) => {
    const thickness = 0.34;
    const slabY = topY - thickness * 0.5;

    const slab = addBoxMesh({
      x,
      y: slabY,
      z,
      width,
      height: thickness,
      depth,
      material: colorMaterial,
      collision: { pad: -0.04, preserveMinY: true },
    });

    const supportHeight = Math.max(0.4, slabY - 0.06);
    const postY = supportHeight * 0.5;
    const postW = 0.22;
    const postD = 0.22;
    const xOffset = Math.max(0.7, width * 0.5 - postInset);
    const zOffset = Math.max(0.45, depth * 0.5 - postInset * 0.7);

    const postPositions = [
      [x - xOffset, postY, z - zOffset],
      [x + xOffset, postY, z - zOffset],
      [x - xOffset, postY, z + zOffset],
      [x + xOffset, postY, z + zOffset],
    ];

    postPositions.forEach(([px, py, pz]) => {
      addBoxMesh({
        x: px,
        y: py,
        z: pz,
        width: postW,
        height: supportHeight,
        depth: postD,
        material: postMaterial,
      });
    });

    addBoxMesh({
      x,
      y: slabY - 0.23,
      z: z - depth * 0.5 + 0.12,
      width: width - 0.4,
      height: 0.12,
      depth: 0.12,
      material: postMaterial,
    });

    return slab;
  };

  const makeStepBlock = ({ x, z, width, depth, topY, material }) =>
    addBoxMesh({
      x,
      y: topY * 0.5,
      z,
      width,
      height: topY,
      depth,
      material,
      collision: { pad: -0.03, preserveMinY: true },
    });

  addBoxMesh({
    x: 0,
    y: 6.8,
    z: -15.1,
    width: 34,
    height: 13.6,
    depth: 0.8,
    material: materials.wallBack,
    collision: { pad: 0, preserveMinY: false },
  });

  addBoxMesh({
    x: -16.2,
    y: 6.4,
    z: -1.0,
    width: 0.8,
    height: 12.8,
    depth: 28.2,
    material: materials.wallSide,
    collision: { pad: 0.02, preserveMinY: false },
  });

  addBoxMesh({
    x: 16.2,
    y: 6.4,
    z: -1.0,
    width: 0.8,
    height: 12.8,
    depth: 28.2,
    material: materials.wallSide,
    collision: { pad: 0.02, preserveMinY: false },
  });

  addBoxMesh({
    x: 0,
    y: 0.35,
    z: 12.9,
    width: 34,
    height: 0.7,
    depth: 1.0,
    material: materials.frameDark,
    collision: { pad: 0.02, preserveMinY: false, maxY: 0.7 },
  });

  addBoxMesh({
    x: 0,
    y: 12.4,
    z: -1.4,
    width: 33.2,
    height: 0.25,
    depth: 27.6,
    material: new THREE.MeshStandardMaterial({
      color: 0xf8fdff,
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      opacity: 0.35,
    }),
  });

  const ceilingBarMaterial = materials.frameDark;
  [
    { x: -9.8, y: 11.5, z: -5.4, r: Math.PI / 2, len: 8.5 },
    { x: 9.8, y: 11.1, z: -3.6, r: Math.PI / 2, len: 7.0 },
  ].forEach((pipe) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, pipe.len, 12),
      ceilingBarMaterial
    );
    mesh.position.set(pipe.x, pipe.y, pipe.z);
    mesh.rotation.z = pipe.r;
    applyToyMaterials(mesh);
    scene.add(mesh);
  });

  const floorStripeY = 0.03;
  [
    { x: 0, z: 3.7, w: 20, d: 0.35, m: materials.stripeWhite },
    { x: 0, z: 2.7, w: 20, d: 0.2, m: materials.stripePink },
    { x: 0, z: 1.95, w: 20, d: 0.18, m: materials.stripeGreen },
    { x: -8.6, z: 8.7, w: 5.8, d: 0.25, m: materials.stripePink },
    { x: 8.7, z: 8.7, w: 5.8, d: 0.25, m: materials.stripeGreen },
  ].forEach((stripe) => {
    addBoxMesh({
      x: stripe.x,
      y: floorStripeY,
      z: stripe.z,
      width: stripe.w,
      height: 0.04,
      depth: stripe.d,
      material: stripe.m,
    });
  });

  const signPanelMaterialPink = new THREE.MeshStandardMaterial({
    color: 0xfee7f4,
    roughness: 0.4,
    metalness: 0.06,
    emissive: 0xfe4aae,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.85,
  });

  const signPanelMaterialGreen = new THREE.MeshStandardMaterial({
    color: 0xf2ffd8,
    roughness: 0.4,
    metalness: 0.06,
    emissive: 0xb4ff3b,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.85,
  });

  addBoxMesh({
    x: -11.4,
    y: 8.6,
    z: -14.45,
    width: 5.2,
    height: 1.4,
    depth: 0.06,
    material: signPanelMaterialPink,
  });

  addBoxMesh({
    x: 11.4,
    y: 7.9,
    z: -14.45,
    width: 5.6,
    height: 1.35,
    depth: 0.06,
    material: signPanelMaterialGreen,
  });

  makeStepBlock({
    x: -4.8,
    z: 6.2,
    width: 2.8,
    depth: 2.8,
    topY: platformTops.stepA,
    material: materials.shelfPurple,
  });

  makeStepBlock({
    x: -2.2,
    z: 4.2,
    width: 2.4,
    depth: 2.4,
    topY: platformTops.stepB,
    material: materials.shelfPink,
  });

  makeStepBlock({
    x: 1.3,
    z: 2.1,
    width: 2.6,
    depth: 2.4,
    topY: platformTops.stepC,
    material: materials.shelfGreen,
  });

  makeShelf({
    x: -10.0,
    z: 4.1,
    width: 6.4,
    depth: 2.2,
    topY: platformTops.shelfLeftLow,
    colorMaterial: materials.shelfYellow,
  });

  makeShelf({
    x: -10.0,
    z: 1.1,
    width: 6.2,
    depth: 2.1,
    topY: platformTops.shelfLeftHigh,
    colorMaterial: materials.shelfPink,
  });

  makeShelf({
    x: -4.6,
    z: 1.5,
    width: 4.8,
    depth: 1.7,
    topY: platformTops.bridgeMid,
    colorMaterial: materials.shelfPurple,
    postInset: 0.45,
  });

  makeShelf({
    x: 10.0,
    z: 4.0,
    width: 6.3,
    depth: 2.2,
    topY: platformTops.shelfRightLow,
    colorMaterial: materials.shelfGreen,
  });

  makeShelf({
    x: 10.0,
    z: 1.0,
    width: 6.2,
    depth: 2.2,
    topY: platformTops.shelfRightHigh,
    colorMaterial: materials.shelfYellow,
  });

  makeShelf({
    x: 0.1,
    z: -1.8,
    width: 8.2,
    depth: 2.7,
    topY: platformTops.topCenter,
    colorMaterial: materials.shelfPurple,
    postInset: 0.6,
  });

  [
    { x: -13.2, z: 7.8, topY: 1.1, w: 1.8, d: 1.8, m: materials.frameDark },
    { x: -12.1, z: 6.7, topY: 1.7, w: 1.2, d: 1.2, m: materials.shelfPink },
    { x: 12.7, z: 7.8, topY: 1.3, w: 1.8, d: 1.8, m: materials.frameDark },
    { x: 11.7, z: 6.9, topY: 1.9, w: 1.25, d: 1.25, m: materials.shelfGreen },
  ].forEach((crate) => {
    makeStepBlock({
      x: crate.x,
      z: crate.z,
      width: crate.w,
      depth: crate.d,
      topY: crate.topY,
      material: crate.m,
    });
  });

  if (!isLowPower) {
    const accentPink = new THREE.PointLight(0xfe4aae, 0.28, 10, 2);
    accentPink.position.set(-11, 7.4, -8.4);

    const accentGreen = new THREE.PointLight(0xb4ff3b, 0.25, 10, 2);
    accentGreen.position.set(11, 6.8, -7.8);

    scene.add(accentPink, accentGreen);
  }
}
