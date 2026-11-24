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
  if (k <= TOYO) { const c = CRAM[k] || CRAM["2026-11-28"]; return { id: 3, name: "最終週　全対策（詰め込み）", from: "2026-11-23", to: TOYO, tip: "今日：" + c.theme + "　" + c.tip, cram: c }; }
  return { id: 4, name: "一般入試へ　積み上げ", from: addDays(TOYO, 1), to: "2027-02-15", tip: "単語Part3・長文・国語・政経を毎日。週1で過去問。" };
}
/* 最終週（11/23〜11/29）：まだ何もしていない前提で、出るところだけを1日ずつ詰め込む */
const CRAM = {
  "2026-11-23": { theme: "過去問で弱点を知る", tip: "最初に英語の過去問を時間を計って解き、どこで落としたかを見る。文法は時制〜受動態。", tasks: [
    ["past", "英語 過去問（時間を計る）＋答え合わせ", "回", 1, "en"], ["words", "ターゲット 即答100語", "語", 100, "en", "words"],
    ["gq", "文法：時制・完了・助動詞・仮定法・受動態", "問", 40, "en"], ["jodo", "古文 助動詞の意味を表で確認", "回", 1, "ja"],
    ["kanji", "漢字 20問", "問", 20, "ja"], ["kobun", "古文単語 即答50語", "語", 50, "ja", "kobun"]] },
  "2026-11-24": { theme: "文法の出るところ総ざらい①", tip: "不定詞・動名詞・分詞・分詞構文・関係詞・比較。英語の点はここで一番伸びる。", tasks: [
    ["gq", "文法：準動詞・関係詞・比較", "問", 60, "en"], ["words", "ターゲット 即答100語", "語", 100, "en", "words"],
    ["reading", "英語長文（時間を計る）", "題", 1, "en"], ["kanji", "漢字 20問", "問", 20, "ja"], ["kobun", "古文単語 即答50語", "語", 50, "ja", "kobun"]] },
  "2026-11-25": { theme: "英語 過去問2回目", tip: "別の日程の過去問を解く。前回の間違いと同じ型が出ていないか見る。文法は否定・倒置・接続詞・前置詞など残り。", tasks: [
    ["past", "英語 過去問2回目（時間を計る）＋答え合わせ", "回", 1, "en"], ["words", "ターゲット 即答100語", "語", 100, "en", "words"],
    ["gq", "文法：否定・倒置・接続詞・前置詞・品詞", "問", 40, "en"], ["kanji", "漢字 20問", "問", 20, "ja"], ["kobun", "古文単語 即答50語", "語", 50, "ja", "kobun"]] },
  "2026-11-26": { theme: "国語を時間内に", tip: "前回は5分オーバー。漢字・知識→古文→現代文の順で、迷ったら印をつけて飛ばす。助動詞は「で」「ぬ」「なり」の見分け。", tasks: [
    ["pastja", "国語 過去問（時間内に解き切る）", "回", 1, "ja"], ["jodo", "古文 助動詞の見分け（で・ぬ・なり）", "回", 1, "ja"],
    ["words", "ターゲット 即答100語", "語", 100, "en", "words"], ["fix", "文法 間違い直し", "問", 30, "en"], ["reading", "英語長文（時間を計る）", "題", 1, "en"]] },
  "2026-11-27": { theme: "本番リハーサル", tip: "英語→国語を、本番と同じ時間・同じ順番で通して解く。休憩もそろえる。", tasks: [
    ["past", "英語 本番と同じ時間で通し", "回", 1, "en"], ["pastja", "国語 本番と同じ時間で通し", "回", 1, "ja"],
    ["fix", "間違えた問題の直し", "問", 30, "en"], ["words", "ターゲット 即答100語", "語", 100, "en", "words"]] },
  "2026-11-28": { theme: "間違いだけ見る・早く寝る", tip: "新しいことはやらない。今週間違えた単語・文法・漢字・助動詞だけ。持ち物をそろえて、日付が変わる前に寝る。", tasks: [
    ["fix", "今週の間違いだけ見直す", "問", 30, "en"], ["words", "ターゲット 即答50語（間違えた語）", "語", 50, "en", "words"],
    ["kobun", "古文単語 即答30語", "語", 30, "ja", "kobun"], ["bag", "持ち物（受験票・時計・鉛筆・消しゴム）をそろえる", "回", 1, "ja"]] },
  "2026-11-29": { theme: "本番", tip: "朝は単語を軽く見るだけ。わからない問題は飛ばして、最後に戻る。", tasks: [
    ["words", "朝の単語 即答30語", "語", 30, "en", "words"], ["exam", "東洋 年内入試を受ける", "回", 1, "en"]] }
};
function baseTasks(k) {
  const p = phaseOf(k);
  if (p.id === 3) return p.cram.tasks.map(([id, name, unit, goal, subj, auto]) => ({ id, name, unit, goal, subj, ...(auto ? { auto } : {}) }));
  const wp = Number(S.settings.wordsPerDay) || 50, past = [1, 4, 6].includes(dow(k));
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
  const kobanEarn = fitKoban() + rpgKoban() + missionKoban() + pomos * 5 + fast + (S.cloze.correct || 0) + quizOk + clears * 20 + gramPass * 30 + bests * 40;
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
  $("cdName").textContent = n.label.replace(/（.*?）/g, ""); $("cdD").textContent = D; $("cdHms").textContent = pad(H) + ":" + pad(M) + ":" + pad(Math.floor(ms / 1000));
  const avg = (6 * targetFor("normal") + targetFor("refresh")) / 7;
  $("cdSub").textContent = labelDay(n.key) + " " + n.at.getHours() + ":" + pad(n.at.getMinutes()) + " 開始。今の時間割なら、それまでに勉強できるのは約" + Math.round(avg * (n.at - Date.now()) / 864e5 / 60) + "時間。";
  const others = ex.slice(1, 3).map(e => `<span><b>D-${Math.ceil((e.at - Date.now()) / 864e5)}</b>${esc(e.label.replace(/（.*?）/g, ""))}</span>`).join("");
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
  $("taskSum").textContent = "今日のノルマ一覧" + (ac ? "　全クリア！" : "");
  const tm = minOf(k), tg = targetFor(modeOf(k));
  $("homeTime").textContent = hrs(tm); $("homeTarget").textContent = "/ " + trimH(tg) + "時間"; $("homeClear").textContent = list.filter(t => t.count >= t.goal).length + "/" + list.length; $("homeTimeBar").style.width = clamp(100 * tm / tg, 0, 100) + "%"; $("homeTimeBar").className = tm >= tg ? "ok" : "";
  $("homeStreak").textContent = streakNow(); $("homeMode").textContent = modeOf(k) === "refresh" ? "リフレッシュ日" : "通常日";
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
  words: "見た瞬間に意味が浮かぶまで。数は自動で数える。",
  lecture: "授業を1講見る。",
  gq: "問題集か、勉強タブの「文法」で。",
  reading: "時間を計って1題。",
  past: "本番と同じ時間で解いて、答え合わせまで。",
  kobun: "見た瞬間に意味が浮かぶまで。",
  seikei: "一問一答。",
  pastja: "漢字・知識 → 古文 → 現代文の順。迷ったら飛ばす。",
  jodo: "意味と接続、「で」「ぬ」「なり」の見分け。",
  kanji: "書けなかった字は3回書く。",
  fix: "今週間違えた問題だけ。",
  bag: "受験票・時計・鉛筆・消しゴム・お金。",
  exam: "いってらっしゃい。"
};
function nextTask() { return tasksOf(dayKey()).find(t => t.count < t.goal) || null; }
function renderNext() {
  const k = dayKey(), list = tasksOf(k), t = nextTask(), done = list.filter(x => x.count >= x.goal).length;
  $("nextCount").textContent = done + " / " + list.length + " クリア";
  $("nextDots").innerHTML = list.map(x => `<i class="${x.count >= x.goal ? "ok" : t && x.id === t.id ? "now" : ""}"></i>`).join("");
  $("nextGuide").hidden = econ().totalMin > 0;
  const running = S.timer && S.timer.running, ctl = $("nextCtl");
  if (!t) {
    $("nextStep").textContent = "今日のノルマ";
    $("nextName").textContent = "全部クリア！"; $("nextProg").hidden = true; ctl.innerHTML = ""; ctl.dataset.v = ""; $("nextBtn").className = "big-btn";
    $("nextHow").textContent = "あとは時間を積むだけ。目標 " + trimH(targetFor(modeOf(k))) + "時間。";
    $("nextBtn").textContent = running ? "タイマーを見る" : "タイマーを始める"; $("nextBtn").dataset.k = "timer"; $("nextBtn").dataset.s = "en"; return;
  }
  $("nextStep").textContent = "次はこれ";
  $("nextName").textContent = t.name;
  $("nextProg").hidden = t.goal <= 1;
  $("nextNum").textContent = t.count + " / " + t.goal + t.unit; $("nextBar").style.width = clamp(100 * t.count / t.goal, 0, 100) + "%";
  $("nextHow").textContent = HOW[t.id] || "";
  $("nextBtn").className = t.auto ? "big-btn" : "btn ghost timer-btn";
  if (t.auto) { $("nextBtn").textContent = { words: "英単語を始める", kobun: "古文単語を始める", seikei: "政経を始める" }[t.auto] || "始める"; $("nextBtn").dataset.k = "learn:" + t.auto; ctl.innerHTML = ""; ctl.dataset.v = ""; }
  else {
    $("nextBtn").textContent = running ? "タイマー中" : "タイマー"; $("nextBtn").dataset.k = "timer"; $("nextBtn").dataset.s = t.subj || "en";
    const h = (t.goal >= 10 ? `<button type="button" class="sm" data-nt="${t.id}" data-nd="10">＋10</button>` : "") +
      `<button type="button" class="done-btn" data-nt="${t.id}" data-nv="${t.goal}">終わった</button>`;
    if (ctl.dataset.v !== h) { ctl.innerHTML = h; ctl.dataset.v = h; }
  }
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
  $("nextCtl").addEventListener("click", e => {
    const b = e.target.closest("button[data-nt]"); if (!b || !ready()) return;
    const k = dayKey(), id = b.dataset.nt, before = allClear(k);
    patchDay(k, d => { d.tasks = d.tasks || {}; d.tasks[id] = b.dataset.nv ? Math.max(Number(b.dataset.nv), d.tasks[id] || 0) : (d.tasks[id] || 0) + Number(b.dataset.nd); }).then(() => {
      const t = tasksOf(k).find(x => x.id === id), nx = nextTask();
      if (!before && allClear(k)) { sfx("done"); confetti(); toast("今日のノルマ全クリア！小判＋20・券＋15"); pickLine(true); }
      else if (t && t.count >= t.goal) { sfx("done"); toast("クリア！ 次は「" + (nx ? nx.name : "") + "」"); }
      else sfx("tap");
    });
  });
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
    items: TW.map(w => ({ id: w[2], q: esc(w[0]), kana: w[5] || "", a: esc(lines(w[1])), ex: w[3] ? esc(w[3].replace(/\{\{c1::(.*?)\}\}/, "$1")) + "<br>" + esc(w[4] || "") : "" }))
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
  h += `<div class="no">No.${esc(w.id)}</div><div class="word${D.small ? " small" : D.mid ? " mid" : ""}">${w.q}</div>` + (w.kana ? `<div class="kana">${esc(w.kana)}</div>` : "");
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
  if (cz.picked != null) h += `<div class="mean" style="font-size:14px">${esc(q.w[0])}${q.w[5] ? "（" + esc(q.w[5]) + "）" : ""}：${esc(lines(q.w[1]))}</div><button class="big-btn ink" type="button" data-cz="next">次へ</button>`;
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
  for (const t of ["words", "cloze", "grammar", "other"]) $("lt-" + t).hidden = !(t === learnTab || (t === "words" && (learnTab === "kobun" || learnTab === "seikei")) || (t === "other" && learnTab === "seikei"));
  if (learnTab === "seikei") renderQuiz();
  if (learnTab === "words" || learnTab === "kobun" || learnTab === "seikei") {
    const dk = deckOfTab(), D = DECKS[dk], st = S[D.store], i = wSet[dk] ?? dayIdx(dk), set = setOf(dk, i), done = clearedToday(dk), n = set.filter(w => done.has(w.id)).length;
    const days = Math.ceil(D.items.length / D.per);
    $("wEyebrow").textContent = D.title + "　1日" + D.per + D.unit + "×" + days + "日";
    $("wRule").innerHTML = "<b>" + limitOf(dk) / 1000 + "秒</b>で浮かばなければもう一度。";
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
let passAll = false;
function renderPass() {
  const t = passTier(), h = econ().totalMin / 60, nextH = tierHours(t + 1), prevH = tierHours(t), un = unclaimed();
  $("passTier").textContent = t;
  $("passNext").textContent = "次の段まで " + Math.max(0, nextH - h).toFixed(1) + "時間（累計 " + h.toFixed(1) + "h）";
  $("passBar").style.width = clamp(100 * (h - prevH) / (nextH - prevH), 0, 100) + "%";
  $("passClaimAll").hidden = !un.length; $("passClaimAll").textContent = "まとめて受け取る（" + un.length + "）";
  const last = Math.max(PASS.length, t + 3), firstUn = un.length ? Math.min(...un) : t + 1;
  const from = passAll ? 1 : Math.max(1, Math.min(firstUn, t) - 1), to = passAll ? last : Math.min(last, t + 5);
  let html = "";
  for (let i = from; i <= to; i++) {
    const r = rewardOf(i), reached = i <= t, got = claimedTier(i), cur = i === t + 1;
    const st = got ? "got" : reached ? "ready" : cur ? "next" : "lock";
    html += `<li class="tier ${st}${r.k === "yokai" ? " big" : ""}" data-tier="${i}">
      <span class="node">${got ? "✓" : i}</span>
      <div class="rcard">${rewardIcon(r, r.k === "yokai")}<div><small>${tierHours(i)}時間</small><b>${esc(rewardLabel(r))}</b>${cur ? `<div class="bar-p"><i style="width:${clamp(100 * (h - prevH) / (nextH - prevH), 0, 100)}%"></i></div>` : ""}</div>
      ${st === "ready" ? `<button class="btn pri sm" type="button" data-claim="${i}">受け取る</button>` : st === "got" ? `<span class="note">受取済</span>` : ""}</div></li>`;
    if (cur) html += `<li class="here"><span>いまここ</span></li>`;
  }
  if (to < last || passAll) html += `<li class="here"><button class="btn ghost sm" type="button" data-passall="1">${passAll ? "近くだけ見る" : "全部見る（" + last + "段）"}</button></li>`;
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
  $("passTrack").addEventListener("click", e => { if (e.target.closest("[data-passall]")) { passAll = !passAll; return renderPass(); } const b = e.target.closest("[data-claim]"); if (b) claimTiers([Number(b.dataset.claim)]); });
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
    ["累計", hrs(e.totalMin) + "<small>h / " + goal + "h</small>"], ["必要ペース", (left / dl / 60).toFixed(1) + "<small>h/日</small>"],
    ["直近7日", hrs(av) + "<small>h/日</small>"], ["連続", streakNow() + "<small>日</small>"]
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
  $("fcNote").textContent = "このままだと約" + Math.round(proj / 60) + "時間。" + (proj >= goal ? "届く。" : "あと" + Math.round((goal - proj) / 60) + "時間足りない。");
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
  $("scoreList").innerHTML = list.length ? list.map(s => `<li><span>${esc(labelDay(s.date))} ${SKIND[s.kind] || ""}　${esc(s.name || "")}${s.best ? ' <span class="rar r3">自己ベスト</span>' : ""}</span><span class="row" style="flex-wrap:nowrap"><b class="num dot">${s.score}/${s.max}</b><button class="btn ghost sm" type="button" data-del="${s.id}">消す</button></span></li>`).join("") : '<li><span class="note">まだ記録なし</span></li>';
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
function renderBadges() { renderMissions(); if (!$("badges")) return; const b = badgeList(); $("badgeSum").textContent = b.filter(x => x[2]).length + " / " + b.length; $("badges").innerHTML = b.map(([n, d, g]) => `<div class="badge${g ? " got" : ""}"><b>${g ? "★ " : "☆ "}${n}</b><span>${d}</span></div>`).join(""); }
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
  $("fitHead").textContent = fitOk(k) ? "筋トレ完了" : rest ? "今日は筋トレを休む日" : sW >= FIT_WEEK ? "今週の筋トレは達成" : "今日の筋トレ";
  $("fitWeek").textContent = "筋トレ " + sW + "/" + FIT_WEEK + "・有酸素 " + cW + "/" + CARDIO_WEEK;
  $("fitPhase").innerHTML = "<b>" + esc(mo.name) + "</b><span class=\"note\">" + esc(mo.tip) + "</span>";
  const sets = f.sets || {};
  const html = FIT.map(x => {
    const n = sets[x.id] || 0, done = n >= x.sets;
    const dots = Array.from({ length: x.sets }, (_, i) => `<button type="button" class="setb${i < n ? " on" : ""}" data-f="${x.id}" data-i="${i}" aria-label="${x.name} ${i + 1}セット目">${i + 1}</button>`).join("");
    return `<li class="task${done ? " done" : ""}" data-s="fit"><span class="nm">${x.name}<small>${x.how}</small></span>
      <span class="ct num">${r[x.id]}<small>${x.unit}×${x.sets}</small></span><div class="ctl sets">${dots}</div></li>`;
  }).join("");
  const ul = $("fitList"); if (ul.dataset.v !== html) { ul.innerHTML = html; ul.dataset.v = html; }
  const hide = rest && !fitHas(k) && !fitShow;
  $("fitList").hidden = hide;
  $("fitNote").textContent = fitOk(k) ? "明日は休み。"
    : rest ? "今日は有酸素だけでいい。"
    : "あと" + st.toNext + "回で回数アップ";
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
  for (const d of Object.keys(S.days).sort()) { const f = fitOf(d); if (fitOk(d)) sess++; if (postureOk(d)) pday++; cmin += cardioMin(d); if (f.snack != null) { snackN++; if (f.snack) snackOk++; } if (f.weight) ws.push([d, f.weight, f.bf, f.bfSrc]); }
  const last = ws[ws.length - 1], first = ws[0];
  const diff = last && first && last !== first ? (last[1] - first[1]).toFixed(1) : null;
  $("fitRec").innerHTML = `<div class="fitgrid">${cells.join("")}</div>
    <dl class="stats" style="margin:0">
    <div><dt>筋トレ</dt><dd>${sess}<small>回</small></dd></div><div><dt>有酸素</dt><dd>${cmin}<small>分</small></dd></div><div><dt>体重</dt><dd>${last ? last[1] : "—"}<small>kg${diff != null ? "（" + (diff > 0 ? "+" : "") + diff + "）" : ""}</small></dd></div>
    ${bodyStats(ws)}</dl>`;
  renderBodyChart(ws);
  if (document.activeElement !== $("wtIn")) $("wtIn").value = fitOf(k).weight || "";
  if (document.activeElement !== $("bfIn")) $("bfIn").value = fitOf(k).bf || "";
  if (fitOf(k).bfSrc) $("bfSrc").value = fitOf(k).bfSrc;
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
    const raw = $("bfIn").value.trim(), bf = raw === "" ? null : Math.round(Number(raw) * 10) / 10;
    if (bf != null && !(bf >= 3 && bf <= 60)) return toast("体脂肪率は3〜60の%で入れて。");
    patchDay(dayKey(), d => { d.fit = d.fit || {}; d.fit.weight = w; if (bf != null) { d.fit.bf = bf; d.fit.bfSrc = $("bfSrc").value; } else { delete d.fit.bf; delete d.fit.bfSrc; } });
    toast(bf != null ? "体重と体脂肪率を記録した。" : "体重を記録した。");
  };
}

/* ---- 体脂肪率：脂肪量と除脂肪量（筋肉・骨・水分など）を計算して、流れを見る ---- */
function bodyStats(ws) {
  const b = ws.filter(x => x[2] != null); if (!b.length) return "";
  const last = b[b.length - 1], first = b[0], fat = w => w[1] * w[2] / 100, lean = w => w[1] - fat(w);
  const d = (a, c) => { const v = (a - c).toFixed(1); return v > 0 ? "+" + v : v; };
  const ch = b.length > 1 ? `（最初から 脂肪${d(fat(last), fat(first))}kg・除脂肪${d(lean(last), lean(first))}kg）` : "";
  return `<div><dt>体脂肪率（${last[3] === "inbody" ? "InBody" : "家庭用"}）</dt><dd>${last[2]}<small>%</small></dd></div>
    <div><dt>脂肪量／除脂肪量</dt><dd>${fat(last).toFixed(1)}<small>kg／</small>${lean(last).toFixed(1)}<small>kg</small></dd></div>
    ${ch ? `<div style="grid-column:1/-1"><dt>変化</dt><dd style="font-size:14px">${ch}</dd></div>` : ""}`;
}
function renderBodyChart(ws) {
  const el = $("bodyChart"); if (!el) return;
  const pts = ws.slice(-16); if (pts.length < 2) { el.innerHTML = ""; return; }
  const W = 320, H = 120, P = 22, n = pts.length, X = i => P + (W - 2 * P) * i / (n - 1);
  const line = (vals, lo, hi, color) => { const ok = vals.map((v, i) => v == null ? null : [X(i), H - P - (H - 2 * P) * (v - lo) / Math.max(0.1, hi - lo)]).filter(Boolean); return ok.length > 1 ? `<polyline points="${ok.map(p => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>` + ok.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${color}"/>`).join("") : ""; };
  const wv = pts.map(p => p[1]), bv = pts.map(p => p[2] == null ? null : p[2]), bb = bv.filter(v => v != null);
  const wlo = Math.min(...wv) - 0.5, whi = Math.max(...wv) + 0.5, blo = bb.length ? Math.min(...bb) - 1 : 0, bhi = bb.length ? Math.max(...bb) + 1 : 1;
  el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="体重と体脂肪率の変化">${line(wv, wlo, whi, "var(--lantern)")}${line(bv, blo, bhi, "var(--seal)")}
    <text x="${P}" y="12" font-size="10" fill="var(--muted)">${labelDay(pts[0][0])}</text><text x="${W - P}" y="12" font-size="10" fill="var(--muted)" text-anchor="end">${labelDay(pts[n - 1][0])}</text></svg>
    <div class="note"><span style="color:var(--lantern)">●</span> 体重　<span style="color:var(--seal)">●</span> 体脂肪率</div>`;
}

/* ===== 英語RPG『Aster Ⅰ』（オリジナル） =====
   全12章＋序章の長編。英文はターゲット1900（Part1〜2）の単語を中心に書く。
   画面では、文の中のターゲット単語を自動で見つけて下線を引き、「訳」で意味を出す（rpg.js）。

   節の書き方
   { bg, who, en, ja }                      せりふ・地の文（who が null なら地の文。bg で背景を切りかえ）
   { choice: {en, ja}, opts: [{ en, ja, go, flag }] }
   { battle: { name, ja, bg }, vocab: 2, qs: [{ en, ja, opts: [[英, 日]...], a, tip }] }
       vocab：その章で出てきたターゲット単語から、意味を答える問題を何問足すか
   { label } { go } { if: flag, go } { end: true }

   レン：赤髪・緑の目・アップバング（だいきの好み）。髪は妹が消えたあとに染めた（昔の写真では黒髪）。
   ミオは「赤が似合う」と言っていた → 再会の場面で回収する。

   全体の流れ（予定）
   序章 番号のない列車（駅）／1 忘れていく村（村・地下室）／2 ささやきの森の遺跡（遺跡）
   3 水晶の洞窟（洞窟）：鉱夫ガロと、彼が忘れた娘／4 王都の地下水路（地下水路）
   5 白い城（城）：忘却こそ救いだと説く王の布告／6 灯の回廊（城の広間・夜の広間）
   7 大図書館（図書館）：「忘却」が始まった本当の理由／8 港の倉庫と浜辺（港・浜辺）
   9 沈んだ書庫（海の底）／10 嵐の空（嵐）／11 炎の門（地下の門）
   12 忘却の女王（玉座の間）／終章 ふたたび夕暮れの駅で */

const RPG_CAST = {
  ren: { name: "Ren", ja: "レン", face: "ren" },
  lina: { name: "Lina", ja: "リナ", face: "lina" },
  conductor: { name: "Conductor", ja: "車掌", face: "conductor" },
  elder: { name: "Elder Bram", ja: "ブラム長老", face: "elder" },
  knight: { name: "The Hollow Knight", ja: "空ろの騎士" },
  child: { name: "Little Boy", ja: "小さな男の子" },
  baker: { name: "Baker", ja: "パン屋" },
  mio: { name: "Mio", ja: "ミオ", face: "mio" },
  voice: { name: "???", ja: "？？？" }
};

const RPG_CHAPTERS = [
/* ───────────────────────── 序章 ───────────────────────── */
{ id: "p0", title: "Prologue: The Train with No Number", ja: "序章　番号のない列車", nodes: [
  { bg: "station", who: null, en: "The sun was going down, and the platform was almost empty.", ja: "日が沈みかけていて、ホームにはほとんど人がいなかった。" },
  { bg: "cg_photo", who: null, en: "Ren sat on a bench, holding an old photograph. In it, he was smiling next to a girl whose face had completely disappeared.", ja: "レンは古い写真を手に、ベンチに座っていた。写真の中の彼は笑っていて、その隣には顔がすっかり消えてしまった少女がいた。" },
  { face: "sad", who: "ren", en: "\"Mio...\"", ja: "「ミオ……」" },
  { who: null, en: "In the photo, his hair was still black. A few months after she disappeared, he had dyed it bright red.", ja: "写真の中の彼の髪は、まだ黒かった。妹がいなくなって数か月後、彼は髪を鮮やかな赤に染めたのだ。" },
  { face: "sad", who: "ren", en: "\"You always said red would suit me, like the hero in your favorite game. Well, I finally did it... So come back and laugh at me.\"", ja: "「おまえ、ずっと言ってたよな。好きなゲームの主人公みたいに、赤が似合うって。……やっと染めたぞ。だから帰ってきて、笑えよ。」" },
  { who: null, en: "A year ago, his younger sister had vanished. What was worse, everyone else had forgotten that she had ever existed.", ja: "1年前、妹が姿を消した。さらに悪いことに、ほかのだれもが、彼女がこの世にいたことさえ忘れてしまった。" },
  { who: null, en: "Her room was now used for storage. Her name was no longer on the class list. Even his parents looked confused whenever he mentioned her.", ja: "彼女の部屋は今では物置になっている。クラス名簿にも名前はない。両親でさえ、彼が妹の話をするたびに戸惑った顔をした。" },
  { bg: "station", face: "sad", who: "ren", en: "\"Am I the only person in the world who still remembers you?\"", ja: "「おまえを覚えているのは、世界で俺だけなのか？」" },
  { who: null, en: "Just then, a bell rang. It was a sound that did not appear on any timetable.", ja: "ちょうどそのとき、ベルが鳴った。どの時刻表にも載っていない音だった。" },
  { bg: "cg_train", who: null, en: "A silver train with no number on its side slowly approached the station and stopped in front of him.", ja: "車体に番号のない銀色の列車が、ゆっくりと駅に近づき、彼の目の前で止まった。" },
  { who: "conductor", en: "\"If you still remember her, get on board. This train does not wait for those who hesitate.\"", ja: "「まだ彼女を覚えているなら、お乗りなさい。この列車は、ためらう者を待ちません。」" },
  { choice: { en: "What will Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Get on without saying a word.", ja: "何も言わずに乗る。", go: "board" },
    { en: "\"Wait. Where does this train go?\"", ja: "「待ってくれ。この列車はどこへ行くんだ？」", go: "ask" }
  ] },
  { label: "ask" },
  { who: "conductor", en: "\"To the place where forgotten things end up. Whether you can return depends entirely on you.\"", ja: "「忘れられたものが行き着く場所へ。戻ってこられるかどうかは、すべてあなたしだいです。」" },
  { label: "board" },
  { bg: "train", who: null, en: "Ren took a deep breath and stepped inside. The doors closed behind him without a sound.", ja: "レンは深く息を吸って、中へ足を踏み入れた。扉は音もなく閉まった。" },
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
  { face: "smile", who: "lina", en: "\"I'm Lina, an apprentice at the Great Library of Aster. And you... you're not from here, are you?\"", ja: "「わたしはリナ。アスター大図書館の見習いよ。それにあなた……ここの人じゃないでしょう？」" },
  { face: "surprised", who: "ren", en: "\"How did you know?\"", ja: "「どうしてわかった？」" },
  { face: "smile", who: "lina", en: "\"Your memory is shining. I can see it in my lantern. People here have lost that kind of light.\"", ja: "「あなたの記憶が光ってるの。わたしのランタンに映って見える。ここの人たちは、もうそういう光をなくしてしまったから。」" },
  { who: null, en: "Ren showed her the photograph and explained everything: his sister, the faceless picture, and the train with no number.", ja: "レンは写真を見せて、すべてを説明した。妹のこと、顔の消えた写真のこと、そして番号のない列車のこと。" },
  { who: "lina", en: "\"Then she might be in Aster. Everything the world forgets eventually comes here, whether it is an object, a place, or a person.\"", ja: "「それなら、彼女はアスターにいるかもしれない。世界が忘れたものは、物でも場所でも人でも、いずれはここにたどり着くの。」" },
  { face: "sad", who: "lina", en: "\"But Aster is in danger, too. A year ago, something we call the Fading began. Memories turn into gray dust and simply blow away.\"", ja: "「でも、アスターも危ないの。1年前、わたしたちが『色あせ』と呼んでいるものが始まった。記憶が灰色の粉になって、そのまま吹き飛んでしまうの。」" },
  { face: "surprised", who: "ren", en: "\"A year ago... That's exactly when Mio disappeared.\"", ja: "「1年前……ちょうどミオが消えたときだ。」" },
  { who: "lina", en: "\"Then perhaps the two are connected. Come with me. Elder Bram knows more about the Fading than anyone.\"", ja: "「なら、その二つはつながっているのかもしれない。いっしょに来て。ブラム長老なら、色あせについてだれよりもくわしいわ。」" },
  { bg: "cellar", who: null, en: "The elder's house had a cellar lit by a single torch. An old man was sitting in the corner, holding a wooden box tightly.", ja: "長老の家には、たいまつ一本で照らされた地下室があった。老人が隅に座って、木の箱をしっかりと抱えていた。" },
  { who: "elder", en: "\"Lina? Is that you? I put something precious in this box, but I can't recall what it was.\"", ja: "「リナか？わしはこの箱に大切なものを入れたのじゃが、それが何だったか思い出せんのだ。」" },
  { who: "lina", en: "\"Elder, please try. We need to know where the Fading started.\"", ja: "「長老、思い出してみて。色あせがどこで始まったのか、知る必要があるの。」" },
  { who: null, en: "Before the old man could answer, the torch flickered. The shadows on the wall began to move by themselves.", ja: "老人が答える前に、たいまつの火がゆらいだ。壁の影が、ひとりでに動き始めた。" },
  { face: "surprised", who: "lina", en: "\"A Hollow! It's a monster made from abandoned memories. Ren, stay behind me!\"", ja: "「ホロウよ！捨てられた記憶から生まれた化け物。レン、わたしのうしろに！」" },
  { who: "ren", en: "\"No way. I'm not going to stand behind anyone while you fight alone.\"", ja: "「冗談じゃない。きみがひとりで戦ってるのに、だれかのうしろに隠れてなんかいられるか。」" },
  { who: "lina", en: "\"Then listen. Hollows are weak against true words. Answer what they ask with the right meaning, and they will lose their shape.\"", ja: "「じゃあ聞いて。ホロウは本当の言葉に弱いの。問いかけに正しい意味で答えれば、形を保てなくなる。」" },
  { battle: { name: "Cellar Hollow", ja: "地下室のホロウ", foe: "hollow", drop: 1 }, vocab: 2, qs: [
    { en: "Why couldn't the baker tell Ren the price of the bread?", ja: "パン屋はなぜパンの値段を言えなかった？", opts: [["She did not want to sell it.", "売りたくなかったから。"], ["She had forgotten it.", "忘れてしまったから。"], ["The bread was free.", "パンは無料だったから。"], ["Ren had no money.", "レンがお金を持っていなかったから。"]], a: 1, tip: "\"I can't seem to remember.\" can't seem to ～＝どうしても～できないようだ。" },
    { en: "According to Lina, what happens to everything the world forgets?", ja: "リナによると、世界が忘れたものはどうなる？", opts: [["It disappears forever.", "永遠に消える。"], ["It eventually comes to Aster.", "いずれアスターにやって来る。"], ["It turns into a train.", "列車に変わる。"], ["It goes back to its owner.", "持ち主のもとに戻る。"]], a: 1, tip: "eventually＝最終的に、いずれは。" }
  ] },
  { who: null, en: "The shadow let out a long sigh and broke into gray dust. For a moment, the cellar was silent.", ja: "影は長いため息をつき、灰色の粉になって崩れた。しばらくのあいだ、地下室は静まり返っていた。" },
  { who: null, en: "Then the elder slowly opened the wooden box. Inside was a tiny pair of children's shoes.", ja: "やがて長老は、ゆっくりと木の箱を開けた。中には小さな子ども用の靴が入っていた。" },
  { who: "elder", en: "\"These belonged to my grandson... I remember now. He used to run to me every evening, laughing.\"", ja: "「これは孫の靴じゃ……今、思い出した。あの子は毎晩、笑いながらわしのところへ駆けてきたものじゃ。」" },
  { who: "elder", en: "\"I would rather feel this pain than lose him again. Thank you, young man.\"", ja: "「もう一度あの子を失うくらいなら、この痛みを感じているほうがいい。ありがとう、若いの。」" },
  { who: "elder", en: "\"The Fading started at the old shrine in the Whispering Forest. A knight guards it now, but he no longer remembers whom he serves.\"", ja: "「色あせは、ささやきの森の古いほこらで始まった。今は騎士がそこを守っておるが、自分がだれに仕えておるのか、もう覚えてはおらん。」" },
  { bg: "cg_fountain", who: null, en: "That night, Ren and Lina sat by the fountain in the empty square.", ja: "その夜、レンとリナは、だれもいない広場の噴水のそばに座っていた。" },
  { face: "sad", who: "lina", en: "\"Can I ask you something? Remembering your sister must hurt. Why don't you just let her go?\"", ja: "「ひとつ聞いてもいい？妹さんを覚えているのは、つらいはずよね。どうして手放してしまわないの？」" },
  { choice: { en: "How does Ren answer?", ja: "レンはどう答える？" }, opts: [
    { en: "\"Because if I forget her too, she will really be gone.\"", ja: "「俺まで忘れたら、あいつは本当にいなくなってしまうから。」", go: "c1a", flag: "promise" },
    { en: "\"I tried. But my heart refused to let her go.\"", ja: "「やってみたさ。でも、心がどうしても手放そうとしなかった。」", go: "c1b" }
  ] },
  { label: "c1a" },
  { face: "smile", who: "lina", en: "\"...Then I'll help you keep her. That's a promise.\"", ja: "「……なら、わたしが手伝う。彼女を失わないように。約束する。」" },
  { go: "c1end" },
  { label: "c1b" },
  { face: "smile", who: "lina", en: "\"Hearts are stubborn like that. I think yours is right.\"", ja: "「心って、そういうところが頑固なのよね。でも、あなたの心は正しいと思う。」" },
  { label: "c1end" },
  { bg: "village_night", who: null, en: "Lina's lantern flickered for a moment, as if it were tired. She quickly covered it with her sleeve.", ja: "リナのランタンが、疲れたように一瞬ゆらいだ。彼女はすぐに袖でそれを隠した。" },
  { end: true }
] },

/* ───────────────────────── 第2章 ───────────────────────── */
{ id: "c2", title: "Chapter 2: Ruins of the Whispering Forest", ja: "第2章　ささやきの森の遺跡", nodes: [
  { bg: "forest", who: null, en: "Deep in the forest stood the remains of an ancient shrine, covered with moss and climbing plants.", ja: "森の奥深くに、苔とつる草におおわれた古いほこらの跡が立っていた。" },
  { who: null, en: "As they walked, the leaves seemed to whisper words in a language Ren almost understood.", ja: "歩いていると、木の葉がささやいているように聞こえた。レンにはほとんどわかりそうな言葉で。" },
  { who: "lina", en: "\"The trees are repeating memories that people have abandoned. Try not to listen too closely, or you might get lost in them.\"", ja: "「木々は、人々が捨てた記憶をくり返しているの。あまり聞き入らないで。迷いこんでしまうかもしれないから。」" },
  { face: "sad", who: "voice", en: "\"Ren... Don't look for me... It's better this way...\"", ja: "「レン……わたしを探さないで……このほうがいいの……」" },
  { face: "surprised", who: "ren", en: "\"Mio? Mio! Was that you?\"", ja: "「ミオ？ミオ！今のはおまえか？」" },
  { face: "surprised", who: "lina", en: "\"Ren, wait! The forest imitates voices to confuse travelers!\"", ja: "「レン、待って！森は旅人をまどわすために声をまねるのよ！」" },
  { choice: { en: "What does Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Run toward the voice.", ja: "声のほうへ走る。", go: "run" },
    { en: "Stop and trust Lina.", ja: "立ち止まって、リナを信じる。", go: "trust", flag: "trust" }
  ] },
  { label: "run" },
  { who: null, en: "Ren ran between the trees until his breath ran out. There was no one there, only an old ribbon caught on a branch.", ja: "レンは息が切れるまで木々のあいだを走った。だれもいなかった。枝に古いリボンが引っかかっているだけだった。" },
  { who: null, en: "He recognized it at once. It was the blue ribbon he had given Mio on her tenth birthday.", ja: "彼にはすぐにわかった。ミオの10歳の誕生日に、彼が贈った青いリボンだった。", flag: "ribbon" },
  { face: "sad", who: "lina", en: "\"Ren! Don't ever run off like that again... But that ribbon proves she really came this way.\"", ja: "「レン！二度とあんなふうに走っていかないで……でも、そのリボンは、彼女が本当にこの道を通った証拠ね。」" },
  { go: "gate" },
  { label: "trust" },
  { who: null, en: "Ren clenched his fists and stayed where he was. Slowly, the voice faded into the wind.", ja: "レンはこぶしを握りしめ、その場にとどまった。声はゆっくりと風の中に消えていった。" },
  { face: "smile", who: "lina", en: "\"Thank you for trusting me. I know how much you wanted to follow it.\"", ja: "「信じてくれてありがとう。あの声を追いかけたかった気持ち、よくわかる。」" },
  { label: "gate" },
  { bg: "ruins", who: null, en: "At the center of the ruins was a dark archway. In front of it stood a knight in rusted armor, holding a broken sword.", ja: "遺跡の中心に、暗いアーチがあった。その前に、さびた鎧の騎士が折れた剣を持って立っていた。" },
  { who: "knight", en: "\"Stop. I was ordered to protect this place. No one may pass.\"", ja: "「止まれ。わたしはこの場所を守るよう命じられた。だれも通さぬ。」" },
  { who: "lina", en: "\"Who gave you that order, Sir Knight?\"", ja: "「騎士さま、その命令はだれから受けたのですか？」" },
  { who: "knight", en: "\"Who...? I... I do not know. I only know that I must not fail again.\"", ja: "「だれ……？わたしは……わからぬ。ただ、二度と失敗してはならぬ、それだけはわかる。」" },
  { who: "ren", en: "\"Again? Then you failed someone before. Who was it?\"", ja: "「二度と？じゃあ、前にだれかを守れなかったんだな。それはだれだ？」" },
  { who: null, en: "The knight's helmet shook violently. Gray dust poured out of the gaps in his armor.", ja: "騎士のかぶとが激しく揺れた。鎧のすき間から、灰色の粉があふれ出した。" },
  { who: "knight", en: "\"Do not ask me that! Leave, or I will make you forget your own name!\"", ja: "「それを聞くな！立ち去れ。さもなくば、おまえ自身の名前を忘れさせてやる！」" },
  { battle: { name: "The Hollow Knight", ja: "空ろの騎士", boss: true, foe: "hknight", drop: 13 }, vocab: 3, qs: [
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
  { face: "sad", who: "ren", en: "\"Why? Why would she run away from me?\"", ja: "「なぜだ？なぜ俺から逃げなきゃいけないんだ？」" },
  { who: "knight", en: "\"That, I cannot answer. But she went toward the Crystal Caves, and then to the capital. Please... protect her better than I did.\"", ja: "「それには答えられぬ。だが彼女は水晶の洞窟へ、そして王都へ向かった。どうか……わたしよりも、うまく彼女を守ってやってくれ。」" },
  { bg: "cg_knight", who: null, en: "The knight smiled for the first time, and his armor turned into soft light that rose slowly into the trees.", ja: "騎士は初めてほほえんだ。そして彼の鎧は、やわらかな光になって、ゆっくりと木々のあいだへ昇っていった。" },
  { who: null, en: "Where he had been kneeling, a small crystal was left on the ground. Inside it, a faint image of a girl was walking away.", ja: "彼がひざをついていた場所に、小さな水晶が残されていた。その中では、少女のかすかな姿が、遠ざかるように歩いていた。" },
  { face: "sad", who: "lina", en: "\"A Memory Shard. It holds a piece of someone's past. Ren... I think it's hers.\"", ja: "「記憶のかけらよ。だれかの過去のひとかけらが入ってる。レン……これ、彼女のものだと思う。」" },
  { if: "trust", go: "c2trust" },
  { go: "c2fin" },
  { label: "c2trust" },
  { face: "smile", who: "lina", en: "\"And Ren... back in the forest, you chose to trust me. I won't forget that.\"", ja: "「それとね、レン……森で、あなたはわたしを信じてくれた。そのこと、忘れないから。」" },
  { label: "c2fin" },
  { who: "ren", en: "\"She didn't vanish by accident. She left on purpose... and I'm going to find out why.\"", ja: "「あいつは偶然消えたんじゃない。自分の意志で去ったんだ……その理由を、俺は必ず突き止める。」" },
  { end: true }
] }
];

/* ===== モンスターとアイテム（絵はモケモさんの素材。minecraft/private/rpg_mon・rpg_item、公開しない） ===== */
const RPG_MON_NAMES = ["", "Drool Slime", "Shadow Bat", "Ash Wolf", "Skull Bull", "Chest Mimic", "Storm Wraith", "Iron Gargoyle", "Moss Imp", "Shell Goblin", "Spine Beetle",
  "Deep Kraken", "Gear Spider", "Frost Shark", "Void Jelly", "Jade Wyvern", "Crystal Fang", "Bubble Orb", "Ember Totem", "Gift Golem", "Frosted Wing",
  "Leaf Sprite", "Watcher Owl", "Vine Serpent", "Ruby Heart", "Fire Lizard", "Axe Boar", "Plume Griffin", "Stone Elephant", "Hat Mole", "Mint Ghost",
  "Rust Tank", "Cap Rabbit", "Thorn Hedgehog", "Wind Eel", "Cloud Toad", "Rock Owl", "Azure Drake", "Lava Toad", "Tide Jelly", "Magma Slime",
  "Root Witch", "Gator Frog", "Mushroom Sage", "Wave Spirit", "Bloom Turtle", "Stump Ent", "Petal Fairy", "Garden Ogre", "Violet Hydra", "Pig Brute",
  "Little Ghost", "Blue Raven", "Mud Dome", "Armor Crab", "Maw Plant", "Gulp Fish", "Moss Lizard", "Leaf Mantis", "Bandage Bunny", "Red Demon",
  "Phantom Weaver", "Thunder Moth", "Mushroom Mage", "Crow Knight", "Elder Treant", "Star Bear", "Gold Whale", "Glass Wolf", "Lantern Fish", "Clay Golem",
  "Cinder Cat", "Night Drake", "Drill Snail", "Bone Priestess", "Frost Wisp", "Shell Hermit", "Ember Worm", "Moss Caterpillar", "Neon Mantis", "Crimson Beast",
  "Pine Frog King", "Ice Serpent", "Rose Dryad", "Emerald Gargoyle", "Blade Lizard", "Moon Witch", "Flame Tail", "Blue Dragon", "Horn Beetle", "Vine Kraken",
  "Twin Toad", "Flame Bird", "Crystal Monolith", "Frost Golem", "Scale Beast", "Fox Kit", "Rock Slug", "Bell Camel", "Iron Knight", "Thunder Lion",
  "Glacier Titan", "Clockwork Mask", "Hammer Bear", "Scarecrow", "Puppet Doll", "War Drum", "Fluff Beast", "Signal Head", "Basket Cat", "Carrot Rabbit"];
const RPG_ITEMS = {
  1: { name: "Healing Herb", ja: "薬草", use: "戦いでハートを1つ回復できる" },
  13: { name: "Memory Shard", ja: "記憶のかけら", use: "だれかの過去が少しだけ見える" },
  25: { name: "White Feather", ja: "白い羽", use: "軽くて、ほんのり温かい" },
  41: { name: "Field Carrot", ja: "畑のにんじん", use: "甘い。村の子どもの好物" },
  60: { name: "Old Branch", ja: "古い枝", use: "ささやきの森の枝。かすかに声がする" },
  73: { name: "Beast Skull", ja: "獣の頭骨", use: "強い魔物を倒したあかし" }
};

/* ===== 『Aster Ⅰ』第3章〜第12章と終章（オリジナル） =====
   章の中は { label: "cN_xxx" } で場面に区切ってある（game_data.js の GSCENES が切り出して流す）。
   ミオが消えた理由：親友のハルを事故で亡くし、「自分のせいだ」と思いつめた。だれも自分のことで悲しまないように、
   世界から自分を消してほしいと願った。その願いがアスターに届き、彼女は「忘却の女王」になった。彼女の悲しみが「色あせ」を広げている。
   リナの秘密：リナ自身も、ずっと昔に元の世界から忘れられた人。ランタンは自分の記憶を燃やして光っている。最後に、その光で皆の記憶を取り戻す。 */
Object.assign(RPG_CAST, {
  garo: { name: "Garo", ja: "ガロ", face: "garo" },
  ella: { name: "Ella", ja: "エラ", face: "ella" },
  king: { name: "King Aldric", ja: "アルドリック王", face: "king" },
  captain: { name: "Captain Varos", ja: "ヴァロス隊長" },
  herald: { name: "The Gray Herald", ja: "灰色の使者" },
  sailor: { name: "Old Sailor", ja: "老水夫" },
  queen: { name: "Queen of Oblivion", ja: "忘却の女王", face: "queen" }
});

RPG_CHAPTERS.push(
/* ───────────────────────── 第3章 ───────────────────────── */
{ id: "c3", title: "Chapter 3: The Crystal Caves", ja: "第3章　水晶の洞窟", nodes: [
  { label: "c3_enter" },
  { bg: "cave", who: null, en: "Behind the ruined gate, a tunnel led deep into the mountain. The walls were covered with crystals that glowed a pale blue.", ja: "崩れた門の奥には、山の深くへ続くトンネルがあった。壁は青白く光る水晶でおおわれていた。" },
  { who: "lina", face: "surprised", en: "\"These are memory crystals. When people forget something, the memory sinks into the earth and slowly turns to stone.\"", ja: "「これは記憶の水晶よ。人が何かを忘れると、その記憶は地面にしみこんで、ゆっくり石になるの。」" },
  { who: "ren", en: "\"So this whole cave is made of things people have forgotten?\"", ja: "「じゃあ、この洞窟全部が、人が忘れたものでできてるのか？」" },
  { who: "lina", face: "sad", en: "\"Yes. Somewhere in here, there may even be a memory of your sister.\"", ja: "「そう。このどこかに、妹さんの記憶だってあるかもしれない。」" },
  { label: "c3_camp" },
  { who: null, en: "In a wide chamber, an old dwarf was swinging a pickaxe at the wall. Next to him lay a pile of crystals and a half-finished traveling coat.", ja: "広い空洞で、年老いたドワーフが壁にツルハシを振るっていた。そばには水晶の山と、作りかけの旅の上着が置いてあった。" },
  { who: "garo", en: "\"Visitors? Hmph. If you've come to steal crystals, you'll have to get past my axe first.\"", ja: "「客か？ふん。水晶を盗みに来たのなら、まずはわしの斧を越えてもらおうか。」" },
  { who: "lina", en: "\"We're not thieves. We're looking for a girl who passed through here a year ago.\"", ja: "「わたしたちは泥棒じゃありません。1年前にここを通った女の子を探しているんです。」" },
  { who: "garo", en: "\"A girl...? There was one. She cried in front of the deepest crystal for a whole night. I couldn't stand it, so I gave her my lamp.\"", ja: "「女の子……？いたな。いちばん奥の水晶の前で、ひと晩じゅう泣いておった。見ていられなくて、わしのランプを貸してやったんじゃ。」" },
  { who: "ren", face: "surprised", en: "\"That has to be Mio! Where did she go?\"", ja: "「それ、ミオにちがいない！どこへ行ったんだ？」" },
  { who: "garo", en: "\"Deeper. Toward the Heart Crystal, where the oldest memories sleep. But a guardian lives there now, and it attacks anyone who comes near.\"", ja: "「もっと奥じゃ。いちばん古い記憶が眠る『心臓の水晶』のほうへな。だが今はそこに番人がいて、近づく者をだれでも襲う。」" },
  { who: "ren", en: "\"Then I'll go anyway.\"", ja: "「それでも行く。」" },
  { who: "garo", en: "\"...You remind me of someone. I can't remember who. Bah. Fine, I'll come with you. Somebody has to keep you two alive.\"", ja: "「……おまえを見ていると、だれかを思い出す。だれだったかは思い出せんが。ちっ。いいだろう、ついていってやる。だれかがおまえたちを死なせんようにせねばな。」" },
  { who: null, en: "Garo picked up his axe and the unfinished coat. He folded the coat carefully, as if it were precious, and put it in his bag.", ja: "ガロは斧と、作りかけの上着を手に取った。上着を大切なもののようにていねいにたたんで、袋にしまった。", flag: "garo_joined" },
  { label: "c3_boss" },
  { who: null, en: "At the bottom of the cave stood a giant crystal shaped like a beating heart. In front of it, the ice began to move and rise.", ja: "洞窟の底には、脈打つ心臓のような形の巨大な水晶があった。その前で、氷が動き、立ち上がり始めた。" },
  { who: "garo", en: "\"The guardian! Stay sharp, both of you!\"", ja: "「番人だ！ふたりとも、気を抜くな！」" },
  { battle: { name: "Glacier Titan", ja: "氷河の巨人", mon: 101, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The titan cracked and collapsed. In the falling ice, Ren's school uniform had been torn to pieces.", ja: "巨人はひび割れ、崩れ落ちた。降りそそぐ氷の中で、レンの学生服はぼろぼろに裂けていた。" },
  { who: "garo", en: "\"Your clothes are ruined. Here... take this coat. I was making it for someone, but I can't remember who it was for.\"", ja: "「服がだめになったな。ほれ……この上着を着ろ。だれかのために作っていたんじゃが、それがだれだったか思い出せんのじゃ。」" },
  { who: null, en: "When Ren put on the coat, the Heart Crystal shone. Inside it, images floated: a small girl laughing on Garo's shoulders.", ja: "レンが上着をはおると、心臓の水晶が輝いた。その中に映像が浮かんだ。ガロの肩車で笑う、小さな女の子の姿だった。", flag: "ren_coat" },
  { who: "garo", en: "\"...Ella. My daughter, Ella. How could I have forgotten you?\"", ja: "「……エラ。わしの娘、エラじゃ。どうして、おまえを忘れておったんじゃ。」" },
  { who: "garo", en: "\"She left for the capital years ago to work at the Great Library. I promised I'd finish this coat before she came home.\"", ja: "「何年も前に、大図書館で働くために王都へ行ったんじゃ。あの子が帰ってくるまでに、この上着を仕上げると約束したのに。」" },
  { who: "lina", face: "sad", en: "\"Then let's go to the capital together. Your daughter and Ren's sister may both be there.\"", ja: "「なら、いっしょに王都へ行きましょう。娘さんも、レンの妹さんも、きっとそこにいるわ。」" },
  { who: null, en: "Lina smiled, but her lantern flickered again. This time, for a moment, it went completely dark.", ja: "リナはほほえんだ。でもランタンがまたゆらいだ。今度は一瞬、完全に消えてしまった。" },
  { end: true }
] },

/* ───────────────────────── 第4章 ───────────────────────── */
{ id: "c4", title: "Chapter 4: Under the Capital", ja: "第4章　王都の地下水路", nodes: [
  { label: "c4_enter" },
  { bg: "canal", who: null, en: "The gates of the capital were shut. Guards turned away everyone except people who came to give up their memories.", ja: "王都の門は閉ざされていた。衛兵たちは、記憶を差し出しに来た人以外は、だれも中へ入れなかった。" },
  { who: "garo", en: "\"There's an old waterway under the walls. Miners like me used it to carry crystals into the city.\"", ja: "「城壁の下に古い水路がある。わしら鉱夫が、水晶を街へ運ぶのに使っておった道じゃ。」" },
  { who: null, en: "The waterway was dark and cold. Water dripped from the ceiling, and the sound echoed endlessly.", ja: "水路は暗く、冷たかった。天井から水がしたたり、その音がいつまでも響いていた。" },
  { label: "c4_mid" },
  { who: "ren", en: "\"Lina, your lantern went out back in the cave. What's happening to it?\"", ja: "「リナ、洞窟でランタンが消えたよな。あれ、どうなってるんだ？」" },
  { who: "lina", face: "sad", en: "\"...It's fine. It just gets tired sometimes, like people do.\"", ja: "「……大丈夫。ときどき疲れるだけ。人と同じよ。」" },
  { choice: { en: "What does Ren say?", ja: "レンはどう言う？" }, opts: [
    { en: "\"You're lying. Tell me the truth.\"", ja: "「うそだな。本当のことを言ってくれ。」", go: "c4_truth", flag: "pressed" },
    { en: "\"Okay. But don't push yourself.\"", ja: "「わかった。でも、無理はするなよ。」", go: "c4_soft" }
  ] },
  { label: "c4_truth" },
  { who: "lina", face: "sad", en: "\"...The lantern burns my own memories to make light. Every time I use it, I lose a little of who I am.\"", ja: "「……このランタンは、わたし自身の記憶を燃やして光るの。使うたびに、わたしは自分を少しずつ失っていく。」" },
  { who: "ren", face: "surprised", en: "\"Then stop using it! I don't want you to disappear for my sake!\"", ja: "「じゃあ使うのをやめろ！俺のために、きみが消えるなんて嫌だ！」" },
  { who: "lina", face: "smile", en: "\"I chose this myself, Ren. Please let me keep my promise.\"", ja: "「これは自分で選んだことなの、レン。お願い、約束を守らせて。」" },
  { go: "c4_on" },
  { label: "c4_soft" },
  { who: "lina", face: "smile", en: "\"Thank you. I'll tell you everything someday. Just not yet.\"", ja: "「ありがとう。いつか全部話すね。でも、今はまだ。」" },
  { label: "c4_on" },
  { label: "c4_boss" },
  { who: null, en: "Near the exit, the water began to swirl. Long arms rose from the dark water and blocked the way.", ja: "出口の近くで、水が渦を巻き始めた。暗い水の中から長い腕が伸びて、行く手をふさいだ。" },
  { who: "garo", en: "\"The beast of the waterway! It swallows anything that falls into the canal!\"", ja: "「水路の怪物じゃ！水路に落ちたものは、なんでも飲みこんでしまう！」" },
  { battle: { name: "Canal Kraken", ja: "水路のクラーケン", mon: 11, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The kraken sank back into the water. A ladder led up to a grate, and through it they could see the white towers of the capital.", ja: "クラーケンは水の中へ沈んでいった。はしごが格子へと続いていて、そのすき間から王都の白い塔が見えた。" },
  { end: true }
] },

/* ───────────────────────── 第5章 ───────────────────────── */
{ id: "c5", title: "Chapter 5: The White Castle", ja: "第5章　白い城", nodes: [
  { label: "c5_enter" },
  { bg: "castle", who: null, en: "The capital was beautiful and silent. People walked slowly, smiling, with empty eyes.", ja: "王都は美しく、静まり返っていた。人々はゆっくりと歩き、ほほえんでいたが、その目はうつろだった。" },
  { who: "ren", en: "\"Why does everyone look so happy?\"", ja: "「なんでみんな、あんなに幸せそうなんだ？」" },
  { who: "lina", face: "sad", en: "\"Because they gave away their painful memories. The King's decree says that forgetting is mercy.\"", ja: "「つらい記憶を差し出したからよ。王の布告では、忘れることこそ慈悲なんですって。」" },
  { who: "garo", en: "\"Mercy? A man who forgets his own daughter isn't saved. He's just empty.\"", ja: "「慈悲じゃと？自分の娘を忘れた男は、救われてなどおらん。ただ、からっぽなだけじゃ。」" },
  { who: "lina", en: "\"Let's get ready before we go to the castle. There are good shops in this city.\"", ja: "「城へ行く前に、準備をしましょう。この街にはいいお店があるわ。」" },
  { label: "c5_boss" },
  { bg: "hall", who: null, en: "In the great hall of the White Castle, King Aldric sat on his throne. His face was calm, like a lake with no wind.", ja: "白い城の大広間で、アルドリック王は玉座に座っていた。その顔は、風のない湖のように静かだった。" },
  { who: "king", en: "\"Travelers. I heard you are searching for a girl. Why carry such a heavy memory? Let it go, and you will finally be at peace.\"", ja: "「旅の者たちよ。少女を探しているそうだな。なぜそのように重い記憶を背負う？手放せば、ようやく安らぎが得られるのだ。」" },
  { who: "ren", en: "\"You're the one who ordered people to forget!\"", ja: "「人に忘れろと命じたのは、あんただろ！」" },
  { who: "king", en: "\"I lost my queen many years ago. For years, every morning hurt. Then a girl in white offered to take my grief away. I accepted.\"", ja: "「わたしは何年も前に王妃を亡くした。何年も、毎朝がつらかった。そこへ白い服の少女が、悲しみを持っていってあげると申し出た。わたしは受け入れた。」" },
  { who: "king", en: "\"Now I can't even remember her face. And I feel... nothing at all. Isn't that wonderful?\"", ja: "「今では王妃の顔さえ思い出せぬ。そして、何も……何も感じない。すばらしいことではないか？」" },
  { choice: { en: "How does Ren answer the King?", ja: "レンは王にどう答える？" }, opts: [
    { en: "\"That isn't peace. You just gave up loving her.\"", ja: "「それは安らぎじゃない。あんたは、彼女を愛するのをやめただけだ。」", go: "c5_fight", flag: "told_king" },
    { en: "\"Where is the girl in white?\"", ja: "「白い服の少女はどこにいる？」", go: "c5_fight" }
  ] },
  { label: "c5_fight" },
  { who: "king", en: "\"...Captain Varos. These travelers are disturbing the peace. Take their memories.\"", ja: "「……ヴァロス隊長。この旅人たちは安らぎを乱している。記憶を奪え。」" },
  { who: "captain", en: "\"Yes, Your Majesty. Forgive me, travelers. Orders are orders.\"", ja: "「はっ、陛下。許せ、旅人よ。命令は命令だ。」" },
  { battle: { name: "Captain Varos", ja: "ヴァロス隊長", mon: 64, boss: true }, vocab: 2, qs: [] },
  { who: "captain", en: "\"...Strange. When your sword hit my armor, I remembered my mother's voice. I had forgotten it.\"", ja: "「……ふしぎだ。おまえの剣がわたしの鎧に当たったとき、母の声を思い出した。忘れていたのに。」" },
  { if: "told_king", go: "c5_king" },
  { who: "king", en: "\"Enough. Leave my castle. ...Go, before I change my mind.\"", ja: "「もうよい。城から去れ。……行け。わたしの気が変わらぬうちに。」" },
  { go: "c5_out" },
  { label: "c5_king" },
  { who: "king", en: "\"\"You just gave up loving her\"... Those words hurt. Why do they hurt, if I feel nothing?\"", ja: "「『彼女を愛するのをやめただけだ』……その言葉が痛む。何も感じぬはずなのに、なぜ痛むのだ。」" },
  { label: "c5_out" },
  { who: "lina", en: "\"The girl in white went to the Hall of Lanterns, deep inside the castle. I'm sure of it.\"", ja: "「白い服の少女は、城の奥の『灯の回廊』へ行ったはずよ。まちがいない。」" },
  { end: true }
] },

/* ───────────────────────── 第6章 ───────────────────────── */
{ id: "c6", title: "Chapter 6: The Hall of Lanterns", ja: "第6章　灯の回廊", nodes: [
  { label: "c6_enter" },
  { bg: "night_hall", who: null, en: "The Hall of Lanterns was a long corridor lit by thousands of tiny flames. Each flame was a memory someone had given up.", ja: "灯の回廊は、何千もの小さな炎に照らされた長い廊下だった。炎のひとつひとつが、だれかが手放した記憶だった。" },
  { who: "garo", en: "\"So many... Is Ella's memory of me burning here too?\"", ja: "「こんなに……。エラがわしを覚えていた記憶も、ここで燃えておるのか。」" },
  { label: "c6_mid" },
  { who: null, en: "At the end of the corridor, a pale figure appeared. It was a girl with a blue ribbon, but she was transparent, like a reflection on glass.", ja: "廊下の奥に、白っぽい人影が現れた。青いリボンの少女だった。でもその姿は、ガラスに映った影のように透き通っていた。" },
  { who: "mio", face: "sad", en: "\"Ren. Please go home. You're the only one who still remembers me, and that's why you're the only one who still hurts.\"", ja: "「レン。お願い、帰って。わたしを覚えているのはもうお兄ちゃんだけ。だから、まだ苦しんでいるのもお兄ちゃんだけなの。」" },
  { who: "ren", face: "surprised", en: "\"Mio! What are you saying? Come home with me!\"", ja: "「ミオ！何言ってるんだ？いっしょに帰るぞ！」" },
  { who: "mio", face: "sad", en: "\"I can't. I did something unforgivable. If everyone forgets me, nobody will ever have to be sad because of me again.\"", ja: "「無理だよ。わたし、許されないことをしたの。みんながわたしを忘れれば、もうだれも、わたしのせいで悲しまなくてすむ。」" },
  { who: null, en: "The image of Mio faded. In her place, a figure in a gray cloak rose from the shadows.", ja: "ミオの姿は消えた。その代わりに、影の中から灰色のマントの人影が立ち上がった。" },
  { label: "c6_boss" },
  { who: "herald", en: "\"The Queen has spoken. Turn back, brother of the Queen, or I will burn your memories with the rest.\"", ja: "「女王はおっしゃった。引き返せ、女王の兄よ。さもなくば、おまえの記憶もほかと共に燃やしてやろう。」" },
  { who: "ren", en: "\"Queen? ...Mio is the Queen?\"", ja: "「女王？……ミオが、女王だっていうのか？」" },
  { battle: { name: "The Gray Herald", ja: "灰色の使者", mon: 86, boss: true }, vocab: 2, qs: [] },
  { who: "herald", en: "\"...Then go. Go to the Great Library. Read what she wished for. And then decide whether you still want to drag her home.\"", ja: "「……ならば行け。大図書館へ行き、あの方が何を願ったのかを読むがいい。そのうえで、まだ連れ戻したいのか決めるのだな。」" },
  { who: null, en: "The herald dissolved into ash. The thousands of flames in the hall trembled, and a few of them drifted out of the window like fireflies.", ja: "使者は灰になって消えた。回廊の何千もの炎がふるえ、そのいくつかが、ほたるのように窓の外へ流れていった。" },
  { end: true }
] },

/* ───────────────────────── 第7章 ───────────────────────── */
{ id: "c7", title: "Chapter 7: The Great Library", ja: "第7章　大図書館", nodes: [
  { label: "c7_enter" },
  { bg: "library", who: null, en: "The Great Library was filled with golden light. Shelves rose higher than any tower, and the air smelled of old paper.", ja: "大図書館は金色の光に満ちていた。本棚はどんな塔よりも高くそびえ、空気は古い紙のにおいがした。" },
  { who: "lina", face: "smile", en: "\"This is where I grew up. Every forgotten story in Aster is kept here, so that someone, someday, can read it again.\"", ja: "「ここでわたしは育ったの。アスターで忘れられた物語は全部ここにしまってある。いつか、だれかがまた読めるように。」" },
  { label: "c7_mid" },
  { who: null, en: "In the deepest room, Lina took down a thin book. Its cover read: \"The Wish of Mio Amane.\"", ja: "いちばん奥の部屋で、リナは薄い本を取り出した。表紙にはこう書かれていた。「天音ミオの願い」。" },
  { who: "lina", face: "sad", en: "\"A year ago, Mio's best friend, Haru, was in an accident. Mio had asked her to come out that day. She believed it was her fault.\"", ja: "「1年前、ミオの親友のハルが事故にあったの。その日、ハルを呼び出したのはミオだった。ミオは、自分のせいだと思いこんだ。」" },
  { who: "lina", face: "sad", en: "\"She wished: \"Let everyone forget me, so that no one will ever be hurt by me again.\" The wish was so strong that it reached Aster.\"", ja: "「彼女は願った。『みんながわたしを忘れますように。もう二度と、だれもわたしのせいで傷つかないように』。その願いがあまりにも強くて、アスターまで届いたの。」" },
  { who: "ren", face: "sad", en: "\"...She never told me. I was right next to her, and I didn't notice anything.\"", ja: "「……何も言わなかったんだ。俺はすぐそばにいたのに、何も気づかなかった。」" },
  { who: "garo", en: "\"Children hide the heaviest things best. That's not your sin, boy.\"", ja: "「子どもは、いちばん重いものほど上手に隠すんじゃ。おまえの罪じゃないぞ、坊主。」" },
  { who: "lina", en: "\"There's one more page. Her sadness became the Fading. As long as she wants to forget, all of Aster will keep forgetting too.\"", ja: "「もう1ページあるの。彼女の悲しみが『色あせ』になった。彼女が忘れたいと願い続けるかぎり、アスター全体も忘れ続けるの。」" },
  { label: "c7_boss" },
  { who: null, en: "Suddenly, the ink on every page began to run. Letters crawled off the paper and gathered into a huge shape with too many arms.", ja: "突然、すべてのページのインクが流れ始めた。文字が紙からはい出し、腕の多すぎる巨大な形に集まった。" },
  { who: "lina", face: "surprised", en: "\"The Ink Weaver! It's trying to erase her book!\"", ja: "「インクの織り手よ！あの子の本を消そうとしてる！」" },
  { battle: { name: "Ink Weaver", ja: "インクの織り手", mon: 61, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "When the monster fell, the ink returned to the pages. Among the books, a librarian's card slipped out and landed at Ren's feet.", ja: "怪物が倒れると、インクはページに戻った。本のあいだから一枚の図書館の名札がすべり落ちて、レンの足元に落ちた。" },
  { who: null, en: "It said: \"Apprentice: Lina. Arrived in Aster: 112 years ago.\"", ja: "そこにはこう書かれていた。「見習い：リナ。アスター到着：112年前」。" },
  { who: "ren", face: "surprised", en: "\"Lina... a hundred and twelve years?\"", ja: "「リナ……112年って？」" },
  { who: "lina", face: "sad", en: "\"I was forgotten by my world too, long ago. That's why I wanted to help you. I didn't want anyone else to end up like me.\"", ja: "「わたしも、ずっと昔に自分の世界から忘れられたの。だからあなたを助けたかった。わたしみたいになる人を、もう出したくなかったから。」" },
  { who: "lina", en: "\"The Queen's castle floats above the Storm Sea. To reach it, we need the First Page from the Sunken Archive. Let's go to the harbor.\"", ja: "「女王の城は、嵐の海の上に浮かんでいる。そこへ行くには、沈んだ書庫にある『最初のページ』が必要なの。港へ行きましょう。」" },
  { end: true }
] },

/* ───────────────────────── 第8章 ───────────────────────── */
{ id: "c8", title: "Chapter 8: The Harbor Town", ja: "第8章　港町", nodes: [
  { label: "c8_enter" },
  { bg: "harbor", who: null, en: "The harbor town smelled of salt and tar. Ships with gray sails rocked quietly in the evening light.", ja: "港町は潮とタールのにおいがした。灰色の帆の船が、夕方の光の中で静かにゆれていた。" },
  { who: "sailor", en: "\"The Sunken Archive? Nobody sails there anymore. A giant whale guards the beach, and the sea beyond it is full of monsters.\"", ja: "「沈んだ書庫だと？もうだれもあそこへは船を出さん。浜辺を巨大なクジラが守っていて、その先の海は魔物だらけだ。」" },
  { label: "c8_mid" },
  { who: null, en: "In front of the warehouse, a young woman was counting boxes. When she looked up, Garo dropped his axe.", ja: "倉庫の前で、若い女性が木箱を数えていた。彼女が顔を上げたとき、ガロは斧を取り落とした。" },
  { who: "garo", en: "\"Ella...!\"", ja: "「エラ……！」" },
  { who: "ella", en: "\"I'm sorry, sir. Do I know you?\"", ja: "「すみません、どちらさまでしょう？」" },
  { who: null, en: "Garo's hands shook. Then he took out the Memory Shard from the cave and placed it gently in her palm.", ja: "ガロの手はふるえていた。それから彼は洞窟の記憶のかけらを取り出し、そっと彼女の手のひらにのせた。" },
  { who: null, en: "Light filled the shard. A small girl laughing on her father's shoulders. A promise about a coat. A mountain full of blue crystals.", ja: "かけらが光で満ちた。父親の肩車で笑う小さな女の子。上着についての約束。青い水晶でいっぱいの山。" },
  { who: "ella", en: "\"...Papa? Papa, it's you! I forgot you... I forgot you, and you never forgot me!\"", ja: "「……父さん？父さんなのね！わたし、父さんを忘れてた……忘れてたのに、父さんはわたしを忘れなかったのね！」" },
  { who: "garo", en: "\"I did forget, Ella. But a stubborn boy reminded me. I'm sorry the coat went to him.\"", ja: "「わしも忘れておったよ、エラ。じゃが、頑固な坊主が思い出させてくれた。上着はそいつにやってしまったがな、すまん。」" },
  { who: "ren", face: "smile", en: "\"I'll give it back when this is over. Promise.\"", ja: "「全部終わったら返すよ。約束する。」" },
  { label: "c8_boss" },
  { bg: "beach", who: null, en: "On the beach, the waves rose like a wall, and a golden whale burst out of the sea.", ja: "浜辺で波が壁のように立ち上がり、金色のクジラが海から飛び出した。" },
  { who: "lina", en: "\"It's guarding the path to the Archive! We have to get past it!\"", ja: "「書庫への道を守ってる！ここを突破しなきゃ！」" },
  { battle: { name: "Golden Whale", ja: "黄金のクジラ", mon: 67, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The whale sank slowly, and the sea split open, revealing a stone stairway leading down beneath the waves.", ja: "クジラはゆっくりと沈み、海が左右に割れた。波の下へと続く石の階段が現れた。" },
  { end: true }
] },

/* ───────────────────────── 第9章 ───────────────────────── */
{ id: "c9", title: "Chapter 9: The Sunken Archive", ja: "第9章　沈んだ書庫", nodes: [
  { label: "c9_enter" },
  { bg: "sea", who: null, en: "Under the sea, the ruins of an ancient library stood in silence. Fish swam between the pillars like readers who had lost their way.", ja: "海の底で、古代の図書館の跡が静まり返っていた。魚たちが、道に迷った読者のように柱のあいだを泳いでいた。" },
  { who: "lina", en: "\"My lantern keeps the water away from us. Stay close to me.\"", ja: "「わたしのランタンが、水をわたしたちから遠ざけてる。そばを離れないで。」" },
  { label: "c9_mid" },
  { who: "ren", en: "\"Lina, you're using the lantern constantly. How much of yourself is left?\"", ja: "「リナ、ずっとランタンを使ってるだろ。きみ自身は、あとどれくらい残ってるんだ？」" },
  { who: "lina", face: "sad", en: "\"I've already forgotten my mother's name. And the town where I was born. But I still remember you, Ren. That's enough.\"", ja: "「お母さんの名前は、もう忘れちゃった。生まれた町も。でも、あなたのことはまだ覚えてる、レン。それで十分よ。」" },
  { choice: { en: "What does Ren do?", ja: "レンはどうする？" }, opts: [
    { en: "Take her hand and say, \"Then I'll remember you, for both of us.\"", ja: "彼女の手を取って言う。「なら、ふたり分、俺がきみを覚えてる。」", go: "c9_hand", flag: "held_hand" },
    { en: "Stay silent, unable to find the words.", ja: "言葉が見つからず、黙ってしまう。", go: "c9_quiet" }
  ] },
  { label: "c9_hand" },
  { who: "lina", face: "smile", en: "\"...That's the nicest promise anyone has ever made me.\"", ja: "「……それ、今までだれかにもらった中で、いちばんすてきな約束。」" },
  { go: "c9_go" },
  { label: "c9_quiet" },
  { who: "lina", face: "smile", en: "\"It's okay. You don't have to say anything. Just keep walking with me.\"", ja: "「いいの。何も言わなくていい。ただ、いっしょに歩いて。」" },
  { label: "c9_go" },
  { label: "c9_boss" },
  { who: null, en: "In the central hall, the First Page floated inside a bubble of light. Around it coiled a dragon made of deep blue water.", ja: "中央の広間で、『最初のページ』が光の泡の中に浮かんでいた。そのまわりに、深い青の水でできた竜がとぐろを巻いていた。" },
  { battle: { name: "Abyss Wyrm", ja: "深淵の竜", mon: 88, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "When the wyrm fell, the bubble burst. The First Page drifted down into Ren's hands. On it was a child's drawing: two stick figures holding hands.", ja: "竜が倒れると、泡がはじけた。『最初のページ』がひらひらとレンの手に落ちてきた。そこには子どもの絵が描かれていた。手をつないだ、ふたりの棒人間。" },
  { who: "ren", face: "sad", en: "\"I remember this. Mio drew it when she was six. \"Me and big brother.\" She said I'd always find her when we played hide-and-seek.\"", ja: "「覚えてる。ミオが6歳のときに描いた絵だ。『わたしとお兄ちゃん』。かくれんぼのとき、お兄ちゃんはいつもわたしを見つけてくれるって言ってた。」" },
  { who: "ren", en: "\"I promised her I always would. I'm not breaking that promise now.\"", ja: "「いつでも見つけるって、俺は約束したんだ。今その約束を破るつもりはない。」" },
  { end: true }
] },

/* ───────────────────────── 第10章 ───────────────────────── */
{ id: "c10", title: "Chapter 10: The Storm Sky", ja: "第10章　嵐の空", nodes: [
  { label: "c10_enter" },
  { bg: "storm", who: null, en: "The First Page glowed, and a staircase of light rose into the storm clouds. Lightning tore across the sky.", ja: "『最初のページ』が光り、光の階段が嵐の雲の中へと伸びていった。稲妻が空を引き裂いた。" },
  { who: "garo", en: "\"So the Queen lives above the clouds. Well, I've climbed worse mountains.\"", ja: "「女王は雲の上に住んでおるのか。まあ、もっとひどい山も登ってきたわい。」" },
  { label: "c10_mid" },
  { who: null, en: "Halfway up, the stairs narrowed into a single bridge of light. Behind them, a swarm of storm monsters was coming fast.", ja: "途中で、階段は一本の光の橋へと細くなった。うしろから、嵐の魔物の群れが迫ってきていた。" },
  { who: "garo", en: "\"Go on ahead, you two. I'll hold the bridge.\"", ja: "「ふたりとも、先に行け。わしが橋を守る。」" },
  { who: "ren", face: "surprised", en: "\"Garo, no! There are too many of them!\"", ja: "「ガロ、だめだ！数が多すぎる！」" },
  { who: "garo", en: "\"I promised Ella I'd come home, and I'm a man who keeps his promises now. Go! Find your sister!\"", ja: "「エラに帰ると約束したんじゃ。わしはもう、約束を守る男なんじゃよ。行け！妹を見つけてこい！」" },
  { who: null, en: "Garo's axe flashed in the lightning. Ren and Lina ran up the bridge without looking back.", ja: "稲妻の中でガロの斧がひらめいた。レンとリナは、振り返らずに橋を駆け上がった。" },
  { label: "c10_boss" },
  { who: null, en: "At the top of the storm, a lion made of thunder blocked the gate to the floating castle.", ja: "嵐のいただきで、雷でできた獅子が、浮かぶ城の門の前に立ちはだかった。" },
  { battle: { name: "Thunder Lion", ja: "雷獅子", mon: 100, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "As the lion vanished, Garo came limping up the bridge, covered in scratches, but grinning.", ja: "獅子が消えると、ガロが傷だらけで、足を引きずりながら、それでもにやりと笑って橋を上がってきた。" },
  { who: "garo", en: "\"Told you. I keep my promises.\"", ja: "「言ったじゃろ。わしは約束を守るんじゃ。」" },
  { end: true }
] },

/* ───────────────────────── 第11章 ───────────────────────── */
{ id: "c11", title: "Chapter 11: The Gate of Flame", ja: "第11章　炎の門", nodes: [
  { label: "c11_enter" },
  { bg: "gate", who: null, en: "Inside the floating castle, the halls burned with fire that gave no heat. It was the fire of memories being destroyed.", ja: "浮かぶ城の中では、熱のない炎が広間を燃やしていた。記憶が壊されていく炎だった。" },
  { who: "lina", face: "sad", en: "\"Every memory in Aster is burning here. If we don't hurry, there'll be nothing left to save.\"", ja: "「アスター中の記憶が、ここで燃えてる。急がないと、救えるものが何も残らなくなる。」" },
  { label: "c11_mid" },
  { who: null, en: "Someone was standing in the flames, pouring water from a silver jug again and again. It was King Aldric.", ja: "炎の中にだれかが立っていて、銀の水差しで何度も何度も水をかけていた。アルドリック王だった。" },
  { who: "king", en: "\"Your words would not leave me, boy. So I came to take back my queen's memory. I found her face in these flames.\"", ja: "「おまえの言葉が頭から離れなかったのだ、少年。だから王妃の記憶を取り戻しに来た。この炎の中に、あの人の顔を見つけたのだ。」" },
  { who: "king", en: "\"It hurts. It hurts terribly. But I would rather hurt than forget her. Go. I will keep this gate open for you.\"", ja: "「痛む。ひどく痛む。だが、彼女を忘れるよりは、痛むほうがいい。行け。この門は、わたしが開けておこう。」" },
  { label: "c11_boss" },
  { who: null, en: "Before the last door stood a beast of ash and embers, its eyes burning with the anger of a thousand forgotten things.", ja: "最後の扉の前に、灰と燃えさしでできた獣が立っていた。その目は、忘れられた千のものの怒りで燃えていた。" },
  { battle: { name: "Gatekeeper of Ash", ja: "灰の門番", mon: 80, boss: true }, vocab: 2, qs: [] },
  { who: null, en: "The gatekeeper crumbled into ash. Beyond the door, a cold white light was waiting.", ja: "門番は灰になって崩れた。扉の向こうで、冷たく白い光が待っていた。" },
  { end: true }
] },

/* ───────────────────────── 第12章 ───────────────────────── */
{ id: "c12", title: "Chapter 12: The Queen of Oblivion", ja: "第12章　忘却の女王", nodes: [
  { label: "c12_enter" },
  { bg: "throne", who: null, en: "The throne room was white and empty. Gray snow fell from the ceiling, and every flake was a memory losing its color.", ja: "玉座の間は白く、がらんとしていた。天井から灰色の雪が降っていて、そのひとひらひとひらが、色を失っていく記憶だった。" },
  { label: "c12_boss" },
  { who: null, en: "On the throne sat a girl in a white and gray dress. Only the ribbon in her hair was still blue.", ja: "玉座には、白と灰色のドレスの少女が座っていた。髪のリボンだけが、まだ青かった。" },
  { who: "queen", face: "sad", en: "\"You came all this way. Even though I asked you not to.\"", ja: "「こんなところまで来たんだね。来ないでって、頼んだのに。」" },
  { who: "ren", en: "\"I found you, Mio. Just like I promised. Hide-and-seek is over. Let's go home.\"", ja: "「見つけたぞ、ミオ。約束どおりだ。かくれんぼは終わりだ。帰ろう。」" },
  { who: "queen", face: "sad", en: "\"I can't go home! Haru is gone because of me! If I go back, everyone will look at me and remember!\"", ja: "「帰れないよ！ハルはわたしのせいでいなくなったの！帰ったら、みんながわたしを見て、思い出すんだよ！」" },
  { who: null, en: "The gray snow became a blizzard. The Queen rose, and the storm of forgetting rushed toward them.", ja: "灰色の雪が吹雪になった。女王が立ち上がり、忘却の嵐がふたりに襲いかかった。" },
  { battle: { name: "Queen of Oblivion", ja: "忘却の女王", foe: "queen", mon: 74, boss: true, final: true }, vocab: 3, qs: [] },
  { who: null, en: "The blizzard stopped. Mio fell to her knees, crying like the little girl in the drawing.", ja: "吹雪がやんだ。ミオはひざから崩れ落ち、あの絵の中の小さな女の子のように泣いていた。" },
  { who: "ren", face: "sad", en: "\"It wasn't your fault, Mio. And even if it were, I'd still want you here. Being remembered means being loved, even when it hurts.\"", ja: "「おまえのせいじゃない、ミオ。もしそうだったとしても、俺はおまえにいてほしい。覚えていてもらえるってことは、愛されてるってことなんだ。たとえ痛くても。」" },
  { who: "lina", face: "smile", en: "\"Ren. Mio. It's time for me to keep my promise.\"", ja: "「レン。ミオ。わたしが約束を守る番ね。」" },
  { who: null, en: "Lina raised her lantern. It burned brighter than it ever had, and golden light poured out across the whole of Aster.", ja: "リナがランタンを高く掲げた。それは今までにないほど明るく燃え、金色の光がアスター全体へと流れ出した。" },
  { who: null, en: "In the capital, the King wept for his queen. In the harbor, Ella hugged her father. Everywhere, people remembered the names of the ones they loved.", ja: "王都では、王が王妃を思って涙を流した。港では、エラが父を抱きしめた。あらゆる場所で、人々は愛する人の名前を思い出した。" },
  { who: "ren", face: "surprised", en: "\"Lina, stop! You'll disappear!\"", ja: "「リナ、やめろ！きみが消えてしまう！」" },
  { who: "lina", face: "smile", en: "\"I won't disappear, Ren. You said you'd remember me for both of us. As long as you do, I'll still be here.\"", ja: "「消えないよ、レン。ふたり分覚えていてくれるって、言ってくれたでしょう。あなたが覚えているかぎり、わたしはここにいる。」" },
  { who: null, en: "The light faded. Where Lina had been standing, there was only a small bookmark with a lantern drawn on it.", ja: "光が消えた。リナが立っていた場所には、ランタンの絵が描かれた小さなしおりが一枚、残っているだけだった。" },
  { who: "queen", face: "sad", en: "\"...Brother. Let's go home. ...And by the way, red really does suit you.\"", ja: "「……お兄ちゃん。帰ろう。……それと、赤、ほんとに似合ってるよ。」" },
  { end: true }
] },

/* ───────────────────────── 終章 ───────────────────────── */
{ id: "ep", title: "Epilogue: The Sunset Station", ja: "終章　ふたたび夕暮れの駅で", nodes: [
  { label: "ep_all" },
  { bg: "cg_train", who: null, en: "The sun was going down, and the platform was almost empty. Two people sat together on the bench.", ja: "日が沈みかけていて、ホームにはほとんど人がいなかった。ベンチに、ふたりが並んで座っていた。" },
  { who: "mio", face: "smile", en: "\"Mom cried for an hour when she saw me. Then she was angry for two hours. Then she made curry.\"", ja: "「お母さん、わたしを見て1時間泣いたよ。そのあと2時間怒られた。それからカレー作ってくれた。」" },
  { who: "ren", face: "smile", en: "\"That sounds about right.\"", ja: "「だろうな。」" },
  { who: "mio", face: "sad", en: "\"I'm going to visit Haru's family tomorrow. I'm scared. But I want to say her name out loud, instead of running away.\"", ja: "「明日、ハルの家に行ってくる。こわいけど。逃げるんじゃなくて、ちゃんとハルの名前を口に出して言いたいの。」" },
  { who: "ren", en: "\"I'll come with you.\"", ja: "「俺もいっしょに行く。」" },
  { who: null, en: "Ren took the bookmark out of his pocket. The little lantern on it seemed, just for a second, to flicker.", ja: "レンはポケットからしおりを取り出した。そこに描かれた小さなランタンが、ほんの一瞬、ゆらいだように見えた。" },
  { who: null, en: "Just then, a bell rang that was not on any timetable. A silver train passed by without stopping, and in one window, a girl with a book-shaped lantern smiled and waved.", ja: "ちょうどそのとき、どの時刻表にもないベルが鳴った。銀色の列車が止まらずに通り過ぎていき、その窓のひとつで、本の形のランタンを持った少女が、ほほえんで手を振っていた。" },
  { who: "ren", face: "smile", en: "\"...See you, Lina. I'll remember. For both of us.\"", ja: "「……またな、リナ。覚えてるよ。ふたり分。」" },
  { who: null, en: "THE END — Thank you for playing Aster Ⅰ.", ja: "おわり ——『Aster Ⅰ』を遊んでくれて、ありがとう。" },
  { end: true }
] }
);

/* ===== 英語RPG『Aster Ⅰ』の動き =====
   画面：上に背景の絵、下に会話の枠。枠をタップで次へ、右上の「訳」で日本語に切りかえ。
   文の中のターゲット単語（Part1〜2）には下線を引き、「訳」のときに意味を小さく並べる。
   戦い：問題に答えて敵のHPを削る。間違えるとハートが減る。答えたあとに短い解説。
   進み具合は game/rpg（story・章・何番目・フラグ・クリアした章・倒した敵）。 */
const RPG_STORY = "aster", RPG_HP = 5, RPG_CLEAR_KOBAN = 50, RPG_WIN_KOBAN = 5;
let rpgNewOk = false, rpgJa = false, rpgB = null, rpgMenu = false, rpgMode = "story", rpgX = null;
const RPG_EX_KOBAN = 3, RPG_EX_DAILY = 5;
function rpgState() {
  let s = JSON.parse(JSON.stringify(S.rpg || {}));
  // 前の物語（妖怪の章）の記録は、小判の分だけ残して新しい物語を最初から
  if (s.story !== RPG_STORY) s = { story: RPG_STORY, ch: 0, i: 0, flags: {}, cleared: s.cleared || [], won: s.won || {} };
  s.flags = s.flags || {}; s.won = s.won || {}; s.items = s.items || {}; s.dex = s.dex || {}; s.ex = s.ex || {}; s.exk = s.exk || 0; s.cleared = s.cleared || []; s.ch = s.ch || 0; s.i = s.i || 0;
  return s;
}
function rpgKoban() { const r = S.rpg || {}; return (r.cleared || []).length * RPG_CLEAR_KOBAN + Object.keys(r.won || {}).length * RPG_WIN_KOBAN + (r.exk || 0); }
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
function rpgScene(bg, overlay, cls) {
  const src = typeof RPG_BG !== "undefined" && RPG_BG[bg];
  return `<div class="rpg-scene${cls ? " " + cls : ""}" style="${src ? `background-image:url('${src}')` : ""}">${overlay || ""}</div>`;
}
function rpgFace(c, face) {
  if (!c || !c.face || typeof RPG_FACE === "undefined") return "";
  const src = RPG_FACE[c.face + "_" + (face || "neutral")] || RPG_FACE[c.face + "_neutral"];
  return src ? `<img class="rpg-face" src="${src}" alt="">` : "";
}
const rpgMonSrc = n => typeof RPG_MON !== "undefined" && RPG_MON[n] || "";
const rpgItemSrc = n => typeof RPG_ITEM !== "undefined" && RPG_ITEM[n] || "";
const rpgTr = () => `<button type="button" class="rpg-tr${rpgJa ? " on" : ""}" data-r="tr" aria-pressed="${rpgJa}">訳</button>`;
function rpgGloss(found) { return rpgJa && found.length ? `<div class="rpg-gloss">${found.map(w => `<span><b>${esc(w[0])}</b>${w[5] ? `<small>${esc(w[5])}</small>` : ""}${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""; }

function renderRPG() {
  const box = $("rpgBox"); if (!box) return;
  const st = rpgResolve(rpgState());
  const tabs = `<div class="rpg-modes" role="tablist">${[["story", "冒険"], ["explore", "探索"], ["dex", "図鑑"]].map(([k, l]) => `<button type="button" data-r="mode" data-k="${k}" aria-pressed="${rpgMode === k}">${l}</button>`).join("")}</div>`;
  let h = tabs + (rpgMode === "explore" ? rpgExploreHtml(st) : rpgMode === "dex" ? rpgDexHtml(st) : rpgMode === "novel" ? rpgStoryHtml(st) : rpgGameHtml(st));
  if (box.dataset.v !== h) {
    box.innerHTML = h; box.dataset.v = h;
    // 答えたあとは、結果と「次へ」が下のタブに隠れないように少しスクロール
    const nb = box.querySelector('[data-r="bnext"]');
    if (nb) requestAnimationFrame(() => { const over = nb.getBoundingClientRect().bottom - (innerHeight - 90); if (over > 0) scrollBy({ top: over, behavior: "smooth" }); });
  }
}
function rpgGameHtml(st) {
  const g = S.rpg && S.rpg.game, lead = g && g.party && g.party[0];
  const where = g && GMAPS[g.map] ? GMAPS[g.map].ja : "";
  return rpgScene("cg_train", `<div class="rpg-title"><b>Aster Ⅰ</b><span>王道RPG　物語はすべて英語</span></div>`, "rpg-cover") + `<div class="rpg-box rpg-start">
    ${g ? `<div class="rpg-save"><span>${esc(where)}</span><span>レン Lv${lead ? lead.lv : 1}</span><span>${g.gold} G</span></div><button type="button" class="big-btn" data-r="gplay">つづきから</button>${rpgNewOk ? `<p class="note" style="margin:0;color:var(--seal)">はじめからにすると、今の冒険のデータ（レベル・装備・進み具合）は消える。本当にいい？</p><div class="row"><button type="button" class="btn" data-r="gnew" style="border-color:var(--seal);color:var(--seal)">消してはじめから</button><button type="button" class="btn ghost" data-r="gnewcancel">やめる</button></div>` : `<button type="button" class="btn" data-r="gnew">はじめから</button>`}` : `<button type="button" class="big-btn" data-r="gnew">冒険をはじめる</button>`}
    <button type="button" class="linkbtn" data-r="novel">物語だけ読む</button></div>`;
}
function rpgStoryHtml(st) {
  const ch = RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0], ns = rpgNodes(st), n = ns[st.i], bg = rpgBg(st);
  const shown = ns.filter(x => x.en || x.choice || x.battle).length, done = ns.slice(0, st.i).filter(x => x.en || x.choice || x.battle).length;
  const head = `<div class="rpg-top"><span class="rpg-ch">${esc(ch.ja)}</span><span class="rpg-prog">${Math.min(done + 1, shown)} / ${shown}</span><button type="button" class="rpg-menu-btn" data-r="menu" aria-label="章を選ぶ">☰</button></div>`;
  if (rpgMenu) return head + rpgMenuHtml(st);
  if (!n) return head + rpgScene(bg) + `<div class="rpg-box"><p class="rpg-text">物語が見つからない。☰ から章を選んで。</p></div>`;
  if (n.end) return head + rpgScene(bg, `<div class="rpg-banner">${esc(ch.ja)}<small>CLEAR</small></div>`) + rpgEndHtml(st);
  if (n.battle) {
    if (!rpgB || rpgB.i !== st.i) { const qs = [...n.qs, ...rpgVocabQs(st, n)]; rpgB = rpgNewFight(qs, { ...n.battle, koban: RPG_WIN_KOBAN }); rpgB.i = st.i; }
    return head + rpgFightHtml(rpgB, bg, st, !st.won[st.ch + ":" + st.i]);
  }
  if (n.choice) return head + rpgScene(bg) + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">${rpgJa ? "選択" : "Choice"}</span>${rpgTr()}</div>
      <p class="rpg-text">${esc(rpgJa ? n.choice.ja : n.choice.en)}</p>
      <div class="rpg-opts">${n.opts.map((o, k) => `<button type="button" data-r="opt" data-k="${k}"><span>${k + 1}</span><em>${esc(rpgJa ? o.ja : o.en)}</em></button>`).join("")}</div></div>`;
  const c = n.who && RPG_CAST[n.who], m = rpgMark(n.en);
  return head + rpgScene(bg) + `<div class="rpg-box tap" data-r="next" role="button" tabindex="0">
      <div class="rpg-boxhead">${c ? `<span class="rpg-name">${esc(rpgJa ? c.ja : c.name)}</span>` : `<span></span>`}${rpgTr()}</div>
      <div class="rpg-say">${rpgFace(c, n.face)}<p class="rpg-text${c ? "" : " narr"}">${rpgJa ? esc(n.ja) : m.html}</p></div>${rpgGloss(m.found)}
      <span class="rpg-more" aria-hidden="true">▼</span></div>`;
}
function rpgEndHtml(st) {
  const last = st.ch >= RPG_CHAPTERS.length - 1;
  return `<div class="rpg-box"><p class="rpg-text">${last ? "ここまでが今ある物語。続きは準備中。そのあいだは「探索」で単語を鍛えよう。" : "次の章へ進もう。"}</p>
    ${last ? "" : `<button type="button" class="big-btn" data-r="nextch">${esc(RPG_CHAPTERS[st.ch + 1].ja)} へ</button>`}</div>`;
}
function rpgMenuHtml(st) {
  return `<div class="rpg-box"><p class="rpg-text">章を選ぶ</p><div class="rpg-chlist">${RPG_CHAPTERS.map((c, k) => {
    const open = k === 0 || st.cleared.includes(RPG_CHAPTERS[k - 1].id) || k <= st.ch;
    return `<button type="button" data-r="pick" data-k="${k}"${open ? "" : " disabled"}${k === st.ch ? ' class="cur"' : ""}><span>${esc(c.ja)}</span><small>${st.cleared.includes(c.id) ? "クリア" : open ? "" : "未開放"}</small></button>`;
  }).join("")}</div><button type="button" class="btn" data-r="menu">閉じる</button></div>`;
}

/* ---- 戦い（物語と探索で共通） ---- */
function rpgNewFight(qs, e) { return { qs, hp: qs.length, php: RPG_HP, q: qs.map((_, k) => k), res: null, pick: null, e, fx: "" }; }
function rpgFightHtml(b, bg, st, firstWin) {
  const e = b.e, total = b.qs.length, foe = e.foe && typeof RPG_FOE !== "undefined" && RPG_FOE[e.foe], mon = foe || (e.mon && rpgMonSrc(e.mon));
  const over = `<div class="rpg-foe${e.boss ? " boss" : ""}"><b>${esc(rpgJa && e.ja ? e.ja : e.name)}</b><div class="rpg-hpbar"><i style="width:${100 * Math.max(0, b.hp) / total}%"></i></div></div>
    ${mon ? `<img class="rpg-mon${foe ? " tall" : ""}${b.hp <= 0 ? " down" : b.fx === "ok" ? " hit" : ""}" src="${mon}" alt="">` : ""}
    <div class="rpg-hearts">${"♥".repeat(Math.max(0, b.php))}<span>${"♥".repeat(RPG_HP - Math.max(0, b.php))}</span></div>`;
  const scene = rpgScene(bg, over, b.fx === "ng" ? "hurt" : "");
  if (b.php <= 0) return scene + `<div class="rpg-box"><p class="rpg-text">力尽きた……もう一度挑戦しよう。</p><button type="button" class="big-btn" data-r="retry">もう一度戦う</button></div>`;
  if (b.hp <= 0) {
    const drop = e.drop && RPG_ITEMS[e.drop];
    return scene + `<div class="rpg-box"><p class="rpg-text">${esc(rpgJa && e.ja ? e.ja : e.name)} を倒した！</p>
      ${drop ? `<div class="rpg-drop"><img src="${rpgItemSrc(e.drop)}" alt=""><span><b>${esc(drop.ja)}</b> を手に入れた<small>${esc(drop.use)}</small></span></div>` : ""}
      ${firstWin && e.koban ? `<p class="rpg-gain">小判＋${e.koban}</p>` : ""}<button type="button" class="big-btn" data-r="win">${b.ex ? "探索を続ける" : "先へ進む"}</button></div>`;
  }
  const q = b.qs[b.q[0]], answered = b.res != null, num = total - b.q.length + 1, herbs = (st.items || {})[1] || 0;
  let h = scene + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">Q${Math.min(num, total)} / ${total}</span><span class="rpg-tools">${herbs && b.php < RPG_HP && !answered ? `<button type="button" class="rpg-herb" data-r="herb"><img src="${rpgItemSrc(1)}" alt="">薬草 ${herbs}</button>` : ""}${q.jaOnly || answered ? "" : rpgTr()}</span></div>
    ${q.pre ? `<p class="rpg-text ex">${q.pre}</p>` : ""}<p class="rpg-text q">${esc(rpgJa || answered ? q.ja : q.en)}</p>
    <div class="rpg-opts">${q.opts.map((o, k) => {
      const cls = !answered ? "" : k === q.a ? "right" : k === b.pick ? "wrong" : "dim";
      const label = q.jaOnly ? esc(o[1]) : answered || rpgJa ? `${esc(o[0])}<small>${esc(o[1])}</small>` : esc(o[0]);
      return `<button type="button" data-r="ans" data-k="${k}" class="${cls}"${answered ? " disabled" : ""}><span>${"ABCD"[k]}</span><em>${label}</em></button>`;
    }).join("")}</div>`;
  if (answered) h += `<div class="rpg-res ${b.res}"><b>${b.res === "ok" ? "正解" : "不正解　正解は " + "ABCD"[q.a]}</b><p>${esc(q.tip || "")}</p></div><button type="button" class="big-btn" data-r="bnext">次へ</button>`;
  return h + `</div>`;
}

/* ---- 探索：ターゲット1900の問題でモンスターと戦う ---- */
const RPG_EX_BG = ["village", "ruins", "cave", "canal", "beach", "sea", "storm", "gate", "harbor", "cellar"];
function rpgExQs() {
  const all = typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : [], seen = (S.words && S.words.w) || {};
  if (!all.length) return [];
  // 間違えたことのある単語を多めに、残りはこれまでに出た範囲から
  const weak = all.filter(w => seen[w[2]] && seen[w[2]][2] > 0), met = all.filter(w => seen[w[2]]);
  const pool = () => { const r = Math.random(); const src = r < .45 && weak.length ? weak : r < .8 && met.length > 20 ? met : all; return src[Math.floor(Math.random() * src.length)]; };
  const used = new Set(), qs = [];
  while (qs.length < 5 && used.size < 60) {
    const w = pool(); if (used.has(w[2])) continue; used.add(w[2]);
    const wrong = []; while (wrong.length < 3) { const x = all[Math.floor(Math.random() * all.length)]; if (x[0] !== w[0] && !wrong.includes(x)) wrong.push(x); }
    const opts = [w, ...wrong].sort(() => Math.random() - .5), a = opts.indexOf(w);
    const ex = w[3] && /\{\{c1::/.test(w[3]);
    if (ex && qs.length % 2 === 1) {
      const sent = esc(w[3]).replace(/(\w*)\{\{c1::(.*?)\}\}(\w*)/, "<b class=\"blank\">＿＿＿</b>");
      qs.push({ pre: sent, en: "Choose the word that fits the blank.", ja: (w[4] || "") + "　→ 空所に入る単語は？", opts: opts.map(x => [x[0], rpgShort(x[1])]), a, tip: `${w[0]}＝${rpgShort(w[1])}（No.${w[2]}）` });
    } else qs.push({ en: `What does "${w[0]}" mean?`, ja: `「${w[0]}」の意味は？`, opts: opts.map(x => [rpgShort(x[1]), rpgShort(x[1])]), a, tip: `${w[0]}＝${rpgShort(w[1])}（No.${w[2]}）`, jaOnly: true });
  }
  return qs;
}
function rpgExploreHtml(st) {
  const today = dayKey(), ex = st.ex.day === today ? st.ex : { day: today, wins: 0 };
  if (rpgX) return `<div class="rpg-top"><span class="rpg-ch">探索　${esc(rpgX.areaJa)}</span><span class="rpg-prog">今日 ${ex.wins} 勝</span></div>` + rpgFightHtml(rpgX, rpgX.bg, st, false);
  const left = Math.max(0, RPG_EX_DAILY - ex.wins), got = Object.keys(st.dex).length;
  return `<div class="rpg-top"><span class="rpg-ch">探索</span><span class="rpg-prog">図鑑 ${got} / 110</span></div>` + rpgScene("ruins") + `<div class="rpg-box">
    <p class="rpg-text">ターゲット1900の単語で、野生のモンスターと戦う。間違えたことのある単語ほど出やすい。</p>
    <p class="note" style="margin:0">勝つと図鑑に登録。今日はあと${left}回まで小判＋${RPG_EX_KOBAN}（そのあとも遊べる）。ときどきアイテムを落とす。</p>
    <button type="button" class="big-btn" data-r="explore">探索に出る</button></div>`;
}
const RPG_AREA_JA = { village: "村はずれ", ruins: "森の遺跡", cave: "水晶の洞窟", canal: "地下水路", beach: "浜辺", sea: "海の底", storm: "嵐の空", gate: "炎の門", harbor: "港の倉庫", cellar: "古い地下室" };
function rpgStartExplore() {
  const qs = rpgExQs(); if (!qs.length) return toast("単語データが読み込めていない。");
  const mon = 1 + Math.floor(Math.random() * 110), bg = RPG_EX_BG[Math.floor(Math.random() * RPG_EX_BG.length)];
  rpgX = rpgNewFight(qs, { name: RPG_MON_NAMES[mon], mon }); rpgX.ex = true; rpgX.bg = bg; rpgX.areaJa = RPG_AREA_JA[bg] || "";
  rpgJa = false; sfx("tap"); renderRPG();
}
function rpgDexHtml(st) {
  const got = Object.keys(st.dex).length, items = Object.entries(RPG_ITEMS);
  return `<div class="rpg-top"><span class="rpg-ch">モンスター図鑑</span><span class="rpg-prog">${got} / 110</span></div>
    <div class="rpg-box"><div class="rpg-dex">${RPG_MON_NAMES.slice(1).map((nm, k) => { const n = k + 1, c = st.dex[n]; return `<div class="${c ? "" : "lock"}" title="${c ? esc(nm) : "？？？"}"><img src="${rpgMonSrc(n)}" alt=""><small>${c ? esc(nm) : "No." + n}</small></div>`; }).join("")}</div></div>
    <div class="rpg-box"><p class="rpg-text">持ち物</p><div class="rpg-items">${items.map(([id, it]) => { const c = (st.items || {})[id] || 0; return `<div class="${c ? "" : "lock"}"><img src="${rpgItemSrc(id)}" alt=""><span><b>${c ? esc(it.ja) : "？？？"}</b><small>${c ? "×" + c + "　" + esc(it.use) : "まだ持っていない"}</small></span></div>`; }).join("")}</div>
    <p class="note" style="margin:0">モンスター・アイテムの絵：モケモ（mokemo-factory）</p></div>`;
}

function bindRPG() {
  const box = $("rpgBox");
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-r]"); if (!b || b.disabled) return;
    const r = b.dataset.r, st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i], fight = rpgMode === "explore" ? rpgX : rpgB;
    if (r === "tr") { e.stopPropagation(); rpgJa = !rpgJa; sfx("tap"); return renderRPG(); }
    if (r === "mode") { rpgMode = b.dataset.k; rpgMenu = false; rpgJa = false; sfx("tap"); return renderRPG(); }
    if (r === "menu") { rpgMenu = !rpgMenu; return renderRPG(); }
    if (r === "pick") { const k = Number(b.dataset.k); if (k === st.ch) { rpgMenu = false; return renderRPG(); } st.ch = k; st.i = 0; return rpgGo(st); }
    if (r === "next") return rpgNext();
    if (r === "gplay") return gOpen(false);
    if (r === "gnew") { if (S.rpg && S.rpg.game && !rpgNewOk) { rpgNewOk = true; box.dataset.v = ""; renderRPG(); return; } rpgNewOk = false; return gOpen(true); }
    if (r === "gnewcancel") { rpgNewOk = false; box.dataset.v = ""; return renderRPG(); }
    if (r === "novel") { rpgMode = "novel"; return renderRPG(); }
    if (r === "nextch") { st.ch++; st.i = 0; return rpgGo(st); }
    if (r === "explore") return rpgStartExplore();
    if (r === "opt") { const o = n.opts[Number(b.dataset.k)]; if (o.flag) st.flags[o.flag] = 1; st.i = rpgNodes(st).findIndex(x => x.label === o.go); sfx("ok"); return rpgGo(st); }
    if (r === "herb" && fight) { if (!ready() || !(st.items[1] > 0)) return; fight.php = Math.min(RPG_HP, fight.php + 1); st.items[1]--; sfx("coin"); toast("薬草でハートが1つ回復した"); const keep = rpgB; patchDoc("rpg", v => { v.items = st.items; }).then(() => { rpgB = keep; renderRPG(); }); return renderRPG(); }
    if (r === "ans" && fight && fight.res == null) {
      const k = Number(b.dataset.k), q = fight.qs[fight.q[0]]; fight.pick = k;
      if (k === q.a) { fight.res = "ok"; fight.hp--; sfx("ok"); } else { fight.res = "ng"; fight.php--; sfx("ng"); if (navigator.vibrate) try { navigator.vibrate(80); } catch (x) {} }
      fight.fx = fight.res; rpgJa = false; return renderRPG();
    }
    if (r === "bnext" && fight) { const q = fight.q.shift(); if (fight.res === "ng") fight.q.push(q); fight.res = null; fight.pick = null; fight.fx = ""; return renderRPG(); }
    if (r === "retry" && fight) { if (fight.ex) { fight.php = RPG_HP; fight.hp = fight.qs.length; fight.q = fight.qs.map((_, k) => k); fight.fx = ""; } else rpgB = null; return renderRPG(); }
    if (r === "win") {
      if (fight && fight.ex) {
        const m = fight.e.mon, today = dayKey(); st.ex = st.ex.day === today ? st.ex : { day: today, wins: 0 }; st.ex.wins++;
        const first = !st.dex[m]; st.dex[m] = (st.dex[m] || 0) + 1;
        let msg = (first ? "図鑑に登録：" : "") + RPG_MON_NAMES[m];
        if (st.ex.wins <= RPG_EX_DAILY) { st.exk += RPG_EX_KOBAN; msg += "　小判＋" + RPG_EX_KOBAN; }
        if (Math.random() < .3) { const ids = Object.keys(RPG_ITEMS), id = ids[Math.floor(Math.random() * ids.length)]; st.items[id] = (st.items[id] || 0) + 1; msg += "　" + RPG_ITEMS[id].ja + "を拾った"; }
        rpgX = null; sfx("coin"); toast(msg);
        if (!ready()) return; return patchDoc("rpg", v => { v.ex = st.ex; v.dex = st.dex; v.exk = st.exk; v.items = st.items; v.story = st.story; });
      }
      const e2 = n.battle; st.won[st.ch + ":" + st.i] = 1; if (e2.drop) st.items[e2.drop] = (st.items[e2.drop] || 0) + 1; if (e2.mon) st.dex[e2.mon] = (st.dex[e2.mon] || 0) + 1;
      st.i++; sfx("coin"); return rpgGo(st);
    }
  });
  box.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.r === "next") { e.preventDefault(); rpgNext(); } });
}

/* ===== 王道コマンドRPG『Aster Ⅰ』のデータ =====
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
function gBlock(m, x, y, rows) { rows.forEach((r, j) => r.forEach((tl, i) => gPut(m, x + i, y + j, tl, true))); }
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
    for (let y = 0; y < 11; y++) gPut(m, 13, y, y % 2 ? TILE.railB : TILE.railA);
    gPut(m, 2, 2, TILE.vendTop, true); gPut(m, 2, 3, TILE.vendBot, true); gPut(m, 4, 2, TILE.vendTop, true); gPut(m, 4, 3, TILE.vendBot, true);
    gPut(m, 6, 6, TILE.sofa, true); gPut(m, 7, 6, TILE.sofa2, true); gPut(m, 6, 8, TILE.sofa, true); gPut(m, 7, 8, TILE.sofa2, true);
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
    TILE.fountain.forEach((t, i) => { gSet(m, 11 + (i % 3), 9 + Math.floor(i / 3), TILE.cobble, true); gPut(m, 11 + (i % 3), 9 + Math.floor(i / 3), t); });
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
    gBlock(m, 1, 2, [[T(111, 4), T(111, 5)], [T(112, 4), T(112, 5)]]);
    gBlock(m, 7, 5, [[T(111, 6), T(111, 7)], [T(112, 6), T(112, 7)]]);
    gPut(m, 7, 0, TILE.shelfTop); gPut(m, 7, 1, TILE.shelfBot);
    return m;
  }, npcs: [{ id: "elder", sprite: "elder", x: 5, y: 3, dir: 0, talk: "c1_cellar", lines: "elder_after" }],
  props: [{ sprite: "torch", x: 3, y: 1 }, { sprite: "torch", x: 6, y: 1 }],
  events: [{ x: 4, y: 7, to: ["village", 5, 7, 0] }] },
  forest: { name: "Whispering Forest", ja: "ささやきの森", bg: "forest", enc: { rate: 16, area: "forest" }, build() {
    const W = 18, H = 30, m = gMapNew(W, H, TILE.grassDark);
    const cxAt = y => 8 + Math.round(Math.sin(y / 4.2) * 3.5);
    const walk = (x, y) => (x >= cxAt(y) - 1 && x <= cxAt(y) + 1) || (y >= 12 && y <= 16 && x >= 3 && x <= 14) || (y >= 22 && y <= 24 && x >= 6 && x <= 15);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x >= cxAt(y) - 1 && x <= cxAt(y) + 1) gSet(m, x, y, TILE.dirt);
    const used = new Set(), key = (x, y) => x + "," + y;
    for (let y = 0; y < H - 1; y += 2) for (let x = (y / 2) % 2; x < W - 1; x += 2) {
      if ([[0, 0], [1, 0], [0, 1], [1, 1]].some(([a, b]) => walk(x + a, y + b))) continue;
      const v = (x + y) % 4 === 0 ? 0 : 2; gPut(m, x, y, T(1, v), true); gPut(m, x + 1, y, T(1, v + 1), true); gPut(m, x, y + 1, T(2, v), true); gPut(m, x + 1, y + 1, T(2, v + 1), true);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => used.add(key(x + a, y + b)));
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!walk(x, y) && !used.has(key(x, y))) gPut(m, x, y, (x + y) % 3 ? TILE.bush2 : TILE.bush, true);
    for (const [x, y] of [[11, 15], [13, 13]]) gPut(m, x, y, TILE.bush, true);
    for (const [x, y, tl] of [[4, 13, TILE.flowerW], [6, 15, TILE.tuft], [12, 15, TILE.flowerB], [13, 16, TILE.tuft2], [5, 12, TILE.tuft2], [12, 23, TILE.flowerW], [14, 22, TILE.tuft], [4, 16, TILE.flowerP]]) gPut(m, x, y, tl);
    return m;
  }, npcs: [], chests: [{ id: "f1", x: 14, y: 23, item: "herb", n: 3 }, { id: "f2", x: 3, y: 14, gold: 40 }],
  events: [{ rowLE: 16, scene: "c2_forest", once: "c2_forest_seen" }, { bottom: true, to: ["village", 12, 1, 0] }, { top: true, to: ["ruins", 7, 14, 3] }] },
  ruins: { name: "Shrine Ruins", ja: "ほこらの遺跡", bg: "ruins", enc: { rate: 14, area: "ruins" }, build() {
    const m = gMapNew(16, 16, TILE.grassDull);
    gRect(m, 4, 3, 8, 12, TILE.cobbleGray);
    gRect(m, 0, 0, 16, 3, TILE.wallGray, true);
    gSet(m, 7, 1, TILE.archTop, true); gSet(m, 7, 2, TILE.archBot, true); gSet(m, 8, 1, TILE.wallDark, true); gSet(m, 8, 2, TILE.wallDark, true);
    for (const [x, y] of [[4, 4], [11, 4], [4, 9], [11, 9]]) { gPut(m, x, y, TILE.pillarTop, true); gPut(m, x, y + 1, TILE.pillarBot, true); }
    gSet(m, 0, 3, TILE.wallGray, true); gSet(m, 1, 3, TILE.wallGray, true); gSet(m, 0, 4, TILE.wallGray, true); gSet(m, 15, 3, TILE.wallGray, true); gSet(m, 14, 3, TILE.wallGray, true);
    gRect(m, 0, 15, 6, 1, TILE.wallGray, true); gRect(m, 10, 15, 6, 1, TILE.wallGray, true); gSet(m, 0, 14, TILE.wallGray, true); gSet(m, 15, 14, TILE.wallGray, true);
    gTree(m, 0, 7); gTree(m, 14, 9); gTree(m, 1, 11);
    for (const [x, y] of [[3, 7], [12, 12], [5, 13], [10, 3], [2, 4]]) gPut(m, x, y, TILE.rock, true);
    for (const [x, y, tl] of [[2, 9, TILE.tuft], [13, 6, TILE.flowerW], [3, 14, TILE.tuft2], [6, 7, TILE.tuft2], [9, 12, TILE.tuft], [13, 13, TILE.flowerP]]) gPut(m, x, y, tl);
    return m;
  }, npcs: [{ id: "knight", sprite: "knight", x: 7, y: 3, dir: 0, talk: "c2_knight", hideIf: "c2_done" }],
  chests: [{ id: "r1", x: 2, y: 13, eq: "ironsword" }, { id: "r2", x: 13, y: 4, item: "water", n: 2 }],
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
  hollow: { foe: "hollow", name: "Cellar Hollow", ja: "地下室のホロウ", hp: 85, atk: 9, def: 3, spd: 5, exp: 40, gold: 30, boss: true },
  hknight: { foe: "hknight", name: "The Hollow Knight", ja: "空ろの騎士", hp: 1100, atk: 29, def: 14, spd: 8, exp: 220, gold: 150, boss: true }
};
const GAREAS = {
  forest: [["slime"], ["slime", "slime"], ["imp"], ["sprite", "slime"], ["hedgehog"], ["owl"], ["imp", "sprite"], ["ent"]],
  ruins: [["goblin"], ["ghost", "ghost"], ["lizard"], ["goblin", "ghost"], ["gargoyle"], ["crow"], ["lizard", "ghost"]]
};
const GBOSS_OF = { "Cellar Hollow": "hollow", "The Hollow Knight": "hknight" };

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
  // 日記や手紙を置く場所：宝箱と重ならない部屋の隅
  const used = new Set(m.spots.chest.map(a => a.join(",")));
  m.spots.note = rooms.filter(rm => rm !== top && rm !== bot).flatMap(rm => [[rm.x0, rm.y0 + rm.rh - 1], [rm.x0 + rm.rw - 1, rm.y0], [rm.x0 + rm.rw - 1, rm.y0 + rm.rh - 1], [rm.x0, rm.y0]]
    .filter(([x, y]) => free(x, y) && !m.solid[y * W + x] && !used.has(x + "," + y)).slice(0, 1));
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

/* ===== 『Aster Ⅰ』書き足し（序章〜第6章） =====
   1) 章の途中に場面を足す（rpgAddAfter：書き出しの英文の直後に入れる）
   2) 宿屋に泊まったときの仲間の会話（GINNTALK）
   3) 町の人の長い会話（GLINES を上書き）と、新しい町の人（GMAPS の npcs に足す） */
Object.assign(RPG_CAST, {
  passenger: { name: "Old Woman", ja: "老婦人" },
  mom: { name: "Mother", ja: "母" },
  haru: { name: "Haru", ja: "ハル" },
  boatman: { name: "Boatman", ja: "渡し守" },
  smuggler: { name: "Smuggler", ja: "密輸人" },
  priest: { name: "Lantern Keeper", ja: "灯守り" }
});
Object.assign(GEXTRA_CAST, { scholar: { name: "Scholar", ja: "学者" }, merchant: { name: "Merchant", ja: "商人" }, soldier: { name: "Soldier", ja: "兵士" }, widow: { name: "Widow", ja: "未亡人" } });

function rpgAddBefore(chId, start, nodes) {
  const ch = RPG_CHAPTERS.find(c => c.id === chId); const i = ch ? ch.nodes.findIndex(n => n.en && n.en.startsWith(start)) : -1;
  if (i < 0) { console.warn("rpgAddBefore: not found", chId, start); return; } ch.nodes.splice(i, 0, ...nodes);
}
function rpgAddAfter(chId, start, nodes) {
  const ch = RPG_CHAPTERS.find(c => c.id === chId); if (!ch) return;
  const i = ch.nodes.findIndex(n => n.en && n.en.startsWith(start));
  if (i < 0) { console.warn("rpgAddAfter: not found", chId, start); return; }
  ch.nodes.splice(i + 1, 0, ...nodes);
}

/* ───────── 序章 ───────── */
rpgAddAfter("p0", "Her room was now used for storage.", [
  { who: null, en: "He still remembered the last morning clearly. Mio had been standing at the door with her bag, staring at her shoes.", ja: "最後の朝のことは、今でもはっきり覚えている。ミオはかばんを持って玄関に立ち、自分の靴をじっと見つめていた。" },
  { who: "mio", face: "neutral", en: "\"Hey, Ren. If I disappeared one day, would you be sad?\"", ja: "「ねえ、お兄ちゃん。もしわたしがある日いなくなったら、悲しい？」" },
  { who: "ren", en: "\"What kind of question is that? Hurry up, or you'll be late.\"", ja: "「なんだよその質問。早くしないと遅刻するぞ。」" },
  { who: "mio", face: "smile", en: "\"...Yeah. You're right. See you later.\"", ja: "「……そうだね。じゃあ、行ってきます。」" },
  { who: null, en: "She smiled, but it was a thin, tired smile. He had not even looked up from his phone. That was the last thing she ever said to him.", ja: "彼女はほほえんだ。でもそれは、うすくて疲れた笑顔だった。彼は携帯から顔を上げさえしなかった。それが、妹が彼に言った最後の言葉になった。" },
  { who: "ren", face: "sad", en: "\"If I had answered properly... if I had just said yes...\"", ja: "「あのとき、ちゃんと答えていれば……『悲しいに決まってる』って、ひとこと言っていれば……」" },
  { who: null, en: "For a year, that question had followed him everywhere: to school, to bed, into every dream.", ja: "この1年、あの問いはどこへでもついてきた。学校へも、ベッドへも、すべての夢の中へも。" }
]);
rpgAddAfter("p0", "Outside the window, the town melted into gold,", [
  { who: null, en: "The carriage was almost empty. Only an old woman sat near the back, holding an envelope that had never been opened.", ja: "車内はほとんど空っぽだった。うしろのほうに老婦人がひとり座っているだけで、一度も開けられたことのない封筒を手にしていた。" },
  { who: "passenger", en: "\"Are you going to Aster too, young man? I'm going to deliver this letter. I wrote it fifty years ago, but I was too proud to send it.\"", ja: "「あなたもアスターへ行くの？わたしはこの手紙を届けに行くのよ。50年前に書いたのに、意地を張って出せなかったの。」" },
  { who: "ren", en: "\"Who is it for?\"", ja: "「だれに宛てたものなんですか？」" },
  { who: "passenger", en: "\"My older sister. We had a terrible argument, and we never spoke again. When she died, everyone slowly forgot her. Even I began to forget her voice.\"", ja: "「姉よ。ひどいけんかをして、それきり口をきかなかった。姉が亡くなると、みんな少しずつ姉のことを忘れていった。わたしでさえ、姉の声を忘れかけたの。」" },
  { who: "passenger", en: "\"But one night I found this letter in a drawer, and I remembered everything. So I'm taking it to the place where forgotten people go.\"", ja: "「でもある晩、引き出しでこの手紙を見つけて、全部思い出したの。だから、忘れられた人が行く場所へ持っていくのよ。」" },
  { who: "ren", face: "sad", en: "\"...I hope she reads it.\"", ja: "「……お姉さんが、読んでくれるといいですね。」" },
  { who: "passenger", en: "\"So do I. You're looking for someone too, aren't you? Don't wait fifty years, dear. Some words lose their meaning if you keep them too long.\"", ja: "「わたしもそう願ってる。あなたもだれかを探しているんでしょう？50年も待っちゃだめよ。言葉の中には、長くしまっておくと意味をなくしてしまうものもあるの。」" },
  { who: null, en: "When Ren looked back a moment later, the seat was empty. Only the scent of old paper remained.", ja: "少しして振り返ると、その席は空っぽだった。古い紙のにおいだけが残っていた。" }
]);

/* ───────── 第1章 ───────── */
rpgAddAfter("c1", "\"Then perhaps the two are connected.", [
  { who: "ren", en: "\"Wait. Before we go, tell me more about this place. What exactly is Aster?\"", ja: "「待ってくれ。行く前に、もう少しここのことを教えてくれ。アスターって、いったい何なんだ？」" },
  { who: "lina", en: "\"Think of it as the back side of your world. When something is completely forgotten there, it doesn't simply vanish. It falls through, like a coin through a hole in a pocket, and lands here.\"", ja: "「あなたの世界の裏側だと思って。向こうで何かが完全に忘れられると、それはただ消えるんじゃない。ポケットの穴から硬貨が落ちるみたいにこぼれ落ちて、ここにたどり着くの。」" },
  { who: "lina", en: "\"Old toys, songs nobody sings anymore, the names of streets that were rebuilt. And sometimes people. Everything that once mattered to someone.\"", ja: "「古いおもちゃ、もうだれも歌わない歌、作り直された通りの名前。それに、ときには人も。かつてだれかにとって大切だったもの、全部。」" },
  { who: "ren", en: "\"So this village...\"", ja: "「じゃあ、この村も……」" },
  { who: "lina", face: "sad", en: "\"Hollowbrook was a real village once, in your world. A dam was built, and it was flooded. The people moved away, and after a few generations, nobody remembered it at all.\"", ja: "「ホロウブルックは、昔はあなたの世界の本当の村だったの。ダムができて、水の底に沈んだ。人々は引っ越して、何世代かたつと、もうだれも覚えていなかった。」" },
  { who: "lina", en: "\"Here, it gets a second life. Or at least, it used to. Since the Fading began, even forgotten things are being forgotten again.\"", ja: "「ここでは、二度目の命をもらえる。少なくとも、前はそうだった。色あせが始まってから、忘れられたものが、もう一度忘れられていくの。」" },
  { who: "ren", en: "\"Forgotten twice... Then they really disappear?\"", ja: "「二度忘れられたら……本当に消えてしまうのか？」" },
  { who: "lina", face: "sad", en: "\"Yes. There is nowhere further to fall.\"", ja: "「ええ。その先に、落ちていく場所はないから。」" }
]);
rpgAddAfter("c1", "\"These belonged to my grandson...", [
  { who: "elder", en: "\"His name was Tobin. He loved to collect smooth stones from the river and line them up on my windowsill.\"", ja: "「名前はトビンじゃった。川からすべすべの石を拾ってきては、わしの窓辺に並べるのが好きでな。」" },
  { who: "elder", en: "\"When he was seven, he caught a fever. I sat by his bed for three nights. On the fourth morning, he smiled at me and closed his eyes.\"", ja: "「7つのとき、熱を出した。わしは三晩、あの子のそばに座っておった。四日目の朝、あの子はわしにほほえんで、目を閉じた。」" },
  { who: "elder", en: "\"The pain was so heavy that I could not breathe. So when the gray dust came, part of me was glad. I let it take him from my mind.\"", ja: "「あまりに痛みが重くて、息ができんかった。だから灰色の粉が来たとき、わしの一部は喜んだのじゃ。あの子を心から持っていかせてしまった。」" },
  { who: "ren", face: "sad", en: "\"...I understand. More than you think.\"", ja: "「……わかります。思っている以上に。」" },
  { who: "elder", en: "\"But a man who forgets his grandson is no longer a grandfather. He is just an old man sitting in the dark, holding a box he cannot open.\"", ja: "「じゃが、孫を忘れた男は、もう祖父ではない。開けられん箱を抱えて、暗がりに座っておるただの老人じゃ。」" }
]);
rpgAddBefore("c1", "Lina's lantern flickered for a moment", [
  { who: "ren", en: "\"...Mio was the kind of person who apologized when other people bumped into her.\"", ja: "「……ミオは、人がぶつかってきても自分が謝るようなやつだった。」" },
  { who: "ren", en: "\"She was terrible at math but amazing at drawing. She could draw a cat in ten seconds that looked more alive than a real one.\"", ja: "「数学は全然だめなのに、絵はすごくうまかった。10秒で描いたネコが、本物より生きてるみたいに見えるんだ。」" },
  { who: "ren", face: "smile", en: "\"When I was in middle school and got into a fight, she put a bandage on my face with a cat drawn on it. I had to wear it to school for a week.\"", ja: "「俺が中学でけんかしたとき、あいつがネコの絵を描いたばんそうこうを顔に貼ってきてさ。一週間、それで学校に行くはめになった。」" },
  { who: "lina", face: "smile", en: "\"She sounds wonderful.\"", ja: "「すてきな妹さんね。」" },
  { who: "ren", face: "sad", en: "\"She was. She is. ...See? I'm already using the past tense. That's what scares me most.\"", ja: "「すてきだった。……すてきなんだ。ほら、もう過去形で話してる。それがいちばん怖いんだ。」" }
]);

/* ───────── 第2章 ───────── */
rpgAddAfter("c2", "As they walked, the leaves seemed to whisper", [
  { who: "voice", en: "\"...don't forget to buy milk... I'm sorry I yelled... happy birthday, Grandpa... where did I leave my keys...\"", ja: "「……牛乳買うの忘れないでね……どなってごめん……おじいちゃん、誕生日おめでとう……鍵どこに置いたっけ……」" },
  { who: "ren", en: "\"These are all... ordinary things people said.\"", ja: "「これ全部……人が言った、ふつうの言葉だ。」" },
  { who: "lina", en: "\"Ordinary things are the first to be forgotten. Nobody keeps a record of what they said at breakfast. But to someone, those words were the whole world.\"", ja: "「ふつうのことほど、最初に忘れられるの。朝ごはんのときに何を言ったかなんて、だれも記録しない。でも、だれかにとっては、その言葉が世界のすべてだった。」" },
  { who: "lina", en: "\"When I was little, my teacher at the library told me that a person is made of small words more than big events. I didn't understand it then.\"", ja: "「小さいころ、図書館の先生が言ってたの。人は大きな出来事よりも、小さな言葉でできているんだって。そのときは意味がわからなかった。」" },
  { who: "ren", en: "\"And now?\"", ja: "「今は？」" },
  { who: "lina", face: "smile", en: "\"Now I think she was right. When you talked about Mio's cat bandage last night, I felt like I knew her a little.\"", ja: "「今は、先生は正しかったと思う。ゆうべ、あなたがミオのネコのばんそうこうの話をしたとき、わたし、少しだけ彼女を知っている気がしたもの。」" }
]);
rpgAddAfter("c2", "\"Now I remember. I served a young girl", [
  { who: "knight", en: "\"Before that, I was a knight of the old kingdom. My name was Sir Aldous. I swore to protect the princess, but on the night of the fire, I was not there.\"", ja: "「それより前、わたしは古い王国の騎士だった。名はアルダス。王女を守ると誓ったが、火事の夜、わたしはその場にいなかった。」" },
  { who: "knight", en: "\"I was drinking in a tavern, laughing with friends. By the time I ran back, the tower had already fallen. Nobody blamed me. That was the worst part.\"", ja: "「酒場で、友と笑いながら飲んでいたのだ。走って戻ったときには、塔はもう崩れていた。だれもわたしを責めなかった。それがいちばんつらかった。」" },
  { who: "knight", en: "\"I asked to be forgotten, so that no one would remember my failure. And the world granted my wish.\"", ja: "「わたしは、自分の失敗をだれも覚えていないように、忘れられることを願った。そして世界はその願いをかなえた。」" },
  { who: "lina", face: "sad", en: "\"...Just like her.\"", ja: "「……彼女と同じね。」" }
]);

/* ───────── 第3章 ───────── */
rpgAddAfter("c3", "\"Yes. Somewhere in here, there may even be", [
  { who: null, en: "As they walked deeper, the crystals began to show faint images: a child learning to ride a bicycle, a couple dancing in a kitchen, a dog waiting at a train station.", ja: "奥へ進むにつれて、水晶にかすかな映像が浮かび始めた。自転車の練習をする子ども、台所で踊る夫婦、駅で待ち続ける犬。" },
  { who: "ren", en: "\"That dog... it's been waiting a long time, hasn't it?\"", ja: "「あの犬……ずっと待ってるんだよな。」" },
  { who: "lina", face: "sad", en: "\"Its owner moved to another city and never came back. The dog waited every day until it was old. Then everyone forgot both of them.\"", ja: "「飼い主は別の町へ引っ越して、二度と戻らなかった。犬は年をとるまで毎日待っていた。そのあと、みんながふたりとも忘れてしまったの。」" },
  { who: "ren", en: "\"That's cruel.\"", ja: "「ひどい話だな。」" },
  { who: "lina", en: "\"Is it? The dog never stopped believing. I think it was happy, in its own way. Waiting for someone you love is a kind of love too.\"", ja: "「そうかしら。犬は最後まで信じるのをやめなかった。あの子なりに幸せだったと思う。好きな人を待つことも、ひとつの愛だから。」" }
]);
rpgAddAfter("c3", "Garo picked up his axe and the unfinished coat.", [
  { who: "garo", en: "\"I've been digging in this mountain for thirty years. Do you know why I never left?\"", ja: "「わしはこの山を30年掘り続けてきた。なぜ出ていかんかったか、わかるか？」" },
  { who: "ren", en: "\"Because of the crystals?\"", ja: "「水晶のためか？」" },
  { who: "garo", en: "\"Because every morning, I felt I was waiting for someone. I didn't know who. I'd look at the tunnel entrance as if a person might walk in, carrying good news.\"", ja: "「毎朝、だれかを待っておる気がしたからじゃ。だれかはわからん。だれかが朗報を持って入ってきそうな気がして、トンネルの入口を見ておった。」" },
  { who: "garo", en: "\"And every night, I worked on this coat. My hands knew how to sew it, even when my head had forgotten why.\"", ja: "「そして毎晩、この上着を縫っておった。頭がなぜかを忘れても、手は縫い方を覚えておったんじゃ。」" },
  { who: "lina", face: "smile", en: "\"Hands remember things that hearts are afraid to.\"", ja: "「心がこわがって思い出せないことを、手は覚えているものよ。」" },
  { who: "garo", en: "\"Hmph. Library girls and their pretty sayings. ...But maybe you're right.\"", ja: "「ふん。図書館の娘は、気のきいたことを言いおる。……じゃが、そうかもしれんな。」" }
]);

/* ───────── 第4章 ───────── */
rpgAddAfter("c4", "The waterway was dark and cold.", [
  { who: null, en: "Halfway through, they found a small boat tied to a post. An old boatman sat in it, fishing in the black water with no bait on his hook.", ja: "途中で、杭につながれた小舟を見つけた。年老いた渡し守が乗っていて、えさもつけずに黒い水に釣り糸をたらしていた。" },
  { who: "boatman", en: "\"Don't mind me. I'm not trying to catch anything. I'm just waiting until I remember why I came down here.\"", ja: "「気にせんでくれ。何か釣ろうとしとるわけじゃない。なんでここへ下りてきたのか、思い出すのを待っとるだけじゃ。」" },
  { who: "ren", en: "\"How long have you been waiting?\"", ja: "「どれくらい待ってるんですか？」" },
  { who: "boatman", en: "\"Long enough that I've forgotten that too. Ha! But I'll tell you something useful. The guards above take memories at the gate. The sadder the memory, the more they want it.\"", ja: "「それも忘れてしまうくらい長くじゃよ。はっは！だが、役に立つことを教えてやろう。上の衛兵は門で記憶を取り上げる。悲しい記憶ほど、欲しがるのさ。」" },
  { who: "garo", en: "\"Why would anyone want sad memories?\"", ja: "「なんでまた、悲しい記憶なんぞ欲しがるんじゃ？」" },
  { who: "boatman", en: "\"Because sad memories are the heaviest. And the Queen in the sky collects heavy things to keep her castle floating. That's what the smugglers say, anyway.\"", ja: "「悲しい記憶がいちばん重いからさ。空の女王は、城を浮かべておくために重いものを集めとる。少なくとも、密輸人どもはそう言っとる。」" },
  { who: "lina", face: "surprised", en: "\"A Queen in the sky...?\"", ja: "「空の女王……？」" }
]);
rpgAddAfter("c4", "\"Thank you. I'll tell you everything someday.", [
  { who: null, en: "Further on, they heard voices. Two men in dark cloaks were loading glowing jars onto a cart.", ja: "さらに進むと、声が聞こえた。黒いマントの男がふたり、光るびんを荷車に積んでいた。" },
  { who: "smuggler", en: "\"Careful with that one. It's a first kiss. Very rare, very expensive. The rich folks in the capital will pay a fortune for it.\"", ja: "「そいつは慎重に扱え。初めてのキスだ。めったにない、高く売れる。王都の金持ちどもが大金を払うぞ。」" },
  { who: "ren", en: "\"You're selling people's memories?\"", ja: "「人の記憶を売ってるのか？」" },
  { who: "smuggler", en: "\"Selling? We're saving them! The castle burns whatever people give up. We pick up what we can before it reaches the fire. Somebody might as well enjoy them.\"", ja: "「売ってる？救ってるんだよ！城は人が手放したものを全部燃やす。火に届く前に、拾えるだけ拾ってるのさ。だれかが楽しんだっていいだろう。」" },
  { who: "lina", en: "\"Memories belong to the people who made them.\"", ja: "「記憶は、それをつくった人のものよ。」" },
  { who: "smuggler", en: "\"Then tell those people to stop throwing them away, miss.\"", ja: "「なら、その人たちに捨てるのをやめろって言ってくれよ、お嬢さん。」" },
  { who: null, en: "Nobody could answer him. The smugglers pushed their cart into the dark and were gone.", ja: "だれも言い返せなかった。密輸人たちは荷車を押して、暗闇の中へ消えていった。" }
]);

/* ───────── 第5章 ───────── */
rpgAddAfter("c5", "\"Mercy? A man who forgets his own daughter", [
  { who: null, en: "In the main square, a long line of people waited in front of a white tent. Above it hung a banner: \"Leave your burden. Walk away light.\"", ja: "中央広場では、白いテントの前に長い列ができていた。その上に旗がかかっていた。「重荷を置いていきなさい。軽くなって歩き出しなさい」。" },
  { who: null, en: "A young mother stood in line, holding a crying baby. A soldier with one arm. An old man whose wife had left him. A boy who had failed his exam.", ja: "泣いている赤ん坊を抱いた若い母親が並んでいた。片腕の兵士。妻に去られた老人。試験に落ちた少年。" },
  { who: "ren", en: "\"A boy who failed his exam...\"", ja: "「試験に落ちた少年……」" },
  { who: "garo", en: "\"Ha. Don't get any ideas, boy. Your exams are still waiting for you back home.\"", ja: "「はっ。妙な気を起こすなよ、坊主。おまえの試験は、元の世界でまだ待っとるんじゃろう。」" },
  { who: "ren", face: "smile", en: "\"Don't remind me.\"", ja: "「思い出させるなよ。」" },
  { who: "lina", face: "sad", en: "\"Look at their faces when they come out. They're smiling. But they don't look at anyone. It's as if they're walking alone in an empty world.\"", ja: "「出てくる人たちの顔を見て。笑ってる。でも、だれのことも見ていない。からっぽの世界を、ひとりで歩いているみたい。」" }
]);
rpgAddAfter("c5", "\"...Strange. When your sword hit my armor,", [
  { who: "captain", en: "\"My mother sang to me every night when I was small. A song about a little boat that always found its way home.\"", ja: "「小さいころ、母は毎晩歌ってくれた。いつでも家に帰る道を見つける、小さな舟の歌だ。」" },
  { who: "captain", en: "\"When she died, I gave her song to the tent. I thought being a good soldier meant feeling nothing. I was wrong.\"", ja: "「母が亡くなったとき、わたしはその歌をテントに差し出した。よい兵士とは何も感じないことだと思っていた。まちがいだった。」" },
  { who: "captain", en: "\"Go. I will tell the guards that I lost you in the corridors. It's the first order I've disobeyed in twenty years.\"", ja: "「行け。衛兵には、廊下でおまえたちを見失ったと言っておく。20年で初めて、命令に背くことになるな。」" }
]);

/* ───────── 第6章 ───────── */
rpgAddAfter("c6", "\"So many... Is Ella's memory of me burning here too?\"", [
  { who: "priest", en: "\"Welcome, travelers. I am the Lantern Keeper. I tend these flames until they go out.\"", ja: "「ようこそ、旅の方。わたしは灯守り。この炎たちが消えるまで、世話をしているのです。」" },
  { who: "ren", en: "\"Can you put them back? Into the people they came from?\"", ja: "「元の人に戻せないのか？」" },
  { who: "priest", en: "\"Only if the person truly wants them back. A memory cannot be forced on someone. It must be welcomed home.\"", ja: "「その人が本当に取り戻したいと願った場合だけです。記憶は押しつけることはできない。おかえりと迎えてもらわなければならないのです。」" },
  { who: null, en: "Ren walked slowly along the wall of flames. Suddenly he stopped. One small flame showed a kitchen he knew well: his mother, laughing, holding a birthday cake with fifteen candles.", ja: "レンはゆっくりと炎の壁に沿って歩いた。突然、足が止まった。小さな炎のひとつに、よく知っている台所が映っていた。母が笑いながら、15本のろうそくが立ったケーキを持っている。" },
  { who: "ren", face: "surprised", en: "\"That's Mio's fifteenth birthday... This is Mom's memory. She gave it up?\"", ja: "「ミオの15歳の誕生日だ……これ、母さんの記憶だ。母さん、手放したのか？」" },
  { who: "lina", face: "sad", en: "\"Not by choice, Ren. When Mio wished to be forgotten, every memory of her in your world fell here. Your mother didn't give it up. It was taken.\"", ja: "「自分で選んだんじゃないわ、レン。ミオが忘れられたいと願ったとき、あなたの世界にあった彼女の記憶が全部ここに落ちてきたの。お母さんは手放したんじゃない。奪われたのよ。」" },
  { who: "ren", en: "\"Then I'll bring them all back. Every single one.\"", ja: "「なら、全部取り戻す。ひとつ残らず。」" },
  { who: "priest", en: "\"Then you must reach the one who made the wish. Only she can undo it.\"", ja: "「では、願いをかけた本人のもとへ行かねばなりません。それを解けるのは、彼女だけです。」" }
]);

/* ===== 宿屋で泊まったときの仲間の会話（条件に合う、まだ見ていないものを1つ） ===== */
const GINNTALK = [
  { id: "inn1", need: "lina_joined", not: "c1_done", nodes: [
    { who: null, en: "That night, Ren couldn't sleep. He went downstairs and found Lina reading by the fire.", ja: "その夜、レンは眠れなかった。階下へ下りると、リナが暖炉のそばで本を読んでいた。" },
    { who: "lina", en: "\"Can't sleep? Me neither. I always read when my head is too full.\"", ja: "「眠れないの？わたしも。頭がいっぱいのときは、いつも本を読むの。」" },
    { who: "ren", en: "\"What are you reading?\"", ja: "「何を読んでるんだ？」" },
    { who: "lina", face: "smile", en: "\"A cookbook from your world. Nobody has cooked these recipes in a hundred years. Listen: \"Grandmother's Sunday Stew. Add love generously.\"\"", ja: "「あなたの世界の料理の本。このレシピ、100年だれも作ってないの。聞いて。『おばあちゃんの日曜シチュー。愛情をたっぷり入れること』。」" },
    { who: "ren", face: "smile", en: "\"That's not a real measurement.\"", ja: "「それ、分量じゃないだろ。」" },
    { who: "lina", face: "smile", en: "\"It's the most important one, though.\"", ja: "「でも、いちばん大事な分量よ。」" }
  ] },
  { id: "inn2", need: "c1_done", not: "c2_done", nodes: [
    { who: "ren", en: "\"Lina, how long have you lived in the library?\"", ja: "「リナ、図書館にはどれくらい住んでるんだ？」" },
    { who: "lina", en: "\"Longer than I can count. The days in Aster are strange. They don't add up the way they do in your world.\"", ja: "「数えきれないくらい。アスターの日々はふしぎなの。あなたの世界みたいに、足し算にならない。」" },
    { who: "ren", en: "\"Do you have a family?\"", ja: "「家族はいるのか？」" },
    { who: "lina", face: "sad", en: "\"I... I think I had a mother who braided my hair every morning. I remember the feeling of her fingers. But not her face.\"", ja: "「わたし……毎朝、髪を編んでくれるお母さんがいた気がする。指の感触は覚えてる。でも、顔は思い出せない。」" },
    { who: "ren", en: "\"...Sorry. I shouldn't have asked.\"", ja: "「……ごめん。聞くべきじゃなかった。」" },
    { who: "lina", face: "smile", en: "\"No, I'm glad you did. Nobody has asked me that in a very long time.\"", ja: "「ううん、聞いてくれてうれしい。そんなこと聞かれたの、ずいぶん久しぶりだから。」" }
  ] },
  { id: "inn3", need: "c4_done", not: "c5_done", nodes: [
    { who: null, en: "In the capital inn, Garo was snoring loudly. Ren and Lina sat by the window, looking at the white castle under the moon.", ja: "王都の宿屋で、ガロは大いびきをかいていた。レンとリナは窓辺に座り、月の下の白い城をながめていた。" },
    { who: "ren", en: "\"Garo snores like a broken engine.\"", ja: "「ガロのいびき、壊れたエンジンみたいだな。」" },
    { who: "lina", face: "smile", en: "\"I think it's comforting. It means someone is here, alive and safe.\"", ja: "「わたしは、ほっとする音だと思う。だれかがここにいて、生きていて、無事だっていう音だから。」" },
    { who: "ren", en: "\"Back home, I used to complain about Mio's alarm clock. It rang five times every morning, and she never woke up until the last one.\"", ja: "「元の世界じゃ、ミオの目覚まし時計に文句ばっかり言ってた。毎朝5回鳴って、最後の1回まで絶対に起きないんだ。」" },
    { who: "ren", face: "sad", en: "\"This past year, the house has been so quiet. I'd give anything to hear that stupid alarm again.\"", ja: "「この1年、家がすごく静かなんだ。あのうるさい目覚ましがまた聞けるなら、なんだってする。」" },
    { who: "lina", en: "\"Then let's make sure you do.\"", ja: "「なら、絶対に聞けるようにしましょう。」" }
  ] },
  { id: "inn4", need: "c5_done", not: "c7_done", nodes: [
    { who: "garo", en: "\"Boy. Can I ask you something? What will you say to your sister when you find her?\"", ja: "「坊主。ひとつ聞いてもいいか？妹を見つけたら、なんと言うつもりじゃ？」" },
    { who: "ren", en: "\"...I've thought about it every day. \"Come home.\" \"I missed you.\" \"I'm sorry.\" But none of them feel right.\"", ja: "「……毎日考えてる。『帰ろう』『会いたかった』『ごめん』。でも、どれもしっくりこないんだ。」" },
    { who: "garo", en: "\"When Ella left for the capital, I said, \"Don't forget to eat.\" That was all. I regretted it for years.\"", ja: "「エラが王都へ発つとき、わしは『ちゃんと食えよ』とだけ言った。それだけじゃ。何年も後悔した。」" },
    { who: "garo", en: "\"But now I think it was fine. She knew what I meant. Sometimes the simplest words carry the most.\"", ja: "「じゃが今は、あれでよかったと思う。あの子はわしの言いたいことをわかっとった。いちばん単純な言葉が、いちばん多くを運ぶこともある。」" },
    { who: "ren", face: "smile", en: "\"...Thanks, Garo.\"", ja: "「……ありがとな、ガロ。」" }
  ] }
];

/* ===== 町の人の長い会話 ===== */
Object.assign(GLINES, {
  baker: [
    { who: "baker", en: "\"Fresh bread! The price? Hmm... I wrote it on a card, but I can't read my own handwriting anymore.\"", ja: "「焼きたてのパンだよ！お値段？うーん……札に書いたんだけど、もう自分の字が読めなくて。」" },
    { who: "baker", en: "\"You know, I've baked the same bread every morning for twenty years. My hands know the recipe, but I've forgotten who taught it to me.\"", ja: "「ねえ、わたし20年、毎朝同じパンを焼いてるの。手はレシピを覚えてる。でも、だれに教わったのかは忘れちゃった。」" },
    { who: "baker", en: "\"Sometimes, when the dough rises just right, I feel like someone is standing behind me, smiling. Isn't that strange?\"", ja: "「ときどき、生地がちょうどよくふくらむと、だれかがうしろでほほえんでいる気がするの。ふしぎでしょう？」" }
  ],
  boy: [
    { who: "child", en: "\"That girl over there is my best friend. I think. She told me so this morning.\"", ja: "「あそこの子、ぼくの親友なんだ。たぶん。今朝、本人がそう言ってた。」" },
    { who: "child", en: "\"Every morning we introduce ourselves again. It's kind of fun, actually. We become best friends every single day.\"", ja: "「毎朝、自己紹介しなおすんだ。じつはけっこう楽しいよ。毎日、親友になれるんだもん。」" },
    { who: "child", en: "\"But yesterday she cried and said she was scared that one day she wouldn't want to be my friend. I didn't know what to say.\"", ja: "「でも、きのうあの子が泣いて言ったんだ。いつか、ぼくと友だちになりたいと思わなくなる日が来るのがこわいって。なんて言えばいいかわからなかった。」" }
  ],
  man: [
    { who: "villager", en: "\"I've lived here for forty years, but every morning the streets look a little less familiar.\"", ja: "「この村に40年住んでるが、毎朝、通りが少しずつ見慣れないものになっていくんだ。」" },
    { who: "villager", en: "\"Yesterday I walked into the wrong house and sat down for dinner. The family was very kind about it. They gave me soup.\"", ja: "「きのうは、まちがえてよその家に入って、夕食の席についてしまった。その家族はとても親切でね。スープを出してくれたよ。」" },
    { who: "villager", en: "\"Maybe that's what will save us in the end. Even if we forget each other, we can still be kind to strangers.\"", ja: "「最後にわたしたちを救うのは、そういうことなのかもしれん。たとえおたがいを忘れても、知らない人にやさしくすることはできる。」" }
  ],
  capital_man: [
    { who: "villager", en: "\"I gave away the memory of my first love. Now I can't remember why I feel lonely at night.\"", ja: "「初恋の記憶を差し出したんだ。今は、なぜ夜になるとさびしいのか思い出せない。」" },
    { who: "villager", en: "\"The tent said I'd feel lighter. And I do. But lighter isn't the same as happier, is it?\"", ja: "「テントの人は、軽くなるって言った。たしかに軽い。でも、軽いってことは、幸せってことと同じじゃないよな。」" }
  ],
  capital_scholar: [
    { who: "scholar", en: "\"Are you travelers? Then let me tell you the history of this city, before I forget it too.\"", ja: "「旅の方ですか？では、この街の歴史をお話ししましょう。わたしまで忘れてしまう前に。」" },
    { who: "scholar", en: "\"Aster's capital was built by people who refused to let anything be lost. The Great Library was its heart. Every citizen once donated one book a year.\"", ja: "「アスターの王都は、何ひとつ失わせまいとした人々が築いた街です。大図書館はその心臓でした。市民はかつて、毎年1冊ずつ本を寄贈していたのです。」" },
    { who: "scholar", en: "\"Now the library is sealed, and people line up to give away their memories instead. I wonder what the founders would say.\"", ja: "「今では図書館は封印され、人々は本の代わりに記憶を差し出す列に並んでいる。建国者たちが見たら、なんと言うでしょうね。」" }
  ],
  capital_widow: [
    { who: "widow", en: "\"My husband died last spring. Everyone tells me to visit the white tent. They say I'll stop hurting.\"", ja: "「夫は去年の春に亡くなりました。みんな、白いテントに行けと言います。痛みが消えるから、と。」" },
    { who: "widow", en: "\"But if I stop hurting, I'll stop remembering how he hummed while he shaved. How he burned the toast every morning.\"", ja: "「でも、痛みが消えたら、ひげをそりながら鼻歌を歌っていたことも、毎朝トーストを焦がしていたことも、思い出せなくなる。」" },
    { who: "widow", en: "\"So I keep the pain. It's the last thing he gave me.\"", ja: "「だから、痛みは持っておくの。それが、あの人がくれた最後のものだから。」" }
  ],
  capital_soldier: [
    { who: "soldier", en: "\"Captain Varos? He used to be the kindest officer in the castle. He'd sing to the new recruits when they were homesick.\"", ja: "「ヴァロス隊長？昔は城でいちばんやさしい士官だったよ。新兵がホームシックになると、歌を歌ってやってたんだ。」" },
    { who: "soldier", en: "\"Then his mother died, and he went to the white tent. He hasn't sung since. Now he just follows orders.\"", ja: "「でもお母さんが亡くなって、白いテントへ行った。それ以来、一度も歌ってない。今は命令に従うだけさ。」" }
  ],
  village_kid2: [
    { who: "child", en: "\"Do you want to see my diary? I write down everyone's name every night, so I won't forget them.\"", ja: "「ぼくの日記、見る？忘れないように、毎晩みんなの名前を書いてるんだ。」" },
    { who: "child", en: "\"Look, here's you. \"The red-haired boy who looked sad.\" I don't know your name yet, so I wrote that.\"", ja: "「ほら、ここにお兄さんのことも書いた。『悲しそうな顔をした赤い髪の人』。名前はまだ知らないから、そう書いたんだ。」" },
    { who: "ren", face: "smile", en: "\"It's Ren. You can write that instead.\"", ja: "「レンだよ。そう書いといてくれ。」" }
  ]
});
// 新しい町の人
GMAPS.village.npcs.push({ id: "kid2", sprite: "boy", x: 21, y: 12, dir: 3, lines: "village_kid2" });
GMAPS.capital.npcs.push(
  { id: "c_scholar", sprite: "oldman", x: 4, y: 11, dir: 2, lines: "capital_scholar" },
  { id: "c_widow", sprite: "oldwoman", x: 20, y: 11, dir: 1, lines: "capital_widow" },
  { id: "c_soldier", sprite: "soldier", x: 13, y: 15, dir: 0, lines: "capital_soldier" }
);

/* ===== 『Aster Ⅰ』書き足し その2（序章〜第6章） ===== */
/* ───────── 序章：車掌との会話 ───────── */
rpgAddBefore("p0", "\"Before we arrive, I must check your ticket.", [
  { who: "conductor", en: "\"You seem troubled, young man. Most passengers on this train are.\"", ja: "「お悩みのようですね、お若い方。この列車のお客さまは、たいていそうです。」" },
  { who: "ren", en: "\"How long have you been doing this job?\"", ja: "「この仕事、どれくらいやってるんですか？」" },
  { who: "conductor", en: "\"Since the first person in history was forgotten. I've carried kings and beggars, lovers and enemies. In the end, they all look the same: tired, and a little afraid.\"", ja: "「歴史上はじめて、だれかが忘れられたときからです。王も物乞いも、恋人も敵も乗せてきました。最後には、みんな同じ顔をしています。疲れていて、少しおびえている。」" },
  { who: "ren", en: "\"Do any of them ever go back?\"", ja: "「だれか、戻った人はいるんですか？」" },
  { who: "conductor", en: "\"A few. The ones who were remembered by someone stubborn enough to come and get them.\"", ja: "「ほんのわずかに。迎えに来るほど頑固なだれかに、覚えていてもらえた人たちだけです。」" },
  { who: "ren", face: "smile", en: "\"Then I'll be stubborn.\"", ja: "「なら、頑固になりますよ。」" },
  { who: "conductor", en: "\"Good. Stubbornness is underrated. It has saved more people than courage ever has.\"", ja: "「けっこう。頑固さは過小評価されています。勇気よりも多くの人を救ってきたのですよ。」" }
]);

/* ───────── 第1章：村の散歩 ───────── */
rpgAddBefore("c1", "The elder's house had a cellar lit by a single torch.", [
  { who: null, en: "On the way to the elder's house, they passed a small school. Inside, a teacher was writing the same sentence on the blackboard again and again.", ja: "長老の家へ向かう途中、小さな学校の前を通った。中では先生が、黒板に同じ文を何度も何度も書いていた。" },
  { who: null, en: "\"My name is Clara. I teach here. My students are...\" Each time, she stopped at the same place and erased everything.", ja: "「わたしの名前はクララ。ここで教えています。わたしの生徒は……」。毎回、同じところで手が止まり、全部消してしまう。" },
  { who: "ren", en: "\"The classroom is empty. Where are the students?\"", ja: "「教室は空っぽだ。生徒はどこにいるんだ？」" },
  { who: "lina", face: "sad", en: "\"The children forgot that they go to school. And she forgot their names. So every day she comes here and waits, without knowing who she's waiting for.\"", ja: "「子どもたちは、学校に通っていることを忘れてしまったの。先生は子どもたちの名前を忘れた。だから毎日ここへ来て、だれを待っているのかもわからないまま待っているの。」" },
  { who: "ren", en: "\"...Can we do anything for her?\"", ja: "「……何かしてあげられないのか？」" },
  { who: "lina", en: "\"Not yet. But if we stop the Fading, the children will remember the way here. I believe that.\"", ja: "「今はまだ。でも色あせを止めれば、子どもたちはここへの道を思い出す。わたしはそう信じてる。」" },
  { who: null, en: "Ren picked up a piece of chalk and wrote at the bottom of the board: \"Your students will come back. —A traveler.\"", ja: "レンはチョークを拾い、黒板のいちばん下に書いた。「生徒は戻ってきます。――旅人より」。" }
]);
rpgAddAfter("c1", "\"The Fading started at the old shrine", [
  { who: "elder", en: "\"Take this, young man. It is a map of the forest that Tobin drew for me. The lines are crooked, but they have never led me astray.\"", ja: "「これを持っていけ、若いの。トビンがわしに描いてくれた森の地図じゃ。線はゆがんでおるが、一度もわしを迷わせたことはない。」" },
  { who: "ren", en: "\"Are you sure? It's precious to you.\"", ja: "「いいんですか？大切なものでしょう。」" },
  { who: "elder", en: "\"That is exactly why I give it to you. A precious thing kept in a box is only half alive. Let it be useful again.\"", ja: "「だからこそ渡すのじゃ。大切なものは、箱にしまっておくと半分しか生きておらん。また役に立たせてやってくれ。」" }
]);

/* ───────── 第2章：森の夜の野営 ───────── */
rpgAddBefore("c2", "At the center of the ruins was a dark archway.", [
  { who: null, en: "Night fell before they reached the ruins. They made a small fire beneath an old tree, and Lina's lantern hung from a branch above them.", ja: "遺跡に着く前に夜になった。古い木の下で小さな火をおこし、リナのランタンを頭上の枝につるした。" },
  { who: "ren", en: "\"Lina, you said the library is where you grew up. What's it like?\"", ja: "「リナ、図書館で育ったって言ってたよな。どんなところなんだ？」" },
  { who: "lina", face: "smile", en: "\"It's enormous. The shelves are so high that the librarians use ladders with wheels to reach the top. When I was small, I used to ride them like a train.\"", ja: "「すごく大きいの。本棚が高すぎて、司書たちは車輪のついたはしごで上まで行くのよ。小さいころ、それに乗って電車ごっこをしてたの。」" },
  { who: "lina", en: "\"My favorite place was the Room of Unfinished Stories. It's full of books whose authors died before they could write the ending.\"", ja: "「いちばん好きだったのは『未完の物語の部屋』。作者が結末を書く前に亡くなってしまった本ばかりが置いてあるの。」" },
  { who: "ren", en: "\"That sounds kind of sad.\"", ja: "「なんだか、さびしい場所だな。」" },
  { who: "lina", face: "smile", en: "\"I didn't think so. I used to make up endings for them. Happy ones, mostly. I thought maybe the authors would like that.\"", ja: "「わたしはそう思わなかった。よく、結末を自分で考えてたの。だいたいはハッピーエンド。作者もそのほうが喜ぶかなって。」" },
  { who: "ren", en: "\"What about your own story? How does that one end?\"", ja: "「きみ自身の物語は？それはどう終わるんだ？」" },
  { who: "lina", face: "sad", en: "\"...I haven't decided yet. Maybe you can help me write it.\"", ja: "「……まだ決めてないの。もしかしたら、あなたがいっしょに書いてくれるかも。」" },
  { who: null, en: "The fire crackled. Above them, the lantern's light trembled, as if it were listening.", ja: "火がぱちぱちと鳴った。頭上で、ランタンの光が、まるで耳を傾けているかのようにふるえていた。" }
]);

/* ───────── 第3章：鉱夫の歌 ───────── */
rpgAddBefore("c3", "At the bottom of the cave stood a giant crystal", [
  { who: null, en: "As they descended, Garo began to hum a low, rough song. The echo filled the tunnel, and the crystals seemed to glow a little brighter.", ja: "下っていくにつれて、ガロが低く、しわがれた歌を口ずさみ始めた。こだまがトンネルを満たし、水晶が少し明るく光った気がした。" },
  { who: "ren", en: "\"What's that song?\"", ja: "「それ、なんの歌だ？」" },
  { who: "garo", en: "\"A miner's song. We sing it so the mountain knows we're friends, not thieves. My father taught it to me, and his father taught it to him.\"", ja: "「鉱夫の歌じゃ。わしらが泥棒じゃなく、友だちだと山にわかってもらうために歌う。親父に教わって、親父はそのまた親父に教わった。」" },
  { who: "garo", en: "\"\"Dig with care and dig with heart, the mountain gives to those who ask. Take a little, leave the rest, and come home safely to your bed.\"\"", ja: "「『心をこめて、ていねいに掘れ。山は、たずねる者に恵みをくれる。少しだけもらい、残りは置いて、無事に自分の寝床へ帰れ』」" },
  { who: "lina", face: "smile", en: "\"That's beautiful.\"", ja: "「すてきな歌。」" },
  { who: "garo", en: "\"There was a fourth line. Something about a child waiting at home. I've forgotten it.\"", ja: "「4行目があったんじゃ。家で待っとる子どものことを歌った行が。忘れてしもうた。」" },
  { who: "ren", en: "\"Maybe you'll remember it when we find Ella.\"", ja: "「エラを見つけたら、思い出せるかもな。」" },
  { who: "garo", en: "\"Hmph. Maybe.\"", ja: "「ふん。かもしれんな。」" }
]);
rpgAddAfter("c3", "\"...Ella. My daughter, Ella. How could I have forgotten you?\"", [
  { who: "garo", en: "\"\"...and a little one waits at home with a candle in the window.\" That's the fourth line. That's the line I sang for her every night.\"", ja: "「『……そして小さな子が、窓にろうそくをともして家で待っている』。それが4行目じゃ。毎晩、あの子に歌ってやった行じゃ。」" },
  { who: null, en: "Garo sang the whole song from beginning to end. His voice cracked on the last line, but he did not stop.", ja: "ガロは歌を最初から最後まで歌った。最後の行で声がかすれたが、彼は歌うのをやめなかった。" }
]);

/* ───────── 第4章：水路の子ども ───────── */
rpgAddBefore("c4", "Near the exit, the water began to swirl.", [
  { who: null, en: "In a dry corner of the waterway, they found a little girl sitting alone, drawing pictures on the wall with a piece of charcoal.", ja: "水路の乾いた片すみで、女の子がひとり座りこみ、炭のかけらで壁に絵を描いていた。" },
  { who: "child", en: "\"Shh. I'm hiding. My parents went to the white tent, and when they came back, they didn't know me.\"", ja: "「しーっ。隠れてるの。お父さんとお母さんが白いテントに行って、帰ってきたら、わたしのことがわからなくなってたの。」" },
  { who: "child", en: "\"They gave away the memory of the day my little brother got sick. But I was in that memory too. So they lost me with it.\"", ja: "「弟が病気になった日の記憶を差し出したんだって。でも、その記憶にはわたしもいたの。だから、いっしょにわたしもなくしちゃった。」" },
  { who: "ren", face: "sad", en: "\"...That's what happens. You can't cut out just the painful part.\"", ja: "「……そういうことなんだな。つらいところだけを切り取ることはできないんだ。」" },
  { who: "garo", en: "\"Come, little one. When we're done, we'll take you home, and we'll make your parents remember. I swear it on my beard.\"", ja: "「おいで、ちびすけ。用がすんだら家まで送って、親御さんに思い出させてやる。このひげにかけて誓う。」" },
  { who: "child", en: "\"...Your beard is very big. So it must be a big promise.\"", ja: "「……おじさんのひげ、すごく大きいね。じゃあ、大きな約束なんだね。」" },
  { who: "garo", en: "\"The biggest.\"", ja: "「いちばん大きな約束じゃ。」" }
]);

/* ───────── 第5章：テントの中 ───────── */
rpgAddBefore("c5", "In the great hall of the White Castle,", [
  { who: null, en: "Ren slipped into the white tent. Inside, it was quiet and warm. A woman in a gray robe sat at a table covered with empty glass jars.", ja: "レンは白いテントに忍びこんだ。中は静かで、あたたかかった。灰色のローブの女性が、空のガラスびんでいっぱいのテーブルの前に座っていた。" },
  { who: "voice", en: "\"Welcome. Please sit down. Which memory would you like to leave with us today?\"", ja: "「いらっしゃいませ。どうぞおかけください。今日はどの記憶を置いていかれますか？」" },
  { who: "ren", en: "\"I'm not here to leave anything. Where do these memories go?\"", ja: "「何も置いていくつもりはない。ここの記憶は、どこへ行くんだ？」" },
  { who: "voice", en: "\"Up. To the one who carries everyone's sorrow so that we don't have to. She is very kind. She never says no.\"", ja: "「上へ。わたしたちの代わりに、みんなの悲しみを背負ってくださる方のもとへ。とてもおやさしい方です。決して断ることがありません。」" },
  { who: "ren", en: "\"She...?\"", ja: "「その方……？」" },
  { who: "voice", en: "\"We call her the Queen. Nobody has seen her face. But they say she wears a blue ribbon.\"", ja: "「わたしたちは女王とお呼びしています。お顔を見た者はいません。でも、青いリボンをつけていらっしゃるそうですよ。」" },
  { who: null, en: "Ren's heart stopped for a moment. He walked out of the tent without another word.", ja: "レンの心臓が一瞬止まった。彼はそれ以上何も言わずに、テントを出た。" },
  { who: "lina", face: "surprised", en: "\"Ren? What happened? You look pale.\"", ja: "「レン？どうしたの？顔が真っ青よ。」" },
  { who: "ren", en: "\"...Nothing. Let's go to the castle. I need answers.\"", ja: "「……なんでもない。城へ行こう。答えが必要なんだ。」" }
]);

/* ───────── 第6章：記憶の炎の中のハル ───────── */
rpgAddBefore("c6", "At the end of the corridor, a pale figure appeared.", [
  { who: null, en: "Deeper in the hall, one flame burned much brighter than the others. Inside it, two girls in school uniforms were laughing under a cherry tree.", ja: "回廊のさらに奥で、ひとつの炎がほかよりずっと明るく燃えていた。その中で、制服の女の子がふたり、桜の木の下で笑っていた。" },
  { who: "haru", en: "\"Mio, you have to show your drawings to someone! They're too good to keep in a notebook!\"", ja: "「ミオ、絵をだれかに見せなきゃだめだよ！ノートにしまっておくなんて、もったいなさすぎる！」" },
  { who: "mio", face: "smile", en: "\"No way. They're embarrassing. You're the only one who's allowed to see them, Haru.\"", ja: "「むりむり。はずかしいもん。見ていいのはハルだけだよ。」" },
  { who: "haru", en: "\"Then promise me. When we're grown up, you'll draw the cover of my first book. I'm going to be a writer, you know.\"", ja: "「じゃあ約束して。大人になったら、わたしの最初の本の表紙を描いてよ。わたし、作家になるんだからね。」" },
  { who: "mio", face: "smile", en: "\"Okay. It's a promise.\"", ja: "「うん。約束。」" },
  { who: "ren", face: "sad", en: "\"Haru... I remember her. She came to our house all the time. She always ate the last cookie and blamed it on me.\"", ja: "「ハル……覚えてる。しょっちゅう家に来てた。いつも最後のクッキーを食べて、俺のせいにしてたっけ。」" },
  { who: "lina", face: "sad", en: "\"This is Mio's most precious memory. And she threw it away too.\"", ja: "「これは、ミオのいちばん大切な記憶ね。それなのに、これさえ手放してしまったのね。」" },
  { who: "ren", en: "\"No. She didn't throw it away. You don't burn something this bright unless it hurts to look at.\"", ja: "「ちがう。捨てたんじゃない。見るのがつらくなければ、こんなに明るいものを燃やしたりしない。」" }
]);

/* ===== 宿屋の会話（追加） ===== */
GINNTALK.push(
  { id: "inn5", need: "garo_joined", not: "c4_done", nodes: [
    { who: "garo", en: "\"Boy, why do you dye your hair that ridiculous color?\"", ja: "「坊主、なんでまた髪をそんなおかしな色に染めとるんじゃ？」" },
    { who: "ren", en: "\"Mio said it would suit me. She said I looked like the hero in her favorite game.\"", ja: "「ミオが、似合うって言ってたんだ。好きなゲームの主人公みたいだって。」" },
    { who: "garo", en: "\"And did you believe her?\"", ja: "「で、その言葉を信じたのか？」" },
    { who: "ren", face: "smile", en: "\"Not at all. I thought it would look terrible. But after she was gone, it was the only thing she'd asked me that I could still do.\"", ja: "「全然。絶対ひどいことになると思ってた。でも、あいつがいなくなってから、あいつに頼まれたことで、まだ俺にできるのはそれだけだったんだ。」" },
    { who: "garo", en: "\"...It doesn't look terrible. Don't tell anyone I said that.\"", ja: "「……ひどくはないぞ。わしがそう言ったことは、だれにも言うなよ。」" }
  ] },
  { id: "inn6", need: "c6_done", not: "c7_done", nodes: [
    { who: "lina", en: "\"Ren, are you awake? ...I keep thinking about the flame with Haru in it.\"", ja: "「レン、起きてる？……ハルが映っていた炎のことが、頭から離れないの。」" },
    { who: "ren", en: "\"Me too. I'm angry at Mio for not telling me. And I'm angry at myself for not asking.\"", ja: "「俺もだ。何も言わなかったミオに腹が立つ。それに、聞かなかった自分にも。」" },
    { who: "lina", en: "\"People who are hurting often think that silence protects others. But silence is heavy. It just moves the weight somewhere else.\"", ja: "「傷ついている人は、黙っていればまわりを守れると思いがちなの。でも沈黙は重い。重さをどこか別の場所へ移すだけ。」" },
    { who: "ren", en: "\"Is that why you don't tell me about your lantern?\"", ja: "「だから、きみはランタンのことを話さないのか？」" },
    { who: "lina", face: "sad", en: "\"...You're sharper than you look, Ren.\"", ja: "「……見た目より鋭いのね、レン。」" }
  ] }
);

/* ===== 町の人の会話（追加） ===== */
Object.assign(GLINES, {
  girl: [
    { who: "child", en: "\"I keep a diary so I don't forget. But some pages are turning gray.\"", ja: "「忘れないように日記をつけてるの。でも、ページがところどころ灰色になってきてる。」" },
    { who: "child", en: "\"This page says, \"Today Tom gave me a flower.\" But I don't remember who Tom is. Is it the boy over there?\"", ja: "「このページには『今日、トムがお花をくれた』って書いてある。でもトムがだれか覚えてないの。あそこの男の子かな？」" },
    { who: "child", en: "\"I'll ask him tomorrow. And I'll write down his answer, so I can ask him again the day after.\"", ja: "「あした聞いてみる。それで、答えを日記に書いておくの。そうしたら、あさってもまた聞けるでしょ。」" }
  ],
  oldwoman: [
    { who: "villager", en: "\"Elder Bram lives in the house with the blue roof. He has been sitting in his cellar for days.\"", ja: "「ブラム長老は青い屋根の家に住んでいるよ。もう何日も地下室にこもっているんだ。」" },
    { who: "villager", en: "\"He used to tell the best stories at the harvest festival. The children would sit around him for hours.\"", ja: "「収穫祭では、いちばんおもしろい話をしてくれる人だったんだよ。子どもたちは何時間もまわりに座って聞いていたもんさ。」" },
    { who: "villager", en: "\"Last year, he couldn't remember the ending of any of them. He just stopped in the middle and stared at the sky.\"", ja: "「去年は、どの話も結末が思い出せなくてね。途中で止まって、空を見つめていたよ。」" }
  ],
  guard: [
    { who: "guard", en: "\"The road north leads to the Whispering Forest. Monsters appear there, so prepare well before you go.\"", ja: "「北の道はささやきの森へ続いている。魔物が出るから、しっかり準備してから行くんだ。」" },
    { who: "guard", en: "\"I've been guarding this gate for ten years. I used to know why. Now I just know that if I leave, something bad might come in.\"", ja: "「この門を10年守ってきた。昔は理由を知っていた。今はただ、ここを離れたら何か悪いものが入ってくるかもしれない、ということだけわかっている。」" },
    { who: "guard", en: "\"Maybe that's enough of a reason. Good luck, travelers.\"", ja: "「理由としては、それで十分なのかもしれんな。気をつけてな、旅の人。」" }
  ],
  capital_woman: [
    { who: "villager", en: "\"The library is beside the item shop, but it's sealed. They say only someone with a true memory can open it.\"", ja: "「図書館は道具屋のとなりよ。でも封印されているの。本当の記憶を持つ人しか開けられないんですって。」" },
    { who: "villager", en: "\"When I was a girl, I borrowed a book of poems there. I never returned it. I still have it, but I've forgotten how to read the language it's written in.\"", ja: "「娘だったころ、そこで詩集を借りたの。結局返さなかった。今も持っているけど、書かれている言葉の読み方を忘れてしまったわ。」" }
  ],
  capital_guard: [
    { who: "guard", en: "\"The castle is to the north. His Majesty sees no one... but the doors are strangely open today.\"", ja: "「城は北だ。陛下はだれにもお会いにならない……だが、今日はなぜか扉が開いている。」" },
    { who: "guard", en: "\"They say the King used to walk in the gardens with the Queen every evening. Now the gardens are full of weeds, and nobody remembers why they were planted.\"", ja: "「王は昔、毎晩王妃と庭を散歩されていたそうだ。今、庭は雑草だらけで、なぜ花が植えられたのかだれも覚えていない。」" }
  ]
});

/* ===== 『Aster Ⅰ』書き足し その3（第7章〜終章） ===== */
/* ───────── 第7章 大図書館 ───────── */
rpgAddAfter("c7", "\"This is where I grew up.", [
  { who: null, en: "The library was silent, but not empty. Here and there, old librarians moved between the shelves, dusting books that nobody had opened in centuries.", ja: "図書館は静かだったが、空っぽではなかった。あちこちで年老いた司書たちが本棚のあいだを行き来し、何百年もだれも開いていない本のほこりを払っていた。" },
  { who: "scholar", en: "\"Lina? Little Lina? Is that really you? You've grown... no, wait. You haven't changed at all.\"", ja: "「リナ？ちびのリナかい？本当に？大きくなって……いや、待てよ。ちっとも変わっていないな。」" },
  { who: "lina", face: "smile", en: "\"Master Orwin! You still remember me?\"", ja: "「オーウィン先生！まだわたしのことを覚えていてくださったんですか？」" },
  { who: "scholar", en: "\"Barely. My memory is full of holes these days. But I remember a girl who rode the ladders and wrote happy endings in the margins of other people's books.\"", ja: "「かろうじてな。近ごろ、わしの記憶は穴だらけだ。だが、はしごを乗り回して、人の本の余白にハッピーエンドを書きこんでいた女の子のことは覚えておるよ。」" },
  { who: "scholar", en: "\"I scolded you every time. Now I'm grateful. Some of those books have no other ending left in the whole world.\"", ja: "「そのたびに叱ったものだ。今では感謝しておる。あの本の中には、世界中どこにも、ほかの結末が残っていないものもあるのだから。」" },
  { who: "ren", en: "\"Sir, we're looking for a book about a girl named Mio.\"", ja: "「先生、ミオという女の子についての本を探しているんです。」" },
  { who: "scholar", en: "\"The Room of Wishes, at the very bottom. But be careful. Wishes are stronger than memories. Reading one can change the reader.\"", ja: "「いちばん下の『願いの部屋』だ。だが気をつけなさい。願いは記憶よりも強い。読んだ者を変えてしまうこともある。」" }
]);
rpgAddAfter("c7", "\"Children hide the heaviest things best.", [
  { who: "ren", en: "\"There's more written here, in her handwriting. It looks like a diary.\"", ja: "「ここに、まだ続きがある。あいつの字だ。日記みたいだ。」" },
  { who: "mio", face: "sad", en: "\"\"Haru called me that morning and said she was bored. I said, let's go to the art shop. If I hadn't said that, she wouldn't have crossed that road.\"\"", ja: "「『あの朝、ハルから電話があって、ひまだって言われた。わたしは、画材屋さんに行こうって言った。わたしがそう言わなければ、ハルはあの道を渡らなかった』」" },
  { who: "mio", face: "sad", en: "\"\"Everyone says it's not my fault. But they look at me differently now. Haru's mom can't even look at me at all.\"\"", ja: "「『みんな、わたしのせいじゃないって言う。でも、わたしを見る目が変わった。ハルのお母さんは、もうわたしの顔を見ることさえできない』」" },
  { who: "mio", face: "sad", en: "\"\"Ren keeps trying to make me laugh. He's bad at it. I love him for trying. That's why I can't let him see me like this.\"\"", ja: "「『お兄ちゃんは、わたしを笑わせようとしてくる。下手くそだけど。そうやってがんばってくれるところが大好き。だから、こんなわたしを見せられない』」" },
  { who: null, en: "Ren closed the book. His hands were shaking. For a long time, nobody spoke.", ja: "レンは本を閉じた。その手はふるえていた。長いあいだ、だれも口をきかなかった。" },
  { who: "ren", face: "sad", en: "\"I thought she was just tired. I thought she'd be fine if I gave her some space. I was so stupid.\"", ja: "「疲れてるだけだと思ってた。そっとしておけば大丈夫だと思ってた。俺は、なんてばかだったんだ。」" },
  { who: "lina", en: "\"You weren't stupid. You were a brother who didn't know. There's a difference, Ren.\"", ja: "「ばかなんかじゃない。知らなかった兄だっただけ。それは、ちがうことよ、レン。」" }
]);
rpgAddAfter("c7", "\"I was forgotten by my world too, long ago.", [
  { who: "ren", en: "\"What happened to you?\"", ja: "「きみに、何があったんだ？」" },
  { who: "lina", face: "sad", en: "\"I was a librarian's daughter in a small town by the sea. There was a winter sickness. My mother and I both caught it. She got better. I didn't.\"", ja: "「わたしは海辺の小さな町の、図書館の司書の娘だったの。冬に病気がはやって、お母さんとわたしは二人ともかかった。お母さんは治った。わたしは治らなかった。」" },
  { who: "lina", en: "\"My mother grieved for years. Then she moved away and started a new life. That was the right thing to do. Slowly, the town forgot me. And one day, I woke up on a train with no number.\"", ja: "「お母さんは何年も悲しんだ。それから引っ越して、新しい生活を始めた。それは正しいことだった。町はゆっくりわたしを忘れていった。そしてある日、わたしは番号のない列車の上で目を覚ましたの。」" },
  { who: "ren", en: "\"...So you're—\"", ja: "「……じゃあ、きみは――」" },
  { who: "lina", face: "smile", en: "\"Don't make that face. I've had a long, happy time here. I had books, and friends, and now I have you two. That's more than many people get.\"", ja: "「そんな顔しないで。わたしはここで長く、幸せに過ごしてきた。本があって、友だちがいて、今はあなたたちがいる。それって、多くの人が手にできるものより、ずっと多いのよ。」" },
  { who: "garo", en: "\"...Hmph. Something got in my eye. Dust. This library is very dusty.\"", ja: "「……ふん。目に何か入った。ほこりじゃ。この図書館はほこりっぽすぎる。」" }
]);

/* ───────── 第8章 港町 ───────── */
rpgAddAfter("c8", "\"The Sunken Archive? Nobody sails there", [
  { who: "sailor", en: "\"I sailed these waters for forty years. I had a crew of twelve. Good lads, every one of them. Now I can't remember a single face.\"", ja: "「わしはこの海を40年走った。12人の乗組員がおった。みんないいやつらだった。今は、ひとりの顔も思い出せん。」" },
  { who: "sailor", en: "\"But I remember the songs we sang on deck. Funny, isn't it? The faces go first, and the songs stay. Maybe songs are harder to drown.\"", ja: "「だが、甲板で歌った歌は覚えとる。おかしなもんだろう？顔から先に消えて、歌は残る。歌は溺れにくいのかもしれんな。」" },
  { who: "garo", en: "\"Miners are the same. I forgot my daughter's face, but not the song I sang to her.\"", ja: "「鉱夫も同じじゃ。わしは娘の顔を忘れたが、あの子に歌ってやった歌は忘れんかった。」" },
  { who: "sailor", en: "\"Then you understand, dwarf. Here, take this compass. It won't point north. It points toward whatever you miss most.\"", ja: "「なら、わかるだろう、ドワーフよ。ほれ、この羅針盤を持っていけ。北は指さん。おまえがいちばん恋しいものの方角を指すんじゃ。」" },
  { who: null, en: "Ren held the compass. The needle spun once, then pointed straight up, toward the storm clouds above the sea.", ja: "レンは羅針盤を手に取った。針は一回転したあと、海の上の嵐の雲のほうへ、まっすぐ上を指した。" }
]);
rpgAddAfter("c8", "\"I'll give it back when this is over. Promise.\"", [
  { who: "ella", en: "\"Papa, you're going somewhere dangerous, aren't you? I can see it in your face.\"", ja: "「父さん、危ないところへ行くんでしょう？顔を見ればわかるわ。」" },
  { who: "garo", en: "\"I am. These two need someone to keep them alive. They're hopeless without me.\"", ja: "「ああ。このふたりには、死なせんようにする者がおらんとな。わしがおらんと、どうしようもないやつらでのう。」" },
  { who: "ella", en: "\"Then take this.\" She tied a small blue cloth around his wrist. \"It's from the blanket you made me when I was a baby. I kept it all these years without knowing why.\"", ja: "「じゃあ、これを持っていって」。彼女は父の手首に小さな青い布を結んだ。「わたしが赤ちゃんのとき、父さんが作ってくれた毛布の切れはしよ。なぜだかわからないまま、ずっと持っていたの。」" },
  { who: "garo", en: "\"...I'll bring it back. Every thread of it.\"", ja: "「……持って帰ってくる。糸の一本まで。」" },
  { who: null, en: "That night, the inn was full of noise. Ella sang the miner's song with her father, and the old sailor joined in with a sea song. Even Lina laughed until she cried.", ja: "その夜、宿屋はにぎやかだった。エラは父といっしょに鉱夫の歌を歌い、老水夫も海の歌で加わった。リナでさえ、涙が出るほど笑った。" },
  { who: "ren", face: "smile", en: "\"This is the first time since I came here that it feels like a real home.\"", ja: "「ここに来てから初めてだ。本当の家みたいだって感じるのは。」" }
]);

/* ───────── 第9章 沈んだ書庫 ───────── */
rpgAddAfter("c9", "\"My lantern keeps the water away from us.", [
  { who: null, en: "Among the sunken shelves, the books had turned into coral. When Ren touched one, a voice whispered from inside it.", ja: "沈んだ本棚のあいだで、本はさんごに変わっていた。レンがひとつに触れると、中から声がささやいた。" },
  { who: "voice", en: "\"Chapter One. The girl who lived by the sea had a mother who smelled of ink and lavender...\"", ja: "「第一章。海辺に住む少女には、インクとラベンダーのにおいのする母親がいた……」" },
  { who: "lina", face: "surprised", en: "\"That's... That's me. That's a story about me.\"", ja: "「それ……わたしだ。わたしのことを書いた物語だわ。」" },
  { who: "voice", en: "\"Every morning, the mother braided her daughter's hair and said, \"Be brave, little lantern.\" That was her nickname: Little Lantern.\"", ja: "「毎朝、母は娘の髪を編みながら言った。『勇気を出してね、小さな灯』。それが娘のあだ名だった。小さな灯、と。」" },
  { who: "lina", face: "sad", en: "\"...Little Lantern. She called me Little Lantern. I remember now. Her name was Helena. My mother's name was Helena.\"", ja: "「……小さな灯。お母さんは、わたしをそう呼んでた。思い出した。お母さんの名前はヘレナ。わたしのお母さんは、ヘレナよ。」" },
  { who: null, en: "For a moment, the lantern in Lina's hand burned brighter, as if it had been given new fuel.", ja: "一瞬、リナの手のランタンが明るく燃え上がった。まるで新しい燃料をもらったかのように。" },
  { who: "ren", en: "\"Your lantern... it got stronger.\"", ja: "「ランタンが……強くなった。」" },
  { who: "lina", face: "smile", en: "\"Memories that come home are the brightest fuel of all.\"", ja: "「家に帰ってきた記憶は、どんな燃料よりも明るく燃えるの。」" }
]);
rpgAddBefore("c9", "In the central hall, the First Page floated", [
  { who: null, en: "In a hallway of broken pillars, they found a statue of a woman holding a book open to the sky. The words carved under it were nearly worn away.", ja: "柱の折れた回廊で、空に向けて本を開いて持つ女性の像を見つけた。その下に刻まれた文字は、ほとんどすり減っていた。" },
  { who: "garo", en: "\"\"To remember is to love. To forget is to rest. Choose wisely, and choose often.\" ...What does that mean?\"", ja: "「『覚えていることは、愛すること。忘れることは、休むこと。賢く選べ、そして何度でも選べ』……どういう意味じゃ？」" },
  { who: "lina", en: "\"I think it means that forgetting isn't always wrong. We need to rest sometimes. But it should be a choice we make again and again, not something we let happen to us forever.\"", ja: "「忘れることがいつもまちがいだとはかぎらない、ってことだと思う。ときには休むことも必要。でもそれは、何度でも自分で選び直すものであって、ずっとなすがままにしておくものじゃない。」" },
  { who: "ren", en: "\"Then Mio should get to choose again too. She made her choice when she was alone and hurt. She deserves another chance.\"", ja: "「なら、ミオにももう一度選ぶ権利がある。あいつはひとりで傷ついていたときに選んだんだ。もう一度チャンスがあっていいはずだ。」" }
]);

/* ───────── 第10章 嵐の空 ───────── */
rpgAddAfter("c10", "\"So the Queen lives above the clouds.", [
  { who: null, en: "As they climbed, the wind carried pieces of memories past them: a birthday card, a child's shoe, a page from a love letter, a photograph of a family at the beach.", ja: "登っていくと、風が記憶のかけらを運んで、そばを通り過ぎていった。誕生日カード、子どもの靴、ラブレターの1ページ、浜辺の家族写真。" },
  { who: "ren", en: "\"All of these are heading up to the castle.\"", ja: "「これ全部、城に向かって飛んでいくんだ。」" },
  { who: "lina", en: "\"Mio is collecting everyone's sadness. She thinks if she carries all of it, nobody else will have to.\"", ja: "「ミオはみんなの悲しみを集めているのね。全部自分が背負えば、ほかのだれも背負わなくてすむと思ってるの。」" },
  { who: "ren", face: "sad", en: "\"That's exactly like her. When we were kids, if one of us broke something, she always said she did it, even when it was me.\"", ja: "「まさに、あいつらしいよ。子どものころ、どっちかが何か壊すと、いつも自分がやったって言ってた。俺がやったときでも。」" },
  { who: "garo", en: "\"A girl like that will break under the weight eventually. We'd better hurry.\"", ja: "「そういう子は、いずれ重さに押しつぶされる。急いだほうがいいぞ。」" }
]);
rpgAddAfter("c10", "Garo's axe flashed in the lightning.", [
  { who: "lina", face: "sad", en: "\"Ren... what if he doesn't come back?\"", ja: "「レン……もしガロが戻ってこなかったら？」" },
  { who: "ren", en: "\"He'll come back. He promised Ella. And he's the most stubborn person I've ever met.\"", ja: "「戻ってくる。エラに約束したんだ。それに、あいつは今まで会った中でいちばん頑固なやつだ。」" },
  { who: "lina", face: "smile", en: "\"More stubborn than you?\"", ja: "「あなたより頑固？」" },
  { who: "ren", face: "smile", en: "\"...Okay. Second most stubborn.\"", ja: "「……わかった。二番目に頑固なやつだ。」" }
]);

/* ───────── 第11章 炎の門 ───────── */
rpgAddAfter("c11", "\"Every memory in Aster is burning here.", [
  { who: null, en: "In one of the halls, they found Captain Varos, his armor black with soot, pulling glowing jars out of the flames with his bare hands.", ja: "広間のひとつで、ヴァロス隊長を見つけた。鎧はすすで真っ黒になり、素手で炎の中から光るびんを引っぱり出していた。" },
  { who: "captain", en: "\"Travelers! You made it. I deserted the castle guard. I couldn't stand there and watch any more memories burn.\"", ja: "「旅人たち！たどり着いたか。わたしは城の衛兵を抜けてきた。もう、記憶が燃えるのをただ見ていることはできなかった。」" },
  { who: "captain", en: "\"I've saved about two hundred so far. Lullabies, wedding days, a first step. It isn't much. But each one is someone's whole world.\"", ja: "「これまでに200ほど救い出した。子守歌、結婚式の日、はじめての一歩。たいした数ではない。だが、ひとつひとつが、だれかの世界のすべてなのだ。」" },
  { who: null, en: "As he spoke, he hummed a tune under his breath. It was a song about a little boat that always found its way home.", ja: "話しながら、彼は小さく鼻歌を歌っていた。いつでも家に帰る道を見つける、小さな舟の歌だった。" },
  { who: "ren", face: "smile", en: "\"You're singing again.\"", ja: "「また歌ってるんだな。」" },
  { who: "captain", en: "\"...So I am. I found my mother's song in the fire on the first day. Now go. These flames won't wait.\"", ja: "「……そうだな。最初の日に、炎の中で母の歌を見つけたのだ。さあ、行け。この炎は待ってくれんぞ。」" }
]);
rpgAddAfter("c11", "\"It hurts. It hurts terribly.", [
  { who: "king", en: "\"Her name was Seraphine. She laughed too loudly at dinner parties. She hated wearing the crown. She planted roses in the garden with her own hands, and she always got dirt on her dress.\"", ja: "「名はセラフィーヌ。晩餐会ではいつも大声で笑いすぎた。王冠をかぶるのが大嫌いだった。自分の手で庭にバラを植えて、いつもドレスを泥だらけにしていた。」" },
  { who: "king", en: "\"I told the whole kingdom that forgetting was mercy, because I could not bear to be the only one who suffered. I made my people as empty as I was.\"", ja: "「わたしは国中に、忘れることは慈悲だと告げた。苦しむのが自分ひとりでは耐えられなかったからだ。民を、わたしと同じようにからっぽにしてしまった。」" },
  { who: "king", en: "\"When this is over, I will tear down the white tent with my own hands. And I will plant roses again.\"", ja: "「すべてが終わったら、この手で白いテントを壊そう。そして、もう一度バラを植えよう。」" }
]);

/* ───────── 第12章 忘却の女王 ───────── */
rpgAddAfter("c12", "The throne room was white and empty.", [
  { who: null, en: "Along the walls hung hundreds of drawings. Cats, flowers, trains, cherry trees. And again and again, the same two girls laughing under a tree.", ja: "壁には何百枚もの絵がかかっていた。ネコ、花、電車、桜の木。そして何度も何度も、木の下で笑う同じふたりの女の子。" },
  { who: "ren", face: "sad", en: "\"She's been drawing Haru this whole time. Up here, alone.\"", ja: "「あいつ、ずっとハルを描いてたんだ。こんなところで、ひとりで。」" },
  { who: "lina", en: "\"She threw away the memory, but her hands kept drawing it. Just like Garo's hands kept sewing the coat.\"", ja: "「記憶は捨てても、手は描き続けていたのね。ガロの手が上着を縫い続けていたみたいに。」" },
  { who: "garo", en: "\"Hands remember what hearts are afraid to. Who told me that again?\"", ja: "「心がこわがって思い出せんことを、手は覚えとる。だれに言われたんじゃったかな。」" },
  { who: "lina", face: "smile", en: "\"A very wise library girl.\"", ja: "「とっても賢い図書館の娘よ。」" }
]);
rpgAddAfter("c12", "\"I can't go home! Haru is gone because of me!", [
  { who: "ren", en: "\"I read your diary, Mio. I know about the art shop. I know about Haru's mom.\"", ja: "「おまえの日記、読んだよ、ミオ。画材屋のことも、ハルのお母さんのことも知ってる。」" },
  { who: "queen", face: "surprised", en: "\"You read it...? Then you know. You know it was my fault.\"", ja: "「読んだの……？じゃあ、わかったでしょ。わたしのせいだったって。」" },
  { who: "ren", en: "\"I know you asked your friend to go shopping. That's all you did. A driver ran a red light. That's not on you.\"", ja: "「おまえが友だちを買い物に誘った、それだけだ。信号を無視したのは車の運転手だ。おまえのせいじゃない。」" },
  { who: "queen", face: "sad", en: "\"Words don't change how it feels! Every time I close my eyes, I hear the phone ringing!\"", ja: "「言葉で気持ちは変わらないよ！目を閉じるたびに、電話が鳴る音が聞こえるの！」" }
]);
rpgAddAfter("c12", "\"It wasn't your fault, Mio.", [
  { who: "queen", face: "sad", en: "\"But if I go back, I'll have to see Haru's empty desk. Her mom's face. The road. Everything.\"", ja: "「でも、帰ったら、ハルの空っぽの机を見なきゃいけない。お母さんの顔も。あの道も。全部。」" },
  { who: "ren", en: "\"Then I'll be there next to you. Every time. You won't see any of it alone.\"", ja: "「なら、俺がとなりにいる。毎回だ。何ひとつ、ひとりで見させたりしない。」" },
  { who: "ren", face: "sad", en: "\"You asked me once if I'd be sad if you disappeared. I never answered. So here's my answer. I was sad every single day. I'm still sad. And I'll keep being sad until you come home.\"", ja: "「おまえ、前に聞いたよな。もしいなくなったら悲しいかって。俺は答えなかった。だから、今答える。毎日悲しかった。今も悲しい。おまえが帰ってくるまで、ずっと悲しいままだ。」" },
  { who: "queen", face: "sad", en: "\"...Ren. You idiot. You're supposed to answer that kind of question right away.\"", ja: "「……お兄ちゃん。ばか。そういう質問には、すぐ答えなきゃだめなんだよ。」" },
  { who: "ren", face: "smile", en: "\"I know. I'm a slow learner. Ask me again when we get home.\"", ja: "「わかってる。のみこみが悪いんだよ。家に帰ったら、もう一回聞いてくれ。」" }
]);
rpgAddAfter("c12", "\"Ren. Mio. It's time for me to keep my promise.\"", [
  { who: "queen", face: "surprised", en: "\"Wait. Who are you? Why are you helping me?\"", ja: "「待って。あなたはだれ？どうしてわたしを助けてくれるの？」" },
  { who: "lina", face: "smile", en: "\"Because a long time ago, I was a girl who was forgotten too. Nobody came to find me. I always wondered what it would feel like if someone did.\"", ja: "「ずっと昔、わたしも忘れられた女の子だったから。だれも探しに来てくれなかった。もしだれかが来てくれたら、どんな気持ちだろうって、ずっと思ってたの。」" },
  { who: "lina", face: "smile", en: "\"Now I know. Watching your brother come all this way for you... it was the happiest ending I've ever read.\"", ja: "「今はわかる。お兄さんがあなたのためにここまで来るのを見ていて……今まで読んだ中で、いちばん幸せな結末だった。」" },
  { who: "garo", en: "\"Lina. Don't you dare. You still owe me a hundred games of cards.\"", ja: "「リナ。やめんか。おまえはまだ、わしとカードを百回やる約束じゃろうが。」" },
  { who: "lina", face: "smile", en: "\"Then you'll have to remember to collect, Garo.\"", ja: "「じゃあ、取り立てるのを忘れないでね、ガロ。」" }
]);
rpgAddAfter("c12", "The light faded.", [
  { who: null, en: "On the back of the bookmark, in small, careful handwriting, it said: \"The End. (A happy one.) —Little Lantern\"", ja: "しおりの裏には、小さく、ていねいな字でこう書かれていた。「おしまい。（ハッピーエンド）――小さな灯」" },
  { who: "garo", en: "\"...She wrote her own ending. Stubborn girl.\"", ja: "「……自分で結末を書きおった。頑固な娘じゃ。」" },
  { who: "ren", face: "sad", en: "\"Third most stubborn.\"", ja: "「三番目に頑固なやつだな。」" }
]);

/* ───────── 終章 ───────── */
rpgAddAfter("ep", "\"I'll come with you.\"", [
  { who: null, en: "The next day, they stood in front of Haru's house. Mio's hand was cold and trembling. Ren held it the whole time.", ja: "次の日、ふたりはハルの家の前に立っていた。ミオの手は冷たく、ふるえていた。レンはずっとその手を握っていた。" },
  { who: null, en: "Haru's mother opened the door. For a long moment, she did not say anything. Then she pulled Mio into her arms.", ja: "ハルのお母さんがドアを開けた。長いあいだ、何も言わなかった。それから、ミオを腕の中に引き寄せた。" },
  { who: "voice", en: "\"Where have you been? I've been so worried. I thought I'd lost both of you.\"", ja: "「どこに行ってたの？ずっと心配してたのよ。あなたたちを二人とも失ったと思ってた。」" },
  { who: null, en: "She gave Mio a notebook with a blue cover. On the first page, Haru had written: \"My First Novel. Cover by Mio Amane. (She promised.)\"", ja: "お母さんは、青い表紙のノートをミオに渡した。最初のページに、ハルの字でこう書かれていた。「わたしの最初の小説。表紙：天音ミオ（約束したからね）」" },
  { who: "mio", face: "sad", en: "\"It isn't finished...\"", ja: "「最後まで、書かれてない……」" },
  { who: "voice", en: "\"No. She never got to write the ending. But I think she'd want you to draw the cover anyway. Will you?\"", ja: "「ええ。結末は書けなかった。でも、それでも表紙は描いてほしいって、あの子なら言うと思うの。描いてくれる？」" },
  { who: "mio", face: "smile", en: "\"...Yes. I promised.\"", ja: "「……うん。約束したから。」" },
  { who: null, en: "That evening, Mio drew for the first time in a year. Two girls laughing under a cherry tree. In the corner, very small, she added a third figure: a girl with a book-shaped lantern, smiling.", ja: "その夜、ミオは1年ぶりに絵を描いた。桜の木の下で笑うふたりの女の子。その隅に、ごく小さく、三人目を描き足した。本の形のランタンを持って、ほほえむ女の子を。" },
  { who: "ren", en: "\"Who's that?\"", ja: "「それ、だれだ？」" },
  { who: "mio", face: "smile", en: "\"I don't know. But it felt like she belonged there.\"", ja: "「わかんない。でも、ここにいるべき人な気がしたの。」" }
]);

/* ===== 宿屋の会話（第7章〜） ===== */
GINNTALK.push(
  { id: "inn7", need: "c7_done", not: "c8_done", nodes: [
    { who: "garo", en: "\"Library girl. A hundred and twelve years. You must have seen a lot.\"", ja: "「図書館の娘。112年か。いろいろ見てきたんじゃろうな。」" },
    { who: "lina", face: "smile", en: "\"I've seen eleven kings and three floods. And I've read about forty thousand books.\"", ja: "「王さまを11人と、洪水を3回見たわ。それから、本を4万冊くらい読んだ。」" },
    { who: "garo", en: "\"Forty thousand! And which one was the best?\"", ja: "「4万冊！で、いちばんよかったのはどれじゃ？」" },
    { who: "lina", face: "smile", en: "\"The one I'm in right now.\"", ja: "「今わたしが入ってる、この物語。」" },
    { who: "garo", en: "\"...You're impossible to argue with, you know that?\"", ja: "「……おまえには言い返しようがないのう。」" }
  ] },
  { id: "inn8", need: "c8_done", not: "c10_done", nodes: [
    { who: "ren", en: "\"Lina, after all this is over... what will you do?\"", ja: "「リナ、全部終わったら……きみはどうするんだ？」" },
    { who: "lina", en: "\"I want to see your world. Your school, your street, the station where you got on the train. I want to eat that curry you keep talking about.\"", ja: "「あなたの世界を見てみたい。学校も、家のある通りも、列車に乗った駅も。あなたがいつも話してるカレーも食べてみたい。」" },
    { who: "ren", face: "smile", en: "\"Mom's curry is the best. You'd love it.\"", ja: "「母さんのカレーは最高だよ。絶対気に入る。」" },
    { who: "lina", face: "sad", en: "\"...I'd love it. Yes.\"", ja: "「……気に入るでしょうね。うん。」" },
    { who: null, en: "She said it as if she were describing a dream she already knew she would wake up from.", ja: "彼女は、もう覚めることがわかっている夢の話をするように、そう言った。" }
  ] },
  { id: "inn9", need: "c10_done", not: "c12_done", nodes: [
    { who: "garo", en: "\"Tomorrow we go up to the Queen. Boy, are you scared?\"", ja: "「明日は女王のところへ上る。坊主、こわいか？」" },
    { who: "ren", en: "\"Terrified. Not of fighting. Of her saying no.\"", ja: "「すげえこわい。戦うのがじゃない。あいつに、いやだって言われるのが。」" },
    { who: "garo", en: "\"When Ella didn't recognize me at the harbor, I wanted to run away. But I stayed. And she remembered.\"", ja: "「港でエラがわしに気づかんかったとき、わしは逃げ出したかった。じゃが、とどまった。そしたら、あの子は思い出した。」" },
    { who: "garo", en: "\"Stay, boy. Whatever she says, just stay. That's the whole secret.\"", ja: "「とどまれ、坊主。何を言われても、とどまれ。それが秘訣のすべてじゃ。」" }
  ] }
);

/* ===== モンスターごとの、出てきたとき・倒したときの英文（オリジナル） =====
   [出てきたとき（英）, （日）, 倒したとき（英）, （日）]。ターゲット1900の単語をなるべく使っている。 */
const GMONLINES = {
  1: ["A Drool Slime oozes out of the grass, leaving a sticky trail behind it.", "よだれスライムが草むらからにじみ出てきた。うしろにねばねばの跡が残っている。", "The slime melted into a harmless puddle.", "スライムは害のない水たまりに溶けた。"],
  2: ["A Shadow Bat drops from the ceiling without a sound.", "シャドウバットが音もなく天井から降ってきた。", "The bat flapped away into the darkness and did not return.", "コウモリは暗闇へと羽ばたいていき、戻ってこなかった。"],
  3: ["An Ash Wolf appears, its gray fur scattering sparks with every step.", "アッシュウルフが現れた。一歩ごとに灰色の毛から火の粉が散る。", "The wolf crumbled into a pile of cold ash.", "オオカミは冷たい灰の山になって崩れた。"],
  4: ["A Skull Bull lowers its horns and prepares to charge!", "スカルブルが角を下げ、突進の構えをとった！", "The bull collapsed, and its horns cracked in two.", "雄牛は倒れ、その角は真っ二つに割れた。"],
  5: ["The treasure chest opens its lid... and reveals a mouth full of teeth!", "宝箱がふたを開けた……と思ったら、中は歯だらけの口だった！", "The Chest Mimic closed its lid and pretended to be an ordinary box again.", "ミミックはふたを閉じて、またふつうの箱のふりを始めた。"],
  6: ["A Storm Wraith howls, and the air around you grows cold and heavy.", "ストームレイスがうなり声をあげ、まわりの空気が冷たく重くなった。", "The wraith scattered like clouds after a storm.", "レイスは嵐のあとの雲のように散っていった。"],
  7: ["An Iron Gargoyle wakes up on its pillar and spreads its stone wings.", "鉄のガーゴイルが柱の上で目を覚まし、石の翼を広げた。", "The gargoyle froze in place and turned back into a statue.", "ガーゴイルはその場で固まり、ただの像に戻った。"],
  8: ["A Moss Imp jumps out from behind a tree, giggling.", "こけのインプがくすくす笑いながら木のかげから飛び出してきた。", "The imp ran away, still giggling, and hid somewhere in the forest.", "インプは笑いながら逃げていき、森のどこかに隠れた。"],
  9: ["A Shell Goblin peeks out of its shell and waves a rusty knife.", "からゴブリンが殻から顔をのぞかせ、さびたナイフを振り回した。", "The goblin pulled its head back into its shell and refused to come out.", "ゴブリンは殻に頭を引っこめて、出てこようとしなくなった。"],
  10: ["A Spine Beetle rolls toward you, its back covered in sharp spikes.", "トゲカブトが転がってきた。背中は鋭いトゲでおおわれている。", "The beetle flipped onto its back and could not get up.", "カブトムシはひっくり返って起き上がれなくなった。"],
  11: ["A Deep Kraken rises from the water and stretches out its long arms.", "ディープクラーケンが水の中から現れ、長い腕を伸ばした。", "The kraken sank back into the deep, leaving only bubbles.", "クラーケンは泡だけを残して深みへ沈んでいった。"],
  12: ["A Gear Spider clicks and whirs as it crawls down from its web.", "ギアスパイダーがカチカチと音を立てながら、巣から降りてきた。", "The spider's gears stopped turning, one by one.", "クモの歯車がひとつずつ止まっていった。"],
  13: ["A Frost Shark swims through the ice as if it were water!", "フロストシャークが、まるで水のように氷の中を泳いでくる！", "The shark froze solid and shattered.", "サメはかちこちに凍り、粉々に砕けた。"],
  14: ["A Void Jelly floats toward you, its body as dark as the night sky.", "ヴォイドジェリーが漂ってきた。その体は夜空のように暗い。", "The jelly faded until only a few stars of light remained.", "クラゲは消えていき、星のような光がいくつか残っただけだった。"],
  15: ["A Jade Wyvern dives from above with a sharp cry!", "ジェイドワイバーンが鋭い声をあげて上から急降下してきた！", "The wyvern flew off, wounded, and disappeared over the hills.", "ワイバーンは傷つき、丘の向こうへ飛び去った。"],
  16: ["A Crystal Fang grows out of the cave wall and bares its glittering teeth.", "クリスタルファングが洞窟の壁から生えてきて、きらめく牙をむいた。", "The crystal beast cracked and returned to the rock.", "水晶の獣はひび割れ、岩に戻った。"],
  17: ["A Bubble Orb drifts closer. Strange memories swirl inside it.", "バブルオーブが近づいてきた。中で、見知らぬ記憶が渦を巻いている。", "The bubble popped, and a forgotten melody floated away.", "泡がはじけ、忘れられた旋律が流れていった。"],
  18: ["An Ember Totem burns brighter as you approach. Its carved face is angry.", "近づくと、エンバートーテムが明るく燃え上がった。彫られた顔は怒っている。", "The totem's fire went out, and its face looked calm at last.", "トーテムの火は消え、その顔はやっと穏やかになった。"],
  19: ["A Gift Golem marches forward, covered in ribbons and wrapping paper.", "ギフトゴーレムがリボンと包み紙だらけの体で行進してきた。", "The golem fell apart into a pile of empty boxes.", "ゴーレムは崩れて、空の箱の山になった。"],
  20: ["A Frosted Wing flutters down like a falling leaf made of ice.", "フロストウィングが、氷でできた落ち葉のようにひらひら降りてきた。", "The creature melted into drops of cold water.", "生き物は冷たいしずくになって溶けた。"],
  21: ["A Leaf Sprite dances on the wind and blocks your path.", "リーフスプライトが風に乗って踊り、行く手をふさいだ。", "The sprite turned back into an ordinary leaf and drifted to the ground.", "スプライトはふつうの葉っぱに戻り、地面に舞い落ちた。"],
  22: ["A Watcher Owl stares at you with huge, unblinking eyes.", "見張りフクロウが、まばたきひとつしない大きな目でこちらを見つめている。", "The owl finally blinked, then flew away into the trees.", "フクロウはやっとまばたきをして、木々の中へ飛んでいった。"],
  23: ["A Vine Serpent slides out of the bushes, wrapped in thorny vines.", "ヴァインサーペントがいばらのつるをまとって、茂みからすべり出てきた。", "The serpent's vines withered, and it slipped away.", "ヘビのつるはしおれ、ヘビはするりと逃げていった。"],
  24: ["A Ruby Heart beats loudly, as if it were alive and furious.", "ルビーハートが大きく脈打っている。まるで生きていて、激しく怒っているかのように。", "The heart stopped beating and became a quiet red stone.", "心臓は鼓動を止め、静かな赤い石になった。"],
  25: ["A Fire Lizard spits a small flame at your feet.", "ファイアリザードが足元に小さな炎を吐いた。", "The lizard's flame died out, and it crawled under a rock.", "トカゲの炎は消え、岩の下へもぐりこんだ。"],
  26: ["An Axe Boar snorts and swings the axe tied to its tusks.", "アックスボアが鼻を鳴らし、牙にくくりつけた斧を振り回した。", "The boar dropped its axe and ran off into the woods.", "イノシシは斧を落とし、森の奥へ走り去った。"],
  27: ["A Plume Griffin lands in front of you with a mighty roar!", "プルームグリフォンが雄たけびをあげて目の前に降り立った！", "The griffin bowed its head, as if admitting defeat, and flew away.", "グリフォンは負けを認めるように頭を下げ、飛び去った。"],
  28: ["A Stone Elephant stamps its foot, and the ground shakes.", "ストーンエレファントが足を踏み鳴らすと、地面がゆれた。", "The elephant sat down heavily and fell asleep.", "ゾウはどすんと座りこみ、眠ってしまった。"],
  29: ["A Hat Mole pops out of the ground and adjusts its tiny hat.", "ハットモールが地面からひょっこり出てきて、小さな帽子をなおした。", "The mole tipped its hat politely and dug back into the earth.", "モグラは礼儀正しく帽子を傾けて、また土の中へもぐっていった。"],
  30: ["A Mint Ghost floats by, smelling strangely fresh.", "ミントゴーストがふわふわ漂ってきた。妙にさわやかなにおいがする。", "The ghost vanished, leaving only a cool breeze.", "おばけは涼しい風だけを残して消えた。"],
  31: ["A Rust Tank rolls forward, its old cannon creaking as it turns toward you.", "ラストタンクが前進してきた。古い砲身がきしみながらこちらを向く。", "The tank's engine coughed once and fell silent forever.", "戦車のエンジンが一度せきこみ、永遠に静かになった。"],
  32: ["A Cap Rabbit hops out from under a giant mushroom.", "キャップラビットが巨大なキノコの下から跳ねて出てきた。", "The rabbit hopped away, much faster than it came.", "ウサギは来たときよりずっと速く跳ねて去っていった。"],
  33: ["A Thorn Hedgehog curls up into a ball of sharp needles.", "いばらハリネズミが体を丸めて、鋭い針の玉になった。", "The hedgehog uncurled and waddled away, defeated.", "ハリネズミは体をのばし、負けを認めてよちよち去っていった。"],
  34: ["A Wind Eel swims through the air as easily as through water.", "ウィンドイールが、水の中と同じように軽々と空中を泳いでいる。", "The eel was carried away by a strong gust of wind.", "ウナギは強い突風にさらわれていった。"],
  35: ["A Cloud Toad puffs up its cheeks and fills the air with fog.", "クラウドトードがほおをふくらませ、あたりを霧で満たした。", "The toad deflated and the fog slowly cleared.", "カエルはしぼみ、霧はゆっくり晴れていった。"],
  36: ["A Rock Owl turns its stone head all the way around to look at you.", "ロックオウルが石の頭をぐるりと回して、こちらを見た。", "The owl stopped moving and became part of the cliff again.", "フクロウは動かなくなり、また崖の一部に戻った。"],
  37: ["An Azure Drake spreads its blue wings and blocks the sunlight.", "アジュールドレイクが青い翼を広げ、日の光をさえぎった。", "The drake retreated into the sky with an angry cry.", "ドレイクは怒った声をあげて、空へ退いていった。"],
  38: ["A Lava Toad leaps out of a pool of boiling rock!", "ラヴァトードが煮えたぎる岩のたまりから跳び出してきた！", "The toad cooled down and turned into an ordinary stone.", "カエルは冷えて、ふつうの石になった。"],
  39: ["A Tide Jelly rises with the waves, glowing a soft blue.", "タイドジェリーが波と共に浮かび上がった。やわらかな青に光っている。", "The jelly drifted back out to sea with the tide.", "クラゲは潮に乗って、海へ戻っていった。"],
  40: ["A Magma Slime bubbles and hisses, burning the ground beneath it.", "マグマスライムがぶくぶく、しゅうしゅうと音を立て、足元の地面を焦がしている。", "The slime hardened into a lump of black rock.", "スライムは固まって、黒い岩のかたまりになった。"],
  41: ["A Root Witch rises from the ground, her hair made of twisted roots.", "ルートウィッチが地面から立ち上がった。その髪はねじれた根でできている。", "The witch sank back into the soil, muttering a curse.", "魔女はのろいの言葉をつぶやきながら、土の中へ沈んでいった。"],
  42: ["A Gator Frog opens its enormous mouth and croaks loudly!", "ゲイターフロッグが巨大な口を開けて、大声で鳴いた！", "The frog jumped into the water with a huge splash.", "カエルは大きな水しぶきをあげて水に飛びこんだ。"],
  43: ["A Mushroom Sage leans on its staff and studies you carefully.", "マッシュルームセージが杖にもたれ、こちらをじっくり観察している。", "The sage nodded, as if you had passed some kind of test, and walked away.", "賢者は、まるで何かの試験に合格したかのようにうなずいて、去っていった。"],
  44: ["A Wave Spirit rises from the sea like a wall of water.", "ウェーブスピリットが水の壁のように海から立ち上がった。", "The spirit broke apart and returned to the waves.", "精霊はくずれて、波に戻っていった。"],
  45: ["A Bloom Turtle walks slowly toward you. Flowers grow on its shell.", "ブルームタートルがゆっくり近づいてきた。甲羅に花が咲いている。", "The turtle pulled into its shell, and its flowers closed.", "カメは甲羅に引っこみ、花も閉じた。"],
  46: ["A Stump Ent pulls its roots out of the ground and starts walking!", "切り株のエントが地面から根を引き抜いて、歩き出した！", "The ent planted its roots again and stood still, like any other stump.", "エントはまた根を下ろし、ほかの切り株と同じように動かなくなった。"],
  47: ["A Petal Fairy appears in a cloud of pink petals.", "ペタルフェアリーがピンクの花びらの雲の中から現れた。", "The fairy scattered into petals and drifted away on the wind.", "妖精は花びらになって散り、風に乗って流れていった。"],
  48: ["A Garden Ogre stomps out of the field, holding a huge shovel.", "ガーデンオーガが巨大なシャベルを持って、畑からのしのし出てきた。", "The ogre sat down and began to cry like a child.", "オーガは座りこみ、子どものように泣き出した。"],
  49: ["A Violet Hydra raises its many heads, each one hissing at you.", "ヴァイオレットヒドラがいくつもの頭をもたげた。どの頭もこちらに向かってシューッと鳴いている。", "The hydra's heads drooped, one after another.", "ヒドラの頭は次々にうなだれていった。"],
  50: ["A Pig Brute snorts and cracks its knuckles.", "ピッグブルートが鼻を鳴らし、指の関節を鳴らした。", "The brute fell flat on its face and did not get up.", "乱暴者は顔から倒れて、起き上がらなかった。"],
  51: ["A Little Ghost peeks out from behind a broken wall and says, \"Boo!\"", "ちびゴーストがこわれた壁のかげからのぞいて、「ばあ！」と言った。", "The little ghost giggled and faded away.", "ちびゴーストはくすくす笑って消えていった。"],
  52: ["A Blue Raven circles above you, waiting for a chance to attack.", "ブルーレイヴンが頭上を旋回して、攻撃のチャンスをうかがっている。", "The raven gave up and flew toward the horizon.", "カラスはあきらめて、地平線のほうへ飛んでいった。"],
  53: ["A Mud Dome rises out of the swamp and opens a single eye.", "マッドドームが沼から盛り上がり、ひとつ目を開いた。", "The dome sank back into the mud with a loud gurgle.", "ドームはごぼごぼと大きな音を立てて泥の中へ沈んだ。"],
  54: ["An Armor Crab raises its huge claws to defend itself.", "アーマークラブが巨大なはさみを振り上げて身を守ろうとしている。", "The crab scuttled sideways and escaped into a crack.", "カニは横歩きで逃げ、すき間へもぐりこんだ。"],
  55: ["A Maw Plant opens its petals, revealing rows of sharp teeth.", "モウプラントが花びらを開いた。中には鋭い歯がずらりと並んでいる。", "The plant closed its petals and wilted.", "植物は花びらを閉じ、しおれていった。"],
  56: ["A Gulp Fish leaps out of the water with its mouth wide open!", "ガルプフィッシュが口を大きく開けて、水から飛び出してきた！", "The fish fell back into the water with an embarrassed splash.", "魚はばつが悪そうに水しぶきをあげて、水の中へ落ちた。"],
  57: ["A Moss Lizard slowly climbs down the wall, almost invisible against the stone.", "こけトカゲが壁をゆっくり降りてきた。石にまぎれてほとんど見えない。", "The lizard slipped into a crack in the stone.", "トカゲは石のすき間にすべりこんだ。"],
  58: ["A Leaf Mantis raises its sharp arms, ready to strike.", "リーフマンティスが鋭い腕を振り上げ、攻撃の構えをとった。", "The mantis folded its arms and became a pile of leaves.", "カマキリは腕をたたみ、落ち葉の山になった。"],
  59: ["A Bandage Bunny limps toward you, but its eyes are full of anger.", "バンデージバニーがびっこを引きながら近づいてくる。でもその目は怒りに満ちている。", "The bunny's bandages came loose, and it hopped away to heal.", "ウサギの包帯がほどけ、傷を治しに跳ねていった。"],
  60: ["A Red Demon laughs and opens its mouth wide, showing burning teeth.", "レッドデーモンが笑い、燃える歯を見せて口を大きく開けた。", "The demon's laughter stopped, and it burned away into smoke.", "悪魔の笑い声がやみ、煙になって燃えつきた。"],
  61: ["A Phantom Weaver spins threads of shadow between its many arms.", "ファントムウィーバーがたくさんの腕のあいだに影の糸をつむいでいる。", "The weaver's threads snapped, and it unraveled into nothing.", "織り手の糸がぷつりと切れ、ほどけて何もなくなった。"],
  62: ["A Thunder Moth beats its wings, and sparks fly in every direction.", "サンダーモスが羽ばたくと、火花が四方八方に飛び散った。", "The moth's light went out, and it drifted to the ground.", "ガの光が消え、地面へひらひら落ちていった。"],
  63: ["A Mushroom Mage waves its staff and mumbles a strange spell.", "マッシュルームメイジが杖を振って、奇妙な呪文をぶつぶつ唱えている。", "The mage's spell failed, and it shrank into a small mushroom.", "メイジの呪文は失敗し、小さなキノコに縮んでしまった。"],
  64: ["A Crow Knight draws its sword and bows politely before attacking.", "クロウナイトが剣を抜き、攻撃の前に礼儀正しくおじぎをした。", "The knight lowered its sword and admitted its defeat.", "騎士は剣を下ろし、負けを認めた。"],
  65: ["An Elder Treant groans, and its branches reach toward you like arms.", "エルダートレントがうめき声をあげ、枝が腕のようにこちらへ伸びてきた。", "The treant sighed deeply and returned to its long sleep.", "トレントは深いため息をつき、長い眠りに戻っていった。"],
  66: ["A Star Bear stands on its back legs. Its fur sparkles like the night sky.", "スターベアが後ろ足で立ち上がった。その毛は夜空のようにきらめいている。", "The bear lay down and slowly faded into starlight.", "クマは横たわり、ゆっくりと星の光になって消えていった。"],
  67: ["A Gold Whale bursts out of the sea, shining in the sunlight!", "ゴールドホエールが日の光に輝きながら、海から飛び出してきた！", "The whale sank peacefully back into the deep blue sea.", "クジラは穏やかに、深い青の海へ沈んでいった。"],
  68: ["A Glass Wolf appears. You can see right through its body.", "グラスウルフが現れた。体の向こうが透けて見える。", "The wolf shattered into a thousand tiny pieces.", "オオカミは千のかけらになって砕け散った。"],
  69: ["A Lantern Fish swims closer, the light on its head swaying gently.", "ランタンフィッシュが近づいてきた。頭の明かりがゆらゆらゆれている。", "The fish's light went dim, and it swam away into the dark.", "魚の明かりが暗くなり、暗闇の中へ泳いでいった。"],
  70: ["A Clay Golem rises slowly, its body still wet and soft.", "クレイゴーレムがゆっくり立ち上がった。体はまだぬれていて、やわらかい。", "The golem dried out and cracked into pieces.", "ゴーレムは乾いて、ひび割れ、ばらばらになった。"],
  71: ["A Cinder Cat arches its back, and its fur glows like hot coals.", "シンダーキャットが背中を丸めた。毛が熱い炭のように光っている。", "The cat yawned, curled up, and turned into a pile of warm ash.", "ネコはあくびをして丸くなり、温かい灰の山になった。"],
  72: ["A Night Drake emerges from the darkness, its eyes burning red.", "ナイトドレイクが暗闇から現れた。その目は赤く燃えている。", "The drake retreated into the shadows and was gone.", "ドレイクは影の中へ退き、いなくなった。"],
  73: ["A Drill Snail spins its shell and tunnels toward you!", "ドリルスネイルが殻を回転させて、穴を掘りながら向かってきた！", "The snail's drill stopped, and it hid inside its shell.", "カタツムリのドリルが止まり、殻の中に隠れた。"],
  74: ["A Bone Priestess raises her staff and begins a cold, silent prayer.", "ボーンプリーステスが杖をかかげ、冷たく静かな祈りを始めた。", "The priestess finished her prayer and crumbled into dust.", "巫女は祈りを終え、ちりになって崩れた。"],
  75: ["A Frost Wisp floats nearby, making the air sparkle with ice.", "フロストウィスプが近くを漂い、空気を氷のきらめきで満たしている。", "The wisp melted into a single drop of water.", "ウィスプは一滴の水になって溶けた。"],
  76: ["A Shell Hermit pokes its head out of a giant shell and snaps its claws.", "シェルハーミットが巨大な貝殻から頭を出し、はさみを鳴らした。", "The hermit retreated into its shell and refused to come out.", "ヤドカリは殻の中へ引っこみ、出てこようとしなくなった。"],
  77: ["An Ember Worm wriggles out of the hot ground.", "エンバーワームが熱い地面からくねくねとはい出してきた。", "The worm burrowed back into the earth to cool down.", "ミミズは体を冷やしに、また土の中へもぐっていった。"],
  78: ["A Moss Caterpillar inches toward you, munching on leaves.", "モスキャタピラーが葉っぱをむしゃむしゃ食べながら、少しずつ近づいてくる。", "The caterpillar curled up and went to sleep in a cocoon.", "イモムシは丸くなり、まゆの中で眠ってしまった。"],
  79: ["A Neon Mantis flashes brilliant colors to confuse you.", "ネオンマンティスがまぶしい色を光らせて、こちらをまどわそうとしている。", "The mantis's colors faded, and it flew off.", "カマキリの色はあせ、飛び去っていった。"],
  80: ["A Crimson Beast roars, and the ground around it catches fire.", "クリムゾンビーストがほえると、まわりの地面に火がついた。", "The beast fell to its knees, and its fire died out.", "獣はひざをつき、その炎は消えた。"],
  81: ["The Pine Frog King jumps onto a rock and demands that you bow!", "パインフロッグキングが岩に跳び乗り、ひれ伏せと命じてきた！", "The king lost his crown and hopped away in shame.", "王は王冠を落とし、恥ずかしそうに跳ねて去っていった。"],
  82: ["An Ice Serpent coils around a pillar, its breath freezing the air.", "アイスサーペントが柱に巻きついた。その息で空気が凍っていく。", "The serpent uncoiled and slid away into the cold water.", "ヘビはとぐろをほどき、冷たい水の中へすべるように逃げた。"],
  83: ["A Rose Dryad smiles sweetly, but her thorns are sharp.", "ローズドライアドがやさしくほほえんだ。でもそのトゲは鋭い。", "The dryad turned into a single red rose.", "ドライアドは一輪の赤いバラになった。"],
  84: ["An Emerald Gargoyle cracks its stone skin and stretches its wings.", "エメラルドガーゴイルが石の肌にひびを入れ、翼を伸ばした。", "The gargoyle settled back onto its perch and became stone again.", "ガーゴイルは止まり木に戻り、また石になった。"],
  85: ["A Blade Lizard swings the sword it stole from some unlucky traveler.", "ブレードリザードが、運の悪い旅人から盗んだ剣を振り回した。", "The lizard dropped the sword and ran away.", "トカゲは剣を落として逃げていった。"],
  86: ["A Moon Witch appears in a circle of pale moonlight.", "ムーンウィッチが青白い月明かりの輪の中に現れた。", "The witch vanished as a cloud covered the moon.", "雲が月をおおうと、魔女は姿を消した。"],
  87: ["A Flame Tail swishes its burning tail, leaving a trail of fire.", "フレイムテイルが燃える尻尾を振り、炎の跡を残した。", "The creature's tail flickered out, and it fled.", "生き物の尻尾の火がふっと消え、逃げていった。"],
  88: ["A Blue Dragon rises from the depths, its scales shining like the sea.", "ブルードラゴンが深みから現れた。そのうろこは海のように輝いている。", "The dragon sank back into the darkness of the sea.", "竜は海の暗闇へと沈んでいった。"],
  89: ["A Horn Beetle lowers its huge horn and charges straight at you!", "ホーンビートルが巨大な角を下げて、まっすぐ突進してきた！", "The beetle flipped over and waved its legs helplessly.", "カブトムシはひっくり返り、足をばたばたさせた。"],
  90: ["A Vine Kraken reaches out with dozens of green arms.", "ヴァインクラーケンが何十本もの緑の腕を伸ばしてきた。", "The kraken's vines withered and fell to the ground.", "クラーケンのつるはしおれ、地面に落ちた。"],
  91: ["Twin Toads hop forward together, croaking in perfect harmony.", "ツイントードが声をぴったりそろえて鳴きながら、いっしょに跳ねてきた。", "The toads argued with each other and hopped off in different directions.", "カエルたちはけんかを始め、別々の方向へ跳ねていった。"],
  92: ["A Flame Bird swoops down, trailing sparks across the sky.", "フレイムバードが空に火の粉を引きながら急降下してきた。", "The bird burst into a shower of harmless sparks.", "鳥ははじけて、害のない火の粉の雨になった。"],
  93: ["A Crystal Monolith hums, and strange symbols glow on its surface.", "クリスタルモノリスがうなり、表面に奇妙な記号が光った。", "The monolith's light faded, and it fell silent.", "石碑の光は消え、静かになった。"],
  94: ["A Frost Golem stomps forward, freezing everything it touches.", "フロストゴーレムがのしのし進んできた。触れるものすべてが凍っていく。", "The golem cracked and collapsed into a pile of snow.", "ゴーレムはひび割れ、雪の山になって崩れた。"],
  95: ["A Scale Beast shakes its body, and its scales clatter like armor.", "スケイルビーストが体をゆすると、うろこが鎧のようにがちゃがちゃ鳴った。", "The beast lay down and lost its fighting spirit.", "獣は横たわり、戦う気力を失った。"],
  96: ["A Fox Kit tilts its head and stares at you curiously.", "フォックスキットが首をかしげて、ふしぎそうにこちらを見つめている。", "The fox kit ran off to find its mother.", "子ギツネはお母さんを探しに走っていった。"],
  97: ["A Rock Slug slowly crawls across the floor, leaving a shiny trail.", "ロックスラッグがゆっくり床をはい、光る跡を残している。", "The slug curled up and pretended to be a rock.", "ナメクジは丸まって、岩のふりをした。"],
  98: ["A Bell Camel rings the bell around its neck, and the sound hurts your ears.", "ベルキャメルが首の鈴を鳴らした。その音で耳が痛くなる。", "The camel's bell stopped ringing, and it wandered away.", "ラクダの鈴は鳴りやみ、ふらふらと去っていった。"],
  99: ["An Iron Knight marches forward, its empty armor clanking loudly.", "アイアンナイトが行進してきた。からっぽの鎧がガシャガシャと大きな音を立てている。", "The knight's armor fell apart, piece by piece.", "騎士の鎧はひとつずつばらばらになって落ちた。"],
  100: ["A Thunder Lion roars, and lightning strikes the ground around you!", "サンダーライオンがほえると、まわりの地面に雷が落ちた！", "The lion's mane stopped crackling, and it disappeared in a flash.", "獅子のたてがみの火花が止まり、一瞬の光と共に消えた。"],
  101: ["A Glacier Titan rises, as tall as a house and as cold as winter.", "グレイシャータイタンが立ち上がった。家ほど大きく、冬のように冷たい。", "The titan collapsed into a mountain of broken ice.", "巨人は崩れ落ち、砕けた氷の山になった。"],
  102: ["A Clockwork Mask floats toward you, ticking like a clock.", "クロックワークマスクが時計のようにチクタク鳴りながら漂ってきた。", "The mask's ticking slowed down and finally stopped.", "仮面の音はゆっくりになり、最後には止まった。"],
  103: ["A Hammer Bear lifts a giant hammer over its head!", "ハンマーベアが巨大なハンマーを頭上に持ち上げた！", "The bear dropped its hammer on its own foot and ran away crying.", "クマはハンマーを自分の足に落とし、泣きながら逃げていった。"],
  104: ["A Scarecrow suddenly turns its head and looks straight at you.", "スケアクロウが突然首を回して、まっすぐこちらを見た。", "The scarecrow went limp and hung still on its pole.", "かかしはぐったりして、棒にぶら下がったまま動かなくなった。"],
  105: ["A Puppet Doll dances toward you, pulled by invisible strings.", "パペットドールが見えない糸に引かれて、踊りながら近づいてきた。", "The strings were cut, and the doll fell into a heap.", "糸が切れ、人形はくずれ落ちた。"],
  106: ["A War Drum beats itself, and the rhythm makes your heart race.", "ウォードラムが自分で自分を打ち鳴らした。そのリズムで心臓がどきどきする。", "The drum's skin tore, and the rhythm stopped.", "太鼓の皮が破れ、リズムは止まった。"],
  107: ["A Fluff Beast bounces toward you. It looks soft, but its claws are sharp.", "フラッフビーストが跳ねながら近づいてきた。ふわふわに見えるが、爪は鋭い。", "The beast rolled away like a ball of cotton.", "獣は綿の玉のように転がっていった。"],
  108: ["A Signal Head flickers, and strange words appear on its screen.", "シグナルヘッドがちらつき、画面に奇妙な言葉が浮かんだ。", "The screen went black, and the creature shut down.", "画面が真っ暗になり、生き物は動かなくなった。"],
  109: ["A Basket Cat jumps out of its basket and hisses at you.", "バスケットキャットがかごから飛び出して、シャーッと威嚇してきた。", "The cat climbed back into its basket and fell asleep.", "ネコはかごに戻り、眠ってしまった。"],
  110: ["A Carrot Rabbit waves a giant carrot like a weapon.", "キャロットラビットが巨大なにんじんを武器のように振り回している。", "The rabbit ran off, munching on its carrot.", "ウサギはにんじんをかじりながら走り去った。"]
};
/* 物語のボス（GFOES のキー） */
const GBOSSLINES = {
  hollow: ["The shadow on the wall tears itself free and reaches for Elder Bram's box!", "壁の影が自らを引きはがし、ブラム長老の箱に手を伸ばした！", "The Hollow let out a long sigh and broke into gray dust.", "ホロウは長いため息をつき、灰色の粉になって崩れた。"],
  hknight: ["The Hollow Knight raises his broken sword. \"I will not fail again!\"", "空ろの騎士が折れた剣をかかげた。「二度と失敗はせぬ！」", "The knight's sword fell from his hand, and his armor grew quiet.", "騎士の手から剣が落ち、鎧は静かになった。"],
  boss_101: ["The Glacier Titan rises from the ice to protect the Heart Crystal!", "氷河の巨人が、心臓の水晶を守るため氷の中から立ち上がった！", "The titan cracked from head to foot and collapsed.", "巨人は頭から足までひび割れ、崩れ落ちた。"],
  boss_11: ["The Canal Kraken wraps its arms around the bridge!", "水路のクラーケンが橋に腕を巻きつけた！", "The kraken let go of the bridge and sank into the dark water.", "クラーケンは橋を放し、暗い水の中へ沈んでいった。"],
  boss_64: ["Captain Varos draws his sword. \"Forgive me, travelers. Orders are orders.\"", "ヴァロス隊長が剣を抜いた。「許せ、旅人よ。命令は命令だ。」", "The captain dropped to one knee, breathing hard.", "隊長は荒い息をつきながら、片ひざをついた。"],
  boss_86: ["The Gray Herald spreads its cloak, and the lanterns begin to flicker.", "灰色の使者がマントを広げると、灯がゆらぎ始めた。", "The herald turned to ash and drifted away.", "使者は灰になり、ただよって消えた。"],
  boss_61: ["The Ink Weaver's many arms reach for every book in the room!", "インクの織り手のたくさんの腕が、部屋中の本へと伸びていく！", "The ink flowed back onto the pages where it belonged.", "インクは、本来あるべきページへと流れ戻った。"],
  boss_67: ["The Golden Whale crashes down in front of you, shaking the whole beach!", "黄金のクジラが目の前に落ちてきて、浜全体をゆるがした！", "The whale sank slowly beneath the waves.", "クジラはゆっくりと波の下へ沈んでいった。"],
  boss_88: ["The Abyss Wyrm coils around the First Page and opens its jaws!", "深淵の竜が『最初のページ』にとぐろを巻き、あごを開いた！", "The wyrm dissolved into dark water, and the bubble of light burst.", "竜は暗い水になって溶け、光の泡がはじけた。"],
  boss_100: ["The Thunder Lion roars, and the whole sky answers with lightning!", "雷獅子がほえると、空全体が稲妻で応えた！", "The lion vanished in a final flash of light.", "獅子は最後の閃光と共に消えた。"],
  boss_80: ["The Gatekeeper of Ash rises, burning with the anger of a thousand forgotten things!", "灰の門番が、忘れられた千のものの怒りに燃えて立ち上がった！", "The gatekeeper crumbled, and its anger finally cooled.", "門番は崩れ、その怒りはやっと冷めた。"],
  boss_74: ["The Queen of Oblivion rises from her throne, and the gray snow becomes a blizzard!", "忘却の女王が玉座から立ち上がると、灰色の雪が吹雪に変わった！", "The blizzard stopped. Only a blue ribbon moved in the silence.", "吹雪がやんだ。静けさの中で、青いリボンだけがゆれていた。"]
};

/* ===== クリア後のエクストラ章『書かれなかった者』（裏ボス） =====
   流れ：エンディング後、王都でオーウィン先生に話す → 3つの「失われた結末」を集める（村の学校・王都の庭・港）
   → 大図書館の奥（北の出口）から『書かれなかった書庫』へ → 裏ボス「The Unwritten」→ 真のエンディング。 */
Object.assign(RPG_CAST, { unwritten: { name: "The Unwritten", ja: "書かれなかった者" } });
Object.assign(GEXTRA_CAST, { teacher: { name: "Clara", ja: "クララ先生" } });

RPG_CHAPTERS.push({ id: "ex", title: "Extra Chapter: The Unwritten", ja: "エクストラ章　書かれなかった者", nodes: [
  { label: "ex_start" },
  { bg: "library", who: null, en: "A week after returning home, Ren dreamed of the silver train again. When he opened his eyes, he was standing in the square of the capital, holding Lina's bookmark.", ja: "家に帰って一週間後、レンはまた銀色の列車の夢を見た。目を開けると、王都の広場に立っていて、手にはリナのしおりを握っていた。" },
  { who: null, en: "The bookmark was glowing. Faintly, like a candle behind a curtain.", ja: "しおりが光っていた。カーテンの向こうのろうそくのように、かすかに。" },
  { who: "lina", face: "surprised", en: "\"...Ren? Is that really you? I thought I'd become a story with an ending.\"", ja: "「……レン？本当にあなたなの？わたし、結末のついた物語になったと思ってた。」" },
  { who: null, en: "Lina stood in front of him, but he could see the fountain through her body. She was there, and not quite there.", ja: "リナが目の前に立っていた。でも、その体を通して噴水が見えた。そこにいるのに、完全にはいない。" },
  { who: "scholar", en: "\"Lina! And the red-haired boy! Thank goodness. Come quickly. Something terrible is happening in the library.\"", ja: "「リナ！それに赤い髪の少年！よかった。早く来てくれ。図書館でとんでもないことが起きている。」" },
  { who: "scholar", en: "\"Below the Room of Unfinished Stories, there is a door that has been locked for a thousand years. Last night, it opened by itself.\"", ja: "「『未完の物語の部屋』の下に、千年閉ざされていた扉がある。ゆうべ、それがひとりでに開いたのだ。」" },
  { who: "scholar", en: "\"Behind it sleeps the Unwritten. It is the spirit of every story that was never finished. It believes an unfinished story is a wound, and that the kindest thing is to close every wound by erasing it.\"", ja: "「その奥には『書かれなかった者』が眠っている。最後まで書かれなかったすべての物語の霊だ。あれは、未完の物語を傷だと考えている。そしていちばんのやさしさは、すべての傷を消して閉じることだと。」" },
  { who: "lina", face: "sad", en: "\"...And I am the most unfinished story in Aster right now. That's why I'm still here, half faded.\"", ja: "「……そして今のアスターで、いちばん未完の物語はわたし。だからわたしは、半分消えかけたまま、まだここにいるのね。」" },
  { who: "scholar", en: "\"The door is sealed by three lost endings. Find them, bring them back, and the way down will open. Without them, even you could not reach it.\"", ja: "「扉は、三つの『失われた結末』で封じられている。それを見つけて取り戻せば、下への道が開く。それなしでは、きみたちでもたどり着けん。」" },
  { who: "ren", en: "\"Where do we look?\"", ja: "「どこを探せばいい？」" },
  { who: "scholar", en: "\"Where people stopped in the middle of something important. A teacher who never finished a lesson. A gardener who never finished a garden. A sailor who never finished a voyage.\"", ja: "「人々が、大切な何かの途中で立ち止まった場所だ。授業を終えられなかった先生。庭を完成させられなかった庭師。航海を終えられなかった船乗り。」" },
  { who: "garo", en: "\"Hmph. Easy. We know all three of those places. Let's go, library girl. Try not to fade away before we're done.\"", ja: "「ふん。簡単じゃ。三つとも知っとる場所じゃろう。行くぞ、図書館の娘。終わる前に消えたりするなよ。」" },
  { who: "lina", face: "smile", en: "\"I'll do my best, Garo.\"", ja: "「がんばるわ、ガロ。」" },

  { label: "ex_school" },
  { bg: "village", who: null, en: "In Hollowbrook, the little school was full of noise. Children ran between the desks, and Clara the teacher was laughing.", ja: "ホロウブルックの小さな学校は、にぎやかな声でいっぱいだった。子どもたちが机のあいだを走り回り、クララ先生が笑っていた。" },
  { who: "teacher", en: "\"You're the traveler who wrote on my blackboard! \"Your students will come back.\" You were right. They came back the day the Fading ended.\"", ja: "「黒板に書いてくれた旅の方ね！『生徒は戻ってきます』。本当だった。色あせが終わった日に、みんな戻ってきたの。」" },
  { who: "teacher", en: "\"But there's one lesson I never finished. On the day the Fading began, I was teaching the children a poem. I stopped at the last line, and I've never been able to remember it.\"", ja: "「でも、ひとつだけ終えられなかった授業があるの。色あせが始まった日、子どもたちに詩を教えていた。最後の一行で止まって、それっきり思い出せないの。」" },
  { who: "teacher", en: "\"\"The river forgets the mountain, the sea forgets the rain, the night forgets the morning...\" And then?\"", ja: "「『川は山を忘れ、海は雨を忘れ、夜は朝を忘れる……』。そのあとは？」" },
  { who: null, en: "The children looked at each other. Then the smallest girl raised her hand.", ja: "子どもたちは顔を見合わせた。それから、いちばん小さな女の子が手を挙げた。" },
  { who: "child", en: "\"\"...but the morning always comes again.\" My mom sang it to me. I wrote it in my diary so I wouldn't forget.\"", ja: "「『……でも、朝はいつだってまたやってくる』。お母さんが歌ってくれたの。忘れないように日記に書いておいたんだ。」" },
  { who: "teacher", en: "\"...Yes. That's it. That's the last line.\"", ja: "「……そう。それよ。それが最後の一行。」" },
  { who: null, en: "As Clara wrote the line on the blackboard, a small light rose from the chalk and floated into Ren's hand. The first lost ending.", ja: "クララ先生がその一行を黒板に書くと、チョークから小さな光が立ちのぼり、レンの手の中に浮かんできた。一つ目の、失われた結末だった。" },

  { label: "ex_garden" },
  { bg: "castle", who: null, en: "In the castle garden, King Aldric knelt in the dirt in his royal robe, planting roses with his bare hands.", ja: "城の庭で、アルドリック王が王の衣のまま土にひざをつき、素手でバラを植えていた。" },
  { who: "king", en: "\"Ah, the boy who scolded a king. Look. I've torn down the white tent. Its poles are now holding up these rose vines.\"", ja: "「ああ、王を叱った少年か。見ろ。白いテントは取り壊した。その柱が、今はこのバラのつるを支えている。」" },
  { who: "king", en: "\"Seraphine designed this garden, but she died before it was finished. She left a drawing of how it should look. I lost it long ago.\"", ja: "「この庭はセラフィーヌが設計したのだが、完成する前に亡くなった。どんな庭にするか描いた図を残してくれたのだが、ずっと前になくしてしまった。」" },
  { who: "garo", en: "\"Your Majesty. Those vines are planted too close together. They'll choke each other. Move every third one to the left.\"", ja: "「陛下。そのつるは近すぎますぞ。たがいに首をしめ合ってしまう。三本ごとに一本、左へ植え替えなされ。」" },
  { who: "king", en: "\"...Seraphine used to say the exact same thing. \"Every third one to the left, Aldric.\" How did you know?\"", ja: "「……セラフィーヌも、まったく同じことを言っていた。『三本ごとに左へよ、アルドリック』と。なぜわかった？」" },
  { who: "garo", en: "\"I'm a miner. I know how roots grow. People are the same. Give them room, and they'll bloom.\"", ja: "「わしは鉱夫ですからな。根がどう伸びるかは知っとります。人も同じじゃ。すき間をやれば、花を咲かせる。」" },
  { who: null, en: "When the last rose was moved, the whole garden matched the shape of a heart. A light rose from the center and drifted into Ren's hand. The second lost ending.", ja: "最後のバラを植え替えると、庭全体がハートの形になった。真ん中から光が立ちのぼり、レンの手の中へ流れてきた。二つ目の、失われた結末だった。" },
  { who: "king", en: "\"She drew it as a heart. Of course she did. ...Thank you.\"", ja: "「ハートの形に描いていたのか。そうだろうとも。……ありがとう。」" },

  { label: "ex_harbor" },
  { bg: "harbor", who: null, en: "At the harbor, the old sailor was staring at the horizon, holding the compass he had given Ren.", ja: "港では、老水夫が、レンにあげたのと同じ羅針盤を手に、水平線を見つめていた。" },
  { who: "sailor", en: "\"My last voyage. We set out to find the island at the edge of the map. A storm turned us back. I've always wondered what was there.\"", ja: "「わしの最後の航海はな、地図の端にある島を探しに出たんじゃ。嵐で引き返した。あそこに何があったのか、ずっと気になっとる。」" },
  { who: "ren", en: "\"Then let's finish it. The storm is gone now.\"", ja: "「なら、終わらせよう。嵐はもうないんだから。」" },
  { who: null, en: "They borrowed a small boat. Ella steered, the sailor gave orders, and Garo complained about being seasick the entire time.", ja: "小舟を借りた。エラが舵をとり、老水夫が指図をし、ガロはずっと船酔いの文句を言っていた。" },
  { who: null, en: "At sunset, they reached a tiny island with a single tree. Under it was a wooden box. Inside were twelve names carved into twelve pieces of driftwood.", ja: "夕暮れに、木が一本だけ立つ小さな島に着いた。その木の下に木箱があった。中には、12本の流木に、12人の名前が刻まれていた。" },
  { who: "sailor", en: "\"My crew. Tom, Alfie, Big Sam, Little Sam... We made a promise to leave our names here, so the sea would remember us. I remember them now. Every face.\"", ja: "「わしの乗組員じゃ。トム、アルフィー、大サム、小サム……ここに名前を残せば、海がわしらを覚えていてくれると約束したんじゃ。今は思い出せる。全員の顔を。」" },
  { who: null, en: "The old man carved a thirteenth name and placed it in the box. A light rose from the island and floated into Ren's hand. The third lost ending.", ja: "老人は13本目の流木に自分の名前を刻み、箱に入れた。島から光が立ちのぼり、レンの手の中へ浮かんできた。三つ目の、失われた結末だった。" },

  { label: "ex_enter" },
  { bg: "library", who: null, en: "Below the Room of Unfinished Stories, the locked door stood open. A staircase spiraled down into darkness, lined with books that had no words in them.", ja: "未完の物語の部屋の下で、閉ざされていた扉が開いていた。らせん階段が暗闇へと下っていて、壁には一文字も書かれていない本が並んでいた。" },
  { who: "lina", face: "sad", en: "\"These are stories that people meant to write, but never started. Letters never sent. Apologies never made. Songs that stayed in someone's head.\"", ja: "「これは、人が書こうと思って、書き始めなかった物語。出さなかった手紙。言わなかったごめんなさい。だれかの頭の中にだけあった歌。」" },
  { who: "garo", en: "\"So many. Makes my own regrets feel small.\"", ja: "「こんなにあるのか。わしの後悔なんぞ、小さく思えるわい。」" },

  { label: "ex_mid" },
  { who: null, en: "Halfway down, a page drifted out of the darkness and landed at Ren's feet. On it was a drawing: a girl with a lantern, sitting alone in a library, reading.", ja: "階段の途中で、暗闇から一枚のページが舞い降りて、レンの足元に落ちた。そこには絵が描かれていた。図書館でひとり座って本を読む、ランタンを持った女の子。" },
  { who: "lina", face: "surprised", en: "\"That's the beginning of my story. A girl alone in a library... For a hundred years, that's all my story was.\"", ja: "「それ、わたしの物語の始まり。図書館にひとりきりの女の子……100年のあいだ、わたしの物語はそれだけだった。」" },
  { who: "ren", en: "\"Not anymore. Now there's a train, and a village, and a grumpy dwarf, and a girl with a blue ribbon. And me.\"", ja: "「今はちがう。今は列車があって、村があって、気むずかしいドワーフがいて、青いリボンの女の子がいる。それに、俺も。」" },
  { who: "garo", en: "\"Who are you calling grumpy?\"", ja: "「だれが気むずかしいじゃと？」" },
  { who: "lina", face: "smile", en: "\"...You're right, Ren. My story got much longer than I ever expected.\"", ja: "「……そうね、レン。わたしの物語は、思っていたよりずっと長くなった。」" },

  { label: "ex_boss" },
  { bg: "throne", who: null, en: "At the bottom, in a hall of floating shelves, something enormous unfolded itself. It was made of torn pages and pale cloth, with an open book where its heart should be.", ja: "いちばん下の、本棚が宙に浮かぶ広間で、何か巨大なものがその身を広げた。破れたページと青白い布でできていて、心臓のあるべき場所には開いた本があった。" },
  { who: "unwritten", en: "\"Little Lantern. You have come home. Your story has a beautiful ending already. Why do you keep turning the pages?\"", ja: "「小さな灯よ。帰ってきたのだな。おまえの物語には、もう美しい結末がある。なぜまだページをめくり続ける？」" },
  { who: "unwritten", en: "\"Every unfinished story hurts. I have listened to their pain for a thousand years. Let me close them all. Let me close you, too. Then nothing will ever hurt again.\"", ja: "「未完の物語は、どれも痛む。わたしは千年、その痛みを聞いてきた。すべて閉じさせておくれ。おまえも閉じさせておくれ。そうすれば、もう何も痛むことはない。」" },
  { who: "lina", en: "\"You're wrong. An unfinished story isn't a wound. It's a door that's still open.\"", ja: "「まちがってる。未完の物語は傷じゃない。まだ開いている扉なの。」" },
  { who: "ren", en: "\"You want to give everyone a quiet ending. But the best endings are the ones people choose for themselves. Even if they hurt.\"", ja: "「あんたは、みんなに静かな結末をあげたいんだろ。でも、いちばんいい結末は、自分で選んだ結末なんだ。たとえ痛くても。」" },
  { who: "unwritten", en: "\"Then show me. Show me that a story can survive without an ending.\"", ja: "「ならば見せてみよ。結末がなくても、物語が生きのびられることを。」" },
  { battle: { name: "The Unwritten", ja: "書かれなかった者", boss: true }, vocab: 4, qs: [] },
  { who: null, en: "The Unwritten's pages fluttered slowly to the ground like snow. The book in its chest closed gently.", ja: "書かれなかった者のページが、雪のようにゆっくりと床へ舞い落ちた。胸の本が、そっと閉じた。" },
  { who: "unwritten", en: "\"...I see. You are not afraid of open doors. Then I will not close them. I will guard them instead.\"", ja: "「……そうか。おまえたちは、開いた扉をおそれないのだな。ならば、わたしはもう扉を閉じまい。代わりに、守ろう。」" },
  { who: "unwritten", en: "\"Little Lantern. Your story is not finished. It never was. Go and write the next chapter.\"", ja: "「小さな灯よ。おまえの物語は終わっていない。最初から、終わってなどいなかった。行って、次の章を書くがよい。」" },
  { who: null, en: "The three lost endings rose from Ren's hand and flew into Lina. Her body filled with color, from her shoes to the tips of her hair.", ja: "三つの失われた結末がレンの手から舞い上がり、リナの中へ飛びこんだ。靴の先から髪の先まで、彼女の体に色が満ちていった。" },
  { who: "lina", face: "surprised", en: "\"Ren... I can feel my heartbeat. I haven't felt that in a hundred and twelve years.\"", ja: "「レン……心臓の音がする。112年ぶりに、感じる。」" },

  { label: "ex_true" },
  { bg: "cg_train", who: null, en: "Spring came to Ren's town. On the first day of the new school year, Mio's class was buzzing with rumors about a transfer student.", ja: "レンの町に春が来た。新学期の初日、ミオのクラスは転校生のうわさでもちきりだった。" },
  { who: null, en: "The door opened. A girl with long chestnut hair walked in. On her bag hung a small keychain shaped like an open book.", ja: "扉が開いた。長い栗色の髪の女の子が入ってきた。かばんには、開いた本の形をした小さなキーホルダーがゆれていた。" },
  { who: "lina", face: "smile", en: "\"Nice to meet you. My name is Lina. I just moved here from a town by the sea. I... really like books.\"", ja: "「はじめまして。リナです。海辺の町から引っ越してきました。わたし……本が大好きです。」" },
  { who: null, en: "She did not seem to remember Aster. But when her eyes met Mio's, she smiled as if she had found someone she had been looking for.", ja: "彼女はアスターのことを覚えていないようだった。でも、ミオと目が合ったとき、ずっと探していた人を見つけたように、ほほえんだ。" },
  { who: "mio", face: "smile", en: "\"...Hey. Do you want to eat lunch together? My brother makes terrible jokes, but he's not a bad guy.\"", ja: "「……ねえ。お昼、いっしょに食べない？うちのお兄ちゃん、冗談はひどいけど、悪いやつじゃないんだ。」" },
  { who: null, en: "That afternoon, at the station, Ren saw three people waiting on the bench: his sister, a girl with chestnut hair, and an empty space between them that seemed saved just for him.", ja: "その日の午後、駅で、レンはベンチで待つ三人を見た。妹と、栗色の髪の女の子と、そのあいだに、まるで自分のためにとっておいたような空いた席。" },
  { who: "lina", face: "smile", en: "\"Have we met before? I feel like I've been waiting for you for a very long time.\"", ja: "「前に、会ったことありますか？ずっと長いあいだ、あなたを待っていた気がするんです。」" },
  { who: "ren", face: "smile", en: "\"...Yeah. I think we have. Want to hear a long story? It's got a train, a village, a grumpy dwarf...\"", ja: "「……ああ。会ったことあると思う。長い話、聞きたいか？列車と、村と、気むずかしいドワーフが出てくるんだ……」" },
  { who: null, en: "TRUE END — Every story deserves a next chapter.", ja: "トゥルーエンド ―― すべての物語に、次の章を。" },
  { end: true }
] });

/* ---- 戦闘の強さ・装備 ---- */
GAREA2.stacks = { t: 14, mons: [105, 102, 108, 61, 74, 93] };
GAREAS.stacks = [];
GAREA2.stacks.mons.forEach((mon, i) => { const key = "stacks_" + mon; GFOES[key] = gTierFoe(mon, 14, false); GAREAS.stacks.push([key]); if (i % 2 === 0) GAREAS.stacks.push([key, key]); });
GAREAS.stacks.push(["stacks_105", "stacks_102", "stacks_108"]);
GFOES.unwritten = gTierFoe(61, 17, true, "The Unwritten", "書かれなかった者", { foe: "unwritten" });
GFOES.unwritten.hp = Math.round(GFOES.unwritten.hp * 0.85);
GBOSS_OF["The Unwritten"] = "unwritten";
GBOSSLINES.unwritten = ["The Unwritten unfolds its thousand pages. The air fills with the whispers of stories that never ended.", "書かれなかった者が千のページを広げた。終わらなかった物語のささやきが、あたりを満たしていく。", "The pages settled like snow, and the open book closed gently.", "ページは雪のように降り積もり、開いていた本がそっと閉じた。"];
Object.assign(GEQUIP, {
  dawnblade: { name: "Dawn Blade", ja: "夜明けの剣", slot: "w", who: "ren", atk: 58, price: 0 },
  helenarod: { name: "Helena's Quill", ja: "ヘレナの羽ペン", slot: "w", who: "lina", atk: 14, mag: 34, price: 0 },
  crewaxe: { name: "Crewman's Axe", ja: "船乗りの大斧", slot: "w", who: "garo", atk: 55, price: 0 },
  rosemail: { name: "Rose Armor", ja: "バラの鎧", slot: "a", who: "ren", def: 50, price: 0 },
  poemcloak: { name: "Poem Cloak", ja: "詩のマント", slot: "a", who: "lina", def: 40, mag: 15, price: 0 },
  minerplate: { name: "Ella's Plate", ja: "エラの胸当て", slot: "a", who: "garo", def: 48, price: 0 }
});

/* ---- マップ ---- */
GMAPS.stacks = { name: "Unwritten Stacks", ja: "書かれなかった書庫", bg: "library", area: "stacks", enc: { rate: 14, area: "stacks" }, intro: "ex_enter",
  build: GD(167, 6, TILE.shelfBot, TILE.floorTile, [T(119, 0), T(119, 1)], [T(119, 3)]),
  npcs: [{ id: "unwritten", sprite: "herald", at: "boss", dir: 0, talk: "ex_boss", hideIf: "ex_done" }],
  chests: [{ id: "us1", at: 0, eq: "dawnblade" }, { id: "us2", at: 1, item: "hiwater", n: 3 }, { id: "us3", at: 2, eq: "rosemail" }, { id: "us4", at: 3, item: "feather", n: 3 }],
  events: [{ at: "mid", r: 2, scene: "ex_mid", once: "ex_mid_seen" }, { bottom: true, to: ["library", "exit", null, 0] }] };
GMAPS.library.events.push({ top: true, to: ["stacks", "entry", null, 3], need: "ex_ready", block: "ex_sealed" });
GMAPS.capital.npcs.push({ id: "orwin", sprite: "oldman", x: 16, y: 11, dir: 1, talk: "ex_start", lines: "orwin_after", showIf: "ending" });
GMAPS.village.npcs.push({ id: "clara", sprite: "woman", x: 3, y: 9, dir: 0, talk: "ex_school", lines: "clara_after", showIf: "ex_started" });
GMAPS.capital.npcs.push({ id: "king_garden", sprite: "king", x: 20, y: 13, dir: 0, talk: "ex_garden", lines: "king_after", showIf: "ex_started" });
GMAPS.harbor.npcs.push({ id: "sailor_ex", sprite: "oldman", x: 21, y: 13, dir: 0, talk: "ex_harbor", lines: "sailor_after", showIf: "ex_started" });

Object.assign(GLINES, {
  orwin_after: [{ who: "scholar", en: "\"Bring back the three lost endings: the teacher in Hollowbrook, the King's garden here in the capital, and the old sailor at the harbor.\"", ja: "「三つの失われた結末を取り戻してくるのだ。ホロウブルックの先生、この王都の王の庭、そして港の老水夫だ。」" }],
  clara_after: [{ who: "teacher", en: "\"\"...but the morning always comes again.\" I'll never forget that line now.\"", ja: "「『……でも、朝はいつだってまたやってくる』。もう二度と、この一行は忘れないわ。」" }],
  king_after: [{ who: "king", en: "\"Every third one to the left. I'll remember, Seraphine.\"", ja: "「三本ごとに左へ、だな。覚えておくよ、セラフィーヌ。」" }],
  sailor_after: [{ who: "sailor", en: "\"Thirteen names on the island now. The sea will remember all of us.\"", ja: "「島には今、13人の名前がある。海は、わしら全員を覚えていてくれるじゃろう。」" }],
  ex_sealed: [{ who: "lina", en: "\"The door below is sealed. We need all three lost endings first.\"", ja: "「下の扉は封じられてる。先に、三つの失われた結末を全部集めないと。」" }]
});

Object.assign(GSCENES, {
  ex_start: gLab("ex", "ex_start", "ex_school"), ex_school: gLab("ex", "ex_school", "ex_garden"), ex_garden: gLab("ex", "ex_garden", "ex_harbor"),
  ex_harbor: gLab("ex", "ex_harbor", "ex_enter"), ex_enter: gLab("ex", "ex_enter", "ex_mid"), ex_mid: gLab("ex", "ex_mid", "ex_boss"), ex_boss: gLab("ex", "ex_boss", "ex_true"), ex_true: gLab("ex", "ex_true")
});
const gExCount = f => ["exA", "exB", "exC"].filter(k => f[k]).length;
const gExAfter = f => { if (gExCount(f) === 3) { f.ex_ready = 1; return ["The seal below the library is broken.", "三つの失われた結末がそろった！　王都の大図書館の奥（北の出口）から、書かれなかった書庫へ行ける。"]; } return ["A lost ending has been found.", "失われた結末を取り戻した（" + gExCount(f) + "/3）。"]; };
Object.assign(GDONE2, {
  ex_start: { flag: "ex_started", msg: ["Find the three lost endings.", "エクストラ章　開始！　村の学校の先生、王都の城の庭（王都の右下）、港の老水夫をたずねよう。敵は強いので、レベルは50前後が目安。"] },
  ex_school: { flag: "exA", give: ["poemcloak"], after: gExAfter },
  ex_garden: { flag: "exB", give: ["helenarod"], after: gExAfter },
  ex_harbor: { flag: "exC", give: ["crewaxe", "minerplate"], after: gExAfter },
  ex_boss: { flag: "ex_done", after: () => null },
  ex_true: { flag: "true_end", clear: "ex", after: () => { for (const h of G.st.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; } G.pendingTalk = [{ who: null, en: "Thank you for playing to the very end.", ja: "トゥルーエンド！　最後まで遊んでくれてありがとう。このあとも王都から各地を歩ける。" }]; gWarp("capital", 12, 15, 0); return null; } }
});
// 裏ボスのあとは、そのまま真のエンディングへ
GDONE2.ex_boss.after = () => { G.pendingScene = "ex_true"; gWarp("station", 7, 5, 0); return null; };

/* ===== 寄り道：ダンジョンに落ちている日記・手紙（GNOTES）と、サブクエスト ===== */
const gN = (id, en, ja) => ({ id, nodes: [{ who: null, en, ja }] });
const GNOTES = {
  forest: [
    { id: "stone1", kind: "stone", x: 5, y: 14, tile: T(8, 0), nodes: [{ who: null, en: "A smooth gray stone sits on the moss. Someone has painted a tiny smiling face on it.", ja: "苔の上に、すべすべした灰色の石がある。だれかが小さな笑顔を描いている。" }], done: "sq_stone" },
    { id: "stone2", kind: "stone", x: 13, y: 14, tile: T(8, 0), nodes: [{ who: null, en: "Another painted stone. This one has a drawing of an old man with a long beard.", ja: "また絵の描かれた石だ。こちらには、長いひげのおじいさんが描かれている。" }], done: "sq_stone" },
    { id: "stone3", kind: "stone", x: 10, y: 24, tile: T(8, 0), nodes: [{ who: null, en: "The last painted stone. On the back, in a child's handwriting: \"For Grandpa. Love, Tobin.\"", ja: "最後の石だ。裏に、子どもの字でこう書いてある。「おじいちゃんへ。だいすき。トビン」" }], done: "sq_stone" },
    { x: 3, y: 13, ...gN("f_note", "A torn page stuck to a tree: \"If you find this, please tell my wife I didn't run away. I got lost, and then I forgot the way home. —Henry\"", "木に貼りついた破れたページ。「これを見つけたら、妻に伝えてください。逃げたんじゃない。迷って、それから帰り道を忘れてしまったんだ。――ヘンリー」") }
  ],
  ruins: [
    { x: 3, y: 10, ...gN("r_note1", "Carved into a pillar: \"Sir Aldous was here. Again. Still waiting for orders that never come.\"", "柱に刻まれた文字。「アルダス参上。またしても。来ることのない命令を、まだ待っている」") },
    { x: 12, y: 8, ...gN("r_note2", "A faded banner. Under the dust, you can read: \"Long live Princess Amaryllis.\" Nobody remembers who she was.", "色あせた旗。ほこりの下に読める文字がある。「アマリリス王女、万歳」。それがだれだったのか、覚えている者はいない。") }
  ],
  cave: [
    gN("cv_n1", "A miner's logbook: \"Day 4,018. Found a crystal shaped like a little girl's hand. I don't know why, but I couldn't stop crying.\"", "鉱夫の作業日誌。「4018日目。小さな女の子の手の形をした水晶を見つけた。なぜだかわからないが、涙が止まらなかった」"),
    gN("cv_n2", "Scratched on the wall: \"Every crystal here was once somebody's favorite day. Be gentle when you dig.\"", "壁に刻まれた文字。「ここの水晶はどれも、かつてだれかのいちばん好きな一日だった。掘るときはやさしく」"),
    gN("cv_n3", "A child's drawing pinned under a rock: a dwarf with a huge beard holding hands with a small girl. It is signed \"Ella, age 6.\"", "石の下にはさまっていた子どもの絵。大きなひげのドワーフが、小さな女の子と手をつないでいる。「エラ、6さい」と署名がある。")
  ],
  canal: [
    gN("cn_n1", "A smuggler's price list: \"First kiss — 500 gold. Graduation day — 300. Mother's lullaby — not for sale. (Boss says no.)\"", "密輸人の値段表。「初めてのキス――500ゴールド。卒業式の日――300。母の子守歌――売り物ではない（親分がだめだと言った）」"),
    gN("cn_n2", "A wet letter: \"Dear Mom, the city is big and scary. I miss your soup. I'll come home when I've saved enough. —Pip\"", "ぬれた手紙。「お母さんへ。都会は大きくてこわいです。お母さんのスープが恋しい。お金がたまったら帰ります。――ピップ」"),
    gN("cn_n3", "Charcoal drawings on the wall, made by a child: a mother, a father, a baby, and a girl. The girl's face has been drawn again and again.", "壁に子どもが描いた炭の絵。母、父、赤ちゃん、そして女の子。女の子の顔だけが、何度も何度も描き直されている。")
  ],
  castle: [
    gN("cs_n1", "A guard's diary: \"Today the King smiled at a parade. Last year he would have cried. I'm not sure which is worse.\"", "衛兵の日記。「今日、陛下がパレードでほほえまれた。去年なら泣いておられただろう。どちらがより悪いのか、わからない」"),
    gN("cs_n2", "A gardener's note: \"The Queen asked for roses by the east wall. Nobody remembers why now. I'll plant them anyway.\"", "庭師のメモ。「王妃さまは東の壁ぞいにバラをとおっしゃった。今ではだれも理由を覚えていない。それでも植えておこう」")
  ],
  hall: [
    gN("hl_n1", "Written on a lantern's paper shade: \"My father's laugh. Please keep it warm until he wants it back.\"", "ランタンの紙のかさに書かれた文字。「父の笑い声。取り戻したくなるまで、温かくしておいてください」"),
    gN("hl_n2", "A Lantern Keeper's record: \"Flames given up this year: 41,206. Flames taken back: 3. The three were the brightest I have ever seen.\"", "灯守りの記録。「今年手放された炎：41,206。取り戻された炎：3。その3つは、わたしが見た中でいちばん明るかった」"),
    gN("hl_n3", "A child's note tied to a candle: \"I gave away the day my dog died. But now I can't remember his name. Can I have just the name back?\"", "ろうそくに結ばれた子どものメモ。「犬が死んだ日を手放しました。でも、名前が思い出せなくなりました。名前だけ返してもらえますか？」")
  ],
  library: [
    gN("lb_n1", "A note in the margin of a book, in neat handwriting: \"This story ends badly. I wrote a better one on the back page. —L.\"", "本の余白に、きれいな字で書かれたメモ。「この物語は悲しい結末。裏のページに、もっといい結末を書いておきました。――L」"),
    gN("lb_n2", "A librarian's rule, framed on the wall: \"No book is ever truly finished. It only waits for its next reader.\"", "壁に額に入れて飾られた司書の心得。「本当に終わる本などない。次の読者を待っているだけだ」"),
    gN("lb_n3", "A return slip: \"Borrowed: 'How to Say Sorry.' Due: 50 years ago. Not returned.\"", "返却票。「貸出：『ごめんなさいの言い方』。返却期限：50年前。未返却」")
  ],
  sea: [
    gN("se_n1", "A message in a bottle: \"If anyone finds this, I loved her. I never told her. Her name was Rosa.\"", "びんの中の手紙。「これをだれかが見つけたら。ぼくは彼女を愛していた。一度も言えなかった。名前はローザ」"),
    gN("se_n2", "Carved on a coral pillar: \"The sea remembers everything that falls into it. That is why it is so heavy.\"", "さんごの柱に刻まれた文字。「海は、落ちてきたものをすべて覚えている。だから、あんなに重いのだ」"),
    gN("se_n3", "A soaked page from a diary: \"Helena came to the library every day after her daughter died. She read the same picture book out loud, to no one.\"", "水にぬれた日記のページ。「ヘレナは娘を亡くしたあと、毎日図書館へ来た。同じ絵本を、だれもいない場所に向かって読み聞かせていた」")
  ],
  storm: [
    gN("st_n1", "A birthday card caught on a rock: \"Happy 80th, Grandma! We'll visit next year, promise!\" It is dated twenty years ago.", "岩に引っかかった誕生日カード。「おばあちゃん、80歳おめでとう！来年は会いに行くね、約束！」。日付は20年前だ。"),
    gN("st_n2", "A torn page from a school notebook: \"Things I want to do with Haru: 1. Art museum. 2. Beach. 3. Write a book together. 4. ...\" The rest is blank.", "学校のノートの破れたページ。「ハルとやりたいこと：1. 美術館　2. 海　3. いっしょに本を書く　4. ……」。そこから先は白紙だ。"),
    gN("st_n3", "A soldier's letter: \"If I don't come home, don't be sad for too long. But please don't forget me completely either.\"", "兵士の手紙。「もし帰れなかったら、あまり長く悲しまないでくれ。でも、完全に忘れてもしまわないでくれ」")
  ],
  gate: [
    gN("gt_n1", "A half-burned photograph: a family at a festival, all wearing paper crowns. Only the smallest child's face survived the fire.", "半分焼けた写真。お祭りで、紙の王冠をかぶった家族。いちばん小さな子の顔だけが、火の中で燃え残っている。"),
    gN("gt_n2", "Scratched into the floor: \"I came here to burn my memories. I changed my mind. I'm taking them home. —A coward who became brave\"", "床に刻まれた文字。「記憶を燃やしにここへ来た。気が変わった。家に持って帰る。――勇気を出した臆病者より」")
  ],
  throne: [
    gN("th_n1", "A sketch on a loose page: Ren as a child, asleep on the sofa with a manga on his face. Signed in tiny letters: \"Big brother, age 12. Lol.\"", "一枚の紙に描かれたスケッチ。子どものころのレンが、顔に漫画をのせてソファで寝ている。小さな字で署名がある。「お兄ちゃん、12歳。笑」"),
    gN("th_n2", "A note on the Queen's desk: \"Today I took away 3,000 sad memories. Nobody thanked me. Nobody even knows my name. That's how it should be.\"", "女王の机の上のメモ。「今日、3000の悲しい記憶を引き取った。だれもお礼を言わなかった。だれもわたしの名前を知らない。それでいいの」")
  ],
  stacks: [
    gN("us_n1", "An empty book with a single line on the first page: \"Once upon a time...\" Nothing else. It has waited for its writer for a thousand years.", "一行だけ書かれた空の本。最初のページに「むかしむかし……」。それだけ。千年、書き手を待っている。"),
    gN("us_n2", "A letter that was never sent: \"Dear Dad, I'm sorry I said I hated you. I didn't mean it. I meant—\" The writing stops.", "出されなかった手紙。「お父さんへ。大きらいって言ってごめんなさい。本気じゃなかった。本当は――」。そこで字が止まっている。"),
    gN("us_n3", "A note in Lina's handwriting, very old: \"Ending #4,117 for 'The Lonely Lighthouse': the keeper's son comes home, and they fix the light together.\"", "とても古い、リナの字のメモ。「『さびしい灯台』の結末その4117：灯台守の息子が帰ってきて、ふたりで明かりを直す」")
  ]
};

/* ===== サブクエスト ===== */
Object.assign(GEXTRA_CAST, { parent: { name: "Mother", ja: "母親" }, sister: { name: "Old Woman", ja: "老婦人" } });
const GSIDE = {
  sq_tobin: [
    { bg: "cellar", who: "ren", en: "\"Elder Bram, we found these in the forest. Three painted stones.\"", ja: "「ブラム長老、森でこれを見つけました。絵の描かれた石が三つ。」" },
    { who: "elder", en: "\"...These are Tobin's. He painted faces on the stones he found. A smile for the river, me for the mountain, and...\"", ja: "「……これはトビンのものじゃ。拾った石に顔を描いておった。川には笑顔を、山にはわしを、そして……」" },
    { who: "elder", en: "\"\"For Grandpa.\" He must have hidden them for me to find. A treasure hunt. He loved treasure hunts.\"", ja: "「『おじいちゃんへ』。わしに見つけさせようと隠しておったんじゃな。宝探しじゃ。あの子は宝探しが大好きじゃった。」" },
    { who: "elder", en: "\"I never went to look. I was too sad to walk in the forest. He waited all this time for me to find them.\"", ja: "「わしは探しに行かなんだ。悲しくて、森を歩く気になれんかった。あの子はずっと、わしが見つけるのを待っておったのに。」" },
    { who: null, en: "The old man placed the three stones on his windowsill, in a neat line, exactly where they used to be.", ja: "老人は三つの石を、昔あった場所に、きちんと一列に並べて窓辺に置いた。" },
    { who: "elder", en: "\"Thank you. Take this. It's an old charm from my own grandfather. It has protected our family for generations.\"", ja: "「ありがとう。これを持っていけ。わしの祖父から伝わる古いお守りじゃ。何代も、わしらの家を守ってきた。」" }
  ],
  sq_child: [
    { bg: "castle", who: null, en: "In front of a small house in the capital, a couple stood holding a baby. A little girl was hiding behind Garo's legs.", ja: "王都の小さな家の前に、赤ん坊を抱いた夫婦が立っていた。小さな女の子が、ガロの足のうしろに隠れていた。" },
    { who: "parent", en: "\"Can I help you? ...Oh, what a cute little girl. Is she yours?\"", ja: "「何かご用ですか？……まあ、かわいい女の子。あなたがたのお子さん？」" },
    { who: "garo", en: "\"No, ma'am. She's yours. You gave away the day your son got sick. But she was in that day too, holding his hand the whole night.\"", ja: "「いいえ、奥さん。あなたの子じゃ。息子さんが病気になった日を手放したじゃろう。だが、あの日にはこの子もいた。ひと晩じゅう、弟の手を握っておった。」" },
    { who: null, en: "The girl stepped forward and held out a charcoal drawing: a mother, a father, a baby, and a girl, all holding hands.", ja: "女の子が一歩前に出て、炭で描いた絵を差し出した。母、父、赤ちゃん、そして女の子が、みんなで手をつないでいる。" },
    { who: "parent", en: "\"...Nina? Nina! Oh, my baby. How could I— how could we ever—\"", ja: "「……ニーナ？ニーナ！ああ、わたしの子。どうしてわたしたち、どうして――」" },
    { who: "child", en: "\"It's okay, Mama. The man with the big beard promised. And his beard is very big.\"", ja: "「だいじょうぶだよ、ママ。ひげの大きいおじさんが約束してくれたの。すごく大きいひげなんだよ。」" },
    { who: "garo", en: "\"Biggest promise I've got.\"", ja: "「わしの、いちばん大きな約束じゃからな。」" }
  ],
  sq_smuggler: [
    { bg: "harbor", who: "smuggler", en: "\"Hey, you're those travelers from the waterway. Don't worry, I'm out of the business. After the castle stopped burning memories, nobody wanted to buy them anymore.\"", ja: "「おい、水路で会った旅人だな。心配すんな、もう足を洗ったよ。城が記憶を燃やさなくなってから、だれも買わなくなったんでな。」" },
    { who: "smuggler", en: "\"I've still got a cart full of jars, though. First kisses, graduations, a dog's birthday party... I don't know who they belong to.\"", ja: "「ただ、びんが荷車いっぱい残っちまってる。初めてのキス、卒業式、犬の誕生日会……だれのものかわからねえ。」" },
    { who: "lina", en: "\"Bring them to the Lantern Keeper in the castle. She can find their owners. Every memory knows its way home if someone gives it a chance.\"", ja: "「城の灯守りのところへ持っていって。持ち主を見つけてくれるわ。記憶はだれかが機会をあげれば、ちゃんと家への帰り道を知っているの。」" },
    { who: "smuggler", en: "\"...Fine. But only because you asked nicely. And here, take this. I found it in a jar nobody would buy. It's a song. Seems to be about a little boat.\"", ja: "「……わかったよ。あんたが優しく頼むからだぞ。それと、これをやる。だれも買わなかったびんに入ってたんだ。歌だよ。小さな舟の歌らしい。」" },
    { who: "ren", face: "smile", en: "\"I know someone who'll want this.\"", ja: "「これを欲しがってるやつを知ってるよ。」" }
  ],
  sq_letter: [
    { bg: "village_night", who: null, en: "Behind the inn, two old women sat side by side on a bench, reading a letter together. One of them was the passenger from the train.", ja: "宿屋の裏で、ふたりの老婦人がベンチに並んで座り、いっしょに手紙を読んでいた。ひとりは、列車で出会ったあの老婦人だった。" },
    { who: "passenger", en: "\"Young man! You made it here too. Look, I found her. My sister was living in this village all along.\"", ja: "「まあ、あなた！あなたもここへたどり着いたのね。見て、見つけたの。姉はずっとこの村に住んでいたのよ。」" },
    { who: "sister", en: "\"Fifty years, and she still writes like a child. \"I'm sorry I took your red shoes.\" That's what we fought about. A pair of red shoes.\"", ja: "「50年たっても、この子の字は子どもみたい。『赤い靴を勝手に持っていってごめんなさい』。わたしたちがけんかした理由は、それよ。赤い靴一足。」" },
    { who: "passenger", en: "\"They were very nice shoes.\"", ja: "「とってもすてきな靴だったんだもの。」" },
    { who: null, en: "The two sisters laughed until they had to wipe their eyes. Then they sat quietly, holding hands, watching the stars over Hollowbrook.", ja: "姉妹は涙をふかなければならないほど笑った。それから静かに手をつないで、ホロウブルックの星をながめていた。" },
    { who: "passenger", en: "\"Don't wait fifty years, dear. I told you that, didn't I?\"", ja: "「50年も待っちゃだめよ。前にも言ったでしょう？」" },
    { who: "ren", face: "smile", en: "\"You did. I'm not waiting.\"", ja: "「言われました。俺は待ちません。」" }
  ]
};
Object.assign(GSCENES, { sq_tobin: () => GSIDE.sq_tobin, sq_child: () => GSIDE.sq_child, sq_smuggler: () => GSIDE.sq_smuggler, sq_letter: () => GSIDE.sq_letter });
Object.assign(GITEMS, { charm: { name: "Bram's Charm", ja: "ブラムのお守り", price: 0, heal: 999, icon: 13, desc: "HPを全回復" } });
const gStonesAll = f => ["stone1", "stone2", "stone3"].every(k => f["note_" + k]);
Object.assign(GDONE2, {
  sq_stone: { after: f => gStonesAll(f) ? ["All three painted stones found.", "絵の描かれた石を3つ全部見つけた！　長老の地下室へ持っていこう。"] : ["A painted stone was found.", "絵の描かれた石を見つけた（" + ["stone1", "stone2", "stone3"].filter(k => f["note_" + k]).length + "/3）。"] },
  sq_tobin: { flag: "sq_tobin_done", after: () => { G.st.bag.charm = (G.st.bag.charm || 0) + 3; G.st.bag.feather = (G.st.bag.feather || 0) + 2; return ["Sub-quest complete!", "サブクエスト「トビンの宝探し」クリア！　ブラムのお守り×3と不死鳥の羽×2をもらった。"]; } },
  sq_child: { flag: "sq_child_done", after: () => { G.st.gold += 500; G.st.bag.hiherb = (G.st.bag.hiherb || 0) + 3; return ["Sub-quest complete!", "サブクエスト「炭で描いた家族」クリア！　500ゴールドと上薬草×3をもらった。"]; } },
  sq_smuggler: { flag: "sq_smuggler_done", after: () => { G.st.bag.hiwater = (G.st.bag.hiwater || 0) + 3; return ["Sub-quest complete!", "サブクエスト「売られなかった歌」クリア！　聖なる水×3をもらった。"]; } },
  sq_letter: { flag: "sq_letter_done", after: () => { G.st.gold += 300; return ["Sub-quest complete!", "サブクエスト「赤い靴の手紙」クリア！　300ゴールドをもらった。"]; } }
});
/* サブクエストの人 */
GMAPS.cellar.npcs[0].quests = [{ need: ["note_stone1", "note_stone2", "note_stone3"], scene: "sq_tobin" }];
GMAPS.capital.npcs.push({ id: "nina_parents", sprite: "woman", x: 8, y: 9, dir: 0, lines: "nina_after", quests: [{ need: ["c4_done"], scene: "sq_child" }] });
GMAPS.harbor.npcs.push({ id: "smuggler", sprite: "man", x: 4, y: 12, dir: 0, lines: "smuggler_after", quests: [{ need: ["c8_done"], scene: "sq_smuggler" }] });
GMAPS.village.npcs.push({ id: "sisters", sprite: "oldwoman", x: 22, y: 15, dir: 2, lines: "sisters_after", showIf: "c2_done", quests: [{ need: ["c2_done"], scene: "sq_letter" }] });
Object.assign(GLINES, {
  nina_after: [{ who: "parent", en: "\"Nina drew another picture today. This time, the man with the big beard is in it too.\"", ja: "「ニーナが今日も絵を描いたの。今度は、ひげの大きいおじさんもいっしょよ。」" }],
  smuggler_after: [{ who: "smuggler", en: "\"Honest work is boring. But I sleep better.\"", ja: "「まっとうな仕事は退屈だ。でも、よく眠れるよ。」" }],
  sisters_after: [{ who: "passenger", en: "\"We're going to buy matching red shoes tomorrow.\"", ja: "「あした、おそろいの赤い靴を買いに行くのよ。」" }]
});
// 長老には、石を見つける前にヒントを
GLINES.elder_after = [{ who: "elder", en: "\"The shrine lies beyond the forest to the north. Be careful, young man.\"", ja: "「ほこらは北の森の先じゃ。気をつけてな、若いの。」" },
  { who: "elder", en: "\"...Tobin used to hide painted stones in the forest for me to find. I never went to look. If you see any, would you bring them to me?\"", ja: "「……トビンはよく、森に絵を描いた石を隠して、わしに探させようとしておった。わしは探しに行かなんだ。もし見かけたら、持ってきてくれんか？」" }];

/* ===== 王道コマンドRPG『Aster Ⅰ』の本体 =====
   画面：上にマップ（キャンバス、16pxタイルを2倍＝1マス32px、11×9マス）、下に操作パネル。
   モード：walk（歩く）／talk（会話・場面）／battle（戦闘）／menu（メニュー）／shop（お店・宿屋）
   セーブ：S.rpg.game（マップ移動・場面のあと・戦闘のあと・宿屋・宝箱・お店・メニューから） */
const GV = { W: 11, H: 9, TS: 32 };
let G = null;          // 動いている間の状態
const GIMG = {};       // 画像

/* ---------- データ ---------- */
function gHero(id, lv = 1) {
  const d = GHEROES[id], h = { id, lv, exp: lv > 1 ? gNeed(lv - 1) : 0, eq: { ...d.eq } };
  const s = gStats(h); h.hp = s.hp; h.mp = s.mp; return h;
}
function gStats(h) {
  const d = GHEROES[h.id], s = {};
  for (const k of Object.keys(d.base)) s[k] = d.base[k] + d.grow[k] * (h.lv - 1);
  for (const slot of ["w", "a"]) { const e = GEQUIP[h.eq[slot]]; if (e) for (const k of ["atk", "def", "mag"]) if (e[k]) s[k] += e[k]; }
  return s;
}
function gSkills(h) {
  const out = [];
  for (const sk of GHEROES[h.id].skills) {
    if (h.lv < sk.lv) continue;
    if (sk.id) { out.push(sk.id); continue; }
    let cur = sk.line[0]; while (GSKILLS[cur].evo && h.lv >= GSKILLS[cur].evo.lv) cur = GSKILLS[cur].evo.to; out.push(cur);
  }
  return out;
}
function gNewGame() { return { ver: 1, map: "station", x: 7, y: 5, dir: 0, gold: 30, party: [gHero("ren")], bag: { herb: 2 }, gear: {}, flags: {}, chests: {}, steps: 0, safe: ["station", 7, 5] }; }
function gLoad() { const s = S.rpg && S.rpg.game; return s ? JSON.parse(JSON.stringify(s)) : null; }
function gSave(quiet) {
  if (!G || !ready()) return;
  const snap = JSON.parse(JSON.stringify(G.st));
  G.lastSave = snap;
  patchDoc("rpg", v => { v.game = snap; v.story = v.story || RPG_STORY; v.cleared = G.cleared; }).catch(() => {});
  if (!quiet) gToast("セーブした");
}

/* ---------- 画像 ---------- */
function gLoadImages() {
  if (GIMG.tiles) return;
  const A = typeof GAME_ART !== "undefined" ? GAME_ART : {};
  const mk = src => { const im = new Image(); im.src = src; return im; };
  GIMG.tiles = mk(A.tiles || "");
  GIMG.walk = {}; for (const k in (A.walk || {})) GIMG.walk[k] = mk(A.walk[k]);
  GIMG.etc = {}; for (const k in (A.etc || {})) GIMG.etc[k] = mk(A.etc[k]);
}

/* ---------- マップ ---------- */
function gEnterMap(id, x, y, dir) {
  const def = GMAPS[id], m = def.build();
  if (typeof x === "string") { const sp = (m.spots && m.spots[x]) || [1, 1]; x = sp[0]; y = sp[1]; }
  G.map = m; G.def = def; G.st.map = id; G.st.x = x; G.st.y = y; if (dir != null) G.st.dir = dir;
  G.px = x; G.py = y; G.moving = null; G.encLeft = def.enc ? gEncSteps() : 0;
  // 日記・手紙など（読める物）を地面に置く
  const nsp = (m.spots && m.spots.note) || [];
  G.notes = ((typeof GNOTES !== "undefined" && GNOTES[id]) || []).map((n, i) => n.x != null ? n : (nsp[i] ? { ...n, x: nsp[i][0], y: nsp[i][1] } : null)).filter(Boolean);
  for (const n of G.notes) gPut(m, n.x, n.y, n.tile != null ? n.tile : T(119, 1), true);
  // 地面を先に1枚の絵にしておく
  const cv = document.createElement("canvas"); cv.width = m.w * GV.TS; cv.height = m.h * GV.TS;
  const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  const draw = () => { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) for (const t of m.cells[j * m.w + i]) c.drawImage(GIMG.tiles, (t % 8) * 16, Math.floor(t / 8) * 16, 16, 16, i * GV.TS, j * GV.TS, GV.TS, GV.TS); };
  if (GIMG.tiles.complete) draw(); else GIMG.tiles.onload = draw;
  G.ground = cv;
  const spot = a => (m.spots && m.spots[a]) || [1, 1], cs = (m.spots && m.spots.chest) || [];
  G.npcs = (def.npcs || []).filter(n => !(n.hideIf && G.st.flags[n.hideIf]) && !(n.showIf && !G.st.flags[n.showIf])).map(n => n.at ? { ...n, x: spot(n.at)[0], y: spot(n.at)[1] } : { ...n });
  G.chests = (def.chests || []).map(c => c.at != null ? (cs[c.at] ? { ...c, x: cs[c.at][0], y: cs[c.at][1] } : null) : c).filter(Boolean);
  G.events = (def.events || []).map(e => e.at ? { ...e, ax: spot(e.at)[0], ay: spot(e.at)[1] } : e);
  if (def.intro && !G.st.flags["seen_" + def.intro] && !G.pendingScene) G.pendingScene = def.intro;
  $("gMapName").textContent = def.ja;
}
const gEncSteps = () => 18 + Math.floor(Math.random() * (G.def.enc.rate || 14) * 1.5);
function gChestAt(x, y) { return (G.chests || []).find(c => c.x === x && c.y === y); }
function gNpcAt(x, y) { return G.npcs.find(n => n.x === x && n.y === y); }
function gBlocked(x, y) {
  const m = G.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  return m.solid[y * m.w + x] || !!gNpcAt(x, y) || !!gChestAt(x, y);
}

/* ---------- 描画 ---------- */
function gDraw(t) {
  const cv = $("gCanvas"); if (!cv || !G) return; const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  const m = G.map, TS = GV.TS, vw = GV.W * TS, vh = GV.H * TS;
  let fx = G.px, fy = G.py;
  if (G.moving) { const k = Math.min(1, (t - G.moving.t0) / G.moving.dur); fx = G.moving.fx + (G.moving.tx - G.moving.fx) * k; fy = G.moving.fy + (G.moving.ty - G.moving.fy) * k; }
  const mw = m.w * TS, mh = m.h * TS;
  let cx = fx * TS + TS / 2 - vw / 2, cy = fy * TS + TS / 2 - vh / 2;
  cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx)); cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy));
  c.fillStyle = "#0b0d12"; c.fillRect(0, 0, vw, vh);
  c.drawImage(G.ground, -Math.round(cx), -Math.round(cy));
  const sprites = [];
  for (const p of (G.def.props || [])) sprites.push({ y: p.y, draw: () => { const im = GIMG.etc[p.sprite]; if (im) c.drawImage(im, (Math.floor(t / 160) % 3) * 32, 32, 32, 32, p.x * TS - cx, p.y * TS - cy, TS, TS); } });
  for (const ch of (G.chests || [])) sprites.push({ y: ch.y, draw: () => { const im = GIMG.etc.chest; if (im) c.drawImage(im, (ch.eq ? 2 : 0) * 32, (G.st.chests[ch.id] ? 2 : 0) * 32, 32, 32, ch.x * TS - cx, ch.y * TS - cy, TS, TS); } });
  for (const n of G.npcs) sprites.push({ y: n.y, draw: () => gDrawChar(c, n.sprite, n.dir, 1, n.x * TS - cx, n.y * TS - cy) });
  const frame = G.moving ? [0, 1, 2, 1][Math.floor(t / 110) % 4] : 1;
  sprites.push({ y: fy, draw: () => gDrawChar(c, "ren", G.st.dir, frame, fx * TS - cx, fy * TS - cy) });
  sprites.sort((a, b) => a.y - b.y).forEach(s => s.draw());
  if (G.fade) { c.fillStyle = `rgba(0,0,0,${G.fade})`; c.fillRect(0, 0, vw, vh); }
}
function gDrawChar(c, key, dir, frame, x, y) { const im = GIMG.walk[key]; if (!im || !im.complete) return; c.drawImage(im, frame * 32, dir * 32, 32, 32, Math.round(x), Math.round(y) - 4, 32, 32); }

/* ---------- 毎フレーム ---------- */
const GDIR = { down: [0, 1, 0], left: [-1, 0, 1], right: [1, 0, 2], up: [0, -1, 3] };
function gLoop(t) {
  if (!G || !G.open) return;
  if (G.moving && t - G.moving.t0 >= G.moving.dur) { G.px = G.moving.tx; G.py = G.moving.ty; G.st.x = G.px; G.st.y = G.py; G.moving = null; gOnStep(); }
  if (!G.moving && G.mode === "walk" && G.held && !G.busy) gTryMove(G.held, t);
  gDraw(t);
  requestAnimationFrame(gLoop);
}
function gTryMove(dname, t) {
  const [dx, dy, d] = GDIR[dname]; G.st.dir = d;
  const nx = G.px + dx, ny = G.py + dy, m = G.map;
  if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) { const ev = G.events.find(e => (e.top && ny < 0) || (e.bottom && ny >= m.h) || (e.left && nx < 0) || (e.right && nx >= m.w)); if (ev) gRunEvent(ev); return; }
  if (gBlocked(nx, ny)) return;
  G.moving = { fx: G.px, fy: G.py, tx: nx, ty: ny, t0: t, dur: 150 };
}
function gOnStep() {
  G.st.steps++;
  const evs = G.events.filter(e => (e.x === G.px && e.y === G.py) || (e.rowLE != null && G.py <= e.rowLE && !(e.once && G.st.flags[e.once])) || (e.ax != null && Math.abs(e.ax - G.px) + Math.abs(e.ay - G.py) <= (e.r || 0) && !(e.once && G.st.flags[e.once])));
  for (const ev of evs) { gRunEvent(ev); return; }
  if (G.def.enc && --G.encLeft <= 0) { G.encLeft = gEncSteps(); const grp = GAREAS[G.def.enc.area]; gBattle(grp[Math.floor(Math.random() * grp.length)], null); }
}
function gRunEvent(ev) {
  if (ev.need && !G.st.flags[ev.need]) { if (ev.block) gTalk(GLINES[ev.block]); G.held = null; return; }
  if (ev.scene) { if (ev.once) G.st.flags[ev.once] = 1; G.held = null; return gScene(ev.scene); }
  if (ev.door === "inn") return gInn();
  if (ev.door && GSHOPS[ev.door]) return gShop(ev.door);
  if (ev.look) return gTalk(GLINES[ev.look]);
  if (ev.to) { G.held = null; return gWarp(...ev.to); }
}
function gWarp(map, x, y, dir) {
  G.busy = true; G.fade = 0; const t0 = performance.now();
  const step = t => { const k = (t - t0) / 220; if (k < 1) { G.fade = k; requestAnimationFrame(step); return; } gEnterMap(map, x, y, dir); const t1 = performance.now(); const back = t2 => { const k2 = (t2 - t1) / 220; G.fade = Math.max(0, 1 - k2); if (k2 < 1) requestAnimationFrame(back); else { G.fade = 0; G.busy = false; gSave(true); gAfterWarp(); } }; requestAnimationFrame(back); };
  requestAnimationFrame(step);
}
function gAfterWarp() { if (G.pendingScene) { const s = G.pendingScene; G.pendingScene = null; gScene(s); } else if (G.pendingTalk) { const n = G.pendingTalk; G.pendingTalk = null; gTalk(n); } }
function gInteract() {
  if (G.mode !== "walk" || G.moving || G.busy) return;
  const [dx, dy] = Object.values(GDIR).find(v => v[2] === G.st.dir), tx = G.px + dx, ty = G.py + dy;
  const npc = gNpcAt(tx, ty);
  if (npc && npc.quests) { const q = npc.quests.find(q => q.need.every(f => G.st.flags[f]) && !G.st.flags["seen_" + q.scene]); if (q) { npc.dir = [3, 2, 1, 0][G.st.dir]; return gScene(q.scene); } }
  const note = (G.notes || []).find(n => n.x === tx && n.y === ty);
  if (note) { const first = !G.st.flags["note_" + note.id]; G.st.flags["note_" + note.id] = 1; if (first) gSave(true); return gTalk(note.nodes, () => gNoteDone(note, first)); }
  if (npc) { npc.dir = [3, 2, 1, 0][G.st.dir]; if (npc.talk && !G.st.flags["seen_" + npc.talk]) return gScene(npc.talk); return gTalk(GLINES[npc.lines] || [{ who: null, en: "...", ja: "……" }]); }
  const ch = gChestAt(tx, ty);
  if (ch) return gOpenChest(ch);
  const ev = G.events.find(e => e.x === tx && e.y === ty && e.look);
  if (ev) return gTalk(GLINES[ev.look]);
}
function gNoteDone(note, first) {
  if (!first) return;
  if (note.done && typeof GDONE2 !== "undefined" && GDONE2[note.done]) return gSceneDone(note.done);
  const all = Object.values(GNOTES).flat().filter(n => n.kind !== "stone"), got = all.filter(n => G.st.flags["note_" + n.id]).length;
  if (note.kind !== "stone") { G.st.gold += 15; gTalk([{ who: null, en: `Ren kept the page. (${got}/${all.length})`, ja: `ページを大切にしまった。読んだ記録 ${got}/${all.length}（15ゴールドのお礼をもらった）` }]); }
}
function gOpenChest(ch) {
  if (G.st.chests[ch.id]) return gTalk([{ who: null, en: "The chest is empty.", ja: "宝箱はからっぽだ。" }]);
  G.st.chests[ch.id] = 1; sfx("coin");
  let en, ja;
  if (ch.item) { G.st.bag[ch.item] = (G.st.bag[ch.item] || 0) + (ch.n || 1); const it = GITEMS[ch.item]; en = `Ren found ${ch.n || 1} × ${it.name}!`; ja = `${it.ja}を${ch.n || 1}つ手に入れた！`; }
  else if (ch.eq) { G.st.gear[ch.eq] = (G.st.gear[ch.eq] || 0) + 1; const e = GEQUIP[ch.eq]; en = `Ren found the ${e.name}!`; ja = `${e.ja}を手に入れた！（メニューの「そうび」で装備できる）`; }
  else { G.st.gold += ch.gold; en = `Ren found ${ch.gold} gold!`; ja = `${ch.gold}ゴールドを手に入れた！`; }
  gSave(true); gTalk([{ who: null, en, ja }]);
}

/* ---------- 会話・場面 ---------- */
function gCast(who) { return (who && (RPG_CAST[who] || GEXTRA_CAST[who])) || null; }
function gScene(id) {
  const nodes = GSCENES[id]();
  G.st.flags["seen_" + id] = 1;
  gTalk(nodes, () => gSceneDone(id));
}
function gTalk(nodes, done) {
  G.mode = "talk"; G.held = null; G.talk = { nodes, i: 0, done, ja: false, cg: null };
  gTalkResolve(); gRenderPanel();
}
function gTalkResolve() {
  const T = G.talk, at = l => T.nodes.findIndex(n => n.label === l);
  for (let g = 0; g < 200; g++) {
    const n = T.nodes[T.i]; if (!n) return;
    if (n.label != null) T.i++;
    else if (n.if != null) T.i = G.st.flags[n.if] ? at(n.go) : T.i + 1;
    else if (n.go) T.i = at(n.go);
    else break;
  }
  const n = T.nodes[T.i]; if (n && n.bg && typeof RPG_BG !== "undefined" && RPG_BG[n.bg]) T.cg = n.bg;
}
function gTalkNext() {
  const T = G.talk, n = T.nodes[T.i];
  if (n && n.flag) G.st.flags[n.flag] = 1;
  T.i++; T.ja = false; gTalkResolve();
  const m = T.nodes[T.i];
  if (!m) { const done = T.done; G.talk = null; G.mode = "walk"; gRenderPanel(); gOver(); if (done) done(); return; }
  if (m.battle) { const key = GBOSS_OF[m.battle.name]; T.i++; return gBattle([key], () => { gTalkResolve(); G.mode = "talk"; gRenderPanel(); gOver(); }); }
  sfx("tap"); gRenderPanel();
}
function gRefreshNpcs() { G.npcs = G.npcs.filter(n => !(n.hideIf && G.st.flags[n.hideIf])); }
function gSceneDone(id) {
  const f = G.st.flags;
  const D = typeof GDONE2 !== "undefined" && GDONE2[id];
  if (D) {
    if (D.flag) f[D.flag] = 1;
    if (D.give) for (const k of D.give) G.st.gear[k] = (G.st.gear[k] || 0) + 1;
    if (D.after) { const r = D.after(f); if (r) { gRefreshNpcs(); gSave(true); return gTalk([{ who: null, en: r[0], ja: r[1] }]); } }
    if (D.join && !G.st.party.some(h => h.id === D.join)) G.st.party.push(gHero(D.join, Math.max(...G.st.party.map(h => h.lv))));
    if (D.clear) gMarkClear(D.clear);
    gRefreshNpcs(); gSave(true);
    if (D.ending) { G.pendingScene = "ep_all"; return gWarp("station", 7, 5, 0); }
    if (D.msg) return gTalk([{ who: null, en: D.msg[0], ja: D.msg[1] }]);
    return;
  }
  if (id === "ep_all") {
    f.ending = 1; gMarkClear("ep"); for (const h of G.st.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; }
    G.pendingTalk = [{ who: null, en: "Thank you for playing. You can keep exploring Aster.", ja: "クリアおめでとう！　このあとも、王都から各地を歩いて、レベル上げや図鑑のモンスター集めができる。" }];
    return gWarp("capital", 12, 15, 0);
  }
  if (id === "p0_station") { G.pendingScene = null; return gWarp("train", 1, 4, 2); }
  if (id === "p0_train") { gMarkClear("p0"); G.pendingScene = "c1_intro"; return gWarp("village", 12, 15, 3); }
  if (id === "c1_intro") { f.lina_joined = 1; const lv = G.st.party[0].lv; G.st.party.push(gHero("lina", lv)); G.st.safe = ["village", 12, 15]; G.npcs = G.npcs.filter(n => n.id !== "lina"); gSave(true); return gTalk([{ who: null, en: "Lina joined the party!", ja: "リナが仲間になった！　まずは青い屋根の家にいるブラム長老をたずねよう。宿屋・武器屋・道具屋もある。" }]); }
  if (id === "c1_cellar") return gScene("c1_night");
  if (id === "c1_night") { f.c1_done = 1; gMarkClear("c1"); gSave(true); return gTalk([{ who: null, en: "The road to the north is now open.", ja: "第1章クリア！　北の森へ行けるようになった。森には魔物が出る。武器や防具をそろえて、レベルを上げながら進もう。" }]); }
  if (id === "c2_forest") { gSave(true); return; }
  if (id === "c2_knight") { f.c2_done = 1; gMarkClear("c2"); G.npcs = G.npcs.filter(n => n.id !== "knight"); gSave(true); return gTalk([{ who: null, en: "The gate behind the knight is open.", ja: "第2章クリア！　騎士が守っていた奥の門から、水晶の洞窟へ進める。" }]); }
}
function gMarkClear(id) { G.cleared = G.cleared || []; if (!G.cleared.includes(id)) { G.cleared.push(id); setTimeout(() => { sfx("done"); toast("章クリア！小判＋" + RPG_CLEAR_KOBAN); }, 200); } }

/* ---------- 戦闘 ---------- */
function gBattle(keys, onWin) {
  G.mode = "battle"; G.held = null; sfx("bell");
  const foes = keys.map((k, i) => { const d = GFOES[k]; return { k, d, hp: d.hp, max: d.hp, alive: true, i }; });
  G.B = { foes, onWin, boss: foes.some(f => f.d.boss), actor: 0, acts: [], phase: "intro", log: [], sub: null };
  const seen = new Set(), intro = [];
  for (const f of foes) { if (seen.has(f.k)) continue; seen.add(f.k); const L = gFoeLines(f); intro.push({ en: L[0], ja: L[1], read: true }); }
  if (foes.length > 1 && seen.size === 1) intro[0] = { en: intro[0].en + ` (×${foes.length})`, ja: intro[0].ja + `（×${foes.length}）`, read: true };
  G.B.queue = intro; gOver(); gPlayMsgs();
}
const gAlive = () => G.st.party.filter(h => h.hp > 0);
/** モンスターの登場・退場の文（[英, 日, 英, 日]） */
function gFoeLines(f) {
  const L = (typeof GBOSSLINES !== "undefined" && GBOSSLINES[f.k]) || (typeof GMONLINES !== "undefined" && f.d.mon && !f.d.boss && GMONLINES[f.d.mon]);
  return L || [`${f.d.name} appears!`, `${f.d.ja}があらわれた！`, `${f.d.name} was defeated!`, `${f.d.ja}をたおした！`];
}
function gNextActor() { const B = G.B; while (B.actor < G.st.party.length && G.st.party[B.actor].hp <= 0) B.actor++; if (B.actor >= G.st.party.length) gResolve(); else { B.phase = "cmd"; B.sub = null; } }
function gChoose(act) { const B = G.B; B.acts.push({ ...act, who: B.actor }); B.actor++; gNextActor(); gRenderPanel(); gOver(); }
function gDmg(atk, def, pow) { return Math.max(1, Math.round((atk * pow - def / 2) * (0.88 + Math.random() * 0.24))); }
function gResolve() {
  const B = G.B; B.phase = "anim"; const P = G.st.party, msgs = [];
  const order = [...B.acts.map(a => ({ ...a, side: "h", spd: gStats(P[a.who]).spd + Math.random() * 4 })), ...B.foes.filter(f => f.alive).map(f => ({ side: "f", f, spd: f.d.spd + Math.random() * 4 }))].sort((a, b) => b.spd - a.spd);
  for (const a of order) {
    if (B.foes.every(f => !f.alive) || gAlive().length === 0) break;
    if (a.side === "h") {
      const h = P[a.who]; if (h.hp <= 0) continue; const s = gStats(h), nm = GHEROES[h.id].name;
      const pickFoe = () => { let f = B.foes[a.t]; if (!f || !f.alive) f = B.foes.find(x => x.alive); return f; };
      if (a.type === "attack") { const f = pickFoe(); const crit = Math.random() < 0.07; const d = gDmg(s.atk, f.d.def, crit ? 1.8 : 1); f.hp -= d; msgs.push({ en: `${nm} attacks! ${crit ? "Critical hit! " : ""}${d} damage to ${f.d.name}.`, ja: `${GHEROES[h.id].ja}の攻撃！${crit ? "会心の一撃！" : ""}${f.d.ja}に${d}のダメージ。`, hit: f.i, fx: crit ? "crit" : "hit" }); if (f.hp <= 0) { f.alive = false; { const L = gFoeLines(f); msgs.push({ en: L[2], ja: L[3], down: f.i, read: true }); } } }
      else if (a.type === "skill") {
        const sk = GSKILLS[a.sk]; if (h.mp < sk.mp) { msgs.push({ en: `${nm} doesn't have enough MP.`, ja: `MPが足りない！` }); continue; }
        h.mp -= sk.mp; const skn = sk.name;
        if (sk.word && !a.ok) { msgs.push({ en: `${nm} used ${skn}... but the words were wrong. Nothing happened.`, ja: `${GHEROES[h.id].ja}の${sk.ja}！……しかし言葉がまちがっていた。何も起こらない。` }); continue; }
        if (sk.kind === "heal" || sk.kind === "healall") {
          const tgts = sk.kind === "healall" ? gAlive() : [P[a.t] && P[a.t].hp > 0 ? P[a.t] : h];
          for (const tg of tgts) { const st = gStats(tg), amt = Math.round(s.mag * sk.pow + 8); tg.hp = Math.min(st.hp, tg.hp + amt); msgs.push({ en: `${nm} cast ${skn}. ${GHEROES[tg.id].name} recovered ${amt} HP.`, ja: `${GHEROES[h.id].ja}の${sk.ja}！${GHEROES[tg.id].ja}のHPが${amt}回復した。`, heal: 1 }); }
        } else {
          const tgts = (sk.kind === "magall" || sk.kind === "atkall") ? B.foes.filter(f => f.alive) : [pickFoe()];
          const phys = sk.kind === "atk" || sk.kind === "atkall", pw = phys ? s.atk : s.mag;
          msgs.push({ en: `${nm} used ${skn}!`, ja: `${GHEROES[h.id].ja}の${sk.ja}！`, fx: "magic" });
          for (const f of tgts) { const d = gDmg(pw, phys ? f.d.def : f.d.def * 0.5, sk.pow); f.hp -= d; msgs.push({ en: `${d} damage to ${f.d.name}.`, ja: `${f.d.ja}に${d}のダメージ。`, hit: f.i, fx: "crit" }); if (f.hp <= 0) { f.alive = false; { const L = gFoeLines(f); msgs.push({ en: L[2], ja: L[3], down: f.i, read: true }); } } }
        }
      } else if (a.type === "item") {
        const it = GITEMS[a.it], tg = P[a.t] || h; if (!(G.st.bag[a.it] > 0)) continue; G.st.bag[a.it]--;
        const st = gStats(tg);
        if (it.revive) { if (tg.hp > 0) { msgs.push({ en: `It had no effect.`, ja: `効果がなかった。` }); continue; } tg.hp = Math.round(st.hp * it.revive); msgs.push({ en: `${GHEROES[tg.id].name} was revived!`, ja: `${GHEROES[tg.id].ja}が生き返った！`, heal: 1 }); }
        else if (tg.hp <= 0) msgs.push({ en: `It had no effect.`, ja: `効果がなかった。` });
        else if (it.heal) { tg.hp = Math.min(st.hp, tg.hp + it.heal); msgs.push({ en: `${nm} used a ${it.name}. ${GHEROES[tg.id].name} recovered HP.`, ja: `${GHEROES[h.id].ja}は${it.ja}を使った。${GHEROES[tg.id].ja}のHPが回復した。`, heal: 1 }); }
        else if (it.mp) { tg.mp = Math.min(st.mp, tg.mp + it.mp); msgs.push({ en: `${GHEROES[tg.id].name} recovered MP.`, ja: `${GHEROES[tg.id].ja}のMPが回復した。`, heal: 1 }); }
      } else if (a.type === "run") {
        if (B.boss) { msgs.push({ en: `There is no escape!`, ja: `にげられない！` }); continue; }
        if (Math.random() < 0.7) { msgs.push({ en: `The party ran away!`, ja: `うまくにげきれた！`, ran: 1 }); B.ran = true; break; }
        msgs.push({ en: `Couldn't escape!`, ja: `にげられなかった！` });
      }
    } else {
      const f = a.f; if (!f.alive) continue; const al = gAlive(); if (!al.length) break;
      const tg = al[Math.floor(Math.random() * al.length)], st = gStats(tg), heavy = f.d.boss && Math.random() < 0.28;
      const d = gDmg(f.d.atk, st.def, heavy ? 1.6 : 1); tg.hp = Math.max(0, tg.hp - d);
      msgs.push({ en: `${f.d.name} ${heavy ? "unleashes a crushing blow" : "attacks"}! ${GHEROES[tg.id].name} takes ${d} damage.`, ja: `${f.d.ja}の${heavy ? "痛恨の一撃" : "攻撃"}！${GHEROES[tg.id].ja}は${d}のダメージを受けた。`, hurt: 1 });
      if (tg.hp <= 0) msgs.push({ en: `${GHEROES[tg.id].name} collapsed!`, ja: `${GHEROES[tg.id].ja}はたおれた！`, hurt: 1 });
    }
  }
  B.acts = []; B.queue = msgs; gPlayMsgs();
}
function gPlayMsgs() {
  const B = G.B; const m = B.queue.shift();
  if (!m) return gAfterRound();
  B.msg = m; if (m.hit != null) { B.fx = { i: m.hit, kind: m.fx || "hit", t: Date.now() }; sfx(m.fx === "crit" ? "coin" : "tap"); } else if (m.hurt) { B.fx = { hurt: true, t: Date.now() }; sfx("ng"); } else if (m.heal) sfx("ok");
  gOver(); gRenderPanel();
  clearTimeout(B.timer); B.bja = false; if (!m.read) B.timer = setTimeout(gPlayMsgs, 1150);
}
function gAfterRound() {
  const B = G.B;
  if (B.ran) return gEndBattle(false, true);
  if (B.foes.every(f => !f.alive)) return gWin();
  if (gAlive().length === 0) return gLose();
  B.actor = 0; B.msg = null; gNextActor(); gOver(); gRenderPanel();
}
function gWin() {
  const B = G.B, exp = B.foes.reduce((a, f) => a + Math.round(f.d.exp * (f.d.boss ? 1 : 2.5)), 0), gold = B.foes.reduce((a, f) => a + f.d.gold, 0), msgs = [];
  G.st.gold += gold; msgs.push({ en: `Victory! Gained ${exp} EXP and ${gold} gold.`, ja: `たたかいに勝った！ 経験値${exp}と${gold}ゴールドを手に入れた。` });
  const dexNew = B.foes.filter(f => f.d.mon).map(f => f.d.mon);
  for (const h of G.st.party) {
    if (h.hp <= 0) continue; const before = gSkills(h); h.exp += exp;
    while (h.exp >= gNeed(h.lv)) {
      const old = gStats(h); h.lv++; const nw = gStats(h); h.hp += nw.hp - old.hp; h.mp += nw.mp - old.mp;
      msgs.push({ en: `${GHEROES[h.id].name} reached level ${h.lv}!`, ja: `${GHEROES[h.id].ja}はレベル${h.lv}に上がった！`, lv: 1 });
    }
    const after = gSkills(h);
    for (const s of after) if (!before.includes(s)) { const from = before.find(b => GSKILLS[b].evo && GSKILLS[b].evo.to === s); msgs.push(from ? { en: `${GSKILLS[from].name} evolved into ${GSKILLS[s].name}!`, ja: `${GSKILLS[from].ja}が${GSKILLS[s].ja}に進化した！`, lv: 1 } : { en: `${GHEROES[h.id].name} learned ${GSKILLS[s].name}!`, ja: `${GHEROES[h.id].ja}は${GSKILLS[s].ja}をおぼえた！${GSKILLS[s].desc ? "（" + GSKILLS[s].desc + "）" : ""}`, lv: 1 }); }
  }
  if (!B.boss && Math.random() < 0.12) { G.st.bag.herb = (G.st.bag.herb || 0) + 1; msgs.push({ en: `The monster dropped a Healing Herb.`, ja: `魔物は薬草を落としていった。` }); }
  B.phase = "result"; B.queue = msgs; B.dexNew = dexNew; sfx("done");
  const play = () => { const m = B.queue.shift(); if (!m) { B.msg = null; return gEndBattle(true); } B.msg = m; B.bja = false; if (m.lv) sfx("bell"); gRenderPanel(); gOver(); B.resultNext = play; };
  play();
}
function gLose() {
  const B = G.B; B.phase = "lose"; B.msg = { en: "The party has fallen...", ja: "全滅してしまった……。最後に休んだ場所からやり直す。お金は半分になる。" }; sfx("ng"); gRenderPanel(); gOver();
}
function gEndBattle(won, ran) {
  const B = G.B; G.B = null;
  if (won && B.dexNew && B.dexNew.length && ready()) { const dex = { ...(S.rpg.dex || {}) }; for (const n of B.dexNew) dex[n] = (dex[n] || 0) + 1; patchDoc("rpg", v => { v.dex = dex; }).catch(() => {}); }
  G.mode = "walk"; gOver(); gRenderPanel(); gSave(true);
  if (won && B.onWin) B.onWin();
}
function gRetry() {
  const snap = G.lastSave ? JSON.parse(JSON.stringify(G.lastSave)) : gLoad() || gNewGame();
  snap.gold = Math.floor(G.st.gold / 2);
  for (const h of snap.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; }
  G.st = snap; G.B = null; G.talk = null; G.mode = "walk"; gEnterMap(snap.map, snap.x, snap.y, snap.dir); gOver(); gRenderPanel(); gSave(true);
}

/* ---------- 英単語の問題（ワード系の技） ---------- */
function gWordQ() { const qs = typeof rpgExQs === "function" ? rpgExQs().filter(q => q.jaOnly) : []; return qs[0] || null; }

/* ---------- 宿屋・お店・メニュー ---------- */
function gInn() { G.mode = "shop"; G.shop = { kind: "inn" }; G.held = null; gRenderPanel(); }
function gShop(kind) { G.mode = "shop"; G.shop = { kind }; G.held = null; gRenderPanel(); }
function gOpenMenu() { if (G.mode !== "walk" || G.busy) return; G.mode = "menu"; G.menu = { tab: "status" }; G.held = null; gRenderPanel(); }

/* ---------- 画面（パネル） ---------- */
function gToast(t) { toast(t); }
function gPartyBar() {
  return `<div class="g-party">${G.st.party.map(h => { const s = gStats(h); return `<div class="${h.hp <= 0 ? "ko" : h.hp < s.hp / 4 ? "low" : ""}"><b>${GHEROES[h.id].name}<small>Lv${h.lv}</small></b><span>HP ${h.hp}/${s.hp}</span><span>MP ${h.mp}/${s.mp}</span></div>`; }).join("")}</div>`;
}
function gTextBox(n, ja) {
  let c = gCast(n.who); const m = rpgMark(n.en);
  if (n.who === "ren" && G.st.flags.ren_coat && typeof RPG_FACE !== "undefined" && RPG_FACE.rentravel_neutral) c = { ...c, face: "rentravel" };
  return `<div class="g-win g-say" data-g="next" role="button" tabindex="0">
    <div class="g-head">${c ? `<span class="g-name">${esc(ja ? c.ja : c.name)}</span>` : "<span></span>"}<button type="button" class="g-tr${ja ? " on" : ""}" data-g="tr">訳</button></div>
    <div class="g-line">${rpgFace(c, n.face)}<p>${ja ? esc(n.ja) : m.html}</p></div>${ja && m.found.length ? `<div class="rpg-gloss">${m.found.map(w => `<span><b>${esc(w[0])}</b>${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""}<i class="g-more">▼</i></div>`;
}
function gRenderPanel() {
  const P = $("gPanel"); if (!P || !G) return; let h = "";
  $("gGold").textContent = G.st.gold + "G";
  if (G.mode === "walk") {
    h = `<div class="g-ctrl"><div class="g-pad">${["up", "left", "right", "down"].map(d => `<button type="button" class="g-d ${d}" data-dir="${d}" aria-label="${d}"></button>`).join("")}<span class="g-c"></span></div>
      <div class="g-ab"><button type="button" class="g-a" data-g="a">A<small>しらべる</small></button><button type="button" class="g-b" data-g="menu">B<small>メニュー</small></button></div></div>${gPartyBar()}`;
  } else if (G.mode === "talk") {
    const T = G.talk, n = T.nodes[T.i];
    if (n && n.choice) h = `<div class="g-win"><div class="g-head"><span class="g-name">${T.ja ? "選択" : "Choice"}</span><button type="button" class="g-tr${T.ja ? " on" : ""}" data-g="tr">訳</button></div><p class="g-q">${esc(T.ja ? n.choice.ja : n.choice.en)}</p>
      <div class="g-list">${n.opts.map((o, k) => `<button type="button" data-g="opt" data-k="${k}">▶ ${esc(T.ja ? o.ja : o.en)}</button>`).join("")}</div></div>`;
    else if (n) h = gTextBox(n, T.ja);
  } else if (G.mode === "battle") h = gBattlePanel();
  else if (G.mode === "shop") h = gShopPanel();
  else if (G.mode === "menu") h = gMenuPanel();
  P.innerHTML = h;
  if (G.mode !== "battle") gOver();
}
function gBattlePanel() {
  const B = G.B; let h = gPartyBar();
  if (B.phase === "lose") return h + `<div class="g-win"><p class="g-msg">${esc(B.msg.ja)}</p><button type="button" class="g-big" data-g="retry">やり直す</button></div>`;
  if (B.msg) { const mk = rpgMark(B.msg.en); return h + `<div class="g-win g-log" data-g="${B.phase === "result" ? "rnext" : "skip"}" role="button"><div class="g-head"><span></span><button type="button" class="g-tr${B.bja ? " on" : ""}" data-g="btr">訳</button></div><p class="g-msg">${B.bja ? esc(B.msg.ja) : mk.html}</p>${B.bja && mk.found.length ? `<div class="rpg-gloss">${mk.found.map(w => `<span><b>${esc(w[0])}</b>${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""}${B.msg.read || B.phase === "result" ? '<i class="g-more">▼</i>' : ""}</div>`; }
  const hero = G.st.party[B.actor]; if (!hero) return h;
  const nm = GHEROES[hero.id].ja;
  if (B.sub && B.sub.kind === "word") {
    const q = B.sub.q;
    return h + `<div class="g-win"><p class="g-q">${esc(GSKILLS[B.sub.sk].ja)}：${esc(q.en)}<small>${esc(q.ja)}</small></p><div class="g-grid">${q.opts.map((o, k) => `<button type="button" data-g="wans" data-k="${k}">${esc(o[1])}</button>`).join("")}</div></div>`;
  }
  if (B.sub && B.sub.kind === "target") {
    const list = B.sub.ally ? G.st.party.map((p, i) => [i, `${GHEROES[p.id].ja}（HP ${p.hp}）`]) : B.foes.filter(f => f.alive).map(f => [f.i, f.d.ja]);
    return h + `<div class="g-win"><p class="g-q">${B.sub.ally ? "だれに？" : "どの敵に？"}</p><div class="g-list">${list.map(([i, t]) => `<button type="button" data-g="tgt" data-k="${i}">▶ ${esc(t)}</button>`).join("")}<button type="button" data-g="back">もどる</button></div></div>`;
  }
  if (B.sub && B.sub.kind === "skills") {
    const sks = gSkills(hero);
    return h + `<div class="g-win"><p class="g-q">${nm}のとくぎ（MP ${hero.mp}）</p><div class="g-list">${sks.map(s => { const k = GSKILLS[s]; return `<button type="button" data-g="sk" data-k="${s}"${hero.mp < k.mp ? " disabled" : ""}>▶ ${esc(k.ja)} <small>${esc(k.name)}・MP${k.mp}${k.word ? "・英単語" : ""}</small></button>`; }).join("") || "<p class='g-msgja'>まだ覚えていない</p>"}<button type="button" data-g="back">もどる</button></div></div>`;
  }
  if (B.sub && B.sub.kind === "items") {
    const its = Object.entries(G.st.bag).filter(([, n]) => n > 0);
    return h + `<div class="g-win"><p class="g-q">どうぐ</p><div class="g-list">${its.map(([k, n]) => `<button type="button" data-g="it" data-k="${k}">▶ ${esc(GITEMS[k].ja)} ×${n} <small>${esc(GITEMS[k].desc)}</small></button>`).join("") || "<p class='g-msgja'>何も持っていない</p>"}<button type="button" data-g="back">もどる</button></div></div>`;
  }
  return h + `<div class="g-win"><p class="g-q">What will ${GHEROES[hero.id].name} do?<small>${nm}はどうする？</small></p><div class="g-grid"><button type="button" data-g="cmd" data-k="attack">Attack<small>たたかう</small></button><button type="button" data-g="cmd" data-k="skills">Skill<small>とくぎ</small></button><button type="button" data-g="cmd" data-k="items">Item<small>どうぐ</small></button><button type="button" data-g="cmd" data-k="run">Run<small>にげる</small></button></div></div>`;
}
function gShopPanel() {
  const sh = G.shop, st = G.st;
  if (sh.kind === "inn") return `<div class="g-win"><p class="g-q">「旅の方、ようこそ。ひと晩${GINN_PRICE}ゴールドだよ。泊まっていくかい？」<small>"Welcome, traveler. A night costs ${GINN_PRICE} gold. Will you stay?"</small></p><div class="g-grid"><button type="button" data-g="inn">泊まる（${GINN_PRICE}G）</button><button type="button" data-g="leave">やめる</button></div></div>`;
  const list = GSHOPS[sh.kind];
  return `<div class="g-win"><p class="g-q">${sh.kind === "armory" ? "武器と防具の店" : "道具屋"}　<small>所持金 ${st.gold}G</small></p><div class="g-list">${list.map(k => {
    const e = GEQUIP[k], it = GITEMS[k], o = e || it, info = e ? `${e.who === "ren" ? "レン" : "リナ"}用 ${e.atk ? "攻+" + e.atk : ""}${e.def ? "守+" + e.def : ""}${e.mag ? " 魔+" + e.mag : ""}` : it.desc;
    const own = e ? (st.gear[k] || 0) + st.party.filter(p => p.eq.w === k || p.eq.a === k).length : (st.bag[k] || 0);
    return `<button type="button" data-g="buy" data-k="${k}"${st.gold < o.price ? " disabled" : ""}>▶ ${esc(o.ja)} <b>${o.price}G</b><small>${esc(info)}・持っている数 ${own}</small></button>`;
  }).join("")}<button type="button" data-g="leave">店を出る</button></div></div>`;
}
function gMenuPanel() {
  const st = G.st, tab = G.menu.tab;
  const tabs = `<div class="g-tabs">${[["status", "つよさ"], ["items", "どうぐ"], ["equip", "そうび"], ["save", "セーブ"]].map(([k, l]) => `<button type="button" data-g="tab" data-k="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}<button type="button" data-g="leave">とじる</button></div>`;
  let body = "";
  if (tab === "status") body = st.party.map(h => { const s = gStats(h); return `<div class="g-stat"><b>${GHEROES[h.id].ja}　Lv${h.lv}</b><span>HP ${h.hp}/${s.hp}　MP ${h.mp}/${s.mp}</span><span>攻撃 ${s.atk}　守備 ${s.def}　魔力 ${s.mag}　素早さ ${s.spd}</span><span>次のレベルまで ${gNeed(h.lv) - h.exp}</span><span>とくぎ：${gSkills(h).map(k => GSKILLS[k].ja).join("・") || "なし"}</span></div>`; }).join("");
  if (tab === "items") { const its = Object.entries(st.bag).filter(([, n]) => n > 0); body = its.length ? its.map(([k, n]) => `<div class="g-row"><span>${esc(GITEMS[k].ja)} ×${n}<small>${esc(GITEMS[k].desc)}</small></span>${GITEMS[k].revive ? "" : st.party.map((p, i) => `<button type="button" data-g="use" data-k="${k}" data-t="${i}">${GHEROES[p.id].ja}に</button>`).join("")}</div>`).join("") : "<p class='g-msgja'>何も持っていない</p>"; }
  if (tab === "equip") body = st.party.map((p, i) => ["w", "a"].map(slot => { const cur = GEQUIP[p.eq[slot]]; const opts = Object.keys(GEQUIP).filter(k => GEQUIP[k].who === p.id && GEQUIP[k].slot === slot && (st.gear[k] > 0)); return `<div class="g-row"><span>${GHEROES[p.id].ja}の${slot === "w" ? "武器" : "防具"}：<b>${esc(cur ? cur.ja : "なし")}</b></span>${opts.map(k => `<button type="button" data-g="eq" data-k="${k}" data-t="${i}">${esc(GEQUIP[k].ja)}に</button>`).join("")}</div>`; }).join("")).join("");
  if (tab === "save") body = `<p class="g-msgja">マップを移動したときや、戦闘・宿屋のあとに自動でセーブされる。今すぐセーブもできる。</p><button type="button" class="g-big" data-g="save">今すぐセーブ</button><p class="g-msgja">モンスター・アイテムの絵：モケモ／マップ・キャラ：ぴぽや</p>`;
  return `<div class="g-win">${tabs}<div class="g-menubody">${body}</div></div>`;
}

/* ---------- 戦闘とCGの絵（キャンバスの上） ---------- */
function gOver() {
  const o = $("gOver"); if (!o || !G) return;
  if (G.mode === "battle" && G.B) {
    const B = G.B, bg = (typeof RPG_BG !== "undefined" && RPG_BG[G.def.bg]) || "";
    const fx = B.fx && Date.now() - B.fx.t < 600 ? B.fx : null;
    o.className = "g-over battle" + (fx && fx.hurt ? " hurt" : "");
    o.style.backgroundImage = bg ? `url('${bg}')` : "";
    o.innerHTML = `<div class="g-foes">${B.foes.map(f => { const src = (f.d.foe && typeof RPG_FOE !== "undefined" && RPG_FOE[f.d.foe]) || rpgMonSrc(f.d.mon); return `<div class="g-foe${f.alive ? "" : " down"}${fx && fx.i === f.i ? " " + fx.kind : ""}${f.d.boss ? " boss" : ""}"><img src="${src}" alt=""><span>${esc(f.d.name)}</span></div>`; }).join("")}</div>`;
    return;
  }
  const cg = G.mode === "talk" && G.talk && G.talk.cg;
  if (cg && typeof RPG_BG !== "undefined" && RPG_BG[cg]) { o.className = "g-over cg"; o.style.backgroundImage = `url('${RPG_BG[cg]}')`; o.innerHTML = ""; return; }
  o.className = "g-over"; o.style.backgroundImage = ""; o.innerHTML = "";
}

/* ---------- 操作 ---------- */
function gClick(e) {
  const b = e.target.closest("[data-g]"); if (!b || b.disabled || !G) return;
  const k = b.dataset.g, v = b.dataset.k, st = G.st;
  if (k === "a") return gInteract();
  if (k === "menu") return gOpenMenu();
  if (k === "tr") { e.stopPropagation(); G.talk.ja = !G.talk.ja; sfx("tap"); return gRenderPanel(); }
  if (k === "next") return gTalkNext();
  if (k === "opt") { const n = G.talk.nodes[G.talk.i], o = n.opts[Number(v)]; if (o.flag) st.flags[o.flag] = 1; G.talk.i = G.talk.nodes.findIndex(x => x.label === o.go); G.talk.ja = false; gTalkResolve(); sfx("ok"); return gRenderPanel(); }
  // 戦闘
  if (G.mode === "battle" && G.B) {
    const B = G.B, hero = st.party[B.actor];
    if (k === "btr") { e.stopPropagation(); B.bja = !B.bja; clearTimeout(B.timer); sfx("tap"); return gRenderPanel(); }
    if (k === "skip") { clearTimeout(B.timer); return gPlayMsgs(); }
    if (k === "rnext") return B.resultNext && B.resultNext();
    if (k === "retry") return gRetry();
    if (k === "back") { B.sub = null; return gRenderPanel(); }
    if (k === "cmd") {
      if (v === "attack") { const al = B.foes.filter(f => f.alive); if (al.length === 1) return gChoose({ type: "attack", t: al[0].i }); B.sub = { kind: "target", next: { type: "attack" } }; return gRenderPanel(); }
      if (v === "skills") { B.sub = { kind: "skills" }; return gRenderPanel(); }
      if (v === "items") { B.sub = { kind: "items" }; return gRenderPanel(); }
      if (v === "run") return gChoose({ type: "run" });
    }
    if (k === "sk") {
      const sk = GSKILLS[v];
      if (sk.word) { const q = gWordQ(); if (!q) return gChoose({ type: "skill", sk: v, ok: true, t: (B.foes.find(f => f.alive) || {}).i }); B.sub = { kind: "word", sk: v, q }; return gRenderPanel(); }
      if (sk.kind === "heal") { B.sub = { kind: "target", ally: true, next: { type: "skill", sk: v } }; return gRenderPanel(); }
      if (sk.kind === "atk" || sk.kind === "mag") { const al = B.foes.filter(f => f.alive); if (al.length === 1) return gChoose({ type: "skill", sk: v, t: al[0].i }); B.sub = { kind: "target", next: { type: "skill", sk: v } }; return gRenderPanel(); }
      return gChoose({ type: "skill", sk: v });
    }
    if (k === "wans") { const ok = Number(v) === B.sub.q.a; sfx(ok ? "ok" : "ng"); toast(ok ? "正解！ " + B.sub.q.tip : "ちがう… " + B.sub.q.tip); const al = B.foes.find(f => f.alive); return gChoose({ type: "skill", sk: B.sub.sk, ok, t: al && al.i }); }
    if (k === "it") { B.sub = { kind: "target", ally: true, next: { type: "item", it: v } }; return gRenderPanel(); }
    if (k === "tgt") return gChoose({ ...B.sub.next, t: Number(v) });
    return;
  }
  // お店・宿屋
  if (k === "leave") { G.mode = "walk"; G.shop = null; G.menu = null; return gRenderPanel(); }
  if (k === "inn") { if (st.gold < GINN_PRICE) return toast("お金が足りない"); st.gold -= GINN_PRICE; for (const h of st.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; } st.safe = [st.map, G.px, G.py]; sfx("done"); G.mode = "walk"; gRenderPanel(); gSave(true); const rest = [{ who: null, en: "The party rested and recovered fully.", ja: "ぐっすり休んで、HPとMPがすべて回復した。（セーブした）" }];
    const it = typeof GINNTALK !== "undefined" && GINNTALK.find(x => st.flags[x.need] && !st.flags[x.not] && !st.flags["seen_" + x.id]);
    if (it) { st.flags["seen_" + it.id] = 1; return gTalk([...it.nodes, ...rest]); }
    return gTalk(rest); }
  if (k === "buy") { const e = GEQUIP[v], it = GITEMS[v], price = (e || it).price; if (st.gold < price) return; st.gold -= price; if (e) st.gear[v] = (st.gear[v] || 0) + 1; else st.bag[v] = (st.bag[v] || 0) + 1; sfx("coin"); toast(((e || it).ja) + "を買った" + (e ? "（メニューのそうびで装備）" : "")); gSave(true); return gRenderPanel(); }
  // メニュー
  if (k === "tab") { G.menu.tab = v; return gRenderPanel(); }
  if (k === "use") { const it = GITEMS[v], h = st.party[Number(b.dataset.t)], s = gStats(h); if (!(st.bag[v] > 0) || h.hp <= 0) return toast("使えない"); st.bag[v]--; if (it.heal) h.hp = Math.min(s.hp, h.hp + it.heal); if (it.mp) h.mp = Math.min(s.mp, h.mp + it.mp); sfx("ok"); gSave(true); return gRenderPanel(); }
  if (k === "eq") { const h = st.party[Number(b.dataset.t)], e = GEQUIP[v], old = h.eq[e.slot]; if (!(st.gear[v] > 0)) return; st.gear[v]--; if (old) st.gear[old] = (st.gear[old] || 0) + 1; h.eq[e.slot] = v; const s = gStats(h); h.hp = Math.min(h.hp, s.hp); h.mp = Math.min(h.mp, s.mp); sfx("ok"); gSave(true); return gRenderPanel(); }
  if (k === "save") return gSave();
}
function gKey(e) {
  if (!G || !G.open) return;
  const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  if (map[e.key]) { e.preventDefault(); if (e.type === "keydown") G.held = map[e.key]; else if (G.held === map[e.key]) G.held = null; return; }
  if (e.type !== "keydown") return;
  if (e.key === "z" || e.key === "Enter" || e.key === " ") { e.preventDefault(); if (G.mode === "walk") gInteract(); else if (G.mode === "talk") { const n = G.talk.nodes[G.talk.i]; if (n && !n.choice) gTalkNext(); } else if (G.mode === "battle" && G.B && G.B.msg) { if (G.B.phase === "result") G.B.resultNext(); else { clearTimeout(G.B.timer); gPlayMsgs(); } } }
  if (e.key === "x" || e.key === "Escape") { if (G.mode === "walk") gOpenMenu(); else if (G.mode === "menu" || G.mode === "shop") { G.mode = "walk"; gRenderPanel(); } }
}

/* ---------- 開く・閉じる ---------- */
function gOpen(fresh) {
  gLoadImages();
  if (!document.getElementById("game")) {
    const d = document.createElement("div"); d.id = "game"; d.className = "game";
    d.innerHTML = `<div class="g-top"><b id="gMapName"></b><span id="gGold"></span><button type="button" id="gClose" aria-label="とじる">✕</button></div>
      <div class="g-stage"><canvas id="gCanvas" width="${GV.W * GV.TS}" height="${GV.H * GV.TS}"></canvas><div id="gOver" class="g-over"></div></div><div id="gPanel" class="g-panel"></div>`;
    document.body.append(d);
    d.addEventListener("click", gClick);
    const pad = e => { const b = e.target.closest("[data-dir]"); if (!b || !G) return; e.preventDefault(); G.held = b.dataset.dir; b.setPointerCapture && b.setPointerCapture(e.pointerId); };
    d.addEventListener("pointerdown", pad);
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) d.addEventListener(ev, e => { if (e.target.closest && e.target.closest("[data-dir]") && G) G.held = null; });
    d.addEventListener("keydown", e => { if (e.target.dataset && e.target.dataset.g === "next" && (e.key === "Enter")) { e.preventDefault(); gTalkNext(); } });
    $("gClose").onclick = gClose;
    addEventListener("keydown", gKey); addEventListener("keyup", gKey);
  }
  document.getElementById("game").hidden = false; document.body.classList.add("g-lock");
  const saved = fresh ? null : gLoad();
  G = { st: saved || gNewGame(), open: true, mode: "walk", cleared: [...((S.rpg && S.rpg.cleared) || [])] };
  G.lastSave = saved ? JSON.parse(JSON.stringify(saved)) : null;
  gEnterMap(G.st.map, G.st.x, G.st.y, G.st.dir); gRenderPanel(); gOver();
  requestAnimationFrame(gLoop);
  if (!saved) setTimeout(() => gScene("p0_station"), 300); else if (G.pendingScene) setTimeout(gAfterWarp, 300);
}
function gClose() {
  if (G) { if (G.mode === "battle") { if (!G.closeOk) { G.closeOk = true; toast("戦闘中。もう一度 ✕ を押すと、この戦闘はなかったことにしてとじる"); setTimeout(() => { if (G) G.closeOk = false; }, 3000); return; } } gSave(true); G.open = false; }
  const d = document.getElementById("game"); if (d) d.hidden = true; document.body.classList.remove("g-lock"); G = null; renderRPG();
}

/* ===== ミッション：部門ごとに段階つき。達成すると右上に右からポップが出る =====
   達成かどうかは毎回記録から計算するので、巻き戻らない。小判は econ() で足す。 */
const MIS_CAT = [
  ["time", "勉強時間"], ["habit", "習慣"], ["words", "英単語"], ["japanese", "古文・政経"],
  ["skill", "文法・演習"], ["fit", "体づくり"], ["rpg", "冒険"], ["yokai", "お化け"]
];
let misCache = null, misAt = 0, misBusy = false;
function misStats() {
  const e = econ(), keys = Object.keys(S.days);
  const vals = st => Object.values((st && st.w) || {});
  const fastSum = st => vals(st).reduce((a, s) => a + (s[1] || 0), 0);
  const known = (st, n) => vals(st).filter(s => (s[0] || 0) >= n).length;
  let best = 0, run = 0, prev = null, goalDays = 0, maxDay = 0, early = 0;
  for (const k of keys.sort()) {
    const m = minOf(k); maxDay = Math.max(maxDay, m);
    const ok = m >= targetFor(modeOf(k)); if (ok) goalDays++;
    run = ok && prev && addDays(prev, 1) === k ? run + 1 : ok ? 1 : 0; if (ok) prev = k; best = Math.max(best, run);
    if ((S.days[k] || {}).goal) early++;
  }
  const fitDays = keys.filter(fitOk).length, cardioTot = keys.reduce((a, k) => a + cardioMin(k), 0);
  const postDays = keys.filter(postureOk).length, snackDays = keys.filter(k => fitOf(k).snack === true).length, weighDays = keys.filter(k => fitOf(k).weight).length;
  const r = S.rpg || {}, g = r.game || {}, lv = Math.max(0, ...((g.party || []).map(h => h.lv || 0)));
  const reviews = keys.filter(k => (S.days[k] || {}).review).length;
  const quizOk = Object.values((S.seikei && S.seikei.quiz) || {}).reduce((a, x) => a + (x[0] || 0), 0);
  const gram = Object.values(S.grammar.units || {}).filter(u => u.passed).length;
  return {
    h: e.totalMin / 60, maxDay: maxDay / 60, goalDays, best, streak: streakNow(), pomos: e.pomos, clears: e.clears, early, reviews,
    wFast: fastSum(S.words), wKnown: known(S.words, 3), wMaster: known(S.words, 5),
    kFast: fastSum(S.kobun), kKnown: known(S.kobun, 3), sFast: fastSum(S.seikei), quizOk,
    cloze: S.cloze.correct || 0, gram, scores: (S.scores || []).length, bests: e.bests,
    fitDays, cardioTot, postDays, snackDays, weighDays,
    ch: (r.cleared || []).length, lv, dex: Object.keys(r.dex || {}).length, steps: g.steps || 0, gold: g.gold || 0,
    own: Object.keys(S.game.owned || {}).length, gacha: S.game.gacha || 0, outfits: ((S.game.outfits || {}).owned || []).length, tier: typeof passTier === "function" ? passTier() : 0
  };
}
/* [部門, 指標, 段階の数字, 名前(n), 単位, 小判の倍率] */
const MIS_DEF = [
  ["time", "h", [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 650, 800, 1000, 1100], n => "累計" + n + "時間", "h", 1],
  ["time", "maxDay", [3, 5, 8, 10, 12], n => "1日に" + n + "時間", "h", 2],
  ["time", "goalDays", [1, 3, 7, 14, 30, 50, 75, 100], n => "目標時間を達成した日 " + n + "日", "日", 1.5],
  ["habit", "streak", [2, 3, 5, 7, 14, 21, 30, 60], n => "連続達成 " + n + "日", "日", 2],
  ["habit", "clears", [1, 3, 7, 15, 30, 50, 80], n => "ノルマ全クリア " + n + "日", "日", 1.5],
  ["habit", "pomos", [1, 10, 25, 50, 100, 200, 300, 500], n => "ポモドーロ " + n + "セット", "セット", 1],
  ["habit", "early", [1, 5, 15, 30], n => "今日の目標を書いた日 " + n + "日", "日", 1],
  ["habit", "reviews", [1, 5, 15, 30], n => "夜の振り返り " + n + "日", "日", 1],
  ["words", "wFast", [50, 200, 500, 1000, 2000, 3500, 5000, 8000, 12000], n => "英単語を即答 のべ" + n + "回", "回", 1],
  ["words", "wKnown", [50, 100, 300, 500, 800, 1000, 1200, 1500], n => "英単語 " + n + "語を定着（3回連続即答）", "語", 1.5],
  ["words", "wMaster", [100, 500, 1000, 1500], n => "英単語 " + n + "語を完璧に（5回連続）", "語", 2],
  ["words", "cloze", [10, 50, 150, 300, 600], n => "穴埋め " + n + "問正解", "問", 1],
  ["japanese", "kFast", [30, 150, 400, 800, 1500, 2500], n => "古文単語を即答 のべ" + n + "回", "回", 1],
  ["japanese", "kKnown", [30, 100, 200, 317], n => "古文単語 " + n + "語を定着", "語", 1.5],
  ["japanese", "sFast", [50, 300, 800, 1500, 3000], n => "政経を即答 のべ" + n + "回", "回", 1],
  ["japanese", "quizOk", [20, 100, 300, 600], n => "政経4択 " + n + "問正解", "問", 1],
  ["skill", "gram", [1, 5, 10, 14, 20, 27, 34], n => "文法 " + n + "単元に合格", "単元", 2],
  ["skill", "scores", [1, 3, 5, 10, 20, 30], n => "過去問・模試を " + n + "回記録", "回", 2],
  ["skill", "bests", [1, 3, 5, 10], n => "自己ベスト更新 " + n + "回", "回", 2],
  ["fit", "fitDays", [1, 3, 6, 12, 24, 36, 52, 78], n => "筋トレ完了 " + n + "回", "回", 1.5],
  ["fit", "cardioTot", [20, 100, 300, 600, 1000, 2000], n => "有酸素 合計" + n + "分", "分", 1],
  ["fit", "postDays", [1, 7, 14, 30, 60, 100], n => "姿勢リセット " + n + "日", "日", 1],
  ["fit", "snackDays", [1, 7, 14, 30, 60], n => "間食100kcal以内 " + n + "日", "日", 1],
  ["fit", "weighDays", [1, 4, 8, 16, 26], n => "体重を記録 " + n + "回", "回", 1],
  ["rpg", "ch", [1, 2, 4, 6, 8, 10, 12], n => "物語 " + n + "章クリア", "章", 2],
  ["rpg", "lv", [5, 10, 20, 30, 40, 50, 60], n => "パーティーがLv" + n + "に", "Lv", 1.5],
  ["rpg", "dex", [10, 25, 50, 75, 100], n => "モンスター図鑑 " + n + "種", "種", 1.5],
  ["rpg", "steps", [500, 2000, 5000, 10000], n => n + "歩 歩く", "歩", 1],
  ["yokai", "own", [3, 5, 10, 15, 20, 24], n => "お化けを " + n + "体集める", "体", 1.5],
  ["yokai", "gacha", [1, 10, 30, 50, 100], n => "ガチャを " + n + "回まわす", "回", 1],
  ["yokai", "outfits", [1, 3, 5, 10], n => "小物を " + n + "個集める", "個", 1],
  ["yokai", "tier", [1, 5, 10, 20, 30], n => "百鬼の道 " + n + "段", "段", 1.5]
];
const MISSIONS = MIS_DEF.flatMap(([cat, key, steps, name, unit, mul]) => steps.map((n, i) => ({
  id: key + "_" + n, cat, key, n, name: name(n), unit, koban: Math.round((10 + i * 15) * mul / 5) * 5
})));
function misState() {
  if (misCache && Date.now() - misAt < 1500) return misCache;
  let st; misBusy = true; try { st = misStats(); } catch (e) { st = {}; } finally { misBusy = false; }
  misCache = { st, done: new Set(MISSIONS.filter(m => (st[m.key] || 0) >= m.n).map(m => m.id)) }; misAt = Date.now();
  return misCache;
}
function missionKoban() { if (misBusy) return 0; const d = misState().done; return MISSIONS.reduce((a, m) => a + (d.has(m.id) ? m.koban : 0), 0); }

/* ---- 達成ポップ（右上・右からニョキっと） ---- */
const MIS_SEEN = "kr-mis-seen";
let misQueue = [], misShowing = false;
function missionCheck() {
  if (typeof allLoaded === "function" && !allLoaded()) return;
  const d = misState().done; let seen;
  try { seen = JSON.parse(localStorage.getItem(MIS_SEEN) || "null"); } catch (e) { seen = null; }
  if (!Array.isArray(seen)) { try { localStorage.setItem(MIS_SEEN, JSON.stringify([...d])); } catch (e) {} return; } // 初回は今までの分を黙って記録
  const s = new Set(seen), fresh = MISSIONS.filter(m => d.has(m.id) && !s.has(m.id));
  if (!fresh.length) return;
  for (const m of fresh) s.add(m.id);
  try { localStorage.setItem(MIS_SEEN, JSON.stringify([...s])); } catch (e) {}
  misQueue.push(...fresh.slice(-5)); misNext();
}
function misNext() {
  if (misShowing || !misQueue.length) return;
  misShowing = true; const m = misQueue.shift();
  const el = document.createElement("div"); el.className = "mpop"; el.setAttribute("role", "status");
  el.innerHTML = `<span class="mpop-ic"><svg><use href="#i-star"/></svg></span><span class="mpop-tx"><small>ミッション達成</small><b>${esc(m.name)}</b></span><span class="mpop-rw"><i class="koban"></i>+${m.koban}</span>`;
  el.onclick = () => { go("record"); misTab = m.cat; misOpen = true; renderMissions(); };
  document.body.appendChild(el); sfx("coin");
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
  setTimeout(() => { el.classList.remove("in"); el.classList.add("out"); setTimeout(() => { el.remove(); misShowing = false; misNext(); }, 420); }, 2800);
}

/* ---- 一覧（記録タブ） ---- */
let misTab = "time", misOpen = false;
function renderMissions() {
  const box = $("misList"); if (!box) return;
  const { st, done } = misState();
  $("misSum").textContent = done.size + " / " + MISSIONS.length;
  const chips = MIS_CAT.map(([id, nm]) => { const all = MISSIONS.filter(m => m.cat === id), n = all.filter(m => done.has(m.id)).length; return `<button type="button" data-mc="${id}" aria-pressed="${id === misTab}">${nm}<small>${n}/${all.length}</small></button>`; }).join("");
  const list = MISSIONS.filter(m => m.cat === misTab);
  const keys = [...new Set(list.map(m => m.key))];
  const next = keys.map(k => list.find(m => m.key === k && !done.has(m.id))).filter(Boolean), got = list.filter(m => done.has(m.id));
  const row = m => { const v = st[m.key] || 0, ok = done.has(m.id), pct = clamp(100 * v / m.n, 0, 100);
    return `<li class="mis${ok ? " ok" : ""}"><span class="mis-ic"><svg><use href="#i-${ok ? "check" : "star"}"/></svg></span><div><b>${esc(m.name)}</b>${ok ? "" : `<div class="bar-p"><i style="width:${pct}%"></i></div><small>${Math.floor(v * 10) / 10} / ${m.n}${esc(m.unit)}</small>`}</div><span class="mis-rw"><i class="koban"></i>${m.koban}</span></li>`; };
  const h = `<div class="mischips">${chips}</div><ul class="mislist">${next.map(row).join("") || '<li class="mis-sep">この部門は全部達成！</li>'}</ul>` +
    (got.length ? `<details class="misgot"><summary>達成したミッション ${got.length}</summary><ul class="mislist">${got.slice().reverse().map(row).join("")}</ul></details>` : "") +
    `<div class="note" style="text-align:center;margin-top:6px">この部門 ${got.length} / ${list.length}</div>`;
  if (box.dataset.v !== h) { box.innerHTML = h; box.dataset.v = h; }
  const c = $("misCard"); if (misOpen && c && !c.open) { c.open = true; c.scrollIntoView({ block: "start", behavior: "smooth" }); misOpen = false; }
}
function bindMissions() {
  const box = $("misList"); if (!box) return;
  box.addEventListener("click", e => { const b = e.target.closest("[data-mc]"); if (!b) return; misTab = b.dataset.mc; renderMissions(); sfx("tap"); });
}

/* ===== 画面の切り替え・毎秒の更新・起動 ===== */
const VIEWS = ["home", "timer", "learn", "yokai", "rpg", "record"];
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
  if (currentView === "rpg") renderRPG();
}
let rq = 0;
function schedule() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; render(); migrate(); checkUnlocks(); missionCheck(); }); }
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
  bindHome(); bindTimer(); bindLearn(); bindYokai(); bindRecord(); bindFit(); bindRPG(); bindMissions();
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
