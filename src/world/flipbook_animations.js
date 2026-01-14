// flipbook_animations.js
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

  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;

  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / frameCols, 1 / frameRows);

  const material = emissive
    ? new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshBasicMaterial({
        map,
        transparent,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

  const geom = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geom, material);

  let time = 0;
  let frame = 0;
  const totalFrames = frameCols * frameRows;

  mesh.userData.updateFlipbook = (dt) => {
    time += dt;
    const step = 1 / fps;

    while (time >= step) {
      time -= step;
      frame = (frame + 1) % totalFrames;

      const col = frame % frameCols;
      const row = Math.floor(frame / frameCols);

      const xOffset = col / frameCols;
      const yOffset = 1 - (row + 1) / frameRows; // для атласа сверху-вниз

      map.offset.set(xOffset, yOffset);
      // map.needsUpdate = true; // обычно не нужно, но можно оставить если сомневаешься
    }
  };

  return mesh;
}
