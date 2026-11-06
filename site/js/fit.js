/* ===== 筋トレ：道具なしの3種目。やった日が4日たまるごとに目標が少し上がる ===== */
const FIT = [
  { id: "push", name: "腕立て伏せ", how: "きつければ膝をついてOK。胸を床に近づける。", unit: "回", base: 10, step: 2, max: 40, add: [1, 5] },
  { id: "squat", name: "スクワット", how: "お尻を後ろに引いて、太ももが床と平行まで。", unit: "回", base: 20, step: 4, max: 80, add: [5, 10] },
  { id: "plank", name: "プランク", how: "ひじとつま先で体をまっすぐ。合計の秒数でOK。", unit: "秒", base: 30, step: 10, max: 120, add: [10, 30] }
];
const FIT_WEEK = 4; // 週に何日やるか
const FIT_KOBAN = 10; // 全部できた日の小判
function fitOf(k) { return (S.days[k] && S.days[k].fit) || {}; }
/** 全部できた日か（できた時点の目標で判定して、記録に ok を残している） */
function fitOk(k) { return !!fitOf(k).ok; }
/** それより前に全部できた日が何日あるか → 段（4日ごとに1つ上がる） */
function fitStage(k) { let n = 0; for (const d in S.days) if (d < k && fitOk(d)) n++; return { stage: Math.floor(n / 4), days: n, toNext: 4 - (n % 4) }; }
function fitGoals(k) { const s = fitStage(k).stage, g = {}; for (const x of FIT) g[x.id] = Math.min(x.max, x.base + x.step * s); return g; }
function fitWeek(k) { const start = addDays(k, -((dow(k) + 6) % 7)); let n = 0; for (let i = 0; i < 7; i++) if (fitOk(addDays(start, i))) n++; return n; }
function fitDays() { return Object.keys(S.days).filter(fitOk).length; }

function renderFit() {
  const k = dayKey(), f = fitOf(k), g = fitGoals(k), st = fitStage(k), wk = fitWeek(k), ok = !!f.ok;
  $("fitHead").textContent = ok ? "今日はできた" : "今日の筋トレ（10分）";
  $("fitWeek").textContent = "今週 " + wk + " / " + FIT_WEEK + "日";
  const html = FIT.map(x => {
    const c = f[x.id] || 0, done = c >= g[x.id], pct = clamp(100 * c / g[x.id], 0, 100);
    return `<li class="task${done ? " done" : ""}" data-s="fit"><span class="nm">${x.name}<small>${x.how}</small></span>
      <span class="ct num">${c}<small>/${g[x.id]}${x.unit}</small></span><div class="bar-p"><i class="${done ? "ok" : ""}" style="width:${pct}%"></i></div>
      <div class="ctl"><button type="button" data-f="${x.id}" data-d="-${x.add[0]}">−${x.add[0]}</button>${x.add.map(a => `<button type="button" data-f="${x.id}" data-d="${a}">＋${a}</button>`).join("")}</div></li>`;
  }).join("");
  const ul = $("fitList"); if (ul.dataset.v !== html) { ul.innerHTML = html; ul.dataset.v = html; }
  $("fitNote").textContent = ok ? "小判＋" + FIT_KOBAN + "。休む日も大事。週" + FIT_WEEK + "日できれば十分。"
    : "勉強の休憩に。分けてやっていい。あと" + st.toNext + "日できたら目標が少し上がる。";
}
function renderFitRecord() {
  const k = dayKey(), cells = [];
  for (let i = 27; i >= 0; i--) { const d = addDays(k, -i); cells.push(`<i class="${fitOk(d) ? "on" : (fitOf(d).push || fitOf(d).squat || fitOf(d).plank) ? "half" : ""}" title="${labelDay(d)}"></i>`); }
  let push = 0, squat = 0, plank = 0; for (const d in S.days) { const f = fitOf(d); push += f.push || 0; squat += f.squat || 0; plank += f.plank || 0; }
  const g = fitGoals(k);
  $("fitRec").innerHTML = `<div class="fitgrid">${cells.join("")}</div>
    <dl class="stats" style="margin:0"><div><dt>できた日</dt><dd>${fitDays()}<small>日</small></dd></div><div><dt>今の目標</dt><dd>${g.push}<small>回・</small>${g.squat}<small>回・</small>${g.plank}<small>秒</small></dd></div>
    <div><dt>腕立て 累計</dt><dd>${push}<small>回</small></dd></div><div><dt>スクワット 累計</dt><dd>${squat}<small>回</small></dd></div><div><dt>プランク 累計</dt><dd>${plank < 120 ? plank + "<small>秒</small>" : Math.round(plank / 60) + "<small>分</small>"}</dd></div></dl>`;
}
function bindFit() {
  $("fitList").addEventListener("click", e => {
    const b = e.target.closest("button[data-f]"); if (!b || !ready()) return;
    const k = dayKey(), id = b.dataset.f, dlt = Number(b.dataset.d), g = fitGoals(k), was = !!fitOf(k).ok;
    patchDay(k, d => {
      d.fit = d.fit || {}; d.fit[id] = Math.max(0, (d.fit[id] || 0) + dlt);
      d.fit.ok = FIT.every(x => (d.fit[x.id] || 0) >= g[x.id]);
    }).then(() => {
      if (!was && fitOf(k).ok) { sfx("done"); confetti(); toast("筋トレ完了！小判＋" + FIT_KOBAN); } else sfx("tap");
    });
  });
}
