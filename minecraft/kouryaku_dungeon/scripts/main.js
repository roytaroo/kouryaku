import { world, system, Player, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData, FormCancelationReason, uiManager } from "@minecraft/server-ui";
import { WORDS } from "./words.js";
import { addStat, addCoins, addCoinsQuiet, setBest, showYarikomiMenu, getData } from "./yarikomi.js";
import { showShop } from "./shop.js";
import { gridForm } from "./ui.js";
import "./pets.js";

/* =========================================================
   攻略ダンジョン
   - 敵を攻撃すると頭上に英単語。倒すとその単語を瞬間想起で出題。
   - 即答でコイン。ミスはダメージ（ミスでは死なない）。
   - 単語ごとに覚え具合（0〜5の箱）を記録し、苦手な単語ほどよく出る。
   - ワールドは「キャンプ（ロビー）＋階層ダンジョン」。やり込みはICE BOWのキット。
   ========================================================= */

const COMPASS_NAME = "§r§6攻略コンパス";
const OVERWORLD = "minecraft:overworld";
const MAX_QUEUE = 5;
const BOSS_QUESTIONS = 5;
const BOSS_PASS = 4;
const SETUP_PAGE = 100;
// 出題範囲（単語番号）。ターゲット1900の Part 分けに合わせている
const RANGES = [
  { id: "p1", label: "Part1（1〜800）", lo: 1, hi: 800 },
  { id: "p12", label: "Part1〜2（1〜1500）", lo: 1, hi: 1500 },
  { id: "p2", label: "Part2（801〜1500）", lo: 801, hi: 1500 },
  { id: "p3", label: "Part3（1501〜1900）", lo: 1501, hi: 1900 },
  { id: "all", label: "全部", lo: 1, hi: 1e9 }
];
const FAST_MS = 2000; // これより速く意味が出たら「即答」
// コイン：即答でいちばん稼げる。ミスしても減らない
const COIN = { fast: 3, slow: 1, combo5: 10, room: 15, boss: 50 };
// 出やすさ: 未出題 / 箱0（間違えた）〜箱5（完全に覚えた）
const WEIGHT = { n: 3, 0: 10, 1: 6, 2: 3, 3: 2, 4: 1, 5: 0.4 };


/* ---------- words ---------- */
const INDEX = new Map();
WORDS.forEach(([w], i) => { if (!INDEX.has(w)) INDEX.set(w, i); });

// 「を創り出す；を引き起こす」を、単語帳の優先順に ①を創り出す ②を引き起こす と番号付きにする
const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";
function senses(meaning) {
  return String(meaning).split(/[；;]/).map(x => x.trim()).filter(x => x.length > 0);
}
function numbered(meaning, sep) {
  const ss = senses(meaning);
  if (ss.length <= 1) return String(meaning);
  return ss.map((x, k) => (CIRCLED[k] ?? "・") + x).join(sep);
}
const lines = m => numbered(m, "\n");
const inline = m => numbered(m, " ");

function parts(meaning) {
  return String(meaning)
    .replace(/[（(][^）)]*[）)]/g, "")
    .split(/[、,，;；\/／・]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
// 意味が一部でも重なる単語は、ハズレの選択肢に使わない
function overlaps(a, b) {
  const pa = parts(a), pb = parts(b);
  for (const x of pa) for (const y of pb) {
    if (x === y) return true;
    if (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x))) return true;
  }
  return false;
}

/* ---------- storage (world dynamic properties, chunked JSON) ---------- */
const CHUNK = 8000;
function loadJSON(key, fallback) {
  try {
    const n = world.getDynamicProperty(key + ":n");
    if (typeof n !== "number") return fallback;
    let s = "";
    for (let i = 0; i < n; i++) {
      const part = world.getDynamicProperty(key + ":" + i);
      s += typeof part === "string" ? part : "";
    }
    return JSON.parse(s);
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  const s = JSON.stringify(value);
  const n = Math.max(1, Math.ceil(s.length / CHUNK));
  const old = world.getDynamicProperty(key + ":n");
  for (let i = 0; i < n; i++) world.setDynamicProperty(key + ":" + i, s.slice(i * CHUNK, (i + 1) * CHUNK));
  if (typeof old === "number") for (let i = n; i < old; i++) world.setDynamicProperty(key + ":" + i, undefined);
  world.setDynamicProperty(key + ":n", n);
}

/** @type {any} */
let S = null;
let dirty = false;
function st() {
  if (!S) {
    S = {
      box: loadJSON("kr:box", {}),
      miss: loadJSON("kr:miss", {}),
      stats: Object.assign({ ans: 0, ok: 0, best: 0, combo: 0, clears: 0 }, loadJSON("kr:stats", {})),
      cfg: Object.assign({ outside: true, dmg: 4, mode: "recall", limit: 3, range: "p1" }, loadJSON("kr:cfg", {})),
      dun: loadJSON("kr:dun", null),
      camp: loadJSON("kr:camp", null),
      prog: Object.assign({ max: 0 }, loadJSON("kr:prog", {})),
      run: loadJSON("kr:run", null)
    };
    // 1.1系の「その場の地下に作るダンジョン」は階層ダンジョンに置き換えたので捨てる
    if (S.dun && !S.dun.floor) S.dun = null;
  }
  return S;
}
function saveAll() {
  if (!S) return;
  saveJSON("kr:box", S.box);
  saveJSON("kr:miss", S.miss);
  saveJSON("kr:stats", S.stats);
  saveJSON("kr:cfg", S.cfg);
  saveJSON("kr:dun", S.dun);
  saveJSON("kr:camp", S.camp);
  saveJSON("kr:prog", S.prog);
  saveJSON("kr:run", S.run);
}
system.runInterval(() => {
  if (!dirty) return;
  dirty = false;
  try { saveAll(); } catch (e) { console.warn("[kouryaku] save failed: " + e); }
}, 40);

/* ---------- word selection ---------- */
function numOf(i) {
  const n = parseInt(WORDS[i][2], 10);
  return isNaN(n) ? i + 1 : n;
}
function range() {
  return RANGES.find(r => r.id === st().cfg.range) ?? RANGES[0];
}
/** sc: 出題する単語番号の範囲 {lo, hi}。省略すると設定の出題範囲
 * @param {number} i @param {{lo: number, hi: number}} [sc] */
function inRange(i, sc = range()) {
  const n = numOf(i);
  return n >= sc.lo && n <= sc.hi;
}
/** @param {{lo: number, hi: number}} [sc] */
function rangeList(sc = range()) {
  return WORDS.map((_, i) => i).filter(i => inRange(i, sc));
}
// ダンジョンは「1階 = 単語100語」。その階の単語を全部覚えていれば楽に勝てる
const FLOOR_WORDS = 100;
let floorCountCache = 0;
function floorCount() {
  if (!floorCountCache) floorCountCache = Math.max(1, Math.ceil(Math.max(...WORDS.map((_, i) => numOf(i))) / FLOOR_WORDS));
  return floorCountCache;
}
/** n階の単語の範囲。最後の階より深いところ（無限の深淵）は全単語 */
function floorScope(n) {
  return n <= floorCount() ? { lo: (n - 1) * FLOOR_WORDS + 1, hi: n * FLOOR_WORDS } : { lo: 1, hi: 1e9 };
}
/** その範囲で「覚えた」（箱4以上）の割合 */
function mastery(sc) {
  const list = rangeList(sc), box = st().box;
  if (!list.length) return 0;
  return list.filter(i => (box[WORDS[i][0]] ?? -1) >= 4).length / list.length;
}
function weightOf(i) {
  const b = st().box[WORDS[i][0]];
  return b === undefined ? WEIGHT.n : WEIGHT[b] ?? 1;
}
/** @param {Set<number>} [avoid] @param {{lo: number, hi: number}} [sc] */
function pickWord(avoid, sc = range()) {
  let total = 0;
  const ws = new Array(WORDS.length);
  for (let i = 0; i < WORDS.length; i++) {
    const w = (avoid && avoid.has(i)) || !inRange(i, sc) ? 0 : weightOf(i);
    ws[i] = w;
    total += w;
  }
  if (total <= 0) {
    const list = rangeList(sc);
    return list.length ? list[Math.floor(Math.random() * list.length)] : Math.floor(Math.random() * WORDS.length);
  }
  let r = Math.random() * total;
  for (let i = 0; i < WORDS.length; i++) {
    r -= ws[i];
    if (r <= 0) return i;
  }
  return WORDS.length - 1;
}
function isWeak(i) {
  const w = WORDS[i][0];
  return st().box[w] === 0 && (st().miss[w] ?? 0) > 0;
}
/** 苦手な順にn語（足りなければ出やすさで補う） @param {number} n @param {{lo: number, hi: number}} [sc] */
function weakest(n, sc = range()) {
  const s = st();
  const ranked = WORDS.map((_, i) => i)
    .filter(i => inRange(i, sc) && (s.miss[WORDS[i][0]] ?? 0) > 0)
    .sort((a, b) => {
      const ba = s.box[WORDS[a][0]] ?? 0, bb = s.box[WORDS[b][0]] ?? 0;
      if (ba !== bb) return ba - bb;
      return (s.miss[WORDS[b][0]] ?? 0) - (s.miss[WORDS[a][0]] ?? 0);
    })
    .slice(0, n);
  const used = new Set(ranked);
  const size = rangeList(sc).length;
  while (ranked.length < n && used.size < size) {
    const i = pickWord(used, sc);
    used.add(i);
    ranked.push(i);
  }
  return ranked;
}
function choicesFor(i) {
  const correct = WORDS[i][1];
  const picked = [correct];
  for (let tries = 0; picked.length < 4 && tries < 400; tries++) {
    const j = Math.floor(Math.random() * WORDS.length);
    if (j === i) continue;
    const m = WORDS[j][1];
    if (picked.some(p => p === m || overlaps(p, m))) continue;
    picked.push(m);
  }
  for (let k = picked.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [picked[k], picked[r]] = [picked[r], picked[k]];
  }
  return { list: picked, answer: picked.indexOf(correct) };
}
function short(text, max = 28) {
  const t = String(text);
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

/* ---------- helpers ---------- */
function wait(ticks) {
  return new Promise(res => system.runTimeout(() => res(undefined), ticks));
}
function isMonster(e) {
  try { return e.matches({ families: ["monster"] }); } catch (err) { return false; }
}
/** @param {Player} p @param {number} dmg */
function hurtSafely(p, dmg) {
  try {
    const hp = /** @type {any} */ (p.getComponent("minecraft:health"));
    const cur = hp ? hp.currentValue : 20;
    const amount = Math.min(dmg, Math.max(0, cur - 2));
    if (amount > 0) p.applyDamage(amount);
  } catch (e) {}
}
function sound(p, id) { try { p.playSound(id); } catch (e) {} }
function cmd(dim, c) {
  try { dim.runCommand(c); } catch (e) { console.warn("[kouryaku] command failed: " + c + " / " + e); }
}
function title(p, main, sub) {
  try { p.onScreenDisplay.setTitle(main, { fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10, subtitle: sub }); } catch (e) {}
}

/** フォームを出す。インベントリ等を開いていて出せない時は少し待って出し直す */
async function showForm(p, form) {
  let res = await form.show(p);
  for (let tries = 0; tries < 60 && res.canceled && res.cancelationReason === FormCancelationReason.UserBusy && p.isValid; tries++) {
    await wait(10);
    res = await form.show(p);
  }
  return res;
}

/* ---------- UI（ICE BOW のやり込みキットと同じ見た目：アイコン付きボタン、太字＋灰色の補足、ゲージ） ---------- */
const bar = (r, n = 10) => { const f = Math.max(0, Math.min(n, Math.floor(r * n))); return "§a" + "|".repeat(f) + "§8" + "|".repeat(n - f) + "§r"; };
const ICON = {
  camp: "textures/items/bed_red", dungeon: "textures/items/iron_sword", boss: "textures/items/diamond_sword",
  resume: "textures/items/ender_pearl", book: "textures/items/book_enchanted", setup: "textures/items/book_writable",
  test: "textures/items/paper", stats: "textures/items/map_filled", settings: "textures/items/redstone_dust",
  yarikomi: "textures/items/nether_star", shop: "textures/items/emerald", back: "textures/items/arrow",
  ok: "textures/items/dye_powder_lime", ng: "textures/items/dye_powder_red", think: "textures/items/glowstone_dust",
  range: "textures/items/map_empty", mode: "textures/items/book_normal", clock: "textures/items/clock_item",
  heart: "textures/items/apple_golden"
};
/** @param {Player} p */
function profileLine(p) {
  const d = getData(p);
  return "§fLv." + d.lv + "  §eコイン " + d.coin;
}
/**
 * アイコン付きボタンのメニューを出して、押されたボタンの処理を実行する。
 * grid=true なら ICE BOW と同じ3列のタイル（リソースパックの ui/server_form.json）。説明が長い画面は縦並び。
 * @param {Player} p @param {string} titleText @param {string} body
 * @param {Array<[string, string | null, () => any]>} items
 * @param {boolean} [grid]
 */
async function menu(p, titleText, body, items, grid = true) {
  const plain = s => s.replace(/^§l/, "");
  /** @type {any} */
  let f;
  if (grid) {
    f = gridForm(plain(titleText)).body(body);
    items.forEach(([label, icon]) => f.button(plain(label), icon ?? undefined));
  } else {
    f = new ActionFormData().title(titleText).body(body + "\n ");
    items.forEach(([label, icon]) => { if (icon) f.button(label, icon); else f.button(label); });
  }
  const r = await showForm(p, f);
  if (r.canceled || r.selection === undefined) return;
  await items[r.selection][2]();
}
const comboGauge = c => "§6コンボ " + c + " " + bar((c % 5) / 5, 5);

/* ---------- word tags on mobs ---------- */
const mobWord = new Map(); // entity id -> word index
function tagWord(e, i) {
  mobWord.set(e.id, i);
  try {
    e.setDynamicProperty("kr:w", WORDS[i][0]);
    if (!e.hasTag("kr_boss")) e.nameTag = (isWeak(i) ? "§c" : "§f") + WORDS[i][0];
    if (isWeak(i)) {
      e.addEffect("speed", 20 * 600, { amplifier: 0, showParticles: false });
      e.addEffect("strength", 20 * 600, { amplifier: 0, showParticles: false });
    }
  } catch (err) {}
}
function wordOf(e) {
  const known = mobWord.get(e.id);
  if (known !== undefined) return known;
  try {
    const w = e.getDynamicProperty("kr:w");
    if (typeof w === "string" && INDEX.has(w)) return INDEX.get(w);
  } catch (err) {}
  return undefined;
}

/* ---------- question queue (one form at a time per player) ---------- */
/** @type {Map<string, Array<() => Promise<void>>>} */
const queues = new Map();
const running = new Set();
/** @param {Player} p */
function enqueue(p, task) {
  const q = queues.get(p.id) ?? [];
  if (q.length >= MAX_QUEUE) return;
  q.push(task);
  queues.set(p.id, q);
  if (!running.has(p.id)) runQueue(p);
}
/** @param {Player} p */
async function runQueue(p) {
  running.add(p.id);
  const q = queues.get(p.id) ?? [];
  while (q.length) {
    const task = q.shift();
    if (!p.isValid) break;
    try { await task(); } catch (e) { console.warn("[kouryaku] " + e); }
  }
  queues.delete(p.id);
  running.delete(p.id);
}

/**
 * 1問出す。
 * @param {Player} p
 * @param {number} i word index
 * @param {{title?: string, dmg?: number, reward?: boolean, progress?: string}} [opt]
 */
async function askOne(p, i, opt = {}) {
  const s = st();
  const [word, meaning] = WORDS[i];
  const head = (opt.progress ? "§f" + opt.progress + "   " : "") + comboGauge(s.stats.combo);
  const no = WORDS[i][2] ? "§8No." + WORDS[i][2] + "§r\n" : "";
  let ok = false, ms = 0, missLabel = "§cミス！ ", revealed = false;

  if (s.cfg.mode === "choice") {
    // 4択モード
    const ch = choicesFor(i);
    const form = new ActionFormData()
      .title(opt.title ?? "§l英単語バトル")
      .body(head + "\n\n" + no + "§l§e" + word + "§r\n\n§7この単語の意味は？\n ");
    ch.list.forEach(m => form.button(short(inline(m))));
    const t0 = Date.now();
    const res = await showForm(p, form);
    ms = Date.now() - t0;
    ok = !res.canceled && res.selection === ch.answer;
    if (res.canceled) missLabel = "§c逃げた！ ";
  } else {
    // 瞬間想起モード：①英単語だけを見て、制限時間内に意味を思い浮かべる ②意味を見て自己判定
    const limitMs = s.cfg.limit * 1000;
    const f1 = new ActionFormData()
      .title(opt.title ?? "§l英単語バトル")
      .body(head + "\n\n" + no + "§l§e" + word + "§r\n\n§7見た瞬間に意味を思い浮かべて押せ  §8制限 " + s.cfg.limit + "秒\n ")
      .button("§l§2浮かんだ", ICON.think)
      .button("§4わからない", ICON.ng);
    let r1 = null, timedOut = false;
    for (let tries = 0; tries < 60 && p.isValid; tries++) {
      timedOut = false;
      const t0 = Date.now();
      // 画面が開くまでの時間を少し足して締め切る
      const timer = system.runTimeout(() => { timedOut = true; try { uiManager.closeAllForms(p); } catch (e) {} }, Math.ceil(limitMs / 50) + 6);
      r1 = await f1.show(p);
      system.clearRun(timer);
      ms = Date.now() - t0;
      if (r1.canceled && r1.cancelationReason === FormCancelationReason.UserBusy && !timedOut) { await wait(10); continue; }
      break;
    }
    if (!p.isValid || !r1) return { ok: false, fast: false };
    if (!r1.canceled && r1.selection === 0 && !timedOut) {
      const f2 = new ActionFormData()
        .title(opt.title ?? "§l英単語バトル")
        .body(head + "\n\n" + no + "§l§e" + word + "§r\n\n§f" + lines(meaning) + "\n\n§7思い浮かべた意味は合ってた？  §8" + (ms / 1000).toFixed(1) + "秒\n ")
        .button("§l§2○ 合ってた", ICON.ok)
        .button("§4× 違った", ICON.ng);
      const r2 = await showForm(p, f2);
      ok = !r2.canceled && r2.selection === 0;
      revealed = true;
    } else {
      missLabel = timedOut ? "§c時間切れ！ " : r1.canceled ? "§c逃げた！ " : "§cわからない… ";
    }
  }
  if (!p.isValid) return { ok, fast: false };
  const fast = ok && ms <= FAST_MS;

  // 記録：即答できた時だけ「覚えた」に近づく。遅い正解は据え置き
  const b = s.box[word];
  const wasLearned = (b ?? -1) >= 4;
  if (fast) s.box[word] = b === undefined ? 2 : Math.min(5, b + 1);
  else if (ok) s.box[word] = b === undefined ? 1 : b;
  else { s.box[word] = 0; s.miss[word] = (s.miss[word] ?? 0) + 1; }
  s.stats.ans++;
  if (ok) s.stats.ok++;
  if (fast) { s.stats.combo++; s.stats.best = Math.max(s.stats.best, s.stats.combo); }
  else if (!ok) s.stats.combo = 0;
  dirty = true;

  // やり込み（ミッション・コイン）
  if (ok) addStat(p, "ok");
  if (fast) { addStat(p, "fast"); setBest(p, "combo", s.stats.combo); }
  if (!wasLearned && (s.box[word] ?? 0) >= 4) addStat(p, "learned");
  onAnswer(p, ok, fast, s.stats.combo);
  const earn = Math.round((opt.reward === false ? 0 : fast ? COIN.fast + (s.stats.combo % 5 === 0 ? COIN.combo5 : 0) : ok ? COIN.slow : 0) * coinMult());
  const coinText = earn ? "  §e+" + earn + "コイン" : "";
  if (earn) addCoinsQuiet(p, earn);

  const sec = (ms / 1000).toFixed(1) + "秒";
  if (fast) {
    sound(p, "random.orb");
    p.onScreenDisplay.setActionBar("§b即答！ §f" + word + " = " + inline(meaning) + "  §7" + sec + "  §eコンボ " + s.stats.combo + coinText);
    if (opt.reward !== false && s.stats.combo % 5 === 0) {
      sound(p, "random.levelup");
      p.sendMessage("§6§l" + s.stats.combo + "コンボ！ §r§eボーナス+" + COIN.combo5 + "コインと回復");
      try { p.addEffect("regeneration", 100, { amplifier: 1 }); } catch (e) {}
    }
  } else if (ok) {
    sound(p, "random.orb");
    p.onScreenDisplay.setActionBar("§e正解。でも遅い（" + sec + "）§f " + word + " = " + inline(meaning) + coinText);
  } else {
    sound(p, "note.bass");
    p.onScreenDisplay.setActionBar(missLabel + "§f" + word + " = " + inline(meaning));
    p.sendMessage("§c× §f" + word + " §7= §f" + inline(meaning));
    hurtSafely(p, Math.ceil((opt.dmg ?? s.cfg.dmg) * missDmgMult()));
    // 意味をまだ見ていない時（わからない・時間切れ・4択のミス）は、その場で答えを見せる
    if (!revealed && p.isValid) {
      const fa = new ActionFormData()
        .title(opt.title ?? "§l英単語バトル")
        .body(missLabel + "\n\n" + no + "§l§e" + word + "§r\n\n§f" + lines(meaning) + "\n ")
        .button("§l次へ", ICON.back);
      await showForm(p, fa);
    }
  }
  return { ok, fast };
}

/* ---------- events: mobs（単語シールド） ----------
   ダンジョンの敵は「単語シールド」（ダメージ80%カット）を持っている。最初に攻撃すると、その敵の単語が出題される。
   即答 → シールドが割れて、敵は弱体化（楽に倒せる）  遅い正解 → シールドが割れるだけ
   ミス → シールドはそのままで敵が強化。3秒たつと、もう一度攻撃して挑み直せる
   → 単語を覚えていれば楽勝、覚えていなければ苦戦する */
const SHIELD_RES = 3;
world.afterEvents.entityHurt.subscribe(ev => {
  const p = ev.damageSource.damagingEntity;
  if (!(p instanceof Player)) return;
  const e = ev.hurtEntity;
  if (!e.isValid || !isMonster(e)) return;
  if (wordOf(e) === undefined) {
    if (!st().cfg.outside && !e.hasTag("kr_wave")) return;
    tagWord(e, pickWord());
  }
  if (!e.hasTag("kr_shield") || e.hasTag("kr_quiz")) return;
  if (Date.now() < Number(e.getDynamicProperty("kr:retry") ?? 0)) return;
  e.addTag("kr_quiz");
  const idx = wordOf(e);
  enqueue(p, async () => {
    const r = await askOne(p, idx, { title: "§l単語シールド" });
    if (!e.isValid) return;
    try {
      e.removeTag("kr_quiz");
      e.addTag("kr_asked");
      if (r.ok) {
        e.removeTag("kr_shield");
        e.removeEffect("resistance");
        if (r.fast) { e.addEffect("weakness", 20 * 30, { amplifier: 1 }); e.addEffect("slowness", 20 * 30, { amplifier: 1 }); }
        e.nameTag = "§a" + WORDS[idx][0];
        e.dimension.spawnParticle("minecraft:critical_hit_emitter", e.location);
        sound(p, "random.break");
      } else {
        e.setDynamicProperty("kr:retry", Date.now() + 3000);
        e.addEffect("strength", 20 * 20, { amplifier: 1 });
        e.addEffect("speed", 20 * 20, { amplifier: 0 });
        sound(p, "mob.ravager.roar");
      }
    } catch (err) {}
  });
});

// シールドの問題を一度も出さずに倒した敵は、倒した時に出題する
world.afterEvents.entityDie.subscribe(ev => {
  const p = ev.damageSource.damagingEntity;
  if (!(p instanceof Player)) return;
  const e = ev.deadEntity;
  let boss = false, wave = false, asked = false;
  try { boss = e.hasTag("kr_boss"); wave = e.hasTag("kr_wave"); asked = e.hasTag("kr_asked") || e.hasTag("kr_quiz"); } catch (err) {}
  let i = wordOf(e);
  mobWord.delete(e.id);
  if (boss || asked) return; // ボスは部屋の監視側で試練を出す
  if (i === undefined) {
    if (!wave && (!st().cfg.outside || !isMonster(e))) return;
    i = pickWord();
  }
  const idx = i;
  enqueue(p, async () => { await askOne(p, idx); });
});

/* ---------- compass menu ---------- */
function hasCompass(p) {
  const inv = /** @type {any} */ (p.getComponent("minecraft:inventory"));
  const c = inv && inv.container;
  if (!c) return false;
  for (let k = 0; k < c.size; k++) {
    const it = c.getItem(k);
    if (it && it.typeId === "minecraft:compass" && it.nameTag === COMPASS_NAME) return true;
  }
  return false;
}
function giveCompass(p) {
  const inv = /** @type {any} */ (p.getComponent("minecraft:inventory"));
  if (!inv || !inv.container) return;
  const it = new ItemStack("minecraft:compass", 1);
  it.nameTag = COMPASS_NAME;
  it.setLore(["§7使うとメニューが開く"]);
  inv.container.addItem(it);
}

world.beforeEvents.itemUse.subscribe(ev => {
  const it = ev.itemStack;
  if (it.typeId !== "minecraft:compass" || it.nameTag !== COMPASS_NAME) return;
  const p = ev.source;
  system.run(() => openMenu(p));
});

system.afterEvents.scriptEventReceive.subscribe(ev => {
  const p = ev.sourceEntity;
  if (!(p instanceof Player)) return;
  if (ev.id === "kr:menu") openMenu(p);
  if (ev.id === "kr:compass") giveCompass(p);
});

/** @param {Player} p */
async function openMenu(p) {
  if (running.has(p.id)) return;
  const s = st(), inDun = s.dun && isInDungeon(p), judged = judgedCount(), total = rangeList().length;
  /** @type {Array<[string, string | null, () => any]>} */
  const items = [];
  if (inDun) items.push(["§lキャンプに戻る\n§8" + s.dun.floor + "階から帰る", ICON.camp, () => backToCamp(p)]);
  else if (s.camp) items.push(["§lダンジョンへ\n§8最高到達 " + s.prog.max + "階", ICON.dungeon, () => floorMenu(p)]);
  items.push(["§l単語の書\n§8選別 " + judged + "/" + total + "  覚えた " + learnedCount() + "語", ICON.book, () => bookMenu(p)]);
  items.push(["§lやり込み\n§8ミッション・バッジ・自己ベスト", ICON.yarikomi, () => showYarikomiMenu(p)]);
  items.push(["§lショップ\n§8装備・回復・見た目アイテム", ICON.shop, () => showShop(p)]);
  await menu(p, "§l攻略コンパス", profileLine(p) + "\n§7出題範囲 " + range().label + "  正答率 " + rate(), items);
}
function rate() {
  const s = st().stats;
  return s.ans ? Math.round((100 * s.ok) / s.ans) + "%" : "--";
}

/* ---------- setup: 全単語を「分かる／苦手」に選別 ---------- */
function learnedCount() {
  const box = st().box;
  let n = 0;
  for (const i of rangeList()) if ((box[WORDS[i][0]] ?? -1) >= 4) n++;
  return n;
}
function judgedCount() {
  const box = st().box;
  let n = 0;
  for (const i of rangeList()) if (box[WORDS[i][0]] !== undefined) n++;
  return n;
}
/** @param {Player} p */
async function setupMenu(p) {
  const total = rangeList().length, judged = judgedCount(), left = total - judged;
  const body = "§f" + range().label + "\n" + bar(total ? judged / total : 0, 20) + " §7" + judged + "/" + total +
    "\n\n§f英単語を" + SETUP_PAGE + "語ずつ表示する。\n§f知らない・自信がない単語だけONにして「決定」。\n\n" +
    "§cON§f ＝ 苦手：よく出る。敵の名前が赤くなる\n§aOFF§f ＝ 分かる：たまに確認で出る\n\n§7途中でやめても続きから再開できる。";
  /** @type {Array<[string, string | null, () => any]>} */
  const items = [];
  if (left > 0) items.push(["§l続きから選別\n§8残り " + left + "語", ICON.setup, () => runSetup(p, false)]);
  items.push(["§lこの範囲をやり直す\n§8" + total + "語すべて", ICON.mode, () => runSetup(p, true)]);
  items.push(["戻る", ICON.back, () => bookMenu(p)]);
  await menu(p, "§lセットアップ", body, items, false);
}
/** @param {Player} p @param {boolean} all */
async function runSetup(p, all) {
  const s = st();
  const list = rangeList().filter(i => all || s.box[WORDS[i][0]] === undefined);
  let known = 0, weak = 0;
  running.add(p.id);
  try {
    for (let start = 0; start < list.length; start += SETUP_PAGE) {
      const page = list.slice(start, start + SETUP_PAGE);
      const f = new ModalFormData()
        .title("§lセットアップ " + Math.min(start + page.length, list.length) + " / " + list.length)
        .label("§cON§f ＝ 知らない・自信がない    §aOFF§f ＝ 分かる");
      page.forEach(i => f.toggle("§l" + WORDS[i][0] + " §r§7" + numOf(i), { defaultValue: false }));
      f.submitButton("§l決定して次へ");
      const r = await showForm(p, f);
      if (!p.isValid) return;
      if (r.canceled || !r.formValues) {
        p.sendMessage("§6[セットアップ] §fここで中断。次は続きから再開できる（済 " + judgedCount() + " / " + rangeList().length + "）。");
        return;
      }
      // label の分だけ formValues の先頭がずれる場合があるので、真偽値だけを順に拾う
      const marks = r.formValues.filter(v => typeof v === "boolean");
      page.forEach((i, k) => {
        const w = WORDS[i][0];
        if (marks[k]) { s.box[w] = 0; s.miss[w] = Math.max(1, s.miss[w] ?? 0); weak++; }
        else { s.box[w] = 3; known++; }
      });
      dirty = true;
      p.onScreenDisplay.setActionBar("§aセットアップ " + Math.min(start + page.length, list.length) + " / " + list.length + "  §f分かる " + known + "  §c苦手 " + weak);
    }
    saveNow();
    sound(p, "random.levelup");
    p.sendMessage("§6[セットアップ完了] §f分かる §a" + known + "語§f ／ 苦手 §c" + weak + "語§f。苦手な単語から優先して出題する。");
  } finally {
    running.delete(p.id);
    if ((queues.get(p.id) ?? []).length && p.isValid) runQueue(p);
  }
}

/** @param {Player} p */
async function wordTest(p) {
  let ok = 0;
  const used = new Set();
  running.add(p.id);
  try {
    for (let k = 0; k < 10; k++) {
      const i = pickWord(used);
      used.add(i);
      const r = await askOne(p, i, { title: "§l単語テスト " + (k + 1) + "/10", dmg: 0, progress: (k + 1) + "/10" });
      if (r.ok) ok++;
      if (!p.isValid) return;
    }
  } finally {
    running.delete(p.id);
    if ((queues.get(p.id) ?? []).length && p.isValid) runQueue(p);
  }
  p.sendMessage("§6[単語テスト] §f10問中 §e" + ok + "問 §f正解");
  if (ok >= 8) sound(p, "random.levelup");
}

/** @param {Player} p */
async function showStats(p) {
  const s = st(), total = rangeList().length, learned = learnedCount();
  const acc = s.stats.ans ? s.stats.ok / s.stats.ans : 0;
  const weak = weakest(10).filter(i => (s.miss[WORDS[i][0]] ?? 0) > 0);
  const lines = [
    "§6§l― 成績 ―§r",
    "§f正答率  " + bar(acc) + " §7" + rate() + " (" + s.stats.ok + "/" + s.stats.ans + ")",
    "§f覚えた  " + bar(total ? learned / total : 0) + " §7" + learned + "/" + total + "  " + range().label,
    "§fベストコンボ §e" + s.stats.best + "   §f門番撃破 §e" + s.stats.clears + "回   §f最高到達 §e" + s.prog.max + "階",
    "",
    "§c§l― 苦手TOP10 ―§r"
  ];
  if (!weak.length) lines.push("§7まだなし");
  weak.forEach((i, k) => lines.push("§f" + (k + 1) + ". §e" + WORDS[i][0] + "§r " + short(inline(WORDS[i][1]), 20) + " §8ミス" + s.miss[WORDS[i][0]]));
  await menu(p, "§l成績", lines.join("\n"), [["戻る", ICON.back, () => bookMenu(p)]], false);
}

/** @param {Player} p */
async function settings(p) {
  const c = st().cfg;
  const again = fn => () => { fn(); dirty = true; return settings(p); };
  await menu(p, "§l設定", "§7押すと切り替わる", [
    ["§l出題範囲\n§8" + range().label, ICON.range, again(() => {
      const k = RANGES.findIndex(x => x.id === range().id);
      c.range = RANGES[(k + 1) % RANGES.length].id;
    })],
    ["§l出題形式\n§8" + (c.mode === "choice" ? "4択" : "瞬間想起（おすすめ）"), ICON.mode, again(() => { c.mode = c.mode === "choice" ? "recall" : "choice"; })],
    ["§l制限時間\n§8" + c.limit + "秒（瞬間想起）", ICON.clock, again(() => { c.limit = c.limit >= 5 ? 2 : c.limit + 1; })],
    ["§lミスのダメージ\n§8ハート" + c.dmg / 2 + "個", ICON.heart, again(() => { c.dmg = c.dmg >= 6 ? 2 : c.dmg + 2; })],
    ["戻る", ICON.back, () => bookMenu(p)]
  ]);
}

/* =========================================================
   ダンジョンの世界：キャンプ（ロビー）＋ 階層ダンジョン
   - 最初に入ったプレイヤーの場所にキャンプを建てる（フラットワールド想定）
   - キャンプの東に「ダンジョン置き場」を確保し、階に入るたびに作り直す
   ========================================================= */
const CAMP_R = 15;          // キャンプの壁までの距離（内側 29x29）
const SLOT_GAP = 30;        // キャンプの壁からダンジョン置き場まで
const CELL = 19, GRID_W = 5, GRID_H = 3;
const RULES = [
  "gamerule domobspawning false", "gamerule dodaylightcycle false", "time set noon",
  "gamerule doweathercycle false", "weather clear", "gamerule keepinventory true",
  "gamerule mobgriefing false", "gamerule dofiretick false", "gamerule doinsomnia false",
  "gamerule doimmediaterespawn true", "difficulty normal"
];
/** @type {Array<[string, number]>} */
const STARTER = [["minecraft:wooden_sword", 1], ["minecraft:bow", 1], ["minecraft:arrow", 32], ["minecraft:leather_chestplate", 1]];

function saveNow() {
  dirty = false;
  try { saveAll(); } catch (e) { console.warn("[kouryaku] save failed: " + e); }
}
const ow = () => world.getDimension(OVERWORLD);

/* ---------- キャンプ ---------- */
function placeSign(dim, x, y, z, dir, text) {
  cmd(dim, `setblock ${x} ${y} ${z} standing_sign ["ground_sign_direction"=${dir}]`);
  try {
    const b = dim.getBlock({ x, y, z });
    const sign = /** @type {any} */ (b?.getComponent("minecraft:sign"));
    if (sign) { sign.setText(text); try { sign.setText(text, "Back"); } catch (e) {} }
  } catch (e) {}
}
function buildCamp(dim, cx, y, cz) {
  const R = CAMP_R, I = R - 1;
  cmd(dim, `fill ${cx - R} ${y - 1} ${cz - R} ${cx + R} ${y + 10} ${cz + R} deepslate_bricks`);
  cmd(dim, `fill ${cx - I} ${y + 1} ${cz - I} ${cx + I} ${y + 8} ${cz + I} air`);
  cmd(dim, `fill ${cx - I} ${y} ${cz - I} ${cx + I} ${y} ${cz + I} polished_deepslate`);
  cmd(dim, `fill ${cx - 1} ${y} ${cz - I} ${cx + 1} ${y} ${cz + I} deepslate_tiles`);
  cmd(dim, `fill ${cx - I} ${y} ${cz - 1} ${cx + I} ${y} ${cz + 1} deepslate_tiles`);
  for (let ox = -12; ox <= 12; ox += 6) for (let oz = -12; oz <= 12; oz += 6) cmd(dim, `setblock ${cx + ox} ${y + 9} ${cz + oz} shroomlight`);
  for (const [ox, oz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
    cmd(dim, `fill ${cx + ox} ${y + 1} ${cz + oz} ${cx + ox} ${y + 8} ${cz + oz} polished_blackstone_bricks`);
  }
  // 焚き火と切り株の椅子
  cmd(dim, `setblock ${cx} ${y + 1} ${cz} campfire`);
  for (const [ox, oz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) cmd(dim, `setblock ${cx + ox} ${y + 1} ${cz + oz} stripped_spruce_log`);
  // 北：ダンジョンの門
  cmd(dim, `fill ${cx - 3} ${y + 1} ${cz - R} ${cx + 3} ${y + 7} ${cz - R} crying_obsidian`);
  cmd(dim, `fill ${cx - 2} ${y + 1} ${cz - R} ${cx + 2} ${y + 5} ${cz - R} black_concrete`);
  cmd(dim, `fill ${cx - 1} ${y} ${cz - 12} ${cx + 1} ${y} ${cz - 10} obsidian`);
  cmd(dim, `setblock ${cx - 4} ${y + 1} ${cz - I} soul_lantern`);
  cmd(dim, `setblock ${cx + 4} ${y + 1} ${cz - I} soul_lantern`);
  placeSign(dim, cx, y + 1, cz - 13, 0, "§lダンジョン\n§r黒い床に乗ると\n出発");
  // 東：ショップ
  cmd(dim, `fill ${cx + I} ${y + 1} ${cz - 3} ${cx + I} ${y + 1} ${cz + 3} barrel`);
  cmd(dim, `setblock ${cx + I} ${y + 1} ${cz} smithing_table`);
  cmd(dim, `setblock ${cx + I} ${y + 2} ${cz - 3} lantern`);
  cmd(dim, `setblock ${cx + I} ${y + 2} ${cz + 3} lantern`);
  cmd(dim, `fill ${cx + 10} ${y} ${cz - 1} ${cx + 12} ${y} ${cz + 1} gold_block`);
  placeSign(dim, cx + 13, y + 1, cz, 4, "§lショップ\n§r金の床に乗ると\n開く");
  // 西：ミッション掲示板
  cmd(dim, `fill ${cx - I} ${y + 1} ${cz - 3} ${cx - I} ${y + 3} ${cz + 3} bookshelf`);
  cmd(dim, `fill ${cx - 12} ${y} ${cz - 1} ${cx - 10} ${y} ${cz + 1} lapis_block`);
  placeSign(dim, cx - 13, y + 1, cz, 12, "§lミッション\n§r青い床に乗ると\n開く");
  // 南：単語の書
  cmd(dim, `setblock ${cx} ${y + 1} ${cz + 13} enchanting_table`);
  cmd(dim, `fill ${cx - 3} ${y + 1} ${cz + I} ${cx + 3} ${y + 2} ${cz + I} bookshelf`);
  cmd(dim, `fill ${cx - 1} ${y} ${cz + 9} ${cx + 1} ${y} ${cz + 11} amethyst_block`);
  placeSign(dim, cx + 2, y + 1, cz + 12, 8, "§l単語の書\n§r紫の床に乗ると\n開く");
}
const PADS = {
  gate: { x: 0, z: -11, open: p => floorMenu(p) },
  shop: { x: 11, z: 0, open: p => showShop(p) },
  board: { x: -11, z: 0, open: p => showYarikomiMenu(p) },
  book: { x: 0, z: 10, open: p => bookMenu(p) }
};
function campSpawn() {
  const c = st().camp;
  return { x: c.x + 0.5, y: c.y + 1, z: c.z + 6.5 };
}
/** 最初の1回だけ：キャンプを建てて、ルールとダンジョン置き場を用意する */
function ensureWorld(p) {
  const s = st();
  const dim = ow();
  if (!s.camp) {
    if (p.dimension.id !== OVERWORLD) return;
    const cx = Math.floor(p.location.x), cz = Math.floor(p.location.z), y = Math.floor(p.location.y) - 1;
    buildCamp(dim, cx, y, cz);
    const X1 = cx + CAMP_R + SLOT_GAP, Z1 = cz - Math.floor((GRID_H * CELL) / 2);
    s.camp = { x: cx, y, z: cz, slot: { X1, Z1, X2: X1 + GRID_W * CELL - 1, Z2: Z1 + GRID_H * CELL - 1, Y: y } };
    const sl = s.camp.slot;
    cmd(dim, `tickingarea add ${sl.X1 - 1} ${y - 1} ${sl.Z1 - 1} ${sl.X2 + 1} ${y + 7} ${sl.Z2 + 1} kr_dungeon true`);
    cmd(dim, `setworldspawn ${cx} ${y + 1} ${cz + 6}`);
    saveNow();
    p.teleport(campSpawn(), { dimension: dim });
    p.sendMessage("§6[攻略ダンジョン] §fキャンプを建てた。ここが拠点だ。");
  }
  for (const c of RULES) cmd(dim, c);
}
/** プレイヤーの準備：アドベンチャーモード、空腹なし、最初の装備 */
function setupPlayer(p) {
  try { p.runCommand("gamemode adventure @s"); } catch (e) {}
  try { p.addEffect("saturation", 20 * 60, { amplifier: 0, showParticles: false }); } catch (e) {}
  if (p.getDynamicProperty("kr:starter") !== true) {
    const inv = /** @type {any} */ (p.getComponent("minecraft:inventory"));
    for (const [id, n] of STARTER) { try { inv?.container?.addItem(new ItemStack(id, n)); } catch (e) {} }
    p.setDynamicProperty("kr:starter", true);
  }
}
system.runInterval(() => {
  for (const p of world.getPlayers()) { try { p.addEffect("saturation", 20 * 60, { amplifier: 0, showParticles: false }); } catch (e) {} }
}, 20 * 30);

world.afterEvents.playerSpawn.subscribe(ev => {
  const p = ev.player;
  system.runTimeout(() => {
    if (!p.isValid) return;
    if (ev.initialSpawn) {
      ensureWorld(p);
      if (!hasCompass(p)) giveCompass(p);
      p.sendMessage("§6[攻略ダンジョン] §fShiftを2回すばやく押すとメニュー。床の色で行き先が決まる：§8黒§f=ダンジョン  §6金§f=ショップ  §9青§f=ミッション  §d紫§f=単語の書。コンパスでもメニューが開く。");
      const judged = judgedCount(), total = rangeList().length;
      if (judged < total) p.sendMessage("§e最初に「単語の書」→「セットアップ」で、知らない単語を選別しておくのがおすすめ（" + range().label + " 済 " + judged + " / " + total + "）。");
    } else if (st().camp) {
      // 倒れたらキャンプに戻ってくる。祝福は消える
      if (st().run) { st().run = null; dirty = true; p.sendMessage("§c倒れた……祝福は消えた。"); }
      p.teleport(campSpawn(), { dimension: ow() });
    }
    setupPlayer(p);
  }, ev.initialSpawn ? 40 : 2);
});

// キャンプの床（パッド）に乗ったらメニューを開く。降りるまでは開き直さない
const onPad = new Map();
system.runInterval(() => {
  const c = st().camp;
  if (!c) return;
  for (const p of world.getPlayers()) {
    if (p.dimension.id !== OVERWORLD) continue;
    const { x, y, z } = p.location;
    let hit = null;
    if (Math.abs(y - (c.y + 1)) < 1.5) {
      for (const [name, pad] of Object.entries(PADS)) {
        const px = c.x + pad.x, pz = c.z + pad.z;
        if (x >= px - 1 && x < px + 2 && z >= pz - 1 && z < pz + 2) hit = name;
      }
    }
    const prev = onPad.get(p.id);
    onPad.set(p.id, hit);
    if (hit && hit !== prev && !running.has(p.id)) PADS[hit].open(p);
  }
}, 5);

/** @param {Player} p */
async function bookMenu(p) {
  const judged = judgedCount(), total = rangeList().length, learned = learnedCount();
  const body = profileLine(p) + "  §7" + range().label +
    "\n§f選別 " + bar(total ? judged / total : 0) + " §7" + judged + "/" + total +
    "   §f覚えた " + bar(total ? learned / total : 0) + " §7" + learned + "/" + total;
  await menu(p, "§l単語の書", body, [
    ["§lセットアップ\n§8" + (judged >= total ? "この範囲は完了" : "残り " + (total - judged) + "語"), ICON.setup, () => setupMenu(p)],
    ["§l単語テスト\n§810問・ダメージなし・コインあり", ICON.test, () => wordTest(p)],
    ["§l成績\n§8正答率 " + rate() + "・苦手TOP10", ICON.stats, () => showStats(p)],
    ["§l設定\n§8出題範囲・形式・制限時間", ICON.settings, () => settings(p)]
  ]);
}

/* ---------- 階層ダンジョン ---------- */
function isInDungeon(p) {
  const c = st().camp;
  if (!c || p.dimension.id !== OVERWORLD) return false;
  const sl = c.slot, { x, y, z } = p.location;
  return x >= sl.X1 - 1 && x <= sl.X2 + 2 && z >= sl.Z1 - 1 && z <= sl.Z2 + 2 && y >= sl.Y - 1 && y <= sl.Y + 8;
}
function roomAt(d, loc) {
  return d.rooms.findIndex(r => loc.x >= r.x1 + 1 && loc.x < r.x2 && loc.z >= r.z1 + 1 && loc.z < r.z2 && loc.y >= d.Y && loc.y <= d.Y + 6);
}
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
/** グリッド上を、同じマスを通らずに len マス歩く道順 */
function randomPath(len) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const path = [[0, randInt(0, GRID_H - 1)]];
    const seen = new Set([path[0].join(",")]);
    while (path.length < len) {
      const [x, z] = path[path.length - 1];
      const next = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]
        .filter(([a, b]) => a >= 0 && a < GRID_W && b >= 0 && b < GRID_H && !seen.has(a + "," + b));
      if (!next.length) break;
      const n = next[Math.floor(Math.random() * next.length)];
      seen.add(n.join(","));
      path.push(n);
    }
    if (path.length === len) return path;
  }
  return Array.from({ length: Math.min(len, GRID_W) }, (_, k) => [k, 1]);
}
function roomCount(n) { return Math.min(4 + Math.floor((n - 1) / 2), 8); }

// 階ごとの雰囲気（壁・床・明かり・柱）。ブロックが無かった時のために予備も持つ
const THEMES = [
  { from: 1, name: "地下牢", shell: ["deepslate_bricks"], floors: ["polished_deepslate", "deepslate_tiles", "cracked_deepslate_tiles"], light: "sea_lantern", pillar: "deepslate_tiles", sound: "ambient.cave" },
  { from: 5, name: "苔むした遺跡", shell: ["mossy_cobblestone", "cobblestone"], floors: ["mossy_stone_bricks", "mossy_cobblestone", "cobblestone"], light: "glowstone", pillar: "mossy_cobblestone", sound: "ambient.cave" },
  { from: 9, name: "灼熱の砦", shell: ["nether_brick", "red_nether_brick", "blackstone"], floors: ["polished_blackstone_bricks", "red_nether_brick", "blackstone"], light: "shroomlight", pillar: "blackstone", sound: "ambient.nether_wastes.mood" },
  { from: 16, name: "深淵", shell: ["obsidian"], floors: ["sculk", "deepslate_tiles", "crying_obsidian"], light: "sea_lantern", pillar: "crying_obsidian", sound: "ambient.warped_forest.mood" },
  { from: 20, name: "無限の深淵", shell: ["crying_obsidian", "obsidian"], floors: ["sculk", "obsidian", "crying_obsidian"], light: "shroomlight", pillar: "obsidian", sound: "ambient.soulsand_valley.mood" }
];
const themeOf = n => [...THEMES].reverse().find(t => n >= t.from && (t.from < 20 || n > floorCount())) ?? THEMES[0];
/** 「地下牢 3階 No.201-300」 */
function floorLabel(n) {
  const sc = floorScope(n);
  return themeOf(n).name + " " + n + "階" + (n <= floorCount() ? "  No." + sc.lo + "-" + sc.hi : "  全単語");
}
const stars = r => r >= 1 ? "§6★★★" : r >= 0.8 ? "§6★★§8★" : r >= 0.5 ? "§6★§8★★" : "§8★★★";
/** fill を試して、失敗したら次の候補ブロックで試す */
function fillAny(dim, a, blocks) {
  for (const b of blocks) {
    try { dim.runCommand(`fill ${a} ${b}`); return; } catch (e) {}
  }
  cmd(dim, `fill ${a} deepslate_bricks`);
}

// 部屋の種類
const ROOM_INFO = {
  battle:   { name: "戦いの間",   sub: "敵を全員倒すと扉が開く" },
  elite:    { name: "精鋭の間",   sub: "強敵がいる。倒せば祝福とコイン" },
  treasure: { name: "宝物庫",     sub: "中央の宝箱に近づけ" },
  fountain: { name: "癒しの泉",   sub: "中央の光に触れると全回復" },
  shrine:   { name: "単語の祭壇", sub: "中央の祭壇で試練に挑める" },
  boss:     { name: "門番の間",   sub: "門番を倒せ。最後に5問の試練" }
};
function roomTypes(len, n) {
  const types = ["battle"];
  let fountain = false;
  for (let k = 1; k < len - 1; k++) {
    /** @type {Array<[string, number]>} */
    const bag = [["battle", 50], ["elite", n >= 2 ? 16 : 0], ["treasure", 12], ["fountain", fountain ? 0 : 9], ["shrine", 13]];
    let r = Math.random() * bag.reduce((a, [, w]) => a + w, 0), t = "battle";
    for (const [name, w] of bag) { r -= w; if (r <= 0) { t = name; break; } }
    if (t === "fountain") fountain = true;
    types.push(t);
  }
  types.push("boss");
  return types;
}
const POOLS = [
  { from: 1, mobs: ["minecraft:zombie", "minecraft:skeleton", "minecraft:spider"] },
  { from: 3, mobs: ["minecraft:husk", "minecraft:stray"] },
  { from: 4, mobs: ["minecraft:witch", "minecraft:bogged"] },
  { from: 5, mobs: ["minecraft:vindicator", "minecraft:pillager", "minecraft:cave_spider"] },
  { from: 9, mobs: ["minecraft:blaze", "minecraft:wither_skeleton"] },
  { from: 16, mobs: ["minecraft:evoker", "minecraft:ravager"] }
];
const poolFor = n => POOLS.filter(x => n >= x.from).flatMap(x => x.mobs);
function waveFor(n, type) {
  const pool = poolFor(n);
  if (type === "boss") {
    const boss = n <= 4 ? "minecraft:husk" : n <= 8 ? "minecraft:vindicator" : n <= 15 ? "minecraft:wither_skeleton" : "minecraft:ravager";
    return [boss, ...Array.from({ length: 2 + Math.min(3, Math.floor(n / 3)) }, () => pick(pool))];
  }
  if (type === "elite") return [pick(poolFor(n + 3)), pick(pool), pick(pool)];
  return Array.from({ length: Math.min(3 + Math.floor(n / 2), 8) }, () => pick(pool));
}

/** n階を作る（前の階は消して作り直す） */
function genFloor(n) {
  const s = st(), sl = s.camp.slot, Y = sl.Y, dim = ow(), th = themeOf(n);
  for (const e of dim.getEntities({ tags: ["kr_wave"] })) { try { e.remove(); } catch (err) {} }
  const mid = Math.floor((sl.X1 + sl.X2) / 2);
  fillAny(dim, `${sl.X1 - 1} ${Y - 1} ${sl.Z1 - 1} ${mid} ${Y + 7} ${sl.Z2 + 1}`, th.shell);
  fillAny(dim, `${mid + 1} ${Y - 1} ${sl.Z1 - 1} ${sl.X2 + 1} ${Y + 7} ${sl.Z2 + 1}`, th.shell);

  const path = randomPath(roomCount(n) + 1);
  const types = roomTypes(path.length, n);
  const rooms = path.map(([gx, gz], k) => {
    const type = types[k], big = type === "boss";
    const size = big ? 15 : type === "battle" || type === "elite" ? 9 + 2 * randInt(0, 2) : 9, h = (size - 1) / 2;
    const cx = sl.X1 + gx * CELL + 9, cz = sl.Z1 + gz * CELL + 9;
    return { x1: cx - h, x2: cx + h, z1: cz - h, z2: cz + h, cx, cz, state: "idle", type, boss: big, used: false, door: /** @type {number[] | null} */ (null) };
  });
  rooms.forEach((r, k) => {
    cmd(dim, `fill ${r.x1 + 1} ${Y + 1} ${r.z1 + 1} ${r.x2 - 1} ${Y + 5} ${r.z2 - 1} air`);
    fillAny(dim, `${r.x1 + 1} ${Y} ${r.z1 + 1} ${r.x2 - 1} ${Y} ${r.z2 - 1}`, [r.boss ? "polished_blackstone_bricks" : pick(th.floors), "polished_deepslate"]);
    for (const [lx, lz] of [[r.x1 + 2, r.z1 + 2], [r.x2 - 2, r.z1 + 2], [r.x1 + 2, r.z2 - 2], [r.x2 - 2, r.z2 - 2], [r.cx, r.cz]]) {
      cmd(dim, `setblock ${lx} ${Y + 6} ${lz} ${r.boss ? "shroomlight" : th.light}`);
    }
    const pillars = r.boss ? [[4, 4], [-4, 4], [4, -4], [-4, -4]] : (r.x2 - r.x1 >= 12 && Math.random() < 0.6 ? [[3, 3], [-3, -3]] : []);
    for (const [ox, oz] of pillars) fillAny(dim, `${r.cx + ox} ${Y + 1} ${r.cz + oz} ${r.cx + ox} ${Y + 5} ${r.cz + oz}`, [th.pillar, "deepslate_tiles"]);
    // 部屋の種類ごとの目印
    if (r.type === "treasure") {
      cmd(dim, `setblock ${r.cx} ${Y + 1} ${r.cz} chest`);
      for (const [ox, oz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) cmd(dim, `setblock ${r.cx + ox} ${Y + 1} ${r.cz + oz} gold_block`);
    }
    if (r.type === "fountain") {
      cmd(dim, `fill ${r.cx - 1} ${Y} ${r.cz - 1} ${r.cx + 1} ${Y} ${r.cz + 1} prismarine`);
      cmd(dim, `setblock ${r.cx} ${Y} ${r.cz} sea_lantern`);
      cmd(dim, `setblock ${r.cx} ${Y + 1} ${r.cz} soul_lantern`);
    }
    if (r.type === "shrine") {
      cmd(dim, `setblock ${r.cx} ${Y + 1} ${r.cz} enchanting_table`);
      for (const [ox, oz] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) cmd(dim, `fill ${r.cx + ox} ${Y + 1} ${r.cz + oz} ${r.cx + ox} ${Y + 2} ${r.cz + oz} bookshelf`);
    }
    if (r.type === "elite") cmd(dim, `fill ${r.cx - 1} ${Y} ${r.cz - 1} ${r.cx + 1} ${Y} ${r.cz + 1} redstone_block`);
    const next = rooms[k + 1];
    if (!next) return;
    if (next.cz === r.cz) {
      const fwd = next.cx > r.cx, xa = fwd ? r.x2 : next.x2, xb = fwd ? next.x1 : r.x1, dx = fwd ? r.x2 : r.x1;
      cmd(dim, `fill ${xa} ${Y + 1} ${r.cz - 1} ${xb} ${Y + 3} ${r.cz + 1} air`);
      cmd(dim, `fill ${xa} ${Y} ${r.cz - 1} ${xb} ${Y} ${r.cz + 1} polished_deepslate`);
      r.door = [dx, Y + 1, r.cz - 1, dx, Y + 3, r.cz + 1];
    } else {
      const fwd = next.cz > r.cz, za = fwd ? r.z2 : next.z2, zb = fwd ? next.z1 : r.z1, dz = fwd ? r.z2 : r.z1;
      cmd(dim, `fill ${r.cx - 1} ${Y + 1} ${za} ${r.cx + 1} ${Y + 3} ${zb} air`);
      cmd(dim, `fill ${r.cx - 1} ${Y} ${za} ${r.cx + 1} ${Y} ${zb} polished_deepslate`);
      r.door = [r.cx - 1, Y + 1, dz, r.cx + 1, Y + 3, dz];
    }
    setDoor(dim, r, "iron_bars");
  });
  s.dun = { floor: n, Y, rooms, theme: th.name, stat: { start: Date.now(), ans: 0, fast: 0, ok: 0 } };
  saveNow();
}
function setDoor(dim, r, block) {
  if (!r.door) return;
  const [a, b, c, d, e, f] = r.door;
  cmd(dim, `fill ${a} ${b} ${c} ${d} ${e} ${f} ${block}`);
}
/** @param {Player} p @param {number} k */
function enterRoom(p, k) {
  const d = st().dun, r = d.rooms[k];
  p.teleport({ x: r.cx + 0.5, y: d.Y + 1, z: r.cz + 0.5 }, { dimension: ow() });
}
/** @param {Player} p @param {number} n @param {boolean} [keepRun] 続けて潜る時は祝福を引き継ぐ */
function startFloor(p, n, keepRun = false) {
  const s = st();
  if (!keepRun || !s.run) s.run = { bless: {}, feverUntil: 0 };
  genFloor(n);
  enterRoom(p, 0);
  const th = themeOf(n);
  title(p, "§6§l" + th.name + " " + n + "階", floorLabel(n).split("  ")[1] + "  部屋：" + s.dun.rooms.map(r => ROOM_INFO[r.type].name.slice(0, 2)).join(" > "));
  const sc = floorScope(n), unjudged = rangeList(sc).filter(i => st().box[WORDS[i][0]] === undefined).length;
  p.sendMessage("§6[" + floorLabel(n) + "] §fこの階の単語の習熟 " + Math.round(100 * mastery(sc)) + "%" + (unjudged ? "  §7未選別 " + unjudged + "語" : ""));
  sound(p, th.sound);
}
/** @param {Player} p */
function goToDungeon(p) {
  const d = st().dun;
  let k = d.rooms.findIndex(r => r.state !== "cleared");
  if (k < 0) k = d.rooms.length - 1;
  enterRoom(p, k);
}
/** 祝福を失ってキャンプへ @param {Player} p */
function backToCamp(p) {
  const s = st();
  if (!s.camp) return;
  if (s.run && Object.keys(s.run.bless).length) p.sendMessage("§7キャンプに戻った。祝福は消えた。");
  s.run = null;
  dirty = true;
  p.teleport(campSpawn(), { dimension: ow() });
}
/** @param {Player} p */
async function floorMenu(p) {
  const s = st(), d = s.dun, max = s.prog.max, last = floorCount();
  /** @type {Array<[string, string | null, () => any]>} */
  const items = [];
  if (d && d.rooms.some(r => r.state !== "cleared")) {
    const done = d.rooms.filter(r => r.state === "cleared").length;
    items.push(["§l続きから " + d.floor + "階\n§8部屋 " + done + "/" + d.rooms.length, ICON.resume, () => goToDungeon(p)]);
  }
  const tile = (f, icon) => {
    const sc = floorScope(f), m = mastery(sc);
    const sub = f <= last ? "No." + sc.lo + "-" + sc.hi : "全単語・苦手優先";
    return /** @type {[string, string | null, () => any]} */ (["§l" + f + "階 " + themeOf(f).name + "\n§8" + sub + "\n" + stars(m) + " §8習熟" + Math.round(100 * m) + "%", icon, () => startFloor(p, f)]);
  };
  items.push(tile(max + 1, ICON.boss));
  for (let f = max; f >= 1; f--) items.push(tile(f, ICON.dungeon));
  items.push(["やめる", ICON.back, () => {}]);
  await menu(p, "§lダンジョン", profileLine(p) + "  §f最高到達 §e" + max + "階 §7/ " + last + "階\n§71階 = 単語100語。★は習熟度（覚えた単語の割合）", items);
}

/* ---------- 祝福（ローグライク）：部屋を突破するたびに3つから1つ選ぶ ---------- */
const BLESSINGS = [
  { id: "str",   name: "剛力",   icon: "textures/items/blaze_powder",  desc: "攻撃力アップ" },
  { id: "spd",   name: "疾風",   icon: "textures/items/feather",       desc: "移動が速くなる" },
  { id: "res",   name: "鉄壁",   icon: "textures/items/iron_ingot",    desc: "受けるダメージを減らす" },
  { id: "regen", name: "再生",   icon: "textures/items/ghast_tear",    desc: "即答するとHP回復" },
  { id: "guard", name: "守護",   icon: "textures/items/iron_chestplate",        desc: "単語のミスのダメージ半減" },
  { id: "gold",  name: "錬金",   icon: "textures/items/gold_nugget",   desc: "獲得コイン+50%" },
  { id: "vamp",  name: "吸血",   icon: "textures/items/redstone_dust", desc: "敵を倒すとHP回復" },
  { id: "fever", name: "熱狂",   icon: "textures/items/blaze_rod",     desc: "フィーバーまでのコンボ-3" }
];
const MAX_BLESS = 3;
const blessLv = id => (st().run?.bless?.[id]) ?? 0;
/** @param {Player} p */
async function chooseBlessing(p, why) {
  const run = st().run;
  if (!run) return;
  const options = BLESSINGS.filter(b => blessLv(b.id) < MAX_BLESS).sort(() => Math.random() - 0.5).slice(0, 3);
  if (!options.length) return;
  const owned = BLESSINGS.filter(b => blessLv(b.id)).map(b => b.name + blessLv(b.id)).join(" ") || "なし";
  sound(p, "random.orb");
  await menu(p, "§l祝福を選べ", "§6" + why + "  §7今の祝福: " + owned,
    options.map(b => ["§l" + b.name + "\n§8" + b.desc + "\n§8Lv" + blessLv(b.id) + " > " + (blessLv(b.id) + 1), b.icon, () => {
      const r2 = st().run;
      if (!r2) return;
      r2.bless[b.id] = (r2.bless[b.id] ?? 0) + 1;
      dirty = true;
      applyBlessings(p);
      p.sendMessage("§6祝福「" + b.name + "」Lv" + r2.bless[b.id] + " §fを手に入れた");
    }]));
}
/** 祝福の効果（エフェクト）をかけ直す @param {Player} p */
function applyBlessings(p) {
  const run = st().run;
  if (!run || !isInDungeon(p)) return;
  const fever = Date.now() < (run.feverUntil ?? 0);
  const eff = (id, lv) => { if (lv > 0) { try { p.addEffect(id, 20 * 8, { amplifier: lv - 1, showParticles: false }); } catch (e) {} } };
  eff("strength", blessLv("str") + (fever ? 1 : 0));
  eff("speed", blessLv("spd") + (fever ? 1 : 0));
  eff("resistance", blessLv("res"));
}
system.runInterval(() => { for (const p of world.getPlayers()) applyBlessings(p); }, 20 * 5);
function healPlayer(p, amount) {
  try {
    const hp = /** @type {any} */ (p.getComponent("minecraft:health"));
    if (hp) hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + amount));
  } catch (e) {}
}
/** 獲得コインの倍率（錬金・フィーバー） */
function coinMult() {
  const run = st().run;
  if (!run) return 1;
  return (1 + 0.5 * blessLv("gold")) * (Date.now() < (run.feverUntil ?? 0) ? 2 : 1);
}
/** 単語のミスのダメージ倍率（守護） */
function missDmgMult() { return blessLv("guard") ? Math.pow(0.5, blessLv("guard")) : 1; }
/** 回答のあとの処理：階の成績、再生、フィーバー @param {Player} p */
function onAnswer(p, ok, fast, combo) {
  const s = st();
  if (!s.run || !s.dun || !isInDungeon(p)) return;
  const stt = s.dun.stat;
  stt.ans++; if (ok) stt.ok++; if (fast) stt.fast++;
  if (fast && blessLv("regen")) healPlayer(p, blessLv("regen") * 2);
  const need = 10 - 3 * blessLv("fever");
  if (fast && combo > 0 && combo % Math.max(4, need) === 0) {
    s.run.feverUntil = Date.now() + 20000;
    title(p, "§c§lFEVER!!", "20秒間 コイン2倍・攻撃と速さアップ");
    sound(p, "mob.blaze.shoot");
    applyBlessings(p);
  }
  dirty = true;
}
// 吸血：敵を倒すとHP回復
world.afterEvents.entityDie.subscribe(ev => {
  const p = ev.damageSource.damagingEntity;
  if (!(p instanceof Player) || !blessLv("vamp")) return;
  try { if (!ev.deadEntity.hasTag("kr_wave")) return; } catch (e) { return; }
  healPlayer(p, 2 * blessLv("vamp"));
});

/* ---------- 部屋の中身 ---------- */
function startWave(k) {
  const d = st().dun, r = d.rooms[k], n = d.floor, dim = ow();
  r.state = "active";
  saveNow();
  waveFor(n, r.type).forEach((type, idx) => {
    const loc = { x: r.x1 + 2 + Math.random() * (r.x2 - r.x1 - 3), y: d.Y + 1, z: r.z1 + 2 + Math.random() * (r.z2 - r.z1 - 3) };
    try {
      const e = dim.spawnEntity(type, loc);
      e.addTag("kr_wave");
      e.addTag("kr_r" + k);
      if (n >= 9) e.addEffect("strength", 20 * 3600, { amplifier: 0, showParticles: false });
      if (r.type === "boss" && idx === 0) {
        e.addTag("kr_boss");
        e.nameTag = "§4§l" + n + "階の門番";
        e.addEffect("resistance", 20 * 3600, { amplifier: Math.min(2, 1 + Math.floor(n / 6)), showParticles: false });
        e.addEffect("health_boost", 20 * 3600, { amplifier: Math.min(4, n), showParticles: false });
        e.addEffect("regeneration", 20 * 6, { amplifier: 4, showParticles: false });
      }
      if (r.type === "elite" && idx === 0) {
        e.addTag("kr_elite");
        e.addEffect("health_boost", 20 * 3600, { amplifier: Math.min(3, 1 + Math.floor(n / 3)), showParticles: false });
        e.addEffect("regeneration", 20 * 6, { amplifier: 4, showParticles: false });
        e.addEffect("speed", 20 * 3600, { amplifier: 0, showParticles: false });
      }
      if (!(r.type === "boss" && idx === 0)) {
        e.addTag("kr_shield");
        e.addEffect("resistance", 20 * 3600, { amplifier: SHIELD_RES, showParticles: false });
      }
      tagWord(e, pickWord(undefined, floorScope(n)));
      if (r.type === "elite" && idx === 0) e.nameTag = "§6§l精鋭 §r§e" + WORDS[mobWord.get(e.id) ?? 0][0];
    } catch (err) { console.warn("[kouryaku] spawn failed: " + err); }
  });
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    title(p, "§6" + ROOM_INFO[r.type].name, ROOM_INFO[r.type].sub);
    sound(p, r.boss ? "mob.wither.spawn" : r.type === "elite" ? "mob.evocation_illager.prepare_summon" : "mob.zombie.say");
  }
}
/** 戦わない部屋（宝物庫・泉・祭壇）は入った時点で扉を開ける */
function enterPeacefulRoom(k) {
  const d = st().dun, r = d.rooms[k];
  r.state = "cleared";
  saveNow();
  setDoor(ow(), r, "air");
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    title(p, "§b" + ROOM_INFO[r.type].name, ROOM_INFO[r.type].sub);
    sound(p, "random.chestopen");
  }
}
function clearRoom(k) {
  const d = st().dun, r = d.rooms[k];
  r.state = "cleared";
  saveNow();
  setDoor(ow(), r, "air");
  if (r.boss) return;
  const elite = r.type === "elite";
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    addStat(p, "clear");
    addCoins(p, Math.round((elite ? COIN.room * 2 : COIN.room) * coinMult()), elite ? "精鋭撃破" : "部屋クリア");
    title(p, "§a扉が開いた", elite ? "精鋭を倒した！ 祝福を選べ" : "祝福を選べ");
    sound(p, "random.door_open");
    enqueue(p, () => chooseBlessing(p, elite ? "精鋭を倒した！" : "部屋を突破した！"));
  }
}
// 宝物庫・泉・祭壇：中央に近づくと発動（1回だけ）
system.runInterval(() => {
  const d = st().dun;
  if (!d) return;
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p) || running.has(p.id)) continue;
    const k = roomAt(d, p.location);
    const r = d.rooms[k];
    if (!r || r.used || !["treasure", "fountain", "shrine"].includes(r.type)) continue;
    if (Math.hypot(p.location.x - (r.cx + 0.5), p.location.z - (r.cz + 0.5)) > 1.8) continue;
    r.used = true;
    saveNow();
    if (r.type === "treasure") openTreasure(p, r);
    if (r.type === "fountain") {
      healPlayer(p, 40);
      try { p.addEffect("regeneration", 20 * 10, { amplifier: 1 }); p.addEffect("absorption", 20 * 120, { amplifier: 1 }); } catch (e) {}
      title(p, "§b癒された", "HP全回復＋守りの加護");
      sound(p, "beacon.activate");
    }
    if (r.type === "shrine") enqueue(p, () => shrineTrial(p));
  }
}, 5);
/** @param {Player} p */
function openTreasure(p, r) {
  cmd(ow(), `setblock ${r.cx} ${st().dun.Y + 1} ${r.cz} air`);
  sound(p, "random.chestopen");
  const roll = Math.random();
  if (roll < 0.45) {
    const n = Math.round(randInt(30, 60 + 10 * st().dun.floor) * coinMult());
    addCoins(p, n, "宝箱");
    title(p, "§6§l宝箱！", "+" + n + "コイン");
  } else if (roll < 0.7) {
    try { p.dimension.spawnItem(new ItemStack("minecraft:golden_apple", randInt(1, 2)), p.location); } catch (e) {}
    title(p, "§6§l宝箱！", "金のリンゴ");
  } else {
    title(p, "§d§l宝箱！", "祝福を見つけた");
    enqueue(p, () => chooseBlessing(p, "宝箱から祝福が出た！"));
  }
}
/** 単語の祭壇：5問連続（ダメージなし）。全問即答なら大きな報酬 @param {Player} p */
async function shrineTrial(p) {
  let fast = 0;
  const used = new Set();
  for (let q = 0; q < 5; q++) {
    const i = pickWord(used, floorScope(st().dun?.floor ?? 1));
    used.add(i);
    const r = await askOne(p, i, { title: "§l§d単語の祭壇 " + (q + 1) + "/5", dmg: 0, progress: "即答 " + fast + "/" + q });
    if (r.fast) fast++;
    if (!p.isValid) return;
  }
  const n = Math.round(fast * 10 * coinMult());
  if (n) addCoins(p, n, "祭壇");
  if (fast === 5) {
    title(p, "§d§l完璧！", "全問即答。祝福を授かる");
    sound(p, "random.levelup");
    await chooseBlessing(p, "祭壇の試練を完璧に突破！");
  } else {
    title(p, "§d祭壇の試練", "即答 " + fast + "/5");
  }
}

/* ---------- 門番 ---------- */
// 門番のHPが 2/3・1/3 を切るたびに「門番の問い」。正解で門番がひるむ、ミスで門番が回復
world.afterEvents.entityHurt.subscribe(ev => {
  const e = ev.hurtEntity;
  const p = ev.damageSource.damagingEntity;
  if (!(p instanceof Player)) return;
  try {
    if (!e.hasTag("kr_boss")) return;
    const hp = /** @type {any} */ (e.getComponent("minecraft:health"));
    if (!hp || hp.currentValue <= 0) return;
    const ratio = hp.currentValue / hp.effectiveMax;
    const phase = Number(e.getDynamicProperty("kr:phase") ?? 0);
    const next = ratio < 1 / 3 ? 2 : ratio < 2 / 3 ? 1 : 0;
    if (next <= phase) return;
    e.setDynamicProperty("kr:phase", next);
    enqueue(p, async () => {
      title(p, "§4§l門番の問い", "答えられなければ門番が力を取り戻す");
      const r = await askOne(p, weakest(1, floorScope(st().dun?.floor ?? 1))[0], { title: "§l§4門番の問い", dmg: 6, reward: false });
      if (!e.isValid) return;
      if (r.ok) {
        try { e.addEffect("slowness", 20 * 8, { amplifier: 3 }); e.addEffect("weakness", 20 * 8, { amplifier: 1 }); } catch (err) {}
        title(p, "§a§l門番がひるんだ！", "8秒間 動きが鈍る");
        sound(p, "mob.irongolem.hit");
      } else {
        try { const h = /** @type {any} */ (e.getComponent("minecraft:health")); h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + h.effectiveMax * 0.25)); } catch (err) {}
        title(p, "§c§l門番が回復した", "");
        sound(p, "mob.wither.ambient");
      }
    });
  } catch (err) {}
});
// 門番と戦っている間はHPをアクションバーに出す
system.runInterval(() => {
  const d = st().dun;
  if (!d) return;
  const last = d.rooms[d.rooms.length - 1];
  if (last.state !== "active") return;
  const boss = ow().getEntities({ tags: ["kr_boss"] })[0];
  if (!boss) return;
  try {
    const hp = /** @type {any} */ (boss.getComponent("minecraft:health"));
    const line = "§4§l門番 §r" + bar(hp.currentValue / hp.effectiveMax, 20) + " §7" + Math.ceil(hp.currentValue) + "/" + Math.ceil(hp.effectiveMax);
    for (const p of world.getPlayers()) if (isInDungeon(p) && roomAt(d, p.location) === d.rooms.length - 1 && !running.has(p.id)) p.onScreenDisplay.setActionBar(line);
  } catch (e) {}
}, 10);

/** @returns {[string, number]} */
function floorRank(stt) {
  const mins = (Date.now() - stt.start) / 60000;
  const rate = stt.ans ? stt.fast / stt.ans : 0;
  const score = rate * 100 - Math.max(0, mins - 5) * 3;
  return score >= 75 ? ["S", 60] : score >= 55 ? ["A", 35] : score >= 35 ? ["B", 15] : ["C", 0];
}
/** @param {Player} p */
async function bossTrial(p) {
  const d = st().dun;
  const k = d.rooms.length - 1, n = d.floor;
  p.sendMessage("§4§l門番が最後の試練を出してきた！ §r§f苦手な単語から" + BOSS_QUESTIONS + "問。" + BOSS_PASS + "問正解で撃破。");
  const ids = weakest(BOSS_QUESTIONS, floorScope(n));
  let ok = 0;
  for (let q = 0; q < ids.length; q++) {
    const r = await askOne(p, ids[q], { title: "§l§4門番の試練 " + (q + 1) + "/" + ids.length, dmg: 6, reward: false, progress: "正解 " + ok + "/" + q });
    if (r.ok) ok++;
    if (!p.isValid) return;
  }
  const s = st();
  if (s.dun !== d) return;
  if (ok < BOSS_PASS) {
    p.sendMessage("§c" + ids.length + "問中" + ok + "問。門番が復活した……もう一度倒せ。");
    d.rooms[k].state = "idle";
    saveNow();
    return;
  }
  d.rooms[k].state = "cleared";
  s.stats.clears++;
  const first = n > s.prog.max;
  s.prog.max = Math.max(s.prog.max, n);
  saveNow();
  const [rank, bonus] = floorRank(d.stat);
  const coins = Math.round((COIN.boss + bonus) * coinMult());
  addStat(p, "boss");
  addCoins(p, coins, n + "階クリア");
  const mins = Math.floor((Date.now() - d.stat.start) / 60000), secs = Math.floor((Date.now() - d.stat.start) / 1000) % 60;
  const rankColor = { S: "§6", A: "§a", B: "§b", C: "§7" }[rank];
  title(p, rankColor + "§lRANK " + rank, n + "階 攻略！" + (first ? " " + (n + 1) + "階が開いた" : ""));
  sound(p, rank === "S" ? "ui.toast.challenge_complete" : "random.levelup");
  await menu(p, "§l" + n + "階 攻略",
    rankColor + "§lRANK " + rank + "§r  §f時間 " + mins + "分" + secs + "秒  即答 " + d.stat.fast + "/" + d.stat.ans +
    "\n§f試練 " + bar(ok / ids.length) + " §e" + ok + "/" + ids.length + "  §e+" + coins + "コイン" + (first ? "  §a" + (n + 1) + "階が開いた" : ""), [
      ["§l" + (n + 1) + "階へ進む\n§8祝福を持ったまま\n§8" + themeOf(n + 1).name, ICON.boss, () => startFloor(p, n + 1, true)],
      ["§lキャンプに戻る\n§8祝福は消える", ICON.camp, () => backToCamp(p)]
    ]);
}

// 部屋の監視：入ったら敵を出す／全滅したら扉を開ける／門番が倒れたら試練
system.runInterval(() => {
  const d = st().dun;
  if (!d) return;
  const dim = ow();
  const players = world.getPlayers().filter(p => isInDungeon(p));
  d.rooms.forEach((r, k) => {
    if (r.state === "idle") {
      const prevClear = k === 0 || d.rooms[k - 1].state === "cleared";
      if (prevClear && players.some(p => roomAt(d, p.location) === k)) {
        if (["treasure", "fountain", "shrine"].includes(r.type)) enterPeacefulRoom(k);
        else startWave(k);
      }
      return;
    }
    if (r.state !== "active") return;
    if (r.boss) {
      if (dim.getEntities({ tags: ["kr_boss"] }).length > 0) return;
      const p = players[0];
      if (!p) return;
      r.state = "trial";
      saveNow();
      enqueue(p, () => bossTrial(p));
      return;
    }
    if (dim.getEntities({ tags: ["kr_r" + k] }).length === 0) clearRoom(k);
  });
}, 10);

// ワールド再読み込みで「試練の途中」のまま止まった門番の間は、もう一度門番を出す
system.runTimeout(() => {
  try {
    const d = st().dun;
    if (d) {
      const last = d.rooms[d.rooms.length - 1];
      if (last.state === "trial") { last.state = "idle"; saveNow(); }
    }
  } catch (e) {}
}, 20);

/* ---------- PC向け：しゃがみ（Shift）を2回すばやく押すとメニュー ---------- */
const sneakState = new Map();
system.runInterval(() => {
  const now = Date.now();
  for (const p of world.getPlayers()) {
    const was = sneakState.get(p.id) ?? { on: false, last: 0 };
    const on = p.isSneaking;
    if (on && !was.on) {
      if (now - was.last < 400 && !running.has(p.id)) { openMenu(p); was.last = 0; }
      else was.last = now;
    }
    was.on = on;
    sneakState.set(p.id, was);
  }
}, 2);
