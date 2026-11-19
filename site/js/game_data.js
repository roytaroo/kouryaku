/* ===== 王道コマンドRPG『Echoes of Aster』のデータ =====
   タイルはぴぽやさんのマップチップ（16pxを2倍で表示）。歩行キャラもぴぽやさん（髪の色などはこっちで塗りかえ）。
   物語の文は rpg_story.js の英文をそのまま使い、場面ごとに切り出して流す（GSCENES）。 */
const T = (r, c) => r * 8 + c;
const TILE = {
  grass: T(0, 0), grassDark: T(0, 1), grassDull: T(0, 3), sand: T(0, 4), dirt: T(0, 5), gravel: T(0, 7),
  treeTL: T(1, 0), treeTR: T(1, 1), treeBL: T(2, 0), treeBR: T(2, 1),
  bush: T(5, 0), bush2: T(5, 1), tuft: T(6, 0), tuft2: T(6, 1), flowerW: T(6, 4), flowerP: T(6, 5), flowerB: T(6, 6), flowerY: T(6, 7),
  rock: T(8, 1), grave: T(8, 3), sign: T(29, 4),
  fenceH: T(23, 1), wallGray: T(31, 2), wallDark: T(31, 4),
  plank: T(36, 0), tileGray: T(36, 1), cobble: T(36, 2), stoneTile: T(36, 3), cobbleBrown: T(37, 2), stoneGray: T(38, 1), floorTile: T(38, 3),
  woodFloor: T(39, 0), yellowLine: T(39, 1), cobbleGray: T(40, 2), stairs: T(40, 6),
  woodWall: T(45, 0), brickWall: T(51, 0), stoneWall: T(57, 0), mossWall: T(55, 0),
  doorTop: T(50, 7), doorBot: T(51, 7), archTop: T(60, 7), archBot: T(61, 7),
  winWallTop: T(60, 0), winWallBot: T(61, 0),
  roofRedTop: T(70, 3), roofRed: T(72, 3), roofBlue: T(71, 2), roofOrange: T(72, 1), roofBrown: T(72, 0),
  window: T(74, 1), window2: T(74, 0),
  signSword: T(82, 0), signShield: T(82, 1), signInn: T(83, 0), signItem: T(83, 2),
  shelfTop: T(89, 3), shelfBot: T(90, 3), sofa: T(100, 3), sofa2: T(100, 4),
  barrelTop: T(111, 4), barrelBot: T(112, 4), crate: T(111, 6),
  pillarTop: T(114, 2), pillarBot: T(115, 2), gargTop: T(114, 4), gargBot: T(115, 4),
  fountain: [T(116, 0), T(116, 1), T(116, 2), T(117, 0), T(117, 1), T(117, 2), T(118, 0), T(118, 1), T(118, 2)],
  bigCanopy: [T(154, 0), T(154, 1), T(154, 2)], bigTrunk: [T(155, 0), T(155, 1), T(155, 2)],
  railA: T(163, 1), railB: T(164, 1), vendTop: T(163, 6), vendBot: T(164, 6)
};

/* ---- マップを組み立てる小さな道具 ---- */
function gMapNew(w, h, base) { const m = { w, h, cells: [], solid: [] }; for (let i = 0; i < w * h; i++) { m.cells.push([base]); m.solid.push(false); } return m; }
function gPut(m, x, y, t, solid) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; const i = y * m.w + x; m.cells[i].push(t); if (solid != null) m.solid[i] = solid; }
function gSet(m, x, y, t, solid) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; const i = y * m.w + x; m.cells[i] = [t]; m.solid[i] = !!solid; }
function gRect(m, x, y, w, h, t, solid, put) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) (put ? gPut : gSet)(m, i, j, t, solid); }
function gTree(m, x, y) { gPut(m, x, y, TILE.treeTL, true); gPut(m, x + 1, y, TILE.treeTR, true); gPut(m, x, y + 1, TILE.treeBL, true); gPut(m, x + 1, y + 1, TILE.treeBR, true); }
function gHouse(m, x, y, w, roof, wall, doorX, sign) {
  gRect(m, x, y, w, 2, roof, true, true);
  gRect(m, x, y + 2, w, 2, wall, true, true);
  for (let i = x + 1; i < x + w - 1; i += 2) if (i !== doorX && i !== doorX - 1 + 1) gPut(m, i, y + 2, TILE.window);
  gPut(m, doorX, y + 2, TILE.doorTop); gPut(m, doorX, y + 3, TILE.doorBot);
  m.solid[(y + 3) * m.w + doorX] = false; // 入口は歩ける（踏むと中に入る）
  if (sign != null) gPut(m, doorX + 1, y + 2, sign);
}

/* ---- マップ ---- */
const GMAPS = {
  station: { name: "Sunset Station", ja: "夕暮れの駅", bg: "station", build() {
    const m = gMapNew(16, 11, TILE.stoneGray);
    gRect(m, 0, 0, 16, 2, TILE.stoneWall, true);
    gRect(m, 11, 2, 1, 9, TILE.yellowLine, false);
    gRect(m, 12, 0, 4, 11, TILE.gravel, true);
    for (let y = 0; y < 11; y++) { gPut(m, 13, y, y % 2 ? TILE.railB : TILE.railA); gPut(m, 14, y, y % 2 ? TILE.railB : TILE.railA); }
    gPut(m, 2, 2, TILE.vendTop, true); gPut(m, 2, 3, TILE.vendBot, true); gPut(m, 4, 2, TILE.vendTop, true); gPut(m, 4, 3, TILE.vendBot, true);
    gRect(m, 6, 6, 3, 1, TILE.sofa, true, true);
    gRect(m, 0, 2, 1, 9, TILE.stoneWall, true); gRect(m, 0, 10, 12, 1, TILE.stoneWall, true);
    return m;
  }, npcs: [], events: [{ x: 3, y: 4, look: "vend" }] },
  train: { name: "The Silver Train", ja: "銀色の列車", bg: "train", build() {
    const m = gMapNew(12, 8, TILE.woodFloor);
    gRect(m, 0, 0, 12, 1, TILE.winWallTop, true); gRect(m, 0, 1, 12, 1, TILE.winWallBot, true);
    for (const y of [2, 6]) for (const x of [1, 2, 4, 5, 7, 8]) gPut(m, x, y, x % 3 === 1 ? TILE.sofa : TILE.sofa2, true);
    gRect(m, 0, 7, 12, 1, TILE.woodWall, true);
    return m;
  }, npcs: [{ id: "conductor", sprite: "conductor", x: 9, y: 4, dir: 1, talk: "p0_train" }] },
  village: { name: "Hollowbrook", ja: "ホロウブルック村", bg: "village", build() {
    const m = gMapNew(26, 22, TILE.grass);
    for (let x = 0; x < 26; x += 2) { if (x !== 12) gTree(m, x, 0); gTree(m, x, 20); }
    for (let y = 2; y < 20; y += 2) { gTree(m, 0, y); gTree(m, 24, y); }
    gRect(m, 12, 0, 2, 2, TILE.dirt, false); // 北の出口（森へ）
    gRect(m, 2, 11, 22, 2, TILE.cobble); gRect(m, 12, 2, 2, 18, TILE.cobble);
    TILE.fountain.forEach((t, i) => gPut(m, 11 + (i % 3), 9 + Math.floor(i / 3), t, true));
    gRect(m, 10, 8, 5, 1, TILE.cobble); gRect(m, 10, 12, 5, 1, TILE.cobble); gRect(m, 10, 8, 1, 5, TILE.cobble); gRect(m, 14, 8, 1, 5, TILE.cobble);
    TILE.fountain.forEach((t, i) => gSet(m, 11 + (i % 3), 9 + Math.floor(i / 3), t, true));
    gHouse(m, 3, 3, 6, TILE.roofBlue, TILE.stoneWall, 5, null);        // 長老の家
    gHouse(m, 16, 3, 6, TILE.roofRed, TILE.woodWall, 18, TILE.signInn); // 宿屋
    gHouse(m, 3, 14, 6, TILE.roofOrange, TILE.brickWall, 5, TILE.signSword); // 武器・防具屋
    gHouse(m, 16, 14, 6, TILE.roofBrown, TILE.woodWall, 18, TILE.signItem);  // 道具屋
    gRect(m, 5, 7, 1, 4, TILE.cobble); gRect(m, 18, 7, 1, 4, TILE.cobble); gRect(m, 5, 13, 1, 1, TILE.cobble); gRect(m, 18, 13, 1, 1, TILE.cobble);
    for (const [x, y, t] of [[2, 9, TILE.flowerP], [3, 9, TILE.flowerW], [22, 9, TILE.flowerY], [21, 9, TILE.flowerB], [8, 18, TILE.flowerW], [20, 18, TILE.flowerP], [9, 9, TILE.flowerY], [16, 9, TILE.flowerW]]) gPut(m, x, y, t);
    for (const [x, y] of [[9, 4], [22, 8], [2, 17], [22, 17]]) gPut(m, x, y, TILE.bush, true);
    gPut(m, 11, 2, TILE.sign, true);
    return m;
  }, npcs: [
    { id: "lina", sprite: "lina", x: 12, y: 13, dir: 0, talk: "c1_intro", hideIf: "lina_joined" },
    { id: "baker", sprite: "baker", x: 15, y: 18, dir: 0, lines: "baker" },
    { id: "boy", sprite: "boy", x: 9, y: 11, dir: 2, lines: "boy" },
    { id: "girl", sprite: "girl", x: 10, y: 13, dir: 3, lines: "girl" },
    { id: "man", sprite: "man", x: 20, y: 11, dir: 1, lines: "man" },
    { id: "oldwoman", sprite: "oldwoman", x: 7, y: 8, dir: 0, lines: "oldwoman" },
    { id: "guard", sprite: "soldier", x: 14, y: 2, dir: 0, lines: "guard" },
    { id: "cat", sprite: "cat", x: 21, y: 13, dir: 1, lines: "cat" }
  ], events: [
    { x: 5, y: 6, door: "cellar", to: ["cellar", 4, 6, 3] },
    { x: 18, y: 6, door: "inn" }, { x: 5, y: 17, door: "armory" }, { x: 18, y: 17, door: "itemshop" },
    { x: 11, y: 2, look: "village_sign" },
    { top: true, to: ["forest", 9, 28, 3], need: "c1_done", block: "c1_block" }
  ] },
  cellar: { name: "Elder's Cellar", ja: "長老の地下室", bg: "cellar", build() {
    const m = gMapNew(10, 8, TILE.stoneGray);
    gRect(m, 0, 0, 10, 2, TILE.wallGray, true); gRect(m, 0, 2, 1, 6, TILE.wallGray, true); gRect(m, 9, 2, 1, 6, TILE.wallGray, true);
    gRect(m, 1, 7, 8, 1, TILE.wallGray, true); gSet(m, 4, 7, TILE.stairs, false);
    for (const x of [1, 2]) { gPut(m, x, 2, TILE.barrelTop, true); gPut(m, x, 3, TILE.barrelBot, true); }
    gPut(m, 8, 2, TILE.crate, true); gPut(m, 7, 2, TILE.crate, true);
    gPut(m, 7, 0, TILE.shelfTop); gPut(m, 7, 1, TILE.shelfBot);
    return m;
  }, npcs: [{ id: "elder", sprite: "elder", x: 5, y: 3, dir: 0, talk: "c1_cellar", lines: "elder_after" }],
  props: [{ sprite: "torch", x: 3, y: 1 }, { sprite: "torch", x: 6, y: 1 }],
  events: [{ x: 4, y: 7, to: ["village", 5, 7, 0] }] },
  forest: { name: "Whispering Forest", ja: "ささやきの森", bg: "forest", enc: { rate: 16, area: "forest" }, build() {
    const W = 18, H = 30, m = gMapNew(W, H, TILE.grassDark);
    const path = (x, y) => { const cx = 8 + Math.round(Math.sin(y / 4.2) * 3.5); return x >= cx - 1 && x <= cx + 1; };
    const clear = (x, y) => (y >= 12 && y <= 16 && x >= 3 && x <= 14) || (y >= 22 && y <= 24 && x >= 11 && x <= 15);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (path(x, y) || clear(x, y)) { if (path(x, y)) gSet(m, x, y, TILE.dirt, false); continue; }
      const v = (x * 7 + y * 3) % 3;
      if (y % 2 === 0) gSet(m, x, y, TILE.grassDark, true), gPut(m, x, y, TILE.bigCanopy[v]); else gSet(m, x, y, TILE.grassDark, true), gPut(m, x, y, TILE.bigTrunk[(x * 7 + (y - 1) * 3) % 3]);
    }
    for (let y = 0; y < H; y++) { gSet(m, 0, y, TILE.grassDark, true); gPut(m, 0, y, y % 2 ? TILE.bigTrunk[0] : TILE.bigCanopy[0]); gSet(m, W - 1, y, TILE.grassDark, true); gPut(m, W - 1, y, y % 2 ? TILE.bigTrunk[1] : TILE.bigCanopy[1]); }
    for (const [x, y, t] of [[4, 13, TILE.flowerW], [6, 15, TILE.tuft], [12, 14, TILE.flowerB], [13, 16, TILE.tuft2], [5, 12, TILE.tuft2], [12, 23, TILE.flowerW], [14, 22, TILE.tuft]]) gPut(m, x, y, t);
    gPut(m, 4, 16, TILE.rock, true); gPut(m, 14, 12, TILE.bush2, true);
    return m;
  }, npcs: [], chests: [{ id: "f1", x: 14, y: 23, item: "herb", n: 3 }, { id: "f2", x: 3, y: 14, gold: 40 }],
  events: [{ rowLE: 16, scene: "c2_forest", once: "c2_forest_seen" }, { bottom: true, to: ["village", 12, 1, 0] }, { top: true, to: ["ruins", 7, 14, 3] }] },
  ruins: { name: "Shrine Ruins", ja: "ほこらの遺跡", bg: "ruins", enc: { rate: 14, area: "ruins" }, build() {
    const m = gMapNew(16, 16, TILE.grassDull);
    gRect(m, 4, 2, 8, 13, TILE.cobbleGray);
    gRect(m, 0, 0, 16, 1, TILE.wallGray, true); gRect(m, 0, 1, 7, 1, TILE.wallGray, true); gRect(m, 9, 1, 7, 1, TILE.wallGray, true);
    gSet(m, 7, 1, TILE.archTop, true); gSet(m, 8, 1, TILE.archTop, true); gSet(m, 7, 0, TILE.wallDark, true); gSet(m, 8, 0, TILE.wallDark, true);
    for (const [x, y] of [[4, 4], [11, 4], [4, 9], [11, 9]]) { gPut(m, x, y, TILE.pillarTop, true); gPut(m, x, y + 1, TILE.pillarBot, true); }
    for (const [x, y] of [[1, 5], [2, 5], [13, 7], [14, 7], [1, 11], [14, 12]]) gSet(m, x, y, TILE.wallGray, true);
    gPut(m, 6, 2, TILE.gargTop, true); gPut(m, 6, 3, TILE.gargBot, true); gPut(m, 9, 2, TILE.gargTop, true); gPut(m, 9, 3, TILE.gargBot, true);
    for (const [x, y, t] of [[2, 8, TILE.tuft], [13, 10, TILE.flowerW], [1, 14, TILE.tuft2], [14, 3, TILE.bush2]]) gPut(m, x, y, t, t === TILE.bush2);
    gRect(m, 0, 15, 7, 1, TILE.wallGray, true); gRect(m, 9, 15, 7, 1, TILE.wallGray, true);
    return m;
  }, npcs: [{ id: "knight", sprite: "knight", x: 7, y: 3, dir: 0, talk: "c2_knight", hideIf: "c2_done" }],
  chests: [{ id: "r1", x: 1, y: 13, eq: "ironsword" }, { id: "r2", x: 14, y: 2, item: "water", n: 2 }],
  events: [{ bottom: true, to: ["forest", 8, 1, 0] }] }
};

/* ---- 町の人のせりふ（英語＋日本語） ---- */
const GLINES = {
  baker: [{ who: "baker", en: "\"Fresh bread! The price? Hmm... I wrote it on a card, but I can't read my own handwriting anymore.\"", ja: "「焼きたてのパンだよ！お値段？うーん……札に書いたんだけど、もう自分の字が読めなくて。」" }],
  boy: [{ who: "child", en: "\"That girl over there is my best friend. I think. She told me so this morning.\"", ja: "「あそこの子、ぼくの親友なんだ。たぶん。今朝、本人がそう言ってた。」" }],
  girl: [{ who: "child", en: "\"I keep a diary so I don't forget. But some pages are turning gray.\"", ja: "「忘れないように日記をつけてるの。でも、ページがところどころ灰色になってきてる。」" }],
  man: [{ who: "villager", en: "\"I've lived here for forty years, but every morning the streets look a little less familiar.\"", ja: "「この村に40年住んでるが、毎朝、通りが少しずつ見慣れないものになっていくんだ。」" }],
  oldwoman: [{ who: "villager", en: "\"Elder Bram lives in the house with the blue roof. He has been sitting in his cellar for days.\"", ja: "「ブラム長老は青い屋根の家に住んでいるよ。もう何日も地下室にこもっているんだ。」" }],
  guard: [{ who: "guard", en: "\"The road north leads to the Whispering Forest. Monsters appear there, so prepare well before you go.\"", ja: "「北の道はささやきの森へ続いている。魔物が出るから、しっかり準備してから行くんだ。」" }],
  cat: [{ who: null, en: "The cat stares at Ren as if it remembers something he doesn't.", ja: "猫は、レンが覚えていない何かを覚えているかのように、じっと彼を見つめている。" }],
  elder_after: [{ who: "elder", en: "\"The shrine lies beyond the forest to the north. Be careful, young man.\"", ja: "「ほこらは北の森の先じゃ。気をつけてな、若いの。」" }],
  vend: [{ who: null, en: "A vending machine. All the labels are blank, as if someone has erased them.", ja: "自動販売機。ラベルがすべて白紙になっている。まるでだれかが消してしまったかのように。" }],
  village_sign: [{ who: null, en: "\"Welcome to Hollowbrook.\" Below it, someone has written: \"Please don't forget us.\"", ja: "「ようこそホロウブルックへ」。その下に、だれかがこう書いている。「どうか、わたしたちを忘れないで。」" }],
  c1_block: [{ who: "lina", en: "\"Let's talk to Elder Bram before we leave the village.\"", ja: "「村を出る前に、ブラム長老に話を聞きに行きましょう。」" }]
};
const GEXTRA_CAST = { child: { name: "Child", ja: "子ども" }, villager: { name: "Villager", ja: "村人" }, guard: { name: "Guard", ja: "門番" } };

/* ---- 場面：rpg_story.js の章から、英文の書き出しで範囲を切り出す ---- */
function gSlice(ch, from, to) {
  const ns = RPG_CHAPTERS[ch].nodes, find = s => s == null ? ns.length : ns.findIndex(n => n.en && n.en.startsWith(s) || n.label === s);
  const a = from == null ? 0 : find(from), b = find(to);
  return ns.slice(a, b).filter(n => !n.end);
}
const GSCENES = {
  p0_station: () => gSlice(0, null, "\"Before we arrive"),
  p0_train: () => gSlice(0, "\"Before we arrive", null).filter(n => !n.battle),
  c1_intro: () => gSlice(1, null, "The elder's house had a cellar"),
  c1_cellar: () => gSlice(1, "The elder's house had a cellar", "That night"),
  c1_night: () => gSlice(1, "That night", null),
  c2_forest: () => gSlice(2, null, "gate"),
  c2_knight: () => gSlice(2, "gate", null)
};

/* ---- 仲間・成長・技 ---- */
const GHEROES = {
  ren: { name: "Ren", ja: "レン", face: "ren", base: { hp: 32, mp: 8, atk: 9, def: 5, mag: 3, spd: 6 }, grow: { hp: 7, mp: 2, atk: 3, def: 2, mag: 1, spd: 1 }, eq: { w: "woodsword", a: "uniform" },
    skills: [{ lv: 2, line: ["power", "flame", "crimson"] }, { lv: 3, id: "wordblade" }] },
  lina: { name: "Lina", ja: "リナ", face: "lina", base: { hp: 24, mp: 18, atk: 4, def: 4, mag: 9, spd: 7 }, grow: { hp: 4, mp: 4, atk: 1, def: 1, mag: 3, spd: 1 }, eq: { w: "oakstaff", a: "robe" },
    skills: [{ lv: 1, line: ["heal", "healplus", "grace"] }, { lv: 1, line: ["spark", "lumen", "starfall"] }, { lv: 4, id: "wordlight" }] }
};
const GSKILLS = {
  power: { name: "Power Strike", ja: "パワーストライク", mp: 2, kind: "atk", pow: 1.7, evo: { lv: 6, to: "flame" } },
  flame: { name: "Flame Strike", ja: "フレイムストライク", mp: 3, kind: "atk", pow: 2.4, evo: { lv: 11, to: "crimson" } },
  crimson: { name: "Crimson Edge", ja: "クリムゾンエッジ", mp: 5, kind: "atk", pow: 3.4 },
  wordblade: { name: "Word Blade", ja: "ワードブレード", mp: 3, kind: "atk", pow: 3.6, word: true, desc: "英単語に正解すると大ダメージ" },
  heal: { name: "Heal", ja: "ヒール", mp: 3, kind: "heal", pow: 2.4, evo: { lv: 6, to: "healplus" } },
  healplus: { name: "Heal+", ja: "ヒール＋", mp: 5, kind: "heal", pow: 4.5, evo: { lv: 12, to: "grace" } },
  grace: { name: "Grace", ja: "グレイス", mp: 9, kind: "healall", pow: 4 },
  spark: { name: "Spark", ja: "スパーク", mp: 2, kind: "mag", pow: 1.9, evo: { lv: 5, to: "lumen" } },
  lumen: { name: "Lumen", ja: "ルーメン", mp: 4, kind: "mag", pow: 2.9, evo: { lv: 10, to: "starfall" } },
  starfall: { name: "Starfall", ja: "スターフォール", mp: 8, kind: "magall", pow: 2.6 },
  wordlight: { name: "Word Light", ja: "ワードライト", mp: 4, kind: "magall", pow: 2.8, word: true, desc: "英単語に正解すると敵全体に大ダメージ" }
};
const gNeed = lv => Math.round(10 * Math.pow(lv, 2.1)); // その次のレベルまでに必要な累計経験値

/* ---- 道具・装備・お店 ---- */
const GITEMS = {
  herb: { name: "Healing Herb", ja: "薬草", price: 8, heal: 35, icon: 1, desc: "HPを35回復" },
  water: { name: "Magic Water", ja: "魔法の水", price: 24, mp: 15, icon: 13, desc: "MPを15回復" },
  feather: { name: "Phoenix Feather", ja: "不死鳥の羽", price: 60, revive: 0.5, icon: 25, desc: "倒れた仲間をHP半分で復活" }
};
const GEQUIP = {
  woodsword: { name: "Wooden Sword", ja: "木の剣", slot: "w", who: "ren", atk: 3, price: 10 },
  bronzesword: { name: "Bronze Sword", ja: "銅の剣", slot: "w", who: "ren", atk: 7, price: 60 },
  ironsword: { name: "Iron Sword", ja: "鉄の剣", slot: "w", who: "ren", atk: 12, price: 190 },
  oakstaff: { name: "Oak Staff", ja: "樫の杖", slot: "w", who: "lina", atk: 1, mag: 3, price: 10 },
  silverrod: { name: "Silver Rod", ja: "銀のロッド", slot: "w", who: "lina", atk: 3, mag: 7, price: 130 },
  uniform: { name: "School Uniform", ja: "学生服", slot: "a", who: "ren", def: 2, price: 0 },
  leather: { name: "Leather Vest", ja: "革のベスト", slot: "a", who: "ren", def: 6, price: 70 },
  chain: { name: "Chain Mail", ja: "鎖かたびら", slot: "a", who: "ren", def: 11, price: 210 },
  robe: { name: "Librarian Robe", ja: "図書館のローブ", slot: "a", who: "lina", def: 3, price: 0 },
  silk: { name: "Silk Cloak", ja: "絹のマント", slot: "a", who: "lina", def: 7, mag: 2, price: 120 }
};
const GSHOPS = { armory: ["bronzesword", "ironsword", "silverrod", "leather", "chain", "silk"], itemshop: ["herb", "water", "feather"] };
const GINN_PRICE = 10;

/* ---- 敵（絵はモケモさんの110体） ---- */
const GFOES = {
  slime: { mon: 1, name: "Drool Slime", ja: "よだれスライム", hp: 16, atk: 7, def: 2, spd: 3, exp: 5, gold: 4 },
  imp: { mon: 8, name: "Moss Imp", ja: "こけのインプ", hp: 22, atk: 9, def: 3, spd: 6, exp: 7, gold: 6 },
  sprite: { mon: 21, name: "Leaf Sprite", ja: "リーフスプライト", hp: 18, atk: 8, def: 2, spd: 9, exp: 6, gold: 5 },
  hedgehog: { mon: 33, name: "Thorn Hedgehog", ja: "いばらハリネズミ", hp: 30, atk: 11, def: 6, spd: 4, exp: 10, gold: 8 },
  owl: { mon: 22, name: "Watcher Owl", ja: "見張りフクロウ", hp: 26, atk: 10, def: 4, spd: 8, exp: 9, gold: 9 },
  ent: { mon: 46, name: "Stump Ent", ja: "切り株のエント", hp: 55, atk: 14, def: 8, spd: 2, exp: 20, gold: 15 },
  goblin: { mon: 9, name: "Shell Goblin", ja: "からゴブリン", hp: 40, atk: 14, def: 7, spd: 6, exp: 16, gold: 14 },
  ghost: { mon: 51, name: "Little Ghost", ja: "ちびゴースト", hp: 34, atk: 13, def: 4, spd: 10, exp: 15, gold: 12 },
  lizard: { mon: 57, name: "Moss Lizard", ja: "こけトカゲ", hp: 48, atk: 16, def: 8, spd: 7, exp: 19, gold: 15 },
  gargoyle: { mon: 7, name: "Iron Gargoyle", ja: "鉄のガーゴイル", hp: 75, atk: 19, def: 12, spd: 5, exp: 32, gold: 26 },
  crow: { mon: 64, name: "Crow Knight", ja: "カラスの騎士", hp: 62, atk: 20, def: 9, spd: 9, exp: 30, gold: 24 },
  // 物語のボス
  hollow: { foe: "hollow", name: "Cellar Hollow", ja: "地下室のホロウ", hp: 60, atk: 9, def: 3, spd: 5, exp: 40, gold: 30, boss: true },
  hknight: { foe: "hknight", name: "The Hollow Knight", ja: "空ろの騎士", hp: 420, atk: 27, def: 14, spd: 8, exp: 220, gold: 150, boss: true }
};
const GAREAS = {
  forest: [["slime"], ["slime", "slime"], ["imp"], ["sprite", "slime"], ["hedgehog"], ["owl"], ["imp", "sprite"], ["ent"]],
  ruins: [["goblin"], ["ghost", "ghost"], ["lizard"], ["goblin", "ghost"], ["gargoyle"], ["crow"], ["lizard", "ghost"]]
};
const GBOSS_OF = { "Cellar Hollow": "hollow", "The Hollow Knight": "hknight" };
