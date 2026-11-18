/* ===== 英語RPGの風景と敵の絵（すべて手描きのSVG。外の画像は使わない） ===== */
const RPG_DEFS = `<defs>
  <radialGradient id="rgGlow"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".95"/><stop offset=".45" stop-color="#ff9a3c" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="rgMoon"><stop offset=".55" stop-color="#fff6dc"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
  <linearGradient id="rgNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1030"/><stop offset=".65" stop-color="#2a1d4e"/><stop offset="1" stop-color="#4a2a4a"/></linearGradient>
  <linearGradient id="rgRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a3a"/><stop offset="1" stop-color="#1a1220"/></linearGradient>
  <linearGradient id="rgRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0a14"/><stop offset=".7" stop-color="#5a1420"/><stop offset="1" stop-color="#a8321e"/></linearGradient>
  <linearGradient id="rgRoom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14161f"/><stop offset="1" stop-color="#0a0b10"/></linearGradient>
  <filter id="rgBlur"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="rgSoft"><feGaussianBlur stdDeviation="2"/></filter>
</defs>`;
const rgStars = n => { let s = "", x = 7; for (let i = 0; i < n; i++) { x = (x * 73 + 41) % 397; const y = (x * 37 + i * 53) % 110; s += `<circle cx="${x}" cy="${y}" r="${(i % 3) * .4 + .5}" fill="#fff" opacity="${.35 + (i % 4) * .15}"/>`; } return s; };
/** 提灯1つ（x, y：中心、s：大きさ、d：ゆらぎの遅れ） */
const rgLantern = (x, y, s, d = 0) => `<g class="rg-lan" style="animation-delay:${d}s">
  <circle cx="${x}" cy="${y}" r="${s * 2.6}" fill="url(#rgGlow)"/>
  <line x1="${x}" y1="${y - s * 1.6}" x2="${x}" y2="${y - s * 2.4}" stroke="#2a1a10" stroke-width="${s * .15}"/>
  <rect x="${x - s * .55}" y="${y - s * 1.25}" width="${s * 1.1}" height="${s * .22}" rx="${s * .05}" fill="#2a1a10"/>
  <ellipse cx="${x}" cy="${y}" rx="${s * .8}" ry="${s * 1.1}" fill="#f2a24a"/>
  <ellipse cx="${x}" cy="${y}" rx="${s * .8}" ry="${s * 1.1}" fill="none" stroke="#c4622a" stroke-width="${s * .07}"/>
  <path d="M${x - s * .8} ${y - s * .4}h${s * 1.6}M${x - s * .8} ${y + s * .4}h${s * 1.6}" stroke="#c4622a" stroke-width="${s * .06}"/>
  <rect x="${x - s * .55}" y="${y + s * 1.03}" width="${s * 1.1}" height="${s * .22}" rx="${s * .05}" fill="#2a1a10"/></g>`;
const rgFog = (y, o, d) => `<g class="rg-fog" style="animation-delay:${d}s" filter="url(#rgBlur)" opacity="${o}"><ellipse cx="80" cy="${y}" rx="120" ry="18" fill="#e8e6f2"/><ellipse cx="300" cy="${y + 6}" rx="140" ry="20" fill="#e8e6f2"/><ellipse cx="520" cy="${y}" rx="120" ry="18" fill="#e8e6f2"/></g>`;

const RPG_SCENES = {
  room: () => `<rect width="400" height="200" fill="url(#rgRoom)"/>
    <rect x="250" y="22" width="100" height="80" rx="3" fill="#1c2340" stroke="#2c3350" stroke-width="4"/><circle cx="318" cy="48" r="16" fill="url(#rgMoon)"/>${'<circle cx="270" cy="35" r=".8" fill="#fff"/><circle cx="292" cy="80" r=".7" fill="#fff"/><circle cx="335" cy="88" r=".9" fill="#fff"/>'}
    <path d="M300 22v80M250 62h100" stroke="#2c3350" stroke-width="3"/>
    <circle cx="96" cy="118" r="60" fill="url(#rgGlow)" opacity=".55"/>
    <path d="M70 100l18-30h26l-6 30z" fill="#3a3326"/><rect x="88" y="100" width="4" height="32" fill="#3a3326"/>
    <rect x="20" y="132" width="300" height="12" rx="2" fill="#2b2118"/><rect x="40" y="144" width="10" height="56" fill="#21190f"/><rect x="290" y="144" width="10" height="56" fill="#21190f"/>
    <rect x="130" y="118" width="80" height="14" rx="2" fill="#e9e3d2" transform="rotate(-4 170 125)"/><path d="M138 122h60M138 127h50" stroke="#9a937f" stroke-width="1" transform="rotate(-4 170 125)"/>
    <rect x="225" y="160" width="26" height="3" rx="1.5" fill="#e0b040" transform="rotate(20 238 161)"/>`,
  road: () => `<rect width="400" height="200" fill="url(#rgNight)"/>${rgStars(50)}<circle cx="320" cy="42" r="22" fill="url(#rgMoon)"/>
    <path d="M0 120L60 92 120 112 190 80 260 108 330 86 400 110V200H0z" fill="#1a1530"/>
    <path d="M0 132L80 116 150 126 230 108 310 124 400 114V200H0z" fill="#120f22"/>
    <path d="M178 120h44L330 200H70z" fill="url(#rgRoad)"/>
    ${[[150, 116, 3], [250, 116, 3], [135, 126, 4.5], [265, 126, 4.5], [112, 142, 7], [288, 142, 7], [78, 168, 10], [322, 168, 10]].map(([x, y, s], i) => rgLantern(x, y, s, i * .37)).join("")}`,
  bridge: () => `<rect width="400" height="200" fill="url(#rgNight)"/>${rgStars(25)}
    <path d="M0 150Q200 70 400 150" fill="none" stroke="#7a1e1e" stroke-width="10"/>
    <path d="M0 160Q200 82 400 160" fill="none" stroke="#5a1414" stroke-width="5"/>
    ${[40, 120, 200, 280, 360].map((x, i) => { const y = 150 - 80 * (1 - Math.pow((x - 200) / 200, 2)); return `<rect x="${x - 3}" y="${y - 22}" width="6" height="24" fill="#6a1818"/>` + rgLantern(x, y - 30, 4, i * .4); }).join("")}
    <rect y="165" width="400" height="35" fill="#0d0b1a"/>
    ${rgFog(150, .55, 0)}${rgFog(120, .35, 3)}${rgFog(175, .6, 6)}`,
  mountain: () => `<rect width="400" height="200" fill="url(#rgRed)"/>${rgStars(15)}
    <path d="M0 200L120 110 170 130 230 40 290 120 340 100 400 140V200z" fill="#0c0508"/>
    <g class="rg-eyes"><path d="M150 70Q230 10 230 52Q230 10 310 70Q260 50 230 66Q200 50 150 70z" fill="#1a0a0e" opacity=".9"/>
    <circle cx="220" cy="56" r="3" fill="#ffd34a"/><circle cx="240" cy="56" r="3" fill="#ffd34a"/></g>`
};
const RPG_FOES = {
  blank: () => `<g class="rg-foe"><path d="M150 60l30 -14 22 10 26 -12 24 18 -8 26 14 22 -18 30 -30 6 -22 -10 -30 8 -14 -30 10 -24z" fill="#e8e6f0" opacity=".92"/>
    <path d="M168 76l22 6M205 70l18 14M178 110l30 -6M215 112l18 8M175 92h40" stroke="#9a96aa" stroke-width="1.5"/>
    <ellipse cx="190" cy="96" rx="6" ry="8" fill="#111"/><ellipse cx="222" cy="96" rx="6" ry="8" fill="#111"/><path d="M196 124q10 -8 20 0" stroke="#111" stroke-width="3" fill="none"/></g>`,
  moth: () => `<g class="rg-foe"><path d="M200 100C150 40 90 40 80 80C76 110 130 120 196 108C140 130 120 170 160 176C190 180 198 140 200 116C202 140 210 180 240 176C280 170 260 130 204 108C270 120 324 110 320 80C310 40 250 40 200 100z" fill="#1c1c24" stroke="#3a3a48" stroke-width="2"/>
    <path d="M110 70h50M106 82h56M112 94h48M240 70h50M238 82h56M240 94h48M150 150h30M222 150h30" stroke="#e8e2d0" stroke-width="1.5" opacity=".7"/>
    <ellipse cx="200" cy="112" rx="9" ry="34" fill="#0a0a10"/><circle cx="194" cy="86" r="3" fill="#ff4a4a"/><circle cx="206" cy="86" r="3" fill="#ff4a4a"/>
    <path d="M196 80q-14 -26 -26 -30M204 80q14 -26 26 -30" stroke="#0a0a10" stroke-width="2.5" fill="none"/></g>`
};
function rpgArt(bg, foe) {
  const scene = (RPG_SCENES[bg] || RPG_SCENES.road)();
  return `<svg class="rpg-scene" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${RPG_DEFS}${scene}${foe && RPG_FOES[foe] ? RPG_FOES[foe]() : ""}</svg>`;
}
