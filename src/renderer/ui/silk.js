// Procedural black-silk texture with tapered gold ribbons, drawn as SVG (no image files).
let n = 0;
// Each ribbon: top edge and bottom edge (bottom drawn back from right to left), so the width can vary.
const RIBBONS = [
  { d: "M-80 190 C 170 100 360 400 640 340 C 860 292 1010 540 1300 452 L1300 482 C 1010 574 870 322 640 366 C 352 428 168 140 -80 222 Z", tone: "bright", o: 1 },
  { d: "M-80 262 C 190 196 370 486 650 432 C 880 388 1030 618 1300 560 L1300 572 C 1030 632 880 404 650 446 C 362 504 186 214 -80 278 Z", tone: "deep", o: 0.9 },
  { d: "M-80 92 C 170 28 420 262 700 214 C 900 180 1080 360 1300 318 L1300 324 C 1080 368 900 190 700 222 C 418 272 168 40 -80 100 Z", tone: "bright", o: 0.5 },
];
export function silk({ seed = 4, ribbons = 3, sheen = 1, id } = {}) {
  const k = id || "s" + (++n);
  const ribbon = ({ d, tone, o }) => `
    <path d="${d}" fill="url(#${k}${tone})" opacity="${0.45 * o}" filter="url(#${k}glow)"/>
    <path d="${d}" fill="url(#${k}${tone})" opacity="${o}" filter="url(#${k}grain)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="silk" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <filter id="${k}f" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0013 0.0034" numOctaves="2" seed="${seed}" result="n"/>
      <feGaussianBlur in="n" stdDeviation="14" result="h"/>
      <feDiffuseLighting in="h" surfaceScale="${60 * sheen}" diffuseConstant="1" lighting-color="#141312" result="d">
        <feDistantLight azimuth="225" elevation="48"/>
      </feDiffuseLighting>
      <feSpecularLighting in="h" surfaceScale="${60 * sheen}" specularConstant="0.75" specularExponent="14" lighting-color="#5c574d" result="s">
        <feDistantLight azimuth="225" elevation="30"/>
      </feSpecularLighting>
      <feGaussianBlur in="s" stdDeviation="2.5" result="s2"/>
      <feComposite in="d" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0"/>
    </filter>
    <linearGradient id="${k}bright" x1="0" y1="0" x2="1" y2="0.5">
      <stop offset="0" stop-color="#4a380c"/><stop offset=".25" stop-color="#A9862A"/><stop offset=".45" stop-color="#F3DD95"/>
      <stop offset=".55" stop-color="#D4AF37"/><stop offset=".78" stop-color="#9C7C24"/><stop offset="1" stop-color="#3a2b08"/>
    </linearGradient>
    <linearGradient id="${k}deep" x1="0" y1="0" x2="1" y2="0.5">
      <stop offset="0" stop-color="#241a05"/><stop offset=".4" stop-color="#6e5516"/><stop offset=".6" stop-color="#9C7C24"/><stop offset="1" stop-color="#2a1f06"/>
    </linearGradient>
    <filter id="${k}grain" x="-5%" y="-20%" width="110%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="1" seed="${seed + 3}" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 0.94  0 0 0 0 0.76  0 0 0 2.6 -1.75" result="sp"/>
      <feComposite in="sp" in2="SourceGraphic" operator="in" result="spk"/>
      <feBlend in="spk" in2="SourceGraphic" mode="screen"/>
    </filter>
    <filter id="${k}glow" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>
    <radialGradient id="${k}v" cx=".5" cy=".45" r=".8"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
  </defs>
  <rect x="-120" y="-120" width="1440" height="1040" fill="#0D0D0D" filter="url(#${k}f)"/>
  ${RIBBONS.slice(0, ribbons).map(ribbon).join("")}
  <rect width="1200" height="800" fill="url(#${k}v)"/>
</svg>`;
}

/** The texture as a CSS url(): decoded once by the browser and reused on every render. */
export const silkUrl = (opts) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(silk(opts))}")`;
