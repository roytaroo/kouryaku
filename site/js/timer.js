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
  return patchDay(k, d => { d.min = Math.round(((d.min || 0) + min) * 10) / 10; d.subj = d.subj || {}; d.subj[subj] = Math.round(((d.subj[subj] || 0) + min) * 10) / 10; if (pomo) d.pomos = (d.pomos || 0) + 1; });
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
