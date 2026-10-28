/* ===== 百鬼の道（勉強時間で進むバトルパス）と、ポモドーロでの育成・進化 ===== */
const LV_MIN = 25;                        // ポモドーロ1セット（25分）でレベル1つ
const EVOLVE_LV = { 3: 8, 4: 12, 5: 16 }; // 進化後の珍しさごとの必要レベル（松・伝説・幻）
const PASS_STEP = 10;                     // 10時間ごとに1段
const lvOf = exp => Math.min(99, Math.floor((exp || 0) / LV_MIN) + 1);
const expOf = id => (((S.game.owned || {})[id] || {}).exp || 0);
const evolveLv = id => { const nf = nextForm(id); return nf ? EVOLVE_LV[nf.rarity] || 10 : null; };
const canEvolve = id => { const nf = nextForm(id); return !!nf && !owned(nf.id) && lvOf(expOf(id)) >= evolveLv(id); };

/** 報酬の並び。yokai は進化前の子だけ（進化形は育てないと手に入らない） */
const PASS = [
  { k: "koban", n: 100 }, { k: "ticket", n: 30 }, { k: "yokai", id: "kogitsune" }, { k: "outfit", id: "hachimaki" }, { k: "roll", n: 1 },
  { k: "koban", n: 150 }, { k: "ticket", n: 60 }, { k: "yokai", id: "mizuchi" }, { k: "outfit", id: "tango" }, { k: "roll", n: 2 },
  { k: "koban", n: 200 }, { k: "ticket", n: 60 }, { k: "yokai", id: "tabineko" }, { k: "outfit", id: "gakubo" }, { k: "roll", n: 1 },
  { k: "koban", n: 250 }, { k: "ticket", n: 90 }, { k: "yokai", id: "kooni" }, { k: "outfit", id: "omamori" }, { k: "roll", n: 2 },
  { k: "koban", n: 300 }, { k: "ticket", n: 90 }, { k: "outfit", id: "kitsunemen" }, { k: "yokai", id: "karasu" }, { k: "roll", n: 2 },
  { k: "koban", n: 400 }, { k: "ticket", n: 120 }, { k: "outfit", id: "crown" }, { k: "roll", n: 3 }, { k: "yokai", id: "gasha" }
];
/** 30段のあとは、20時間ごとに小判300 */
const tierHours = t => t <= PASS.length ? t * PASS_STEP : PASS.length * PASS_STEP + (t - PASS.length) * 20;
const rewardOf = t => t <= PASS.length ? PASS[t - 1] : { k: "koban", n: 300 };
function passTier() { const h = econ().totalMin / 60; let t = 0; while (h >= tierHours(t + 1) && t < 999) t++; return t; }
const claimedTier = t => (S.game.claims || []).includes("bp:" + t);
function unclaimed() { const out = []; for (let t = 1; t <= passTier(); t++) if (!claimedTier(t)) out.push(t); return out; }

function rewardLabel(r) {
  if (r.k === "koban") return "小判 " + r.n + "枚";
  if (r.k === "ticket") return "券ポイント " + r.n;
  if (r.k === "roll") return "ガチャ無料券 ×" + r.n;
  if (r.k === "outfit") return (OK[r.id] || {}).name || "小物";
  if (r.k === "yokai") return (YK[r.id] || {}).name || "仲間";
  return "";
}
function rewardIcon(r, big) {
  const cls = "ricon" + (big ? " big" : "");
  if (r.k === "koban") return `<span class="${cls} koban-i"><i></i></span>`;
  if (r.k === "ticket") return `<span class="${cls} ticket-i"><i></i></span>`;
  if (r.k === "roll") return `<span class="${cls} roll-i">引</span>`;
  if (r.k === "outfit") return `<span class="${cls} outfit-i"><img alt="" src="${gearIcon(r.id)}"></span>`;
  if (r.k === "yokai") { const y = YK[r.id]; return `<span class="${cls} yokai-i ${y ? RARITY[y.rarity].cls : ""}"><img alt="" src="${thumb(r.id)}"></span>`; }
  return "";
}

/** 受け取る（まとめて） */
let claiming = false;
function claimTiers(list) {
  if (!ready() || claiming || !list.length) return;
  claiming = true;
  const now = Date.now(), got = [];
  let tix = 0;
  patchDoc("game", v => {
    v.claims = v.claims || []; v.owned = v.owned || {}; v.spend = v.spend || []; v.outfits = v.outfits || { owned: [], equipped: {} };
    for (const t of list) {
      if (v.claims.includes("bp:" + t)) continue;
      let r = rewardOf(t);
      if (r.k === "yokai" && v.owned[r.id]) r = { k: "koban", n: 200, was: r.id }; // もう持っていたら小判に
      if (r.k === "outfit" && (v.outfits.owned || []).includes(r.id)) r = { k: "koban", n: 100 };
      if (r.k === "koban") v.spend.push({ kind: "pass", tier: t, cost: -r.n, at: now });
      if (r.k === "ticket") tix += r.n;
      if (r.k === "roll") v.freeRolls = (v.freeRolls || 0) + r.n;
      if (r.k === "outfit") v.outfits.owned = [...new Set([...(v.outfits.owned || []), r.id])];
      if (r.k === "yokai") v.owned[r.id] = { at: now, exp: 0, from: "pass" };
      v.claims.push("bp:" + t); got.push({ t, r });
    }
  }).then(() => tix ? patchDoc("tickets", v => { v.history = [...(v.history || []), { kind: "bonus", min: 0, cost: -tix, at: now }]; }) : null)
    .finally(() => { claiming = false; });
  if (!got.length) return;
  sfx(got.some(g => g.r.k === "yokai") ? "gacha" : "coin"); confetti();
  const main = got.find(g => g.r.k === "yokai");
  openSheet(`<div class="gacha"><div class="eyebrow">百鬼の道　${got.length}段ぶんの報酬</div>
    ${main ? `<div class="box ${RARITY[YK[main.r.id].rarity].cls}"><img alt="" src="${thumb(main.r.id)}"></div><h2>${esc(YK[main.r.id].name)}が仲間になった</h2>` : ""}
    <div class="rgot">${got.map(g => `<div>${rewardIcon(g.r)}<span><small>${g.t}段</small>${esc(rewardLabel(g.r))}${g.r.was ? "（持っていたので）" : ""}</span></div>`).join("")}</div>
    <button class="big-btn" type="button" data-close="1">受け取った</button></div>`);
}

/** 進化：相棒が必要レベルに届いたら、ボタンで進化させる */
function evolve(id) {
  if (!ready() || !canEvolve(id)) return;
  const y = YK[id], nf = nextForm(id), now = Date.now();
  patchDoc("game", v => { v.owned = v.owned || {}; v.owned[nf.id] = { at: now, exp: 0, from: "evolve" }; v.partner = nf.id; });
  sfx("done"); confetti(); setTimeout(confetti, 600);
  openSheet(`<div class="gacha evolve"><div class="eyebrow">進化</div>
    <div class="evo-anim"><img class="from" alt="" src="${thumb(id)}"><img class="to" alt="" src="${thumb(nf.id)}"></div>
    <h2>${esc(y.name)} は ${esc(nf.name)} に進化した！</h2><div class="note"><span class="rar ${RARITY[nf.rarity].cls}">${RARITY[nf.rarity].name}</span>　${esc(nf.desc)}</div>
    <button class="big-btn" type="button" data-close="1">よし</button></div>`);
  buddyKey = "";
}

/* ---- 画面 ---- */
function renderPass() {
  const t = passTier(), h = econ().totalMin / 60, nextH = tierHours(t + 1), prevH = tierHours(t), un = unclaimed();
  $("passTier").textContent = t;
  $("passNext").textContent = "次の段まで " + Math.max(0, nextH - h).toFixed(1) + "時間（累計 " + h.toFixed(1) + "h）";
  $("passBar").style.width = clamp(100 * (h - prevH) / (nextH - prevH), 0, 100) + "%";
  $("passClaimAll").hidden = !un.length; $("passClaimAll").textContent = "まとめて受け取る（" + un.length + "）";
  const last = Math.max(PASS.length, t + 3);
  let html = "";
  for (let i = 1; i <= last; i++) {
    const r = rewardOf(i), reached = i <= t, got = claimedTier(i), cur = i === t + 1;
    const st = got ? "got" : reached ? "ready" : cur ? "next" : "lock";
    html += `<li class="tier ${st}${r.k === "yokai" ? " big" : ""}" data-tier="${i}">
      <span class="node">${got ? "✓" : i}</span>
      <div class="rcard">${rewardIcon(r, r.k === "yokai")}<div><small>${tierHours(i)}時間</small><b>${esc(rewardLabel(r))}</b>${cur ? `<div class="bar-p"><i style="width:${clamp(100 * (h - prevH) / (nextH - prevH), 0, 100)}%"></i></div>` : ""}</div>
      ${st === "ready" ? `<button class="btn pri sm" type="button" data-claim="${i}">受け取る</button>` : st === "got" ? `<span class="note">受取済</span>` : ""}</div></li>`;
    if (cur) html += `<li class="here"><span>いまここ</span></li>`;
  }
  const el = $("passTrack"); if (el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; }
  // 道の灯り：いまの段まで光らせる
  requestAnimationFrame(() => { const at = el.querySelector(".here") || el.querySelector(".tier.got:last-of-type"); el.style.setProperty("--lit", (at ? at.offsetTop + 12 : 0) + "px"); });
}
function scrollPassToNow() { const el = document.querySelector("#passTrack .here") || document.querySelector("#passTrack .ready"); if (el) el.scrollIntoView({ block: "center" }); }
/** ホームの小さな道しるべ */
function renderPassMini() {
  const t = passTier(), h = econ().totalMin / 60, nextH = tierHours(t + 1), prevH = tierHours(t), un = unclaimed().length, r = rewardOf(t + 1);
  $("pmTier").textContent = t;
  $("pmNext").innerHTML = `${rewardIcon(r)}<span><small>次の報酬　あと${Math.max(0, nextH - h).toFixed(1)}h</small><b>${esc(rewardLabel(r))}</b></span>`;
  $("pmBar").style.width = clamp(100 * (h - prevH) / (nextH - prevH), 0, 100) + "%";
  $("pmClaim").hidden = !un; $("pmClaim").textContent = "受け取れる報酬 " + un;
}
function bindPass() {
  $("passTrack").addEventListener("click", e => { const b = e.target.closest("[data-claim]"); if (b) claimTiers([Number(b.dataset.claim)]); });
  $("passClaimAll").onclick = () => claimTiers(unclaimed());
  $("pmClaim").onclick = () => { yokaiTab = "pass"; go("yokai"); setTimeout(scrollPassToNow, 50); };
  $("passMini").addEventListener("click", e => { if (!e.target.closest("#pmClaim")) { yokaiTab = "pass"; go("yokai"); setTimeout(scrollPassToNow, 50); } });
}
