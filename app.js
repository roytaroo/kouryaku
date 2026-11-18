/* ===== 基本：日付・保存・計算 ===== */
const DAY_START_HOUR = 4;
const USER_NAME = "だいき";
const PLAN_START = "2026-10-27"; // ターゲット Part1〜2 を1日50語・30日で回す計画の初日
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hrs = min => (Math.round(min / 6) / 10).toFixed(1);
const trimH = min => String(Number((min / 60).toFixed(2)));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function dayKey(t = Date.now()) { return keyOf(new Date(t - DAY_START_HOUR * 3600e3)); }
function parseDate(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addDays(k, n) { const d = parseDate(k); d.setDate(d.getDate() + n); return keyOf(d); }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 864e5); }
function labelDay(k) { const d = parseDate(k); return (d.getMonth() + 1) + "/" + d.getDate() + "（" + WD[d.getDay()] + "）"; }
const dow = k => parseDate(k).getDay();

const DEFAULTS = {
  goalHours: 1100, startDate: "2026-10-03", deadline: "2027-02-15",
  exams: ["2026-11-29 東洋 年内入試（要項で確認）", "2027-01-16 共通テスト（要確認）", "2027-02-04 明治 全学部統一（要確認）", "2027-02-05 法政 T日程（要確認）", "2027-02-08 東洋 一般前期（要確認）"].join("\n"),
  normal: ["06:30-07:00 起床・朝食", "07:00-09:00 英単語・英文法", "09:00-09:10 休憩", "09:10-12:10 英語長文", "12:10-13:00 昼食・休憩", "13:00-16:00 国語（現代文・古文）", "16:00-16:15 休憩", "16:15-19:15 政経（一問一答＋問題演習）", "19:15-20:15 夕食・風呂", "20:15-22:45 過去問・今日の復習", "22:45-23:30 就寝準備", "23:30-06:30 就寝"].join("\n"),
  refresh: ["06:30-07:00 起床・朝食", "07:00-09:00 英単語・英文法", "09:00-09:15 休憩", "09:15-12:15 英語長文", "12:15-13:00 昼食・休憩", "13:00-16:00 国語・政経", "16:00-18:00 ゲーム", "18:00-19:00 夕食・風呂", "19:00-22:30 今週の復習", "22:30-23:30 就寝準備", "23:30-06:30 就寝"].join("\n"),
  refreshDow: 0, sound: true, wordsPerDay: 50
};
function parseExams(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const m = line.trim().match(/^(\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?\s+(.+)$/);
    if (!m) continue;
    const d = parseDate(m[1]); d.setHours(m[2] ? +m[2] : 9, m[3] ? +m[3] : 0, 0, 0);
    if (!isNaN(d)) out.push({ at: d, label: m[4].trim(), key: keyOf(parseDate(m[1])) });
  }
  return out.sort((a, b) => a.at - b.at);
}
const kindOf = l => /ゲーム|game/i.test(l) ? "game" : /休憩|食|風呂|起床|就寝|休み|睡眠/.test(l) ? "rest" : "study";
const shiftM = m => m < DAY_START_HOUR * 60 ? m + 1440 : m;
function parseSchedule(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const m = line.trim().match(/^(\d{1,2}):(\d{2})\s*[-–~〜ー]\s*(\d{1,2}):(\d{2})\s+(.+)$/);
    if (!m) continue;
    const s = shiftM(+m[1] * 60 + +m[2]); let e = shiftM(+m[3] * 60 + +m[4]); if (e <= s) e += 1440;
    out.push({ s, e, label: m[5].trim(), kind: kindOf(m[5]), text: pad(+m[1]) + ":" + m[2] + "–" + pad(+m[3]) + ":" + m[4] });
  }
  return out.sort((a, b) => a.s - b.s);
}
function sums(blocks) { let study = 0, game = 0; for (const b of blocks) { if (b.kind === "study") study += b.e - b.s; if (b.kind === "game") game += b.e - b.s; } return { study, game }; }

/* ---------- 状態 ---------- */
const S = {
  days: {}, timer: { running: false }, settings: { ...DEFAULTS }, quotes: [],
  words: { w: {}, cleared: {} }, kobun: { w: {}, cleared: {} }, seikei: { w: {}, cleared: {}, quiz: {} }, cloze: { correct: 0, total: 0 }, grammar: { units: {} },
  game: { owned: {}, partner: null, freeRolls: 0, outfits: { owned: [], equipped: {} }, claims: [], spend: [], gacha: 0 },
  tickets: { active: null, history: [] }, scores: [], rpg: {}, loaded: {}
};
const SUBJ = { en: "英語", ja: "国語", se: "政経" };
function modeOf(k) {
  const d = S.days[k];
  if (d && d.mode) return d.mode;
  return dow(k) === Number(S.settings.refreshDow ?? 0) ? "refresh" : "normal";
}
const targetFor = mode => sums(parseSchedule(mode === "refresh" ? S.settings.refresh : S.settings.normal)).study || 1;
function timerRunMin() {
  const t = S.timer; if (!t || !t.running || !t.startedAt) return 0;
  if (t.phase === "break") return 0;
  if (t.paused) return 0;
  const lim = t.durMin ? t.durMin : 1e9;
  return clamp((Date.now() - t.startedAt) / 60000, 0, lim);
}
function minOf(k) { let m = (S.days[k] && S.days[k].min) || 0; if (S.timer.running && S.timer.day === k) m += timerRunMin(); return m; }
function totalMin() { let a = 0; for (const k in S.days) a += (S.days[k] && S.days[k].min) || 0; return a + timerRunMin(); }

/* ---------- 計画（週ごとのフェーズ）と今日のノルマ ---------- */
const TOYO = "2026-11-29";
function phaseOf(k) {
  if (k < "2026-11-04") return { id: 1, name: "第1段階　中学文法を固める", from: "2026-10-27", to: "2026-11-03", tip: "中学文法を1週間で一気に。単元ごとに8割取れたら次へ。" };
  if (k < "2026-11-23") return { id: 2, name: "第2段階　ハイレベル＋過去問", from: "2026-11-04", to: "2026-11-22", tip: "ハイレベルは出る単元から。週2〜3回は本番形式を時間を計って。" };
  if (k <= TOYO) return { id: 3, name: "最終週　見直しだけ", from: "2026-11-23", to: TOYO, tip: "新しいことはやらない。間違えた単語・文法・過去問の見直し。" };
  return { id: 4, name: "一般入試へ　積み上げ", from: addDays(TOYO, 1), to: "2027-02-15", tip: "単語Part3・長文・国語・政経を毎日。週1で過去問。" };
}
function baseTasks(k) {
  const p = phaseOf(k), wp = Number(S.settings.wordsPerDay) || 50, past = [1, 4, 6].includes(dow(k));
  const T = [{ id: "words", name: "ターゲット 即答" + wp + "語", unit: "語", goal: wp, auto: "words", subj: "en" }];
  if (p.id === 1) T.push({ id: "lecture", name: "中学文法の授業", unit: "講", goal: 2, subj: "en" });
  if (p.id === 2) T.push({ id: "lecture", name: "ハイレベル英文法の授業", unit: "講", goal: 2, subj: "en" });
  T.push({ id: "gq", name: p.id === 3 ? "文法 間違い直し" : "文法問題", unit: "問", goal: p.id === 3 ? 30 : 40, subj: "en" });
  T.push({ id: "reading", name: "英語長文", unit: "題", goal: p.id === 4 ? 2 : 1, subj: "en" });
  if ((p.id === 2 && past) || p.id === 3) T.push({ id: "past", name: "過去問・本番形式（時間を計る）", unit: "回", goal: 1, subj: "en" });
  T.push({ id: "kobun", name: "古文単語 即答30語", unit: "語", goal: 30, auto: "kobun", subj: "ja" });
  if (p.id === 4) T.push({ id: "seikei", name: "政経 一問一答 即答50問", unit: "問", goal: 50, auto: "seikei", subj: "se" }); // 政経は東洋の年内入試が終わってから
  return T;
}
function wordsTodayCount(k, store = "words") { return (((S[store] || {}).cleared || {})[k] || []).length; }
function tasksOf(k) {
  const d = S.days[k] || {}, cnt = d.tasks || {};
  const list = baseTasks(k).map(t => ({ ...t, count: t.auto ? wordsTodayCount(k, t.auto) : (cnt[t.id] || 0) }));
  for (const c of d.custom || []) list.push({ id: c.id, name: c.name, unit: c.unit || "", goal: c.goal || 1, count: cnt[c.id] || 0, custom: true });
  return list;
}
const allClear = k => { const t = tasksOf(k); return t.length > 0 && t.every(x => x.count >= x.goal); };

/* ---------- 経済（記録から毎回計算するので、巻き戻らない） ---------- */
function econ() {
  const keys = Object.keys(S.days).sort();
  let tot = 0, pomos = 0, clears = 0, streak = 0, streakBonus = 0, prev = null;
  for (const k of keys) {
    const d = S.days[k] || {}; tot += d.min || 0; pomos += d.pomos || 0;
    const ok = allClear(k);
    if (ok) { clears++; streak = prev && addDays(prev, 1) === k ? streak + 1 : 1; streakBonus += Math.min(20, streak * 2); prev = k; }
  }
  tot += timerRunMin();
  const ticketEarn = Math.floor(tot / 6) + clears * 15 + streakBonus;
  const ticketSpent = (S.tickets.history || []).filter(h => !h.free).reduce((a, h) => a + (h.cost || 0), 0);
  let fast = 0; for (const st of [S.words, S.kobun, S.seikei]) for (const n in (st && st.w) || {}) fast += (st.w[n][1] || 0);
  const gramPass = Object.values(S.grammar.units || {}).filter(u => u.passed).length;
  const bests = scoreBests();
  const quizOk = Object.values((S.seikei && S.seikei.quiz) || {}).reduce((a, r) => a + (r[0] || 0), 0);
  const kobanEarn = fitKoban() + rpgKoban() + pomos * 5 + fast + (S.cloze.correct || 0) + quizOk + clears * 20 + gramPass * 30 + bests * 40;
  const kobanSpent = (S.game.spend || []).reduce((a, x) => a + (x.cost || 0), 0);
  return { totalMin: tot, ticket: ticketEarn - ticketSpent, koban: kobanEarn - kobanSpent, clears, pomos, fast, gramPass, bests };
}
function scoreBests() {
  const by = {}; let n = 0;
  for (const s of [...(S.scores || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""))) {
    const key = s.kind || "past", r = s.max ? s.score / s.max : 0;
    if (by[key] != null && r > by[key]) n++;
    by[key] = Math.max(by[key] ?? 0, r);
  }
  return n;
}
/** レベル：累計時間 h が n(n+5)/2 時間を超えるごとに上がる */
function levelOf(min) { const h = min / 60; let n = 1; while (h >= n * (n + 5) / 2) n++; const lo = (n - 1) * (n + 4) / 2, hi = n * (n + 5) / 2; return { lv: n, pct: clamp((h - lo) / (hi - lo), 0, 1), toNext: hi - h }; }
function streakNow() {
  const today = dayKey(); let k = minOf(today) >= targetFor(modeOf(today)) ? today : addDays(today, -1), n = 0;
  while (k >= S.settings.startDate && minOf(k) >= targetFor(modeOf(k)) && n < 999) { n++; k = addDays(k, -1); }
  return n;
}

/* ---------- 保存（クラウド、なければこの端末） ---------- */
let backend = null;
const listeners = new Set();
const onChange = fn => listeners.add(fn);
function emit() { for (const fn of listeners) { try { fn(); } catch (e) { console.warn(e); } } }
const CACHE = "kouryaku-cache-v2";
function cacheSave() { try { localStorage.setItem(CACHE, JSON.stringify({ days: S.days, settings: S.settings, quotes: S.quotes, words: S.words, kobun: S.kobun, seikei: S.seikei, cloze: S.cloze, grammar: S.grammar, game: S.game, tickets: S.tickets, scores: S.scores, rpg: S.rpg, timer: S.timer })); } catch (e) {} }
function cacheLoad() { try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); if (c) for (const k in c) if (c[k] != null) S[k] = k === "settings" ? { ...DEFAULTS, ...c[k] } : c[k]; } catch (e) {} }
function makeBackend(db) {
  const chains = {};
  const write = (path, fn) => (chains[path] = (chains[path] || Promise.resolve()).then(fn).catch(e => { console.warn(e); toast("保存できなかった。通信を確認して、もう一度やって。"); setSync("err"); }));
  const docs = { timer: "state/timer", settings: "settings/main", words: "learn/words", kobun: "learn/kobun", seikei: "learn/seikei", cloze: "learn/cloze", grammar: "learn/grammar", game: "game/yokai", tickets: "game/tickets", rpg: "game/rpg" };
  const local = !db;
  let store = {};
  if (local) { try { store = JSON.parse(localStorage.getItem("kouryaku-local-v2") || "{}"); } catch (e) {} }
  const persistLocal = () => { try { localStorage.setItem("kouryaku-local-v2", JSON.stringify(store)); } catch (e) {} };
  if (db) {
    const fail = e => { console.warn(e); setSync("err"); };
    db.collection("days").onSnapshot(s => { const d = {}; s.docs.forEach(x => { d[x.id] = x.data(); }); S.days = d; S.loaded.days = 1; emit(); }, fail);
    db.collection("quotes").onSnapshot(s => { S.quotes = s.docs.map(x => ({ id: x.id, ...x.data() })); emit(); }, fail);
    db.collection("scores").onSnapshot(s => { S.scores = s.docs.map(x => ({ id: x.id, ...x.data() })); emit(); }, fail);
    for (const [k, path] of Object.entries(docs)) db.doc(path).onSnapshot(s => {
      const v = s.exists ? s.data() : null;
      if (k === "settings") S.settings = { ...DEFAULTS, ...(v || {}) };
      else if (k === "timer") S.timer = v || { running: false };
      else if (v) S[k] = { ...S[k], ...JSON.parse(JSON.stringify(v)) };
      S.loaded[k] = 1; emit();
    }, fail);
  } else {
    setTimeout(() => { if (store.days) S.days = store.days; for (const k of Object.keys(docs)) if (store[k]) S[k] = k === "settings" ? { ...DEFAULTS, ...store[k] } : store[k]; if (store.quotes) S.quotes = store.quotes; if (store.scores) S.scores = store.scores; for (const k of NEED) S.loaded[k] = 1; emit(); }, 0);
  }
  return {
    kind: local ? "local" : "db",
    /** 1つの文書を丸ごと保存（画面の状態はすぐ変え、保存は順番に） */
    save(k, v) {
      if (k === "settings") S.settings = { ...DEFAULTS, ...v }; else S[k] = v;
      cacheSave(); emit();
      if (local) { store[k] = v; persistLocal(); return Promise.resolve(); }
      return write(docs[k], () => db.doc(docs[k]).set(JSON.parse(JSON.stringify(v))));
    },
    saveDay(key, v) {
      S.days = { ...S.days, [key]: v }; cacheSave(); emit();
      if (local) { store.days = S.days; persistLocal(); return Promise.resolve(); }
      return write("days/" + key, () => db.doc("days/" + key).set(JSON.parse(JSON.stringify(v))));
    },
    addTo(col, v) {
      const id = col[0] + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      S[col] = [...S[col], { id, ...v }]; cacheSave(); emit();
      if (local) { store[col] = S[col]; persistLocal(); return Promise.resolve(); }
      return write(col + "/" + id, () => db.doc(col + "/" + id).set(v));
    },
    delFrom(col, id) {
      S[col] = S[col].filter(x => x.id !== id); cacheSave(); emit();
      if (local) { store[col] = S[col]; persistLocal(); return Promise.resolve(); }
      return write(col + "/" + id, () => db.doc(col + "/" + id).delete());
    }
  };
}
function setSync(s) { const el = $("sync"); if (!el) return; el.dataset.s = s; el.title = s === "db" ? "クラウドに保存中（スマホとPCで同じ記録）" : s === "local" ? "この端末だけに保存中" : s === "err" ? "保存エラー。再読み込みして" : "接続中"; }
function day(k = dayKey()) { return { date: k, min: 0, ...(S.days[k] || {}) }; }
function patchDay(k, fn) { const d = JSON.parse(JSON.stringify(day(k))); fn(d); if (!d.mode) d.mode = modeOf(k); return backend.saveDay(k, d); }
function patchDoc(name, fn) { const v = JSON.parse(JSON.stringify(S[name])); fn(v); return backend.save(name, v); }
const NEED = ["days", "timer", "settings", "words", "kobun", "seikei", "cloze", "grammar", "game", "tickets", "rpg"];
const allLoaded = () => NEED.every(k => S.loaded[k]);
function ready() { if (!backend || !allLoaded()) { toast("読み込み中。少し待ってからもう一度。"); return false; } return true; }

/* ---------- 効果音・振動・お知らせ ---------- */
let AC = null;
function sfx(kind) {
  if (S.settings.sound === false) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { ok: [[880, .08], [1320, .12]], ng: [[220, .18]], coin: [[1568, .06], [2093, .1]], done: [[523, .12], [659, .12], [784, .12], [1047, .25]], tap: [[660, .04]], gacha: [[392, .1], [523, .1], [659, .1], [784, .1], [1047, .3]], bell: [[1047, .4], [1319, .5]] }[kind] || [[660, .05]];
    let t = AC.currentTime;
    for (const [f, d] of seq) { const o = AC.createOscillator(), g = AC.createGain(); o.type = kind === "ng" ? "sawtooth" : "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9; }
  } catch (e) {}
  if (navigator.vibrate && ["done", "bell", "ng"].includes(kind)) { try { navigator.vibrate(kind === "ng" ? 60 : [80, 60, 120]); } catch (e) {} }
}
let toastT = 0;
function toast(msg) { const t = $("toast"); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }

/* ===== 立体ドット（ボクセル）エンジン =====
   見えている面だけを作り、角や隙間に陰り（AO）を付ける。three.js（グローバル THREE）を使う */
const VCOL = new Map();
function vcolor(h) { let c = VCOL.get(h); if (!c) { c = new THREE.Color(h[0] === "*" ? h.slice(1) : h); VCOL.set(h, c); } return c; }
class Vox {
  constructor() { this.v = new Map(); this.anchors = { head: [0, 20, 0], hand: [8, 8, 2] }; }
  /** 座標を1つの数にまとめる（文字列より速い）。各軸 -512〜511 */
  key(x, y, z) { return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512); }
  /** key を座標に戻す */
  static xyz(k) { const z = k % 1024, r = (k - z) / 1024, y = r % 1024; return [(r - y) / 1024 - 512, y - 512, z - 512]; }
  set(x, y, z, c) { const k = this.key(Math.round(x), Math.round(y), Math.round(z)); if (c == null) this.v.delete(k); else this.v.set(k, c); }
  get(x, y, z) { return this.v.get(this.key(x, y, z)); }
  has(x, y, z) { return this.v.has(this.key(x, y, z)); }
  box(x0, y0, z0, x1, y1, z1, c) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const v = typeof c === "function" ? c(x, y, z) : c; if (v !== undefined) this.set(x, y, z, v); } }
  /** 楕円体。col は色か (x,y,z)=>色 */
  ell(cx, cy, cz, rx, ry, rz, col) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 > 1) continue;
      const c = typeof col === "function" ? col(x, y, z) : col;
      if (c !== undefined) this.set(x, y, z, c); // undefined は「ここは塗らない」
    }
  }
  /** 縦の円柱（半径は高さで変えられる） */
  cyl(cx, cz, y0, y1, r, col) {
    for (let y = y0; y <= y1; y++) { const rr = typeof r === "function" ? r(y) : r;
      for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) for (let z = Math.floor(cz - rr); z <= Math.ceil(cz + rr); z++)
        if ((x - cx) ** 2 + (z - cz) ** 2 <= rr * rr) this.set(x, y, z, typeof col === "function" ? col(x, y, z) : col); }
  }
  /** 正面（+z）から見た一番手前の z */
  front(x, y) { for (let z = 40; z >= -40; z--) if (this.has(x, y, z)) return z; return null; }
  /** 正面の表面に色を塗る（dz で手前へ出す） */
  paint(x, y, c, dz = 0) { const z = this.front(x, y); if (z != null) this.set(x, y, z + dz, c); }
  /** 左右対称に置く */
  sym(x, y, z, c) { this.set(x, y, z, c); this.set(-x - 1, y, z, c); }
  symBox(x0, y0, z0, x1, y1, z1, c) { this.box(x0, y0, z0, x1, y1, z1, c); this.box(-x1 - 1, y0, z0, -x0 - 1, y1, z1, c); }
  bounds() { let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9]; for (const k of this.v.keys()) { const p = Vox.xyz(k); for (let i = 0; i < 3; i++) { a[i] = Math.min(a[i], p[i]); b[i] = Math.max(b[i], p[i]); } } return { min: a, max: b }; }
  /** 面を作る。色が "*" で始まるボクセルは光る（影も陰りも付かない） */
  mesh() {
    const B = [{ pos: [], col: [], nor: [], idx: [] }, { pos: [], col: [], nor: [], idx: [] }];
    const V = this.v, solid = (x, y, z) => V.has(((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512));
    const F = [
      { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] }, { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
      { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
      { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] }, { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }];
    const shade = [0.64, 0.79, 0.9, 1];
    for (const [k, h] of this.v) {
      const [x, y, z] = Vox.xyz(k), base = vcolor(h), glow = h[0] === "*", b = B[glow ? 1 : 0];
      for (const f of F) {
        const ox = x + f.n[0], oy = y + f.n[1], oz = z + f.n[2];
        if (solid(ox, oy, oz)) continue;
        const s = b.pos.length / 3, ao = [];
        for (const c of f.c) {
          const t = [f.n[0] ? 0 : (c[0] ? 1 : -1), f.n[1] ? 0 : (c[1] ? 1 : -1), f.n[2] ? 0 : (c[2] ? 1 : -1)];
          const ax = [[t[0], 0, 0], [0, t[1], 0], [0, 0, t[2]]].filter(a => a[0] || a[1] || a[2]);
          const s1 = solid(ox + ax[0][0], oy + ax[0][1], oz + ax[0][2]) ? 1 : 0, s2 = solid(ox + ax[1][0], oy + ax[1][1], oz + ax[1][2]) ? 1 : 0;
          const cr = solid(ox + t[0], oy + t[1], oz + t[2]) ? 1 : 0;
          const a = glow ? 3 : s1 && s2 ? 0 : 3 - (s1 + s2 + cr); ao.push(a);
          b.pos.push(x + c[0], y + c[1], z + c[2]); b.nor.push(f.n[0], f.n[1], f.n[2]);
          const m = shade[a]; b.col.push(base.r * m, base.g * m, base.b * m);
        }
        if (ao[0] + ao[2] > ao[1] + ao[3]) b.idx.push(s, s + 1, s + 2, s, s + 2, s + 3); else b.idx.push(s + 1, s + 2, s + 3, s + 1, s + 3, s);
      }
    }
    const group = new THREE.Group();
    B.forEach((b, i) => {
      if (!b.idx.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.idx);
      const mat = i ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0 });
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = !i; mesh.receiveShadow = !i; group.add(mesh);
    });
    return group;
  }
}

/** 1つの WebGL を使い回して、お化けを描く舞台。live=true でゆらゆら動く */
const Stage = (() => {
  let renderer = null, scene, cam, sun, floor, holder, cur = null, raf = 0, liveCanvas = null, ctx2d = null, t0 = 0, lastKey = "";
  function init() {
    if (renderer) return true;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(18, 1, 1, 1000);
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a8aa8, 1.3));
    sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(30, 60, 40); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 5;
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 200 });
    scene.add(sun);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    holder = new THREE.Group(); scene.add(holder);
    return true;
  }
  function place(vox, opt = {}) {
    if (cur) { holder.remove(cur.mesh); cur.mesh.traverse(o => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } }); }
    const mesh = vox.mesh(); holder.add(mesh);
    const b = vox.bounds(), size = [b.max[0] - b.min[0] + 1, b.max[1] - b.min[1] + 1, b.max[2] - b.min[2] + 1];
    const cx = (b.min[0] + b.max[0] + 1) / 2, cz = (b.min[2] + b.max[2] + 1) / 2;
    mesh.position.set(-cx, -b.min[1] + 1, -cz);
    const r = Math.max(size[0], size[1] * 1.05, size[2]);
    const az = opt.az ?? 0.45, el = opt.el ?? 0.36, dist = r * (opt.zoom ?? 4.3);
    cam.position.set(Math.sin(az) * Math.cos(el) * dist, size[1] / 2 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(0, size[1] * 0.5, 0);
    cur = { mesh, base: -b.min[1] + 1 };
  }
  /** 一枚絵（data URL）。図鑑やガチャの一覧に使う */
  function snapshot(vox, w = 240, h = 240, opt = {}) {
    if (!init()) return "";
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    place(vox, opt); holder.rotation.y = opt.rot ?? 0;
    renderer.render(scene, cam);
    lastKey = "";
    return renderer.domElement.toDataURL("image/png");
  }
  /** ずっと動くお化け（ホームの相棒）。canvas に毎フレーム写す */
  function live(canvas, vox, key, opt = {}) {
    if (!init()) return false;
    liveCanvas = canvas; ctx2d = canvas.getContext("2d");
    if (key !== lastKey) { place(vox, opt); lastKey = key; }
    cancelAnimationFrame(raf); t0 = performance.now();
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = t => {
      if (!liveCanvas || !liveCanvas.isConnected) return;
      const w = liveCanvas.clientWidth || 300, h = liveCanvas.clientHeight || 300, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (liveCanvas.width !== Math.round(w * dpr) || liveCanvas.height !== Math.round(h * dpr)) { liveCanvas.width = Math.round(w * dpr); liveCanvas.height = Math.round(h * dpr); }
      renderer.setSize(liveCanvas.width, liveCanvas.height, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      const s = (t - t0) / 1000;
      if (!reduce) { holder.rotation.y = Math.sin(s * 0.55) * 0.42; cur.mesh.position.y = cur.base + Math.sin(s * 2.1) * 0.45; }
      renderer.render(scene, cam);
      ctx2d.clearRect(0, 0, liveCanvas.width, liveCanvas.height); ctx2d.drawImage(renderer.domElement, 0, 0);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return true;
  }
  function stop() { cancelAnimationFrame(raf); liveCanvas = null; lastKey = ""; }
  function ok() { return init(); }
  return { snapshot, live, stop, ok };
})();

/* ===== キャラ名簿 =====
   build.py が minecraft/private/chars/chars.json と絵（chars/<id>.png など）から CHARS を作って埋め込む。
   1体の形：{ id, name, kana, rarity(1梅 2竹 3松 4伝説 5幻), line(進化の系統), stage(0,1,2), voice, desc, starter(最初の相棒なら true) } */
const ROSTER_VER = "chars-2"; // 名簿を総入れ替えしたら変える（仲間・相棒を一度まっさらにする）
const YOKAI = (typeof CHARS !== "undefined" ? CHARS : []).map(c => ({ kana: "", desc: "", voice: "cool", rarity: 1, stage: 0, line: c.id, ...c }));
const YK = Object.fromEntries(YOKAI.map(y => [y.id, y]));
const RARITY = { 1: { name: "梅", cls: "r1" }, 2: { name: "竹", cls: "r2" }, 3: { name: "松", cls: "r3" }, 4: { name: "伝説", cls: "r4" }, 5: { name: "幻", cls: "r5" } };
/** 次の進化（同じ系統の次の段階） */
const nextForm = id => { const y = YK[id]; return y ? YOKAI.find(z => z.line === y.line && z.stage === y.stage + 1) || null : null; };
const lineSize = line => YOKAI.filter(z => z.line === line).length;
/** 最初の相棒：starter が付いた子、なければ並の1段階目の先頭 */
const starterId = () => (YOKAI.find(y => y.starter) || YOKAI.find(y => y.stage === 0 && y.rarity === 1) || YOKAI[0] || {}).id || null;

/* ===== 着せ替え（小物。小さな立体ドットの札で表示）とセリフ ===== */
const OUTFITS = [
  { id: "hachimaki", name: "合格はちまき", slot: "head", price: 80, draw: (m, [x, y, z]) => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2, r = 4.6; m.set(x + Math.cos(t) * r, y - 2, z + Math.sin(t) * r, "#f8f6f0"); } m.set(x, y - 2, z + 4.6, "#d8323a"); m.set(x + 1, y - 2, z + 4.6, "#d8323a"); m.set(x - 4.6, y - 3, z - 2, "#f8f6f0"); m.set(x - 5.4, y - 4, z - 2.6, "#f8f6f0"); } },
  { id: "gakubo", name: "学生帽", slot: "head", price: 120, draw: (m, [x, y, z]) => { m.cyl(x, z, y, y + 2, 3.6, "#1e1f2a"); m.box(Math.round(x - 2), y, Math.round(z + 3), Math.round(x + 2), y, Math.round(z + 5), "#1e1f2a"); m.set(x, y + 1, z + 3.7, "#e8c040"); } },
  { id: "crown", name: "合格の王冠", slot: "head", price: 300, draw: (m, [x, y, z]) => { m.cyl(x, z, y, y + 1, 3.2, "#e8b830"); for (let a = 0; a < 6; a++) { const t = a / 6 * Math.PI * 2; m.set(x + Math.cos(t) * 3, y + 2, z + Math.sin(t) * 3, "#f6d860"); } m.set(x, y + 1, z + 3.3, "#d8323a"); } },
  { id: "mugiwara", name: "麦わら帽子", slot: "head", price: 100, draw: (m, [x, y, z]) => { m.cyl(x, z, y, y, 6, "#e8cc78"); m.cyl(x, z, y + 1, y + 2, 3.2, "#d8b860"); m.cyl(x, z, y + 1, y + 1, 3.4, "#d8323a"); } },
  { id: "kitsunemen", name: "狐のお面", slot: "head", price: 150, draw: (m, [x, y, z]) => { m.box(Math.round(x + 2), y - 3, Math.round(z + 2), Math.round(x + 4), y, Math.round(z + 3), "#fbf8f0"); m.set(x + 2, y - 1, z + 4, "#d8323a"); m.set(x + 4, y - 1, z + 4, "#d8323a"); m.set(x + 2, y + 1, z + 2, "#fbf8f0"); m.set(x + 4, y + 1, z + 2, "#fbf8f0"); } },
  { id: "tsuno", name: "鬼の角", slot: "head", price: 90, draw: (m, [x, y, z]) => { for (const dx of [-2, 2]) for (let k = 0; k < 3; k++) m.set(x + dx + (dx > 0 ? k * 0.3 : -k * 0.3), y + k, z, k ? "#fff3cf" : "#f2e3b0"); } },
  { id: "kanzashi", name: "花かんざし", slot: "head", price: 110, draw: (m, [x, y, z]) => { m.ell(x + 3, y, z + 1, 1.2, 1.2, 1.2, "#f6a3c4"); m.set(x + 3, y, z + 2.4, "#f2e45a"); m.set(x + 4, y - 1, z, "#c84a6a"); m.set(x + 5, y - 2, z - 1, "#c84a6a"); } },
  { id: "tango", name: "単語帳", slot: "hand", price: 60, draw: (m, [x, y, z]) => { m.box(Math.round(x), Math.round(y), Math.round(z), Math.round(x) + 2, Math.round(y) + 3, Math.round(z), "#2a5aa8"); m.box(Math.round(x), Math.round(y), Math.round(z) + 1, Math.round(x) + 2, Math.round(y) + 3, Math.round(z) + 1, "#fbf8f0"); m.set(x + 1, y + 4, z, "#d8323a"); } },
  { id: "enpitsu", name: "鉛筆", slot: "hand", price: 50, draw: (m, [x, y, z]) => { for (let k = 0; k < 6; k++) m.set(x, y + k, z + 1, k === 5 ? "#3a3030" : k === 4 ? "#f0d0a0" : "#f2c230"); } },
  { id: "omamori", name: "合格祈願お守り", slot: "hand", price: 140, draw: (m, [x, y, z]) => { m.box(Math.round(x), Math.round(y), Math.round(z), Math.round(x) + 1, Math.round(y) + 2, Math.round(z), "#d8323a"); m.set(x, y + 3, z, "#e8c040"); m.set(x + 1, y + 1, z + 1, "#e8c040"); } },
  { id: "daruma", name: "だるま", slot: "hand", price: 160, draw: (m, [x, y, z]) => { m.ell(x + 0.5, y + 1.5, z + 0.5, 1.8, 2, 1.8, "#d8323a"); m.set(x, y + 2, z + 2, "#fbf8f0"); m.set(x + 1, y + 2, z + 2, "#fbf8f0"); m.set(x, y + 2, z + 2.6, INK); } },
  { id: "sensu", name: "扇子", slot: "hand", price: 90, draw: (m, [x, y, z]) => { for (let a = 0; a < 5; a++) for (let r = 1; r < 4; r++) { const t = Math.PI * (0.25 + a * 0.12); m.set(x + Math.cos(t) * r, y + Math.sin(t) * r, z + 1, a % 2 ? "#e85a5a" : "#fbf8f0"); } } }
];
const OK = Object.fromEntries(OUTFITS.map(o => [o.id, o]));
/* セリフ：型ごとに、スパルタ（ふだん）と、やさしい（頑張った日・点が伸びた日）。{h} 今日の勉強時間 {left} 目標まで {d} 本番まで {n} 名前 */
const VOICE = {
  kid: { spartan: ["まだ{h}時間しかやってないよ？それで本当に受かるの？", "{d}日しかないんだよ！ぼーっとしてる場合じゃないって！", "ねえ、スマホ見てる暇あったら単語1個でも覚えてよ！", "今日の目標まであと{left}時間。早くタイマー押して！", "サボったらぼく、消えちゃうからね。本気でやって！"], kind: ["すごいすごい！今日はめっちゃ頑張ったね！", "えへへ、ぼく、きみと一緒なら合格できる気がする！", "今日はよくやったよ。ちゃんと寝てね！"], morning: ["おはよ！今日の目標は{goal}時間だよ！", "おはよう！まずは単語からいこ！"] },
  elder: { spartan: ["ふん、{h}時間で満足しておるのか。そんな覚悟で受かると思うな。", "残り{d}日じゃ。一日の怠けは三日の遅れと心得よ。", "口を動かす前に手を動かせ。目標まであと{left}時間じゃ。", "わしが百年見てきた中で、ここで手を抜いた者は皆落ちた。", "眠いだと？試験は待ってはくれぬぞ。"], kind: ["うむ、今日はよう努めた。その積み重ねが合格への道じゃ。", "見事じゃ。今日のおぬしは昨日のおぬしより強い。", "よし、今日はもう休め。明日もまた続けるのじゃぞ。"], morning: ["朝じゃ。今日も{goal}時間、積み上げよ。", "起きたか。まずは単語じゃ。"] },
  samurai: { spartan: ["{h}時間とは片腹痛い。その刀、なまくらでござるか。", "本番まで{d}日。戦の前に休む侍などおらぬでござる。", "目標まであと{left}時間でござる。いざ、抜刀！", "迷いは剣を鈍らせる。机に向かうでござる！", "サボりは敵前逃亡と同じでござる。"], kind: ["見事な一日でござった！拙者、感服つかまつった。", "今日の勝ちは本物でござる。胸を張られよ。", "よく戦われた。今宵はゆるりと休まれよ。"], morning: ["おはようござる。本日の目標は{goal}時間でござる。", "朝稽古の時間でござる。まずは単語から！"] },
  cool: { spartan: ["{h}時間。話にならない。", "残り{d}日。今のままだと落ちる。それだけだ。", "目標まで{left}時間。言い訳はいらない。やれ。", "やる気がないなら、受験をやめろ。やるなら今すぐ机に向かえ。", "だいきの代わりに勉強してくれる奴はいない。"], kind: ["……悪くない。今日は認めてやる。", "結果が出たな。この調子を崩すな。", "今日はよくやった。休め。明日も同じ量だ。"], morning: ["今日の目標は{goal}時間。始めろ。", "起きたなら単語からだ。"] },
  lady: { spartan: ["あら、まだ{h}時間？その程度で合格できると思ってるのかしら。", "本番まで{d}日よ。甘えてる暇なんてないわ。", "目標まであと{left}時間。さっさと始めなさい。", "だらしないわね。背筋を伸ばして、ペンを持ちなさい。", "サボるような子、わたくしは面倒見ませんわよ。"], kind: ["ふふ、今日はなかなかやるじゃない。見直したわ。", "よく頑張ったわね。ご褒美に褒めてあげる。", "今日はもうおやすみなさい。明日も期待してるわ。"], morning: ["おはよう。今日の目標は{goal}時間よ。", "さあ、朝の単語から始めましょう。"] },
  yankee: { spartan: ["{h}時間だぁ？なめてんのか。受かる気あんのかよ。", "残り{d}日だぞ。ダラダラしてる場合じゃねえだろうが。", "目標まであと{left}時間。さっさとタイマー押せや。", "スマホ置け。話はそれからだ。", "そんなんじゃ受からねえぞ。気合い入れろ！"], kind: ["やるじゃねえか。今日のだいきは本物だ。", "へっ、ちゃんと結果出したな。見直したぜ。", "今日はもういい。しっかり寝て、明日もぶちかませ。"], morning: ["おう、起きたか。今日は{goal}時間だ。", "朝イチは単語だ。いくぞ。"] }
};

/* ===== ホーム ===== */
function nextExams() { const now = Date.now(); return parseExams(S.settings.exams).filter(e => e.at > now); }
function renderCountdown() {
  const ex = nextExams(), n = ex[0];
  if (!n) { $("cdName").textContent = "次の試験日が未設定"; $("cdD").textContent = "--"; $("cdHms").textContent = "--:--:--"; return; }
  let ms = n.at - Date.now(); const D = Math.floor(ms / 864e5); ms -= D * 864e5;
  const H = Math.floor(ms / 36e5); ms -= H * 36e5; const M = Math.floor(ms / 6e4); ms -= M * 6e4;
  $("cdName").textContent = n.label; $("cdD").textContent = D; $("cdHms").textContent = pad(H) + ":" + pad(M) + ":" + pad(Math.floor(ms / 1000));
  const avg = (6 * targetFor("normal") + targetFor("refresh")) / 7;
  $("cdSub").textContent = labelDay(n.key) + " " + n.at.getHours() + ":" + pad(n.at.getMinutes()) + " 開始。今の時間割なら、それまでに勉強できるのは約" + Math.round(avg * (n.at - Date.now()) / 864e5 / 60) + "時間。";
  const others = ex.slice(1, 4).map(e => `<span><b>D-${Math.ceil((e.at - Date.now()) / 864e5)}</b>${esc(e.label.replace(/（.*?）/g, ""))}</span>`).join("");
  if ($("cdOthers").dataset.v !== others) { $("cdOthers").innerHTML = others; $("cdOthers").dataset.v = others; }
}

/* 相棒のセリフ：頑張った日・点が伸びた日はやさしく、それ以外はスパルタ */
let lastLine = "";
function moodNow() {
  const k = dayKey(), tm = minOf(k), tg = targetFor(modeOf(k));
  const recentBest = (S.scores || []).some(s => s.best && daysBetween(s.date, k) <= 2);
  return tm >= tg || allClear(k) || recentBest ? "kind" : "spartan";
}
function pickLine(force) {
  const y = YK[S.game.partner] || { voice: "cool" }, v = VOICE[y.voice] || VOICE.cool;
  const k = dayKey(), tm = minOf(k), tg = targetFor(modeOf(k)), ex = nextExams()[0];
  const hour = new Date().getHours(), d = S.days[k] || {};
  let mood = moodNow(), pool = v[mood];
  if (!force && hour >= 5 && hour < 10 && tm < 30) { pool = v.morning; mood = "spartan"; }
  let line = pool[Math.floor(Math.random() * pool.length)], guard = 0;
  while (pool.length > 1 && line === lastLine && guard++ < 8) line = pool[Math.floor(Math.random() * pool.length)];
  lastLine = line;
  const txt = line.replace("{h}", hrs(tm)).replace("{left}", hrs(Math.max(0, tg - tm))).replace("{d}", ex ? Math.ceil((ex.at - Date.now()) / 864e5) : "?").replace("{goal}", trimH(tg)).replace("{n}", USER_NAME);
  $("bubble").textContent = txt; $("bubble").dataset.mood = mood;
}
let buddyKey = "";
function renderBuddy() {
  const id = S.game.partner, y = YK[id], img = $("buddyImg");
  $("buddyCanvas").hidden = true;
  if (!y) {
    $("bName").textContent = "相棒募集中"; $("bRar").hidden = true; $("bLv").textContent = ""; $("evolveBtn").hidden = true; img.hidden = true; $("buddyGear").innerHTML = "";
    $("bEvo").textContent = YOKAI.length ? "図鑑から相棒を選ぼう" : "新しいキャラを準備中"; $("bEvoBar").style.width = "0%";
    if (!$("bubble").textContent) pickLine(); return;
  }
  const outfit = (S.game.outfits && S.game.outfits.equipped) || {};
  $("bName").textContent = y.name; $("bRar").hidden = false; $("bRar").textContent = RARITY[y.rarity].name; $("bRar").className = "rar " + RARITY[y.rarity].cls;
  const ex = expOf(id), lv = lvOf(ex), nf = nextForm(id), ready = canEvolve(id);
  $("bLv").textContent = "Lv." + lv;
  if (nf) { const need = (evolveLv(id) - 1) * LV_MIN; $("bEvo").textContent = ready ? "進化できる！" : "進化 Lv." + evolveLv(id) + "まで あとポモドーロ " + Math.ceil(Math.max(0, need - ex) / LV_MIN) + "回"; $("bEvoBar").style.width = clamp(100 * ex / need, 0, 100) + "%"; }
  else { $("bEvo").textContent = "最終形態　次のLvまで " + Math.ceil(LV_MIN - ex % LV_MIN) + "分"; $("bEvoBar").style.width = (100 * (ex % LV_MIN) / LV_MIN) + "%"; }
  $("evolveBtn").hidden = !ready; $("evolveBtn").dataset.id = id;
  const key = id + JSON.stringify(outfit);
  if (key !== buddyKey) { buddyKey = key; img.hidden = false; img.src = thumb(id); $("buddyGear").innerHTML = gearHtml(outfit); }
  if (!$("bubble").textContent) pickLine();
}


function renderPhase() {
  const k = dayKey(), p = phaseOf(k), total = daysBetween(p.from, p.to) + 1, i = clamp(daysBetween(p.from, k) + 1, 1, total);
  $("phName").textContent = p.name; $("phTip").textContent = p.tip; $("phDays").textContent = i + " / " + total + "日目";
}
function renderTasks() {
  const k = dayKey(), list = tasksOf(k), ul = $("taskList");
  const html = list.map(t => {
    const done = t.count >= t.goal, pct = clamp(100 * t.count / t.goal, 0, 100);
    const ctl = t.auto ? `<button type="button" data-go="learn" data-tab="${t.auto === "words" ? "words" : t.auto}">始める</button>` :
      `<button type="button" data-t="${t.id}" data-d="-1">−1</button><button type="button" data-t="${t.id}" data-d="1">＋1</button>` +
      (t.goal >= 10 ? `<button type="button" data-t="${t.id}" data-d="10">＋10</button>` : "") + (t.custom ? `<button type="button" data-del="${t.id}">消す</button>` : "");
    return `<li class="task${done ? " done" : ""}" data-s="${t.subj || ""}"><span class="nm">${esc(t.name)}<small>${t.subj ? SUBJ[t.subj] : "自分で足したタスク"}${t.auto ? "・即答モードで自動で数える" : ""}</small></span>
      <span class="ct num">${t.count}<small>/${t.goal}${esc(t.unit)}</small></span><div class="bar-p"><i class="${done ? "ok" : ""}" style="width:${pct}%"></i></div><div class="ctl">${ctl}</div></li>`;
  }).join("");
  if (ul.dataset.v !== html) { ul.innerHTML = html; ul.dataset.v = html; }
  const ac = allClear(k);
  $("clearStamp").hidden = !ac;
  $("taskSum").textContent = list.filter(t => t.count >= t.goal).length + " / " + list.length + " 達成" + (ac ? "　全クリア！小判＋20・券＋15" : "");
  const tm = minOf(k), tg = targetFor(modeOf(k));
  $("homeTime").textContent = hrs(tm) + "h / " + trimH(tg) + "h"; $("homeTimeBar").style.width = clamp(100 * tm / tg, 0, 100) + "%"; $("homeTimeBar").className = tm >= tg ? "ok" : "";
  $("homeStreak").textContent = "連続 " + streakNow() + "日"; $("homeMode").textContent = modeOf(k) === "refresh" ? "リフレッシュ日" : "通常日";
}
function renderDayNotes() {
  const k = dayKey(), d = S.days[k] || {}, hour = new Date().getHours();
  const g = $("goalText"); if (document.activeElement !== g && g.value !== (d.goal || "")) g.value = d.goal || "";
  $("nightCard").hidden = !(hour >= 20 || hour < DAY_START_HOUR || d.review);
  const r = $("reviewText"); if (document.activeElement !== r && r.value !== (d.review || "")) r.value = d.review || "";
  for (const [id, key] of [["moodBtns", "mood"], ["energyBtns", "energy"]]) $(id).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === d[key])));
  $("nightSum").textContent = "今日は " + hrs(minOf(k)) + "時間、ノルマ " + tasksOf(k).filter(t => t.count >= t.goal).length + "/" + tasksOf(k).length + "。";
}
/* 今やること：ノルマのうち、まだ終わっていない最初の1つと、そのやり方 */
const HOW = {
  words: "英単語の意味を思い出して答える。アプリの中でできて、数も自動で数える。",
  lecture: "スタディサプリで授業を見る。下のボタンでタイマーが動くから、見終わったらノルマで「＋1」。",
  gq: "文法の問題を解く。問題集でも、勉強タブの「文法」の確認問題でもいい。終わった数をノルマで足す。",
  reading: "英語長文を1題、時間を計って解く。下のボタンでタイマーが動く。",
  past: "過去問か本番形式の問題を、本番と同じ時間で解く。",
  kobun: "古文単語の意味を思い出して答える。アプリの中でできる。",
  seikei: "政経の一問一答。アプリの中でできる。"
};
function nextTask() { return tasksOf(dayKey()).find(t => t.count < t.goal) || null; }
function renderNext() {
  const k = dayKey(), list = tasksOf(k), t = nextTask(), done = list.filter(x => x.count >= x.goal).length;
  $("nextCount").textContent = done + " / " + list.length + " 終わった";
  $("nextGuide").hidden = econ().totalMin > 0;
  const running = S.timer && S.timer.running;
  if (!t) { $("nextName").textContent = "今日のノルマは全部終わった"; $("nextHow").textContent = "あとはタイマーで勉強時間を積むだけ。目標は " + trimH(targetFor(modeOf(k))) + "時間。"; $("nextBtn").textContent = running ? "タイマーを見る" : "タイマーを始める"; $("nextBtn").dataset.k = "timer"; $("nextBtn").dataset.s = "en"; return; }
  $("nextName").textContent = t.name + "（あと " + (t.goal - t.count) + t.unit + "）";
  $("nextHow").textContent = HOW[t.id] || "下のボタンでタイマーが動く。終わったらノルマで「＋1」。";
  if (t.auto) { $("nextBtn").textContent = { words: "英単語を始める", kobun: "古文単語を始める", seikei: "政経を始める" }[t.auto] || "始める"; $("nextBtn").dataset.k = "learn:" + t.auto; }
  else { $("nextBtn").textContent = running ? "タイマーを見る" : "タイマーを始める（" + (SUBJ[t.subj] || "英語") + "）"; $("nextBtn").dataset.k = "timer"; $("nextBtn").dataset.s = t.subj || "en"; }
}
function renderHome() { renderCountdown(); renderNext(); renderBuddy(); renderPassMini(); renderPhase(); renderTasks(); renderFit(); renderDayNotes(); renderActiveTicket("homeTicket"); }

function bindHome() {
  $("taskList").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.go) { if (b.dataset.tab) learnTab = b.dataset.tab; return go(b.dataset.go); }
    if (!ready()) return;
    const k = dayKey();
    if (b.dataset.del) return patchDay(k, d => { d.custom = (d.custom || []).filter(c => c.id !== b.dataset.del); });
    const id = b.dataset.t, dlt = Number(b.dataset.d), before = allClear(k);
    patchDay(k, d => { d.tasks = d.tasks || {}; d.tasks[id] = Math.max(0, (d.tasks[id] || 0) + dlt); }).then(() => {
      if (!before && allClear(k)) { sfx("done"); confetti(); toast("今日のノルマ全クリア！小判＋20・券＋15"); pickLine(true); } else sfx("tap");
    });
  });
  $("addTask").addEventListener("submit", e => {
    e.preventDefault(); if (!ready()) return;
    const name = $("atName").value.trim(), goal = Math.max(1, parseInt($("atGoal").value, 10) || 1); if (!name) return;
    patchDay(dayKey(), d => { d.custom = [...(d.custom || []), { id: "c" + Date.now().toString(36), name, goal, unit: $("atUnit").value.trim() }]; });
    $("atName").value = ""; $("atUnit").value = ""; toast("タスクを足した。");
  });
  let gT = 0;
  $("goalText").addEventListener("input", () => { clearTimeout(gT); gT = setTimeout(() => { if (ready()) patchDay(dayKey(), d => { d.goal = $("goalText").value.trim(); }); }, 700); });
  let rT = 0;
  $("reviewText").addEventListener("input", () => { clearTimeout(rT); rT = setTimeout(() => { if (ready()) patchDay(dayKey(), d => { d.review = $("reviewText").value.trim(); }); }, 700); });
  for (const [id, key] of [["moodBtns", "mood"], ["energyBtns", "energy"]]) $(id).addEventListener("click", e => { const b = e.target.closest("button"); if (!b || !ready()) return; patchDay(dayKey(), d => { d[key] = Number(b.dataset.v); }); sfx("tap"); });
  $("nextBtn").onclick = e => {
    const b = e.currentTarget, kind = b.dataset.k || "";
    if (kind.startsWith("learn:")) { learnTab = kind.slice(6); return go("learn"); }
    go("timer");
    if (!(S.timer && S.timer.running)) { tSubj = b.dataset.s || "en"; timerStart(); }
  };
  $("talkBtn").onclick = () => { pickLine(true); sfx("tap"); };
  $("evolveBtn").onclick = e => evolve(e.currentTarget.dataset.id);
  $("bubble").onclick = () => pickLine(true);
}
function confetti() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("div"); c.className = "confetti";
  const cols = ["#e8892c", "#f6b25a", "#d6402c", "#1d8a5a", "#4a7fd0", "#b8860b"];
  for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = cols[i % cols.length]; s.style.animationDelay = Math.random() * 0.5 + "s"; s.style.animationDuration = 1.2 + Math.random() * 1 + "s"; c.append(s); }
  document.body.append(c); setTimeout(() => c.remove(), 2800);
}

/* ===== タイマー（ポモドーロ・科目別） ===== */
const PRESETS = { "25-5": [25, 5], "50-10": [50, 10], "90-15": [90, 15] };
const QUOTES = [
  ["為せば成る　為さねば成らぬ何事も", "上杉鷹山"], ["千里の道も一歩から", "老子"], ["天才とは、1%のひらめきと99%の努力である", "トーマス・エジソン"],
  ["あきらめたらそこで試合終了ですよ", "安西先生『SLAM DUNK』"], ["明日死ぬかのように生きよ。永遠に生きるかのように学べ。", "マハトマ・ガンディー"],
  ["It always seems impossible until it's done.", "ネルソン・マンデラ"], ["努力は必ず報われる。もし報われない努力があるのならば、それはまだ努力と呼べない。", "王貞治"],
  ["今日の1時間は、本番の1点になる。", "攻略メモ"], ["才能の差より、続けた日数の差のほうがでかい。", "攻略メモ"], ["やる気は待っても来ない。机に座った5分後に来る。", "攻略メモ"],
  ["試験会場で頼れるのは、今日までに積んだものだけだ。", "攻略メモ"], ["休憩は短く、戻るのは早く。", "攻略メモ"]
];
let tSubj = "en", tPreset = "25-5";
function timerView() {
  const t = S.timer || {}, now = Date.now();
  if (!t.running) return { phase: "idle", left: PRESETS[tPreset][0] * 60000, total: PRESETS[tPreset][0] * 60000 };
  if (!t.phase) return { phase: "legacy", el: now - t.startedAt };
  if (t.paused) return { phase: t.phase, paused: true, left: t.leftMs, total: (t.fullMin || t.durMin) * 60000 };
  const total = t.durMin * 60000, el = now - t.startedAt;
  return { phase: t.phase, left: Math.max(0, total - el), total: (t.fullMin || t.durMin) * 60000, el };
}
/** 勉強した分を記録（科目別にも足す） */
function commitStudy(k, min, subj, pomo) {
  if (min <= 0 && !pomo) return Promise.resolve();
  const p = S.game.partner, before = p ? lvOf(expOf(p)) : 0;
  return patchDay(k, d => { d.min = Math.round(((d.min || 0) + min) * 10) / 10; d.subj = d.subj || {}; d.subj[subj] = Math.round(((d.subj[subj] || 0) + min) * 10) / 10; if (pomo) d.pomos = (d.pomos || 0) + 1; })
    .then(() => {
      // ポモドーロの時間は相棒の経験値にもなる
      if (!p || !YK[p] || min <= 0) return;
      return patchDoc("game", v => { v.owned = v.owned || {}; const o = v.owned[p] || { at: Date.now(), exp: 0 }; o.exp = Math.round(((o.exp || 0) + min) * 10) / 10; v.owned[p] = o; })
        .then(() => { const after = lvOf(expOf(p)); if (after > before) { sfx("done"); toast(YK[p].name + " が Lv." + after + " に上がった！" + (canEvolve(p) ? "　進化できる！" : "")); buddyKey = ""; } });
    });
}
let busy = false;
async function timerStart() {
  if (!ready() || busy) return; busy = true;
  const [w] = PRESETS[tPreset];
  try { await backend.save("timer", { running: true, phase: "work", startedAt: Date.now(), durMin: w, fullMin: w, subject: tSubj, preset: tPreset, day: dayKey() }); sfx("ok"); } finally { busy = false; }
}
async function timerPause() {
  const t = S.timer; if (!t.running || busy) return; busy = true;
  try {
    if (t.paused) { await backend.save("timer", { ...t, paused: false, startedAt: Date.now(), durMin: t.leftMs / 60000 }); }
    else {
      const el = (Date.now() - t.startedAt) / 60000, left = Math.max(0, t.durMin * 60000 - el * 60000);
      if (t.phase === "work") await commitStudy(t.day || dayKey(), Math.min(el, t.durMin), t.subject || "en", false);
      await backend.save("timer", { ...t, paused: true, leftMs: left });
    }
  } finally { busy = false; }
}
async function timerStop() {
  const t = S.timer; if (!t.running || busy) return; busy = true;
  try {
    let add = 0;
    if (!t.phase) add = (Date.now() - t.startedAt) / 60000;
    else if (t.phase === "work" && !t.paused) add = Math.min((Date.now() - t.startedAt) / 60000, t.durMin);
    if (add > 0) await commitStudy(t.day || dayKey(), add, t.subject || "en", false);
    await backend.save("timer", { running: false });
    if (add > 0.5) toast(hrs(add) + "時間 記録した。"); 
  } finally { busy = false; }
}
/** 毎秒：区切りが終わったら記録して、休憩へ／休憩が終わったら止める */
async function timerTick() {
  const t = S.timer; if (!t || !t.running || !t.phase || t.paused || busy) return;
  if (Date.now() - t.startedAt < t.durMin * 60000) return;
  busy = true;
  try {
    if (t.phase === "work") {
      await commitStudy(t.day || dayKey(), t.durMin, t.subject || "en", true);
      const [, b] = PRESETS[t.preset] || [25, 5];
      await backend.save("timer", { running: true, phase: "break", startedAt: Date.now(), durMin: b, fullMin: b, subject: t.subject, preset: t.preset, day: dayKey() });
      sfx("bell"); toast("1セット終わり！小判＋5。" + b + "分休憩。"); showBreakQuote();
    } else {
      await backend.save("timer", { running: false });
      sfx("bell"); toast("休憩終わり。次のセットを始めよう。");
    }
  } finally { busy = false; }
}
function showBreakQuote() {
  const mine = (S.quotes || []).map(q => [q.text, q.by || "自分"]);
  const pool = QUOTES.concat(mine, mine), q = pool[Math.floor(Math.random() * pool.length)];
  $("breakQuote").textContent = q[0]; $("breakBy").textContent = "— " + q[1];
}
function renderTimer() {
  const v = timerView(), t = S.timer || {};
  const ring = $("ring"), C = 2 * Math.PI * 46;
  let label, clock, frac;
  if (v.phase === "legacy") { const s = Math.floor(v.el / 1000); clock = Math.floor(s / 3600) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60); label = "計測中（前の版のタイマー）"; frac = 1; }
  else { const s = Math.ceil(v.left / 1000); clock = pad(Math.floor(s / 60)) + ":" + pad(s % 60); frac = v.total ? v.left / v.total : 1; label = v.phase === "work" ? (v.paused ? "一時停止中" : SUBJ[t.subject || "en"] + "を勉強中") : v.phase === "break" ? (v.paused ? "一時停止中" : "休憩中") : "準備OK"; }
  $("tClock").textContent = clock; $("tPhase").textContent = label; ring.dataset.phase = v.phase;
  $("ringArc").style.strokeDasharray = C; $("ringArc").style.strokeDashoffset = C * (1 - frac);
  $("ringArc").style.stroke = v.phase === "break" ? "var(--good)" : "var(--lantern)";
  const running = !!t.running;
  $("tStart").hidden = running; $("tPause").hidden = !running || !t.phase; $("tStop").hidden = !running;
  $("tPause").textContent = t.paused ? "再開" : "一時停止";
  $("breakBox").hidden = v.phase !== "break";
  if (v.phase === "break" && !$("breakQuote").textContent) showBreakQuote();
  document.querySelectorAll("#subjChips button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.s === (running ? t.subject : tSubj))); b.disabled = running; });
  document.querySelectorAll("#presetChips button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.p === (running ? t.preset : tPreset))); b.disabled = running; });
  const k = dayKey(), d = S.days[k] || {}, sub = { ...(d.subj || {}) };
  if (t.running && t.phase === "work" && !t.paused) sub[t.subject] = (sub[t.subject] || 0) + timerRunMin();
  if (t.running && !t.phase) sub.en = (sub.en || 0) + timerRunMin();
  const max = Math.max(60, ...Object.values(sub).map(Number));
  $("subjBars").innerHTML = Object.entries(SUBJ).map(([s, n]) => `<div><span>${n}</span><div class="bar-p"><i style="width:${100 * (sub[s] || 0) / max}%"></i></div><span class="num dot">${hrs(sub[s] || 0)}h</span></div>`).join("");
  $("pomoCount").textContent = "今日 " + (d.pomos || 0) + "セット（1セットごとに小判＋5）";
  $("timerToday").textContent = "今日の合計 " + hrs(minOf(k)) + "h / 目標 " + trimH(targetFor(modeOf(k))) + "h";
}
function bindTimer() {
  $("subjChips").onclick = e => { const b = e.target.closest("button"); if (b && !b.disabled) { tSubj = b.dataset.s; renderTimer(); } };
  $("presetChips").onclick = e => { const b = e.target.closest("button"); if (b && !b.disabled) { tPreset = b.dataset.p; renderTimer(); } };
  $("tStart").onclick = timerStart; $("tPause").onclick = timerPause; $("tStop").onclick = timerStop;
}

/* ===== 文法の確認問題（単元ごとに8問・4択） =====
   形：[問題文, [選択肢4つ], 正解の番号(0始まり), ひとこと解説]　「（　）」が空所 */
const GQ = {
  /* ---------- 中学文法 ---------- */
  jh0: [ // be動詞と一般動詞
    ["My brother （　） a high school student.", ["am", "is", "are", "be"], 1, "主語が3人称単数 → is"],
    ["They （　） in the library now.", ["is", "am", "are", "be"], 2, "主語が複数 → are"],
    ["Ken （　） soccer every day.", ["play", "plays", "playing", "is play"], 1, "3人称単数・現在 → 動詞に -s"],
    ["（　） you like music?", ["Are", "Is", "Do", "Does"], 2, "一般動詞の疑問文 → Do / Does"],
    ["She （　） have a car.", ["don't", "doesn't", "isn't", "aren't"], 1, "3人称単数の否定 → doesn't + 原形"],
    ["（　） your sister a nurse?", ["Do", "Does", "Is", "Are"], 2, "nurse は名詞 → be動詞の疑問文"],
    ["My father （　） to work by bus.", ["go", "goes", "going", "is go"], 1, "3人称単数 → goes"],
    ["We （　） not busy today.", ["do", "does", "is", "are"], 3, "busy は形容詞 → be動詞の否定"]
  ],
  jh1: [ // 時制（現在・過去・未来）
    ["I （　） to Kyoto last summer.", ["go", "went", "have gone", "will go"], 1, "last summer → 過去形"],
    ["It （　） rain tomorrow.", ["will", "is", "was", "did"], 0, "tomorrow → will + 原形"],
    ["She （　） her homework an hour ago.", ["finishes", "finished", "will finish", "has finished"], 1, "ago → 過去形（現在完了とは使わない）"],
    ["Water （　） at 100℃.", ["boil", "boils", "boiled", "will boil"], 1, "不変の真理 → 現在形"],
    ["We are going to （　） our grandmother next week.", ["visit", "visits", "visited", "visiting"], 0, "be going to + 原形"],
    ["（　） you see the movie yesterday?", ["Do", "Does", "Did", "Will"], 2, "yesterday → Did"],
    ["He didn't （　） breakfast this morning.", ["eat", "ate", "eats", "eaten"], 0, "didn't + 原形"],
    ["I （　） up at six every morning.", ["get", "got", "will get", "getting"], 0, "習慣 → 現在形"]
  ],
  jh2: [ // 進行形
    ["Look! The baby （　）.", ["sleeps", "is sleeping", "slept", "sleep"], 1, "今まさに → 現在進行形"],
    ["I （　） TV when you called me.", ["watch", "am watching", "was watching", "watched"], 2, "過去のある時点で進行中 → 過去進行形"],
    ["What （　） you doing now?", ["do", "are", "were", "did"], 1, "now → 現在進行形 are you doing"],
    ["She （　） a red dress today.", ["wears", "is wearing", "wear", "wore"], 1, "一時的な状態 → 進行形"],
    ["I （　） the answer.", ["know", "am knowing", "was knowing", "knowing"], 0, "know は状態動詞 → 進行形にしない"],
    ["They were （　） in the river then.", ["swim", "swam", "swimming", "swims"], 2, "be + -ing（swim → swimming）"],
    ["We （　） for Tokyo tomorrow morning.", ["leave", "are leaving", "left", "were leaving"], 1, "確定した近い予定 → 現在進行形"],
    ["This book （　） to me.", ["belongs", "is belonging", "belong", "was belonging"], 0, "belong は状態動詞"]
  ],
  jh3: [ // 現在完了
    ["I have （　） this movie three times.", ["see", "saw", "seen", "seeing"], 2, "have + 過去分詞（経験）"],
    ["She has lived here （　） 2015.", ["for", "since", "from", "in"], 1, "起点 → since"],
    ["We have known each other （　） ten years.", ["for", "since", "during", "ago"], 0, "期間 → for"],
    ["Have you ever （　） to Hokkaido?", ["go", "went", "been", "gone"], 2, "経験の「行ったことがある」→ have been to"],
    ["He has just （　） his lunch.", ["finish", "finished", "finishing", "finishes"], 1, "完了 just"],
    ["I （　） my key, so I can't open the door.", ["lose", "have lost", "losing", "am losing"], 1, "結果（今もない）→ 現在完了"],
    ["Have you finished your homework （　）?", ["already", "yet", "ever", "since"], 1, "疑問文の「もう」→ yet"],
    ["When （　） you arrive in Japan?", ["have", "did", "has", "do"], 1, "When は現在完了と使えない → 過去形"]
  ],
  jh4: [ // 助動詞
    ["You （　） be quiet in the library.", ["must", "can't", "need", "may to"], 0, "義務 → must"],
    ["（　） I use your pen?", ["Must", "May", "Should", "Will to"], 1, "許可を求める → May I ～?"],
    ["You don't （　） to come tomorrow.", ["must", "have", "should", "can"], 1, "don't have to = ～する必要はない"],
    ["She （　） speak three languages.", ["can", "cans", "can to", "is can"], 0, "助動詞 + 原形・-s はつかない"],
    ["It's late. You （　） go to bed.", ["should", "will be", "are", "had"], 0, "助言 → should"],
    ["He （　） be tired. He worked all day.", ["must", "can", "may not", "needn't"], 0, "強い推量「～に違いない」→ must"],
    ["（　） you open the window?", ["Will", "Must", "Shall", "May"], 0, "依頼 → Will / Can you ～?"],
    ["（　） we go shopping?", ["Shall", "Will", "Must", "Do"], 0, "提案 → Shall we ～?"]
  ],
  jh5: [ // 命令文・感嘆文
    ["（　） careful.", ["Be", "Are", "Is", "Being"], 0, "命令文は原形から（be動詞なら Be）"],
    ["（　） run in the hallway.", ["Not", "Don't", "No", "Doesn't"], 1, "否定の命令 → Don't + 原形"],
    ["（　） beautiful flower this is!", ["How", "What", "What a", "How a"], 2, "What a + 形容詞 + 名詞!"],
    ["（　） fast he runs!", ["What", "How", "What a", "So"], 1, "How + 形容詞/副詞!"],
    ["（　） play tennis after school.", ["Let's", "Let", "Shall", "Lets"], 0, "誘い → Let's + 原形"],
    ["Please （　） me your name.", ["tell", "tells", "telling", "to tell"], 0, "Please + 原形"],
    ["（　） kind you are!", ["What", "How", "What a", "Very"], 1, "名詞がない → How"],
    ["Hurry up, （　） you'll miss the bus.", ["and", "or", "but", "so"], 1, "命令文, or ～ = さもないと"]
  ],
  jh6: [ // 受け身
    ["This bridge was （　） ten years ago.", ["build", "built", "building", "builds"], 1, "be + 過去分詞"],
    ["English is （　） in many countries.", ["speak", "spoke", "spoken", "speaking"], 2, "speak の過去分詞は spoken"],
    ["The room is cleaned （　） her every day.", ["by", "with", "of", "from"], 0, "行為者 → by"],
    ["The mountain is covered （　） snow.", ["by", "with", "at", "in"], 1, "be covered with"],
    ["I was surprised （　） the news.", ["at", "with", "to", "of"], 0, "be surprised at"],
    ["（　） this letter written by Tom?", ["Did", "Was", "Does", "Has"], 1, "受け身の疑問文 → be動詞を前へ"],
    ["He is known （　） everyone in this town.", ["by", "to", "for", "as"], 1, "be known to 〈人〉 = ～に知られている"],
    ["The concert will （　） held next Sunday.", ["be", "is", "been", "being"], 0, "助動詞 + be + 過去分詞"]
  ],
  jh7: [ // 不定詞
    ["I want （　） a doctor.", ["be", "to be", "being", "been"], 1, "want to ～（名詞的用法）"],
    ["I have a lot of homework （　）.", ["do", "to do", "doing", "done"], 1, "形容詞的用法「やるべき宿題」"],
    ["She went to the store （　） some milk.", ["buy", "to buy", "buying", "bought"], 1, "副詞的用法（目的）"],
    ["I was happy （　） the news.", ["hear", "to hear", "hearing", "heard"], 1, "感情の原因 → to 不定詞"],
    ["It is difficult （　） me to read this book.", ["of", "for", "to", "by"], 1, "It is ～ for 〈人〉 to …"],
    ["It is kind （　） you to help me.", ["of", "for", "to", "with"], 0, "人の性質を表す形容詞 → of 〈人〉"],
    ["Do you know how （　） this machine?", ["use", "to use", "using", "used"], 1, "how to ～ = ～のしかた"],
    ["My mother told me （　） my room.", ["clean", "to clean", "cleaning", "cleaned"], 1, "tell 〈人〉 to ～"]
  ],
  jh8: [ // 動名詞
    ["I enjoyed （　） with you.", ["talk", "to talk", "talking", "talked"], 2, "enjoy の後は動名詞"],
    ["He finished （　） the report.", ["write", "to write", "writing", "written"], 2, "finish の後は動名詞"],
    ["（　） English is fun.", ["Learn", "Learning", "Learned", "Learns"], 1, "主語になる動名詞"],
    ["Thank you for （　） me.", ["help", "to help", "helping", "helped"], 2, "前置詞の後は動名詞"],
    ["She is good at （　） the piano.", ["play", "to play", "playing", "played"], 2, "be good at -ing"],
    ["Stop （　）. The baby is sleeping.", ["talk", "talking", "to talk", "talked"], 1, "stop -ing = ～するのをやめる"],
    ["I'm looking forward to （　） you.", ["see", "seeing", "saw", "be seen"], 1, "look forward to -ing（to は前置詞）"],
    ["How about （　） out for dinner?", ["go", "going", "to go", "went"], 1, "How about -ing?"]
  ],
  jh9: [ // 比較
    ["Tom is （　） than Ken.", ["tall", "taller", "tallest", "more tall"], 1, "比較級 + than"],
    ["This is the （　） book of the three.", ["interesting", "more interesting", "most interesting", "interestinger"], 2, "長い語の最上級 → most"],
    ["She runs as （　） as her brother.", ["fast", "faster", "fastest", "more fast"], 0, "as + 原級 + as"],
    ["Mt. Fuji is the highest mountain （　） Japan.", ["of", "in", "than", "at"], 1, "場所・範囲 → in"],
    ["He is the tallest （　） the five boys.", ["in", "of", "than", "at"], 1, "複数の仲間 → of"],
    ["This bag is （　） than that one.", ["good", "better", "best", "more good"], 1, "good の比較級は better"],
    ["Which do you like （　）, tea or coffee?", ["good", "well", "better", "best"], 2, "2つのうち → better"],
    ["My room is not as （　） as yours.", ["big", "bigger", "biggest", "more big"], 0, "not as ～ as … = …ほど～ない"]
  ],
  jh10: [ // 関係代名詞
    ["I have a friend （　） lives in Osaka.", ["who", "which", "whose", "what"], 0, "先行詞が人・主格 → who"],
    ["This is the book （　） I bought yesterday.", ["who", "which", "whose", "what"], 1, "先行詞がもの・目的格 → which / that"],
    ["I know a girl （　） father is a pilot.", ["who", "which", "whose", "that"], 2, "所有格 → whose"],
    ["The man （　） is standing there is my uncle.", ["which", "who", "whose", "what"], 1, "先行詞が人 → who"],
    ["This is the only picture （　） I have.", ["who", "whose", "that", "what"], 2, "the only がつく → that が好まれる"],
    ["（　） he said is true.", ["That", "Which", "What", "Who"], 2, "先行詞なし「～すること」→ what"],
    ["The dog （　） is running there is mine.", ["who", "which", "whose", "what"], 1, "先行詞が動物 → which"],
    ["The cake she made （　） delicious.", ["was", "were", "is being", "be"], 0, "主語は The cake（目的格の関係代名詞の省略）"]
  ],
  jh11: [ // 間接疑問・付加疑問
    ["Do you know where she （　）?", ["lives", "does live", "do live", "living"], 0, "間接疑問 → 疑問詞 + 主語 + 動詞"],
    ["I don't know what time （　）.", ["is it", "it is", "does it", "it does"], 1, "語順は主語 + 動詞"],
    ["You are a student, （　）?", ["aren't you", "don't you", "are you", "isn't it"], 0, "肯定文 → 否定の付加疑問"],
    ["She can swim, （　）?", ["can she", "can't she", "doesn't she", "isn't she"], 1, "助動詞 can → can't she"],
    ["He didn't come, （　）?", ["did he", "didn't he", "does he", "was he"], 0, "否定文 → 肯定の付加疑問"],
    ["Tell me why you （　） late.", ["were", "were you", "did", "was you"], 0, "間接疑問の中は平叙文の語順"],
    ["Let's go, （　）?", ["shall we", "will you", "don't we", "do we"], 0, "Let's ～, shall we?"],
    ["I wonder if it （　） tomorrow.", ["rains", "will rain", "rained", "raining"], 1, "名詞節の if（～かどうか）→ 未来は will"]
  ],
  jh12: [ // 文型（SVO・SVOC）
    ["The news made me （　）.", ["happy", "happily", "happiness", "to happy"], 0, "make O C（C は形容詞）"],
    ["We call him （　）.", ["Ken", "to Ken", "as Ken", "for Ken"], 0, "call O C"],
    ["She looks （　）.", ["sadly", "sad", "sadness", "to sad"], 1, "look + 形容詞（SVC）"],
    ["My father gave （　） a watch.", ["me", "to me", "my", "for me"], 0, "give 〈人〉〈物〉（SVOO）"],
    ["He bought a bag （　） his wife.", ["to", "for", "of", "at"], 1, "buy 〈物〉 for 〈人〉"],
    ["I showed my picture （　） her.", ["to", "for", "of", "with"], 0, "show 〈物〉 to 〈人〉"],
    ["Please keep the door （　）.", ["open", "opening", "opens", "to open"], 0, "keep O C"],
    ["This soup tastes （　）.", ["well", "good", "nicely", "goodly"], 1, "taste + 形容詞"]
  ],
  jh13: [ // 接続詞・前置詞
    ["I was tired, （　） I went to bed early.", ["but", "so", "or", "because"], 1, "結果 → so"],
    ["（　） it was raining, we went out.", ["Because", "Though", "If", "When"], 1, "逆接 → Though / Although"],
    ["I'll call you （　） I get home.", ["when", "while", "until", "since"], 0, "～したら → when（中は現在形）"],
    ["Wait here （　） I come back.", ["by", "until", "since", "during"], 1, "～まで（継続）→ until"],
    ["Finish this （　） Friday.", ["until", "by", "in", "for"], 1, "～までに（期限）→ by"],
    ["I study （　） night.", ["in", "on", "at", "for"], 2, "at night"],
    ["He was born （　） May 5.", ["in", "on", "at", "for"], 1, "日付 → on"],
    ["I fell asleep （　） the movie.", ["while", "during", "for", "when"], 1, "名詞の前 → during（while は節）"]
  ],

  /* ---------- ハイレベル英文法 ---------- */
  hl0: [ // 時制
    ["I'll tell him when he （　） back.", ["comes", "will come", "came", "has come"], 0, "時の副詞節の中は未来でも現在形"],
    ["If it （　） tomorrow, the game will be canceled.", ["rains", "will rain", "rained", "rain"], 0, "条件の副詞節 → 現在形"],
    ["I don't know if he （　） tomorrow.", ["comes", "will come", "came", "come"], 1, "名詞節の if → will を使う"],
    ["By the time we arrived, the train （　）.", ["left", "has left", "had left", "leaves"], 2, "過去のある時点より前 → 過去完了"],
    ["She （　） in Tokyo for ten years next April.", ["lives", "has lived", "will have lived", "lived"], 2, "未来のある時点までの継続 → 未来完了"],
    ["He （　） the piano since he was five.", ["plays", "played", "has been playing", "is playing"], 2, "現在まで続く動作 → 現在完了進行形"],
    ["The train （　） at 9:00 tomorrow.", ["leaves", "left", "has left", "had left"], 0, "時刻表的な確定した予定 → 現在形"],
    ["I （　） this book when you came in.", ["read", "was reading", "have read", "am reading"], 1, "過去の一時点で進行中"]
  ],
  hl1: [ // 完了形
    ["I （　） the book before I saw the movie.", ["read", "have read", "had read", "was reading"], 2, "先に起きた過去 → 過去完了"],
    ["It （　） three years since he died.", ["is", "has been", "had been", "was"], 1, "It has been 〈期間〉 since ～"],
    ["I （　） finished the work by the time you come back.", ["have", "had", "will have", "would"], 2, "未来の時点までに完了 → 未来完了"],
    ["She said that she （　） lost her bag.", ["has", "had", "have", "was"], 1, "時制の一致（前の過去）→ had"],
    ["I （　） to Paris twice.", ["went", "have been", "have gone", "was"], 1, "経験 → have been to"],
    ["He （　） to Paris. He isn't here now.", ["has been", "has gone", "went", "had been"], 1, "行ってしまった（今いない）→ has gone"],
    ["We （　） for an hour when the bus finally came.", ["waited", "have waited", "had been waiting", "are waiting"], 2, "過去の時点まで続いた動作 → 過去完了進行形"],
    ["I have never seen such a beautiful sunset （　）.", ["ago", "before", "since", "yet"], 1, "経験 → before"]
  ],
  hl2: [ // 助動詞
    ["He （　） have been sick. He looked pale.", ["must", "can't", "should", "need"], 0, "must have p.p. = ～したに違いない"],
    ["She （　） have said such a thing. She's too kind.", ["must", "can't", "should", "would"], 1, "can't have p.p. = ～したはずがない"],
    ["You （　） have studied harder.", ["should", "must", "can", "will"], 0, "should have p.p. = ～すべきだったのに"],
    ["You （　） better go now.", ["had", "would", "should", "have"], 0, "had better + 原形"],
    ["I would rather stay home （　） go out.", ["to", "than", "but", "or"], 1, "would rather A than B"],
    ["You （　） well be surprised.", ["may", "must", "can", "should"], 0, "may well ～ = ～するのももっともだ"],
    ["He （　） often go fishing when he was young.", ["would", "should", "must", "might"], 0, "過去の習慣 → would"],
    ["There （　） to be a castle here.", ["used", "would", "should", "use"], 0, "used to = 以前は～だった（状態）"]
  ],
  hl3: [ // 仮定法
    ["If I （　） rich, I would buy a house.", ["am", "were", "will be", "had been"], 1, "仮定法過去 → were"],
    ["If I had known it, I （　） you.", ["will tell", "would tell", "would have told", "had told"], 2, "仮定法過去完了 → would have p.p."],
    ["I wish I （　） fly.", ["can", "could", "will", "may"], 1, "I wish + 仮定法過去"],
    ["I wish I （　） harder last year.", ["studied", "have studied", "had studied", "would study"], 2, "過去の後悔 → had p.p."],
    ["（　） your help, I couldn't finish it.", ["Without", "With", "Unless", "If"], 0, "Without ～ = ～がなければ"],
    ["It's time you （　） to bed.", ["go", "went", "will go", "going"], 1, "It's time + 仮定法過去"],
    ["He talks as if he （　） everything.", ["knows", "knew", "will know", "has known"], 1, "as if + 仮定法過去"],
    ["（　） I you, I would accept the offer.", ["Were", "Was", "If", "Had"], 0, "If の省略 → 倒置 Were I you"]
  ],
  hl4: [ // 態（受動態）
    ["The work must （　） by tomorrow.", ["finish", "be finished", "finished", "be finishing"], 1, "助動詞 + be + p.p."],
    ["The house is （　） built now.", ["been", "being", "be", "to be"], 1, "進行形の受け身 → be being p.p."],
    ["He was made （　） the room.", ["clean", "to clean", "cleaning", "cleaned"], 1, "使役 make の受け身 → to 不定詞"],
    ["She was seen （　） the building.", ["enter", "to enter", "entered", "enters"], 1, "知覚動詞の受け身 → to 不定詞"],
    ["I was spoken （　） by a stranger.", ["to", "by", "to by", "with"], 2, "群動詞 speak to → be spoken to by"],
    ["The baby was taken care （　） by her aunt.", ["for", "of", "with", "to"], 1, "take care of の受け身"],
    ["This book has （　） translated into many languages.", ["be", "being", "been", "was"], 2, "完了形の受け身 → have been p.p."],
    ["I am interested （　） history.", ["at", "in", "with", "on"], 1, "be interested in"]
  ],
  hl5: [ // 不定詞
    ["He seems （　） ill.", ["be", "to be", "being", "been"], 1, "seem to ～"],
    ["He seems to （　） ill yesterday.", ["be", "have been", "being", "was"], 1, "述語より前のこと → 完了不定詞"],
    ["I got up early （　） to miss the train.", ["so as not", "not so as", "in order", "so that not"], 0, "so as not to ～ = ～しないように"],
    ["This box is too heavy for me （　）.", ["carry", "to carry", "to carry it", "carrying"], 1, "too ～ to …（目的語は主語と同じなので it 不要）"],
    ["She was kind enough （　） me the way.", ["show", "to show", "showing", "showed"], 1, "形容詞 + enough to ～"],
    ["I have nothing to write （　）.", ["on", "about", "with", "by"], 2, "write with（ペンなど）"],
    ["He awoke （　） himself famous.", ["find", "to find", "finding", "found"], 1, "結果の不定詞 awoke to find"],
    ["To tell the （　）, I don't like him.", ["true", "truth", "truly", "trust"], 1, "独立不定詞 to tell the truth"]
  ],
  hl6: [ // 動名詞
    ["I remember （　） him before.", ["meet", "to meet", "meeting", "met"], 2, "remember -ing = （過去に）～したことを覚えている"],
    ["Remember （　） the letter.", ["post", "to post", "posting", "posted"], 1, "remember to ～ = 忘れずに～する"],
    ["I'm sure of his （　） the exam.", ["pass", "passing", "to pass", "passed"], 1, "所有格 + 動名詞（意味上の主語）"],
    ["There is no （　） what will happen.", ["know", "knowing", "to know", "known"], 1, "There is no -ing = ～できない"],
    ["It is no use （　） over spilt milk.", ["cry", "crying", "to cry", "cried"], 1, "It is no use -ing"],
    ["I'm used to （　） up early.", ["get", "getting", "got", "be got"], 1, "be used to -ing = ～に慣れている"],
    ["He is ashamed of （　） lazy when young.", ["being", "having been", "be", "to be"], 1, "述語より前 → 完了動名詞"],
    ["I feel like （　） a walk.", ["take", "taking", "to take", "took"], 1, "feel like -ing = ～したい気がする"]
  ],
  hl7: [ // 分詞
    ["Look at the （　） baby.", ["sleep", "sleeping", "slept", "to sleep"], 1, "能動「眠っている」→ 現在分詞"],
    ["I had my hair （　）.", ["cut", "cutting", "to cut", "cuts"], 0, "have O p.p. = ～してもらう"],
    ["The movie was very （　）.", ["excite", "excited", "exciting", "excites"], 2, "物が人をわくわくさせる → exciting"],
    ["I was （　） at the news.", ["surprise", "surprising", "surprised", "to surprise"], 2, "人が驚かされる → surprised"],
    ["I heard my name （　）.", ["call", "calling", "called", "to call"], 2, "名前は呼ばれる → p.p."],
    ["I saw him （　） the street.", ["cross", "crossed", "to cross", "be crossed"], 0, "知覚動詞 + O + 原形"],
    ["He sat on the bench, （　） a book.", ["read", "reading", "to read", "was reading"], 1, "付帯状況の分詞"],
    ["Keep the door （　）.", ["lock", "locking", "locked", "to lock"], 2, "ドアは鍵をかけられた状態 → p.p."]
  ],
  hl8: [ // 分詞構文
    ["（　） tired, I went to bed early.", ["Be", "Being", "Been", "To be"], 1, "理由の分詞構文"],
    ["（　） from a distance, the rock looks like a face.", ["Seeing", "Seen", "See", "To see"], 1, "岩は見られる → 過去分詞"],
    ["（　） my homework, I went out.", ["Finishing", "Having finished", "Finished", "To finish"], 1, "先に終えた → 完了分詞構文"],
    ["The weather （　） fine, we went hiking.", ["being", "been", "was", "is"], 0, "独立分詞構文（主語が違う）"],
    ["（　） speaking, he is a good man.", ["General", "Generally", "Generous", "Generality"], 1, "慣用 Generally speaking"],
    ["She was reading with her legs （　）.", ["cross", "crossing", "crossed", "to cross"], 2, "with + O + p.p.（脚は組まれる）"],
    ["（　） what to say, she kept silent.", ["Not knowing", "Knowing not", "Don't knowing", "No knowing"], 0, "分詞構文の否定は not を分詞の前に"],
    ["（　） the station, I met an old friend.", ["Walk to", "Walking to", "Walked to", "To walked"], 1, "時の分詞構文"]
  ],
  hl9: [ // 関係代名詞
    ["This is the house （　） I was born in.", ["which", "where", "what", "whose"], 0, "前置詞 in の目的語 → which"],
    ["I have a friend, （　） lives in London.", ["who", "that", "which", "whom"], 0, "非制限用法（, の後）は that 不可"],
    ["He said nothing, （　） made her angry.", ["that", "which", "what", "who"], 1, "前の文全体を受ける , which"],
    ["（　） is important is to keep trying.", ["That", "Which", "What", "It"], 2, "先行詞を含む what"],
    ["The man （　） I thought was honest lied to me.", ["who", "whom", "which", "whose"], 0, "連鎖関係代名詞（I thought をはさむ主格）"],
    ["This is all （　） I have.", ["what", "that", "which", "who"], 1, "all が先行詞 → that"],
    ["He is not （　） he used to be.", ["that", "which", "what", "who"], 2, "what he used to be = 昔の彼"],
    ["There are some students （　） parents work here.", ["who", "whose", "whom", "that"], 1, "所有格 whose"]
  ],
  hl10: [ // 関係副詞
    ["This is the town （　） I grew up.", ["which", "where", "when", "why"], 1, "場所 + SV（完全文）→ where"],
    ["I remember the day （　） we first met.", ["which", "where", "when", "how"], 2, "時 → when"],
    ["That's the reason （　） I was late.", ["why", "which", "where", "how"], 0, "理由 → why"],
    ["This is （　） he solved the problem.", ["the way how", "how", "which", "what"], 1, "the way how は不可 → how か the way"],
    ["This is the town （　） I visited last year.", ["where", "which", "when", "what"], 1, "visit の目的語が欠けている → which"],
    ["Spring is the season （　） flowers bloom.", ["which", "when", "where", "why"], 1, "時 → when"],
    ["We went to Kyoto, （　） we stayed for a week.", ["which", "where", "when", "that"], 1, "非制限の where"],
    ["Do you know the reason （　） she gave?", ["why", "which", "where", "when"], 1, "give の目的語が欠けている → which"]
  ],
  hl11: [ // 比較
    ["He is （　） taller than I.", ["very", "much", "more", "so"], 1, "比較級の強調 → much / far"],
    ["The （　） you study, the better your grades will be.", ["much", "more", "most", "many"], 1, "the 比較級, the 比較級"],
    ["This box is three times as （　） as that one.", ["heavy", "heavier", "heaviest", "heavily"], 0, "倍数 + as 原級 as"],
    ["No other student in the class is （　） than Ken.", ["tall", "taller", "tallest", "most tall"], 1, "No other ～ 比較級 than = 最上級の意味"],
    ["He is not so much a scholar （　） a writer.", ["as", "than", "but", "or"], 0, "not so much A as B = AというよりB"],
    ["I have no more than 500 yen. = I have （　） 500 yen.", ["only", "at least", "at most", "as many as"], 0, "no more than = only"],
    ["She is superior （　） me in English.", ["than", "to", "for", "at"], 1, "superior to（than は使わない）"],
    ["This is by （　） the best movie I've seen.", ["much", "far", "very", "more"], 1, "最上級の強調 → by far"]
  ],
  hl12: [ // 否定
    ["Not all the students （　） the answer.", ["knew", "didn't know", "knows", "not knew"], 0, "部分否定 Not all = 全員が～わけではない"],
    ["He is （　） a liar.", ["not", "no", "never", "nothing"], 2, "never = 決して～ない"],
    ["I could （　） understand what he said.", ["hard", "hardly", "harder", "hardest"], 1, "hardly = ほとんど～ない"],
    ["It was not （　） I got home that I realized it.", ["when", "until", "since", "before"], 1, "It was not until ～ that … = ～して初めて…"],
    ["He is the last person （　） tell a lie.", ["to", "who", "that", "for"], 0, "the last person to ～ = 最も～しそうにない人"],
    ["She is anything （　） honest.", ["but", "of", "for", "than"], 0, "anything but = 決して～ない"],
    ["You cannot be （　） careful when driving.", ["so", "too", "very", "enough"], 1, "cannot ～ too … = いくら…してもしすぎない"],
    ["Hardly （　） he arrived when it began to rain.", ["did", "had", "was", "has"], 1, "Hardly had S p.p. when ～（倒置）"]
  ],
  hl13: [ // 倒置・強調・省略
    ["Never （　） I seen such a sight.", ["have", "did", "had", "has"], 0, "否定語が文頭 → 倒置 have I seen"],
    ["It was Tom （　） broke the window.", ["what", "who", "which", "whom"], 1, "強調構文 It was ～ who/that …"],
    ["Little （　） he know what would happen.", ["does", "did", "had", "was"], 1, "Little did he know"],
    ["\"I like cats.\" \"So （　） I.\"", ["am", "do", "does", "like"], 1, "So + do + S = Sもそうだ"],
    ["\"I can't swim.\" \"Neither （　） I.\"", ["can", "can't", "do", "am"], 0, "Neither + 助動詞 + S"],
    ["I do （　） you're right.", ["think", "thinks", "thought", "thinking"], 0, "動詞の強調 do + 原形"],
    ["While （　） in Paris, I met him.", ["stay", "staying", "stayed", "to stay"], 1, "接続詞の後の S + be の省略"],
    ["Only then （　） I understand the meaning.", ["do", "did", "had", "was"], 1, "Only + 副詞句 が文頭 → 倒置"]
  ],
  hl14: [ // 接続詞
    ["I'll lend you the money （　） you pay me back.", ["unless", "as long as", "though", "in case"], 1, "as long as = ～する限り（条件）"],
    ["Take an umbrella （　） it rains.", ["in case", "unless", "so that", "though"], 0, "in case = ～するといけないから"],
    ["He spoke slowly （　） everyone could understand.", ["so that", "such that", "in order", "as if"], 0, "so that S can ～ = ～できるように"],
    ["It was （　） a hot day that we stayed home.", ["so", "such", "very", "too"], 1, "such a 形容詞 + 名詞 that"],
    ["You won't pass （　） you study harder.", ["if", "unless", "because", "while"], 1, "unless = ～しない限り"],
    ["（　） I got home, it started raining.", ["As soon as", "Unless", "Even if", "So that"], 0, "～するとすぐ"],
    ["Whether you like it （　） not, you must go.", ["or", "and", "nor", "but"], 0, "whether A or not"],
    ["（　） he is young, he is very wise.", ["Although", "Because", "Unless", "So"], 0, "譲歩 → Although"]
  ],
  hl15: [ // 前置詞
    ["I'll be back （　） an hour.", ["in", "after", "for", "since"], 0, "今から～後 → in"],
    ["He is good （　） math.", ["in", "at", "on", "for"], 1, "be good at"],
    ["She is proud （　） her son.", ["of", "for", "at", "with"], 0, "be proud of"],
    ["This bridge is made （　） wood.", ["from", "of", "by", "into"], 1, "材料がそのまま → of"],
    ["Wine is made （　） grapes.", ["from", "of", "by", "with"], 0, "原料が変化 → from"],
    ["I agree （　） you.", ["to", "with", "on", "for"], 1, "agree with 〈人〉"],
    ["He died （　） cancer.", ["of", "from", "by", "with"], 0, "病気で → die of"],
    ["The train arrived （　） time.", ["on", "in", "at", "by"], 0, "on time = 時間どおりに"]
  ],
  hl16: [ // 名詞・冠詞
    ["I need some （　）.", ["advices", "advice", "an advice", "advise"], 1, "advice は不可算名詞"],
    ["He gave me a piece of （　）.", ["informations", "information", "an information", "informed"], 1, "information は不可算"],
    ["There are a lot of （　） in the room.", ["furnitures", "furniture", "a furniture", "furniture's"], 1, "furniture は不可算（a piece of で数える）"],
    ["She plays （　） piano well.", ["a", "the", "—", "an"], 1, "楽器 → the"],
    ["I go to school by （　） bus.", ["a", "the", "—", "an"], 2, "by + 交通手段は無冠詞"],
    ["He is （　） honest man.", ["a", "an", "the", "—"], 1, "母音の音で始まる → an"],
    ["We have a lot of （　） today.", ["homeworks", "homework", "a homework", "homeworking"], 1, "homework は不可算"],
    ["Twice （　） week I go swimming.", ["the", "a", "an", "per the"], 1, "～につき → a"]
  ],
  hl17: [ // 代名詞
    ["I have two pens. One is red, and （　） is blue.", ["another", "the other", "other", "others"], 1, "2つのうち残りの1つ → the other"],
    ["Some like summer, and （　） like winter.", ["the other", "another", "others", "other"], 2, "ある人々・別の人々 → others"],
    ["This cake is good. Can I have （　）?", ["other", "another", "the other", "others"], 1, "もう1つ → another"],
    ["The climate of Japan is milder than （　） of Canada.", ["it", "that", "this", "one"], 1, "前の名詞の繰り返し（単数）→ that"],
    ["I lost my umbrella, so I bought a new （　）.", ["it", "one", "that", "this"], 1, "同じ種類の別のもの → one"],
    ["（　） of the two girls is my sister.", ["Either", "Both", "All", "Every"], 0, "2人のうちどちらか → Either（単数扱い）"],
    ["Help （　） to the cake.", ["you", "your", "yourself", "yours"], 2, "help oneself to ～ = 自由に取って食べる"],
    ["（　） student has a computer.", ["All", "Every", "Both", "Most"], 1, "Every + 単数名詞"]
  ],
  hl18: [ // 形容詞・副詞
    ["There is （　） water in the bottle.", ["few", "a few", "little", "many"], 2, "不可算 + ほとんどない → little"],
    ["I have （　） friends in Tokyo.", ["a little", "a few", "little", "much"], 1, "可算 + 少しある → a few"],
    ["He worked （　）.", ["hard", "hardly", "hardness", "harder than"], 0, "hard = 熱心に（hardly はほとんど～ない）"],
    ["I have been busy （　）.", ["late", "lately", "later", "latest"], 1, "lately = 最近"],
    ["She is （　） to win the game.", ["likely", "possible", "probably", "easy"], 0, "be likely to ～"],
    ["It is （　） for him to finish it today.", ["impossible", "unable", "incapable", "capable"], 0, "It is impossible for 〈人〉 to ～"],
    ["I bought a （　） car.", ["Japanese new", "new Japanese", "Japanese a new", "newly Japanese"], 1, "形容詞の順番：新旧 → 国籍"],
    ["He is （　） to come.", ["sure", "surely", "sureness", "assured of"], 0, "be sure to ～ = きっと～する"]
  ],
  hl19: [ // 疑問文・特殊構文
    ["（　） do you think he is?", ["Who", "Do you know who", "Whom", "Whose"], 0, "Do you think の文は疑問詞が文頭"],
    ["（　） do you go to the dentist?", ["How long", "How often", "How much", "How many"], 1, "頻度 → How often"],
    ["（　） did it take to get there?", ["How long", "How far", "How often", "What time"], 0, "かかった時間 → How long"],
    ["What do you think （　） this plan?", ["about", "of", "for", "with"], 1, "What do you think of ～?"],
    ["What （　） you come here?", ["made", "brought", "caused", "let"], 0, "What made you ～? = なぜ～したの"],
    ["The bad weather prevented us （　） going out.", ["from", "of", "to", "for"], 0, "prevent O from -ing"],
    ["This song reminds me （　） my childhood.", ["of", "about", "to", "for"], 0, "remind A of B"],
    ["（　） is no doubt that he will win.", ["It", "There", "That", "This"], 1, "There is no doubt that ～"]
  ]
};

/* ===== 勉強：単語（即答できるまで）・穴埋め4択・文法トラッカー ===== */
const FAST_MS = 2000;
const TW = (typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : []);
const TWI = new Map(TW.map((w, i) => [w[2], i]));
const KO = (typeof KOBUN !== "undefined" ? KOBUN : []);
const SQA = (typeof SEIKEI_QA !== "undefined" ? SEIKEI_QA : []), SQZ = (typeof SEIKEI_QUIZ !== "undefined" ? SEIKEI_QUIZ : []);
const lines = m => String(m).split(/[；;]/).map(s => s.trim()).filter(Boolean).map((s, i) => "①②③④⑤⑥⑦⑧"[i] + s).join("　");
const circled = i => "①②③④⑤⑥⑦⑧⑨"[i] || "・";
/** 単語帳：英単語（ターゲット1900）と古文単語（重要古文単語315）を同じ仕組みで回す。
    items は { id, q(見出し html), sub(補足 html), a(意味 html), ex(例文 html) } */
const DECKS = {
  en: {
    store: "words", per: 50, start: PLAN_START, unit: "語", title: "ターゲット1900 Part1〜2", rule: "英単語を見て",
    items: TW.map(w => ({ id: w[2], q: esc(w[0]), a: esc(lines(w[1])), ex: w[3] ? esc(w[3].replace(/\{\{c1::(.*?)\}\}/, "$1")) + "<br>" + esc(w[4] || "") : "" }))
  },
  ko: {
    store: "kobun", per: 30, mid: true, start: PLAN_START, unit: "語", title: "重要古文単語315", rule: "古語を見て",
    // 中身はAnkiの書き出しを変換した、ふりがな（ruby）と赤字（b）だけの html
    items: KO.map(w => ({ id: w.n, q: w.word, sub: [w.kanji, w.pos].filter(Boolean).join("　"), a: w.mean.map((m, i) => circled(i) + m).join("<br>"), ex: (w.rel || []).length ? "関連語：" + w.rel.map(r => r.word + "（" + r.mean + "）").join("　") : "" }))
  },
  se: {
    store: "seikei", per: 50, start: PLAN_START, unit: "問", title: "政経 一問一答", rule: "問題を読んで", limit: 6000, small: true,
    items: SQA.map(w => ({ id: w.id, q: esc(w.q), sub: esc(w.unit), a: esc(w.a) }))
  }
};
for (const d of Object.values(DECKS)) d.index = new Map(d.items.map((x, i) => [x.id, i]));
let learnTab = "words", wSet = { en: null, ko: null, se: null };
const deckOfTab = () => learnTab === "kobun" ? "ko" : learnTab === "seikei" ? "se" : "en";
const limitOf = dk => DECKS[dk].limit || FAST_MS;
const dayIdx = (dk, k = dayKey()) => { const D = DECKS[dk]; return clamp(daysBetween(D.start, k), 0, Math.max(0, Math.ceil(D.items.length / D.per) - 1)); };
const setOf = (dk, i) => { const D = DECKS[dk]; return D.items.slice(i * D.per, i * D.per + D.per); };
/* ---- 単語 ---- */
let sess = null; // {deck, queue:[id], mode, t0, phase:'ask'|'judge'|'miss', cur}
function clearedToday(dk) { return new Set(((S[DECKS[dk].store].cleared || {})[dayKey()] || [])); }
function startWords(dk, mode) {
  const D = DECKS[dk], st = S[D.store];
  if (!D.items.length) { toast("単語データが入っていない。"); return; }
  const done = clearedToday(dk);
  let nums;
  if (mode === "weak") { const upto = (dayIdx(dk) + 1) * D.per; nums = D.items.slice(0, upto).filter(w => { const s = (st.w || {})[w.id]; return s && (s[2] || 0) > 0 && (s[0] || 0) < 3; }).map(w => w.id).slice(0, D.per); if (!nums.length) { toast("苦手な単語はまだない。"); return; } }
  else nums = setOf(dk, wSet[dk] ?? dayIdx(dk)).map(w => w.id).filter(n => !done.has(n));
  if (!nums.length) { toast("この" + D.per + "語は今日もう全部即答できた。"); return; }
  for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
  sess = { deck: dk, queue: nums, mode, total: nums.length, cleared: 0, tries: 0 };
  nextWord(); renderLearn();
}
let limitT = 0;
function nextWord() {
  clearTimeout(limitT);
  if (!sess) return renderLearn();
  if (!sess.queue.length) { const n = sess.cleared; sess = null; sfx("done"); confetti(); toast(n + "語、全部即答できた！"); renderLearn(); return; }
  sess.cur = sess.queue[0]; sess.phase = "ask"; sess.t0 = performance.now(); sess.tries++;
  renderFlash();
  limitT = setTimeout(() => { if (sess && sess.phase === "ask") answerWord(false, true); }, limitOf(sess.deck) + 1200);
}
function answerWord(recalled, timeout) {
  if (!sess || sess.phase !== "ask") return;
  clearTimeout(limitT);
  sess.ms = performance.now() - sess.t0;
  if (recalled) { sess.phase = "judge"; } else { sess.phase = "miss"; sess.why = timeout ? "時間切れ" : "わからない"; record(false, false); sfx("ng"); }
  renderFlash();
}
function judgeWord(ok) {
  if (!sess || sess.phase !== "judge") return;
  const fast = ok && sess.ms <= limitOf(sess.deck);
  record(ok, fast);
  if (fast) { sess.queue.shift(); sess.cleared++; sfx("coin"); }
  else { requeue(); sfx(ok ? "tap" : "ng"); }
  if (!ok) { sess.phase = "miss"; sess.why = "違った"; renderFlash(); return; }
  if (!fast) toast("正解。でも" + (sess.ms / 1000).toFixed(1) + "秒。即答できるまで、また出る。");
  nextWord();
}
function requeue() { const n = sess.queue.shift(); const at = Math.min(sess.queue.length, 3 + Math.floor(Math.random() * 4)); sess.queue.splice(at, 0, n); }
function missNext() { if (sess && sess.phase === "miss") { if (sess.queue[0] === sess.cur) requeue(); nextWord(); } }
function record(ok, fast) {
  const n = sess.cur, k = dayKey();
  patchDoc(DECKS[sess.deck].store, v => {
    v.w = v.w || {}; v.cleared = v.cleared || {};
    const s = v.w[n] || [0, 0, 0, ""];
    if (fast) { s[0] = Math.min(5, (s[0] || 0) + 1); s[1] = (s[1] || 0) + 1; v.cleared[k] = [...new Set([...(v.cleared[k] || []), n])]; }
    else if (!ok) { s[0] = 0; s[2] = (s[2] || 0) + 1; }
    s[3] = k; v.w[n] = s;
  });
}
function renderFlash() {
  const box = $("flash"); if (!sess || deckOfTab() !== sess.deck) { box.hidden = true; return; }
  box.hidden = false;
  const D = DECKS[sess.deck], w = D.items[D.index.get(sess.cur)], left = sess.queue.length;
  let h = `<div class="qprog"><span>残り ${left}語</span><span>${sess.mode === "weak" ? "苦手の復習" : "今日の" + D.per + "語"}・即答 ${sess.cleared}/${sess.total}</span></div>`;
  const lim = limitOf(sess.deck);
  h += `<div class="no">No.${esc(w.id)}</div><div class="word${D.small ? " small" : D.mid ? " mid" : ""}">${w.q}</div>`;
  const ans = `<div class="mean">${w.a}</div>${w.sub ? `<div class="ex">${w.sub}</div>` : ""}${w.ex ? `<div class="ex">${w.ex}</div>` : ""}`;
  if (sess.phase === "ask") {
    h += `<div class="limit go"><i style="animation-duration:${lim}ms"></i></div><div class="note">${D.small ? "読んで答えを思い浮かべて押せ" : "見た瞬間に意味を思い浮かべて押せ"}（${lim / 1000}秒）</div>
      <div class="pair"><button class="big-btn" type="button" data-a="yes">浮かんだ</button><button class="big-btn ng" type="button" data-a="no">わからない</button></div>`;
  } else if (sess.phase === "judge") {
    h += ans + `<div class="note">思い浮かべた答えは合ってた？　${(sess.ms / 1000).toFixed(1)}秒${sess.ms <= lim ? "（即答）" : "（遅い）"}</div>
      <div class="pair"><button class="big-btn ink" type="button" data-j="1">○ 合ってた</button><button class="big-btn ng" type="button" data-j="0">× 違った</button></div>`;
  } else {
    h += `<div class="note" style="color:var(--seal);font-weight:700">${esc(sess.why)}。もう一度出る。</div>` + ans + `<button class="big-btn ink" type="button" data-n="1">次へ</button>`;
  }
  h += `<button class="btn ghost sm" type="button" data-q="1" style="justify-self:center">やめる（ここまでは記録済み）</button>`;
  box.innerHTML = h;
}
/* ---- 穴埋め4択 ---- */
let cz = null; // {qs:[{i, choices:[i], ans}], n, ok, picked}
function clozeParts(s) { const m = String(s).match(/^(.*?)([A-Za-z]*)\{\{c1::(.*?)\}\}([A-Za-z]*)(.*)$/); return m ? { pre: m[1], hit: m[2] + m[3] + m[4], post: m[5] } : null; }
function startCloze() {
  const upto = Math.max(50, (dayIdx("en") + 1) * 50), pool = TW.slice(0, upto).filter(w => w[3] && clozeParts(w[3]));
  if (pool.length < 4) { toast("例文のある単語が足りない。"); return; }
  const weight = w => { const s = (S.words.w || {})[w[2]]; return 1 + (s ? (s[2] || 0) * 2 - (s[0] || 0) * 0.3 : 1); };
  const qs = [], used = new Set();
  while (qs.length < 10 && used.size < pool.length) {
    let tot = 0; for (const w of pool) if (!used.has(w[2])) tot += Math.max(0.2, weight(w));
    let r = Math.random() * tot, pick = null; for (const w of pool) { if (used.has(w[2])) continue; r -= Math.max(0.2, weight(w)); if (r <= 0) { pick = w; break; } }
    pick = pick || pool.find(w => !used.has(w[2])); used.add(pick[2]);
    const others = []; while (others.length < 3) { const o = pool[Math.floor(Math.random() * pool.length)]; if (o[2] !== pick[2] && !others.includes(o)) others.push(o); }
    const choices = [pick, ...others].sort(() => Math.random() - 0.5);
    qs.push({ w: pick, choices, ans: choices.indexOf(pick) });
  }
  cz = { qs, n: 0, ok: 0, picked: null }; renderCloze();
}
function renderCloze() {
  const box = $("clozeBox"); if (!cz) { box.hidden = true; return; }
  box.hidden = false;
  if (cz.n >= cz.qs.length) { box.innerHTML = `<div class="flash"><div class="word dot">${cz.ok} / ${cz.qs.length}</div><div class="note">正解1問ごとに小判＋1</div><button class="big-btn" type="button" data-cz="again">もう10問</button><button class="btn ghost" type="button" data-cz="end">終わる</button></div>`; return; }
  const q = cz.qs[cz.n], p = clozeParts(q.w[3]);
  let h = `<div class="qprog"><span>${cz.n + 1} / ${cz.qs.length}</span><span>正解 ${cz.ok}</span></div><div class="cloze">${esc(p.pre)}<span class="blank">${cz.picked == null ? "？" : esc(p.hit)}</span>${esc(p.post)}</div><div class="note">${esc(q.w[4] || "")}</div><div class="choices">`;
  q.choices.forEach((c, i) => { const cls = cz.picked == null ? "" : i === q.ans ? "right" : i === cz.picked ? "wrong" : ""; h += `<button type="button" class="${cls}" data-c="${i}" ${cz.picked != null ? "disabled" : ""}>${esc(c[0])}</button>`; });
  h += `</div>`;
  if (cz.picked != null) h += `<div class="mean" style="font-size:14px">${esc(q.w[0])}：${esc(lines(q.w[1]))}</div><button class="big-btn ink" type="button" data-cz="next">次へ</button>`;
  box.innerHTML = h;
}
function pickCloze(i) {
  if (!cz || cz.picked != null) return;
  const q = cz.qs[cz.n]; cz.picked = i; const ok = i === q.ans; if (ok) cz.ok++;
  sfx(ok ? "coin" : "ng");
  patchDoc("cloze", v => { v.total = (v.total || 0) + 1; if (ok) v.correct = (v.correct || 0) + 1; });
  if (!ok) patchDoc("words", v => { v.w = v.w || {}; const s = v.w[q.w[2]] || [0, 0, 0, ""]; s[2] = (s[2] || 0) + 1; s[0] = 0; v.w[q.w[2]] = s; });
  renderCloze();
}
/* ---- 文法トラッカー ---- */
const GRAMMAR = {
  jh: { name: "中学文法", units: ["be動詞と一般動詞", "時制（現在・過去・未来）", "進行形", "現在完了", "助動詞", "命令文・感嘆文", "受け身", "不定詞", "動名詞", "比較", "関係代名詞", "間接疑問・付加疑問", "文型（SVO・SVOC）", "接続詞・前置詞"] },
  hl: { name: "ハイレベル英文法", units: ["時制", "完了形", "助動詞", "仮定法", "態（受動態）", "不定詞", "動名詞", "分詞", "分詞構文", "関係代名詞", "関係副詞", "比較", "否定", "倒置・強調・省略", "接続詞", "前置詞", "名詞・冠詞", "代名詞", "形容詞・副詞", "疑問文・特殊構文"] }
};
let openUnit = "";
function renderGrammar() {
  const U = S.grammar.units || {};
  for (const g of Object.keys(GRAMMAR)) {
    const html = GRAMMAR[g].units.map((name, i) => {
      const id = g + i, u = U[id] || {}, b = u.best, pc = b ? Math.round(100 * b[0] / b[1]) : null;
      return `<li class="unit${u.passed ? " pass" : ""}"><span><b style="font-size:14px">${esc(name)}</b>${u.passed ? ' <span class="rar r1" style="color:var(--good)">合格</span>' : ""}<br><span class="note">${u.tries ? "挑戦 " + u.tries + "回" : "まだ記録なし"}</span></span>
      <span class="row" style="flex-wrap:nowrap"><button class="btn pri sm" type="button" data-gs="${id}">確認問題</button><button class="btn sm" type="button" data-u="${id}">${pc == null ? "手で記録" : "<span class='pc'>" + pc + "%</span>"}</button></span>
      ${openUnit === id ? `<form data-uf="${id}"><input class="field num" id="uo-${id}" type="number" min="0" inputmode="numeric" placeholder="正解"><span>/</span><input class="field num" id="ut-${id}" type="number" min="1" inputmode="numeric" placeholder="問題数"><button class="btn pri sm" type="submit">保存</button><span class="note">8割で合格（小判＋30・お化けが仲間に）</span></form>` : ""}</li>`;
    }).join("");
    const el = $("units-" + g); if (el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; }
    const passed = GRAMMAR[g].units.filter((_, i) => (U[g + i] || {}).passed).length;
    $("gsum-" + g).textContent = passed + " / " + GRAMMAR[g].units.length + " 単元 合格";
  }
}
/* ---- 単元の確認問題（8問・4択）。終わると点数をそのまま記録 ---- */
let gq = null;
function startGQ(id) {
  const src = (typeof GQ !== "undefined" && GQ[id]) || [];
  if (!src.length) { toast("この単元の問題はまだない。"); return; }
  const qs = src.map(q => { const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5); return { q: q[0], c: order.map(i => q[1][i]), ans: order.indexOf(q[2]), ex: q[3] }; }).sort(() => Math.random() - 0.5);
  gq = { id, qs, n: 0, ok: 0, picked: null }; openUnit = ""; renderGQ(); $("gqBox").scrollIntoView({ block: "start", behavior: "smooth" });
}
function gqName(id) { return GRAMMAR[id.slice(0, 2)].units[Number(id.slice(2))]; }
function renderGQ() {
  const box = $("gqBox"); if (!gq) { box.hidden = true; return; }
  box.hidden = false;
  if (gq.n >= gq.qs.length) {
    const pass = gq.ok / gq.qs.length >= 0.8;
    box.innerHTML = `<div class="flash"><div class="eyebrow">${esc(gqName(gq.id))}</div><div class="word dot">${gq.ok} / ${gq.qs.length}</div><div class="note">${pass ? "合格！記録した。" : "8割に届かず。記録はした。もう一回やれ。"}</div><button class="big-btn" type="button" data-gq="again">もう一回</button><button class="btn ghost" type="button" data-gq="end">閉じる</button></div>`; return;
  }
  const q = gq.qs[gq.n];
  let h = `<div class="qprog"><span>${esc(gqName(gq.id))}　${gq.n + 1} / ${gq.qs.length}</span><span>正解 ${gq.ok}</span></div><div class="cloze">${esc(q.q).replace("（　）", '<span class="blank">' + (gq.picked == null ? "？" : esc(q.c[q.ans])) + "</span>")}</div><div class="choices">`;
  q.c.forEach((c, i) => { const cls = gq.picked == null ? "" : i === q.ans ? "right" : i === gq.picked ? "wrong" : ""; h += `<button type="button" class="${cls}" data-gc="${i}" ${gq.picked != null ? "disabled" : ""}>${esc(c)}</button>`; });
  h += `</div>`;
  if (gq.picked != null) h += `<div class="mean" style="font-size:14px">${esc(q.ex)}</div><button class="big-btn ink" type="button" data-gq="next">次へ</button>`;
  box.innerHTML = h;
}
function pickGQ(i) {
  if (!gq || gq.picked != null) return;
  const q = gq.qs[gq.n]; gq.picked = i; if (i === q.ans) gq.ok++;
  sfx(i === q.ans ? "ok" : "ng"); renderGQ();
}
function nextGQ() {
  gq.n++; gq.picked = null;
  if (gq.n >= gq.qs.length) saveUnit(gq.id, gq.ok, gq.qs.length);
  renderGQ();
}
function saveUnit(id, ok, tot) {
  const before = !!((S.grammar.units || {})[id] || {}).passed;
  patchDoc("grammar", v => { v.units = v.units || {}; const u = v.units[id] || { tries: 0 }; u.tries = (u.tries || 0) + 1; if (!u.best || ok / tot > u.best[0] / u.best[1]) u.best = [ok, tot]; if (ok / tot >= 0.8) u.passed = true; v.units[id] = u; })
    .then(() => { if (!before && ok / tot >= 0.8) { sfx("done"); confetti(); toast("合格！小判＋30。新しい仲間が来る。"); checkUnlocks(); } else sfx(ok / tot >= 0.8 ? "ok" : "tap"); });
}
/* ---- 政経 演習（共通テスト形式の選択問題） ---- */
let qz = null, qzUnit = "";
function startQuiz() {
  let pool = SQZ.filter(q => !qzUnit || q.unit === qzUnit);
  if (!pool.length) { toast("問題が入っていない。"); return; }
  const st = (S.seikei.quiz || {});
  pool = pool.map(q => [q, Math.random() + ((st[q.id] || [0, 0])[0] ? 0.6 : 0)]).sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, 10);
  qz = { qs: pool, n: 0, ok: 0, picked: null }; renderQuiz();
}
function renderQuiz() {
  const box = $("quizBox"), st = S.seikei.quiz || {};
  const sel = $("qzUnit"); if (!sel.options.length) { sel.add(new Option("全単元から", "")); for (const u of [...new Set(SQZ.map(q => q.unit))]) sel.add(new Option(u, u)); }
  sel.value = qzUnit;
  const done = Object.values(st).filter(v => v[0] > 0).length;
  $("qzStats").textContent = "正解したことがある問題 " + done + " / " + SQZ.length + "（1問正解ごとに小判＋1）";
  $("qzStart").hidden = !!qz;
  if (!qz) { box.hidden = true; return; }
  box.hidden = false;
  if (qz.n >= qz.qs.length) { box.innerHTML = `<div class="flash"><div class="word dot">${qz.ok} / ${qz.qs.length}</div><button class="big-btn" type="button" data-qz="again">もう10問</button><button class="btn ghost" type="button" data-qz="end">終わる</button></div>`; return; }
  const q = qz.qs[qz.n];
  let h = `<div class="qprog"><span>${qz.n + 1} / ${qz.qs.length}　${esc(q.unit)}</span><span>正解 ${qz.ok}</span></div><div class="cloze" style="font-size:15px">${esc(q.q)}</div><div class="ex" style="white-space:pre-wrap;font-size:14px;color:var(--ink)">${esc(q.sel)}</div><div class="choices" style="grid-template-columns:repeat(${q.n > 4 ? 4 : q.n},1fr)">`;
  for (let i = 1; i <= q.n; i++) { const cls = qz.picked == null ? "" : i === q.ans ? "right" : i === qz.picked ? "wrong" : ""; h += `<button type="button" class="${cls}" data-qc="${i}" style="text-align:center" ${qz.picked != null ? "disabled" : ""}>${"①②③④⑤⑥⑦⑧"[i - 1]}</button>`; }
  h += `</div>`;
  if (qz.picked != null) h += `<div class="mean" style="font-size:14px;font-weight:400"><b>正解 ${"①②③④⑤⑥⑦⑧"[q.ans - 1]}</b>　${esc(q.ex)}</div><button class="big-btn ink" type="button" data-qz="next">次へ</button>`;
  box.innerHTML = h;
}
function pickQuiz(i) {
  if (!qz || qz.picked != null) return;
  const q = qz.qs[qz.n], ok = i === q.ans; qz.picked = i; if (ok) qz.ok++;
  sfx(ok ? "coin" : "ng");
  patchDoc("seikei", v => { v.quiz = v.quiz || {}; const r = v.quiz[q.id] || [0, 0]; v.quiz[q.id] = [r[0] + (ok ? 1 : 0), r[1] + 1]; });
  renderQuiz();
}
function renderLearn() {
  document.querySelectorAll("#learnSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === learnTab)));
  for (const t of ["words", "cloze", "grammar", "other", "story"]) $("lt-" + t).hidden = !(t === learnTab || (t === "words" && (learnTab === "kobun" || learnTab === "seikei")) || (t === "other" && learnTab === "seikei"));
  if (learnTab === "seikei") renderQuiz();
  if (learnTab === "words" || learnTab === "kobun" || learnTab === "seikei") {
    const dk = deckOfTab(), D = DECKS[dk], st = S[D.store], i = wSet[dk] ?? dayIdx(dk), set = setOf(dk, i), done = clearedToday(dk), n = set.filter(w => done.has(w.id)).length;
    const days = Math.ceil(D.items.length / D.per);
    $("wEyebrow").textContent = D.title + "　1日" + D.per + D.unit + "×" + days + "日";
    $("wRule").innerHTML = esc(D.rule) + "<b>" + limitOf(dk) / 1000 + "秒以内</b>に答えが浮かばなければ失敗。全部を即答できるまで終わらない。覚えるのはAnki、ここは追い討ち。";
    $("wGo").textContent = "今日の" + D.per + D.unit + "を始める";
    $("wTitle").textContent = (i + 1) + "日目の" + D.per + D.unit + "　No." + (set[0] ? set[0].id : "") + "〜" + (set[set.length - 1] ? set[set.length - 1].id : "");
    $("wProg").textContent = "今日即答できた " + n + " / " + set.length; $("wBar").style.width = (100 * n / Math.max(1, set.length)) + "%"; $("wBar").className = n >= set.length ? "ok" : "";
    const known = Object.values(st.w || {}).filter(s => (s[0] || 0) >= 3).length, weak = Object.values(st.w || {}).filter(s => (s[2] || 0) > 0 && (s[0] || 0) < 3).length;
    $("wStats").textContent = "定着（3回以上即答） " + known + D.unit + " ／ 苦手 " + weak + D.unit + " ／ 全" + D.items.length + D.unit;
    const sel = $("wDay"); if (sel.dataset.deck !== dk) { sel.innerHTML = ""; sel.dataset.deck = dk; for (let d = 0; d < days; d++) sel.add(new Option((d + 1) + "日目（" + labelDay(addDays(D.start, d)) + "）", d)); }
    sel.value = String(i);
    $("wStartBox").hidden = !!sess && sess.deck === dk; renderFlash();
  }
  if (learnTab === "cloze") { $("czStart").hidden = !!cz; const c = S.cloze || {}; $("czStats").textContent = "これまで " + (c.correct || 0) + " / " + (c.total || 0) + " 問正解"; renderCloze(); }
  if (learnTab === "grammar") { renderGrammar(); renderGQ(); }
  if (learnTab === "story") renderRPG();
}
function bindLearn() {
  $("learnSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; learnTab = b.dataset.t; renderLearn(); };
  $("wGo").onclick = () => { if (ready()) startWords(deckOfTab(), "day"); };
  $("wWeak").onclick = () => { if (ready()) startWords(deckOfTab(), "weak"); };
  $("wDay").onchange = e => { wSet[deckOfTab()] = Number(e.target.value); renderLearn(); };
  $("flash").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.a) answerWord(b.dataset.a === "yes");
    else if (b.dataset.j) judgeWord(b.dataset.j === "1");
    else if (b.dataset.n) missNext();
    else if (b.dataset.q) { clearTimeout(limitT); sess = null; renderLearn(); }
  };
  document.addEventListener("keydown", e => {
    if (currentView !== "learn" || !sess || deckOfTab() !== sess.deck || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (sess.phase === "ask" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); answerWord(true); }
    else if (sess.phase === "ask" && e.key === "Escape") answerWord(false);
    else if (sess.phase === "judge" && (e.key === "1" || e.key === "o" || e.key === "Enter")) judgeWord(true);
    else if (sess.phase === "judge" && (e.key === "2" || e.key === "x")) judgeWord(false);
    else if (sess.phase === "miss" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); missNext(); }
  });
  $("czStart").onclick = () => { if (ready()) startCloze(); };
  $("gqBox").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.gc) pickGQ(Number(b.dataset.gc)); else if (b.dataset.gq === "next") nextGQ(); else if (b.dataset.gq === "again") startGQ(gq.id); else if (b.dataset.gq === "end") { gq = null; renderGQ(); } };
  $("qzStart").onclick = () => { if (ready()) startQuiz(); };
  $("qzUnit").onchange = e => { qzUnit = e.target.value; };
  $("quizBox").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.qc) pickQuiz(Number(b.dataset.qc)); else if (b.dataset.qz === "next") { qz.n++; qz.picked = null; renderQuiz(); } else if (b.dataset.qz === "again") startQuiz(); else if (b.dataset.qz === "end") { qz = null; renderQuiz(); } };
  $("clozeBox").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.c) pickCloze(Number(b.dataset.c)); else if (b.dataset.cz === "next") { cz.n++; cz.picked = null; renderCloze(); } else if (b.dataset.cz === "again") startCloze(); else if (b.dataset.cz === "end") { cz = null; renderLearn(); } };
  for (const g of Object.keys(GRAMMAR)) {
    $("units-" + g).addEventListener("click", e => { const s = e.target.closest("button[data-gs]"); if (s) { if (ready()) startGQ(s.dataset.gs); return; } const b = e.target.closest("button[data-u]"); if (!b) return; openUnit = openUnit === b.dataset.u ? "" : b.dataset.u; renderGrammar(); const f = document.getElementById("uo-" + openUnit); if (f) f.focus(); });
    $("units-" + g).addEventListener("submit", e => { e.preventDefault(); if (!ready()) return; const id = e.target.dataset.uf, ok = parseInt($("uo-" + id).value, 10), tot = parseInt($("ut-" + id).value, 10); if (!(tot > 0) || !(ok >= 0) || ok > tot) { toast("正解数と問題数を入れて。"); return; } openUnit = ""; saveUnit(id, ok, tot); });
  }
}

/* ===== お化け：図鑑・ガチャ・着せ替え・券 ===== */
const GACHA_COST = 60, DUP_BACK = 20;
/** ガチャに出るのは進化前の子だけ。確率（%）：梅60・竹32・松8 */
const GACHA_BASE_ODDS = [[3, 8], [2, 32], [1, 60]];
const TICKETS = [
  { kind: "game", min: 30, name: "ゲーム30分券" }, { kind: "game", min: 60, name: "ゲーム1時間券" },
  { kind: "video", min: 30, name: "動画30分券" }, { kind: "video", min: 60, name: "動画1時間券" }
];
const REFRESH_FREE = 120;
let yokaiTab = "pass";
/** キャラの絵。まだ絵がない子は「？」の札 */
const NO_ART = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="66" font-size="54" text-anchor="middle" fill="#9a9db5">？</text></svg>');
const thumb = id => (YK[id] && YK[id].img) || NO_ART;
const owned = id => !!(S.game.owned || {})[id];
/** イラストのお化けには、着けている小物を小さな札で添える */
const gearIcons = new Map();
function gearIcon(oid) {
  if (!gearIcons.has(oid)) { const t = new Vox(); try { OK[oid].draw(t, [0, 0, 0]); } catch (e) {} gearIcons.set(oid, t.v.size ? Stage.snapshot(t, 96, 96, { zoom: 3 }) : ""); }
  return gearIcons.get(oid);
}
function gearHtml(eq) { return Object.values(eq || {}).filter(o => OK[o]).map(o => `<span class="gear"><img alt="" src="${gearIcon(o)}"><small>${esc(OK[o].name)}</small></span>`).join(""); }

/* ---- 図鑑 ---- */
let thumbQ = [], thumbT = 0;
function renderDex() {
  if (!YOKAI.length) { $("dexCount").textContent = "準備中"; $("dexBar").style.width = "0%"; $("dexGrid").innerHTML = '<p class="note" style="grid-column:1/-1">新しいキャラを準備中。そろったらここに並ぶ。それまでの勉強時間や文法の合格は、ちゃんと仲間になる分として数えておく。</p>'; $("dexGrid").dataset.v = ""; return; }
  const own = S.game.owned || {}, n = YOKAI.filter(y => own[y.id]).length;
  $("dexCount").textContent = n + " / " + YOKAI.length + " 体";
  $("dexBar").style.width = (100 * n / YOKAI.length) + "%";
  const html = YOKAI.map(y => {
    const has = !!own[y.id];
    return `<button type="button" data-y="${y.id}" data-r="${y.rarity}" class="${has ? "" : "lock"}">${y.id === S.game.partner ? '<span class="cur">相棒</span>' : ""}<img alt="" loading="lazy" src="${thumb(y.id)}"><span>${has ? esc(y.name) : "？？？"}</span></button>`;
  }).join("");
  const g = $("dexGrid"); if (g.dataset.v !== html) { g.innerHTML = html; g.dataset.v = html; }
}
function openYokai(id) {
  const y = YK[id], has = owned(id), line = YOKAI.filter(z => z.line === y.line).sort((a, b) => a.stage - b.stage);
  const evo = line.length > 1 ? `<div class="evo">${line.map((z, i) => (i ? '<span class="arrow">→</span>' : "") + `<img alt="${owned(z.id) ? esc(z.name) : "？？？"}" src="${thumb(z.id)}" style="${owned(z.id) ? "" : "filter:brightness(0) opacity(.2)"}">`).join("")}</div>` : "";
  const o = (S.game.owned || {})[id] || {};
  const voiceName = { kid: "元気な子ども", elder: "古風な長老", samurai: "侍ことば", cool: "クール", lady: "お嬢さま", yankee: "ヤンキー" }[y.voice] || y.voice;
  let h = `<div class="head"><div><div class="eyebrow">${esc(y.kana)}</div><h2>${has ? esc(y.name) : "？？？"}</h2></div><span class="rar ${RARITY[y.rarity].cls}">${RARITY[y.rarity].name}</span></div>
    <div class="aura ${has ? RARITY[y.rarity].cls : ""}"><img class="big" alt="" src="${thumb(id)}" style="${has ? "" : "filter:brightness(0) opacity(.2)"}"></div>
    <p style="margin:0">${has ? esc(y.desc) : y.stage > 0 ? "進化前の「" + esc((YOKAI.find(z => z.line === y.line && z.stage === y.stage - 1) || {}).name || "") + "」を相棒にして、ポモドーロでLv." + EVOLVE_LV[y.rarity] + "まで育てると進化する。ガチャには出ない。" : "まだ出会っていない。ガチャか、百鬼の道（勉強時間）で仲間になる。"}</p>
    ${has ? `<div class="lvrow"><b class="dot">Lv.${lvOf(expOf(id))}</b>${nextForm(id) ? `<div class="bar-p"><i style="width:${clamp(100 * expOf(id) / ((evolveLv(id) - 1) * LV_MIN), 0, 100)}%"></i></div><small>進化 Lv.${evolveLv(id)}</small>` : `<small>最終形態</small>`}</div>` : ""}
    ${has ? `<div class="note">しゃべり方：${voiceName}${line.length > 1 ? "　・" + (y.stage + 1) + "段階目 / " + line.length : "　・進化しない"}${o.at ? "　・" + labelDay(dayKey(o.at)) + "に仲間入り" : ""}</div>` : ""}${evo}`;
  if (has && canEvolve(id)) h += `<button class="big-btn evolve-btn" type="button" data-evolve="${id}">進化させる！</button>`;
  if (has && id !== S.game.partner) h += `<button class="big-btn${canEvolve(id) ? " ink" : ""}" type="button" data-partner="${id}">相棒にする</button>`;
  else if (id === S.game.partner) h += `<div class="note" style="text-align:center">いまの相棒。ポモドーロ1セット（25分）でLv.1上がる。</div>`;
  h += `<button class="btn ghost" type="button" data-close="1">閉じる</button>`;
  openSheet(h);
}
function openSheet(html) { const s = $("sheet"); $("sheetIn").innerHTML = html; s.hidden = false; }
function closeSheet() { $("sheet").hidden = true; $("sheetIn").innerHTML = ""; }
function setPartner(id) {
  if (!ready() || !owned(id)) return;
  patchDoc("game", g => { g.partner = id; });
  buddyKey = ""; $("bubble").textContent = ""; sfx("ok"); toast(YK[id].name + "が相棒になった。"); closeSheet();
}

/* ---- 文法の単元合格ごとに、ガチャ無料券1枚 ---- */
let unlocking = false;
function checkUnlocks() {
  if (unlocking || !backend || !allLoaded() || !YOKAI.length || S.game.roster !== ROSTER_VER) return;
  const claims = new Set(S.game.claims || []), want = Object.entries(S.grammar.units || {}).filter(([id, u]) => u.passed && !claims.has("g:" + id)).map(([id]) => "g:" + id);
  if (!want.length) return;
  unlocking = true;
  patchDoc("game", v => { v.claims = [...(v.claims || []), ...want]; v.freeRolls = (v.freeRolls || 0) + want.length; }).finally(() => { unlocking = false; });
  toast("文法合格のごほうび：ガチャ無料券 ×" + want.length);
}
function reveal(list) {
  sfx("gacha"); confetti();
  const h = `<div class="gacha"><div class="eyebrow">${list.length > 1 ? list.length + "体が仲間になった" : list[0].evo ? "進化" : "新しい仲間"}</div>
    ${list.map(x => `<div class="box ${RARITY[x.y.rarity].cls}"><img alt="" src="${thumb(x.y.id)}"></div><h2>${esc(x.y.name)}</h2><div class="note">${esc(x.why)}　<span class="rar ${RARITY[x.y.rarity].cls}">${RARITY[x.y.rarity].name}</span></div>`).join("")}
    <button class="big-btn" type="button" data-close="1">やったね</button></div>`;
  openSheet(h);
  buddyKey = "";
}

/* ---- ガチャ ---- */
let rolling = false;
function rollGacha() {
  if (!ready() || rolling) return;
  if (!YOKAI.length) { toast("キャラを準備中。そろったら回せる。"); return; }
  const free = (S.game.freeRolls || 0) > 0;
  if (!free && econ().koban < GACHA_COST) { toast("小判が足りない。あと" + (GACHA_COST - econ().koban) + "枚。勉強して稼げ。"); sfx("ng"); return; }
  const base = YOKAI.filter(y => y.stage === 0);
  let r = Math.random() * 100, rar = 1; for (const [t, p] of GACHA_BASE_ODDS) { if (r < p) { rar = t; break; } r -= p; }
  let pool = base.filter(y => y.rarity === rar);
  while (!pool.length && rar > 1) { rar--; pool = base.filter(y => y.rarity === rar); }
  if (!pool.length) pool = base;
  const y = pool[Math.floor(Math.random() * pool.length)]; rar = y.rarity;
  const dup = owned(y.id);
  rolling = true;
  patchDoc("game", v => {
    if (free) { v.freeRolls = Math.max(0, (v.freeRolls || 0) - 1); if (dup) v.spend = [...(v.spend || []), { kind: "gacha", id: y.id, cost: -DUP_BACK, at: Date.now() }]; }
    else v.spend = [...(v.spend || []), { kind: "gacha", id: y.id, cost: dup ? GACHA_COST - DUP_BACK : GACHA_COST, at: Date.now() }];
    v.gacha = (v.gacha || 0) + 1;
    if (!dup) { v.owned = v.owned || {}; v.owned[y.id] = { at: Date.now(), exp: 0, from: "gacha" }; }
  });
  const box = $("gachaBox"); box.innerHTML = '<span class="lan">？</span>'; box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake"); sfx("tap");
  setTimeout(() => {
    rolling = false; box.classList.remove("shake"); box.classList.remove("r2", "r3", "r4", "r5"); if (rar > 1) box.classList.add("r" + rar); box.innerHTML = `<img alt="${esc(y.name)}" src="${thumb(y.id)}">`;
    sfx(rar >= 4 ? "done" : "gacha"); if (rar >= 3) confetti();
    $("gachaRes").innerHTML = `<b style="font-family:var(--display);font-weight:400;font-size:20px">${esc(y.name)}</b> <span class="rar ${RARITY[rar].cls}">${RARITY[rar].name}</span><div class="note">${dup ? "もう持っていた。小判" + DUP_BACK + "枚もどってきた。" : esc(y.desc)}</div>`;
    renderYokai();
  }, 1300);
}

/* ---- 着せ替え ---- */
function renderOutfits() {
  const own = new Set((S.game.outfits || {}).owned || []), eq = (S.game.outfits || {}).equipped || {}, k = econ().koban;
  $("outfitPrev").src = thumb(S.game.partner);
  $("outfitGear").innerHTML = gearHtml(eq);
  $("outfitName").textContent = YK[S.game.partner] ? YK[S.game.partner].name + "の着せ替え" : "着せ替え（相棒が来たら着せられる）";
  const html = OUTFITS.map(o => {
    const has = own.has(o.id), on = eq[o.slot] === o.id;
    return `<div class="outfit"><b>${esc(o.name)}</b><span class="note">${o.slot === "head" ? "頭" : "手"}${has ? "・持っている" : "・小判 " + o.price}</span>
      ${has ? `<button class="btn ${on ? "ink" : ""} sm" type="button" data-wear="${o.id}">${on ? "外す" : "着ける"}</button>` : `<button class="btn pri sm" type="button" data-buy="${o.id}" ${k < o.price ? "disabled" : ""}>買う</button>`}</div>`;
  }).join("");
  const g = $("outfitGrid"); if (g.dataset.v !== html) { g.innerHTML = html; g.dataset.v = html; }
}
function buyOutfit(id) {
  const o = OK[id]; if (!ready() || !o) return;
  if (econ().koban < o.price) { toast("小判が足りない。"); return; }
  patchDoc("game", v => { v.outfits = v.outfits || { owned: [], equipped: {} }; v.outfits.owned = [...new Set([...(v.outfits.owned || []), id])]; v.outfits.equipped = { ...(v.outfits.equipped || {}), [o.slot]: id }; v.spend = [...(v.spend || []), { kind: "outfit", id, cost: o.price, at: Date.now() }]; });
  buddyKey = ""; sfx("coin"); toast(o.name + "を買った。");
}
function wearOutfit(id) {
  const o = OK[id]; if (!ready() || !o) return;
  patchDoc("game", v => { v.outfits = v.outfits || { owned: [], equipped: {} }; const e = { ...(v.outfits.equipped || {}) }; if (e[o.slot] === id) delete e[o.slot]; else e[o.slot] = id; v.outfits.equipped = e; });
  buddyKey = ""; sfx("tap");
}

/* ---- 券 ---- */
/** リフレッシュの無料枠：休みの曜日の前日19時から、その日の終わりまで */
function refreshWindow() {
  const k = dayKey(), rd = Number(S.settings.refreshDow ?? 0), h = new Date().getHours();
  if (modeOf(k) === "refresh") return k;
  if (dow(k) === (rd + 6) % 7 && h >= 19) return addDays(k, 1);
  return null;
}
function freeLeft(wk) { return REFRESH_FREE - (S.tickets.history || []).filter(x => x.free && x.wk === wk).reduce((a, x) => a + x.min, 0); }
function useTicket(kind, min, free) {
  if (!ready()) return;
  const wk = refreshWindow();
  if (free) { if (!wk) return; min = Math.min(min, freeLeft(wk)); if (min <= 0) { toast("今週の無料枠はもう使い切った。"); return; } }
  else if (econ().ticket < min) { toast("券ポイントが足りない。あと" + (min - econ().ticket) + "。1時間勉強で10ポイント。"); sfx("ng"); return; }
  const now = Date.now(), a = S.tickets.active;
  patchDoc("tickets", v => {
    v.history = [...(v.history || []), { kind, min, cost: free ? 0 : min, free: !!free, wk: free ? wk : null, at: now }];
    v.active = a && a.endsAt > now && a.kind === kind ? { ...a, endsAt: a.endsAt + min * 60000, min: a.min + min } : { kind, min, startedAt: now, endsAt: now + min * 60000 };
  });
  sfx("coin"); toast((kind === "game" ? "ゲーム" : "動画") + min + "分、スタート。時間が来たら鳴らす。");
}
function renderActiveTicket(id) {
  const el = $(id); if (!el) return;
  const a = S.tickets.active;
  if (!a || !a.endsAt) { el.hidden = true; return; }
  const left = a.endsAt - Date.now();
  el.hidden = false;
  if (left <= 0) { el.innerHTML = `<div class="eyebrow" style="color:#c9c7f0">${a.kind === "game" ? "ゲーム" : "動画"}券</div><div class="clock">時間切れ</div><div class="row"><span>終わりの時間。勉強に戻ろう。</span><button class="btn pri sm" type="button" data-endtix="1">戻る</button></div>`; return; }
  const s = Math.ceil(left / 1000);
  el.innerHTML = `<div class="eyebrow" style="color:#c9c7f0">${a.kind === "game" ? "ゲーム" : "動画"}券 使用中</div><div class="clock">${Math.floor(s / 3600) ? Math.floor(s / 3600) + ":" : ""}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}</div><div class="row"><span class="note" style="color:#c9c7f0">${new Date(a.endsAt).getHours()}:${pad(new Date(a.endsAt).getMinutes())} まで</span><button class="btn pri sm" type="button" data-endtix="1" style="margin-left:auto">早めに終わる</button></div>`;
}
let tixRang = 0;
function ticketTick() {
  const a = S.tickets.active; if (!a || !a.endsAt) return;
  if (Date.now() >= a.endsAt && tixRang !== a.endsAt) { tixRang = a.endsAt; sfx("bell"); toast("券の時間が終わった。勉強に戻れ。"); }
}
function endTicket() { if (ready()) patchDoc("tickets", v => { v.active = null; }); }
function renderTix() {
  const e = econ(), wk = refreshWindow();
  $("tixPts").textContent = e.ticket;
  $("tixGrid").innerHTML = TICKETS.map(t => `<button type="button" data-tk="${t.kind}" data-min="${t.min}" ${e.ticket < t.min ? "disabled style='opacity:.5'" : ""}><b>${t.name}</b><span>${t.min} ポイント</span></button>`).join("");
  const fl = wk ? freeLeft(wk) : 0;
  $("tixFree").hidden = !wk;
  if (wk) $("tixFreeTxt").textContent = "リフレッシュの無料枠 残り " + fl + "分（土曜19時〜日曜）";
  $("tixFreeBtns").innerHTML = wk && fl > 0 ? `<button class="btn pri" type="button" data-free="game">ゲームに使う</button><button class="btn" type="button" data-free="video">動画に使う</button>` : "";
  renderActiveTicket("tixActive");
  const hist = [...(S.tickets.history || [])].reverse().slice(0, 12);
  $("tixHist").innerHTML = hist.length ? hist.map(x => `<li><span>${labelDay(dayKey(x.at))} ${new Date(x.at).getHours()}:${pad(new Date(x.at).getMinutes())}　${x.kind === "bonus" ? "百鬼の道の報酬" : (x.kind === "game" ? "ゲーム" : "動画") + " " + x.min + "分"}</span><span class="num dot">${x.free ? "無料枠" : x.cost < 0 ? "＋" + -x.cost : "−" + x.cost}</span></li>`).join("") : '<li><span class="note">まだ使っていない</span></li>';
}

function renderYokai() {
  document.querySelectorAll("#yokaiSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === yokaiTab)));
  for (const t of ["pass", "dex", "gacha", "outfit", "tix"]) $("yt-" + t).hidden = t !== yokaiTab;
  if (yokaiTab === "pass") renderPass();
  $("yKoban").textContent = econ().koban;
  const fr = S.game.freeRolls || 0;
  $("gachaBtn").disabled = !YOKAI.length || (!fr && econ().koban < GACHA_COST) || rolling;
  $("gachaBtn").innerHTML = fr ? "無料券で回す（のこり " + fr + "枚）" : "小判 " + GACHA_COST + " 枚で回す";
  if (!YOKAI.length) $("gachaRes").innerHTML = '<div class="note">キャラを準備中。そろったら回せる。</div>';
  if (yokaiTab === "dex") renderDex();
  if (yokaiTab === "outfit") renderOutfits();
  if (yokaiTab === "tix") renderTix();
}
function bindYokai() {
  $("yokaiSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; yokaiTab = b.dataset.t; renderYokai(); if (yokaiTab === "pass") scrollPassToNow(); };
  bindPass();
  $("dexGrid").onclick = e => { const b = e.target.closest("button[data-y]"); if (b) openYokai(b.dataset.y); };
  $("sheet").onclick = e => {
    if (e.target === $("sheet") || e.target.closest("[data-close]")) return closeSheet();
    const ev = e.target.closest("[data-evolve]"); if (ev) return evolve(ev.dataset.evolve);
    const b = e.target.closest("[data-partner]"); if (b) setPartner(b.dataset.partner);
  };
  $("gachaBtn").onclick = rollGacha;
  $("outfitGrid").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.buy) buyOutfit(b.dataset.buy); else if (b.dataset.wear) wearOutfit(b.dataset.wear); };
  $("tixGrid").onclick = e => { const b = e.target.closest("button[data-tk]"); if (b) useTicket(b.dataset.tk, Number(b.dataset.min), false); };
  $("tixFreeBtns").onclick = e => { const b = e.target.closest("button[data-free]"); if (b) useTicket(b.dataset.free, REFRESH_FREE, true); };
  document.addEventListener("click", e => { if (e.target.closest("[data-endtix]")) endTicket(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });
}

/* ===== 百鬼の道（勉強時間で進むバトルパス）と、ポモドーロでの育成・進化 ===== */
const LV_MIN = 25;                        // ポモドーロ1セット（25分）でレベル1つ
const EVOLVE_LV = { 3: 8, 4: 12, 5: 16 }; // 進化後の珍しさごとの必要レベル（松・伝説・幻）
const PASS_STEP = 10;                     // 10時間ごとに1段
const lvOf = exp => Math.min(99, Math.floor((exp || 0) / LV_MIN) + 1);
const expOf = id => (((S.game.owned || {})[id] || {}).exp || 0);
const evolveLv = id => { const nf = nextForm(id); return nf ? EVOLVE_LV[nf.rarity] || 10 : null; };
const canEvolve = id => { const nf = nextForm(id); return !!nf && !owned(nf.id) && lvOf(expOf(id)) >= evolveLv(id); };

/** 報酬の並び。yokai は進化前の子だけ（進化形は育てないと手に入らない） */
const PASS = [
  { k: "koban", n: 100 }, { k: "ticket", n: 30 }, { k: "yokai", id: "kogitsune" }, { k: "outfit", id: "hachimaki" }, { k: "roll", n: 1 },
  { k: "koban", n: 150 }, { k: "ticket", n: 60 }, { k: "yokai", id: "mizuchi" }, { k: "outfit", id: "tango" }, { k: "roll", n: 2 },
  { k: "koban", n: 200 }, { k: "ticket", n: 60 }, { k: "yokai", id: "tabineko" }, { k: "outfit", id: "gakubo" }, { k: "roll", n: 1 },
  { k: "koban", n: 250 }, { k: "ticket", n: 90 }, { k: "yokai", id: "kooni" }, { k: "outfit", id: "omamori" }, { k: "roll", n: 2 },
  { k: "koban", n: 300 }, { k: "ticket", n: 90 }, { k: "outfit", id: "kitsunemen" }, { k: "yokai", id: "karasu" }, { k: "roll", n: 2 },
  { k: "koban", n: 400 }, { k: "ticket", n: 120 }, { k: "outfit", id: "crown" }, { k: "roll", n: 3 }, { k: "yokai", id: "gasha" }
];
/** 30段のあとは、20時間ごとに小判300 */
const tierHours = t => t <= PASS.length ? t * PASS_STEP : PASS.length * PASS_STEP + (t - PASS.length) * 20;
const rewardOf = t => t <= PASS.length ? PASS[t - 1] : { k: "koban", n: 300 };
function passTier() { const h = econ().totalMin / 60; let t = 0; while (h >= tierHours(t + 1) && t < 999) t++; return t; }
const claimedTier = t => (S.game.claims || []).includes("bp:" + t);
function unclaimed() { const out = []; for (let t = 1; t <= passTier(); t++) if (!claimedTier(t)) out.push(t); return out; }

function rewardLabel(r) {
  if (r.k === "koban") return "小判 " + r.n + "枚";
  if (r.k === "ticket") return "券ポイント " + r.n;
  if (r.k === "roll") return "ガチャ無料券 ×" + r.n;
  if (r.k === "outfit") return (OK[r.id] || {}).name || "小物";
  if (r.k === "yokai") return (YK[r.id] || {}).name || "仲間";
  return "";
}
function rewardIcon(r, big) {
  const cls = "ricon" + (big ? " big" : "");
  if (r.k === "koban") return `<span class="${cls} koban-i"><i></i></span>`;
  if (r.k === "ticket") return `<span class="${cls} ticket-i"><i></i></span>`;
  if (r.k === "roll") return `<span class="${cls} roll-i">引</span>`;
  if (r.k === "outfit") return `<span class="${cls} outfit-i"><img alt="" src="${gearIcon(r.id)}"></span>`;
  if (r.k === "yokai") { const y = YK[r.id]; return `<span class="${cls} yokai-i ${y ? RARITY[y.rarity].cls : ""}"><img alt="" src="${thumb(r.id)}"></span>`; }
  return "";
}

/** 受け取る（まとめて） */
let claiming = false;
function claimTiers(list) {
  if (!ready() || claiming || !list.length) return;
  claiming = true;
  const now = Date.now(), got = [];
  let tix = 0;
  patchDoc("game", v => {
    v.claims = v.claims || []; v.owned = v.owned || {}; v.spend = v.spend || []; v.outfits = v.outfits || { owned: [], equipped: {} };
    for (const t of list) {
      if (v.claims.includes("bp:" + t)) continue;
      let r = rewardOf(t);
      if (r.k === "yokai" && v.owned[r.id]) r = { k: "koban", n: 200, was: r.id }; // もう持っていたら小判に
      if (r.k === "outfit" && (v.outfits.owned || []).includes(r.id)) r = { k: "koban", n: 100 };
      if (r.k === "koban") v.spend.push({ kind: "pass", tier: t, cost: -r.n, at: now });
      if (r.k === "ticket") tix += r.n;
      if (r.k === "roll") v.freeRolls = (v.freeRolls || 0) + r.n;
      if (r.k === "outfit") v.outfits.owned = [...new Set([...(v.outfits.owned || []), r.id])];
      if (r.k === "yokai") v.owned[r.id] = { at: now, exp: 0, from: "pass" };
      v.claims.push("bp:" + t); got.push({ t, r });
    }
  }).then(() => tix ? patchDoc("tickets", v => { v.history = [...(v.history || []), { kind: "bonus", min: 0, cost: -tix, at: now }]; }) : null)
    .finally(() => { claiming = false; });
  if (!got.length) return;
  sfx(got.some(g => g.r.k === "yokai") ? "gacha" : "coin"); confetti();
  const main = got.find(g => g.r.k === "yokai");
  openSheet(`<div class="gacha"><div class="eyebrow">百鬼の道　${got.length}段ぶんの報酬</div>
    ${main ? `<div class="box ${RARITY[YK[main.r.id].rarity].cls}"><img alt="" src="${thumb(main.r.id)}"></div><h2>${esc(YK[main.r.id].name)}が仲間になった</h2>` : ""}
    <div class="rgot">${got.map(g => `<div>${rewardIcon(g.r)}<span><small>${g.t}段</small>${esc(rewardLabel(g.r))}${g.r.was ? "（持っていたので）" : ""}</span></div>`).join("")}</div>
    <button class="big-btn" type="button" data-close="1">受け取った</button></div>`);
}

/** 進化：相棒が必要レベルに届いたら、ボタンで進化させる */
function evolve(id) {
  if (!ready() || !canEvolve(id)) return;
  const y = YK[id], nf = nextForm(id), now = Date.now();
  patchDoc("game", v => { v.owned = v.owned || {}; v.owned[nf.id] = { at: now, exp: 0, from: "evolve" }; v.partner = nf.id; });
  sfx("done"); confetti(); setTimeout(confetti, 600);
  openSheet(`<div class="gacha evolve"><div class="eyebrow">進化</div>
    <div class="evo-anim"><img class="from" alt="" src="${thumb(id)}"><img class="to" alt="" src="${thumb(nf.id)}"></div>
    <h2>${esc(y.name)} は ${esc(nf.name)} に進化した！</h2><div class="note"><span class="rar ${RARITY[nf.rarity].cls}">${RARITY[nf.rarity].name}</span>　${esc(nf.desc)}</div>
    <button class="big-btn" type="button" data-close="1">よし</button></div>`);
  buddyKey = "";
}

/* ---- 画面 ---- */
function renderPass() {
  const t = passTier(), h = econ().totalMin / 60, nextH = tierHours(t + 1), prevH = tierHours(t), un = unclaimed();
  $("passTier").textContent = t;
  $("passNext").textContent = "次の段まで " + Math.max(0, nextH - h).toFixed(1) + "時間（累計 " + h.toFixed(1) + "h）";
  $("passBar").style.width = clamp(100 * (h - prevH) / (nextH - prevH), 0, 100) + "%";
  $("passClaimAll").hidden = !un.length; $("passClaimAll").textContent = "まとめて受け取る（" + un.length + "）";
  const last = Math.max(PASS.length, t + 3);
  let html = "";
  for (let i = 1; i <= last; i++) {
    const r = rewardOf(i), reached = i <= t, got = claimedTier(i), cur = i === t + 1;
    const st = got ? "got" : reached ? "ready" : cur ? "next" : "lock";
    html += `<li class="tier ${st}${r.k === "yokai" ? " big" : ""}" data-tier="${i}">
      <span class="node">${got ? "✓" : i}</span>
      <div class="rcard">${rewardIcon(r, r.k === "yokai")}<div><small>${tierHours(i)}時間</small><b>${esc(rewardLabel(r))}</b>${cur ? `<div class="bar-p"><i style="width:${clamp(100 * (h - prevH) / (nextH - prevH), 0, 100)}%"></i></div>` : ""}</div>
      ${st === "ready" ? `<button class="btn pri sm" type="button" data-claim="${i}">受け取る</button>` : st === "got" ? `<span class="note">受取済</span>` : ""}</div></li>`;
    if (cur) html += `<li class="here"><span>いまここ</span></li>`;
  }
  const el = $("passTrack"); if (el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; }
  // 道の灯り：いまの段まで光らせる
  requestAnimationFrame(() => { const at = el.querySelector(".here") || el.querySelector(".tier.got:last-of-type"); el.style.setProperty("--lit", (at ? at.offsetTop + 12 : 0) + "px"); });
}
function scrollPassToNow() { const el = document.querySelector("#passTrack .here") || document.querySelector("#passTrack .ready"); if (el) el.scrollIntoView({ block: "center" }); }
/** ホームの小さな道しるべ */
function renderPassMini() {
  const t = passTier(), h = econ().totalMin / 60, nextH = tierHours(t + 1), prevH = tierHours(t), un = unclaimed().length, r = rewardOf(t + 1);
  $("pmTier").textContent = t;
  $("pmNext").innerHTML = `${rewardIcon(r)}<span><small>次の報酬　あと${Math.max(0, nextH - h).toFixed(1)}h</small><b>${esc(rewardLabel(r))}</b></span>`;
  $("pmBar").style.width = clamp(100 * (h - prevH) / (nextH - prevH), 0, 100) + "%";
  $("pmClaim").hidden = !un; $("pmClaim").textContent = "受け取れる報酬 " + un;
}
function bindPass() {
  $("passTrack").addEventListener("click", e => { const b = e.target.closest("[data-claim]"); if (b) claimTiers([Number(b.dataset.claim)]); });
  $("passClaimAll").onclick = () => claimTiers(unclaimed());
  $("pmClaim").onclick = () => { yokaiTab = "pass"; go("yokai"); setTimeout(scrollPassToNow, 50); };
  $("passMini").addEventListener("click", e => { if (!e.target.closest("#pmClaim")) { yokaiTab = "pass"; go("yokai"); setTimeout(scrollPassToNow, 50); } });
}

/* ===== 記録：数字・グラフ・成績・気分・バッジ・設定 ===== */
let selDay = null;
function avgRecent(n = 7) { const k = dayKey(); let a = 0; for (let i = 1; i <= n; i++) a += minOf(addDays(k, -i)); return a / n; }
function renderStats() {
  const e = econ(), L = levelOf(e.totalMin), goal = Number(S.settings.goalHours) || 1100, k = dayKey();
  const left = Math.max(0, goal * 60 - e.totalMin), dl = Math.max(1, daysBetween(k, S.settings.deadline) + 1), av = avgRecent(7);
  const reach = av > 0 ? addDays(k, Math.ceil(left / av)) : null;
  $("stats").innerHTML = [
    ["累計", hrs(e.totalMin) + "<small>h / " + goal + "h</small>"], ["レベル", "Lv." + L.lv + "<small> 次まで" + L.toNext.toFixed(1) + "h</small>"],
    ["必要ペース", (left / dl / 60).toFixed(1) + "<small>h/日（" + dl + "日で）</small>"], ["直近7日の平均", hrs(av) + "<small>h/日</small>"],
    ["このペースだと " + goal + "h に", reach ? (reach <= S.settings.deadline ? "" : "<span style='color:var(--seal)'>") + labelDay(reach) + (reach <= S.settings.deadline ? "" : "</span>") + "<small>" + (reach <= S.settings.deadline ? " 間に合う" : " 遅い") + "</small>" : "—"],
    ["連続達成", streakNow() + "<small>日</small>"], ["ノルマ全クリア", e.clears + "<small>日</small>"], ["ポモドーロ", e.pomos + "<small>セット</small>"]
  ].map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join("");
}
/** 直近30日の棒グラフ（目標を線で） */
function renderBars() {
  const k = dayKey(), W = 600, H = 170, pb = 22, pt = 10, n = 30, bw = W / n;
  const ds = []; for (let i = n - 1; i >= 0; i--) { const d = addDays(k, -i); ds.push({ d, m: minOf(d), t: targetFor(modeOf(d)) }); }
  const max = Math.max(600, ...ds.map(x => Math.max(x.m, x.t))), y = v => pt + (H - pb - pt) * (1 - v / max);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="直近30日の勉強時間">`;
  for (const h of [2, 4, 6, 8, 10]) if (h * 60 <= max) s += `<line x1="0" x2="${W}" y1="${y(h * 60)}" y2="${y(h * 60)}" stroke="var(--line)" stroke-width="1"/><text x="2" y="${y(h * 60) - 3}" font-size="10" fill="var(--muted)">${h}h</text>`;
  ds.forEach((x, i) => {
    const ok = x.m >= x.t, bx = i * bw + 2;
    s += `<rect x="${bx}" y="${y(x.m)}" width="${bw - 4}" height="${Math.max(0, H - pb - y(x.m))}" rx="3" fill="${ok ? "var(--good)" : x.d === k ? "var(--lantern)" : "var(--night2)"}"><title>${labelDay(x.d)} ${hrs(x.m)}h</title></rect>`;
    s += `<line x1="${bx - 1}" x2="${bx + bw - 3}" y1="${y(x.t)}" y2="${y(x.t)}" stroke="var(--seal)" stroke-width="2" opacity=".55"/>`;
    if (i % 5 === 4 || i === n - 1) s += `<text x="${bx + (bw - 4) / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">${parseDate(x.d).getMonth() + 1}/${parseDate(x.d).getDate()}</text>`;
  });
  $("bars").innerHTML = s + "</svg>";
}
/** 累計の予測：実績・今のペースの延長・目標ライン */
function renderForecast() {
  const st = S.settings.startDate, dl = S.settings.deadline, goal = (Number(S.settings.goalHours) || 1100) * 60, k = dayKey();
  const N = Math.max(1, daysBetween(st, dl)), W = 600, H = 190, pl = 34, pb = 22, pt = 12;
  const x = d => pl + (W - pl - 6) * clamp(daysBetween(st, d) / N, 0, 1), y = v => pt + (H - pb - pt) * (1 - v / goal);
  let acc = 0, pts = [];
  for (let d = st; d <= k; d = addDays(d, 1)) { acc += minOf(d); pts.push([x(d), y(Math.min(acc, goal))]); }
  const av = avgRecent(7), proj = Math.min(goal * 1.2, acc + av * Math.max(0, daysBetween(k, dl)));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${(goal / 60)}時間への予測">`;
  for (const f of [0.25, 0.5, 0.75, 1]) s += `<line x1="${pl}" x2="${W - 6}" y1="${y(goal * f)}" y2="${y(goal * f)}" stroke="var(--line)"/><text x="${pl - 4}" y="${y(goal * f) + 3}" font-size="10" text-anchor="end" fill="var(--muted)">${Math.round(goal * f / 60)}</text>`;
  s += `<line x1="${x(st)}" y1="${y(0)}" x2="${x(dl)}" y2="${y(goal)}" stroke="var(--seal)" stroke-dasharray="5 5" opacity=".6"/>`;
  s += `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--night2)" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<line x1="${x(k)}" y1="${y(Math.min(acc, goal))}" x2="${x(dl)}" y2="${y(Math.min(proj, goal))}" stroke="var(--lantern)" stroke-width="2.5" stroke-dasharray="2 5" stroke-linecap="round"/>`;
  s += `<circle cx="${x(k)}" cy="${y(Math.min(acc, goal))}" r="5" fill="var(--lantern)"/>`;
  for (const e of parseExams(S.settings.exams)) if (e.key >= st && e.key <= dl) s += `<line x1="${x(e.key)}" x2="${x(e.key)}" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" opacity=".35"/>`;
  s += `<text x="${x(st)}" y="${H - 6}" font-size="10" fill="var(--muted)">${labelDay(st)}</text><text x="${W - 6}" y="${H - 6}" font-size="10" text-anchor="end" fill="var(--muted)">${labelDay(dl)}</text></svg>`;
  $("forecast").innerHTML = s;
  $("fcNote").textContent = "今のペース（" + hrs(av) + "h/日）だと最終日に約" + Math.round(proj / 60) + "時間。目標" + goal / 60 + "時間まで" + (proj >= goal ? "届く。" : "あと" + Math.round((goal - proj) / 60) + "時間足りない。");
}
function renderHeat() {
  const st = S.settings.startDate, dl = S.settings.deadline, k = dayKey();
  let h = ""; for (let i = 0; i < dow(st); i++) h += '<button class="pad" disabled tabindex="-1"></button>';
  for (let d = st; d <= dl; d = addDays(d, 1)) {
    const m = minOf(d), r = m / targetFor(modeOf(d));
    const l = d > k ? "" : m <= 0 ? "" : r >= 1 ? "l5" : r >= .75 ? "l4" : r >= .5 ? "l3" : r >= .25 ? "l2" : "l1";
    h += `<button type="button" data-d="${d}" class="${l}${d === k ? " today" : ""}${d === selDay ? " sel" : ""}" ${d > k ? "disabled" : ""} aria-label="${labelDay(d)} ${hrs(m)}時間" title="${labelDay(d)} ${hrs(m)}h"></button>`;
  }
  const el = $("heat"); if (el.dataset.v !== h) { el.innerHTML = h; el.dataset.v = h; }
  $("dayEdit").hidden = !selDay;
  if (selDay) {
    const d = S.days[selDay] || {};
    $("deTitle").textContent = labelDay(selDay) + "　" + hrs(minOf(selDay)) + "時間" + (d.goal ? "　目標：" + d.goal : "");
    if (document.activeElement !== $("deMin")) $("deMin").value = Math.round(d.min || 0);
    $("deMode").value = modeOf(selDay);
    $("deReview").textContent = d.review ? "振り返り：" + d.review : "";
  }
}
/* ---- 成績 ---- */
const SKIND = { past: "過去問", mock: "模試", drill: "本番形式の演習" };
function renderScores() {
  const list = [...(S.scores || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  $("scoreList").innerHTML = list.length ? list.map(s => `<li><span>${esc(labelDay(s.date))} ${SKIND[s.kind] || ""}　${esc(s.name || "")}${s.best ? ' <span class="rar r3">自己ベスト</span>' : ""}</span><span class="row" style="flex-wrap:nowrap"><b class="num dot">${s.score}/${s.max}</b><button class="btn ghost sm" type="button" data-del="${s.id}">消す</button></span></li>`).join("") : '<li><span class="note">まだ記録なし。過去問や模試の点を入れると、自己ベスト更新で小判＋40。</span></li>';
  const asc = [...(S.scores || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (asc.length < 2) { $("scoreChart").innerHTML = ""; return; }
  const W = 600, H = 140, p = 18, x = i => p + (W - 2 * p) * i / (asc.length - 1), y = r => p + (H - 2 * p) * (1 - r);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="得点率の推移">`;
  for (const f of [0.5, 0.7, 0.8]) s += `<line x1="${p}" x2="${W - p}" y1="${y(f)}" y2="${y(f)}" stroke="var(--line)"/><text x="${W - p}" y="${y(f) - 3}" font-size="10" text-anchor="end" fill="var(--muted)">${f * 100}%</text>`;
  for (const kd of Object.keys(SKIND)) {
    const idx = asc.map((s, i) => [s, i]).filter(([s]) => (s.kind || "past") === kd); if (!idx.length) continue;
    const col = kd === "past" ? "var(--night2)" : kd === "mock" ? "var(--lantern)" : "var(--good)";
    s += `<polyline fill="none" stroke="${col}" stroke-width="2.5" points="${idx.map(([s, i]) => x(i) + "," + y(s.score / s.max)).join(" ")}"/>`;
    s += idx.map(([s, i]) => `<circle cx="${x(i)}" cy="${y(s.score / s.max)}" r="${s.best ? 5 : 3.5}" fill="${col}"><title>${esc(s.name || SKIND[kd])} ${Math.round(100 * s.score / s.max)}%</title></circle>`).join("");
  }
  $("scoreChart").innerHTML = s + "</svg>";
}
function addScore() {
  if (!ready()) return;
  const score = Number($("scScore").value), max = Number($("scMax").value), kind = $("scKind").value, date = $("scDate").value || dayKey();
  if (!(max > 0) || !(score >= 0) || score > max) { toast("点数と満点を入れて。"); return; }
  const prev = (S.scores || []).filter(s => (s.kind || "past") === kind).reduce((a, s) => Math.max(a, s.score / s.max), -1);
  const best = prev >= 0 && score / max > prev;
  backend.addTo("scores", { date, kind, name: $("scName").value.trim(), score, max, best, at: Date.now() }).then(() => {
    if (best) { sfx("done"); confetti(); toast("自己ベスト更新！小判＋40。相棒も認めてる。"); $("bubble").textContent = ""; } else { sfx("ok"); toast("記録した。"); }
  });
  $("scScore").value = ""; $("scName").value = "";
}
/* ---- 気分と体力 ---- */
function renderMood() {
  const k = dayKey(), W = 600, H = 110, n = 14, cw = W / n;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="直近14日の気分と体力">`;
  const yy = v => 10 + (H - 34) * (1 - (v - 1) / 4);
  const ser = (key, col) => { let pts = []; for (let i = n - 1; i >= 0; i--) { const d = S.days[addDays(k, -i)] || {}; if (d[key]) pts.push([(n - 1 - i) * cw + cw / 2, yy(d[key])]); } return pts.length ? `<polyline fill="none" stroke="${col}" stroke-width="2.5" points="${pts.map(p => p.join(",")).join(" ")}"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${col}"/>`).join("") : ""; };
  s += ser("mood", "var(--lantern)") + ser("energy", "var(--sky)");
  for (let i = 0; i < n; i += 2) { const d = addDays(k, -(n - 1 - i)); s += `<text x="${i * cw + cw / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">${parseDate(d).getMonth() + 1}/${parseDate(d).getDate()}</text>`; }
  $("moodChart").innerHTML = s + "</svg>";
}
/* ---- バッジ ---- */
function badgeList() {
  const e = econ(), own = Object.keys(S.game.owned || {}).length, words = Object.values(S.words.w || {}).filter(s => (s[0] || 0) >= 3).length;
  const maxDay = Math.max(0, ...Object.keys(S.days).map(minOf)), st = streakNow();
  const jh = GRAMMAR.jh.units.every((_, i) => ((S.grammar.units || {})["jh" + i] || {}).passed), hl = GRAMMAR.hl.units.every((_, i) => ((S.grammar.units || {})["hl" + i] || {}).passed);
  return [
    ["はじめの一歩", "累計10時間", e.totalMin >= 600], ["百時間の壁", "累計100時間", e.totalMin >= 6000], ["三百の修羅", "累計300時間", e.totalMin >= 18000],
    ["千の灯", "累計1000時間", e.totalMin >= 60000], ["攻略完了", "累計" + S.settings.goalHours + "時間", e.totalMin >= S.settings.goalHours * 60],
    ["10時間の日", "1日に10時間", maxDay >= 600], ["三日坊主卒業", "連続達成3日", st >= 3], ["一週間の鬼", "連続達成7日", st >= 7],
    ["全クリ職人", "ノルマ全クリア10日", e.clears >= 10], ["ポモ50", "ポモドーロ50セット", e.pomos >= 50],
    ["即答100", "100語を3回以上即答", words >= 100], ["即答1000", "1000語を3回以上即答", words >= 1000], ["Part1〜2制覇", "1500語を3回以上即答", words >= 1500],
    ["中学文法マスター", "中学文法 全単元合格", jh], ["ハイレベル修了", "ハイレベル 全単元合格", hl],
    ["自己ベスト", "過去問・模試で自己ベスト", e.bests >= 1], ["百鬼夜行", "お化け25体", own >= 25], ["妖怪博士", "お化け50体", own >= 50]
  ];
}
function renderBadges() { const b = badgeList(); $("badgeSum").textContent = b.filter(x => x[2]).length + " / " + b.length; $("badges").innerHTML = b.map(([n, d, g]) => `<div class="badge${g ? " got" : ""}"><b>${g ? "★ " : "☆ "}${n}</b><span>${d}</span></div>`).join(""); }
/* ---- 言葉・設定・バックアップ ---- */
function renderQuotes() { $("quoteList").innerHTML = (S.quotes || []).length ? S.quotes.map(q => `<li><span>${esc(q.text)}${q.by ? `<span class="note">　— ${esc(q.by)}</span>` : ""}</span><button class="btn ghost sm" type="button" data-q="${q.id}">消す</button></li>`).join("") : '<li><span class="note">休憩中に出す、自分の好きな言葉を足せる。</span></li>'; }
function fillSettings() {
  const s = S.settings;
  for (const [id, key] of [["setExams", "exams"], ["setNormal", "normal"], ["setRefresh", "refresh"], ["setGoal", "goalHours"], ["setStart", "startDate"], ["setDeadline", "deadline"], ["setWords", "wordsPerDay"], ["setDow", "refreshDow"]]) if (document.activeElement !== $(id)) $(id).value = s[key] ?? "";
  $("setSound").checked = s.sound !== false;
  const n = sums(parseSchedule(s.normal)), r = sums(parseSchedule(s.refresh));
  $("setSum").textContent = "通常日 勉強" + trimH(n.study) + "h ／ リフレッシュ日 勉強" + trimH(r.study) + "h・ゲーム" + trimH(r.game) + "h";
}
function saveSettings(e) {
  e.preventDefault(); if (!ready()) return;
  const v = { ...S.settings, exams: $("setExams").value, normal: $("setNormal").value, refresh: $("setRefresh").value, goalHours: Number($("setGoal").value) || 1100, startDate: $("setStart").value || DEFAULTS.startDate, deadline: $("setDeadline").value || DEFAULTS.deadline, wordsPerDay: clamp(Number($("setWords").value) || 50, 10, 200), refreshDow: Number($("setDow").value), sound: $("setSound").checked };
  backend.save("settings", v).then(() => { toast("設定を保存した。"); sfx("ok"); });
}
async function backup() {
  const dl = await claude.use("downloads").catch(() => null);
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), days: S.days, settings: S.settings, quotes: S.quotes, words: S.words, cloze: S.cloze, grammar: S.grammar, game: S.game, tickets: S.tickets, scores: S.scores, rpg: S.rpg }, null, 1);
  if (!dl) { toast("この画面ではファイル保存が使えない。"); return; }
  try { await dl.save({ filename: "kouryaku-backup-" + dayKey() + ".json", data }); toast("バックアップを保存した。"); } catch (e) { toast("保存しなかった。"); }
}
function renderRecord() { renderStats(); renderBars(); renderForecast(); renderHeat(); renderScores(); renderMood(); renderFitRecord(); renderBadges(); renderQuotes(); fillSettings(); }
function bindRecord() {
  $("heat").onclick = e => { const b = e.target.closest("button[data-d]"); if (!b) return; selDay = selDay === b.dataset.d ? null : b.dataset.d; renderHeat(); };
  $("deSave").onclick = () => { if (!ready() || !selDay) return; const m = clamp(Number($("deMin").value) || 0, 0, 1440); patchDay(selDay, d => { const diff = m - (d.min || 0); d.min = m; if (diff) { d.subj = d.subj || {}; d.subj.en = Math.max(0, (d.subj.en || 0) + diff); } d.mode = $("deMode").value; }); toast(labelDay(selDay) + "を直した。"); };
  $("scDate").value = dayKey();
  $("scoreForm").onsubmit = e => { e.preventDefault(); addScore(); };
  $("scoreList").onclick = e => { const b = e.target.closest("[data-del]"); if (b && ready()) backend.delFrom("scores", b.dataset.del); };
  $("quoteForm").onsubmit = e => { e.preventDefault(); if (!ready()) return; const text = $("qText").value.trim(); if (!text) return; backend.addTo("quotes", { text, by: $("qBy").value.trim(), at: Date.now() }); $("qText").value = ""; $("qBy").value = ""; toast("言葉を足した。"); };
  $("quoteList").onclick = e => { const b = e.target.closest("[data-q]"); if (b && ready()) backend.delFrom("quotes", b.dataset.q); };
  $("setForm").onsubmit = saveSettings;
  $("backupBtn").onclick = backup;
}

/* ===== 体づくり（ChatGPTと決めた計画）=====
   筋トレ週3（自重4種目をセットで数える）＋有酸素週3（歩く・走る・泳ぐ 20〜30分）＋間食100kcal＋体重。
   筋トレを4回やりきるごとに、1セットの回数が少し上がる。 */
const FIT = [
  { id: "squat", name: "スクワット", how: "お尻を後ろに引いて、太ももが床と平行まで。ひざはつま先と同じ向き。", sets: 3, base: 15, step: 2, max: 25, unit: "回" },
  { id: "push", name: "腕立て伏せ", how: "体を一直線に。きつい日は膝をついてOK。8〜12回できる形で。", sets: 2, base: 8, step: 1, max: 15, unit: "回" },
  { id: "plank", name: "プランク", how: "ひじとつま先で、頭からかかとまでまっすぐ。お尻を上げない。", sets: 3, base: 20, step: 5, max: 60, unit: "秒" },
  { id: "deadbug", name: "デッドバグ", how: "仰向けで手足を上げ、反対の手と足をゆっくり伸ばす。腰を床から浮かせない。", sets: 2, base: 10, step: 2, max: 16, unit: "回（左右）" }
];
const POSTURE = [
  { id: "chin", name: "あご引き", how: "背すじを伸ばし、あごを水平に後ろへ引く。二重あごを作る感じで5秒×10回。" },
  { id: "wall", name: "壁で腕の上げ下げ", how: "壁に背中・お尻・頭をつけ、ひじと手の甲も壁につけたまま腕を上下に10回。" },
  { id: "chest", name: "胸のストレッチ", how: "ドアの枠に腕をかけて、胸を前に出す。左右30秒ずつ。" }
];
const POSTURE_KOBAN = 3;
const CARDIO = [{ id: "walk", name: "ウォーキング" }, { id: "run", name: "走る・歩く交互" }, { id: "swim", name: "水泳" }];
const FIT_START = "2026-11-06";
const FIT_WEEK = 3, CARDIO_WEEK = 3, CARDIO_MIN = 20, SNACK_KCAL = 100;
const FIT_KOBAN = 10, CARDIO_KOBAN = 5;

function fitOf(k) { return (S.days[k] && S.days[k].fit) || {}; }
/** 筋トレをやりきった日か（その時点の目標で判定して ok を記録に残す） */
function fitOk(k) { return !!fitOf(k).ok; }
function cardioMin(k) { const c = fitOf(k).cardio || {}; return CARDIO.reduce((a, x) => a + (c[x.id] || 0), 0); }
function postureOk(k) { const q = fitOf(k).posture || {}; return POSTURE.every(x => q[x.id]); }
function cardioOk(k) { return cardioMin(k) >= CARDIO_MIN; }
function fitStage(k) { let n = 0; for (const d in S.days) if (d < k && fitOk(d)) n++; return { stage: Math.floor(n / 4), done: n, toNext: 4 - (n % 4) }; }
function fitReps(k) { const s = fitStage(k).stage, r = {}; for (const x of FIT) r[x.id] = Math.min(x.max, x.base + x.step * s); return r; }
function weekKeys(k) { const st = addDays(k, -((dow(k) + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(st, i)); }
function fitMonth(k) {
  const m = Math.floor(Math.max(0, daysBetween(FIT_START, k)) / 30) + 1;
  if (m <= 1) return { m, name: "1か月目　運動の習慣をつくる", tip: "回数よりフォーム。ゆっくり、正しい形で。" };
  if (m <= 3) return { m, name: m + "か月目　筋力と体力を伸ばす", tip: "回数が少しずつ上がる。有酸素は走る時間を増やしていく。" };
  return { m, name: m + "か月目　見た目を変える", tip: "筋肉を増やしながら体脂肪を落とす。食事を減らしすぎない。" };
}
function fitKoban() { let n = 0; for (const k in S.days) { if (fitOk(k)) n += FIT_KOBAN; if (cardioOk(k)) n += CARDIO_KOBAN; if (postureOk(k)) n += POSTURE_KOBAN; } return n; }
let fitShow = false;
const fitHas = k => { const f = fitOf(k); return !!(f.sets && Object.values(f.sets).some(Boolean)); };

function renderFit() {
  const k = dayKey(), f = fitOf(k), r = fitReps(k), st = fitStage(k), wk = weekKeys(k), mo = fitMonth(k);
  const sW = wk.filter(fitOk).length, cW = wk.filter(cardioOk).length;
  // 筋トレは2日続けない（前の日にやっていたら今日は休み）
  const rest = fitOk(addDays(k, -1)) && !fitHas(k);
  $("fitHead").textContent = fitOk(k) ? "筋トレ完了" : rest ? "今日は筋トレを休む日" : sW >= FIT_WEEK ? "今週の筋トレは達成" : "今日の筋トレ（15分）";
  $("fitWeek").textContent = "筋トレ " + sW + "/" + FIT_WEEK + "・有酸素 " + cW + "/" + CARDIO_WEEK;
  $("fitPhase").innerHTML = "<b>" + esc(mo.name) + "</b><span class=\"note\">" + esc(mo.tip) + "</span>";
  const sets = f.sets || {};
  const html = FIT.map(x => {
    const n = sets[x.id] || 0, done = n >= x.sets;
    const dots = Array.from({ length: x.sets }, (_, i) => `<button type="button" class="setb${i < n ? " on" : ""}" data-f="${x.id}" data-i="${i}" aria-label="${x.name} ${i + 1}セット目">${i + 1}</button>`).join("");
    return `<li class="task${done ? " done" : ""}" data-s="fit"><span class="nm">${x.name}<small>${x.how}</small></span>
      <span class="ct num">${r[x.id]}<small>${x.unit}×${x.sets}</small></span><div class="ctl sets">${dots}<span class="note">終わったセットを押す</span></div></li>`;
  }).join("");
  const ul = $("fitList"); if (ul.dataset.v !== html) { ul.innerHTML = html; ul.dataset.v = html; }
  const hide = rest && !fitHas(k) && !fitShow;
  $("fitList").hidden = hide;
  $("fitNote").textContent = fitOk(k) ? "小判＋" + FIT_KOBAN + "。明日は筋トレを休んで、歩くか泳ぐ日に。"
    : rest ? "筋肉は休んでいる間に育つ。今日は有酸素だけでいい。（やるなら下のボタン）"
    : "あと" + st.toNext + "回やりきると、1セットの回数が上がる。";
  $("fitForce").hidden = !hide;
  const q = f.posture || {}, pn = POSTURE.filter(x => q[x.id]).length;
  $("postureSum").textContent = pn + " / " + POSTURE.length + (pn === POSTURE.length ? "　できた" : "");
  $("postureSum").className = "num" + (pn === POSTURE.length ? " ok" : "");
  const ph = POSTURE.map(x => `<li class="task${q[x.id] ? " done" : ""}" data-s="fit"><span class="nm">${x.name}<small>${x.how}</small></span><button type="button" class="setb chk${q[x.id] ? " on" : ""}" data-p="${x.id}" aria-label="${x.name}をやった">${q[x.id] ? "済" : "やった"}</button></li>`).join("");
  const pl = $("postureList"); if (pl.dataset.v !== ph) { pl.innerHTML = ph; pl.dataset.v = ph; }
  const c = f.cardio || {}, cm = cardioMin(k);
  $("cardioSum").textContent = cm + " / " + CARDIO_MIN + "分" + (cm >= CARDIO_MIN ? "　できた" : "");
  $("cardioSum").className = "num" + (cm >= CARDIO_MIN ? " ok" : "");
  const ch = CARDIO.map(x => `<div class="crow"><span>${x.name}<b class="num">${c[x.id] || 0}分</b></span><span class="ctl"><button type="button" data-c="${x.id}" data-d="-5">−5</button><button type="button" data-c="${x.id}" data-d="10">＋10</button><button type="button" data-c="${x.id}" data-d="30">＋30</button></span></div>`).join("");
  const cl = $("cardioList"); if (cl.dataset.v !== ch) { cl.innerHTML = ch; cl.dataset.v = ch; }
  $("snackBtns").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(f.snack === (b.dataset.v === "1"))));
}
function renderFitRecord() {
  const k = dayKey(), cells = [];
  for (let i = 27; i >= 0; i--) { const d = addDays(k, -i); cells.push(`<i class="${fitOk(d) ? "on" : ""}${cardioOk(d) ? " cd" : ""}" title="${labelDay(d)}"></i>`); }
  let sess = 0, pday = 0, cmin = 0, snackOk = 0, snackN = 0; const ws = [];
  for (const d of Object.keys(S.days).sort()) { const f = fitOf(d); if (fitOk(d)) sess++; if (postureOk(d)) pday++; cmin += cardioMin(d); if (f.snack != null) { snackN++; if (f.snack) snackOk++; } if (f.weight) ws.push([d, f.weight]); }
  const last = ws[ws.length - 1], first = ws[0];
  const diff = last && first && last !== first ? (last[1] - first[1]).toFixed(1) : null;
  $("fitRec").innerHTML = `<div class="fitgrid">${cells.join("")}</div>
    <dl class="stats" style="margin:0">
    <div><dt>筋トレ</dt><dd>${sess}<small>回</small></dd></div><div><dt>有酸素</dt><dd>${cmin}<small>分</small></dd></div><div><dt>姿勢リセット</dt><dd>${pday}<small>日</small></dd></div>
    <div><dt>間食${SNACK_KCAL}kcal以内</dt><dd>${snackOk}<small>/${snackN}日</small></dd></div>
    <div><dt>体重</dt><dd>${last ? last[1] : "—"}<small>kg${diff != null ? "（" + (diff > 0 ? "+" : "") + diff + "）" : ""}</small></dd></div></dl>`;
  if (document.activeElement !== $("wtIn")) $("wtIn").value = fitOf(k).weight || "";
}
function bindFit() {
  const award = (k, wasS, wasC) => {
    if (!wasS && fitOk(k)) { sfx("done"); confetti(); toast("筋トレ完了！小判＋" + FIT_KOBAN); }
    else if (!wasC && cardioOk(k)) { sfx("coin"); toast("有酸素" + CARDIO_MIN + "分クリア！小判＋" + CARDIO_KOBAN); }
    else sfx("tap");
  };
  $("fitList").addEventListener("click", e => {
    const b = e.target.closest("button[data-f]"); if (!b || !ready()) return;
    const k = dayKey(), id = b.dataset.f, i = Number(b.dataset.i), wasS = fitOk(k), wasC = cardioOk(k);
    patchDay(k, d => {
      d.fit = d.fit || {}; d.fit.sets = d.fit.sets || {};
      const n = d.fit.sets[id] || 0; d.fit.sets[id] = i < n ? i : i + 1; // 押したセットまで済み。済みを押すとそこまで戻す
      d.fit.ok = FIT.every(x => (d.fit.sets[x.id] || 0) >= x.sets);
    }).then(() => award(k, wasS, wasC));
  });
  $("cardioList").addEventListener("click", e => {
    const b = e.target.closest("button[data-c]"); if (!b || !ready()) return;
    const k = dayKey(), wasS = fitOk(k), wasC = cardioOk(k);
    patchDay(k, d => { d.fit = d.fit || {}; d.fit.cardio = d.fit.cardio || {}; d.fit.cardio[b.dataset.c] = Math.max(0, (d.fit.cardio[b.dataset.c] || 0) + Number(b.dataset.d)); }).then(() => award(k, wasS, wasC));
  });
  $("postureList").addEventListener("click", e => {
    const b = e.target.closest("button[data-p]"); if (!b || !ready()) return;
    const k = dayKey(), was = postureOk(k);
    patchDay(k, d => { d.fit = d.fit || {}; d.fit.posture = d.fit.posture || {}; d.fit.posture[b.dataset.p] = !d.fit.posture[b.dataset.p]; }).then(() => {
      if (!was && postureOk(k)) { sfx("coin"); toast("姿勢リセット完了！小判＋" + POSTURE_KOBAN); } else sfx("tap");
    });
  });
  $("snackBtns").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || !ready()) return;
    patchDay(dayKey(), d => { d.fit = d.fit || {}; d.fit.snack = b.dataset.v === "1"; }); sfx("tap");
  });
  $("fitForce").onclick = () => { fitShow = true; renderFit(); };
  $("wtSave").onclick = () => {
    if (!ready()) return; const w = Math.round(Number($("wtIn").value) * 10) / 10;
    if (!(w > 30 && w < 200)) return toast("体重をkgで入れて。");
    patchDay(dayKey(), d => { d.fit = d.fit || {}; d.fit.weight = w; }); toast("体重を記録した。");
  };
}

/* ===== 英語RPG『Echoes of Aster（アスターの残響）』（オリジナル） =====
   全12章＋序章の長編。英文はターゲット1900（Part1〜2）の単語を中心に書く。
   画面では、文の中のターゲット単語を自動で見つけて下線を引き、「訳」で意味を出す（rpg.js）。

   節の書き方
   { bg, who, en, ja }                      せりふ・地の文（who が null なら地の文。bg で背景を切りかえ）
   { choice: {en, ja}, opts: [{ en, ja, go, flag }] }
   { battle: { name, ja, bg }, vocab: 2, qs: [{ en, ja, opts: [[英, 日]...], a, tip }] }
       vocab：その章で出てきたターゲット単語から、意味を答える問題を何問足すか
   { label } { go } { if: flag, go } { end: true }

   全体の流れ（予定）
   序章 番号のない列車（駅）／1 忘れていく村（村・地下室）／2 ささやきの森の遺跡（遺跡）
   3 水晶の洞窟（洞窟）：鉱夫ガロと、彼が忘れた娘／4 王都の地下水路（地下水路）
   5 白い城（城）：忘却こそ救いだと説く王の布告／6 灯の回廊（城の広間・夜の広間）
   7 大図書館（図書館）：「忘却」が始まった本当の理由／8 港の倉庫と浜辺（港・浜辺）
   9 沈んだ書庫（海の底）／10 嵐の空（嵐）／11 炎の門（地下の門）
   12 忘却の女王（玉座の間）／終章 ふたたび夕暮れの駅で */

const RPG_CAST = {
  ren: { name: "Ren", ja: "レン" },
  lina: { name: "Lina", ja: "リナ" },
  conductor: { name: "Conductor", ja: "車掌" },
  elder: { name: "Elder Bram", ja: "ブラム長老" },
  knight: { name: "The Hollow Knight", ja: "空ろの騎士" },
  child: { name: "Little Boy", ja: "小さな男の子" },
  baker: { name: "Baker", ja: "パン屋" },
  voice: { name: "???", ja: "？？？" }
};

const RPG_CHAPTERS = [
/* ───────────────────────── 序章 ───────────────────────── */
{ id: "p0", title: "Prologue: The Train with No Number", ja: "序章　番号のない列車", nodes: [
  { bg: "station", who: null, en: "The sun was going down, and the platform was almost empty.", ja: "日が沈みかけていて、ホームにはほとんど人がいなかった。" },
  { who: null, en: "Ren sat on a bench, holding an old photograph. In it, he was smiling next to a girl whose face had completely disappeared.", ja: "レンは古い写真を手に、ベンチに座っていた。写真の中の彼は笑っていて、その隣には顔がすっかり消えてしまった少女がいた。" },
  { who: "ren", en: "\"Mio...\"", ja: "「ミオ……」" },
  { who: null, en: "A year ago, his younger sister had vanished. What was worse, everyone else had forgotten that she had ever existed.", ja: "1年前、妹が姿を消した。さらに悪いことに、ほかのだれもが、彼女がこの世にいたことさえ忘れてしまった。" },
  { who: null, en: "Her room was now used for storage. Her name was no longer on the class list. Even his parents looked confused whenever he mentioned her.", ja: "彼女の部屋は今では物置になっている。クラス名簿にも名前はない。両親でさえ、彼が妹の話をするたびに戸惑った顔をした。" },
  { who: "ren", en: "\"Am I the only person in the world who still remembers you?\"", ja: "「おまえを覚えているのは、世界で俺だけなのか？」" },
  { who: null, en: "Just then, a bell rang. It was a sound that did not appear on any timetable.", ja: "ちょうどそのとき、ベルが鳴った。どの時刻表にも載っていない音だった。" },
  { who: null, en: "A silver train with no number on its side slowly approached the station and stopped in front of him.", ja: "車体に番号のない銀色の列車が、ゆっくりと駅に近づき、彼の目の前で止まった。" },
  { who: "conductor", en: "\"If you still remember her, get on board. This train does not wait for those who hesitate.\"", ja: "「まだ彼女を覚えているなら、お乗りなさい。この列車は、ためらう者を待ちません。」" },
  { choice: { en: "What will Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Get on without saying a word.", ja: "何も言わずに乗る。", go: "board" },
    { en: "\"Wait. Where does this train go?\"", ja: "「待ってくれ。この列車はどこへ行くんだ？」", go: "ask" }
  ] },
  { label: "ask" },
  { who: "conductor", en: "\"To the place where forgotten things end up. Whether you can return depends entirely on you.\"", ja: "「忘れられたものが行き着く場所へ。戻ってこられるかどうかは、すべてあなたしだいです。」" },
  { label: "board" },
  { who: null, en: "Ren took a deep breath and stepped inside. The doors closed behind him without a sound.", ja: "レンは深く息を吸って、中へ足を踏み入れた。扉は音もなく閉まった。" },
  { who: null, en: "Outside the window, the town melted into gold, then into darkness, and finally into a sky full of unfamiliar stars.", ja: "窓の外で、町は金色に溶け、やがて暗闇になり、最後には見たことのない星でいっぱいの空に変わった。" },
  { who: "conductor", en: "\"Before we arrive, I must check your ticket. Here, a ticket is a memory. Show me that yours is real.\"", ja: "「到着の前に、切符を拝見します。ここでは、切符とは記憶のこと。あなたの記憶が本物だと示してください。」" },
  { battle: { name: "Ticket Check", ja: "検札" }, vocab: 1, qs: [
    { en: "Why was Ren holding the photograph?", ja: "レンはなぜ写真を持っていた？", opts: [["He wanted to sell it.", "売りたかったから。"], ["It was the only proof of his sister.", "妹がいた唯一の証だったから。"], ["He found it on the bench.", "ベンチで拾ったから。"], ["The conductor gave it to him.", "車掌にもらったから。"]], a: 1, tip: "ほかの人はみんな妹を忘れている。写真は、妹がいたことを示す数少ないもの。" },
    { en: "What happened to Mio's room?", ja: "ミオの部屋はどうなった？", opts: [["It became a storage room.", "物置になった。"], ["It was locked.", "鍵がかけられた。"], ["Ren moved into it.", "レンが使うようになった。"], ["It was destroyed.", "壊された。"]], a: 0, tip: "\"Her room was now used for storage.\" storage＝保管、物置。" }
  ] },
  { who: "conductor", en: "\"Very well. Your memory is clear and strong. Welcome to Aster, the land of forgotten things.\"", ja: "「けっこう。あなたの記憶ははっきりしていて、強い。ようこそアスターへ。忘れられたものたちの国へ。」" },
  { end: true }
] },

/* ───────────────────────── 第1章 ───────────────────────── */
{ id: "c1", title: "Chapter 1: The Village That Forgets", ja: "第1章　忘れていく村", nodes: [
  { bg: "village", who: null, en: "When Ren woke up, he was lying on a stone road in the middle of a quiet village.", ja: "目を覚ますと、レンは静かな村の真ん中で、石畳の道に横たわっていた。" },
  { who: null, en: "The sky was clear and the trees were green, but something about the place felt wrong.", ja: "空は晴れ、木々は緑だった。でも、この場所の何かがおかしい気がした。" },
  { who: "baker", en: "\"Good morning! Would you like some bread? It costs... it costs... I'm sorry, I can't seem to remember.\"", ja: "「おはよう！パンはいかが？お値段は……ええと……ごめんなさい、どうしても思い出せなくて。」" },
  { who: null, en: "Nearby, two children were playing together. Suddenly, one of them stopped and stared at the other.", ja: "近くで、二人の子どもがいっしょに遊んでいた。突然、ひとりが手を止めて、もうひとりをじっと見つめた。" },
  { who: "child", en: "\"Excuse me... who are you? Why am I holding your hand?\"", ja: "「ねえ……きみ、だれ？なんでぼく、きみと手をつないでるの？」" },
  { who: "voice", en: "\"Don't be scared. It happens every day now. People lose a little more of themselves each morning.\"", ja: "「こわがらないで。今では毎日起きていることなの。人は毎朝、自分を少しずつ失っていくの。」" },
  { who: null, en: "A girl about Ren's age was standing behind him. She was holding a small lantern shaped like an open book.", ja: "レンと同じくらいの年の少女が、うしろに立っていた。開いた本の形をした小さなランタンを持っている。" },
  { who: "lina", en: "\"I'm Lina, an apprentice at the Great Library of Aster. And you... you're not from here, are you?\"", ja: "「わたしはリナ。アスター大図書館の見習いよ。それにあなた……ここの人じゃないでしょう？」" },
  { who: "ren", en: "\"How did you know?\"", ja: "「どうしてわかった？」" },
  { who: "lina", en: "\"Your memory is shining. I can see it in my lantern. People here have lost that kind of light.\"", ja: "「あなたの記憶が光ってるの。わたしのランタンに映って見える。ここの人たちは、もうそういう光をなくしてしまったから。」" },
  { who: null, en: "Ren showed her the photograph and explained everything: his sister, the faceless picture, and the train with no number.", ja: "レンは写真を見せて、すべてを説明した。妹のこと、顔の消えた写真のこと、そして番号のない列車のこと。" },
  { who: "lina", en: "\"Then she might be in Aster. Everything the world forgets eventually comes here, whether it is an object, a place, or a person.\"", ja: "「それなら、彼女はアスターにいるかもしれない。世界が忘れたものは、物でも場所でも人でも、いずれはここにたどり着くの。」" },
  { who: "lina", en: "\"But Aster is in danger, too. A year ago, something we call the Fading began. Memories turn into gray dust and simply blow away.\"", ja: "「でも、アスターも危ないの。1年前、わたしたちが『色あせ』と呼んでいるものが始まった。記憶が灰色の粉になって、そのまま吹き飛んでしまうの。」" },
  { who: "ren", en: "\"A year ago... That's exactly when Mio disappeared.\"", ja: "「1年前……ちょうどミオが消えたときだ。」" },
  { who: "lina", en: "\"Then perhaps the two are connected. Come with me. Elder Bram knows more about the Fading than anyone.\"", ja: "「なら、その二つはつながっているのかもしれない。いっしょに来て。ブラム長老なら、色あせについてだれよりもくわしいわ。」" },
  { bg: "cellar", who: null, en: "The elder's house had a cellar lit by a single torch. An old man was sitting in the corner, holding a wooden box tightly.", ja: "長老の家には、たいまつ一本で照らされた地下室があった。老人が隅に座って、木の箱をしっかりと抱えていた。" },
  { who: "elder", en: "\"Lina? Is that you? I put something precious in this box, but I can't recall what it was.\"", ja: "「リナか？わしはこの箱に大切なものを入れたのじゃが、それが何だったか思い出せんのだ。」" },
  { who: "lina", en: "\"Elder, please try. We need to know where the Fading started.\"", ja: "「長老、思い出してみて。色あせがどこで始まったのか、知る必要があるの。」" },
  { who: null, en: "Before the old man could answer, the torch flickered. The shadows on the wall began to move by themselves.", ja: "老人が答える前に、たいまつの火がゆらいだ。壁の影が、ひとりでに動き始めた。" },
  { who: "lina", en: "\"A Hollow! It's a monster made from abandoned memories. Ren, stay behind me!\"", ja: "「ホロウよ！捨てられた記憶から生まれた化け物。レン、わたしのうしろに！」" },
  { who: "ren", en: "\"No way. I'm not going to stand behind anyone while you fight alone.\"", ja: "「冗談じゃない。きみがひとりで戦ってるのに、だれかのうしろに隠れてなんかいられるか。」" },
  { who: "lina", en: "\"Then listen. Hollows are weak against true words. Answer what they ask with the right meaning, and they will lose their shape.\"", ja: "「じゃあ聞いて。ホロウは本当の言葉に弱いの。問いかけに正しい意味で答えれば、形を保てなくなる。」" },
  { battle: { name: "Cellar Hollow", ja: "地下室のホロウ" }, vocab: 2, qs: [
    { en: "Why couldn't the baker tell Ren the price of the bread?", ja: "パン屋はなぜパンの値段を言えなかった？", opts: [["She did not want to sell it.", "売りたくなかったから。"], ["She had forgotten it.", "忘れてしまったから。"], ["The bread was free.", "パンは無料だったから。"], ["Ren had no money.", "レンがお金を持っていなかったから。"]], a: 1, tip: "\"I can't seem to remember.\" can't seem to ～＝どうしても～できないようだ。" },
    { en: "According to Lina, what happens to everything the world forgets?", ja: "リナによると、世界が忘れたものはどうなる？", opts: [["It disappears forever.", "永遠に消える。"], ["It eventually comes to Aster.", "いずれアスターにやって来る。"], ["It turns into a train.", "列車に変わる。"], ["It goes back to its owner.", "持ち主のもとに戻る。"]], a: 1, tip: "eventually＝最終的に、いずれは。" }
  ] },
  { who: null, en: "The shadow let out a long sigh and broke into gray dust. For a moment, the cellar was silent.", ja: "影は長いため息をつき、灰色の粉になって崩れた。しばらくのあいだ、地下室は静まり返っていた。" },
  { who: null, en: "Then the elder slowly opened the wooden box. Inside was a tiny pair of children's shoes.", ja: "やがて長老は、ゆっくりと木の箱を開けた。中には小さな子ども用の靴が入っていた。" },
  { who: "elder", en: "\"These belonged to my grandson... I remember now. He used to run to me every evening, laughing.\"", ja: "「これは孫の靴じゃ……今、思い出した。あの子は毎晩、笑いながらわしのところへ駆けてきたものじゃ。」" },
  { who: "elder", en: "\"I would rather feel this pain than lose him again. Thank you, young man.\"", ja: "「もう一度あの子を失うくらいなら、この痛みを感じているほうがいい。ありがとう、若いの。」" },
  { who: "elder", en: "\"The Fading started at the old shrine in the Whispering Forest. A knight guards it now, but he no longer remembers whom he serves.\"", ja: "「色あせは、ささやきの森の古いほこらで始まった。今は騎士がそこを守っておるが、自分がだれに仕えておるのか、もう覚えてはおらん。」" },
  { bg: "village", who: null, en: "That night, Ren and Lina sat by the fountain in the empty square.", ja: "その夜、レンとリナは、だれもいない広場の噴水のそばに座っていた。" },
  { who: "lina", en: "\"Can I ask you something? Remembering your sister must hurt. Why don't you just let her go?\"", ja: "「ひとつ聞いてもいい？妹さんを覚えているのは、つらいはずよね。どうして手放してしまわないの？」" },
  { choice: { en: "How does Ren answer?", ja: "レンはどう答える？" }, opts: [
    { en: "\"Because if I forget her too, she will really be gone.\"", ja: "「俺まで忘れたら、あいつは本当にいなくなってしまうから。」", go: "c1a", flag: "promise" },
    { en: "\"I tried. But my heart refused to let her go.\"", ja: "「やってみたさ。でも、心がどうしても手放そうとしなかった。」", go: "c1b" }
  ] },
  { label: "c1a" },
  { who: "lina", en: "\"...Then I'll help you keep her. That's a promise.\"", ja: "「……なら、わたしが手伝う。彼女を失わないように。約束する。」" },
  { go: "c1end" },
  { label: "c1b" },
  { who: "lina", en: "\"Hearts are stubborn like that. I think yours is right.\"", ja: "「心って、そういうところが頑固なのよね。でも、あなたの心は正しいと思う。」" },
  { label: "c1end" },
  { who: null, en: "Lina's lantern flickered for a moment, as if it were tired. She quickly covered it with her sleeve.", ja: "リナのランタンが、疲れたように一瞬ゆらいだ。彼女はすぐに袖でそれを隠した。" },
  { end: true }
] },

/* ───────────────────────── 第2章 ───────────────────────── */
{ id: "c2", title: "Chapter 2: Ruins of the Whispering Forest", ja: "第2章　ささやきの森の遺跡", nodes: [
  { bg: "ruins", who: null, en: "Deep in the forest stood the remains of an ancient shrine, covered with moss and climbing plants.", ja: "森の奥深くに、苔とつる草におおわれた古いほこらの跡が立っていた。" },
  { who: null, en: "As they walked, the leaves seemed to whisper words in a language Ren almost understood.", ja: "歩いていると、木の葉がささやいているように聞こえた。レンにはほとんどわかりそうな言葉で。" },
  { who: "lina", en: "\"The trees are repeating memories that people have abandoned. Try not to listen too closely, or you might get lost in them.\"", ja: "「木々は、人々が捨てた記憶をくり返しているの。あまり聞き入らないで。迷いこんでしまうかもしれないから。」" },
  { who: "voice", en: "\"Ren... Don't look for me... It's better this way...\"", ja: "「レン……わたしを探さないで……このほうがいいの……」" },
  { who: "ren", en: "\"Mio? Mio! Was that you?\"", ja: "「ミオ？ミオ！今のはおまえか？」" },
  { who: "lina", en: "\"Ren, wait! The forest imitates voices to confuse travelers!\"", ja: "「レン、待って！森は旅人をまどわすために声をまねるのよ！」" },
  { choice: { en: "What does Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Run toward the voice.", ja: "声のほうへ走る。", go: "run" },
    { en: "Stop and trust Lina.", ja: "立ち止まって、リナを信じる。", go: "trust", flag: "trust" }
  ] },
  { label: "run" },
  { who: null, en: "Ren ran between the trees until his breath ran out. There was no one there, only an old ribbon caught on a branch.", ja: "レンは息が切れるまで木々のあいだを走った。だれもいなかった。枝に古いリボンが引っかかっているだけだった。" },
  { who: null, en: "He recognized it at once. It was the blue ribbon he had given Mio on her tenth birthday.", ja: "彼にはすぐにわかった。ミオの10歳の誕生日に、彼が贈った青いリボンだった。", flag: "ribbon" },
  { who: "lina", en: "\"Ren! Don't ever run off like that again... But that ribbon proves she really came this way.\"", ja: "「レン！二度とあんなふうに走っていかないで……でも、そのリボンは、彼女が本当にこの道を通った証拠ね。」" },
  { go: "gate" },
  { label: "trust" },
  { who: null, en: "Ren clenched his fists and stayed where he was. Slowly, the voice faded into the wind.", ja: "レンはこぶしを握りしめ、その場にとどまった。声はゆっくりと風の中に消えていった。" },
  { who: "lina", en: "\"Thank you for trusting me. I know how much you wanted to follow it.\"", ja: "「信じてくれてありがとう。あの声を追いかけたかった気持ち、よくわかる。」" },
  { label: "gate" },
  { who: null, en: "At the center of the ruins was a dark archway. In front of it stood a knight in rusted armor, holding a broken sword.", ja: "遺跡の中心に、暗いアーチがあった。その前に、さびた鎧の騎士が折れた剣を持って立っていた。" },
  { who: "knight", en: "\"Stop. I was ordered to protect this place. No one may pass.\"", ja: "「止まれ。わたしはこの場所を守るよう命じられた。だれも通さぬ。」" },
  { who: "lina", en: "\"Who gave you that order, Sir Knight?\"", ja: "「騎士さま、その命令はだれから受けたのですか？」" },
  { who: "knight", en: "\"Who...? I... I do not know. I only know that I must not fail again.\"", ja: "「だれ……？わたしは……わからぬ。ただ、二度と失敗してはならぬ、それだけはわかる。」" },
  { who: "ren", en: "\"Again? Then you failed someone before. Who was it?\"", ja: "「二度と？じゃあ、前にだれかを守れなかったんだな。それはだれだ？」" },
  { who: null, en: "The knight's helmet shook violently. Gray dust poured out of the gaps in his armor.", ja: "騎士のかぶとが激しく揺れた。鎧のすき間から、灰色の粉があふれ出した。" },
  { who: "knight", en: "\"Do not ask me that! Leave, or I will make you forget your own name!\"", ja: "「それを聞くな！立ち去れ。さもなくば、おまえ自身の名前を忘れさせてやる！」" },
  { battle: { name: "The Hollow Knight", ja: "空ろの騎士", boss: true }, vocab: 3, qs: [
    { en: "Why did Lina tell Ren not to listen to the trees too closely?", ja: "リナはなぜ、木々の声に聞き入らないように言った？", opts: [["The trees were dangerous animals.", "木々が危険な動物だったから。"], ["He might get lost in abandoned memories.", "捨てられた記憶の中で迷うかもしれないから。"], ["The trees were telling lies about Mio.", "木々がミオについてうそをついていたから。"], ["They had no time to rest.", "休む時間がなかったから。"]], a: 1, tip: "\"or you might get lost in them\" ＝ さもないと、その中で迷うかもしれない。命令文＋or は「さもないと」。" },
    { en: "What does the knight know for certain?", ja: "騎士がはっきりわかっていることは？", opts: [["The name of his king.", "王の名前。"], ["Where the Fading began.", "色あせが始まった場所。"], ["That he must not fail again.", "二度と失敗してはならないこと。"], ["Who Ren is.", "レンがだれか。"]], a: 2, tip: "\"I only know that I must not fail again.\" only know ＝それしかわからない。" },
    { en: "In \"Gray dust poured out of the gaps,\" the word \"poured\" is closest to ___.", ja: "\"poured\" にいちばん近い意味は？", opts: [["flowed out", "流れ出た"], ["froze", "凍った"], ["rose slowly", "ゆっくり上がった"], ["disappeared", "消えた"]], a: 0, tip: "pour＝注ぐ、どっと流れ出る。" }
  ] },
  { who: null, en: "The broken sword fell from the knight's hand. He dropped to one knee, and his voice became calm and human.", ja: "折れた剣が騎士の手から落ちた。彼は片ひざをつき、その声は落ち着いた、人間らしいものになった。" },
  { who: "knight", en: "\"Now I remember. I served a young girl who came here a year ago. She was crying, and she asked me to guard the door so that no one would follow her.\"", ja: "「今、思い出した。わたしは1年前ここに来た少女に仕えていた。彼女は泣いていて、だれも追ってこないよう、扉を守ってほしいとわたしに頼んだのだ。」" },
  { who: "ren", en: "\"A girl... about this tall? With a quiet voice?\"", ja: "「少女……このくらいの背の？静かな声の？」" },
  { if: "ribbon", go: "kribbon" },
  { who: "knight", en: "\"Yes. She said her brother was the only one who would keep searching for her, and that she could not bear to be found.\"", ja: "「そうだ。彼女は言った。自分を探し続けるのは兄だけだろう、そして、見つけられることには耐えられない、と。」" },
  { go: "kend" },
  { label: "kribbon" },
  { who: "knight", en: "\"Yes... she wore a blue ribbon like the one in your hand. She said her brother gave it to her, and that she could not bear to be found by him.\"", ja: "「ああ……きみが持っているような青いリボンをつけていた。兄にもらったのだと言っていた。そして、その兄に見つけられることには耐えられない、と。」" },
  { label: "kend" },
  { who: "ren", en: "\"Why? Why would she run away from me?\"", ja: "「なぜだ？なぜ俺から逃げなきゃいけないんだ？」" },
  { who: "knight", en: "\"That, I cannot answer. But she went toward the Crystal Caves, and then to the capital. Please... protect her better than I did.\"", ja: "「それには答えられぬ。だが彼女は水晶の洞窟へ、そして王都へ向かった。どうか……わたしよりも、うまく彼女を守ってやってくれ。」" },
  { who: null, en: "The knight smiled for the first time, and his armor turned into soft light that rose slowly into the trees.", ja: "騎士は初めてほほえんだ。そして彼の鎧は、やわらかな光になって、ゆっくりと木々のあいだへ昇っていった。" },
  { who: null, en: "Where he had been kneeling, a small crystal was left on the ground. Inside it, a faint image of a girl was walking away.", ja: "彼がひざをついていた場所に、小さな水晶が残されていた。その中では、少女のかすかな姿が、遠ざかるように歩いていた。" },
  { who: "lina", en: "\"A Memory Shard. It holds a piece of someone's past. Ren... I think it's hers.\"", ja: "「記憶のかけらよ。だれかの過去のひとかけらが入ってる。レン……これ、彼女のものだと思う。」" },
  { if: "trust", go: "c2trust" },
  { go: "c2fin" },
  { label: "c2trust" },
  { who: "lina", en: "\"And Ren... back in the forest, you chose to trust me. I won't forget that.\"", ja: "「それとね、レン……森で、あなたはわたしを信じてくれた。そのこと、忘れないから。」" },
  { label: "c2fin" },
  { who: "ren", en: "\"She didn't vanish by accident. She left on purpose... and I'm going to find out why.\"", ja: "「あいつは偶然消えたんじゃない。自分の意志で去ったんだ……その理由を、俺は必ず突き止める。」" },
  { end: true }
] }
];

/* ===== 英語RPG『Echoes of Aster』の動き =====
   画面：上に背景の絵、下に会話の枠。枠をタップで次へ、右上の「訳」で日本語に切りかえ。
   文の中のターゲット単語（Part1〜2）には下線を引き、「訳」のときに意味を小さく並べる。
   戦い：問題に答えて敵のHPを削る。間違えるとハートが減る。答えたあとに短い解説。
   進み具合は game/rpg（story・章・何番目・フラグ・クリアした章・倒した敵）。 */
const RPG_STORY = "aster", RPG_HP = 5, RPG_CLEAR_KOBAN = 50, RPG_WIN_KOBAN = 5;
let rpgJa = false, rpgB = null, rpgMenu = false;
function rpgState() {
  let s = JSON.parse(JSON.stringify(S.rpg || {}));
  // 前の物語（妖怪の章）の記録は、小判の分だけ残して新しい物語を最初から
  if (s.story !== RPG_STORY) s = { story: RPG_STORY, ch: 0, i: 0, flags: {}, cleared: s.cleared || [], won: s.won || {} };
  s.flags = s.flags || {}; s.won = s.won || {}; s.cleared = s.cleared || []; s.ch = s.ch || 0; s.i = s.i || 0;
  return s;
}
function rpgKoban() { const r = S.rpg || {}; return (r.cleared || []).length * RPG_CLEAR_KOBAN + Object.keys(r.won || {}).length * RPG_WIN_KOBAN; }
const rpgNodes = st => (RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0]).nodes;

/* ---- ターゲット単語を見つける（変化形もだいたい拾う） ---- */
let rpgForms = null;
const RPG_SKIP = new Set(["found", "wind", "mean", "means", "left", "lie", "lay", "saw", "tear", "rose", "felt", "fell"]);
function rpgDict() {
  if (rpgForms) return rpgForms;
  rpgForms = new Map();
  const add = (f, w) => { if (!rpgForms.has(f) && !RPG_SKIP.has(f)) rpgForms.set(f, w); };
  for (const w of (typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : [])) {
    const b = String(w[0]).toLowerCase(); if (/[^a-z]/.test(b)) continue;
    for (const f of [b, b + "s", b + "es", b + "ed", b + "d", b + "ing", b + "ly"]) add(f, w);
    if (b.endsWith("e")) add(b.slice(0, -1) + "ing", w);
    if (b.endsWith("y")) for (const t of ["ies", "ied", "ily"]) add(b.slice(0, -1) + t, w);
    if (/[^aeiou][aeiou][bdgklmnprt]$/.test(b)) { add(b + b.slice(-1) + "ed", w); add(b + b.slice(-1) + "ing", w); }
  }
  return rpgForms;
}
const rpgShort = m => String(m).split(/[；;]/)[0].trim();
/** 英文を、ターゲット単語に下線をつけたHTMLにする。見つけた単語も返す */
function rpgMark(en) {
  const d = rpgDict(), found = [];
  const html = esc(en).replace(/[A-Za-z]+/g, t => { const w = d.get(t.toLowerCase()); if (!w) return t; if (!found.includes(w)) found.push(w); return `<u>${t}</u>`; });
  return { html, found };
}
/** 章の中で、この戦いより前に出てきたターゲット単語 */
function rpgChapterWords(st) {
  const out = []; const ns = rpgNodes(st);
  for (let k = 0; k < st.i; k++) { const n = ns[k]; if (n && n.en) for (const w of rpgMark(n.en).found) if (!out.includes(w)) out.push(w); }
  return out;
}
function rpgVocabQs(st, n) {
  const pool = rpgChapterWords(st), all = typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : [];
  const pick = [], seed = (st.ch + 1) * 97 + st.i * 13;
  for (let k = 0; k < (n.vocab || 0) && pool.length; k++) pick.push(pool.splice((seed + k * 31) % pool.length, 1)[0]);
  return pick.map((w, k) => {
    const wrong = []; for (let j = 1; wrong.length < 3 && j < 50; j++) { const x = all[(Number(w[2]) * 7 + j * 131 + k) % all.length]; if (x && x[0] !== w[0] && !wrong.includes(x)) wrong.push(x); }
    const opts = [w, ...wrong], at = (seed + k) % 4; [opts[0], opts[at]] = [opts[at], opts[0]];
    return { en: `What does "${w[0]}" mean?`, ja: `「${w[0]}」の意味は？`, opts: opts.map(x => [rpgShort(x[1]), rpgShort(x[1])]), a: at, tip: `${w[0]}＝${rpgShort(w[1])}（ターゲット No.${w[2]}）`, jaOnly: true };
  });
}

/* ---- 進める ---- */
function rpgResolve(st) {
  const ns = rpgNodes(st), at = l => ns.findIndex(n => n.label === l);
  for (let g = 0; g < 300; g++) {
    const n = ns[st.i]; if (!n) return st;
    if (n.label != null) st.i++;
    else if (n.if != null) st.i = st.flags[n.if] ? at(n.go) : st.i + 1;
    else if (n.go) st.i = at(n.go);
    else return st;
  }
  return st;
}
function rpgSave(st) { rpgJa = false; rpgB = null; rpgMenu = false; if (!ready()) return; return patchDoc("rpg", v => { for (const k of Object.keys(v)) delete v[k]; Object.assign(v, st); }); }
function rpgGo(st) {
  rpgResolve(st);
  const n = rpgNodes(st)[st.i], ch = RPG_CHAPTERS[st.ch];
  if (n && n.end && !st.cleared.includes(ch.id)) { st.cleared.push(ch.id); setTimeout(() => { sfx("done"); confetti(); toast(ch.ja + " クリア！小判＋" + RPG_CLEAR_KOBAN); }, 60); }
  return rpgSave(st);
}
function rpgNext() { const st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i]; if (!n) return; if (n.flag) st.flags[n.flag] = 1; st.i++; sfx("tap"); rpgGo(st); }

/* ---- 表示 ---- */
function rpgBg(st) { let bg = null; const ns = rpgNodes(st); for (let k = 0; k <= st.i; k++) if (ns[k] && ns[k].bg) bg = ns[k].bg; if (!bg) for (let c = st.ch - 1; c >= 0 && !bg; c--) for (const x of RPG_CHAPTERS[c].nodes) if (x.bg) bg = x.bg; return bg || "station"; }
function rpgScene(st, overlay) {
  const bg = rpgBg(st), src = typeof RPG_BG !== "undefined" && RPG_BG[bg];
  return `<div class="rpg-scene" style="${src ? `background-image:url('${src}')` : ""}">${overlay || ""}</div>`;
}
const rpgTr = () => `<button type="button" class="rpg-tr${rpgJa ? " on" : ""}" data-r="tr" aria-pressed="${rpgJa}">訳</button>`;
function rpgGloss(found) { return rpgJa && found.length ? `<div class="rpg-gloss">${found.map(w => `<span><b>${esc(w[0])}</b>${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""; }

function renderRPG() {
  const box = $("rpgBox"); if (!box) return;
  const st = rpgResolve(rpgState()), ch = RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0], ns = rpgNodes(st), n = ns[st.i];
  const shown = ns.filter(x => x.en || x.choice || x.battle).length, done = ns.slice(0, st.i).filter(x => x.en || x.choice || x.battle).length;
  const head = `<div class="rpg-top"><span class="rpg-ch">${esc(ch.ja)}</span><span class="rpg-prog">${Math.min(done + 1, shown)} / ${shown}</span><button type="button" class="rpg-menu-btn" data-r="menu" aria-label="章を選ぶ">☰</button></div>`;
  let h;
  if (rpgMenu) h = head + rpgMenuHtml(st);
  else if (!n) h = head + rpgScene(st) + `<div class="rpg-box"><p class="rpg-text">物語が見つからない。☰ から章を選んで。</p></div>`;
  else if (n.end) h = head + rpgScene(st, `<div class="rpg-banner">${esc(ch.ja)}<small>CLEAR</small></div>`) + rpgEndHtml(st);
  else if (n.battle) h = head + rpgBattleHtml(st, n);
  else if (n.choice) h = head + rpgScene(st) + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">${rpgJa ? "選択" : "Choice"}</span>${rpgTr()}</div>
      <p class="rpg-text">${esc(rpgJa ? n.choice.ja : n.choice.en)}</p>
      <div class="rpg-opts">${n.opts.map((o, k) => `<button type="button" data-r="opt" data-k="${k}"><span>${k + 1}</span>${esc(rpgJa ? o.ja : o.en)}</button>`).join("")}</div></div>`;
  else {
    const c = n.who && RPG_CAST[n.who], m = rpgMark(n.en);
    h = head + rpgScene(st) + `<div class="rpg-box tap" data-r="next" role="button" tabindex="0">
      <div class="rpg-boxhead">${c ? `<span class="rpg-name">${esc(rpgJa ? c.ja : c.name)}</span>` : `<span></span>`}${rpgTr()}</div>
      <p class="rpg-text${c ? "" : " narr"}">${rpgJa ? esc(n.ja) : m.html}</p>${rpgGloss(m.found)}
      <span class="rpg-more" aria-hidden="true">▼</span></div>`;
  }
  if (box.dataset.v !== h) {
    box.innerHTML = h; box.dataset.v = h;
    // 答えたあとは、結果と「次へ」が下のタブに隠れないように少しスクロール
    const nb = box.querySelector('[data-r="bnext"]');
    if (nb) requestAnimationFrame(() => { const over = nb.getBoundingClientRect().bottom - (innerHeight - 90); if (over > 0) scrollBy({ top: over, behavior: "smooth" }); });
  }
}
function rpgEndHtml(st) {
  const last = st.ch >= RPG_CHAPTERS.length - 1;
  return `<div class="rpg-box"><p class="rpg-text">${last ? "ここまでが今ある物語。続きは準備中。" : "次の章へ進もう。"}</p>
    ${last ? "" : `<button type="button" class="big-btn" data-r="nextch">${esc(RPG_CHAPTERS[st.ch + 1].ja)} へ</button>`}</div>`;
}
function rpgMenuHtml(st) {
  return `<div class="rpg-box"><p class="rpg-text">章を選ぶ</p><div class="rpg-chlist">${RPG_CHAPTERS.map((c, k) => {
    const open = k === 0 || st.cleared.includes(RPG_CHAPTERS[k - 1].id) || k <= st.ch;
    return `<button type="button" data-r="pick" data-k="${k}"${open ? "" : " disabled"}${k === st.ch ? ' class="cur"' : ""}><span>${esc(c.ja)}</span><small>${st.cleared.includes(c.id) ? "クリア" : open ? "" : "未開放"}</small></button>`;
  }).join("")}</div><button type="button" class="btn" data-r="menu">閉じる</button></div>`;
}
function rpgBattleHtml(st, n) {
  if (!rpgB || rpgB.i !== st.i) { const qs = [...n.qs, ...rpgVocabQs(st, n)]; rpgB = { i: st.i, qs, hp: qs.length, php: RPG_HP, q: qs.map((_, k) => k), res: null, pick: null }; }
  const b = rpgB, e = n.battle, total = b.qs.length;
  const over = `<div class="rpg-foe${e.boss ? " boss" : ""}"><b>${esc(rpgJa ? e.ja : e.name)}</b><div class="rpg-hpbar"><i style="width:${100 * Math.max(0, b.hp) / total}%"></i></div></div>
    <div class="rpg-hearts">${"♥".repeat(Math.max(0, b.php))}<span>${"♥".repeat(RPG_HP - Math.max(0, b.php))}</span></div>`;
  const scene = rpgScene(st, over);
  if (b.php <= 0) return scene + `<div class="rpg-box"><p class="rpg-text">力尽きた……もう一度挑戦しよう。</p><button type="button" class="big-btn" data-r="retry">もう一度戦う</button></div>`;
  if (b.hp <= 0) return scene + `<div class="rpg-box"><p class="rpg-text">${esc(rpgJa ? e.ja : e.name)} を倒した！${st.won[st.ch + ":" + st.i] ? "" : `<small class="rpg-gain">小判＋${RPG_WIN_KOBAN}</small>`}</p><button type="button" class="big-btn" data-r="win">先へ進む</button></div>`;
  const q = b.qs[b.q[0]], answered = b.res != null, num = total - b.q.length + 1;
  let h = scene + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">Q${Math.min(num, total)} / ${total}</span>${q.jaOnly || answered ? "" : rpgTr()}</div>
    <p class="rpg-text q">${esc(rpgJa || answered ? q.ja : q.en)}</p>
    <div class="rpg-opts">${q.opts.map((o, k) => {
      const cls = !answered ? "" : k === q.a ? "right" : k === b.pick ? "wrong" : "dim";
      const label = q.jaOnly ? esc(o[1]) : answered || rpgJa ? `${esc(o[0])}<small>${esc(o[1])}</small>` : esc(o[0]);
      return `<button type="button" data-r="ans" data-k="${k}" class="${cls}"${answered ? " disabled" : ""}><span>${"ABCD"[k]}</span><em>${label}</em></button>`;
    }).join("")}</div>`;
  if (answered) h += `<div class="rpg-res ${b.res}"><b>${b.res === "ok" ? "正解" : "不正解　正解は " + "ABCD"[q.a]}</b><p>${esc(q.tip || "")}</p></div><button type="button" class="big-btn" data-r="bnext">次へ</button>`;
  return h + `</div>`;
}
function bindRPG() {
  const box = $("rpgBox");
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-r]"); if (!b || b.disabled) return;
    const r = b.dataset.r, st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i];
    if (r === "tr") { e.stopPropagation(); rpgJa = !rpgJa; sfx("tap"); return renderRPG(); }
    if (r === "menu") { rpgMenu = !rpgMenu; return renderRPG(); }
    if (r === "pick") { const k = Number(b.dataset.k); if (k === st.ch) { rpgMenu = false; return renderRPG(); } st.ch = k; st.i = 0; st.flags = st.flags || {}; return rpgGo(st); }
    if (r === "next") return rpgNext();
    if (r === "nextch") { st.ch++; st.i = 0; return rpgGo(st); }
    if (r === "opt") { const o = n.opts[Number(b.dataset.k)]; if (o.flag) st.flags[o.flag] = 1; st.i = rpgNodes(st).findIndex(x => x.label === o.go); sfx("ok"); return rpgGo(st); }
    if (r === "ans" && rpgB && rpgB.res == null) {
      const k = Number(b.dataset.k), q = rpgB.qs[rpgB.q[0]]; rpgB.pick = k;
      if (k === q.a) { rpgB.res = "ok"; rpgB.hp--; sfx("ok"); } else { rpgB.res = "ng"; rpgB.php--; sfx("ng"); }
      rpgJa = false; return renderRPG();
    }
    if (r === "bnext" && rpgB) { const q = rpgB.q.shift(); if (rpgB.res === "ng") rpgB.q.push(q); rpgB.res = null; rpgB.pick = null; return renderRPG(); }
    if (r === "retry") { rpgB = null; return renderRPG(); }
    if (r === "win") { st.won[st.ch + ":" + st.i] = 1; st.i++; sfx("coin"); return rpgGo(st); }
  });
  box.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.r === "next") { e.preventDefault(); rpgNext(); } });
}

/* ===== 画面の切り替え・毎秒の更新・起動 ===== */
const VIEWS = ["home", "timer", "learn", "yokai", "record"];
let currentView = "home";
function go(v) {
  if (!VIEWS.includes(v)) v = "home";
  if (location.hash.slice(1) !== v) { try { history.replaceState(null, "", "#" + v); } catch (e) { location.hash = v; } }
  const leaving = currentView; currentView = v;
  for (const x of VIEWS) $("v-" + x).hidden = x !== v;
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.v === v ? "page" : "false"));
  if (v === "home") buddyKey = "";
  if (leaving !== v) window.scrollTo(0, 0);
  render();
}
function renderWallet() {
  const e = econ(), L = levelOf(e.totalMin);
  $("wKoban").textContent = e.koban; $("wTicket").textContent = e.ticket; $("wLv").textContent = "Lv." + L.lv;
}
function render() {
  renderWallet();
  if (currentView === "home") renderHome();
  if (currentView === "timer") renderTimer();
  if (currentView === "learn") renderLearn();
  if (currentView === "yokai") renderYokai();
  if (currentView === "record") renderRecord();
}
let rq = 0;
function schedule() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); migrate(); checkUnlocks(); }); }
onChange(schedule);

/* 古い設定を新しい計画に合わせる（1回だけ。印をつけて二度とやらない） */
let migrating = false;
function migrate() {
  if (!backend || !allLoaded() || migrating) return;
  const s = S.settings, fix = {};
  if (!s.m1129) { fix.m1129 = 1; if (!/2026-11-29/.test(s.exams || "")) fix.exams = "2026-11-29 東洋 年内入試（要項で確認）\n" + (s.exams || ""); }
  if (!s.m_refresh2h) { fix.m_refresh2h = 1; const g = sums(parseSchedule(s.refresh)).game; if (g !== 120) fix.refresh = DEFAULTS.refresh; }
  const g = S.game;
  // 名簿を総入れ替えしたら、仲間・相棒・節目の受け取りをまっさらにする（小判・着せ替えはそのまま）
  const reset = g.roster !== ROSTER_VER;
  const sid = starterId(), needStarter = !reset && sid && !YK[g.partner] && !Object.keys(g.owned || {}).some(k => YK[k]);
  if (!Object.keys(fix).length && !reset && !needStarter) return;
  migrating = true;
  const ps = [];
  if (Object.keys(fix).length) ps.push(backend.save("settings", { ...s, ...fix }));
  if (reset || needStarter) ps.push(patchDoc("game", v => {
    if (reset) { v.owned = {}; v.partner = null; v.claims = []; v.freeRolls = 0; v.roster = ROSTER_VER; }
    if (sid) { v.owned = v.owned || {}; v.owned[sid] = { at: Date.now(), exp: 0, from: "start" }; v.partner = sid; }
  }));
  Promise.all(ps).finally(() => { migrating = false; });
}

let lastDay = dayKey();
function tick() {
  timerTick(); ticketTick();
  if (dayKey() !== lastDay) { lastDay = dayKey(); render(); return; }
  if (currentView === "home") { renderCountdown(); renderActiveTicket("homeTicket"); if (S.timer.running) { renderTasks(); renderWallet(); } }
  if (currentView === "timer") { renderTimer(); renderWallet(); }
  if (currentView === "yokai" && yokaiTab === "tix") renderActiveTicket("tixActive");
}

function bindMain() {
  $("tabs").onclick = e => { const b = e.target.closest("button[data-v]"); if (b) { go(b.dataset.v); sfx("tap"); } };
  document.addEventListener("click", e => { const b = e.target.closest("[data-goto]"); if (b) go(b.dataset.goto); });
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  $("homeMode").onclick = () => { if (!ready()) return; const k = dayKey(), m = modeOf(k) === "refresh" ? "normal" : "refresh"; patchDay(k, d => { d.mode = m; }); toast(m === "refresh" ? "今日はリフレッシュ日。ゲームは2時間まで。" : "今日は通常日。"); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  bindHome(); bindTimer(); bindLearn(); bindYokai(); bindRecord(); bindFit(); bindRPG();
}

async function boot() {
  cacheLoad();
  bindMain();
  go(location.hash.slice(1) || "home");
  setInterval(tick, 1000);
  let db = null;
  try { db = window.claude && window.claude.use ? await window.claude.use("db") : null; } catch (e) { db = null; }
  backend = makeBackend(db);
  setSync(backend.kind);
  schedule();
}
boot();
