/* ===== 11/25 追加：偉人の言葉・ホームのミッション・小判の内訳・間違いノート・1/3/5分モード・
   単語の読み上げ・タイマー後のメモ・週のふり返り・全クリアの記録 ===== */

/* ---- 共通：下から出るシート ---- */
function openSheet(html) {
  let el = $("sheet");
  if (!el) { el = document.createElement("div"); el.id = "sheet"; el.className = "sheet"; document.body.appendChild(el); el.addEventListener("click", e => { if (e.target === el || e.target.closest("[data-sh=close]")) closeSheet(); }); }
  el.innerHTML = `<div class="sheet-in" role="dialog" aria-modal="true">${html}</div>`; el.hidden = false;
  requestAnimationFrame(() => el.classList.add("in"));
}
function closeSheet() { const el = $("sheet"); if (!el) return; el.classList.remove("in"); setTimeout(() => { el.hidden = true; }, 250); }

/* ---- 偉人の言葉（ホーム） ---- */
const IJIN = [
  { id: "edison", name: "トーマス・エジソン", what: "発明家", q: "私は失敗したことがない。うまくいかない方法を1万通り見つけただけだ。" },
  { id: "einstein", name: "アルベルト・アインシュタイン", what: "物理学者", q: "大切なのは、疑問を持ち続けることだ。" },
  { id: "lincoln", name: "エイブラハム・リンカーン", what: "アメリカ大統領", q: "私は歩くのが遅い。だが、決して後戻りはしない。" },
  { id: "gandhi", name: "マハトマ・ガンディー", what: "インド独立の指導者", q: "明日死ぬかのように生きよ。永遠に生きるかのように学べ。" },
  { id: "newton", name: "アイザック・ニュートン", what: "物理学者", q: "私が遠くを見渡せたのは、巨人の肩の上に立っていたからだ。" },
  { id: "confucius", name: "孔子", what: "思想家", q: "学びて思はざれば則ち罔し。思ひて学ばざれば則ち殆し。" },
  { id: "noguchi", name: "野口英世", what: "細菌学者", q: "誰よりも三倍、四倍、五倍勉強する者、それが天才だ。" },
  { id: "fukuzawa", name: "福沢諭吉", what: "教育者", q: "賢人と愚人との別は、学ぶと学ばざるとによりて出来るものなり。" },
  { id: "ryoma", name: "坂本龍馬", what: "幕末の志士", q: "世の人は我を何とも言はば言へ。我が成す事は我のみぞ知る。" },
  { id: "shoin", name: "吉田松陰", what: "思想家・教育者", q: "至誠にして動かざる者は、未だこれ有らざるなり。" },
  { id: "keller", name: "ヘレン・ケラー", what: "教育者", q: "人生は、勇気ある冒険か、無か、そのどちらかだ。" },
  { id: "curie", name: "マリー・キュリー", what: "物理学者・化学者", q: "人生で恐れるものは何もない。ただ理解すべきものがあるだけだ。" },
  { id: "franklin", name: "ベンジャミン・フランクリン", what: "政治家・科学者", q: "失った時間は、二度と見つからない。" },
  { id: "youzan", name: "上杉鷹山", what: "米沢藩主", q: "為せば成る、為さねば成らぬ何事も。成らぬは人の為さぬなりけり。" }
];
let ijinI = null;
function renderIjin() {
  const box = $("ijinCard"); if (!box) return;
  const list = typeof IJIN_IMG !== "undefined" && Object.keys(IJIN_IMG).length ? IJIN.filter(x => IJIN_IMG[x.id]) : IJIN;
  if (ijinI == null) { const d = new Date(); ijinI = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % list.length; }
  const x = list[ijinI % list.length], img = typeof IJIN_IMG !== "undefined" && IJIN_IMG[x.id];
  const h = `<div class="ijin-ph">${img ? `<img src="${img}" alt="${esc(x.name)}の肖像">` : `<span>${esc(x.name.slice(0, 1))}</span>`}</div>
    <div class="ijin-tx"><p>${esc(x.q)}</p><b>${esc(x.name)}</b><small>${esc(x.what)}</small></div>`;
  if (box.dataset.v !== h) { box.innerHTML = h; box.dataset.v = h; }
}

/* ---- ホーム：あと少しのミッション ---- */
function renderHomeMis() {
  const box = $("homeMis"); if (!box || typeof misState !== "function") return;
  const { st, done } = misState();
  const keys = [...new Set(MISSIONS.map(m => m.key))];
  const cand = keys.map(k => MISSIONS.find(m => m.key === k && !done.has(m.id))).filter(Boolean)
    .map(m => ({ m, r: Math.min(1, (st[m.key] || 0) / m.n) })).filter(x => x.r > 0).sort((a, b) => b.r - a.r).slice(0, 2);
  const list = cand.length ? cand : keys.map(k => MISSIONS.find(m => m.key === k && !done.has(m.id))).filter(Boolean).slice(0, 2).map(m => ({ m, r: 0 }));
  const h = `<div class="head"><div class="eyebrow">あと少しのミッション</div><button type="button" class="linkbtn" data-goto-mis="1">全部見る</button></div>` +
    list.map(({ m, r }) => `<div class="hm-row"><span class="sic sm c-gold"><svg><use href="#i-star"/></svg></span><div><b>${esc(m.name)}</b><div class="bar-p"><i style="width:${Math.round(r * 100)}%"></i></div></div><span class="mis-rw"><i class="koban"></i>${m.koban}</span></div>`).join("");
  if (box.dataset.v !== h) { box.innerHTML = h; box.dataset.v = h; }
}

/* ---- 小判の内訳（右上の小判を押す） ---- */
const SPEND_JA = { gacha: "ガチャ", outfit: "着せ替え", pass: "百鬼の道", bonus: "ボーナス", game: "ゲーム券", video: "動画券" };
function openCoinSheet() {
  const e = econ(), sp = {};
  for (const x of S.game.spend || []) sp[x.kind || "other"] = (sp[x.kind || "other"] || 0) + (x.cost || 0);
  const row = (n, v, neg) => `<div class="cs-row"><span>${esc(n)}</span><b class="num${neg ? " neg" : ""}">${neg ? "−" : "＋"}${Math.abs(v).toLocaleString()}</b></div>`;
  openSheet(`<div class="sheet-head"><b>小判の内訳</b><button type="button" class="sheet-x" data-sh="close" aria-label="とじる">✕</button></div>
    <div class="cs-total"><i class="koban"></i><b class="num">${e.koban.toLocaleString()}</b></div>
    <div class="cs-sec">もらった ${e.kobanEarn.toLocaleString()}</div>${e.parts.filter(p => p[1]).map(p => row(p[0], p[1])).join("") || '<div class="note">まだなし</div>'}
    <div class="cs-sec">使った ${e.kobanSpent.toLocaleString()}</div>${Object.entries(sp).filter(([, v]) => v).map(([k, v]) => row(SPEND_JA[k] || k, v, v > 0)).join("") || '<div class="note">まだ使っていない</div>'}
    <p class="note">小判は記録から毎回計算している。一度もらった分は消えない（使った分だけ減る）。</p>`);
}

/* ---- 単語の読み上げ（設定でオン／オフ） ---- */
function speakWord(text) {
  if (S.settings.tts === false || !("speechSynthesis" in window)) return;
  try { const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, "")); u.lang = "en-US"; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}

/* ---- 1分・3分・5分モード ---- */
let quickMin = 1;
function startQuick(min) { quickMin = min; if (ready()) startWords(deckOfTab(), "quick"); }
setInterval(() => {
  if (typeof sess === "undefined" || !sess || !sess.until) return;
  const el = $("qmRest"), rest = Math.max(0, Math.ceil((sess.until - Date.now()) / 1000));
  if (el) el.textContent = "残り " + Math.floor(rest / 60) + ":" + pad(rest % 60);
  if (rest <= 0 && sess.phase === "ask") nextWord();
}, 500);

/* ---- 間違いノート（勉強タブ） ---- */
function renderMiss() {
  const box = $("missBox"); if (!box) return;
  const weak = st => Object.entries((st && st.w) || {}).filter(([, s]) => (s[2] || 0) > 0 && (s[0] || 0) < 3);
  const rows = [["words", "en", "英単語", weak(S.words)], ["kobun", "ko", "古文単語", weak(S.kobun)], ["seikei", "se", "政経", weak(S.seikei)]];
  const gm = Object.entries(S.grammar.miss || {}).sort((a, b) => b[1] - a[1]);
  const wordList = (dk, list) => { const D = DECKS[dk]; return list.sort((a, b) => (b[1][2] || 0) - (a[1][2] || 0)).slice(0, 8).map(([id, s]) => { const w = D.items[D.index.get(id)]; return w ? `<li><b>${w.q}</b>${w.kana ? `<small>${esc(w.kana)}</small>` : ""}<span>${w.a}</span><em>×${s[2]}</em></li>` : ""; }).join(""); };
  const h = `<div class="head"><div><div class="eyebrow">間違いノート</div><h2>間違えたものだけ</h2></div></div>
    ${rows.map(([tab, dk, nm, list]) => `<div class="mn-sec"><div class="mn-head"><b>${nm}</b><span class="note">${list.length}${DECKS[dk].unit}</span>${list.length ? `<button type="button" class="btn pri sm" data-mn="${tab}" data-dk="${dk}">復習する</button>` : ""}</div>${list.length ? `<ul class="mn-list">${wordList(dk, list)}</ul>` : '<p class="note">なし</p>'}</div>`).join("")}
    <div class="mn-sec"><div class="mn-head"><b>文法・古文の助動詞</b><span class="note">${gm.length}問</span>${gm.length ? `<button type="button" class="btn pri sm" data-mn="grammar">復習する</button>` : ""}</div>
      ${gm.length ? `<ul class="mn-list">${gm.slice(0, 6).map(([k, n]) => { const [u, j] = k.split(":"), q = (GQ[u] || [])[Number(j)]; return q ? `<li><span>${esc(q[0])}</span><span>→ ${esc(q[1][q[2]])}</span><em>×${n}</em></li>` : ""; }).join("")}</ul>` : '<p class="note">なし</p>'}</div>
    <p class="note">復習で正解すると、ノートから消える（単語は3回連続で即答したら消える）。</p>`;
  if (box.dataset.v !== h) { box.innerHTML = h; box.dataset.v = h; }
}

/* ---- タイマー後のひとことメモ ---- */
const MEMO_OPTS = ["英単語", "英文法", "英語長文", "過去問", "古文", "現代文", "漢字", "政経", "その他"];
function askMemo(min) {
  if (min < 3) return;
  openSheet(`<div class="sheet-head"><b>${hrs(min)}時間、何をやった？</b><button type="button" class="sheet-x" data-sh="close" aria-label="とじる">✕</button></div>
    <div class="memo-opts">${MEMO_OPTS.map(o => `<button type="button" data-memo="${o}">${o}</button>`).join("")}</div><p class="note">押すだけで記録。あとで週のふり返りに出る。</p>`);
  $("sheet").onclick = e => {
    const b = e.target.closest("[data-memo]"); if (!b) return;
    patchDay(dayKey(), d => { d.memo = [...(d.memo || []), { at: Date.now(), min: Math.round(min * 10) / 10, what: b.dataset.memo }]; }).catch(() => {});
    sfx("ok"); toast("「" + b.dataset.memo + "」で記録した"); closeSheet();
  };
}
{
  const stop = timerStop;
  timerStop = async function () {
    const t = S.timer || {}; let add = 0;
    if (t.running && t.phase === "work" && !t.paused) add = Math.min((Date.now() - t.startedAt) / 60000, t.durMin);
    await stop(); if (add) askMemo(add);
  };
}

/* ---- 週のふり返り（記録タブ） ---- */
function weekRange(off) { const k = dayKey(), w = dow(k), mon = addDays(k, -((w + 6) % 7) - 7 * off); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
function renderWeek() {
  const box = $("weekCard"); if (!box) return;
  const cur = weekRange(0), prev = weekRange(1);
  const sum = ks => ks.reduce((a, k) => a + minOf(k), 0), subj = ks => { const o = {}; for (const k of ks) for (const [s, m] of Object.entries((S.days[k] || {}).subj || {})) o[s] = (o[s] || 0) + m; return o; };
  const a = sum(cur), b = sum(prev), sj = subj(cur), tot = Object.values(sj).reduce((x, y) => x + y, 0) || 1;
  const memo = {}; for (const k of cur) for (const m of (S.days[k] || {}).memo || []) memo[m.what] = (memo[m.what] || 0) + m.min;
  const best = cur.reduce((x, k) => minOf(k) > minOf(x) ? k : x, cur[0]);
  const diff = a - b, colors = { en: "var(--lantern)", ja: "var(--c-pink)", se: "var(--c-green)" };
  const h = `<div class="head"><div><div class="eyebrow">今週のふり返り（月〜日）</div><h2 class="num">${hrs(a)}時間</h2></div><span class="wk-diff ${diff >= 0 ? "up" : "down"}">先週より ${diff >= 0 ? "＋" : "−"}${hrs(Math.abs(diff))}h</span></div>
    <div class="wk-days">${cur.map(k => { const m = minOf(k), tg = targetFor(modeOf(k)); return `<div class="${k > dayKey() ? "fut" : ""}"><i style="height:${Math.min(100, 100 * m / Math.max(1, tg))}%"></i><small>${"月火水木金土日"[(dow(k) + 6) % 7]}</small></div>`; }).join("")}</div>
    <div class="wk-split">${Object.entries(sj).map(([s, m]) => `<i style="width:${100 * m / tot}%;background:${colors[s] || "var(--muted)"}"></i>`).join("")}</div>
    <div class="note">${Object.entries(sj).map(([s, m]) => `${SUBJ[s] || s} ${hrs(m)}h`).join("　") || "まだ記録なし"}${a ? `　／　いちばんやった日：${labelDay(best)}` : ""}</div>
    ${Object.keys(memo).length ? `<div class="wk-memo">${Object.entries(memo).sort((x, y) => y[1] - x[1]).map(([w, m]) => `<span>${esc(w)} ${hrs(m)}h</span>`).join("")}</div>` : ""}`;
  if (box.dataset.v !== h) { box.innerHTML = h; box.dataset.v = h; }
}

/* ---- 全クリアした日は印をつける（あとでノルマが変わっても消えない） ---- */
let acBusy = false;
function markClear() {
  if (acBusy || !backend || !allLoaded()) return;
  const k = dayKey(), d = S.days[k];
  if (d && !d.ac && allClearNow(k)) { acBusy = true; patchDay(k, x => { x.ac = 1; }).finally(() => { acBusy = false; }); }
}

/* ---- つなぎこみ ---- */
{
  const rh = renderHome; renderHome = function () { rh(); renderIjin(); renderHomeMis(); };
  const rr = renderRecord; renderRecord = function () { rr(); renderWeek(); };
  const rl = renderLearn; renderLearn = function () {
    rl(); const m = learnTab === "miss"; $("lt-miss").hidden = !m; if (m) renderMiss();
    // 漢字タブ：文法の画面を借りて、漢字のカードだけ出す
    const kj = learnTab === "kanji", g = learnTab === "grammar";
    if (kj) { $("lt-grammar").hidden = false; renderGrammar(); renderGQ(); }
    document.querySelectorAll("#lt-grammar .gcard").forEach(c => { c.hidden = kj; });
    document.querySelector("#lt-grammar .kjcard").hidden = !kj && !(g && false);
  };
}
function bindExtras() {
  onChange(() => setTimeout(markClear, 0));
  const coin = document.querySelector(".wallet .chip"); if (coin) { coin.style.cursor = "pointer"; coin.setAttribute("role", "button"); coin.onclick = openCoinSheet; }
  $("coinBreak") && ($("coinBreak").onclick = openCoinSheet);
  $("homeMis").addEventListener("click", e => { if (e.target.closest("[data-goto-mis]") || e.target.closest(".hm-row")) { go("record"); misOpen = true; renderMissions(); } });
  $("ijinCard").onclick = () => { ijinI = (ijinI || 0) + 1; renderIjin(); sfx("tap"); };
  $("missBox").addEventListener("click", e => { const b = e.target.closest("[data-mn]"); if (!b || !ready()) return; const k = b.dataset.mn; if (k === "grammar") return startGQ(null, Object.keys(S.grammar.miss || {})); learnTab = k; startWords(b.dataset.dk, "weak"); });
  $("quickRow").addEventListener("click", e => { const b = e.target.closest("[data-qm]"); if (b) startQuick(Number(b.dataset.qm)); });
}

/* ---- 漢字ドリルで答えた数は、今日のノルマ「漢字」に自動で足す ---- */
{
  const pg = pickGQ;
  pickGQ = function (i) {
    const before = gq && gq.picked, q = gq && gq.qs[gq.n];
    pg(i);
    const pre = String((q && q.key) || "").slice(0, 2), tid = { kj: "kanji", id: "idiom", kb: "kogo", kh: "kogo" }[pre];
    if (gq && before == null && gq.picked != null && tid && tasksOf(dayKey()).some(t => t.id === tid))
      patchDay(dayKey(), d => { d.tasks = d.tasks || {}; d.tasks[tid] = (d.tasks[tid] || 0) + 1; }).catch(() => {});
  };
}

/* ---- Museに渡す：勉強の現状をまとめて、共有シートかコピーで渡す ----
   Muse に頼まれた形（mistakes / daily_norm / study_log）に、試験・成績・体づくりを足した JSON。 */
function museData() {
  const k = dayKey(), e = econ(), goal = Number(S.settings.goalHours) || 1100;
  const strip = h => String(h || "").replace(/<br\s*\/?>/g, " / ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  const weak = (dk, cat) => { const D = DECKS[dk], st = S[D.store]; return Object.entries((st && st.w) || {}).filter(([, s]) => (s[2] || 0) > 0 && (s[0] || 0) < 3)
    .sort((a, b) => (b[1][2] || 0) - (a[1][2] || 0)).slice(0, 60).map(([id, s]) => { const w = D.items[D.index.get(id)] || {}; return { category: cat, no: id, word: strip(w.q), reading: w.kana || undefined, meaning: strip(w.a), wrong_count: s[2] || 0, last_seen: s[3] || undefined }; }); };
  const gram = Object.entries(S.grammar.miss || {}).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([key, n]) => {
    const [u, j] = key.split(":"), q = (GQ[u] || [])[Number(j)]; if (!q) return null;
    const cat = { kj: "漢字", kb: "古文助動詞", kh: "古文の品詞", id: "英熟語" }[u.slice(0, 2)] || "英文法";
    return { category: cat, unit: gqName(u), question: q[0], answer: q[1][q[2]], choices: q[1], note: q[3], wrong_count: n };
  }).filter(Boolean);
  const days = []; for (let i = 13; i >= 0; i--) { const d = addDays(k, -i), x = S.days[d] || {}; days.push({ date: d, minutes: Math.round(minOf(d)), target_minutes: Math.round(targetFor(modeOf(d))), by_subject: x.subj || {}, norm_all_clear: allClear(d), words_answered_fast: wordsTodayCount(d), memo: (x.memo || []).map(m => m.what + " " + Math.round(m.min) + "分") }); }
  const f = fitOf(k), ws = Object.keys(S.days).sort().filter(d => fitOf(d).weight);
  const lastW = ws.length ? fitOf(ws[ws.length - 1]) : null;
  const { st, done } = misState();
  return {
    generated_at: new Date().toISOString(), today: k,
    exams: nextExams().map(x => ({ name: x.label.replace(/（.*?）/g, ""), date: x.key, days_left: Math.ceil((x.at - Date.now()) / 864e5) })),
    progress: { total_hours: Math.round(e.totalMin / 6) / 10, goal_hours: goal, deadline: S.settings.deadline, streak_days: streakNow(), all_clear_days: e.clears, pomodoros: e.pomos, phase: phaseOf(k).name },
    daily_norm: { date: k, target_minutes: Math.round(targetFor(modeOf(k))), studied_minutes: Math.round(minOf(k)), tasks: tasksOf(k).map(t => ({ task: t.name, subject: SUBJ[t.subj] || "", done: t.count, goal: t.goal, unit: t.unit })) },
    study_log: days,
    mistakes: [...weak("en", "英単語"), ...weak("ko", "古文単語"), ...weak("se", "政経"), ...gram],
    learned: { english_words_known: Object.values(S.words.w || {}).filter(s => (s[0] || 0) >= 3).length, english_words_total: DECKS.en.items.length, kobun_known: Object.values(S.kobun.w || {}).filter(s => (s[0] || 0) >= 3).length,
      grammar_units_passed: Object.entries(S.grammar.units || {}).filter(([, u]) => u.passed).map(([id]) => gqName(id)) },
    scores: (S.scores || []).map(s => ({ date: s.date, kind: s.kind, name: s.name, score: s.score, max: s.max })),
    fitness: { workouts_total: Object.keys(S.days).filter(fitOk).length, cardio_minutes_total: Object.keys(S.days).reduce((a, d) => a + cardioMin(d), 0), today_workout_done: fitOk(k),
      latest_weight_kg: lastW ? lastW.weight : null, latest_body_fat_pct: lastW && lastW.bf ? lastW.bf : null, body_fat_device: lastW ? lastW.bfSrc || null : null },
    missions_almost: MISSIONS.filter(m => !done.has(m.id)).map(m => ({ m, r: (st[m.key] || 0) / m.n })).filter(x => x.r > 0).sort((a, b) => b.r - a.r).slice(0, 5).map(x => ({ mission: x.m.name, progress: Math.round(x.r * 100) + "%" }))
  };
}
function museText() {
  return "これは私の受験勉強アプリから書き出した最新データです。前に決めた読みやすいルールで返してください。\n" +
    "この内容をもとに、①今の状況をひとことで ②今日やること3つ ③間違いノート（mistakes）から今夜のクイズ5問 を作ってください。クイズの答えは、私が答えてから返してください。\n\n" +
    "```json\n" + JSON.stringify(museData()) + "\n```";
}
async function sendToMuse(mode) {
  if (!ready()) return;
  const text = museText();
  if (mode !== "copy" && navigator.share) { try { await navigator.share({ text }); toast("共有した。Muse（Meta AI）を選べばOK"); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(text); toast("コピーした。Museに貼って送って"); sfx("ok"); }
  catch (e) { openSheet(`<div class="sheet-head"><b>Museに渡すデータ</b><button type="button" class="sheet-x" data-sh="close" aria-label="とじる">✕</button></div><p class="note">自動でコピーできなかった。下を長押しして全部選んでコピーして。</p><textarea class="field" rows="12" readonly style="font-size:11px;user-select:text;-webkit-user-select:text">${esc(text)}</textarea>`); }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-muse]"); if (b) sendToMuse(b.dataset.muse); });
