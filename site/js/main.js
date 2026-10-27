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
  bindHome(); bindTimer(); bindLearn(); bindYokai(); bindRecord();
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
