/* ===== 英語RPG『Echoes of Aster』の動き =====
   画面：上に背景の絵、下に会話の枠。枠をタップで次へ、右上の「訳」で日本語に切りかえ。
   文の中のターゲット単語（Part1〜2）には下線を引き、「訳」のときに意味を小さく並べる。
   戦い：問題に答えて敵のHPを削る。間違えるとハートが減る。答えたあとに短い解説。
   進み具合は game/rpg（story・章・何番目・フラグ・クリアした章・倒した敵）。 */
const RPG_STORY = "aster", RPG_HP = 5, RPG_CLEAR_KOBAN = 50, RPG_WIN_KOBAN = 5;
let rpgJa = false, rpgB = null, rpgMenu = false, rpgMode = "story", rpgX = null;
const RPG_EX_KOBAN = 3, RPG_EX_DAILY = 5;
function rpgState() {
  let s = JSON.parse(JSON.stringify(S.rpg || {}));
  // 前の物語（妖怪の章）の記録は、小判の分だけ残して新しい物語を最初から
  if (s.story !== RPG_STORY) s = { story: RPG_STORY, ch: 0, i: 0, flags: {}, cleared: s.cleared || [], won: s.won || {} };
  s.flags = s.flags || {}; s.won = s.won || {}; s.items = s.items || {}; s.dex = s.dex || {}; s.ex = s.ex || {}; s.exk = s.exk || 0; s.cleared = s.cleared || []; s.ch = s.ch || 0; s.i = s.i || 0;
  return s;
}
function rpgKoban() { const r = S.rpg || {}; return (r.cleared || []).length * RPG_CLEAR_KOBAN + Object.keys(r.won || {}).length * RPG_WIN_KOBAN + (r.exk || 0); }
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
function rpgScene(bg, overlay, cls) {
  const src = typeof RPG_BG !== "undefined" && RPG_BG[bg];
  return `<div class="rpg-scene${cls ? " " + cls : ""}" style="${src ? `background-image:url('${src}')` : ""}">${overlay || ""}</div>`;
}
function rpgFace(c, face) {
  if (!c || !c.face || typeof RPG_FACE === "undefined") return "";
  const src = RPG_FACE[c.face + "_" + (face || "neutral")] || RPG_FACE[c.face + "_neutral"];
  return src ? `<img class="rpg-face" src="${src}" alt="">` : "";
}
const rpgMonSrc = n => typeof RPG_MON !== "undefined" && RPG_MON[n] || "";
const rpgItemSrc = n => typeof RPG_ITEM !== "undefined" && RPG_ITEM[n] || "";
const rpgTr = () => `<button type="button" class="rpg-tr${rpgJa ? " on" : ""}" data-r="tr" aria-pressed="${rpgJa}">訳</button>`;
function rpgGloss(found) { return rpgJa && found.length ? `<div class="rpg-gloss">${found.map(w => `<span><b>${esc(w[0])}</b>${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""; }

function renderRPG() {
  const box = $("rpgBox"); if (!box) return;
  const st = rpgResolve(rpgState());
  const tabs = `<div class="rpg-modes" role="tablist">${[["story", "冒険"], ["explore", "探索"], ["dex", "図鑑"]].map(([k, l]) => `<button type="button" data-r="mode" data-k="${k}" aria-pressed="${rpgMode === k}">${l}</button>`).join("")}</div>`;
  let h = tabs + (rpgMode === "explore" ? rpgExploreHtml(st) : rpgMode === "dex" ? rpgDexHtml(st) : rpgMode === "novel" ? rpgStoryHtml(st) : rpgGameHtml(st));
  if (box.dataset.v !== h) {
    box.innerHTML = h; box.dataset.v = h;
    // 答えたあとは、結果と「次へ」が下のタブに隠れないように少しスクロール
    const nb = box.querySelector('[data-r="bnext"]');
    if (nb) requestAnimationFrame(() => { const over = nb.getBoundingClientRect().bottom - (innerHeight - 90); if (over > 0) scrollBy({ top: over, behavior: "smooth" }); });
  }
}
function rpgGameHtml(st) {
  const g = S.rpg && S.rpg.game, lead = g && g.party && g.party[0];
  const where = g && GMAPS[g.map] ? GMAPS[g.map].ja : "";
  return `<div class="rpg-top"><span class="rpg-ch">Echoes of Aster</span><span class="rpg-prog">王道RPG・物語は英語</span></div>` + rpgScene("cg_train") + `<div class="rpg-box">
    <p class="rpg-text">十字ボタンで歩いて、町の人と話し、魔物とコマンドで戦う。物語の会話はすべて英語。「訳」でいつでも日本語に。</p>
    ${g ? `<p class="note" style="margin:0">つづき：${esc(where)}　レンLv${lead ? lead.lv : 1}　${g.gold}G</p><button type="button" class="big-btn" data-r="gplay">つづきから</button><button type="button" class="btn" data-r="gnew">はじめから</button>` : `<button type="button" class="big-btn" data-r="gnew">冒険をはじめる</button>`}
    <button type="button" class="btn ghost sm" data-r="novel">物語だけ読む（ノベル版）</button></div>`;
}
function rpgStoryHtml(st) {
  const ch = RPG_CHAPTERS[st.ch] || RPG_CHAPTERS[0], ns = rpgNodes(st), n = ns[st.i], bg = rpgBg(st);
  const shown = ns.filter(x => x.en || x.choice || x.battle).length, done = ns.slice(0, st.i).filter(x => x.en || x.choice || x.battle).length;
  const head = `<div class="rpg-top"><span class="rpg-ch">${esc(ch.ja)}</span><span class="rpg-prog">${Math.min(done + 1, shown)} / ${shown}</span><button type="button" class="rpg-menu-btn" data-r="menu" aria-label="章を選ぶ">☰</button></div>`;
  if (rpgMenu) return head + rpgMenuHtml(st);
  if (!n) return head + rpgScene(bg) + `<div class="rpg-box"><p class="rpg-text">物語が見つからない。☰ から章を選んで。</p></div>`;
  if (n.end) return head + rpgScene(bg, `<div class="rpg-banner">${esc(ch.ja)}<small>CLEAR</small></div>`) + rpgEndHtml(st);
  if (n.battle) {
    if (!rpgB || rpgB.i !== st.i) { const qs = [...n.qs, ...rpgVocabQs(st, n)]; rpgB = rpgNewFight(qs, { ...n.battle, koban: RPG_WIN_KOBAN }); rpgB.i = st.i; }
    return head + rpgFightHtml(rpgB, bg, st, !st.won[st.ch + ":" + st.i]);
  }
  if (n.choice) return head + rpgScene(bg) + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">${rpgJa ? "選択" : "Choice"}</span>${rpgTr()}</div>
      <p class="rpg-text">${esc(rpgJa ? n.choice.ja : n.choice.en)}</p>
      <div class="rpg-opts">${n.opts.map((o, k) => `<button type="button" data-r="opt" data-k="${k}"><span>${k + 1}</span><em>${esc(rpgJa ? o.ja : o.en)}</em></button>`).join("")}</div></div>`;
  const c = n.who && RPG_CAST[n.who], m = rpgMark(n.en);
  return head + rpgScene(bg) + `<div class="rpg-box tap" data-r="next" role="button" tabindex="0">
      <div class="rpg-boxhead">${c ? `<span class="rpg-name">${esc(rpgJa ? c.ja : c.name)}</span>` : `<span></span>`}${rpgTr()}</div>
      <div class="rpg-say">${rpgFace(c, n.face)}<p class="rpg-text${c ? "" : " narr"}">${rpgJa ? esc(n.ja) : m.html}</p></div>${rpgGloss(m.found)}
      <span class="rpg-more" aria-hidden="true">▼</span></div>`;
}
function rpgEndHtml(st) {
  const last = st.ch >= RPG_CHAPTERS.length - 1;
  return `<div class="rpg-box"><p class="rpg-text">${last ? "ここまでが今ある物語。続きは準備中。そのあいだは「探索」で単語を鍛えよう。" : "次の章へ進もう。"}</p>
    ${last ? "" : `<button type="button" class="big-btn" data-r="nextch">${esc(RPG_CHAPTERS[st.ch + 1].ja)} へ</button>`}</div>`;
}
function rpgMenuHtml(st) {
  return `<div class="rpg-box"><p class="rpg-text">章を選ぶ</p><div class="rpg-chlist">${RPG_CHAPTERS.map((c, k) => {
    const open = k === 0 || st.cleared.includes(RPG_CHAPTERS[k - 1].id) || k <= st.ch;
    return `<button type="button" data-r="pick" data-k="${k}"${open ? "" : " disabled"}${k === st.ch ? ' class="cur"' : ""}><span>${esc(c.ja)}</span><small>${st.cleared.includes(c.id) ? "クリア" : open ? "" : "未開放"}</small></button>`;
  }).join("")}</div><button type="button" class="btn" data-r="menu">閉じる</button></div>`;
}

/* ---- 戦い（物語と探索で共通） ---- */
function rpgNewFight(qs, e) { return { qs, hp: qs.length, php: RPG_HP, q: qs.map((_, k) => k), res: null, pick: null, e, fx: "" }; }
function rpgFightHtml(b, bg, st, firstWin) {
  const e = b.e, total = b.qs.length, foe = e.foe && typeof RPG_FOE !== "undefined" && RPG_FOE[e.foe], mon = foe || (e.mon && rpgMonSrc(e.mon));
  const over = `<div class="rpg-foe${e.boss ? " boss" : ""}"><b>${esc(rpgJa && e.ja ? e.ja : e.name)}</b><div class="rpg-hpbar"><i style="width:${100 * Math.max(0, b.hp) / total}%"></i></div></div>
    ${mon ? `<img class="rpg-mon${foe ? " tall" : ""}${b.hp <= 0 ? " down" : b.fx === "ok" ? " hit" : ""}" src="${mon}" alt="">` : ""}
    <div class="rpg-hearts">${"♥".repeat(Math.max(0, b.php))}<span>${"♥".repeat(RPG_HP - Math.max(0, b.php))}</span></div>`;
  const scene = rpgScene(bg, over, b.fx === "ng" ? "hurt" : "");
  if (b.php <= 0) return scene + `<div class="rpg-box"><p class="rpg-text">力尽きた……もう一度挑戦しよう。</p><button type="button" class="big-btn" data-r="retry">もう一度戦う</button></div>`;
  if (b.hp <= 0) {
    const drop = e.drop && RPG_ITEMS[e.drop];
    return scene + `<div class="rpg-box"><p class="rpg-text">${esc(rpgJa && e.ja ? e.ja : e.name)} を倒した！</p>
      ${drop ? `<div class="rpg-drop"><img src="${rpgItemSrc(e.drop)}" alt=""><span><b>${esc(drop.ja)}</b> を手に入れた<small>${esc(drop.use)}</small></span></div>` : ""}
      ${firstWin && e.koban ? `<p class="rpg-gain">小判＋${e.koban}</p>` : ""}<button type="button" class="big-btn" data-r="win">${b.ex ? "探索を続ける" : "先へ進む"}</button></div>`;
  }
  const q = b.qs[b.q[0]], answered = b.res != null, num = total - b.q.length + 1, herbs = (st.items || {})[1] || 0;
  let h = scene + `<div class="rpg-box"><div class="rpg-boxhead"><span class="rpg-name sys">Q${Math.min(num, total)} / ${total}</span><span class="rpg-tools">${herbs && b.php < RPG_HP && !answered ? `<button type="button" class="rpg-herb" data-r="herb"><img src="${rpgItemSrc(1)}" alt="">薬草 ${herbs}</button>` : ""}${q.jaOnly || answered ? "" : rpgTr()}</span></div>
    ${q.pre ? `<p class="rpg-text ex">${q.pre}</p>` : ""}<p class="rpg-text q">${esc(rpgJa || answered ? q.ja : q.en)}</p>
    <div class="rpg-opts">${q.opts.map((o, k) => {
      const cls = !answered ? "" : k === q.a ? "right" : k === b.pick ? "wrong" : "dim";
      const label = q.jaOnly ? esc(o[1]) : answered || rpgJa ? `${esc(o[0])}<small>${esc(o[1])}</small>` : esc(o[0]);
      return `<button type="button" data-r="ans" data-k="${k}" class="${cls}"${answered ? " disabled" : ""}><span>${"ABCD"[k]}</span><em>${label}</em></button>`;
    }).join("")}</div>`;
  if (answered) h += `<div class="rpg-res ${b.res}"><b>${b.res === "ok" ? "正解" : "不正解　正解は " + "ABCD"[q.a]}</b><p>${esc(q.tip || "")}</p></div><button type="button" class="big-btn" data-r="bnext">次へ</button>`;
  return h + `</div>`;
}

/* ---- 探索：ターゲット1900の問題でモンスターと戦う ---- */
const RPG_EX_BG = ["village", "ruins", "cave", "canal", "beach", "sea", "storm", "gate", "harbor", "cellar"];
function rpgExQs() {
  const all = typeof TARGET_WORDS !== "undefined" ? TARGET_WORDS : [], seen = (S.words && S.words.w) || {};
  if (!all.length) return [];
  // 間違えたことのある単語を多めに、残りはこれまでに出た範囲から
  const weak = all.filter(w => seen[w[2]] && seen[w[2]][2] > 0), met = all.filter(w => seen[w[2]]);
  const pool = () => { const r = Math.random(); const src = r < .45 && weak.length ? weak : r < .8 && met.length > 20 ? met : all; return src[Math.floor(Math.random() * src.length)]; };
  const used = new Set(), qs = [];
  while (qs.length < 5 && used.size < 60) {
    const w = pool(); if (used.has(w[2])) continue; used.add(w[2]);
    const wrong = []; while (wrong.length < 3) { const x = all[Math.floor(Math.random() * all.length)]; if (x[0] !== w[0] && !wrong.includes(x)) wrong.push(x); }
    const opts = [w, ...wrong].sort(() => Math.random() - .5), a = opts.indexOf(w);
    const ex = w[3] && /\{\{c1::/.test(w[3]);
    if (ex && qs.length % 2 === 1) {
      const sent = esc(w[3]).replace(/(\w*)\{\{c1::(.*?)\}\}(\w*)/, "<b class=\"blank\">＿＿＿</b>");
      qs.push({ pre: sent, en: "Choose the word that fits the blank.", ja: (w[4] || "") + "　→ 空所に入る単語は？", opts: opts.map(x => [x[0], rpgShort(x[1])]), a, tip: `${w[0]}＝${rpgShort(w[1])}（No.${w[2]}）` });
    } else qs.push({ en: `What does "${w[0]}" mean?`, ja: `「${w[0]}」の意味は？`, opts: opts.map(x => [rpgShort(x[1]), rpgShort(x[1])]), a, tip: `${w[0]}＝${rpgShort(w[1])}（No.${w[2]}）`, jaOnly: true });
  }
  return qs;
}
function rpgExploreHtml(st) {
  const today = dayKey(), ex = st.ex.day === today ? st.ex : { day: today, wins: 0 };
  if (rpgX) return `<div class="rpg-top"><span class="rpg-ch">探索　${esc(rpgX.areaJa)}</span><span class="rpg-prog">今日 ${ex.wins} 勝</span></div>` + rpgFightHtml(rpgX, rpgX.bg, st, false);
  const left = Math.max(0, RPG_EX_DAILY - ex.wins), got = Object.keys(st.dex).length;
  return `<div class="rpg-top"><span class="rpg-ch">探索</span><span class="rpg-prog">図鑑 ${got} / 110</span></div>` + rpgScene("ruins") + `<div class="rpg-box">
    <p class="rpg-text">ターゲット1900の単語で、野生のモンスターと戦う。間違えたことのある単語ほど出やすい。</p>
    <p class="note" style="margin:0">勝つと図鑑に登録。今日はあと${left}回まで小判＋${RPG_EX_KOBAN}（そのあとも遊べる）。ときどきアイテムを落とす。</p>
    <button type="button" class="big-btn" data-r="explore">探索に出る</button></div>`;
}
const RPG_AREA_JA = { village: "村はずれ", ruins: "森の遺跡", cave: "水晶の洞窟", canal: "地下水路", beach: "浜辺", sea: "海の底", storm: "嵐の空", gate: "炎の門", harbor: "港の倉庫", cellar: "古い地下室" };
function rpgStartExplore() {
  const qs = rpgExQs(); if (!qs.length) return toast("単語データが読み込めていない。");
  const mon = 1 + Math.floor(Math.random() * 110), bg = RPG_EX_BG[Math.floor(Math.random() * RPG_EX_BG.length)];
  rpgX = rpgNewFight(qs, { name: RPG_MON_NAMES[mon], mon }); rpgX.ex = true; rpgX.bg = bg; rpgX.areaJa = RPG_AREA_JA[bg] || "";
  rpgJa = false; sfx("tap"); renderRPG();
}
function rpgDexHtml(st) {
  const got = Object.keys(st.dex).length, items = Object.entries(RPG_ITEMS);
  return `<div class="rpg-top"><span class="rpg-ch">モンスター図鑑</span><span class="rpg-prog">${got} / 110</span></div>
    <div class="rpg-box"><div class="rpg-dex">${RPG_MON_NAMES.slice(1).map((nm, k) => { const n = k + 1, c = st.dex[n]; return `<div class="${c ? "" : "lock"}" title="${c ? esc(nm) : "？？？"}"><img src="${rpgMonSrc(n)}" alt=""><small>${c ? esc(nm) : "No." + n}</small></div>`; }).join("")}</div></div>
    <div class="rpg-box"><p class="rpg-text">持ち物</p><div class="rpg-items">${items.map(([id, it]) => { const c = (st.items || {})[id] || 0; return `<div class="${c ? "" : "lock"}"><img src="${rpgItemSrc(id)}" alt=""><span><b>${c ? esc(it.ja) : "？？？"}</b><small>${c ? "×" + c + "　" + esc(it.use) : "まだ持っていない"}</small></span></div>`; }).join("")}</div>
    <p class="note" style="margin:0">モンスター・アイテムの絵：モケモ（mokemo-factory）</p></div>`;
}

function bindRPG() {
  const box = $("rpgBox");
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-r]"); if (!b || b.disabled) return;
    const r = b.dataset.r, st = rpgResolve(rpgState()), n = rpgNodes(st)[st.i], fight = rpgMode === "explore" ? rpgX : rpgB;
    if (r === "tr") { e.stopPropagation(); rpgJa = !rpgJa; sfx("tap"); return renderRPG(); }
    if (r === "mode") { rpgMode = b.dataset.k; rpgMenu = false; rpgJa = false; sfx("tap"); return renderRPG(); }
    if (r === "menu") { rpgMenu = !rpgMenu; return renderRPG(); }
    if (r === "pick") { const k = Number(b.dataset.k); if (k === st.ch) { rpgMenu = false; return renderRPG(); } st.ch = k; st.i = 0; return rpgGo(st); }
    if (r === "next") return rpgNext();
    if (r === "gplay") return gOpen(false);
    if (r === "gnew") { if (S.rpg && S.rpg.game && !confirm("はじめからにすると、今の冒険のデータは消える。いい？")) return; return gOpen(true); }
    if (r === "novel") { rpgMode = "novel"; return renderRPG(); }
    if (r === "nextch") { st.ch++; st.i = 0; return rpgGo(st); }
    if (r === "explore") return rpgStartExplore();
    if (r === "opt") { const o = n.opts[Number(b.dataset.k)]; if (o.flag) st.flags[o.flag] = 1; st.i = rpgNodes(st).findIndex(x => x.label === o.go); sfx("ok"); return rpgGo(st); }
    if (r === "herb" && fight) { if (!ready() || !(st.items[1] > 0)) return; fight.php = Math.min(RPG_HP, fight.php + 1); st.items[1]--; sfx("coin"); toast("薬草でハートが1つ回復した"); const keep = rpgB; patchDoc("rpg", v => { v.items = st.items; }).then(() => { rpgB = keep; renderRPG(); }); return renderRPG(); }
    if (r === "ans" && fight && fight.res == null) {
      const k = Number(b.dataset.k), q = fight.qs[fight.q[0]]; fight.pick = k;
      if (k === q.a) { fight.res = "ok"; fight.hp--; sfx("ok"); } else { fight.res = "ng"; fight.php--; sfx("ng"); if (navigator.vibrate) try { navigator.vibrate(80); } catch (x) {} }
      fight.fx = fight.res; rpgJa = false; return renderRPG();
    }
    if (r === "bnext" && fight) { const q = fight.q.shift(); if (fight.res === "ng") fight.q.push(q); fight.res = null; fight.pick = null; fight.fx = ""; return renderRPG(); }
    if (r === "retry" && fight) { if (fight.ex) { fight.php = RPG_HP; fight.hp = fight.qs.length; fight.q = fight.qs.map((_, k) => k); fight.fx = ""; } else rpgB = null; return renderRPG(); }
    if (r === "win") {
      if (fight && fight.ex) {
        const m = fight.e.mon, today = dayKey(); st.ex = st.ex.day === today ? st.ex : { day: today, wins: 0 }; st.ex.wins++;
        const first = !st.dex[m]; st.dex[m] = (st.dex[m] || 0) + 1;
        let msg = (first ? "図鑑に登録：" : "") + RPG_MON_NAMES[m];
        if (st.ex.wins <= RPG_EX_DAILY) { st.exk += RPG_EX_KOBAN; msg += "　小判＋" + RPG_EX_KOBAN; }
        if (Math.random() < .3) { const ids = Object.keys(RPG_ITEMS), id = ids[Math.floor(Math.random() * ids.length)]; st.items[id] = (st.items[id] || 0) + 1; msg += "　" + RPG_ITEMS[id].ja + "を拾った"; }
        rpgX = null; sfx("coin"); toast(msg);
        if (!ready()) return; return patchDoc("rpg", v => { v.ex = st.ex; v.dex = st.dex; v.exk = st.exk; v.items = st.items; v.story = st.story; });
      }
      const e2 = n.battle; st.won[st.ch + ":" + st.i] = 1; if (e2.drop) st.items[e2.drop] = (st.items[e2.drop] || 0) + 1; if (e2.mon) st.dex[e2.mon] = (st.dex[e2.mon] || 0) + 1;
      st.i++; sfx("coin"); return rpgGo(st);
    }
  });
  box.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.r === "next") { e.preventDefault(); rpgNext(); } });
}
