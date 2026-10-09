// ===== やり込みキット(ICE BOW のミッション/バッジ/レベル/メニューを1ファイルにまとめたもの) =====
// 使い方(main.js から):
//   import { addStat, setBest, addXp, showYarikomiMenu } from "./yarikomi.js";
//   正解した時   : addStat(p, "ok");            即答の時: addStat(p, "fast");
//   部屋クリア   : addStat(p, "clear");         ボス撃破: addStat(p, "boss");
//   箱が上がった : addStat(p, "learned");       コンボ  : setBest(p, "combo", 今のコンボ数);
//   メニュー     : showYarikomiMenu(p);  (コンパスのメニューにボタンを1個足して呼ぶ)
// addStat を呼ぶだけで、ミッション達成 → 報酬(XP/コイン/バッジ) → 通知 まで自動で進む。
// ミッションやバッジを増やす時は、下の MISSIONS / DAILY / BADGES に1行足すだけ。
import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { gridForm } from "./ui.js";

// ---------- バッジ(名前の横に出る。icon は1文字) ----------
export const BADGES = [
  { id: "first",   icon: "✦", label: "はじめの一歩", desc: "初めて正解した" },
  { id: "ok100",   icon: "✎", label: "百問斬り",     desc: "累計100問正解" },
  { id: "ok1000",  icon: "✪", label: "千問斬り",     desc: "累計1000問正解" },
  { id: "fast50",  icon: "⚡", label: "電光石火",     desc: "即答50回" },
  { id: "boss10",  icon: "♛", label: "門番キラー",   desc: "ボスを10回倒した" },
  { id: "learn300", icon: "❖", label: "語彙の番人",   desc: "300語を覚えた" },
  { id: "combo20", icon: "✹", label: "20コンボ",     desc: "20問連続で正解" },
  { id: "shield100", icon: "✦", label: "盾砕き",       desc: "単語シールドを100枚割った" },
  { id: "rankS5",  icon: "✎", label: "Sランカー",     desc: "階をSランクで5回クリア" },
  { id: "raid1",   icon: "♛", label: "獄王討伐",     desc: "第1大陸のレイドボスを倒した" },
  { id: "raid2",   icon: "✪", label: "巨像討伐",     desc: "第2大陸のレイドボスを倒した" },
  { id: "raid3",   icon: "✹", label: "炎帝討伐",     desc: "第3大陸のレイドボスを倒した" },
  { id: "raid4",   icon: "❖", label: "深淵の覇者",   desc: "第4大陸のレイドボスを倒した" },
  { id: "raid5",   icon: "★", label: "言霊の覇王",   desc: "最終決戦で言霊の魔王を倒した" },
];
const MAX_EQUIP = 3;

// ---------- ミッション(累計) ----------
// stat: addStat/setBest で増やすキー。target: 目標。reward: { xp, coin, badge }
export const MISSIONS = [
  { id: "m_first", cat: "basic", title: "最初の正解",   desc: "1問正解する",         stat: "ok",      target: 1,    reward: { xp: 20, badge: "first" } },
  { id: "m_ok100", cat: "basic", title: "百問斬り",     desc: "累計100問正解",       stat: "ok",      target: 100,  reward: { xp: 200, coin: 100, badge: "ok100" } },
  { id: "m_ok1k",  cat: "hard",  title: "千問斬り",     desc: "累計1000問正解",      stat: "ok",      target: 1000, reward: { xp: 1000, coin: 500, badge: "ok1000" } },
  { id: "m_fast",  cat: "basic", title: "電光石火",     desc: "即答を50回",          stat: "fast",    target: 50,   reward: { xp: 150, badge: "fast50" } },
  { id: "m_clear", cat: "basic", title: "部屋荒らし",   desc: "部屋を20回クリア",     stat: "clear",   target: 20,   reward: { xp: 150, coin: 50 } },
  { id: "m_boss",  cat: "hard",  title: "門番キラー",   desc: "ボスを10回倒す",       stat: "boss",    target: 10,   reward: { xp: 400, badge: "boss10" } },
  { id: "m_learn", cat: "hard",  title: "語彙の番人",   desc: "300語を覚える(箱が上がった回数)", stat: "learned", target: 300, reward: { xp: 800, badge: "learn300" } },
  { id: "m_combo", cat: "hard",  title: "20コンボ",     desc: "20問連続で正解(自己ベスト)", stat: "best_combo", target: 20, reward: { xp: 300, badge: "combo20" } },
  { id: "m_shield", cat: "basic", title: "盾砕き",       desc: "単語シールドを100枚割る",   stat: "shield",  target: 100, reward: { xp: 200, coin: 100, badge: "shield100" } },
  { id: "m_rankS",  cat: "hard",  title: "Sランカー",    desc: "階をSランクで5回クリア",   stat: "rankS",   target: 5,   reward: { xp: 300, coin: 200, badge: "rankS5" } },
  { id: "m_raid1",  cat: "hard",  title: "第1大陸 制覇", desc: "獄王ヴォカブを倒す",        stat: "raid_c1", target: 1,   reward: { xp: 500, coin: 300, badge: "raid1" } },
  { id: "m_raid2",  cat: "hard",  title: "第2大陸 制覇", desc: "苔の巨像レキシスを倒す",    stat: "raid_c2", target: 1,   reward: { xp: 700, coin: 500, badge: "raid2" } },
  { id: "m_raid3",  cat: "hard",  title: "第3大陸 制覇", desc: "炎帝グロッサを倒す",        stat: "raid_c3", target: 1,   reward: { xp: 900, coin: 700, badge: "raid3" } },
  { id: "m_raid4",  cat: "hard",  title: "第4大陸 制覇", desc: "深淵の主ディクシオを倒す",  stat: "raid_c4", target: 1,   reward: { xp: 1200, coin: 1000, badge: "raid4" } },
  { id: "m_raid5",  cat: "hard",  title: "完全制覇",     desc: "言霊の魔王ロゴスを倒す",    stat: "raid_c5", target: 1,   reward: { xp: 3000, coin: 2000, badge: "raid5" } },
];
// ---------- デイリーミッション(現実の日付が変わるとリセット。stat は "d_" で始める) ----------
export const DAILY = [
  { id: "d_ok",    title: "今日の30問", desc: "今日30問正解",     stat: "d_ok",    target: 30, reward: { xp: 60, coin: 30 } },
  { id: "d_fast",  title: "今日の即答", desc: "今日即答を10回",   stat: "d_fast",  target: 10, reward: { xp: 40, coin: 20 } },
  { id: "d_clear", title: "今日の攻略", desc: "今日部屋を3つクリア", stat: "d_clear", target: 3, reward: { xp: 50, coin: 30 } },
  { id: "d_shield", title: "今日の盾砕き", desc: "今日シールドを20枚割る", stat: "d_shield", target: 20, reward: { xp: 40, coin: 30 } },
];
const CATS = [
  { id: "basic", label: "§lふつう", icon: "textures/items/book_normal" },
  { id: "hard",  label: "§lやり込み", icon: "textures/items/nether_star" },
];
// ---------- 自己ベスト(メニューに出す) ----------
const BESTS = [
  { stat: "best_combo", label: "最高コンボ" },
  { stat: "ok", label: "累計正解" },
  { stat: "learned", label: "覚えた語数" },
  { stat: "boss", label: "ボス撃破" },
  { stat: "shield", label: "割ったシールド" },
  { stat: "rankS", label: "Sランク" },
];

// ---------- レベル ----------
const xpToNext = lv => 50 + lv * 15;   // 序盤は軽く、後半じわじわ重く

// ---------- 保存(プレイヤーごと。下がらない前提) ----------
const KEY = "yk:data";
const LOGIN_BONUS = [20, 20, 30, 30, 40, 40, 100];   // 連続ログイン1〜7日目のコイン
function load(p) {
  let d = {};
  try { const raw = p.getDynamicProperty(KEY); if (typeof raw === "string") d = JSON.parse(raw); } catch (e) {}
  d.s ??= {}; d.done ??= []; d.ddone ??= []; d.badges ??= []; d.eq ??= []; d.lv ??= 1; d.xp ??= 0; d.coin ??= 0;
  d.own ??= []; d.cos ??= {};   // コスメ: 持ってるid / 装備中 { title, color, kill, trail, pet }
  const today = new Date().toLocaleDateString("ja-JP");   // 現実の日付。開き直してもズルできない
  if (d.day !== today) {
    // ログインボーナス: 連続日数で少しずつ増える(7日目で最大)。1日空くと1日目に戻る
    const yest = new Date(Date.now() - 864e5).toLocaleDateString("ja-JP");
    d.streak = d.day === yest ? (d.streak ?? 0) + 1 : 1;
    if (d.day) d.pendingBonus = LOGIN_BONUS[Math.min(d.streak, LOGIN_BONUS.length) - 1];
    d.day = today; d.ddone = []; for (const k of Object.keys(d.s)) if (k.startsWith("d_")) delete d.s[k];
  }
  return d;
}
function save(p, d) { try { p.setDynamicProperty(KEY, JSON.stringify(d)); } catch (e) {} }

// ---------- 外から呼ぶ ----------
// shop.js / pets.js 用: 保存データをそのまま読み書きする
export function getData(p) { return load(p); }
export function saveData(p, d) { save(p, d); }
// コイン: 増やす時はアクションバーに「+10コイン」を出す
export function addCoins(p, n, why = "") {
  const d = load(p); d.coin += n; save(p, d);
  try { p.onScreenDisplay.setActionBar(`§e+${n}コイン${why ? " §7" + why : ""}  §f(所持 ${d.coin})`); } catch (e) {}
}
// アクションバーを出さずに増やす（問題の答えの表示を上書きしないため）。増えた後の所持数を返す
export function addCoinsQuiet(p, n) { const d = load(p); d.coin += n; save(p, d); return d.coin; }
export function getStat(p, k) { return load(p).s[k] ?? 0; }
export function getCoins(p) { return load(p).coin; }
export function spendCoins(p, n) { const d = load(p); if (d.coin < n) return false; d.coin -= n; save(p, d); return true; }
export function addStat(p, k, n = 1) {
  const d = load(p);
  d.s[k] = (d.s[k] ?? 0) + n;
  if (!k.startsWith("d_")) d.s["d_" + k] = (d.s["d_" + k] ?? 0) + n;   // デイリー用も一緒に数える
  check(p, d); save(p, d);
}
export function setBest(p, k, v) {
  const d = load(p), key = "best_" + k;
  if (v <= (d.s[key] ?? 0)) return;
  const first = d.s[key] === undefined; d.s[key] = v;
  if (!first && v >= 5 && v % 5 === 0) toast(p, "§6NEW RECORD!", `§e${k} ${v}`, "random.levelup");
  check(p, d); save(p, d);
}
export function addXp(p, n) { const d = load(p); giveXp(p, d, n); save(p, d); }

function giveXp(p, d, n) {
  d.xp += n;
  while (d.xp >= xpToNext(d.lv)) { d.xp -= xpToNext(d.lv); d.lv++; toast(p, `§bLEVEL UP!`, `§fLv.${d.lv}`, "random.levelup"); }
}
function giveBadge(p, d, id) {
  if (d.badges.includes(id)) return;
  d.badges.push(id);
  const b = BADGES.find(x => x.id === id);
  if (d.eq.length < MAX_EQUIP) d.eq.push(id);   // 枠が空いてたら自動で付ける
  world.sendMessage(`§e${p.name} §fがバッジ ${b?.icon ?? ""}§b「${b?.label ?? id}」§fを手に入れた!`);
  applyName(p, d);
}
function check(p, d) {
  for (const [list, doneKey] of /** @type {Array<[any[], string]>} */ ([[MISSIONS, "done"], [DAILY, "ddone"]])) {
    for (const m of list) {
      if (d[doneKey].includes(m.id) || (d.s[m.stat] ?? 0) < m.target) continue;
      d[doneKey].push(m.id);
      const r = m.reward ?? {};
      if (r.coin) d.coin += r.coin;
      if (r.xp) giveXp(p, d, r.xp);
      if (r.badge) giveBadge(p, d, r.badge);
      toast(p, "§aミッション達成!", `§f${m.title} ${rewardText(m)}`, "random.toast");
    }
  }
}
// 名前の表示 = [称号] 色付きの名前 バッジ。shop.js で称号や色を変えた時も refreshName を呼ぶ
let nameDeco = (/** @type {any} */ _d) => ({ title: "", color: "" });
export function setNameDecorator(fn) { nameDeco = fn; }
function applyName(p, d) {
  const icons = d.eq.map(id => BADGES.find(b => b.id === id)?.icon).filter(Boolean).join("");
  const { title, color } = nameDeco(d);
  try { p.nameTag = `${title ? title + "§r " : ""}${color}${p.name}§r${icons ? " §e" + icons : ""}`; } catch (e) {}
}
export function refreshName(p) { applyName(p, load(p)); }
world.afterEvents.playerSpawn.subscribe(ev => {
  if (!ev.initialSpawn) return;
  const p = ev.player, d = load(p);
  applyName(p, d);
  if (d.pendingBonus) {
    const n = d.pendingBonus; d.coin += n; delete d.pendingBonus; save(p, d);
    system.runTimeout(() => toast(p, "§eログインボーナス", `§f+${n}コイン §7(連続${d.streak}日目)`, "random.levelup"), 60);
  } else save(p, d);
});

function toast(p, main, sub, snd) {
  try { p.onScreenDisplay.setTitle(main, { subtitle: sub, fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 }); } catch (e) {}
  try { p.playSound(snd); } catch (e) {}
}

// ---------- メニュー ----------
const bar = (r, n = 10) => { const f = Math.max(0, Math.min(n, Math.floor(r * n))); return "§a" + "|".repeat(f) + "§8" + "|".repeat(n - f); };
function rewardText(m) {
  const r = m.reward ?? {}, out = [];
  if (r.xp) out.push(`§bXP${r.xp}`);
  if (r.coin) out.push(`§eコイン${r.coin}`);
  if (r.badge) { const b = BADGES.find(x => x.id === r.badge); out.push(`§dバッジ${b?.icon ?? ""}`); }
  return out.join(" §7/ ");
}
// 50%以上進んだ未達成は「もうすぐ」として★付きで一番上。達成済みは一番下
function missionBody(d, list, doneKey) {
  const rows = list.map(m => { const sc = Math.min(d.s[m.stat] ?? 0, m.target); return { m, sc, r: sc / m.target, done: d[doneKey].includes(m.id) }; });
  const near = rows.filter(x => !x.done && x.r >= 0.5).sort((a, b) => b.r - a.r), rest = rows.filter(x => !x.done && x.r < 0.5), done = rows.filter(x => x.done);
  const fmt = x => x.done ? `§a${x.m.title} [達成]` : `${x.r >= 0.5 ? "§e§l★ " : "§f"}${x.m.title}§r §7(${x.sc}/${x.m.target})\n${bar(x.r)}\n§7${x.m.desc}\n§7報酬: ${rewardText(x.m)}`;
  const out = [];
  if (near.length) out.push(`§6§l― もうすぐ達成 ―§r\n\n` + near.map(fmt).join("\n\n"));
  if (rest.length) out.push(`§7§l― 挑戦中 ―§r\n\n` + rest.map(fmt).join("\n\n"));
  if (done.length) out.push(`§a§l― 達成済み (${done.length}/${rows.length}) ―§r\n` + done.map(fmt).join("\n"));
  return out.join("\n\n\n") || "なし";
}
const nearCount = (d, list, doneKey) => list.filter(m => !d[doneKey].includes(m.id) && (d.s[m.stat] ?? 0) / m.target >= 0.5).length;
const star = n => n ? `\n§e★もうすぐ ${n}個` : "";

// ほかのファイル(shop.js など)からメニューにボタンを足す口
const extraButtons = [];
export function addMenuButton(label, icon, fn) { extraButtons.push({ label, icon, fn }); }
export async function showYarikomiMenu(p) {
  const d = load(p);
  const f = gridForm("やり込み")
    .body(`§fLv.${d.lv}  ${bar(d.xp / xpToNext(d.lv))} §7${d.xp}/${xpToNext(d.lv)}\n§eコイン ${d.coin}  §dバッジ ${d.badges.length}/${BADGES.length}\n `);
  const acts = [];
  f.button(`§lデイリー${star(nearCount(d, DAILY, "ddone"))}`, "textures/items/clock_item"); acts.push(() => list(p, "デイリーミッション", DAILY, "ddone"));
  for (const c of CATS) { const ms = MISSIONS.filter(m => m.cat === c.id); f.button(`${c.label}${star(nearCount(d, ms, "done"))}`, c.icon); acts.push(() => list(p, "ミッション", ms, "done")); }
  f.button("§lバッジ", "textures/items/gold_ingot"); acts.push(() => badgeMenu(p));
  f.button("§l自己ベスト", "textures/items/diamond"); acts.push(() => bestMenu(p));
  for (const x of extraButtons) { f.button(x.label, x.icon); acts.push(() => x.fn(p)); }
  const r = await f.show(p); if (!r.canceled) acts[r.selection]?.();
}
async function list(p, title, ms, doneKey) {
  const r = await new ActionFormData().title(title).body(missionBody(load(p), ms, doneKey)).button("戻る").show(p);
  if (!r.canceled) showYarikomiMenu(p);
}
async function badgeMenu(p) {
  const d = load(p);
  const f = new ActionFormData().title("バッジ").body(`§7押すと付け外し(最大${MAX_EQUIP}個)。付けたバッジは名前の横に出る\n `);
  for (const b of BADGES) {
    const has = d.badges.includes(b.id), on = d.eq.includes(b.id);
    f.button(has ? `${on ? "§a[装備中] " : ""}§f${b.icon} ${b.label}\n§8${b.desc}` : `§8？？？\n§8${b.desc}`);
  }
  f.button("戻る");
  const r = await f.show(p); if (r.canceled) return;
  const b = BADGES[r.selection]; if (!b) return showYarikomiMenu(p);
  if (d.badges.includes(b.id)) {
    if (d.eq.includes(b.id)) d.eq = d.eq.filter(x => x !== b.id);
    else if (d.eq.length < MAX_EQUIP) d.eq.push(b.id);
    else p.sendMessage(`§c付けられるのは${MAX_EQUIP}個まで。どれか外してね`);
    save(p, d); applyName(p, d);
  }
  badgeMenu(p);
}
async function bestMenu(p) {
  const d = load(p);
  const body = BESTS.map(b => `§f${b.label}: §e${d.s[b.stat] ?? 0}`).join("\n");
  const r = await new ActionFormData().title("自己ベスト").body(body + "\n ").button("戻る").show(p);
  if (!r.canceled) showYarikomiMenu(p);
}
