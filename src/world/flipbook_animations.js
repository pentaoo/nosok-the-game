import * as THREE from "three";

export async function createFlipbookPlane({
  textureUrl,
  frameCols = 1,
  frameRows = 1,
  fps = 8,
  size = 1,
  transparent = true,
  emissive = true,
} = {}) {
  const loader = new THREE.TextureLoader();
  const map = await loader.loadAsync(textureUrl);

  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / frameCols, 1 / frameRows);

  const materialConfig = {
    map,
    transparent: emissive ? true : transparent,
    depthWrite: false,
    side: THREE.DoubleSide,
  };
  const material = emissive
    ? new THREE.MeshStandardMaterial(materialConfig)
    : new THREE.MeshBasicMaterial(materialConfig);

  const geom = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geom, material);

  const step = 1 / fps;
  const totalFrames = frameCols * frameRows;
  let elapsed = 0;
  let frame = 0;

  mesh.userData.updateFlipbook = (dt) => {
    elapsed += dt;
    while (elapsed >= step) {
      elapsed -= step;
      frame = (frame + 1) % totalFrames;
      const col = frame % frameCols;
      const row = Math.floor(frame / frameCols);
      map.offset.set(col / frameCols, 1 - (row + 1) / frameRows);
    }
  };

  return mesh;
}
