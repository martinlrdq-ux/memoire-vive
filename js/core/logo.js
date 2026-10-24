// Le hibou de Kikory, même dessin que l'icône (tools/make_icons.py).
export function owlSVG(size = 72) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
<rect width="100" height="100" rx="22" fill="#EF9F27"/>
<polygon points="18,40 26,14 42,30" fill="#854F0B"/><polygon points="82,40 74,14 58,30" fill="#854F0B"/>
<ellipse cx="50" cy="56" rx="34" ry="31" fill="#854F0B"/>
<circle cx="37" cy="52" r="13" fill="#FAEEDA"/><circle cx="63" cy="52" r="13" fill="#FAEEDA"/>
<circle cx="38" cy="53" r="6" fill="#412402"/><circle cx="62" cy="53" r="6" fill="#412402"/>
<polygon points="45,65 55,65 50,74" fill="#EF9F27"/></svg>`;
}
