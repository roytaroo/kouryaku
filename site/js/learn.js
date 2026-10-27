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
    items: TW.map(w => ({ id: w[2], q: esc(w[0]), a: esc(lines(w[1])), ex: w[3] ? esc(w[3].replace(/\{\{c1::(.*?)\}\}/, "$1")) + "<br>" + esc(w[4] || "") : "" }))
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
  h += `<div class="no">No.${esc(w.id)}</div><div class="word${D.small ? " small" : D.mid ? " mid" : ""}">${w.q}</div>`;
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
  if (cz.picked != null) h += `<div class="mean" style="font-size:14px">${esc(q.w[0])}：${esc(lines(q.w[1]))}</div><button class="big-btn ink" type="button" data-cz="next">次へ</button>`;
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
    $("wRule").innerHTML = esc(D.rule) + "<b>" + limitOf(dk) / 1000 + "秒以内</b>に答えが浮かばなければ失敗。全部を即答できるまで終わらない。覚えるのはAnki、ここは追い討ち。";
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
