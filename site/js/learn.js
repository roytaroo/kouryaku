/* ===== 勉強：単語（即答できるまで）・穴埋め4択・文法トラッカー ===== */
const FAST_MS = 2000;
const TW = (typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : []);
const TWI = new Map(TW.map((w, i) => [w[2], i]));
const lines = m => String(m).split(/[；;]/).map(s => s.trim()).filter(Boolean).map((s, i) => "①②③④⑤⑥⑦⑧"[i] + s).join("　");
const dayIdx = (k = dayKey()) => clamp(daysBetween(PLAN_START, k), 0, Math.max(0, Math.ceil(TW.length / 50) - 1));
const setOf = i => TW.slice(i * 50, i * 50 + 50);
let learnTab = "words", wSet = null;
/* ---- 単語 ---- */
let sess = null; // {queue:[num], mode, t0, phase:'ask'|'judge'|'miss', cur}
function clearedToday() { return new Set(((S.words.cleared || {})[dayKey()] || [])); }
function startWords(mode) {
  if (!TW.length) { toast("単語データが入っていない。"); return; }
  const k = dayKey(), done = clearedToday();
  let nums;
  if (mode === "weak") { const upto = (dayIdx() + 1) * 50; nums = TW.slice(0, upto).filter(w => { const s = (S.words.w || {})[w[2]]; return s && (s[2] || 0) > 0 && (s[0] || 0) < 3; }).map(w => w[2]).slice(0, 50); if (!nums.length) { toast("苦手な単語はまだない。"); return; } }
  else nums = setOf(wSet ?? dayIdx()).map(w => w[2]).filter(n => !done.has(n));
  if (!nums.length) { toast("この50語は今日もう全部即答できた。"); return; }
  for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
  sess = { queue: nums, mode, total: nums.length, cleared: 0, tries: 0 };
  nextWord();
}
let limitT = 0;
function nextWord() {
  clearTimeout(limitT);
  if (!sess) return renderLearn();
  if (!sess.queue.length) { const n = sess.cleared; sess = null; sfx("done"); confetti(); toast(n + "語、全部即答できた！"); renderLearn(); return; }
  sess.cur = sess.queue[0]; sess.phase = "ask"; sess.t0 = performance.now(); sess.tries++;
  renderFlash();
  limitT = setTimeout(() => { if (sess && sess.phase === "ask") answerWord(false, true); }, FAST_MS + 1200);
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
  const fast = ok && sess.ms <= FAST_MS;
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
  patchDoc("words", v => {
    v.w = v.w || {}; v.cleared = v.cleared || {};
    const s = v.w[n] || [0, 0, 0, ""];
    if (fast) { s[0] = Math.min(5, (s[0] || 0) + 1); s[1] = (s[1] || 0) + 1; v.cleared[k] = [...new Set([...(v.cleared[k] || []), n])]; }
    else if (!ok) { s[0] = 0; s[2] = (s[2] || 0) + 1; }
    s[3] = k; v.w[n] = s;
  });
}
function renderFlash() {
  const box = $("flash"); if (!sess) { box.hidden = true; return; }
  box.hidden = false;
  const w = TW[TWI.get(sess.cur)], left = sess.queue.length;
  const ex = w[3] ? w[3].replace(/\{\{c1::(.*?)\}\}/, "$1") : "";
  let h = `<div class="qprog"><span>残り ${left}語</span><span>${sess.mode === "weak" ? "苦手の復習" : "今日の50語"}・即答 ${sess.cleared}/${sess.total}</span></div>`;
  h += `<div class="no">No.${esc(w[2])}</div><div class="word">${esc(w[0])}</div>`;
  if (sess.phase === "ask") {
    h += `<div class="limit go"><i style="animation-duration:${FAST_MS}ms"></i></div><div class="note">見た瞬間に意味を思い浮かべて押せ（2秒）</div>
      <div class="pair"><button class="big-btn" type="button" data-a="yes">浮かんだ</button><button class="big-btn ng" type="button" data-a="no">わからない</button></div>`;
  } else if (sess.phase === "judge") {
    h += `<div class="mean">${esc(lines(w[1]))}</div>${ex ? `<div class="ex">${esc(ex)}<br>${esc(w[4] || "")}</div>` : ""}
      <div class="note">思い浮かべた意味は合ってた？　${(sess.ms / 1000).toFixed(1)}秒${sess.ms <= FAST_MS ? "（即答）" : "（遅い）"}</div>
      <div class="pair"><button class="big-btn ink" type="button" data-j="1">○ 合ってた</button><button class="big-btn ng" type="button" data-j="0">× 違った</button></div>`;
  } else {
    h += `<div class="note" style="color:var(--seal);font-weight:700">${esc(sess.why)}。もう一度出る。</div><div class="mean">${esc(lines(w[1]))}</div>${ex ? `<div class="ex">${esc(ex)}<br>${esc(w[4] || "")}</div>` : ""}
      <button class="big-btn ink" type="button" data-n="1">次へ</button>`;
  }
  h += `<button class="btn ghost sm" type="button" data-q="1" style="justify-self:center">やめる（ここまでは記録済み）</button>`;
  box.innerHTML = h;
}
/* ---- 穴埋め4択 ---- */
let cz = null; // {qs:[{i, choices:[i], ans}], n, ok, picked}
function clozeParts(s) { const m = String(s).match(/^(.*?)([A-Za-z]*)\{\{c1::(.*?)\}\}([A-Za-z]*)(.*)$/); return m ? { pre: m[1], hit: m[2] + m[3] + m[4], post: m[5] } : null; }
function startCloze() {
  const upto = Math.max(50, (dayIdx() + 1) * 50), pool = TW.slice(0, upto).filter(w => w[3] && clozeParts(w[3]));
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
      <button class="btn sm" type="button" data-u="${id}">${pc == null ? "記録する" : "<span class='pc'>" + pc + "%</span>"}</button>
      ${openUnit === id ? `<form data-uf="${id}"><input class="field num" id="uo-${id}" type="number" min="0" inputmode="numeric" placeholder="正解"><span>/</span><input class="field num" id="ut-${id}" type="number" min="1" inputmode="numeric" placeholder="問題数"><button class="btn pri sm" type="submit">保存</button><span class="note">8割で合格（小判＋30・お化けが仲間に）</span></form>` : ""}</li>`;
    }).join("");
    const el = $("units-" + g); if (el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; }
    const passed = GRAMMAR[g].units.filter((_, i) => (U[g + i] || {}).passed).length;
    $("gsum-" + g).textContent = passed + " / " + GRAMMAR[g].units.length + " 単元 合格";
  }
}
function saveUnit(id, ok, tot) {
  const before = !!((S.grammar.units || {})[id] || {}).passed;
  patchDoc("grammar", v => { v.units = v.units || {}; const u = v.units[id] || { tries: 0 }; u.tries = (u.tries || 0) + 1; if (!u.best || ok / tot > u.best[0] / u.best[1]) u.best = [ok, tot]; if (ok / tot >= 0.8) u.passed = true; v.units[id] = u; })
    .then(() => { if (!before && ok / tot >= 0.8) { sfx("done"); confetti(); toast("合格！小判＋30。新しいお化けが仲間になる。"); checkUnlocks(); } else sfx(ok / tot >= 0.8 ? "ok" : "tap"); });
}
function renderLearn() {
  document.querySelectorAll("#learnSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === learnTab)));
  for (const t of ["words", "cloze", "grammar", "other"]) $("lt-" + t).hidden = t !== learnTab;
  if (learnTab === "words") {
    const i = wSet ?? dayIdx(), set = setOf(i), done = clearedToday(), n = set.filter(w => done.has(w[2])).length;
    $("wTitle").textContent = (i + 1) + "日目の50語　No." + (set[0] ? set[0][2] : "") + "〜" + (set[set.length - 1] ? set[set.length - 1][2] : "");
    $("wProg").textContent = "今日即答できた " + n + " / " + set.length; $("wBar").style.width = (100 * n / Math.max(1, set.length)) + "%"; $("wBar").className = n >= set.length ? "ok" : "";
    const known = Object.values(S.words.w || {}).filter(s => (s[0] || 0) >= 3).length, weak = Object.values(S.words.w || {}).filter(s => (s[2] || 0) > 0 && (s[0] || 0) < 3).length;
    $("wStats").textContent = "定着（3回以上即答） " + known + "語 ／ 苦手 " + weak + "語 ／ Part1〜2 全" + TW.length + "語";
    const sel = $("wDay"); if (!sel.options.length) for (let d = 0; d < Math.ceil(TW.length / 50); d++) sel.add(new Option((d + 1) + "日目（" + labelDay(addDays(PLAN_START, d)) + "）", d));
    sel.value = String(i);
    $("wStartBox").hidden = !!sess; renderFlash();
  }
  if (learnTab === "cloze") { $("czStart").hidden = !!cz; const c = S.cloze || {}; $("czStats").textContent = "これまで " + (c.correct || 0) + " / " + (c.total || 0) + " 問正解"; renderCloze(); }
  if (learnTab === "grammar") renderGrammar();
}
function bindLearn() {
  $("learnSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; learnTab = b.dataset.t; renderLearn(); };
  $("wGo").onclick = () => { if (ready()) startWords("day"); };
  $("wWeak").onclick = () => { if (ready()) startWords("weak"); };
  $("wDay").onchange = e => { wSet = Number(e.target.value); renderLearn(); };
  $("flash").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.a) answerWord(b.dataset.a === "yes");
    else if (b.dataset.j) judgeWord(b.dataset.j === "1");
    else if (b.dataset.n) missNext();
    else if (b.dataset.q) { clearTimeout(limitT); sess = null; renderLearn(); }
  };
  document.addEventListener("keydown", e => {
    if (currentView !== "learn" || !sess || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (sess.phase === "ask" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); answerWord(true); }
    else if (sess.phase === "ask" && e.key === "Escape") answerWord(false);
    else if (sess.phase === "judge" && (e.key === "1" || e.key === "o" || e.key === "Enter")) judgeWord(true);
    else if (sess.phase === "judge" && (e.key === "2" || e.key === "x")) judgeWord(false);
    else if (sess.phase === "miss" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); missNext(); }
  });
  $("czStart").onclick = () => { if (ready()) startCloze(); };
  $("clozeBox").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.c) pickCloze(Number(b.dataset.c)); else if (b.dataset.cz === "next") { cz.n++; cz.picked = null; renderCloze(); } else if (b.dataset.cz === "again") startCloze(); else if (b.dataset.cz === "end") { cz = null; renderLearn(); } };
  for (const g of Object.keys(GRAMMAR)) {
    $("units-" + g).addEventListener("click", e => { const b = e.target.closest("button[data-u]"); if (!b) return; openUnit = openUnit === b.dataset.u ? "" : b.dataset.u; renderGrammar(); const f = document.getElementById("uo-" + openUnit); if (f) f.focus(); });
    $("units-" + g).addEventListener("submit", e => { e.preventDefault(); if (!ready()) return; const id = e.target.dataset.uf, ok = parseInt($("uo-" + id).value, 10), tot = parseInt($("ut-" + id).value, 10); if (!(tot > 0) || !(ok >= 0) || ok > tot) { toast("正解数と問題数を入れて。"); return; } openUnit = ""; saveUnit(id, ok, tot); });
  }
}
