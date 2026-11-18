/* ===== 英語RPG『Echoes of Aster』の動き =====
   画面：上に背景の絵、下に会話の枠。枠をタップで次へ、右上の「訳」で日本語に切りかえ。
   文の中のターゲット単語（Part1〜2）には下線を引き、「訳」のときに意味を小さく並べる。
   戦い：問題に答えて敵のHPを削る。間違えるとハートが減る。答えたあとに短い解説。
   進み具合は game/rpg（story・章・何番目・フラグ・クリアした章・倒した敵）。 */
const RPG_STORY = "aster", RPG_HP = 5, RPG_CLEAR_KOBAN = 50, RPG_WIN_KOBAN = 5;
let rpgJa = false, rpgB = null, rpgMenu = false;
function rpgState() {
  let s = JSON.parse(JSON.stringify(S.rpg || {}));
  // 前の物語（妖怪の章）の記録は、小判の分だけ残して新しい物語を最初から
  if (s.story !== RPG_STORY) s = { story: RPG_STORY, ch: 0, i: 0, flags: {}, cleared: s.cleared || [], won: s.won || {} };
  s.flags = s.flags || {}; s.won = s.won || {}; s.cleared = s.cleared || []; s.ch = s.ch || 0; s.i = s.i || 0;
  return s;
}
function rpgKoban() { const r = S.rpg || {}; return (r.cleared || []).length * RPG_CLEAR_KOBAN + Object.keys(r.won || {}).length * RPG_WIN_KOBAN; }
const rpgNodes = st => (RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0]).nodes;

/* ---- ターゲット単語を見つける（変化形もだいたい拾う） ---- */
let rpgForms = null;
const RPG_SKIP = new Set(["found", "wind", "mean", "means", "left", "lie", "lay", "saw", "tear", "rose", "felt", "fell"]);
function rpgDict() {
  if (rpgForms) return rpgForms;
  rpgForms = new Map();
  const add = (f, w) => { if (!rpgForms.has(f) && !RPG_SKIP.has(f)) rpgForms.set(f, w); };
  for (const w of (typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : [])) {
    const b = String(w[0]).toLowerCase(); if (/[^a-z]/.test(b)) continue;
    for (const f of [b, b + "s", b + "es", b + "ed", b + "d", b + "ing", b + "ly"]) add(f, w);
    if (b.endsWith("e")) add(b.slice(0, -1) + "ing", w);
    if (b.endsWith("y")) for (const t of ["ies", "ied", "ily"]) add(b.slice(0, -1) + t, w);
    if (/[^aeiou][aeiou][bdgklmnprt]$/.test(b)) { add(b + b.slice(-1) + "ed", w); add(b + b.slice(-1) + "ing", w); }
  }
  return rpgForms;
}
const rpgShort = m => String(m).split(/[；;]/)[0].trim();
/** 英文を、ターゲット単語に下線をつけたHTMLにする。見つけた単語も返す */
function rpgMark(en) {
  const d = rpgDict(), found = [];
  const html = esc(en).replace(/[A-Za-z]+/g, t => { const w = d.get(t.toLowerCase()); if (!w) return t; if (!found.includes(w)) found.push(w); return `<u>${t}</u>`; });
  return { html, found };
}
/** 章の中で、この戦いより前に出てきたターゲット単語 */
function rpgChapterWords(st) {
  const out = []; const ns = rpgNodes(st);
  for (let k = 0; k < st.i; k++) { const n = ns[k]; if (n && n.en) for (const w of rpgMark(n.en).found) if (!out.includes(w)) out.push(w); }
  return out;
}
function rpgVocabQs(st, n) {
  const pool = rpgChapterWords(st), all = typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : [];
  const pick = [], seed = (st.ch + 1) * 97 + st.i * 13;
  for (let k = 0; k < (n.vocab || 0) && pool.length; k++) pick.push(pool.splice((seed + k * 31) % pool.length, 1)[0]);
  return pick.map((w, k) => {
    const wrong = []; for (let j = 1; wrong.length < 3 && j < 50; j++) { const x = all[(Number(w[2]) * 7 + j * 131 + k) % all.length]; if (x && x[0] !== w[0] && !wrong.includes(x)) wrong.push(x); }
    const opts = [w, ...wrong], at = (seed + k) % 4; [opts[0], opts[at]] = [opts[at], opts[0]];
    return { en: `What does "${w[0]}" mean?`, ja: `「${w[0]}」の意味は？`, opts: opts.map(x => [rpgShort(x[1]), rpgShort(x[1])]), a: at, tip: `${w[0]}＝${rpgShort(w[1])}（ターゲット No.${w[2]}）`, jaOnly: true };
  });
}

/* ---- 進める ---- */
function rpgResolve(st) {
  const ns = rpgNodes(st), at = l => ns.findIndex(n => n.label === l);
  for (let g = 0; g < 300; g++) {
    const n = ns[st.i]; if (!n) return st;
    if (n.label != null) st.i++;
    else if (n.if != null) st.i = st.flags[n.if] ? at(n.go) : st.i + 1;
    else if (n.go) st.i = at(n.go);
    else return st;
  }
  return st;
}
function rpgSave(st) { rpgJa = false; rpgB = null; rpgMenu = false; if (!ready()) return; return patchDoc("rpg", v => { for (const k of Object.keys(v)) delete v[k]; Object.assign(v, st); }); }
function rpgGo(st) {
  rpgResolve(st);
  const n = rpgNodes(st)[st.i], ch = RPG_CHAPTERS[st.ch];
  if (n && n.end && !st.cleared.includes(ch.id)) { st.cleared.push(ch.id); setTimeout(() => { sfx("done"); confetti(); toast(ch.ja + " クリア！小判＋" + RPG_CLEAR_KOBAN); }, 60); }
  return rpgSave(st);
}
function rpgNext() { const st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i]; if (!n) return; if (n.flag) st.flags[n.flag] = 1; st.i++; sfx("tap"); rpgGo(st); }

/* ---- 表示 ---- */
function rpgBg(st) { let bg = null; const ns = rpgNodes(st); for (let k = 0; k <= st.i; k++) if (ns[k] && ns[k].bg) bg = ns[k].bg; if (!bg) for (let c = st.ch - 1; c >= 0 && !bg; c--) for (const x of RPG_CHAPTERS[c].nodes) if (x.bg) bg = x.bg; return bg || "station"; }
function rpgScene(st, overlay) {
  const bg = rpgBg(st), src = typeof RPG_BG !== "undefined" && RPG_BG[bg];
  return `<div class="rpg-scene" style="${src ? `background-image:url('${src}')` : ""}">${overlay || ""}</div>`;
}
const rpgTr = () => `<button type="button" class="rpg-tr${rpgJa ? " on" : ""}" data-r="tr" aria-pressed="${rpgJa}">訳</button>`;
function rpgGloss(found) { return rpgJa && found.length ? `<div class="rpg-gloss">${found.map(w => `<span><b>${esc(w[0])}</b>${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""; }

function renderRPG() {
  const box = $("rpgBox"); if (!box) return;
  const st = rpgResolve(rpgState()), ch = RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0], ns = rpgNodes(st), n = ns[st.i];
  const shown = ns.filter(x => x.en || x.choice || x.battle).length, done = ns.slice(0, st.i).filter(x => x.en || x.choice || x.battle).length;
  const head = `<div class="rpg-top"><span class="rpg-ch">${esc(ch.ja)}</span><span class="rpg-prog">${Math.min(done + 1, shown)} / ${shown}</span><button type="button" class="rpg-menu-btn" data-r="menu" aria-label="章を選ぶ">☰</button></div>`;
  let h;
  if (rpgMenu) h = head + rpgMenuHtml(st);
  else if (!n) h = head + rpgScene(st) + `<div class="rpg-box"><p class="rpg-text">物語が見つからない。☰ から章を選んで。</p></div>`;
  else if (n.end) h = head + rpgScene(st, `<div class="rpg-banner">${esc(ch.ja)}<small>CLEAR</small></div>`) + rpgEndHtml(st);
  else if (n.battle) h = head + rpgBattleHtml(st, n);
  else if (n.choice) h = head + rpgScene(st) + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">${rpgJa ? "選択" : "Choice"}</span>${rpgTr()}</div>
      <p class="rpg-text">${esc(rpgJa ? n.choice.ja : n.choice.en)}</p>
      <div class="rpg-opts">${n.opts.map((o, k) => `<button type="button" data-r="opt" data-k="${k}"><span>${k + 1}</span>${esc(rpgJa ? o.ja : o.en)}</button>`).join("")}</div></div>`;
  else {
    const c = n.who && RPG_CAST[n.who], m = rpgMark(n.en);
    h = head + rpgScene(st) + `<div class="rpg-box tap" data-r="next" role="button" tabindex="0">
      <div class="rpg-boxhead">${c ? `<span class="rpg-name">${esc(rpgJa ? c.ja : c.name)}</span>` : `<span></span>`}${rpgTr()}</div>
      <p class="rpg-text${c ? "" : " narr"}">${rpgJa ? esc(n.ja) : m.html}</p>${rpgGloss(m.found)}
      <span class="rpg-more" aria-hidden="true">▼</span></div>`;
  }
  if (box.dataset.v !== h) {
    box.innerHTML = h; box.dataset.v = h;
    // 答えたあとは、結果と「次へ」が下のタブに隠れないように少しスクロール
    const nb = box.querySelector('[data-r="bnext"]');
    if (nb) requestAnimationFrame(() => { const over = nb.getBoundingClientRect().bottom - (innerHeight - 90); if (over > 0) scrollBy({ top: over, behavior: "smooth" }); });
  }
}
function rpgEndHtml(st) {
  const last = st.ch >= RPG_CHAPTERS.length - 1;
  return `<div class="rpg-box"><p class="rpg-text">${last ? "ここまでが今ある物語。続きは準備中。" : "次の章へ進もう。"}</p>
    ${last ? "" : `<button type="button" class="big-btn" data-r="nextch">${esc(RPG_CHAPTERS[st.ch + 1].ja)} へ</button>`}</div>`;
}
function rpgMenuHtml(st) {
  return `<div class="rpg-box"><p class="rpg-text">章を選ぶ</p><div class="rpg-chlist">${RPG_CHAPTERS.map((c, k) => {
    const open = k === 0 || st.cleared.includes(RPG_CHAPTERS[k - 1].id) || k <= st.ch;
    return `<button type="button" data-r="pick" data-k="${k}"${open ? "" : " disabled"}${k === st.ch ? ' class="cur"' : ""}><span>${esc(c.ja)}</span><small>${st.cleared.includes(c.id) ? "クリア" : open ? "" : "未開放"}</small></button>`;
  }).join("")}</div><button type="button" class="btn" data-r="menu">閉じる</button></div>`;
}
function rpgBattleHtml(st, n) {
  if (!rpgB || rpgB.i !== st.i) { const qs = [...n.qs, ...rpgVocabQs(st, n)]; rpgB = { i: st.i, qs, hp: qs.length, php: RPG_HP, q: qs.map((_, k) => k), res: null, pick: null }; }
  const b = rpgB, e = n.battle, total = b.qs.length;
  const over = `<div class="rpg-foe${e.boss ? " boss" : ""}"><b>${esc(rpgJa ? e.ja : e.name)}</b><div class="rpg-hpbar"><i style="width:${100 * Math.max(0, b.hp) / total}%"></i></div></div>
    <div class="rpg-hearts">${"♥".repeat(Math.max(0, b.php))}<span>${"♥".repeat(RPG_HP - Math.max(0, b.php))}</span></div>`;
  const scene = rpgScene(st, over);
  if (b.php <= 0) return scene + `<div class="rpg-box"><p class="rpg-text">力尽きた……もう一度挑戦しよう。</p><button type="button" class="big-btn" data-r="retry">もう一度戦う</button></div>`;
  if (b.hp <= 0) return scene + `<div class="rpg-box"><p class="rpg-text">${esc(rpgJa ? e.ja : e.name)} を倒した！${st.won[st.ch + ":" + st.i] ? "" : `<small class="rpg-gain">小判＋${RPG_WIN_KOBAN}</small>`}</p><button type="button" class="big-btn" data-r="win">先へ進む</button></div>`;
  const q = b.qs[b.q[0]], answered = b.res != null, num = total - b.q.length + 1;
  let h = scene + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">Q${Math.min(num, total)} / ${total}</span>${q.jaOnly || answered ? "" : rpgTr()}</div>
    <p class="rpg-text q">${esc(rpgJa || answered ? q.ja : q.en)}</p>
    <div class="rpg-opts">${q.opts.map((o, k) => {
      const cls = !answered ? "" : k === q.a ? "right" : k === b.pick ? "wrong" : "dim";
      const label = q.jaOnly ? esc(o[1]) : answered || rpgJa ? `${esc(o[0])}<small>${esc(o[1])}</small>` : esc(o[0]);
      return `<button type="button" data-r="ans" data-k="${k}" class="${cls}"${answered ? " disabled" : ""}><span>${"ABCD"[k]}</span><em>${label}</em></button>`;
    }).join("")}</div>`;
  if (answered) h += `<div class="rpg-res ${b.res}"><b>${b.res === "ok" ? "正解" : "不正解　正解は " + "ABCD"[q.a]}</b><p>${esc(q.tip || "")}</p></div><button type="button" class="big-btn" data-r="bnext">次へ</button>`;
  return h + `</div>`;
}
function bindRPG() {
  const box = $("rpgBox");
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-r]"); if (!b || b.disabled) return;
    const r = b.dataset.r, st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i];
    if (r === "tr") { e.stopPropagation(); rpgJa = !rpgJa; sfx("tap"); return renderRPG(); }
    if (r === "menu") { rpgMenu = !rpgMenu; return renderRPG(); }
    if (r === "pick") { const k = Number(b.dataset.k); if (k === st.ch) { rpgMenu = false; return renderRPG(); } st.ch = k; st.i = 0; st.flags = st.flags || {}; return rpgGo(st); }
    if (r === "next") return rpgNext();
    if (r === "nextch") { st.ch++; st.i = 0; return rpgGo(st); }
    if (r === "opt") { const o = n.opts[Number(b.dataset.k)]; if (o.flag) st.flags[o.flag] = 1; st.i = rpgNodes(st).findIndex(x => x.label === o.go); sfx("ok"); return rpgGo(st); }
    if (r === "ans" && rpgB && rpgB.res == null) {
      const k = Number(b.dataset.k), q = rpgB.qs[rpgB.q[0]]; rpgB.pick = k;
      if (k === q.a) { rpgB.res = "ok"; rpgB.hp--; sfx("ok"); } else { rpgB.res = "ng"; rpgB.php--; sfx("ng"); }
      rpgJa = false; return renderRPG();
    }
    if (r === "bnext" && rpgB) { const q = rpgB.q.shift(); if (rpgB.res === "ng") rpgB.q.push(q); rpgB.res = null; rpgB.pick = null; return renderRPG(); }
    if (r === "retry") { rpgB = null; return renderRPG(); }
    if (r === "win") { st.won[st.ch + ":" + st.i] = 1; st.i++; sfx("coin"); return rpgGo(st); }
  });
  box.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.r === "next") { e.preventDefault(); rpgNext(); } });
}
