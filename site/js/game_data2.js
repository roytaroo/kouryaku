/* ===== 王道RPG：第3章〜終章のデータ =====
   ダンジョンは gDungeon で部屋と通路を自動で組む（同じ seed なら毎回同じ形）。入口は下、出口・ボスは上。
   部屋の中心を spots に入れておき、人・宝箱・場面のきっかけをそこへ置く。 */
function gRng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gDungeon(o) {
  const rnd = gRng(o.seed), cols = 3, rows = o.rows || 4, W = cols * 8 + 1, H = rows * 7 + 2;
  const m = gMapNew(W, H, o.floor); for (let i = 0; i < W * H; i++) { m.cells[i] = [o.wallBase || o.floor, o.wall]; m.solid[i] = true; }
  const open = (x, y) => { if (x < 1 || y < 0 || x >= W - 1 || y >= H) return; const i = y * W + x; m.cells[i] = [o.floor]; m.solid[i] = false; };
  const rooms = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const rw = 4 + Math.floor(rnd() * 3), rh = 3 + Math.floor(rnd() * 2), x0 = c * 8 + 1 + Math.floor(rnd() * (7 - rw)), y0 = 1 + r * 7 + Math.floor(rnd() * (6 - rh));
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) open(x, y);
    rooms.push({ r, c, x0, y0, rw, rh, cx: x0 + Math.floor(rw / 2), cy: y0 + Math.floor(rh / 2) });
  }
  const R = (r, c) => rooms[r * cols + c];
  const path = new Set(), mark = (x, y) => { open(x, y); path.add(x + "," + y); };
  const dig = (a, b) => { let x = a.cx, y = a.cy; while (x !== b.cx) { mark(x, y); x += Math.sign(b.cx - x); } while (y !== b.cy) { mark(x, y); y += Math.sign(b.cy - y); } mark(x, y); };
  for (let r = 0; r < rows; r++) { dig(R(r, 0), R(r, 1)); dig(R(r, 1), R(r, 2)); }
  for (let r = rows - 1; r > 0; r--) dig(R(r, (rows - r) % 2 ? 0 : 2), R(r - 1, (rows - r) % 2 ? 0 : 2)); // 左右交互に上がる＝くねくね道
  const bot = R(rows - 1, 1), top = R(0, 1);
  for (let y = bot.cy; y < H; y++) mark(bot.cx, y);
  for (let y = 0; y <= top.cy; y++) mark(top.cx, y);
  // 通路と、そのとなりのマスには物を置かない
  const free = (x, y) => ![[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => path.has((x + a) + "," + (y + b)));
  // 飾り：部屋の四隅（通路は部屋の中心からなのでふさがない）
  for (const rm of rooms) if (rm !== top) for (const [x, y] of [[rm.x0, rm.y0], [rm.x0 + rm.rw - 1, rm.y0 + rm.rh - 1]]) if (o.deco && free(x, y) && rnd() < 0.7) { const t = o.deco[Math.floor(rnd() * o.deco.length)]; gPut(m, x, y, t, true); }
  for (const rm of rooms) if (o.floorDeco && rnd() < 0.6) gPut(m, rm.x0 + rm.rw - 1, rm.y0, o.floorDeco[Math.floor(rnd() * o.floorDeco.length)]);
  // 宝箱を置く部屋の隅をふさがないよう、四隅のもう片方を使う
  const side = rooms.filter(rm => rm !== top && rm !== bot && rm.c !== 1);
  m.spots = { entry: [bot.cx, H - 2], exit: [top.cx, 1], boss: [top.cx, top.cy], mid: [R(Math.floor(rows / 2), 1).cx, R(Math.floor(rows / 2), 1).cy],
    chest: side.flatMap(rm => [[rm.x0 + rm.rw - 1, rm.y0], [rm.x0, rm.y0 + rm.rh - 1], [rm.x0, rm.y0], [rm.x0 + rm.rw - 1, rm.y0 + rm.rh - 1]].filter(([x, y]) => free(x, y) && !m.solid[y * W + x]).slice(0, 1)) };
  for (const [x, y] of m.spots.chest) m.solid[y * W + x] = false;
  return m;
}
/* 町：家・店・噴水。o.exits に出口、o.doors に入口の役目 */
function gTownMap(o) {
  const m = gMapNew(26, 22, o.ground);
  const edge = o.edge || "tree";
  const wallAt = (x, y) => { if (edge === "tree") return; gSet(m, x, y, o.wall, true); };
  if (edge === "tree") { for (let x = 0; x < 26; x += 2) { if (!(o.gapTop && x === 12)) gTree(m, x, 0); if (!(o.gapBot && x === 12)) gTree(m, x, 20); } for (let y = 2; y < 20; y += 2) { if (!(o.gapRight && y === 10)) gTree(m, 24, y); if (!(o.gapLeft && y === 10)) gTree(m, 0, y); } }
  else { for (let x = 0; x < 26; x++) { if (!(o.gapTop && (x === 12 || x === 13))) { wallAt(x, 0); wallAt(x, 1); } if (!(o.gapBot && (x === 12 || x === 13))) { wallAt(x, 20); wallAt(x, 21); } } for (let y = 0; y < 22; y++) { wallAt(0, y); wallAt(1, y); if (!(o.gapRight && (y === 10 || y === 11))) { wallAt(24, y); wallAt(25, y); } } }
  gRect(m, 2, 10, 22, 2, o.path); gRect(m, 12, 2, 2, 18, o.path);
  if (o.gapRight) gRect(m, 24, 10, 2, 2, o.path);
  if (o.gapLeft) gRect(m, 0, 10, 2, 2, o.path);
  if (o.gapTop) gRect(m, 12, 0, 2, 2, o.path); if (o.gapBot) gRect(m, 12, 20, 2, 2, o.path);
  TILE.fountain.forEach((t, i) => { const x = 11 + (i % 3), y = 6 + Math.floor(i / 3); gSet(m, x, y, o.path, true); gPut(m, x, y, t); });
  gRect(m, 10, 5, 5, 1, o.path); gRect(m, 10, 9, 5, 1, o.path); gRect(m, 10, 5, 1, 5, o.path); gRect(m, 14, 5, 1, 5, o.path);
  TILE.fountain.forEach((t, i) => { const x = 11 + (i % 3), y = 6 + Math.floor(i / 3); gSet(m, x, y, o.path, true); gPut(m, x, y, t); });
  gHouse(m, 3, 3, 6, o.roofs[0], o.walls[0], 5, o.signs[0]);
  gHouse(m, 16, 3, 6, o.roofs[1], o.walls[1], 18, o.signs[1]);
  gHouse(m, 3, 14, 6, o.roofs[2], o.walls[2], 5, o.signs[2]);
  gHouse(m, 16, 14, 6, o.roofs[3], o.walls[3], 18, o.signs[3]);
  for (const [x1, y1, y2] of [[5, 7, 9], [18, 7, 9], [5, 12, 13], [18, 12, 13]]) gRect(m, x1, y1, 1, y2 - y1 + 1, o.path);
  for (const [x, y, t] of (o.deco || [])) gPut(m, x, y, t, t === TILE.bush || t === TILE.barrelTop || t === TILE.crate);
  return m;
}

/* ---- 第3章〜の強さ（章 t ごと） ---- */
function gTierFoe(mon, t, boss, name, ja, extra) {
  const k = t - 3, bAtk = 43 + k * 8.8, bDef = 16 + k * 4.9;
  const d = boss
    ? { hp: Math.round(2600 * Math.pow(1.18, k)), atk: Math.round(bAtk * 1.15), def: Math.round(bDef), spd: 8 + t, exp: Math.round(320 * Math.pow(1.35, k)), gold: Math.round(200 * Math.pow(1.3, k)), boss: true }
    : { hp: Math.round(62 * Math.pow(1.28, k)), atk: Math.round(bAtk * 0.74), def: Math.round(bDef * 0.8), spd: 5 + t, exp: Math.round(37 * Math.pow(1.15, k)), gold: Math.round(20 * Math.pow(1.3, k)) };
  return { mon, name: name || RPG_MON_NAMES[mon], ja: ja || RPG_MON_NAMES[mon], ...d, ...(extra || {}) };
}
const GAREA2 = {
  cave: { t: 3, mons: [16, 13, 17, 36, 75, 73] }, canal: { t: 4, mons: [56, 53, 39, 54, 55, 31] },
  castle: { t: 5, mons: [64, 7, 12, 105, 102, 106] }, hall: { t: 6, mons: [61, 51, 30, 86, 2, 14] },
  library: { t: 7, mons: [74, 63, 22, 108, 43, 59] }, beach: { t: 8, mons: [44, 69, 42, 76, 52, 39] },
  sea: { t: 9, mons: [82, 68, 69, 14, 11, 34] }, storm: { t: 10, mons: [62, 6, 27, 72, 15, 100] },
  gate: { t: 11, mons: [60, 92, 18, 38, 71, 25] }, throne: { t: 12, mons: [49, 93, 4, 61, 72, 80] }
};
for (const [area, a] of Object.entries(GAREA2)) {
  GAREAS[area] = [];
  a.mons.forEach((mon, i) => { const key = area + "_" + mon; GFOES[key] = gTierFoe(mon, a.t, false); GAREAS[area].push([key]); if (i % 2 === 0) GAREAS[area].push([key, key]); });
  GAREAS[area].push([area + "_" + a.mons[0], area + "_" + a.mons[1], area + "_" + a.mons[2]]);
}
const GBOSS2 = [
  ["Glacier Titan", "氷河の巨人", 101, 3], ["Canal Kraken", "水路のクラーケン", 11, 4], ["Captain Varos", "ヴァロス隊長", 64, 5], ["The Gray Herald", "灰色の使者", 86, 6],
  ["Ink Weaver", "インクの織り手", 61, 7], ["Golden Whale", "黄金のクジラ", 67, 8], ["Abyss Wyrm", "深淵の竜", 88, 9], ["Thunder Lion", "雷獅子", 100, 10],
  ["Gatekeeper of Ash", "灰の門番", 80, 11], ["Queen of Oblivion", "忘却の女王", 74, 12.6]
];
for (const [name, ja, mon, t] of GBOSS2) { const key = "boss_" + mon; GFOES[key] = gTierFoe(mon, t, true, name, ja, name === "Queen of Oblivion" ? { foe: "queen" } : null); GBOSS_OF[name] = key; }

/* ---- 仲間：ガロ ---- */
GHEROES.garo = { name: "Garo", ja: "ガロ", face: "garo", base: { hp: 70, mp: 6, atk: 26, def: 22, mag: 2, spd: 4 }, grow: { hp: 9, mp: 1, atk: 3, def: 3, mag: 0, spd: 1 }, eq: { w: "handaxe", a: "miner" },
  skills: [{ lv: 1, line: ["cleave", "quake", "titanfall"] }] };
GHEROES.ren.skills.push({ lv: 24, id: "promise" });
GHEROES.lina.skills.push({ lv: 24, id: "lantern" });
Object.assign(GSKILLS, {
  cleave: { name: "Cleave", ja: "なぎはらい", mp: 3, kind: "atkall", pow: 1.1, evo: { lv: 20, to: "quake" } },
  quake: { name: "Earthquake", ja: "アースクエイク", mp: 6, kind: "atkall", pow: 1.6, evo: { lv: 30, to: "titanfall" } },
  titanfall: { name: "Titanfall", ja: "タイタンフォール", mp: 10, kind: "atkall", pow: 2.3 },
  promise: { name: "Promise Blade", ja: "約束の剣", mp: 8, kind: "atk", pow: 4.6 },
  lantern: { name: "Lantern of Aster", ja: "アスターの灯", mp: 14, kind: "healall", pow: 7 }
});
Object.assign(GEQUIP, {
  handaxe: { name: "Hand Axe", ja: "手斧", slot: "w", who: "garo", atk: 8, price: 0 },
  miner: { name: "Miner's Coat", ja: "鉱夫の上着", slot: "a", who: "garo", def: 6, price: 0 },
  steelsword: { name: "Steel Sword", ja: "鋼の剣", slot: "w", who: "ren", atk: 20, price: 520 },
  knightarmor: { name: "Knight Armor", ja: "騎士の鎧", slot: "a", who: "ren", def: 18, price: 560 },
  magerod: { name: "Mage Rod", ja: "魔導士のロッド", slot: "w", who: "lina", atk: 6, mag: 13, price: 500 },
  magecloak: { name: "Mage Cloak", ja: "魔導士のマント", slot: "a", who: "lina", def: 12, mag: 4, price: 460 },
  battleaxe: { name: "Battle Axe", ja: "バトルアックス", slot: "w", who: "garo", atk: 18, price: 520 },
  ironplate: { name: "Iron Plate", ja: "鉄の胸当て", slot: "a", who: "garo", def: 16, price: 520 },
  mithrilsword: { name: "Mithril Sword", ja: "ミスリルの剣", slot: "w", who: "ren", atk: 30, price: 1600 },
  mithrilmail: { name: "Mithril Mail", ja: "ミスリルの鎧", slot: "a", who: "ren", def: 28, price: 1700 },
  starrod: { name: "Star Rod", ja: "星のロッド", slot: "w", who: "lina", atk: 9, mag: 21, price: 1500 },
  starcloak: { name: "Star Cloak", ja: "星のマント", slot: "a", who: "lina", def: 20, mag: 6, price: 1400 },
  mithrilaxe: { name: "Mithril Axe", ja: "ミスリルの斧", slot: "w", who: "garo", atk: 28, price: 1600 },
  mithrilplate: { name: "Mithril Plate", ja: "ミスリルの胸当て", slot: "a", who: "garo", def: 26, price: 1600 },
  redpromise: { name: "Red Promise", ja: "紅の約束", slot: "w", who: "ren", atk: 42, price: 0 },
  aegis: { name: "Lantern Robe", ja: "灯のローブ", slot: "a", who: "lina", def: 30, mag: 12, price: 0 },
  earthbreaker: { name: "Earthbreaker", ja: "大地砕き", slot: "w", who: "garo", atk: 40, price: 0 },
  starplate: { name: "Starlight Mail", ja: "星明かりの鎧", slot: "a", who: "ren", def: 38, price: 0 }
});
Object.assign(GITEMS, {
  hiherb: { name: "Great Herb", ja: "上薬草", price: 60, heal: 160, icon: 1, desc: "HPを160回復" },
  hiwater: { name: "Holy Water", ja: "聖なる水", price: 150, mp: 50, icon: 13, desc: "MPを50回復" }
});
GSHOPS.capital_arms = ["steelsword", "knightarmor", "magerod", "magecloak", "battleaxe", "ironplate"];
GSHOPS.capital_items = ["herb", "hiherb", "water", "hiwater", "feather"];
GSHOPS.harbor_arms = ["mithrilsword", "mithrilmail", "starrod", "starcloak", "mithrilaxe", "mithrilplate"];
GSHOPS.harbor_items = ["hiherb", "water", "hiwater", "feather"];

/* ---- マップ（第3章〜） ---- */
const GD = (seed, rows, wall, floor, deco, floorDeco) => () => gDungeon({ seed, rows, wall, floor, deco, floorDeco });
const DECO_ROCK = [TILE.rock, T(8, 0)], DECO_ICE = [T(165, 4), T(144, 0)];
Object.assign(GMAPS, {
  cave: { name: "Crystal Caves", ja: "水晶の洞窟", bg: "cave", area: "cave", enc: { rate: 14, area: "cave" }, intro: "c3_enter", build: GD(31, 5, T(144, 0), TILE.gravel, DECO_ROCK, [T(8, 0)]),
    npcs: [{ id: "garo", sprite: "garo", at: "mid", dir: 0, talk: "c3_camp", hideIf: "garo_joined" }, { id: "titan", sprite: "golem", at: "boss", dir: 0, talk: "c3_boss", hideIf: "c3_done" }],
    chests: [{ id: "cv1", at: 0, item: "hiherb", n: 2 }, { id: "cv2", at: 1, eq: "battleaxe" }, { id: "cv3", at: 2, gold: 300 }],
    events: [{ bottom: true, to: ["ruins", 7, 4, 0] }, { top: true, to: ["canal", "entry", null, 3], need: "c3_done" }] },
  canal: { name: "Capital Waterway", ja: "王都の地下水路", bg: "canal", area: "canal", enc: { rate: 14, area: "canal" }, intro: "c4_enter", build: GD(47, 5, T(31, 4), T(38, 1), [TILE.barrelTop, TILE.crate], [T(7, 4)]),
    npcs: [{ id: "kraken", sprite: "beast", at: "boss", dir: 0, talk: "c4_boss", hideIf: "c4_done" }],
    chests: [{ id: "cn1", at: 0, item: "water", n: 3 }, { id: "cn2", at: 1, eq: "knightarmor" }, { id: "cn3", at: 3, item: "feather", n: 1 }],
    events: [{ at: "mid", r: 2, scene: "c4_mid", once: "c4_mid_seen" }, { bottom: true, to: ["cave", "exit", null, 0] }, { top: true, to: ["capital", 12, 19, 3], need: "c4_done" }] },
  capital: { name: "Royal Capital", ja: "王都アスター", bg: "castle", intro: "c5_enter", build: () => gTownMap({ ground: TILE.tileGray, path: TILE.cobble, edge: "wall", wall: T(53, 0), gapTop: true, gapBot: true, gapRight: true,
      roofs: [TILE.roofBlue, TILE.roofRed, TILE.roofBlue, TILE.roofRed], walls: [T(53, 0), T(53, 0), T(57, 0), T(53, 0)], signs: [TILE.signInn, TILE.signSword, TILE.signItem, null],
      deco: [[3, 9, TILE.flowerW], [22, 9, TILE.flowerP], [9, 13, TILE.bush], [16, 13, TILE.bush]] }),
    npcs: [{ id: "c_man", sprite: "man", x: 8, y: 11, dir: 2, lines: "capital_man" }, { id: "c_woman", sprite: "woman", x: 17, y: 10, dir: 1, lines: "capital_woman" }, { id: "c_guard", sprite: "soldier", x: 11, y: 2, dir: 0, lines: "capital_guard" }],
    events: [{ x: 5, y: 6, door: "inn" }, { x: 18, y: 6, door: "capital_arms" }, { x: 5, y: 17, door: "capital_items" }, { x: 18, y: 17, to: ["library", "entry", null, 3], need: "c6_done", block: "library_closed" },
      { top: true, to: ["castle", "entry", null, 3] }, { bottom: true, to: ["canal", "exit", null, 0] }, { right: true, to: ["harbor", 2, 10, 2], need: "c7_done", block: "harbor_closed" }] },
  castle: { name: "The White Castle", ja: "白い城", bg: "hall", area: "castle", enc: { rate: 15, area: "castle" }, build: GD(59, 4, T(53, 0), T(39, 2), [TILE.pillarTop, T(103, 3), T(103, 4)]),
    npcs: [{ id: "king", sprite: "king", at: "boss", dir: 0, talk: "c5_boss", hideIf: "c5_done" }],
    chests: [{ id: "cs1", at: 0, eq: "magecloak" }, { id: "cs2", at: 1, item: "hiherb", n: 3 }],
    events: [{ bottom: true, to: ["capital", 12, 1, 0] }, { top: true, to: ["hall", "entry", null, 3], need: "c5_done" }] },
  hall: { name: "Hall of Lanterns", ja: "灯の回廊", bg: "night_hall", area: "hall", enc: { rate: 14, area: "hall" }, intro: "c6_enter", build: GD(71, 5, T(152, 0), T(38, 3), [T(123, 4), T(124, 7)], [T(125, 4)]),
    npcs: [{ id: "herald", sprite: "herald", at: "boss", dir: 0, talk: "c6_boss", hideIf: "c6_done" }],
    chests: [{ id: "hl1", at: 0, item: "hiwater", n: 2 }, { id: "hl2", at: 1, eq: "magerod" }, { id: "hl3", at: 2, gold: 900 }],
    events: [{ at: "mid", r: 2, scene: "c6_mid", once: "c6_mid_seen" }, { bottom: true, to: ["castle", "exit", null, 0] }] },
  library: { name: "Great Library", ja: "大図書館", bg: "library", area: "library", enc: { rate: 15, area: "library" }, intro: "c7_enter", build: GD(83, 5, TILE.shelfBot, TILE.woodFloor, [T(119, 0), T(119, 1)], [T(119, 3)]),
    npcs: [{ id: "weaver", sprite: "herald", at: "boss", dir: 0, talk: "c7_boss", hideIf: "c7_done" }],
    chests: [{ id: "lb1", at: 0, item: "hiherb", n: 4 }, { id: "lb2", at: 1, eq: "ironplate" }, { id: "lb3", at: 2, gold: 1200 }],
    events: [{ at: "mid", r: 2, scene: "c7_mid", once: "c7_mid_seen" }, { bottom: true, to: ["capital", 18, 18, 0] }] },
  harbor: { name: "Harbor Town", ja: "港町", bg: "harbor", intro: "c8_enter", build: () => gTownMap({ ground: TILE.sand, path: TILE.plank, edge: "tree", gapRight: true, gapLeft: true,
      roofs: [TILE.roofOrange, TILE.roofBrown, TILE.roofOrange, TILE.roofBlue], walls: [TILE.woodWall, TILE.woodWall, TILE.brickWall, TILE.woodWall], signs: [TILE.signInn, TILE.signSword, TILE.signItem, null],
      deco: [[21, 12, TILE.barrelTop], [22, 12, TILE.crate], [3, 12, TILE.crate], [9, 9, TILE.flowerY]] }),
    npcs: [{ id: "sailor", sprite: "oldman", x: 20, y: 9, dir: 0, lines: "sailor" }, { id: "ella", sprite: "ella", x: 15, y: 18, dir: 0, talk: "c8_mid", lines: "ella_after" }],
    events: [{ x: 5, y: 6, door: "inn" }, { x: 18, y: 6, door: "harbor_arms" }, { x: 5, y: 17, door: "harbor_items" }, { left: true, to: ["capital", 23, 10, 1] }, { right: true, to: ["beach", 1, 6, 2] }] },
  beach: { name: "Gold Shore", ja: "黄金の浜", bg: "beach", area: "beach", enc: { rate: 13, area: "beach" }, build() {
      const m = gMapNew(18, 13, TILE.sand); gRect(m, 0, 0, 18, 2, T(144, 0), true); gRect(m, 15, 0, 3, 13, T(144, 0), true);
      for (const [x, y] of [[4, 4], [9, 9], [12, 3], [6, 10]]) gPut(m, x, y, TILE.rock, true); gRect(m, 0, 12, 18, 1, T(144, 0), true);
      for (const [x, y, t] of [[3, 7, TILE.tuft], [10, 6, TILE.tuft2], [7, 3, TILE.flowerW]]) gPut(m, x, y, t);
      m.spots = { boss: [13, 6], entry: [1, 6] }; return m; },
    npcs: [{ id: "whale", sprite: "beast", x: 13, y: 6, dir: 1, talk: "c8_boss", hideIf: "c8_done" }],
    chests: [{ id: "bc1", x: 2, y: 2, item: "hiherb", n: 2 }],
    events: [{ left: true, to: ["harbor", 23, 10, 1] }, { x: 14, y: 6, to: ["sea", "entry", null, 3], need: "c8_done" }] },
  sea: { name: "Sunken Archive", ja: "沈んだ書庫", bg: "sea", area: "sea", enc: { rate: 14, area: "sea" }, intro: "c9_enter", build: GD(97, 5, T(144, 0), TILE.floorTile, [T(113, 2), T(165, 4)], [T(7, 6)]),
    npcs: [{ id: "wyrm", sprite: "beast", at: "boss", dir: 0, talk: "c9_boss", hideIf: "c9_done" }],
    chests: [{ id: "se1", at: 0, eq: "aegis" }, { id: "se2", at: 1, item: "hiwater", n: 2 }, { id: "se3", at: 2, eq: "earthbreaker" }],
    events: [{ at: "mid", r: 2, scene: "c9_mid", once: "c9_mid_seen" }, { bottom: true, to: ["beach", 13, 7, 0] }, { top: true, to: ["storm", "entry", null, 3], need: "c9_done" }] },
  storm: { name: "Storm Sky", ja: "嵐の空", bg: "storm", area: "storm", enc: { rate: 13, area: "storm" }, intro: "c10_enter", build: GD(113, 6, T(137, 0), TILE.stoneTile, [T(113, 2)], [T(165, 2)]),
    npcs: [{ id: "lion", sprite: "beast", at: "boss", dir: 0, talk: "c10_boss", hideIf: "c10_done" }],
    chests: [{ id: "st1", at: 0, eq: "redpromise" }, { id: "st2", at: 1, item: "feather", n: 2 }, { id: "st3", at: 3, eq: "starplate" }],
    events: [{ at: "mid", r: 2, scene: "c10_mid", once: "c10_mid_seen" }, { bottom: true, to: ["sea", "exit", null, 0] }, { top: true, to: ["gate", "entry", null, 3], need: "c10_done" }] },
  gate: { name: "Gate of Flame", ja: "炎の門", bg: "gate", area: "gate", enc: { rate: 13, area: "gate" }, intro: "c11_enter", build: GD(127, 5, T(142, 0), TILE.cobbleBrown, [T(123, 4)], [T(124, 7)]),
    npcs: [{ id: "king2", sprite: "king", at: "mid", dir: 0, talk: "c11_mid", lines: "king_gate" }, { id: "ash", sprite: "beast", at: "boss", dir: 0, talk: "c11_boss", hideIf: "c11_done" }],
    chests: [{ id: "gt1", at: 0, item: "hiherb", n: 5 }, { id: "gt2", at: 1, item: "hiwater", n: 3 }],
    events: [{ bottom: true, to: ["storm", "exit", null, 0] }, { top: true, to: ["throne", "entry", null, 3], need: "c11_done" }] },
  throne: { name: "Throne of Oblivion", ja: "忘却の玉座", bg: "throne", area: "throne", enc: { rate: 16, area: "throne" }, intro: "c12_enter", build: GD(139, 4, T(152, 0), T(39, 2), [T(103, 3), T(103, 4)]),
    npcs: [{ id: "queen", sprite: "mio", at: "boss", dir: 0, talk: "c12_boss", hideIf: "c12_done" }],
    chests: [{ id: "th1", at: 0, item: "feather", n: 3 }],
    events: [{ bottom: true, to: ["gate", "exit", null, 0] }] }
});
// 遺跡の奥の門 → 洞窟（騎士を倒したあと）
GMAPS.ruins.events.push({ x: 7, y: 3, to: ["cave", "entry", null, 3], need: "c2_done" });

Object.assign(GLINES, {
  capital_man: [{ who: "villager", en: "\"I gave away the memory of my first love. Now I can't remember why I feel lonely at night.\"", ja: "「初恋の記憶を差し出したんだ。今は、なぜ夜になるとさびしいのか思い出せない。」" }],
  capital_woman: [{ who: "villager", en: "\"The library is beside the item shop, but it's sealed. They say only someone with a true memory can open it.\"", ja: "「図書館は道具屋のとなりよ。でも封印されているの。本当の記憶を持つ人しか開けられないんですって。」" }],
  capital_guard: [{ who: "guard", en: "\"The castle is to the north. His Majesty sees no one... but the doors are strangely open today.\"", ja: "「城は北だ。陛下はだれにもお会いにならない……だが、今日はなぜか扉が開いている。」" }],
  library_closed: [{ who: "lina", en: "\"The library is sealed. We need to find out more inside the castle first.\"", ja: "「図書館は封印されてる。先に城の中で手がかりを探しましょう。」" }],
  harbor_closed: [{ who: "lina", en: "\"Let's go to the Great Library before we leave the capital.\"", ja: "「王都を出る前に、大図書館へ行きましょう。」" }],
  sailor: [{ who: "sailor", en: "\"The beach to the east is guarded by the Golden Whale. Bring strong weapons, young ones.\"", ja: "「東の浜は黄金のクジラが守っている。強い武器を持っていけよ、若いの。」" }],
  ella_after: [{ who: "ella", en: "\"Please bring my father home safely. I still owe him a hundred hugs.\"", ja: "「父を無事に連れて帰ってきてね。まだ百回はハグしなきゃいけないの。」" }],
  king_gate: [{ who: "king", en: "\"Go, boy. The gate will stay open as long as I stand.\"", ja: "「行け、少年。わたしが立っているかぎり、門は開いている。」" }]
});

/* ---- 場面 ---- */
const gLab = (ch, a, b) => () => { const ns = RPG_CHAPTERS.find(c => c.id === ch).nodes, i = ns.findIndex(n => n.label === a), j = b ? ns.findIndex(n => n.label === b) : ns.length; return ns.slice(i, j < 0 ? ns.length : j).filter(n => !n.end); };
Object.assign(GSCENES, {
  c3_enter: gLab("c3", "c3_enter", "c3_camp"), c3_camp: gLab("c3", "c3_camp", "c3_boss"), c3_boss: gLab("c3", "c3_boss"),
  c4_enter: gLab("c4", "c4_enter", "c4_mid"), c4_mid: gLab("c4", "c4_mid", "c4_boss"), c4_boss: gLab("c4", "c4_boss"),
  c5_enter: gLab("c5", "c5_enter", "c5_boss"), c5_boss: gLab("c5", "c5_boss"),
  c6_enter: gLab("c6", "c6_enter", "c6_mid"), c6_mid: gLab("c6", "c6_mid", "c6_boss"), c6_boss: gLab("c6", "c6_boss"),
  c7_enter: gLab("c7", "c7_enter", "c7_mid"), c7_mid: gLab("c7", "c7_mid", "c7_boss"), c7_boss: gLab("c7", "c7_boss"),
  c8_enter: gLab("c8", "c8_enter", "c8_mid"), c8_mid: gLab("c8", "c8_mid", "c8_boss"), c8_boss: gLab("c8", "c8_boss"),
  c9_enter: gLab("c9", "c9_enter", "c9_mid"), c9_mid: gLab("c9", "c9_mid", "c9_boss"), c9_boss: gLab("c9", "c9_boss"),
  c10_enter: gLab("c10", "c10_enter", "c10_mid"), c10_mid: gLab("c10", "c10_mid", "c10_boss"), c10_boss: gLab("c10", "c10_boss"),
  c11_enter: gLab("c11", "c11_enter", "c11_mid"), c11_mid: gLab("c11", "c11_mid", "c11_boss"), c11_boss: gLab("c11", "c11_boss"),
  c12_enter: gLab("c12", "c12_enter", "c12_boss"), c12_boss: gLab("c12", "c12_boss"),
  ep_all: gLab("ep", "ep_all")
});
/* 場面が終わったあと（章のクリアなど） */
const GDONE2 = {
  c3_camp: { join: "garo", msg: ["Garo joined the party!", "ガロが仲間になった！　洞窟の奥にいる番人をたおそう。"] },
  c3_boss: { flag: "c3_done", clear: "c3", msg: ["The way to the capital is open.", "第3章クリア！　レンは旅人の上着を手に入れた。洞窟の北の出口から、王都の地下水路へ進もう。"] },
  c4_boss: { flag: "c4_done", clear: "c4", msg: ["The capital lies ahead.", "第4章クリア！　水路の北から王都へ。王都にはいい武器と防具が売っている。"] },
  c5_boss: { flag: "c5_done", clear: "c5", msg: ["The Hall of Lanterns lies deeper in the castle.", "第5章クリア！　城の奥（北）にある『灯の回廊』へ進もう。"] },
  c6_boss: { flag: "c6_done", clear: "c6", msg: ["The library seal is broken.", "第6章クリア！　王都の大図書館（道具屋のとなり）の封印が解けた。"] },
  c7_boss: { flag: "c7_done", clear: "c7", msg: ["The road to the harbor is open.", "第7章クリア！　王都の東の門から港町へ行けるようになった。"] },
  c8_boss: { flag: "c8_done", clear: "c8", msg: ["A stairway opened in the sea.", "第8章クリア！　浜の東の端から、海の底の書庫へ下りられる。港町で装備を整えよう。"] },
  c9_boss: { flag: "c9_done", clear: "c9", msg: ["A stairway of light rises into the storm.", "第9章クリア！　書庫の北から、嵐の空へ。"] },
  c10_boss: { flag: "c10_done", clear: "c10", msg: ["The floating castle awaits.", "第10章クリア！　北の門から、浮かぶ城へ。"] },
  c11_boss: { flag: "c11_done", clear: "c11", msg: ["The throne room lies beyond.", "第11章クリア！　いよいよ最後の玉座の間へ。準備を整えて進もう。"] },
  c12_boss: { flag: "c12_done", clear: "c12", ending: true }
};
