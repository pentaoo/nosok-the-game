function resolveSourceAsset(relativePath) {
  return new URL(relativePath, import.meta.url).href;
}

function resolvePublicAsset(relativePath) {
  return new URL(`../../public/${relativePath}`, import.meta.url).href;
}

export const ITEM_PREVIEW_URL = resolveSourceAsset("../img/image 20.png");

export const FOOTER_IMAGE_URLS = {
  author: resolveSourceAsset("../img/footer/author-aleksey.jpg"),
  curator: resolveSourceAsset("../img/footer/curator-nikolay.png"),
  technologist: resolveSourceAsset("../img/footer/technologist-anna.png"),
  posters: resolveSourceAsset("../img/footer/project-posters.png"),
  webPoster: resolveSourceAsset("../img/footer/project-web-poster.png"),
  zineCoverA: resolveSourceAsset("../img/footer/project-zine-cover-a.png"),
  zineCoverB: resolveSourceAsset("../img/footer/project-zine-cover-b.png"),
};

export const SOCK_ASSET_URLS = [
  resolveSourceAsset("../img/socks/Vector-1.svg"),
  resolveSourceAsset("../img/socks/Vector-2.svg"),
  resolveSourceAsset("../img/socks/Vector-3.svg"),
  resolveSourceAsset("../img/socks/Vector.svg"),
  resolveSourceAsset("../img/socks/fill=gradient, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=green, pattern=dots, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=green, pattern=dots, patternColor=opposite.svg"),
  resolveSourceAsset("../img/socks/fill=green, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=green, pattern=stripes, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=pink, pattern=dots, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=pink, pattern=dots, patternColor=opposite.svg"),
  resolveSourceAsset("../img/socks/fill=pink, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=pink, pattern=stripes, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=purple, pattern=dots, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=purple, pattern=dots, patternColor=opposite.svg"),
  resolveSourceAsset("../img/socks/fill=purple, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=purple, pattern=stripes, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=red, pattern=dots, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=red, pattern=dots, patternColor=opposite.svg"),
  resolveSourceAsset("../img/socks/fill=red, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=red, pattern=stripes, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=white, pattern=dots, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=white, pattern=dots, patternColor=opposite.svg"),
  resolveSourceAsset("../img/socks/fill=white, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=white, pattern=stripes, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=yellow, pattern=dots, patternColor=black.svg"),
  resolveSourceAsset("../img/socks/fill=yellow, pattern=dots, patternColor=opposite.svg"),
  resolveSourceAsset("../img/socks/fill=yellow, pattern=none, patternColor=none.svg"),
  resolveSourceAsset("../img/socks/fill=yellow, pattern=stripes, patternColor=black.svg"),
];

export const MODEL_URLS = {
  doc: resolvePublicAsset("models/DOC.glb"),
  jeans: resolvePublicAsset("models/jeans.glb"),
  player: resolvePublicAsset("models/player.glb"),
  sumka: resolvePublicAsset("models/sumka.glb"),
  trasherOld: resolvePublicAsset("models/trasher_old.glb"),
  uggi: resolvePublicAsset("models/uggi.glb"),
  ushanka: resolvePublicAsset("models/USHANKA.glb"),
  vans: resolvePublicAsset("models/vans.glb"),
  washerErr: resolvePublicAsset("models/WM_err.glb"),
  washerOn: resolvePublicAsset("models/WM_1.glb"),
  washerOff: resolvePublicAsset("models/WM_off.glb"),
};

export const FLIPBOOK_TEXTURE_URLS = {
  washer: resolvePublicAsset("flipbook_animations/FBA_WM_1.png"),
};
