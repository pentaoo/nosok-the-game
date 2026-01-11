import * as THREE from "three";

export function createGameScene(mountEl) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0b, 12, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  mountEl.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(8, 14, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -20;
  dir.shadow.camera.right = 20;
  dir.shadow.camera.top = 20;
  dir.shadow.camera.bottom = -20;
  scene.add(dir);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0x121212,
      roughness: 0.95,
      metalness: 0.0,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(200, 200, 0x2a2a2a, 0x1a1a1a);
  grid.position.y = 0.001;
  scene.add(grid);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const cameraTarget = new THREE.Vector3(0, 0, 0);

  function followCamera(playerPos, dt) {
    cameraTarget.lerp(playerPos, 1 - Math.pow(0.001, dt));

    const desired = new THREE.Vector3(
      cameraTarget.x,
      cameraTarget.y + 10,
      cameraTarget.z + 10
    );

    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(cameraTarget.x, cameraTarget.y + 0.8, cameraTarget.z);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, followCamera, render };
}
