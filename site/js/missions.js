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
