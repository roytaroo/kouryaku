/* ===== 漢字ラッシュ：落ちてくる入試漢字を、地面に着く前に読む（オリジナルのミニゲーム） =====
   読みモード：ひらがなで打つ。書きモード：漢字ドリル（GQ.kj0〜8）から4択で素早く選ぶ。
   形：[漢字, 読み（別の読みは | で区切る）, 意味] */
const KR_WORDS = [
  ["頻繁", "ひんぱん", "しきりに"], ["遂行", "すいこう", "やりとげる"], ["漸次", "ぜんじ", "だんだん"], ["脆弱", "ぜいじゃく", "もろく弱い"], ["凡例", "はんれい", "使い方の説明"],
  ["相殺", "そうさい", "差し引いてなくす"], ["遵守", "じゅんしゅ", "守る"], ["破綻", "はたん", "うまくいかなくなる"], ["所謂", "いわゆる", "世に言う"], ["寡黙", "かもく", "口数が少ない"],
  ["端緒", "たんしょ|たんちょ", "いとぐち"], ["示唆", "しさ", "それとなく示す"], ["逐一", "ちくいち", "一つ一つ"], ["斡旋", "あっせん", "とりもつ"], ["憧憬", "しょうけい|どうけい", "あこがれ"],
  ["老舗", "しにせ", "古くからの店"], ["漠然", "ばくぜん", "ぼんやり"], ["踏襲", "とうしゅう", "受け継ぐ"], ["枚挙", "まいきょ", "数え上げる"], ["恣意", "しい", "自分勝手"],
  ["畏敬", "いけい", "おそれうやまう"], ["乖離", "かいり", "そむき離れる"], ["敷衍", "ふえん", "おし広げる"], ["語彙", "ごい", "ことばの集まり"], ["措置", "そち", "取り計らい"],
  ["暫定", "ざんてい", "仮に決める"], ["捏造", "ねつぞう", "でっちあげ"], ["杜撰", "ずさん", "いいかげん"], ["稀有", "けう", "めったにない"], ["委嘱", "いしょく", "任せる"],
  ["怠惰", "たいだ", "なまける"], ["拘泥", "こうでい", "こだわる"], ["顕著", "けんちょ", "目立つ"], ["蓋然", "がいぜん", "おそらくそうであること"], ["瑣末", "さまつ", "ささい"],
  ["拮抗", "きっこう", "張り合う"], ["忖度", "そんたく", "おしはかる"], ["齟齬", "そご", "くいちがい"], ["形骸", "けいがい", "中身のない形"], ["羨望", "せんぼう", "うらやむ"],
  ["矜持", "きょうじ", "誇り"], ["吟味", "ぎんみ", "よく調べる"], ["均衡", "きんこう", "つり合い"], ["欠如", "けつじょ", "欠けている"], ["厳か", "おごそか", "重々しい"],
  ["健気", "けなげ", "よく頑張る"], ["潔い", "いさぎよい", "未練がない"], ["著しい", "いちじるしい", "目立つ"], ["夥しい", "おびただしい", "非常に多い"], ["慮る", "おもんぱかる|おもんばかる", "よく考える"],
  ["賄う", "まかなう", "やりくりする"], ["培う", "つちかう", "育てる"], ["携わる", "たずさわる", "関わる"], ["憤る", "いきどおる", "怒る"], ["顧みる", "かえりみる", "ふり返る"],
  ["諮る", "はかる", "意見を聞く"], ["促す", "うながす", "せきたてる"], ["遮る", "さえぎる", "じゃまをする"], ["損なう", "そこなう", "傷つける"], ["委ねる", "ゆだねる", "任せる"],
  ["免れる", "まぬかれる|まぬがれる", "のがれる"], ["蔑む", "さげすむ", "見下す"], ["阻む", "はばむ", "さまたげる"], ["紡ぐ", "つむぐ", "糸をつくる"], ["貪る", "むさぼる", "ほしがる"],
  ["翻す", "ひるがえす", "裏返す"], ["怠る", "おこたる", "なまける"], ["企てる", "くわだてる", "計画する"], ["覆す", "くつがえす", "ひっくり返す"], ["唆す", "そそのかす", "けしかける"],
  ["緩和", "かんわ", "ゆるめる"], ["隠蔽", "いんぺい", "かくす"], ["遍在", "へんざい", "どこにでもある"], ["偏在", "へんざい", "かたよってある"], ["弛緩", "しかん", "ゆるむ"],
  ["暫く", "しばらく", "少しの間"], ["専ら", "もっぱら", "そればかり"], ["況して", "まして", "なおさら"], ["予め", "あらかじめ", "前もって"], ["徐に", "おもむろに", "ゆっくり"],
  ["悉く", "ことごとく", "すべて"], ["屢々", "しばしば", "たびたび"], ["俄か", "にわか", "急に"], ["敢えて", "あえて", "わざわざ"], ["仮令", "たとえ", "もし"],
  ["定款", "ていかん", "会社の決まり"], ["凝固", "ぎょうこ", "固まる"], ["献立", "こんだて", "料理の予定"], ["反古", "ほご", "役に立たないもの"], ["言質", "げんち", "あとで証拠になる言葉"],
  ["遊説", "ゆうぜい", "演説して回る"], ["流布", "るふ", "広まる"], ["建立", "こんりゅう", "寺などを建てる"], ["境内", "けいだい", "寺社の敷地"], ["功徳", "くどく", "よい行い"],
  ["会釈", "えしゃく", "軽いおじぎ"], ["出納", "すいとう", "お金の出し入れ"], ["発端", "ほったん", "始まり"], ["相克", "そうこく", "対立して争う"], ["生粋", "きっすい", "まじりけがない"],
  ["市井", "しせい", "まち・世間"], ["疾病", "しっぺい", "病気"], ["由緒", "ゆいしょ", "いわれ"], ["造詣", "ぞうけい", "深い知識"], ["真摯", "しんし", "まじめ"],
  ["軋轢", "あつれき", "争い・不和"], ["逡巡", "しゅんじゅん", "ためらう"], ["躊躇", "ちゅうちょ", "ためらう"], ["傀儡", "かいらい", "あやつり人形"], ["嗜好", "しこう", "好み"],
  ["拘束", "こうそく", "自由をうばう"], ["覇権", "はけん", "支配する力"], ["抑揚", "よくよう", "声の上げ下げ"], ["払拭", "ふっしょく", "ぬぐい去る"], ["喚起", "かんき", "呼び起こす"],
  ["凌駕", "りょうが", "上回る"], ["俯瞰", "ふかん", "高い所から見下ろす"], ["揶揄", "やゆ", "からかう"], ["鑑みる", "かんがみる", "照らし合わせて考える"], ["否めない", "いなめない", "否定できない"]
];
const KR_BEST = "kr-rush-best";
let KR = null;
function krBest(mode) { try { return Number(JSON.parse(localStorage.getItem(KR_BEST) || "{}")[mode] || 0); } catch (e) { return 0; } }
function krSaveBest(mode, v) { try { const o = JSON.parse(localStorage.getItem(KR_BEST) || "{}"); if (v > (o[mode] || 0)) { o[mode] = v; localStorage.setItem(KR_BEST, JSON.stringify(o)); return true; } } catch (e) {} return false; }
const krNorm = s => String(s).trim().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s/g, "");
function krPick() {
  if (KR.mode === "read") { const w = KR_WORDS[Math.floor(Math.random() * KR_WORDS.length)]; return { q: w[0], ans: w[1].split("|"), mean: w[2] }; }
  const units = Object.keys(GQ).filter(k => /^kj[0-8]$/.test(k)), u = GQ[units[Math.floor(Math.random() * units.length)]], q = u[Math.floor(Math.random() * u.length)];
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  return { q: q[0], c: order.map(i => q[1][i]), a: order.indexOf(q[2]), mean: q[3], right: q[1][q[2]] };
}
function krStart(mode) {
  KR = { mode, score: 0, combo: 0, maxCombo: 0, life: 3, n: 0, ok: 0, over: false, miss: [] };
  krNext(); renderKR(); sfx("ok");
  if (mode === "read") { const i = $("krIn"); if (i) i.focus(); }
}
function krDur() { return Math.max(3200, (KR.mode === "read" ? 9000 : 6500) - KR.ok * 180); } // 正解するほど速く落ちる
function krNext() { KR.cur = krPick(); KR.t0 = performance.now(); KR.dur = krDur(); KR.n++; KR.fb = null; }
function krCount() { if (backend && allLoaded() && tasksOf(dayKey()).some(t => t.id === "kanji")) patchDay(dayKey(), d => { d.tasks = d.tasks || {}; d.tasks.kanji = (d.tasks.kanji || 0) + 1; }).catch(() => {}); }
function krHit() {
  krCount();
  KR.ok++; KR.combo++; KR.maxCombo = Math.max(KR.maxCombo, KR.combo);
  const left = Math.max(0, 1 - (performance.now() - KR.t0) / KR.dur);
  KR.score += 100 + Math.round(left * 100) + Math.min(KR.combo, 20) * 10;
  KR.fb = { ok: true, t: performance.now() }; sfx(KR.combo % 5 === 0 ? "coin" : "ok");
  krNext(); renderKR();
}
function krMissed(why) {
  krCount();
  KR.combo = 0; KR.life--; KR.fb = { ok: false, t: performance.now(), q: KR.cur.q, ans: KR.mode === "read" ? KR.cur.ans[0] : KR.cur.right, mean: KR.cur.mean };
  KR.miss.push(KR.fb); sfx("ng");
  if (KR.life <= 0) { KR.over = true; KR.newBest = krSaveBest(KR.mode, KR.score); renderKR(); return; }
  krNext(); renderKR();
}
function krInput(v) {
  if (!KR || KR.over || KR.mode !== "read") return;
  const t = krNorm(v); if (!t) return;
  if (KR.cur.ans.some(a => krNorm(a) === t)) { const i = $("krIn"); i.value = ""; krHit(); i.focus({ preventScroll: true }); }
}
function krLoop() {
  if (!KR || KR.over || currentView !== "learn" || learnTab !== "kanji") return;
  const p = (performance.now() - KR.t0) / KR.dur, el = $("krDrop");
  if (el) el.style.transform = `translateY(${Math.min(1, p) * 190}px)`;
  const bar = $("krTime"); if (bar) bar.style.width = Math.max(0, 100 - p * 100) + "%";
  if (p >= 1) krMissed("time");
}
setInterval(krLoop, 50);
function renderKR() {
  const box = $("rushBox"); if (!box) return;
  if (!KR) {
    box.dataset.mode = "";
    box.innerHTML = `<div class="head"><div><div class="eyebrow">ミニゲーム</div><h2>漢字ラッシュ</h2></div></div>
      <p class="note" style="margin:0">落ちてくる入試漢字を、地面に着く前に答える。正解が続くほど速くなる。ライフは3つ。</p>
      <div class="kr-modes"><button type="button" class="kr-mode" data-kr="read"><b>読み</b><small>ひらがなで打つ・${KR_WORDS.length}語</small><span>ベスト ${krBest("read")}</span></button>
      <button type="button" class="kr-mode" data-kr="write"><b>書き</b><small>4つから選ぶ・漢字ドリルから</small><span>ベスト ${krBest("write")}</span></button></div>`;
    return;
  }
  if (KR.over) {
    box.dataset.mode = "";
    box.innerHTML = `<div class="kr-over"><div class="eyebrow">ゲームオーバー</div><b class="num">${KR.score.toLocaleString()}</b><span>${KR.newBest ? "ベスト更新！" : "ベスト " + krBest(KR.mode).toLocaleString()}</span>
      <div class="kr-stats"><span>正解 ${KR.ok}</span><span>最大コンボ ${KR.maxCombo}</span></div>
      ${KR.miss.length ? `<ul class="kr-miss">${KR.miss.map(m => `<li><b>${esc(m.q.replace(/【|】/g, ""))}</b><span>${esc(m.ans)}</span><small>${esc(m.mean)}</small></li>`).join("")}</ul>` : ""}
      <div class="row"><button type="button" class="big-btn" data-kr="${KR.mode}" style="flex:1">もう一回</button><button type="button" class="btn" data-kr="menu">もどる</button></div></div>`;
    return;
  }
  // ゲーム中は入力欄を作り直さない（キーボードが閉じないように）。上の部分だけ書きかえる
  if (!box.querySelector(".kr-play") || box.dataset.mode !== KR.mode) {
    box.dataset.mode = KR.mode;
    box.innerHTML = `<div class="kr-play"><div class="kr-hud" id="krHud"></div><div class="bar-p kr-tb"><i id="krTime" style="width:100%"></i></div>
      <div class="kr-field" id="krField"></div>
      ${KR.mode === "read" ? `<input class="field kr-in" id="krIn" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="よみをひらがなで" enterkeyhint="done">` : `<div class="kr-choices" id="krCh"></div>`}
      <button type="button" class="linkbtn" data-kr="quit">やめる</button></div>`;
    if (KR.mode === "read") { const i = $("krIn"); i.addEventListener("input", () => krInput(i.value)); i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); krInput(i.value); } }); }
  }
  const c = KR.cur, fb = KR.fb;
  $("krHud").innerHTML = `<span class="kr-life">${"●".repeat(Math.max(0, KR.life))}<i>${"●".repeat(3 - Math.max(0, KR.life))}</i></span><b class="num">${KR.score.toLocaleString()}</b><span class="kr-combo${KR.combo >= 5 ? " hot" : ""}">${KR.combo ? KR.combo + " コンボ" : ""}</span>`;
  $("krField").innerHTML = `<div class="kr-drop" id="krDrop"><span>${KR.mode === "read" ? esc(c.q) : esc(c.q).replace(/【(.*?)】/, "<em>$1</em>")}</span></div><div class="kr-ground"></div>
    ${fb && !fb.ok ? `<div class="kr-fb ng">${esc(fb.q.replace(/【|】/g, ""))} → ${esc(fb.ans)}</div>` : fb ? `<div class="kr-fb ok">○</div>` : ""}`;
  if (KR.mode === "write") $("krCh").innerHTML = c.c.map((x, i) => `<button type="button" data-krc="${i}">${esc(x)}</button>`).join("");
}
function bindKR() {
  $("rushBox").addEventListener("click", e => {
    const b = e.target.closest("[data-kr],[data-krc]"); if (!b) return;
    if (b.dataset.krc != null) { if (!KR || KR.over) return; if (Number(b.dataset.krc) === KR.cur.a) krHit(); else krMissed("wrong"); return; }
    const k = b.dataset.kr;
    if (k === "menu" || k === "quit") { if (k === "quit" && KR && !KR.over) krSaveBest(KR.mode, KR.score); KR = null; renderKR(); return; }
    krStart(k);
  });
}
