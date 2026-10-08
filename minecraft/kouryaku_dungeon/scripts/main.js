import { world, system, Player, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData, FormCancelationReason, uiManager } from "@minecraft/server-ui";
import { WORDS } from "./words.js";

/* =========================================================
   攻略ダンジョン
   - 敵を攻撃すると頭上に英単語。倒すとその単語の4択。
   - 正解: 経験値とコンボ報酬。ミス: ダメージ（ミスでは死なない）。
   - 単語ごとに覚え具合（0〜5の箱）を記録し、苦手な単語ほどよく出る。
   - 攻略コンパスのメニューから地下ダンジョンを生成できる。
   ========================================================= */

const COMPASS_NAME = "§r§6攻略コンパス";
const OVERWORLD = "minecraft:overworld";
const DUNGEON_Y = -40;
const ROOM_SIZES = [11, 11, 11, 11, 15];
const GAP = 3;
const MAX_QUEUE = 5;
const BOSS_QUESTIONS = 5;
const BOSS_PASS = 4;
const SETUP_PAGE = 10;
const FAST_MS = 2000; // これより速く意味が出たら「即答」
// 出やすさ: 未出題 / 箱0（間違えた）〜箱5（完全に覚えた）
const WEIGHT = { n: 3, 0: 10, 1: 6, 2: 3, 3: 2, 4: 1, 5: 0.4 };

const WAVES = [
  ["minecraft:zombie", "minecraft:zombie", "minecraft:zombie"],
  ["minecraft:zombie", "minecraft:zombie", "minecraft:skeleton", "minecraft:skeleton"],
  ["minecraft:spider", "minecraft:skeleton", "minecraft:skeleton", "minecraft:zombie", "minecraft:zombie"],
  ["minecraft:zombie", "minecraft:zombie", "minecraft:zombie", "minecraft:skeleton", "minecraft:skeleton", "minecraft:skeleton"],
  ["minecraft:wither_skeleton", "minecraft:zombie", "minecraft:zombie", "minecraft:skeleton"]
];
const ROOM_NAMES = ["第一の間", "第二の間", "第三の間", "第四の間", "門番の間"];

/* ---------- words ---------- */
const INDEX = new Map();
WORDS.forEach(([w], i) => { if (!INDEX.has(w)) INDEX.set(w, i); });

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

/** @type {{box: Record<string, number>, miss: Record<string, number>, stats: any, cfg: any, dun: any} | null} */
let S = null;
let dirty = false;
function st() {
  if (!S) {
    S = {
      box: loadJSON("kr:box", {}),
      miss: loadJSON("kr:miss", {}),
      stats: Object.assign({ ans: 0, ok: 0, best: 0, combo: 0, clears: 0 }, loadJSON("kr:stats", {})),
      cfg: Object.assign({ outside: true, dmg: 4, mode: "recall", limit: 3 }, loadJSON("kr:cfg", {})),
      dun: loadJSON("kr:dun", null)
    };
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
}
system.runInterval(() => {
  if (!dirty) return;
  dirty = false;
  try { saveAll(); } catch (e) { console.warn("[kouryaku] save failed: " + e); }
}, 40);

/* ---------- word selection ---------- */
function weightOf(i) {
  const b = st().box[WORDS[i][0]];
  return b === undefined ? WEIGHT.n : WEIGHT[b] ?? 1;
}
/** @param {Set<number>} [avoid] */
function pickWord(avoid) {
  let total = 0;
  const ws = new Array(WORDS.length);
  for (let i = 0; i < WORDS.length; i++) {
    const w = avoid && avoid.has(i) ? 0 : weightOf(i);
    ws[i] = w;
    total += w;
  }
  if (total <= 0) return Math.floor(Math.random() * WORDS.length);
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
    .filter(i => (s.miss[WORDS[i][0]] ?? 0) > 0)
    .sort((a, b) => {
      const ba = s.box[WORDS[a][0]] ?? 0, bb = s.box[WORDS[b][0]] ?? 0;
      if (ba !== bb) return ba - bb;
      return (s.miss[WORDS[b][0]] ?? 0) - (s.miss[WORDS[a][0]] ?? 0);
    })
    .slice(0, n);
  const used = new Set(ranked);
  while (ranked.length < n && used.size < WORDS.length) {
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
  const head = (opt.progress ? opt.progress + "　" : "") + "コンボ " + s.stats.combo;
  let ok = false, ms = 0, missLabel = "§cミス！ ";

  if (s.cfg.mode === "choice") {
    // 4択モード
    const ch = choicesFor(i);
    const form = new ActionFormData()
      .title(opt.title ?? "§l英単語バトル")
      .body("\n§l§e" + word + "§r\n\nこの単語の意味は？\n§7" + head + "\n ");
    ch.list.forEach(m => form.button(short(m)));
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
      .body("\n§l§e" + word + "§r\n\n見た瞬間に意味を思い浮かべて押せ\n§7制限 " + s.cfg.limit + "秒　" + head + "\n ")
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
        .body("\n§l§e" + word + "§r\n\n§f" + meaning + "\n\n§7思い浮かべた意味は合ってた？（" + (ms / 1000).toFixed(1) + "秒）\n ")
        .button("§2○ 合ってた")
        .button("§4× 違った");
      const r2 = await showForm(p, f2);
      ok = !r2.canceled && r2.selection === 0;
    } else {
      missLabel = timedOut ? "§c時間切れ！ " : r1.canceled ? "§c逃げた！ " : "§cわからない… ";
    }
  }
  if (!p.isValid) return { ok, fast: false };
  const fast = ok && ms <= FAST_MS;

  // 記録：即答できた時だけ「覚えた」に近づく。遅い正解は据え置き
  const b = s.box[word];
  if (fast) s.box[word] = b === undefined ? 2 : Math.min(5, b + 1);
  else if (ok) s.box[word] = b === undefined ? 1 : b;
  else { s.box[word] = 0; s.miss[word] = (s.miss[word] ?? 0) + 1; }
  s.stats.ans++;
  if (ok) s.stats.ok++;
  if (fast) { s.stats.combo++; s.stats.best = Math.max(s.stats.best, s.stats.combo); }
  else if (!ok) s.stats.combo = 0;
  dirty = true;

  const sec = (ms / 1000).toFixed(1) + "秒";
  if (fast) {
    sound(p, "random.orb");
    p.onScreenDisplay.setActionBar("§b即答！ §f" + word + " = " + meaning + "  §7" + sec + "  §eコンボ " + s.stats.combo);
    if (opt.reward !== false) {
      p.addExperience(6);
      if (s.stats.combo % 5 === 0) {
        sound(p, "random.levelup");
        p.sendMessage("§6§l" + s.stats.combo + "コンボ！ §r§eエメラルドと回復をゲット");
        try { p.dimension.spawnItem(new ItemStack("minecraft:emerald", 1), p.location); } catch (e) {}
        try { p.addEffect("regeneration", 100, { amplifier: 1 }); } catch (e) {}
      }
    }
  } else if (ok) {
    sound(p, "random.orb");
    p.onScreenDisplay.setActionBar("§e正解。でも遅い（" + sec + "）§f " + word + " = " + meaning);
    if (opt.reward !== false) p.addExperience(1);
  } else {
    sound(p, "note.bass");
    p.onScreenDisplay.setActionBar(missLabel + "§f" + word + " = " + meaning);
    p.sendMessage("§c✗ §f" + word + " §7= §f" + meaning);
    hurtSafely(p, opt.dmg ?? s.cfg.dmg);
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

world.afterEvents.playerSpawn.subscribe(ev => {
  if (!ev.initialSpawn) return;
  const p = ev.player;
  system.runTimeout(() => {
    if (!p.isValid) return;
    if (!hasCompass(p)) giveCompass(p);
    p.sendMessage("§6[攻略ダンジョン] §f「攻略コンパス」を使うとメニューが開く。敵を倒すと英単語の4択が出る。");
    const judged = judgedCount();
    if (judged < WORDS.length) p.sendMessage("§e最初にメニューの「セットアップ」で、知らない単語を選別しておくのがおすすめ（済 " + judged + " / " + WORDS.length + "）。");
  }, 40);
});

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
  const d = st().dun;
  const inDun = d && isInDungeon(p);
  /** @type {Array<[string, () => any]>} */
  const items = [];
  const judged = judgedCount();
  items.push(["セットアップ（全単語を選別）\n§8" + (judged >= WORDS.length ? "完了" : "済 " + judged + " / " + WORDS.length), () => setupMenu(p)]);
  items.push(["単語テスト（10問）", () => wordTest(p)]);
  if (!d) items.push(["ダンジョンを作る", () => confirmBuild(p)]);
  else {
    if (!inDun) items.push(["ダンジョンへ行く", () => goToDungeon(p)]);
    if (inDun) items.push(["地上に帰る", () => leaveDungeon(p)]);
    items.push(["ダンジョンを最初から", () => resetDungeon(p)]);
    items.push(["ここにダンジョンを作り直す", () => confirmBuild(p)]);
  }
  if (d && !d.kit) items.push(["装備を受け取る（1回だけ）", () => giveKit(p)]);
  items.push(["成績を見る", () => showStats(p)]);
  items.push(["設定", () => settings(p)]);

  const f = new ActionFormData().title("§l攻略コンパス").body("§7単語 " + WORDS.length + "語 ／ 正答率 " + rate() + "\n ");
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
  for (const [w] of WORDS) if (box[w] !== undefined) n++;
  return n;
}
/** @param {Player} p */
async function setupMenu(p) {
  const judged = judgedCount(), left = WORDS.length - judged;
  const f = new ActionFormData()
    .title("§lセットアップ")
    .body("英単語を" + SETUP_PAGE + "語ずつ表示する。\n知らない・自信がない単語だけONにして「決定」。OFFのままの単語は「分かる」になる。\n\n" +
      "・苦手にした単語：よく出る。敵の名前が赤くなる\n・分かるにした単語：たまに確認で出る。間違えたら苦手に戻る\n\n途中でやめても、続きから再開できる。\n§7選別済み " + judged + " / " + WORDS.length + "\n ");
  /** @type {Array<[string, () => any]>} */
  const items = [];
  if (left > 0) items.push(["未選別の単語から（残り" + left + "語）", () => runSetup(p, false)]);
  items.push(["全部やり直す（" + WORDS.length + "語）", () => runSetup(p, true)]);
  items.push(["戻る", () => openMenu(p)]);
  items.forEach(([label]) => f.button(label));
  const r = await showForm(p, f);
  if (r.canceled || r.selection === undefined) return;
  await items[r.selection][1]();
}
/** @param {Player} p @param {boolean} all */
async function runSetup(p, all) {
  const s = st();
  const list = WORDS.map((_, i) => i).filter(i => all || s.box[WORDS[i][0]] === undefined);
  let known = 0, weak = 0;
  running.add(p.id);
  try {
    for (let start = 0; start < list.length; start += SETUP_PAGE) {
      const page = list.slice(start, start + SETUP_PAGE);
      const f = new ModalFormData()
        .title("§lセットアップ " + Math.min(start + page.length, list.length) + " / " + list.length)
        .label("知らない・自信がない単語だけON");
      page.forEach(i => f.toggle("§l" + WORDS[i][0], { defaultValue: false }));
      f.submitButton("決定して次へ");
      const r = await showForm(p, f);
      if (!p.isValid) return;
      if (r.canceled || !r.formValues) {
        p.sendMessage("§6[セットアップ] §fここで中断。次は続きから再開できる（済 " + judgedCount() + " / " + WORDS.length + "）。");
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
      p.onScreenDisplay.setActionBar("§aセットアップ " + Math.min(start + page.length, list.length) + " / " + list.length + "　§f分かる " + known + "　§c苦手 " + weak);
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
      const r = await askOne(p, i, { title: "§l単語テスト " + (k + 1) + "/10", dmg: 0, reward: false, progress: (k + 1) + "/10" });
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
  let learned = 0;
  for (const [w] of WORDS) if ((s.box[w] ?? -1) >= 4) learned++;
  const weak = weakest(10).filter(i => (s.miss[WORDS[i][0]] ?? 0) > 0);
  const lines = [
    "回答数： " + s.stats.ans + "　正答率： " + rate(),
    "ベストコンボ： " + s.stats.best,
    "ダンジョン攻略： " + s.stats.clears + "回",
    "覚えた単語： " + learned + " / " + WORDS.length,
    "",
    "§l苦手TOP10§r"
  ];
  if (!weak.length) lines.push("§7まだなし");
  weak.forEach((i, k) => lines.push((k + 1) + ". §e" + WORDS[i][0] + "§r " + short(WORDS[i][1], 20) + " §7(ミス" + s.miss[WORDS[i][0]] + ")"));
  const f2 = new ActionFormData().title("§l成績").body(lines.join("\n") + "\n ").button("閉じる");
  await showForm(p, f2);
}

/** @param {Player} p */
async function settings(p) {
  const c = st().cfg;
  const r = new ActionFormData()
    .title("§l設定")
    .body("ボタンを押すと切り替わる\n ")
    .button("出題形式： " + (c.mode === "choice" ? "4択" : "瞬間想起（おすすめ）"))
    .button("瞬間想起の制限時間： " + c.limit + "秒")
    .button("ダンジョンの外でも出題： " + (c.outside ? "§aON" : "§cOFF"))
    .button("ミスのダメージ： ハート" + c.dmg / 2 + "個")
    .button("戻る");
  const r2 = await showForm(p, r);
  if (r2.canceled) return;
  if (r2.selection === 0) { c.mode = c.mode === "choice" ? "recall" : "choice"; dirty = true; return settings(p); }
  if (r2.selection === 1) { c.limit = c.limit >= 5 ? 2 : c.limit + 1; dirty = true; return settings(p); }
  if (r2.selection === 2) { c.outside = !c.outside; dirty = true; return settings(p); }
  if (r2.selection === 3) { c.dmg = c.dmg >= 6 ? 2 : c.dmg + 2; dirty = true; return settings(p); }
  if (r2.selection === 4) return openMenu(p);
}

/* ---------- dungeon ---------- */
function isInDungeon(p) {
  const d = st().dun;
  if (!d || p.dimension.id !== OVERWORLD) return false;
  const { x, y, z } = p.location;
  return x >= d.X1 && x <= d.X2 + 1 && z >= d.Z1 && z <= d.Z2 + 1 && y >= DUNGEON_Y - 1 && y <= DUNGEON_Y + 8;
}
function roomAt(d, loc) {
  return d.rooms.findIndex(r => loc.x >= r.x1 + 1 && loc.x < r.x2 && loc.z >= r.z1 + 1 && loc.z < r.z2 && loc.y >= DUNGEON_Y && loc.y <= DUNGEON_Y + 6);
}

/** @param {Player} p */
async function confirmBuild(p) {
  if (p.dimension.id !== OVERWORLD) { p.sendMessage("§cダンジョンはオーバーワールドでだけ作れる。"); return; }
  const r = new MessageFormData()
    .title("§lダンジョンを作る")
    .body("今いる場所の真下（Y=" + DUNGEON_Y + "）に、約73×17ブロックの地下ダンジョンを作る。\nその範囲にあるブロックは上書きされる。\n\n部屋は5つ。敵を全員倒すと次の扉が開き、最後に門番が待っている。")
    .button1("作って入る")
    .button2("やめる");
  const res = await showForm(p, r);
  if (res.canceled || res.selection !== 0) return;
  buildDungeon(p);
}

/** @param {Player} p */
function buildDungeon(p) {
  const dim = world.getDimension(OVERWORLD);
  // 古いダンジョンの敵を片付ける
  for (const e of dim.getEntities({ tags: ["kr_wave"] })) { try { e.remove(); } catch (err) {} }

  const Y = DUNGEON_Y;
  const px = Math.floor(p.location.x), cz = Math.floor(p.location.z);
  const total = ROOM_SIZES.reduce((a, b) => a + b, 0) + GAP * (ROOM_SIZES.length - 1);
  let x = px - Math.floor(total / 2);
  const rooms = ROOM_SIZES.map((s, k) => {
    const h = (s - 1) / 2;
    const r = { x1: x, x2: x + s - 1, z1: cz - h, z2: cz + h, state: "idle", boss: k === ROOM_SIZES.length - 1 };
    x += s + GAP;
    return r;
  });
  const X1 = rooms[0].x1 - 1, X2 = rooms[rooms.length - 1].x2 + 1, Z1 = cz - 8, Z2 = cz + 8;

  cmd(dim, `fill ${X1} ${Y - 1} ${Z1} ${X2} ${Y + 7} ${Z2} deepslate_bricks`);
  rooms.forEach((r, k) => {
    const floor = r.boss ? "polished_blackstone_bricks" : "polished_deepslate";
    const light = r.boss ? "shroomlight" : "sea_lantern";
    cmd(dim, `fill ${r.x1 + 1} ${Y + 1} ${r.z1 + 1} ${r.x2 - 1} ${Y + 5} ${r.z2 - 1} air`);
    cmd(dim, `fill ${r.x1 + 1} ${Y} ${r.z1 + 1} ${r.x2 - 1} ${Y} ${r.z2 - 1} ${floor}`);
    const cx = (r.x1 + r.x2) / 2;
    for (const [lx, lz] of [[r.x1 + 3, r.z1 + 3], [r.x2 - 3, r.z1 + 3], [r.x1 + 3, r.z2 - 3], [r.x2 - 3, r.z2 - 3], [cx, cz]]) {
      cmd(dim, `setblock ${lx} ${Y + 6} ${lz} ${light}`);
    }
    if (r.boss) {
      for (const [ox, oz] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) {
        cmd(dim, `fill ${cx + ox} ${Y + 1} ${cz + oz} ${cx + ox} ${Y + 5} ${cz + oz} deepslate_tiles`);
      }
    }
    const next = rooms[k + 1];
    if (next) {
      cmd(dim, `fill ${r.x2} ${Y + 1} ${cz - 1} ${next.x1} ${Y + 3} ${cz + 1} air`);
      cmd(dim, `fill ${r.x2} ${Y} ${cz - 1} ${next.x1} ${Y} ${cz + 1} polished_deepslate`);
      cmd(dim, `fill ${r.x2} ${Y + 1} ${cz - 1} ${r.x2} ${Y + 3} ${cz + 1} iron_bars`);
    }
  });

  const s = st();
  s.dun = {
    X1, X2, Z1, Z2, cz, rooms, kit: false,
    ret: { x: p.location.x, y: p.location.y, z: p.location.z, dim: p.dimension.id }
  };
  saveNow();
  enterRoom(p, 0);
  p.sendMessage("§6[攻略ダンジョン] §fダンジョンを作った。敵を全員倒すと扉が開く。");
}
function saveNow() {
  dirty = false;
  try { saveAll(); } catch (e) { console.warn("[kouryaku] save failed: " + e); }
}
/** @param {Player} p @param {number} k */
function enterRoom(p, k) {
  const d = st().dun;
  const r = d.rooms[k];
  p.teleport({ x: r.x1 + 2.5, y: DUNGEON_Y + 1, z: d.cz + 0.5 }, { dimension: world.getDimension(OVERWORLD), rotation: { x: 0, y: -90 } });
}
/** @param {Player} p */
function goToDungeon(p) {
  const d = st().dun;
  const ret = { x: p.location.x, y: p.location.y, z: p.location.z, dim: p.dimension.id };
  d.ret = ret;
  saveNow();
  let k = d.rooms.findIndex(r => r.state !== "cleared");
  if (k < 0) k = d.rooms.length - 1;
  enterRoom(p, k);
}
/** @param {Player} p */
function leaveDungeon(p) {
  const d = st().dun;
  const ret = d.ret ?? { x: 0, y: 100, z: 0, dim: OVERWORLD };
  p.teleport({ x: ret.x, y: ret.y, z: ret.z }, { dimension: world.getDimension(ret.dim) });
}
/** @param {Player} p */
function resetDungeon(p) {
  const d = st().dun;
  const dim = world.getDimension(OVERWORLD);
  for (const e of dim.getEntities({ tags: ["kr_wave"] })) { try { e.remove(); } catch (err) {} }
  d.rooms.forEach((r, k) => {
    r.state = "idle";
    if (d.rooms[k + 1]) cmd(dim, `fill ${r.x2} ${DUNGEON_Y + 1} ${d.cz - 1} ${r.x2} ${DUNGEON_Y + 3} ${d.cz + 1} iron_bars`);
  });
  saveNow();
  if (p.dimension.id === OVERWORLD && isInDungeon(p)) enterRoom(p, 0);
  else goToDungeon(p);
  p.sendMessage("§6[攻略ダンジョン] §f最初からやり直し。");
}
/** @param {Player} p */
function giveKit(p) {
  const d = st().dun;
  const inv = /** @type {any} */ (p.getComponent("minecraft:inventory"));
  if (!inv || !inv.container) return;
  for (const [id, n] of [["minecraft:iron_sword", 1], ["minecraft:bow", 1], ["minecraft:arrow", 32], ["minecraft:shield", 1], ["minecraft:bread", 16]]) {
    const left = inv.container.addItem(new ItemStack(/** @type {string} */ (id), /** @type {number} */ (n)));
    if (left) p.dimension.spawnItem(left, p.location);
  }
  d.kit = true;
  saveNow();
  p.sendMessage("§6[攻略ダンジョン] §f装備を渡した。");
}

function startWave(k) {
  const d = st().dun;
  const r = d.rooms[k];
  const dim = world.getDimension(OVERWORLD);
  r.state = "active";
  saveNow();
  for (const type of WAVES[k]) {
    const loc = {
      x: r.x1 + 4 + Math.random() * (r.x2 - r.x1 - 6),
      y: DUNGEON_Y + 1,
      z: r.z1 + 2 + Math.random() * (r.z2 - r.z1 - 3)
    };
    try {
      const e = dim.spawnEntity(type, loc);
      e.addTag("kr_wave");
      e.addTag("kr_r" + k);
      if (r.boss && type === "minecraft:wither_skeleton") {
        e.addTag("kr_boss");
        e.nameTag = "§4§l門番";
        e.addEffect("resistance", 20 * 3600, { amplifier: 1, showParticles: false });
        e.addEffect("speed", 20 * 3600, { amplifier: 0, showParticles: false });
      }
      tagWord(e, pickWord());
    } catch (err) { console.warn("[kouryaku] spawn failed: " + err); }
  }
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    title(p, "§6" + ROOM_NAMES[k], r.boss ? "門番を倒せ。最後に5問の試練がある" : "敵を全員倒すと扉が開く");
    if (r.boss) sound(p, "mob.wither.spawn");
  }
}
function clearRoom(k) {
  const d = st().dun;
  const r = d.rooms[k];
  const dim = world.getDimension(OVERWORLD);
  r.state = "cleared";
  saveNow();
  if (d.rooms[k + 1]) cmd(dim, `fill ${r.x2} ${DUNGEON_Y + 1} ${d.cz - 1} ${r.x2} ${DUNGEON_Y + 3} ${d.cz + 1} air`);
  for (const p of world.getPlayers()) {
    if (!isInDungeon(p)) continue;
    if (r.boss) {
      title(p, "§6§l攻略完了！", "コンパスのメニューから地上に帰れる");
      sound(p, "random.levelup");
    } else {
      title(p, "§a扉が開いた", "次の部屋へ進め");
      sound(p, "random.door_open");
    }
  }
}

/** @param {Player} p */
async function bossTrial(p) {
  const d = st().dun;
  const k = d.rooms.length - 1;
  p.sendMessage("§4§l門番が最後の試練を出してきた！ §r§f苦手な単語から" + BOSS_QUESTIONS + "問。" + BOSS_PASS + "問正解で撃破。");
  const ids = weakest(BOSS_QUESTIONS);
  let ok = 0;
  for (let n = 0; n < ids.length; n++) {
    const r = await askOne(p, ids[n], { title: "§l§4門番の試練 " + (n + 1) + "/" + ids.length, dmg: 6, reward: false, progress: "正解 " + ok + "/" + n });
    if (r.ok) ok++;
    if (!p.isValid) return;
  }
  const dd = st().dun;
  if (!dd || dd !== d) return;
  if (ok >= BOSS_PASS) {
    p.sendMessage("§6§l門番を倒した！ §r§f" + ids.length + "問中" + ok + "問正解。報酬を受け取れ。");
    for (const [id, n] of [["minecraft:diamond", 3], ["minecraft:emerald", 8], ["minecraft:golden_apple", 1]]) {
      try { p.dimension.spawnItem(new ItemStack(/** @type {string} */ (id), /** @type {number} */ (n)), p.location); } catch (e) {}
    }
    p.addLevels(3);
    st().stats.clears++;
    dirty = true;
    clearRoom(k);
  } else {
    p.sendMessage("§c" + ids.length + "問中" + ok + "問。門番が復活した……もう一度倒せ。");
    d.rooms[k].state = "idle";
    saveNow();
  }
}

// 部屋の監視：入ったら敵を出す／全滅したら扉を開ける／門番が倒れたら試練
system.runInterval(() => {
  const d = st().dun;
  if (!d) return;
  const dim = world.getDimension(OVERWORLD);
  const players = world.getPlayers().filter(p => p.dimension.id === OVERWORLD && isInDungeon(p));
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
