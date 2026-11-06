/* ===== 体づくり（ChatGPTと決めた計画）=====
   筋トレ週3（自重4種目をセットで数える）＋有酸素週3（歩く・走る・泳ぐ 20〜30分）＋間食100kcal＋体重。
   筋トレを4回やりきるごとに、1セットの回数が少し上がる。 */
const FIT = [
  { id: "squat", name: "スクワット", how: "お尻を後ろに引いて、太ももが床と平行まで。ひざはつま先と同じ向き。", sets: 3, base: 15, step: 2, max: 25, unit: "回" },
  { id: "push", name: "腕立て伏せ", how: "体を一直線に。きつい日は膝をついてOK。8〜12回できる形で。", sets: 2, base: 8, step: 1, max: 15, unit: "回" },
  { id: "plank", name: "プランク", how: "ひじとつま先で、頭からかかとまでまっすぐ。お尻を上げない。", sets: 3, base: 20, step: 5, max: 60, unit: "秒" },
  { id: "deadbug", name: "デッドバグ", how: "仰向けで手足を上げ、反対の手と足をゆっくり伸ばす。腰を床から浮かせない。", sets: 2, base: 10, step: 2, max: 16, unit: "回（左右）" }
];
const CARDIO = [{ id: "walk", name: "ウォーキング" }, { id: "run", name: "走る・歩く交互" }, { id: "swim", name: "水泳" }];
const FIT_START = "2026-11-06";
const FIT_WEEK = 3, CARDIO_WEEK = 3, CARDIO_MIN = 20, SNACK_KCAL = 100;
const FIT_KOBAN = 10, CARDIO_KOBAN = 5;

function fitOf(k) { return (S.days[k] && S.days[k].fit) || {}; }
/** 筋トレをやりきった日か（その時点の目標で判定して ok を記録に残す） */
function fitOk(k) { return !!fitOf(k).ok; }
function cardioMin(k) { const c = fitOf(k).cardio || {}; return CARDIO.reduce((a, x) => a + (c[x.id] || 0), 0); }
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
function fitKoban() { let n = 0; for (const k in S.days) { if (fitOk(k)) n += FIT_KOBAN; if (cardioOk(k)) n += CARDIO_KOBAN; } return n; }
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
  let sess = 0, cmin = 0, snackOk = 0, snackN = 0; const ws = [];
  for (const d of Object.keys(S.days).sort()) { const f = fitOf(d); if (fitOk(d)) sess++; cmin += cardioMin(d); if (f.snack != null) { snackN++; if (f.snack) snackOk++; } if (f.weight) ws.push([d, f.weight]); }
  const last = ws[ws.length - 1], first = ws[0];
  const diff = last && first && last !== first ? (last[1] - first[1]).toFixed(1) : null;
  $("fitRec").innerHTML = `<div class="fitgrid">${cells.join("")}</div>
    <dl class="stats" style="margin:0">
    <div><dt>筋トレ</dt><dd>${sess}<small>回</small></dd></div><div><dt>有酸素</dt><dd>${cmin}<small>分</small></dd></div>
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
