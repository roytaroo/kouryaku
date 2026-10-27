/* ===== お化け：図鑑・ガチャ・着せ替え・券 ===== */
const GACHA_COST = 60, DUP_BACK = 20, HOURS_PER_GIFT = 20;
const TICKETS = [
  { kind: "game", min: 30, name: "ゲーム30分券" }, { kind: "game", min: 60, name: "ゲーム1時間券" },
  { kind: "video", min: 30, name: "動画30分券" }, { kind: "video", min: 60, name: "動画1時間券" }
];
const REFRESH_FREE = 120;
let yokaiTab = "dex";
/** キャラの絵。まだ絵がない子は「？」の札 */
const NO_ART = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="66" font-size="54" text-anchor="middle" fill="#9a9db5">？</text></svg>');
const thumb = id => (YK[id] && YK[id].img) || NO_ART;
const owned = id => !!(S.game.owned || {})[id];
/** イラストのお化けには、着けている小物を小さな札で添える */
const gearIcons = new Map();
function gearIcon(oid) {
  if (!gearIcons.has(oid)) { const t = new Vox(); try { OK[oid].draw(t, [0, 0, 0]); } catch (e) {} gearIcons.set(oid, t.v.size ? Stage.snapshot(t, 96, 96, { zoom: 3 }) : ""); }
  return gearIcons.get(oid);
}
function gearHtml(eq) { return Object.values(eq || {}).filter(o => OK[o]).map(o => `<span class="gear"><img alt="" src="${gearIcon(o)}"><small>${esc(OK[o].name)}</small></span>`).join(""); }

/* ---- 図鑑 ---- */
let thumbQ = [], thumbT = 0;
function renderDex() {
  if (!YOKAI.length) { $("dexCount").textContent = "準備中"; $("dexBar").style.width = "0%"; $("dexGrid").innerHTML = '<p class="note" style="grid-column:1/-1">新しいキャラを準備中。そろったらここに並ぶ。それまでの勉強時間や文法の合格は、ちゃんと仲間になる分として数えておく。</p>'; $("dexGrid").dataset.v = ""; return; }
  const own = S.game.owned || {}, n = YOKAI.filter(y => own[y.id]).length;
  $("dexCount").textContent = n + " / " + YOKAI.length + " 体";
  $("dexBar").style.width = (100 * n / YOKAI.length) + "%";
  const html = YOKAI.map(y => {
    const has = !!own[y.id];
    return `<button type="button" data-y="${y.id}" data-r="${y.rarity}" class="${has ? "" : "lock"}">${y.id === S.game.partner ? '<span class="cur">相棒</span>' : ""}<img alt="" loading="lazy" src="${thumb(y.id)}"><span>${has ? esc(y.name) : "？？？"}</span></button>`;
  }).join("");
  const g = $("dexGrid"); if (g.dataset.v !== html) { g.innerHTML = html; g.dataset.v = html; }
}
function openYokai(id) {
  const y = YK[id], has = owned(id), line = YOKAI.filter(z => z.line === y.line).sort((a, b) => a.stage - b.stage);
  const evo = line.length > 1 ? `<div class="evo">${line.map((z, i) => (i ? '<span class="arrow">→</span>' : "") + `<img alt="${owned(z.id) ? esc(z.name) : "？？？"}" src="${thumb(z.id)}" style="${owned(z.id) ? "" : "filter:brightness(0) opacity(.2)"}">`).join("")}</div>` : "";
  const o = (S.game.owned || {})[id] || {};
  const voiceName = { kid: "元気な子ども", elder: "古風な長老", samurai: "侍ことば", cool: "クール", lady: "お嬢さま", yankee: "ヤンキー" }[y.voice] || y.voice;
  let h = `<div class="head"><div><div class="eyebrow">${esc(y.kana)}</div><h2>${has ? esc(y.name) : "？？？"}</h2></div><span class="rar ${RARITY[y.rarity].cls}">${RARITY[y.rarity].name}</span></div>
    <div class="aura ${has ? RARITY[y.rarity].cls : ""}"><img class="big" alt="" src="${thumb(id)}" style="${has ? "" : "filter:brightness(0) opacity(.2)"}"></div>
    <p style="margin:0">${has ? esc(y.desc) : "まだ出会っていない。勉強時間20時間ごと・文法単元の合格・ガチャで仲間になる。"}</p>
    ${has ? `<div class="note">しゃべり方：${voiceName}${line.length > 1 ? "　・" + (y.stage + 1) + "段階目 / " + line.length : "　・進化しない"}${o.at ? "　・" + labelDay(dayKey(o.at)) + "に仲間入り" : ""}</div>` : ""}${evo}`;
  if (has && id !== S.game.partner) h += `<button class="big-btn" type="button" data-partner="${id}">相棒にする</button>`;
  else if (id === S.game.partner) h += `<div class="note" style="text-align:center">いまの相棒。相棒にしている間の勉強時間で進化する。</div>`;
  h += `<button class="btn ghost" type="button" data-close="1">閉じる</button>`;
  openSheet(h);
}
function openSheet(html) { const s = $("sheet"); $("sheetIn").innerHTML = html; s.hidden = false; }
function closeSheet() { $("sheet").hidden = true; $("sheetIn").innerHTML = ""; }
function setPartner(id) {
  if (!ready() || !owned(id)) return;
  const exp = partnerExp(), prev = S.game.partner, tot = econ().totalMin;
  patchDoc("game", g => { if (prev && g.owned[prev]) g.owned[prev] = { ...g.owned[prev], exp }; g.partner = id; g.partnerFrom = tot; });
  buddyKey = ""; $("bubble").textContent = ""; sfx("ok"); toast(YK[id].name + "が相棒になった。"); closeSheet();
}

/* ---- 仲間入り：節目（20時間ごと・文法合格）と進化 ---- */
let unlocking = false;
function pickNew(pref) {
  const own = S.game.owned || {};
  let pool = YOKAI.filter(y => !own[y.id] && y.stage === 0 && pref.includes(y.rarity));
  if (!pool.length) pool = YOKAI.filter(y => !own[y.id] && y.stage === 0);
  if (!pool.length) pool = YOKAI.filter(y => !own[y.id]);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
function checkUnlocks() {
  if (unlocking || !backend || !allLoaded() || !YOKAI.length || S.game.roster !== ROSTER_VER) return;
  const g = S.game, claims = new Set(g.claims || []), want = [];
  const h = Math.floor(econ().totalMin / 60 / HOURS_PER_GIFT);
  for (let i = 1; i <= h; i++) if (!claims.has("h" + i * HOURS_PER_GIFT)) want.push({ c: "h" + i * HOURS_PER_GIFT, why: "累計" + i * HOURS_PER_GIFT + "時間" });
  for (const [id, u] of Object.entries((S.grammar.units || {}))) if (u.passed && !claims.has("g:" + id)) want.push({ c: "g:" + id, why: "文法「" + (GRAMMAR[id.slice(0, 2)] || { units: [] }).units[Number(id.slice(2))] + "」合格" });
  const y = YK[g.partner], nf = y && nextForm(y.id), evolve = nf && !owned(nf.id) && partnerExp() >= EVOLVE_EXP[y.stage];
  if (!want.length && !evolve) return;
  unlocking = true;
  const got = [];
  const tot = econ().totalMin, exp = partnerExp();
  patchDoc("game", v => {
    v.owned = v.owned || {}; v.claims = v.claims || [];
    for (const w of want) {
      const z = pickNew(w.c.startsWith("g:") ? [1, 2] : [1, 2, 3]); v.claims.push(w.c);
      if (z) { v.owned[z.id] = { at: Date.now(), exp: 0, from: w.c }; S.game.owned = v.owned; got.push({ y: z, why: w.why }); }
    }
    if (evolve) { v.owned[y.id] = { ...(v.owned[y.id] || {}), exp }; v.owned[nf.id] = { at: Date.now(), exp: 0, from: "evolve" }; v.partner = nf.id; v.partnerFrom = tot; got.unshift({ y: nf, why: y.name + "が進化した！", evo: true }); }
  }).finally(() => { unlocking = false; });
  if (got.length) { buddyKey = ""; reveal(got); }
}
function reveal(list) {
  sfx("gacha"); confetti();
  const h = `<div class="gacha"><div class="eyebrow">${list.length > 1 ? list.length + "体が仲間になった" : list[0].evo ? "進化" : "新しい仲間"}</div>
    ${list.map(x => `<div class="box ${RARITY[x.y.rarity].cls}"><img alt="" src="${thumb(x.y.id)}"></div><h2>${esc(x.y.name)}</h2><div class="note">${esc(x.why)}　<span class="rar ${RARITY[x.y.rarity].cls}">${RARITY[x.y.rarity].name}</span></div>`).join("")}
    <button class="big-btn" type="button" data-close="1">やったね</button></div>`;
  openSheet(h);
  buddyKey = "";
}

/* ---- ガチャ ---- */
let rolling = false;
function rollGacha() {
  if (!ready() || rolling) return;
  if (!YOKAI.length) { toast("キャラを準備中。そろったら回せる。"); return; }
  if (econ().koban < GACHA_COST) { toast("小判が足りない。あと" + (GACHA_COST - econ().koban) + "枚。勉強して稼げ。"); sfx("ng"); return; }
  const r = Math.random(); let rar = r < 0.05 ? 3 : r < 0.30 ? 2 : 1, pool = YOKAI.filter(y => y.rarity === rar);
  while (!pool.length && rar > 1) { rar--; pool = YOKAI.filter(y => y.rarity === rar); }
  if (!pool.length) pool = YOKAI;
  const y = pool[Math.floor(Math.random() * pool.length)]; rar = y.rarity;
  const dup = owned(y.id);
  rolling = true;
  patchDoc("game", v => {
    v.spend = [...(v.spend || []), { kind: "gacha", id: y.id, cost: dup ? GACHA_COST - DUP_BACK : GACHA_COST, at: Date.now() }];
    v.gacha = (v.gacha || 0) + 1;
    if (!dup) { v.owned = v.owned || {}; v.owned[y.id] = { at: Date.now(), exp: 0, from: "gacha" }; }
  });
  const box = $("gachaBox"); box.innerHTML = '<span class="lan">？</span>'; box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake"); sfx("tap");
  setTimeout(() => {
    rolling = false; box.classList.remove("shake"); box.classList.remove("r2", "r3"); if (rar > 1) box.classList.add("r" + rar); box.innerHTML = `<img alt="${esc(y.name)}" src="${thumb(y.id)}">`;
    sfx(rar === 3 ? "done" : "gacha"); if (rar >= 2) confetti();
    $("gachaRes").innerHTML = `<b style="font-family:var(--display);font-weight:400;font-size:20px">${esc(y.name)}</b> <span class="rar ${RARITY[rar].cls}">${RARITY[rar].name}</span><div class="note">${dup ? "もう持っていた。小判" + DUP_BACK + "枚もどってきた。" : esc(y.desc)}</div>`;
    renderYokai();
  }, 1300);
}

/* ---- 着せ替え ---- */
function renderOutfits() {
  const own = new Set((S.game.outfits || {}).owned || []), eq = (S.game.outfits || {}).equipped || {}, k = econ().koban;
  $("outfitPrev").src = thumb(S.game.partner);
  $("outfitGear").innerHTML = gearHtml(eq);
  $("outfitName").textContent = YK[S.game.partner] ? YK[S.game.partner].name + "の着せ替え" : "着せ替え（相棒が来たら着せられる）";
  const html = OUTFITS.map(o => {
    const has = own.has(o.id), on = eq[o.slot] === o.id;
    return `<div class="outfit"><b>${esc(o.name)}</b><span class="note">${o.slot === "head" ? "頭" : "手"}${has ? "・持っている" : "・小判 " + o.price}</span>
      ${has ? `<button class="btn ${on ? "ink" : ""} sm" type="button" data-wear="${o.id}">${on ? "外す" : "着ける"}</button>` : `<button class="btn pri sm" type="button" data-buy="${o.id}" ${k < o.price ? "disabled" : ""}>買う</button>`}</div>`;
  }).join("");
  const g = $("outfitGrid"); if (g.dataset.v !== html) { g.innerHTML = html; g.dataset.v = html; }
}
function buyOutfit(id) {
  const o = OK[id]; if (!ready() || !o) return;
  if (econ().koban < o.price) { toast("小判が足りない。"); return; }
  patchDoc("game", v => { v.outfits = v.outfits || { owned: [], equipped: {} }; v.outfits.owned = [...new Set([...(v.outfits.owned || []), id])]; v.outfits.equipped = { ...(v.outfits.equipped || {}), [o.slot]: id }; v.spend = [...(v.spend || []), { kind: "outfit", id, cost: o.price, at: Date.now() }]; });
  buddyKey = ""; sfx("coin"); toast(o.name + "を買った。");
}
function wearOutfit(id) {
  const o = OK[id]; if (!ready() || !o) return;
  patchDoc("game", v => { v.outfits = v.outfits || { owned: [], equipped: {} }; const e = { ...(v.outfits.equipped || {}) }; if (e[o.slot] === id) delete e[o.slot]; else e[o.slot] = id; v.outfits.equipped = e; });
  buddyKey = ""; sfx("tap");
}

/* ---- 券 ---- */
/** リフレッシュの無料枠：休みの曜日の前日19時から、その日の終わりまで */
function refreshWindow() {
  const k = dayKey(), rd = Number(S.settings.refreshDow ?? 0), h = new Date().getHours();
  if (modeOf(k) === "refresh") return k;
  if (dow(k) === (rd + 6) % 7 && h >= 19) return addDays(k, 1);
  return null;
}
function freeLeft(wk) { return REFRESH_FREE - (S.tickets.history || []).filter(x => x.free && x.wk === wk).reduce((a, x) => a + x.min, 0); }
function useTicket(kind, min, free) {
  if (!ready()) return;
  const wk = refreshWindow();
  if (free) { if (!wk) return; min = Math.min(min, freeLeft(wk)); if (min <= 0) { toast("今週の無料枠はもう使い切った。"); return; } }
  else if (econ().ticket < min) { toast("券ポイントが足りない。あと" + (min - econ().ticket) + "。1時間勉強で10ポイント。"); sfx("ng"); return; }
  const now = Date.now(), a = S.tickets.active;
  patchDoc("tickets", v => {
    v.history = [...(v.history || []), { kind, min, cost: free ? 0 : min, free: !!free, wk: free ? wk : null, at: now }];
    v.active = a && a.endsAt > now && a.kind === kind ? { ...a, endsAt: a.endsAt + min * 60000, min: a.min + min } : { kind, min, startedAt: now, endsAt: now + min * 60000 };
  });
  sfx("coin"); toast((kind === "game" ? "ゲーム" : "動画") + min + "分、スタート。時間が来たら鳴らす。");
}
function renderActiveTicket(id) {
  const el = $(id); if (!el) return;
  const a = S.tickets.active;
  if (!a || !a.endsAt) { el.hidden = true; return; }
  const left = a.endsAt - Date.now();
  el.hidden = false;
  if (left <= 0) { el.innerHTML = `<div class="eyebrow" style="color:#c9c7f0">${a.kind === "game" ? "ゲーム" : "動画"}券</div><div class="clock">時間切れ</div><div class="row"><span>終わりの時間。勉強に戻ろう。</span><button class="btn pri sm" type="button" data-endtix="1">戻る</button></div>`; return; }
  const s = Math.ceil(left / 1000);
  el.innerHTML = `<div class="eyebrow" style="color:#c9c7f0">${a.kind === "game" ? "ゲーム" : "動画"}券 使用中</div><div class="clock">${Math.floor(s / 3600) ? Math.floor(s / 3600) + ":" : ""}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}</div><div class="row"><span class="note" style="color:#c9c7f0">${new Date(a.endsAt).getHours()}:${pad(new Date(a.endsAt).getMinutes())} まで</span><button class="btn pri sm" type="button" data-endtix="1" style="margin-left:auto">早めに終わる</button></div>`;
}
let tixRang = 0;
function ticketTick() {
  const a = S.tickets.active; if (!a || !a.endsAt) return;
  if (Date.now() >= a.endsAt && tixRang !== a.endsAt) { tixRang = a.endsAt; sfx("bell"); toast("券の時間が終わった。勉強に戻れ。"); }
}
function endTicket() { if (ready()) patchDoc("tickets", v => { v.active = null; }); }
function renderTix() {
  const e = econ(), wk = refreshWindow();
  $("tixPts").textContent = e.ticket;
  $("tixGrid").innerHTML = TICKETS.map(t => `<button type="button" data-tk="${t.kind}" data-min="${t.min}" ${e.ticket < t.min ? "disabled style='opacity:.5'" : ""}><b>${t.name}</b><span>${t.min} ポイント</span></button>`).join("");
  const fl = wk ? freeLeft(wk) : 0;
  $("tixFree").hidden = !wk;
  if (wk) $("tixFreeTxt").textContent = "リフレッシュの無料枠 残り " + fl + "分（土曜19時〜日曜）";
  $("tixFreeBtns").innerHTML = wk && fl > 0 ? `<button class="btn pri" type="button" data-free="game">ゲームに使う</button><button class="btn" type="button" data-free="video">動画に使う</button>` : "";
  renderActiveTicket("tixActive");
  const hist = [...(S.tickets.history || [])].reverse().slice(0, 12);
  $("tixHist").innerHTML = hist.length ? hist.map(x => `<li><span>${labelDay(dayKey(x.at))} ${new Date(x.at).getHours()}:${pad(new Date(x.at).getMinutes())}　${x.kind === "game" ? "ゲーム" : "動画"} ${x.min}分</span><span class="num dot">${x.free ? "無料枠" : "−" + x.cost}</span></li>`).join("") : '<li><span class="note">まだ使っていない</span></li>';
}

function renderYokai() {
  document.querySelectorAll("#yokaiSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === yokaiTab)));
  for (const t of ["dex", "gacha", "outfit", "tix"]) $("yt-" + t).hidden = t !== yokaiTab;
  $("yKoban").textContent = econ().koban; $("yGacha").textContent = GACHA_COST;
  $("gachaBtn").disabled = !YOKAI.length || econ().koban < GACHA_COST || rolling;
  if (!YOKAI.length) $("gachaRes").innerHTML = '<div class="note">キャラを準備中。そろったら回せる。</div>';
  if (yokaiTab === "dex") renderDex();
  if (yokaiTab === "outfit") renderOutfits();
  if (yokaiTab === "tix") renderTix();
}
function bindYokai() {
  $("yokaiSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; yokaiTab = b.dataset.t; renderYokai(); };
  $("dexGrid").onclick = e => { const b = e.target.closest("button[data-y]"); if (b) openYokai(b.dataset.y); };
  $("sheet").onclick = e => {
    if (e.target === $("sheet") || e.target.closest("[data-close]")) return closeSheet();
    const b = e.target.closest("[data-partner]"); if (b) setPartner(b.dataset.partner);
  };
  $("gachaBtn").onclick = rollGacha;
  $("outfitGrid").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.buy) buyOutfit(b.dataset.buy); else if (b.dataset.wear) wearOutfit(b.dataset.wear); };
  $("tixGrid").onclick = e => { const b = e.target.closest("button[data-tk]"); if (b) useTicket(b.dataset.tk, Number(b.dataset.min), false); };
  $("tixFreeBtns").onclick = e => { const b = e.target.closest("button[data-free]"); if (b) useTicket(b.dataset.free, REFRESH_FREE, true); };
  document.addEventListener("click", e => { if (e.target.closest("[data-endtix]")) endTicket(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });
}
