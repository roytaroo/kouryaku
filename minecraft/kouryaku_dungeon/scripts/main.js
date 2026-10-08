import { world, system, Player, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData, FormCancelationReason, uiManager } from "@minecraft/server-ui";
import { WORDS } from "./words.js";
import { addStat, addCoins, addCoinsQuiet, setBest, showYarikomiMenu } from "./yarikomi.js";
import { showShop } from "./shop.js";
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
      prog: Object.assign({ max: 0 }, loadJSON("kr:prog", {}))
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
function inRange(i) {
  const r = range(), n = numOf(i);
  return n >= r.lo && n <= r.hi;
}
function rangeList() {
  return WORDS.map((_, i) => i).filter(inRange);
}
function weightOf(i) {
  const b = st().box[WORDS[i][0]];
  return b === undefined ? WEIGHT.n : WEIGHT[b] ?? 1;
}
/** @param {Set<number>} [avoid] */
function pickWord(avoid) {
  let total = 0;
  const ws = new Array(WORDS.length);
  for (let i = 0; i < WORDS.length; i++) {
    const w = (avoid && avoid.has(i)) || !inRange(i) ? 0 : weightOf(i);
    ws[i] = w;
    total += w;
  }
  if (total <= 0) {
    const list = rangeList();
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
/** 苦手な順にn語（足りなければ出やすさで補う） */
function weakest(n) {
  const s = st();
  const ranked = WORDS.map((_, i) => i)
    .filter(i => inRange(i) && (s.miss[WORDS[i][0]] ?? 0) > 0)
    .sort((a, b) => {
      const ba = s.box[WORDS[a][0]] ?? 0, bb = s.box[WORDS[b][0]] ?? 0;
      if (ba !== bb) return ba - bb;
      return (s.miss[WORDS[b][0]] ?? 0) - (s.miss[WORDS[a][0]] ?? 0);
    })
    .slice(0, n);
  const used = new Set(ranked);
  const size = rangeList().length;
  while (ranked.length < n && used.size < size) {
    const i = pickWord(used);
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
  const head = (opt.progress ? opt.progress + "  " : "") + "コンボ " + s.stats.combo;
  const no = WORDS[i][2] ? "§7No." + WORDS[i][2] + "§r\n" : "";
  let ok = false, ms = 0, missLabel = "§cミス！ ", revealed = false;

  if (s.cfg.mode === "choice") {
    // 4択モード
    const ch = choicesFor(i);
    const form = new ActionFormData()
      .title(opt.title ?? "§l英単語バトル")
      .body("\n" + no + "§l§e" + word + "§r\n\nこの単語の意味は？\n§7" + head + "\n ");
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
      .body("\n" + no + "§l§e" + word + "§r\n\n見た瞬間に意味を思い浮かべて押せ\n§7制限 " + s.cfg.limit + "秒  " + head + "\n ")
      .button("§2浮かんだ")
      .button("§4わからない");
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
        .body("\n" + no + "§l§e" + word + "§r\n\n§f" + lines(meaning) + "\n\n§7思い浮かべた意味は合ってた？（" + (ms / 1000).toFixed(1) + "秒）\n ")
        .button("§2○ 合ってた")
        .button("§4× 違った");
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
  const earn = opt.reward === false ? 0 : fast ? COIN.fast + (s.stats.combo % 5 === 0 ? COIN.combo5 : 0) : ok ? COIN.slow : 0;
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
    hurtSafely(p, opt.dmg ?? s.cfg.dmg);
    // 意味をまだ見ていない時（わからない・時間切れ・4択のミス）は、その場で答えを見せる
    if (!revealed && p.isValid) {
      const fa = new ActionFormData()
        .title(opt.title ?? "§l英単語バトル")
        .body("\n" + missLabel + "\n\n" + no + "§l§e" + word + "§r\n\n§f" + lines(meaning) + "\n ")
        .button("次へ");
      await showForm(p, fa);
    }
  }
  return { ok, fast };
}

/* ---------- events: mobs ---------- */
world.afterEvents.entityHurt.subscribe(ev => {
  const src = ev.damageSource.damagingEntity;
  if (!(src instanceof Player)) return;
  const e = ev.hurtEntity;
  if (!e.isValid || !isMonster(e)) return;
  if (wordOf(e) !== undefined) return;
  if (!st().cfg.outside && !e.hasTag("kr_wave")) return;
  tagWord(e, pickWord());
});

world.afterEvents.entityDie.subscribe(ev => {
  const p = ev.damageSource.damagingEntity;
  if (!(p instanceof Player)) return;
  const e = ev.deadEntity;
  let boss = false, wave = false;
  try { boss = e.hasTag("kr_boss"); wave = e.hasTag("kr_wave"); } catch (err) {}
  if (boss) return; // ボスは部屋の監視側でボス戦の問題を出す
  let i = wordOf(e);
  mobWord.delete(e.id);
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
  const inDun = st().dun && isInDungeon(p);
  /** @type {Array<[string, () => any]>} */
  const items = [];
  if (inDun) items.push(["キャンプに戻る", () => backToCamp(p)]);
  else if (st().camp) items.push(["ダンジョンへ", () => floorMenu(p)]);
  items.push(["単語の書（セットアップ・テスト・設定）", () => bookMenu(p)]);
  items.push(["やり込み（ミッション・バッジ）", () => showYarikomiMenu(p)]);
  items.push(["ショップ", () => showShop(p)]);
  const f = new ActionFormData().title("§l攻略コンパス").body("§7出題範囲 " + range().label + " ／ 正答率 " + rate() + "\n ");
  items.forEach(([label]) => f.button(label));
  const r = await showForm(p, f);
  if (r.canceled || r.selection === undefined) return;
  await items[r.selection][1]();
}
function rate() {
  const s = st().stats;
  return s.ans ? Math.round((100 * s.ok) / s.ans) + "%" : "--";
}

/* ---------- setup: 全単語を「分かる／苦手」に選別 ---------- */
function judgedCount() {
  const box = st().box;
  let n = 0;
  for (const i of rangeList()) if (box[WORDS[i][0]] !== undefined) n++;
  return n;
}
/** @param {Player} p */
async function setupMenu(p) {
  const total = rangeList().length, judged = judgedCount(), left = total - judged;
  const f = new ActionFormData()
    .title("§lセットアップ")
    .body("英単語を" + SETUP_PAGE + "語ずつ表示する。\n知らない・自信がない単語だけONにして「決定」。OFFのままの単語は「分かる」になる。\n\n" +
      "・苦手にした単語：よく出る。敵の名前が赤くなる\n・分かるにした単語：たまに確認で出る。間違えたら苦手に戻る\n\n途中でやめても、続きから再開できる。範囲は「設定」で変えられる。\n§7" + range().label + "  選別済み " + judged + " / " + total + "\n ");
  /** @type {Array<[string, () => any]>} */
  const items = [];
  if (left > 0) items.push(["未選別の単語から（残り" + left + "語）", () => runSetup(p, false)]);
  items.push(["この範囲を全部やり直す（" + total + "語）", () => runSetup(p, true)]);
  items.push(["戻る", () => openMenu(p)]);
  items.forEach(([label]) => f.button(label));
  const r = await showForm(p, f);
  if (r.canceled || r.selection === undefined) return;
  await items[r.selection][1]();
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
        .label("知らない・自信がない単語だけON");
      page.forEach(i => f.toggle("§l" + WORDS[i][0] + " §r§7" + numOf(i), { defaultValue: false }));
      f.submitButton("決定して次へ");
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
  const s = st();
  const list = rangeList();
  let learned = 0;
  for (const i of list) if ((s.box[WORDS[i][0]] ?? -1) >= 4) learned++;
  const weak = weakest(10).filter(i => (s.miss[WORDS[i][0]] ?? 0) > 0);
  const lines = [
    "回答数： " + s.stats.ans + "  正答率： " + rate(),
    "ベストコンボ： " + s.stats.best,
    "ダンジョン攻略： " + s.stats.clears + "回",
    "覚えた単語（" + range().label + "）： " + learned + " / " + list.length,
    "",
    "§l苦手TOP10（" + range().label + "）§r"
  ];
  if (!weak.length) lines.push("§7まだなし");
  weak.forEach((i, k) => lines.push((k + 1) + ". §e" + WORDS[i][0] + "§r " + short(inline(WORDS[i][1]), 20) + " §7(ミス" + s.miss[WORDS[i][0]] + ")"));
  const f2 = new ActionFormData().title("§l成績").body(lines.join("\n") + "\n ").button("閉じる");
  await showForm(p, f2);
}

/** @param {Player} p */
async function settings(p) {
  const c = st().cfg;
  const r = new ActionFormData()
    .title("§l設定")
    .body("ボタンを押すと切り替わる\n ")
    .button("出題範囲： " + range().label)
    .button("出題形式： " + (c.mode === "choice" ? "4択" : "瞬間想起（おすすめ）"))
    .button("瞬間想起の制限時間： " + c.limit + "秒")
    .button("ダンジョンの外でも出題： " + (c.outside ? "§aON" : "§cOFF"))
    .button("ミスのダメージ： ハート" + c.dmg / 2 + "個")
    .button("戻る");
  const r2 = await showForm(p, r);
  if (r2.canceled) return;
  if (r2.selection === 0) {
    const k = RANGES.findIndex(x => x.id === range().id);
    c.range = RANGES[(k + 1) % RANGES.length].id;
    dirty = true;
    return settings(p);
  }
  if (r2.selection === 1) { c.mode = c.mode === "choice" ? "recall" : "choice"; dirty = true; return settings(p); }
  if (r2.selection === 2) { c.limit = c.limit >= 5 ? 2 : c.limit + 1; dirty = true; return settings(p); }
  if (r2.selection === 3) { c.outside = !c.outside; dirty = true; return settings(p); }
  if (r2.selection === 4) { c.dmg = c.dmg >= 6 ? 2 : c.dmg + 2; dirty = true; return settings(p); }
  if (r2.selection === 5) return openMenu(p);
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
      p.sendMessage("§6[攻略ダンジョン] §f床の色で行き先が決まる：§8黒§f=ダンジョン  §6金§f=ショップ  §9青§f=ミッション  §d紫§f=単語の書。コンパスでもメニューが開く。");
      const judged = judgedCount(), total = rangeList().length;
      if (judged < total) p.sendMessage("§e最初に「単語の書」→「セットアップ」で、知らない単語を選別しておくのがおすすめ（" + range().label + " 済 " + judged + " / " + total + "）。");
    } else if (st().camp) {
      // 倒れたらキャンプに戻ってくる
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
  const judged = judgedCount(), total = rangeList().length;
  /** @type {Array<[string, () => any]>} */
  const items = [
    ["セットアップ（単語の選別）\n§8" + range().label + "  " + (judged >= total ? "完了" : "済 " + judged + " / " + total), () => setupMenu(p)],
    ["単語テスト（10問）", () => wordTest(p)],
    ["成績を見る", () => showStats(p)],
    ["設定（出題範囲など）", () => settings(p)]
  ];
  const f = new ActionFormData().title("§l単語の書").body("§7出題範囲 " + range().label + " ／ 正答率 " + rate() + "\n ");
  items.forEach(([label]) => f.button(label));
  const r = await showForm(p, f);
  if (r.canceled || r.selection === undefined) return;
  await items[r.selection][1]();
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
function roomCount(n) { return Math.min(3 + Math.floor((n - 1) / 2), 7); }
const POOLS = [
  { from: 1, mobs: ["minecraft:zombie", "minecraft:skeleton", "minecraft:spider"] },
  { from: 3, mobs: ["minecraft:husk", "minecraft:stray"] },
  { from: 4, mobs: ["minecraft:witch"] },
  { from: 5, mobs: ["minecraft:vindicator", "minecraft:pillager", "minecraft:cave_spider"] },
  { from: 8, mobs: ["minecraft:wither_skeleton"] }
];
function waveFor(n, boss) {
  const pool = POOLS.filter(x => n >= x.from).flatMap(x => x.mobs);
  const count = boss ? 2 + Math.min(3, Math.floor(n / 3)) : Math.min(3 + Math.floor(n / 2), 8);
  const out = Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
  if (boss) out.unshift(n <= 3 ? "minecraft:husk" : n <= 7 ? "minecraft:wither_skeleton" : "minecraft:ravager");
  return out;
}

/** n階を作る（前の階は消して作り直す） */
function genFloor(n) {
  const s = st(), sl = s.camp.slot, Y = sl.Y, dim = ow();
  for (const e of dim.getEntities({ tags: ["kr_wave"] })) { try { e.remove(); } catch (err) {} }
  const mid = Math.floor((sl.X1 + sl.X2) / 2);
  cmd(dim, `fill ${sl.X1 - 1} ${Y - 1} ${sl.Z1 - 1} ${mid} ${Y + 7} ${sl.Z2 + 1} deepslate_bricks`);
  cmd(dim, `fill ${mid + 1} ${Y - 1} ${sl.Z1 - 1} ${sl.X2 + 1} ${Y + 7} ${sl.Z2 + 1} deepslate_bricks`);

  const path = randomPath(roomCount(n) + 1);
  const floors = ["polished_deepslate", "deepslate_tiles", "polished_blackstone", "mossy_stone_bricks", "cracked_deepslate_tiles"];
  const rooms = path.map(([gx, gz], k) => {
    const boss = k === path.length - 1;
    const size = boss ? 15 : 9 + 2 * randInt(0, 2), h = (size - 1) / 2;
    const cx = sl.X1 + gx * CELL + 9, cz = sl.Z1 + gz * CELL + 9;
    return { x1: cx - h, x2: cx + h, z1: cz - h, z2: cz + h, cx, cz, state: "idle", boss, door: /** @type {number[] | null} */ (null) };
  });
  rooms.forEach((r, k) => {
    const floor = r.boss ? "polished_blackstone_bricks" : floors[randInt(0, floors.length - 1)];
    cmd(dim, `fill ${r.x1 + 1} ${Y + 1} ${r.z1 + 1} ${r.x2 - 1} ${Y + 5} ${r.z2 - 1} air`);
    cmd(dim, `fill ${r.x1 + 1} ${Y} ${r.z1 + 1} ${r.x2 - 1} ${Y} ${r.z2 - 1} ${floor}`);
    const light = r.boss ? "shroomlight" : "sea_lantern";
    for (const [lx, lz] of [[r.x1 + 2, r.z1 + 2], [r.x2 - 2, r.z1 + 2], [r.x1 + 2, r.z2 - 2], [r.x2 - 2, r.z2 - 2], [r.cx, r.cz]]) {
      cmd(dim, `setblock ${lx} ${Y + 6} ${lz} ${light}`);
    }
    // 柱：門番の間は4本、ふつうの部屋はときどき
    const pillars = r.boss ? [[4, 4], [-4, 4], [4, -4], [-4, -4]] : (r.x2 - r.x1 >= 12 && Math.random() < 0.6 ? [[3, 3], [-3, -3]] : []);
    for (const [ox, oz] of pillars) cmd(dim, `fill ${r.cx + ox} ${Y + 1} ${r.cz + oz} ${r.cx + ox} ${Y + 5} ${r.cz + oz} deepslate_tiles`);
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
  s.dun = { floor: n, Y, rooms };
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
/** @param {Player} p @param {number} n */
function startFloor(p, n) {
  genFloor(n);
  enterRoom(p, 0);
  title(p, "§6§l" + n + "階", "敵を全員倒すと扉が開く");
}
/** @param {Player} p */
function goToDungeon(p) {
  const d = st().dun;
  let k = d.rooms.findIndex(r => r.state !== "cleared");
  if (k < 0) k = d.rooms.length - 1;
  enterRoom(p, k);
}
/** @param {Player} p */
function backToCamp(p) {
  if (!st().camp) return;
  p.teleport(campSpawn(), { dimension: ow() });
}
/** @param {Player} p */
async function floorMenu(p) {
  const s = st(), d = s.dun, max = s.prog.max;
  /** @type {Array<[string, () => any]>} */
  const items = [];
  if (d && d.rooms.some(r => r.state !== "cleared")) items.push(["続きから（" + d.floor + "階）", () => goToDungeon(p)]);
  items.push(["§l" + (max + 1) + "階に挑戦\n§r§8最高到達 " + max + "階", () => startFloor(p, max + 1)]);
  for (let f = max; f >= Math.max(1, max - 7); f--) items.push([f + "階（クリア済み）", () => startFloor(p, f)]);
  items.push(["やめる", () => {}]);
  const f = new ActionFormData().title("§lダンジョン").body("§7階が深いほど敵が強く、部屋が増える。\n§7門番の試練に合格すると次の階が開く。\n ");
  items.forEach(([label]) => f.button(label));
  const r = await showForm(p, f);
  if (r.canceled || r.selection === undefined) return;
  await items[r.selection][1]();
}

function startWave(k) {
  const d = st().dun, r = d.rooms[k], n = d.floor, dim = ow();
  r.state = "active";
  saveNow();
  waveFor(n, r.boss).forEach((type, idx) => {
    const loc = { x: r.x1 + 2 + Math.random() * (r.x2 - r.x1 - 3), y: d.Y + 1, z: r.z1 + 2 + Math.random() * (r.z2 - r.z1 - 3) };
    try {
      const e = dim.spawnEntity(type, loc);
      e.addTag("kr_wave");
      e.addTag("kr_r" + k);
      if (n >= 6) e.addEffect("strength", 20 * 3600, { amplifier: 0, showParticles: false });
      if (n >= 10) e.addEffect("resistance", 20 * 3600, { amplifier: 0, showParticles: false });
      if (r.boss && idx === 0) {
        e.addTag("kr_boss");
        e.nameTag = "§4§l" + n + "階の門番";
        e.addEffect("resistance", 20 * 3600, { amplifier: Math.min(2, 1 + Math.floor(n / 6)), showParticles: false });
        e.addEffect("health_boost", 20 * 3600, { amplifier: Math.min(4, n - 1), showParticles: false });
        e.addEffect("regeneration", 20 * 5, { amplifier: 4, showParticles: false });
      }
      tagWord(e, pickWord());
    } catch (err) { console.warn("[kouryaku] spawn failed: " + err); }
  });
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    title(p, "§6" + (r.boss ? n + "階 門番の間" : n + "階 第" + (k + 1) + "の間"), r.boss ? "門番を倒せ。最後に5問の試練がある" : "敵を全員倒すと扉が開く");
    if (r.boss) sound(p, "mob.wither.spawn");
  }
}
function clearRoom(k) {
  const d = st().dun, r = d.rooms[k];
  r.state = "cleared";
  saveNow();
  setDoor(ow(), r, "air");
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    if (r.boss) continue;
    addStat(p, "clear");
    addCoins(p, COIN.room, "部屋クリア");
    title(p, "§a扉が開いた", "次の部屋へ進め");
    sound(p, "random.door_open");
  }
}

/** @param {Player} p */
async function bossTrial(p) {
  const d = st().dun;
  const k = d.rooms.length - 1, n = d.floor;
  p.sendMessage("§4§l門番が最後の試練を出してきた！ §r§f苦手な単語から" + BOSS_QUESTIONS + "問。" + BOSS_PASS + "問正解で撃破。");
  const ids = weakest(BOSS_QUESTIONS);
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
  addStat(p, "boss");
  addCoins(p, COIN.boss, n + "階クリア");
  title(p, "§6§l" + n + "階 攻略！", first ? (n + 1) + "階が開いた" : ids.length + "問中" + ok + "問正解");
  sound(p, "random.levelup");
  const f = new ActionFormData()
    .title("§l" + n + "階 攻略")
    .body("\n門番を倒した！ §f" + ids.length + "問中 §e" + ok + "問§f 正解\n§e+" + COIN.boss + "コイン\n ")
    .button("§l" + (n + 1) + "階へ進む")
    .button("キャンプに戻る");
  const r = await showForm(p, f);
  if (!p.isValid || r.canceled) return;
  if (r.selection === 0) startFloor(p, n + 1);
  else backToCamp(p);
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
      if (prevClear && players.some(p => roomAt(d, p.location) === k)) startWave(k);
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
