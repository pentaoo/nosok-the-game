import * as THREE from "three";

function styleGridMaterial(material) {
  material.opacity = 0.25;
  material.transparent = true;
  material.depthWrite = false;
}

export function setupEnvironment({ scene, isLowPower }) {
  scene.background = new THREE.Color(0x7fd8ff);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, isLowPower ? 1.1 : 1.35);
  dir.position.set(8, 14, 6);
  dir.castShadow = true;

  const shadowMap = isLowPower ? 512 : 2048;
  dir.shadow.mapSize.set(shadowMap, shadowMap);
  dir.shadow.camera.near = 2;
  dir.shadow.camera.far = 55;

  const shadowSize = isLowPower ? 14 : 22;
  dir.shadow.camera.left = -shadowSize;
  dir.shadow.camera.right = shadowSize;
  dir.shadow.camera.top = shadowSize;
  dir.shadow.camera.bottom = -shadowSize;
  dir.shadow.bias = -0.00035;
  dir.shadow.normalBias = 0.03;
  dir.shadow.radius = 0;
  scene.add(dir);

  const fill = new THREE.DirectionalLight(0xffffff, isLowPower ? 0.35 : 0.5);
  fill.position.set(-8, 6, -10);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, isLowPower ? 0.18 : 0.28);
  rim.position.set(0, 10, -12);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0xeaf7ff,
      roughness: 0.78,
      metalness: 0.05,
      emissive: 0x9fdfff,
      emissiveIntensity: 0.12,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(500, 500, 0x9fd6ff, 0xc9ecff);
  grid.position.y = 0.001;
  if (Array.isArray(grid.material)) {
    grid.material.forEach(styleGridMaterial);
  } else {
    styleGridMaterial(grid.material);
  }
  scene.add(grid);
}
