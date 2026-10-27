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
  goalHours: 1612, startDate: "2026-10-03", deadline: "2027-02-03",
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
  game: { owned: {}, partner: "tomori", partnerFrom: null, outfits: { owned: [], equipped: {} }, claims: [], spend: [], gacha: 0 },
  tickets: { active: null, history: [] }, scores: [], loaded: {}
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
  return { id: 4, name: "一般入試へ　積み上げ", from: addDays(TOYO, 1), to: "2027-02-03", tip: "単語Part3・長文・国語・政経を毎日。週1で過去問。" };
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
  T.push({ id: "seikei", name: "政経 一問一答 即答50問", unit: "問", goal: 50, auto: "seikei", subj: "se" });
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
  const kobanEarn = pomos * 5 + fast + (S.cloze.correct || 0) + quizOk + clears * 20 + gramPass * 30 + bests * 40;
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
function cacheSave() { try { localStorage.setItem(CACHE, JSON.stringify({ days: S.days, settings: S.settings, quotes: S.quotes, words: S.words, kobun: S.kobun, seikei: S.seikei, cloze: S.cloze, grammar: S.grammar, game: S.game, tickets: S.tickets, scores: S.scores, timer: S.timer })); } catch (e) {} }
function cacheLoad() { try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); if (c) for (const k in c) if (c[k] != null) S[k] = k === "settings" ? { ...DEFAULTS, ...c[k] } : c[k]; } catch (e) {} }
function makeBackend(db) {
  const chains = {};
  const write = (path, fn) => (chains[path] = (chains[path] || Promise.resolve()).then(fn).catch(e => { console.warn(e); toast("保存できなかった。通信を確認して、もう一度やって。"); setSync("err"); }));
  const docs = { timer: "state/timer", settings: "settings/main", words: "learn/words", kobun: "learn/kobun", seikei: "learn/seikei", cloze: "learn/cloze", grammar: "learn/grammar", game: "game/yokai", tickets: "game/tickets" };
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
const NEED = ["days", "timer", "settings", "words", "kobun", "seikei", "cloze", "grammar", "game", "tickets"];
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
