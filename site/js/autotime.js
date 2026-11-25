/* ===== 勉強時間を自動で数える =====
   1) タイマーが止まっているあいだも、勉強タブと冒険タブで操作していた時間は勉強時間に足す。
      操作と操作の間が90秒以内ならその間を数える（それより空いたら、離れていたとみなす）。
   2) アプリを開いたら、タイマーを自動で始める（設定で切れる）。
      開いてすぐ（2分以内）にアプリを離れたら、確認だけとみなして記録しない。 */
const AT_GAP = 90e3, AT_FIRST = 5e3;
let atLast = 0, atSubj = "en", atAcc = 0, atT = 0;
const timerWorking = () => { const t = S.timer || {}; return !!(t.running && (!t.phase || t.phase === "work") && !t.paused); };
function atSubjNow() {
  if (currentView === "learn") return learnTab === "kobun" ? "ja" : learnTab === "seikei" ? "se" : "en";
  return "en";
}
function studyTick() {
  if (timerWorking() || !backend || !allLoaded()) { atLast = 0; return; }
  const now = Date.now(), subj = atSubjNow();
  if (atLast && subj !== atSubj) atFlush();
  atAcc += atLast && now - atLast < AT_GAP ? now - atLast : AT_FIRST;
  atLast = now; atSubj = subj;
  clearTimeout(atT); atT = setTimeout(() => { atFlush(); atLast = 0; }, AT_GAP);
  if (atAcc >= 60e3) atFlush();
}
function atFlush() {
  const min = Math.floor(atAcc / 6000) / 10; // 0.1分きざみ。端数は次に回す
  if (min <= 0) return;
  atAcc -= min * 60000;
  commitStudy(dayKey(), min, atSubj, false).catch(() => {});
}

/* ---- 開いたら自動でタイマー ---- */
let atAuto = null, atHiddenAt = 0;
function autoTimerOn() { return S.settings.autoTimer !== false; }
function nextSubj() { const t = typeof nextTask === "function" ? nextTask() : null; return (t && t.subj && t.subj !== "fit") ? t.subj : "en"; }
async function autoStart() {
  if (!autoTimerOn() || !backend || !allLoaded() || (S.timer && S.timer.running) || busy) return;
  tSubj = nextSubj();
  await timerStart();
  atAuto = { at: Date.now(), touched: false };
  toast("タイマーを自動で始めた（" + SUBJ[tSubj] + "）");
}
async function autoDiscard() {
  // 開いてすぐ離れた：記録せずに止める
  if (!atAuto || atAuto.touched || !S.timer || !S.timer.running || busy) return;
  atAuto = null; busy = true;
  try { await backend.save("timer", { running: false }); } finally { busy = false; }
}
function bindAutoTime() {
  for (const id of ["v-learn", "v-rpg"]) { const el = $(id); if (el) el.addEventListener("pointerdown", studyTick, { capture: true, passive: true }); }
  document.addEventListener("pointerdown", () => { if (atAuto) atAuto.touched = Date.now() - atAuto.at > 4000; }, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      atFlush(); atLast = 0; atHiddenAt = Date.now();
      if (atAuto && Date.now() - atAuto.at < 120e3) autoDiscard();
    } else {
      if (atHiddenAt && Date.now() - atHiddenAt > 60e3) autoStart();
      atHiddenAt = 0;
    }
  });
  // 起動時：読み込みが終わったら1回だけ
  const once = setInterval(() => { if (backend && allLoaded()) { clearInterval(once); autoStart(); } }, 500);
  setTimeout(() => clearInterval(once), 30000);
  $("runbar").onclick = e => { if (e.target.closest("[data-rb=stop]")) { if (atAuto) atAuto = null; timerStop(); return; } go("timer"); };
  setInterval(renderRunbar, 1000);
}
/* ---- どの画面でも見える「計測中」の帯 ---- */
function renderRunbar() {
  const t = S.timer || {}, el = $("runbar"); if (!el) return;
  const show = !!t.running && currentView !== "timer";
  el.hidden = !show; if (!show) return;
  const v = timerView(); let clock;
  if (v.phase === "legacy") { const s = Math.floor(v.el / 1000); clock = pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
  else { const s = Math.ceil((v.left || 0) / 1000); clock = pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
  const lab = t.phase === "break" ? "休憩中" : t.paused ? "一時停止" : "計測中・" + (SUBJ[t.subject] || "英語");
  const h = `<span class="rb-dot${t.phase === "break" || t.paused ? " off" : ""}"></span><b>${lab}</b><span class="num rb-clock">${clock}</span><button type="button" data-rb="stop">止める</button>`;
  if (el.dataset.v !== h) { el.innerHTML = h; el.dataset.v = h; }
}
