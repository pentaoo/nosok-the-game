import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createFlipbookPlane } from "./flipbook_animations.js";

export function createGameScene(mountEl) {
  const scene = new THREE.Scene();
  const world = {
    WM_1: null,
    WM_err: null,
  };
  scene.fog = new THREE.Fog(0x0b0b0b, 12, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  mountEl.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    80,
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

  //ПОЛ
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      color: 0xfdfffd,
      roughness: 0.95,
      metalness: 0.5,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(500, 500, 0x2a2a2a, 0x1a1a1a);
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

  let WM_err = null;
  const loader = new GLTFLoader();
  loader.load(
    "models/WM_err.glb",
    (gltf) => {
      WM_err = gltf.scene;
      WM_err.position.set(0, 0, -10);
      WM_err.scale.set(5, 5, 5);
      scene.add(WM_err);
    },
    undefined,
    (error) => console.error("Ошибка загрузки WM_err:", error)
  );

  let WM_1 = null;
  loader.load(
    "models/WM_1.glb",
    async (gltf) => {
      WM_1 = gltf.scene;
      world.WM_1 = WM_1;
      WM_1.position.set(9, 0, -10);
      WM_1.scale.set(5, 5, 5);
      scene.add(WM_1);

      //позиционирование анимки барабабы
      const WM_center = new THREE.Object3D();
      WM_1.add(WM_center);
      const WM_box = new THREE.Box3().setFromObject(WM_1);
      const centerWorld = new THREE.Vector3();
      WM_box.getCenter(centerWorld);
      const WM_front = new THREE.Vector3(
        centerWorld.x,
        centerWorld.y,
        WM_box.max.z - 0.35
      );
      WM_1.worldToLocal(WM_front);
      WM_center.position.copy(WM_front);
      const FBA_WM_1 = await createFlipbookPlane({
        textureUrl: "./flipbook_animations/FBA_WM_1.png",
        frameCols: 1,
        frameRows: 5,
        fps: 8,
        size: 0.75,
        transparent: true,
        emissive: true,
      });
      WM_center.add(FBA_WM_1);
      WM_1.userData.FBA_WM_1 = FBA_WM_1;

      const mixer = new THREE.AnimationMixer(WM_1);

      const onClip = gltf.animations.find((a) => a.name === "on");
      const onAction = mixer.clipAction(onClip);
      onAction.play();

      WM_1.userData.mixer = mixer;
      WM_1.userData.actions = {
        on: onAction,
      };
    },
    undefined,
    (error) => console.error("Ошибка загрузки washing_machine:", error)
  );

  return { scene, camera, renderer, followCamera, render, world };
}
