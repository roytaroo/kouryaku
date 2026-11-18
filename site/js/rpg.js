/* ===== 英語RPG「提灯の道」：英語で読んで、ボタンで日本語に切りかえて答え合わせ =====
   進み具合は game/rpg に保存（章・何番目・フラグ・クリアした章・倒した敵）。戦いの途中は保存しない（開き直すとその戦いの最初から）。 */
const RPG_HP = 5, RPG_CLEAR_KOBAN = 50, RPG_WIN_KOBAN = 5;
let rpgJa = false, rpgB = null;
const rpgDefault = () => ({ ch: 0, i: 0, flags: {}, cleared: [], won: {} });
function rpgState() { const s = { ...rpgDefault(), ...JSON.parse(JSON.stringify(S.rpg || {})) }; s.flags = s.flags || {}; s.won = s.won || {}; s.cleared = s.cleared || []; return s; }
function rpgKoban() { const r = S.rpg || {}; return (r.cleared || []).length * RPG_CLEAR_KOBAN + Object.keys(r.won || {}).length * RPG_WIN_KOBAN; }
const rpgNodes = st => (RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0]).nodes;
/** 見えない節（ラベル・ジャンプ・条件）を飛ばして、次に見せる節まで進める */
function rpgResolve(st) {
  const ns = rpgNodes(st), at = l => ns.findIndex(n => n.label === l);
  for (let guard = 0; guard < 200; guard++) {
    const n = ns[st.i]; if (!n) return st;
    if (n.label != null) st.i++;
    else if (n.go && n.if == null) st.i = at(n.go);
    else if (n.if != null) st.i = st.flags[n.if] ? at(n.go) : st.i + 1;
    else return st;
  }
  return st;
}
function rpgGo(st) {
  rpgResolve(st); rpgJa = false; rpgB = null;
  const n = rpgNodes(st)[st.i];
  if (n && n.end && !st.cleared.includes(RPG_CHAPTERS[st.ch].id)) { st.cleared.push(RPG_CHAPTERS[st.ch].id); setTimeout(() => { sfx("done"); confetti(); toast(n.end + "！小判＋" + RPG_CLEAR_KOBAN); }, 50); }
  if (!ready()) return; return patchDoc("rpg", v => { for (const k of Object.keys(v)) delete v[k]; Object.assign(v, st); });
}
function rpgNext() { const st = rpgState(), n = rpgNodes(st)[st.i]; if (n && n.flag) st.flags[n.flag] = 1; st.i++; rpgGo(st); sfx("tap"); }

function rpgFace(id) {
  const c = RPG_CAST[id] || {}; const ch = c.img && (typeof CHARS !== "undefined" ? CHARS : []).find(x => x.id === c.img);
  if (ch && ch.img) return `<img class="rpg-face" src="${ch.img}" alt="">`;
  return `<span class="rpg-face mark">${esc(c.mark || (c.name || "?").slice(0, 1))}</span>`;
}
const rpgT = (en, ja) => rpgJa ? ja : en;
function rpgWords(w) { return rpgJa && w && w.length ? `<ul class="rpg-words">${w.map(([e, j]) => `<li><b>${esc(e)}</b>　${esc(j)}</li>`).join("")}</ul>` : ""; }
function rpgToggle() { return `<button type="button" class="btn sm rpg-tr" data-r="tr">${rpgJa ? "English に戻す" : "日本語にする"}</button>`; }

function renderRPG() {
  const box = $("rpgBox"); if (!box) return;
  const st = rpgResolve(rpgState()), ch = RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0], n = rpgNodes(st)[st.i];
  $("rpgTitle").textContent = rpgJa ? ch.ja : ch.title;
  $("rpgSub").textContent = "クリア " + st.cleared.length + "章・倒した敵 " + Object.keys(st.won).length;
  let bg = "road"; for (let k = 0; k <= st.i; k++) { const x = rpgNodes(st)[k]; if (x && x.bg) bg = x.bg; }
  const art = n && !n.end ? rpgArt(bg, n.battle ? n.battle.foe : n.foe) : rpgArt(bg);
  let h = "";
  if (!n) h = `<p class="note">物語が見つからない。「最初から」を押して。</p>`;
  else if (n.end) {
    h = `<div class="rpg-end"><b>${esc(n.end)}</b><p>${rpgT("To be continued...", "つづく…")}</p><p class="note">次の章は準備中。できたら知らせるね。</p><button type="button" class="big-btn" data-r="restart">もう一度最初から読む</button></div>`;
  } else if (n.battle) h = rpgBattleHtml(st, n);
  else if (n.choice) {
    h = `<div class="rpg-line narr"><p class="rpg-text">${esc(rpgT(n.choice.en, n.choice.ja))}</p></div>
      <div class="rpg-opts">${n.opts.map((o, k) => `<button type="button" data-r="opt" data-k="${k}">${esc(rpgT(o.en, o.ja))}</button>`).join("")}</div>${rpgToggle()}`;
  } else {
    const c = n.who && RPG_CAST[n.who];
    h = `<div class="rpg-line${c ? "" : " narr"}">${c ? `<div class="rpg-who">${rpgFace(n.who)}<b>${esc(rpgJa ? c.ja : c.name)}</b></div>` : ""}
      <p class="rpg-text" data-r="tr">${esc(rpgT(n.en, n.ja))}</p>${rpgWords(n.w)}</div>
      <div class="rpg-nav">${rpgToggle()}<button type="button" class="big-btn rpg-next" data-r="next">次へ ▶</button></div>`;
  }
  h = art + h;
  if (box.dataset.v !== h) { box.innerHTML = h; box.dataset.v = h; }
}
function rpgBattleHtml(st, n) {
  if (!rpgB || rpgB.i !== st.i) rpgB = { i: st.i, hp: n.qs.length, php: RPG_HP, q: n.qs.map((_, k) => k), res: null, pick: null };
  const b = rpgB, e = n.battle, q = n.qs[b.q[0]];
  const hearts = "♥".repeat(Math.max(0, b.php)) + "♡".repeat(RPG_HP - Math.max(0, b.php));
  let h = `<div class="rpg-foe${e.boss ? " boss" : ""}"><span class="rpg-face mark">${esc(e.mark || "?")}</span><div><b>${esc(rpgJa ? e.ja : e.name)}</b><div class="bar-p"><i style="width:${100 * b.hp / n.qs.length}%;background:var(--seal)!important"></i></div></div></div>
    <div class="rpg-hp">だいき <span>${hearts}</span></div>`;
  if (b.php <= 0) return h + `<div class="rpg-end"><b>力尽きた…</b><p class="note">もう一度挑戦できる。間違えた問題は、説明を読んでから。</p><button type="button" class="big-btn" data-r="retry">もう一度戦う</button></div>`;
  if (b.hp <= 0) return h + `<div class="rpg-end"><b>${esc(rpgJa ? e.ja : e.name)} を倒した！</b>${st.won[st.ch + ":" + st.i] ? "" : `<p class="note">小判＋${RPG_WIN_KOBAN}</p>`}<button type="button" class="big-btn" data-r="win">先へ進む ▶</button></div>`;
  h += `<p class="rpg-q">${esc(rpgT(q.en, q.ja))}</p><div class="rpg-opts">${q.opts.map((o, k) => {
    const cls = b.res == null ? "" : k === q.a ? " right" : k === b.pick ? " wrong" : "";
    return `<button type="button" data-r="ans" data-k="${k}"${b.res != null ? " disabled" : ""} class="${cls.trim()}">${esc(b.res != null || rpgJa ? o[0] + "（" + o[1] + "）" : o[0])}</button>`;
  }).join("")}</div>`;
  if (b.res != null) h += `<div class="rpg-res ${b.res}"><b>${b.res === "ok" ? "正解！ 攻撃が当たった" : "ちがう… ダメージを受けた"}</b><p>${esc(q.ja)}</p><p>${esc(q.why || "")}</p></div><button type="button" class="big-btn" data-r="bnext">次へ ▶</button>`;
  else h += rpgToggle();
  return h;
}
function bindRPG() {
  $("rpgBox").addEventListener("click", e => {
    const b = e.target.closest("[data-r]"); if (!b) return;
    const r = b.dataset.r, st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i];
    if (r === "tr") { rpgJa = !rpgJa; sfx("tap"); return renderRPG(); }
    if (r === "next") return rpgNext();
    if (r === "opt") { const o = n.opts[Number(b.dataset.k)]; if (o.flag) st.flags[o.flag] = 1; st.i = rpgNodes(st).findIndex(x => x.label === o.go); sfx("ok"); return rpgGo(st); }
    if (r === "ans" && rpgB && rpgB.res == null) {
      const k = Number(b.dataset.k), q = n.qs[rpgB.q[0]]; rpgB.pick = k;
      if (k === q.a) { rpgB.res = "ok"; rpgB.hp--; sfx("ok"); } else { rpgB.res = "ng"; rpgB.php--; sfx("ng"); }
      rpgJa = false; return renderRPG();
    }
    if (r === "bnext" && rpgB) { const q = rpgB.q.shift(); if (rpgB.res === "ng") rpgB.q.push(q); rpgB.res = null; rpgB.pick = null; rpgJa = false; return renderRPG(); }
    if (r === "retry") { rpgB = null; return renderRPG(); }
    if (r === "win") { st.won[st.ch + ":" + st.i] = 1; st.i++; sfx("coin"); return rpgGo(st); }
    if (r === "restart") { st.i = 0; st.flags = {}; return rpgGo(st); }
  });
  $("rpgReset").onclick = () => { if (!confirm("この章を最初から読み直す？（クリアした記録と小判はそのまま）")) return; const st = rpgState(); st.i = 0; st.flags = {}; rpgGo(st); };
}
