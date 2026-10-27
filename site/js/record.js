/* ===== 記録：数字・グラフ・成績・気分・バッジ・設定 ===== */
let selDay = null;
function avgRecent(n = 7) { const k = dayKey(); let a = 0; for (let i = 1; i <= n; i++) a += minOf(addDays(k, -i)); return a / n; }
function renderStats() {
  const e = econ(), L = levelOf(e.totalMin), goal = Number(S.settings.goalHours) || 1612, k = dayKey();
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
  const st = S.settings.startDate, dl = S.settings.deadline, goal = (Number(S.settings.goalHours) || 1612) * 60, k = dayKey();
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
  const v = { ...S.settings, exams: $("setExams").value, normal: $("setNormal").value, refresh: $("setRefresh").value, goalHours: Number($("setGoal").value) || 1612, startDate: $("setStart").value || DEFAULTS.startDate, deadline: $("setDeadline").value || DEFAULTS.deadline, wordsPerDay: clamp(Number($("setWords").value) || 50, 10, 200), refreshDow: Number($("setDow").value), sound: $("setSound").checked };
  backend.save("settings", v).then(() => { toast("設定を保存した。"); sfx("ok"); });
}
async function backup() {
  const dl = await claude.use("downloads").catch(() => null);
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), days: S.days, settings: S.settings, quotes: S.quotes, words: S.words, cloze: S.cloze, grammar: S.grammar, game: S.game, tickets: S.tickets, scores: S.scores }, null, 1);
  if (!dl) { toast("この画面ではファイル保存が使えない。"); return; }
  try { await dl.save({ filename: "kouryaku-backup-" + dayKey() + ".json", data }); toast("バックアップを保存した。"); } catch (e) { toast("保存しなかった。"); }
}
function renderRecord() { renderStats(); renderBars(); renderForecast(); renderHeat(); renderScores(); renderMood(); renderBadges(); renderQuotes(); fillSettings(); }
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
