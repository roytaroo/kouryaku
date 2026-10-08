// ===== コスメショップ(ICE BOW のショップ/日替わりショップを軽くしたもの) =====
// 見た目だけのアイテムをコインで買って、装備する。性能は一切変わらない。
//   称号      : 名前の前に出る
//   名前の色  : 名前の色が変わる
//   撃破エフェクト : 敵を倒した場所に粒が出る
//   足あと    : 歩いたところに粒が出る
//   ペット    : 後ろをついてくる(pets.js が動かす。見た目はリソースパック)
// 今日のおすすめ: 日付から決まる3つが25%引き(誰が見ても同じ並び。日付が変わると入れ替わる)
// 使い方: import { showShop } from "./shop.js";  コンパスのメニューから showShop(p) を呼ぶ
import { world, system, ItemStack } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { gridForm } from "./ui.js";
import { getData, saveData, refreshName, setNameDecorator, showYarikomiMenu, addMenuButton } from "./yarikomi.js";

// rarity: rare / epic / legend / mythic(色と並び順に使う)
// give があるものは装備・アイテム。買うと持ち物に入る。consumable は何回でも買える
export const SHOP = [
  // 武器
  { id: "w_stone",     cat: "weapon", label: "石の剣",         give: [["minecraft:stone_sword", 1]],     price: 40,   rarity: "rare",   icon: "textures/items/stone_sword" },
  { id: "w_iron",      cat: "weapon", label: "鉄の剣",         give: [["minecraft:iron_sword", 1]],      price: 150,  rarity: "rare",   icon: "textures/items/iron_sword" },
  { id: "w_diamond",   cat: "weapon", label: "ダイヤの剣",     give: [["minecraft:diamond_sword", 1]],   price: 450,  rarity: "epic",   icon: "textures/items/diamond_sword" },
  { id: "w_netherite", cat: "weapon", label: "ネザライトの剣", give: [["minecraft:netherite_sword", 1]], price: 1200, rarity: "legend", icon: "textures/items/netherite_sword" },
  { id: "w_bow",       cat: "weapon", label: "弓",             give: [["minecraft:bow", 1]],             price: 100,  rarity: "rare",   icon: "textures/items/bow_standby" },
  { id: "w_crossbow",  cat: "weapon", label: "クロスボウ",     give: [["minecraft:crossbow", 1]],        price: 250,  rarity: "epic",   icon: "textures/items/crossbow_standby" },
  { id: "w_shield",    cat: "weapon", label: "盾",             give: [["minecraft:shield", 1]],          price: 80,   rarity: "rare",   icon: "textures/items/iron_ingot" },
  { id: "w_arrow",     cat: "weapon", label: "矢 x32",         give: [["minecraft:arrow", 32]],          price: 20,   rarity: "rare",   icon: "textures/items/arrow", consumable: true },
  // 防具（セット）
  { id: "a_chain",     cat: "armor", label: "チェーンの防具",   give: [["minecraft:chainmail_helmet", 1], ["minecraft:chainmail_chestplate", 1], ["minecraft:chainmail_leggings", 1], ["minecraft:chainmail_boots", 1]], price: 200,  rarity: "rare",   icon: "textures/items/chainmail_chestplate" },
  { id: "a_iron",      cat: "armor", label: "鉄の防具",         give: [["minecraft:iron_helmet", 1], ["minecraft:iron_chestplate", 1], ["minecraft:iron_leggings", 1], ["minecraft:iron_boots", 1]], price: 400,  rarity: "rare",   icon: "textures/items/iron_chestplate" },
  { id: "a_diamond",   cat: "armor", label: "ダイヤの防具",     give: [["minecraft:diamond_helmet", 1], ["minecraft:diamond_chestplate", 1], ["minecraft:diamond_leggings", 1], ["minecraft:diamond_boots", 1]], price: 1300, rarity: "epic",   icon: "textures/items/diamond_chestplate" },
  { id: "a_netherite", cat: "armor", label: "ネザライトの防具", give: [["minecraft:netherite_helmet", 1], ["minecraft:netherite_chestplate", 1], ["minecraft:netherite_leggings", 1], ["minecraft:netherite_boots", 1]], price: 3500, rarity: "legend", icon: "textures/items/netherite_chestplate" },
  // 回復アイテム
  { id: "i_gapple",    cat: "item", label: "金のリンゴ",       give: [["minecraft:golden_apple", 1]],           price: 60,  rarity: "rare",   icon: "textures/items/apple_golden", consumable: true },
  { id: "i_gapple5",   cat: "item", label: "金のリンゴ x5",    give: [["minecraft:golden_apple", 5]],           price: 270, rarity: "epic",   icon: "textures/items/apple_golden", consumable: true },
  { id: "i_totem",     cat: "item", label: "不死のトーテム",   give: [["minecraft:totem_of_undying", 1]],       price: 300, rarity: "legend", icon: "textures/items/totem", consumable: true },
  { id: "i_egapple",   cat: "item", label: "エンチャ金リンゴ", give: [["minecraft:enchanted_golden_apple", 1]], price: 800, rarity: "mythic", icon: "textures/items/apple_golden", consumable: true },
  // 称号
  { id: "t_rookie",  cat: "title", label: "§7[見習い]",      price: 50,   rarity: "rare",   icon: "textures/items/book_normal" },
  { id: "t_scholar", cat: "title", label: "§b[単語ハンター]", price: 200,  rarity: "epic",   icon: "textures/items/book_writable" },
  { id: "t_sage",    cat: "title", label: "§6[語彙の賢者]",   price: 600,  rarity: "legend", icon: "textures/items/book_enchanted" },
  { id: "t_1900",    cat: "title", label: "§d[1900マスター]", price: 1500, rarity: "mythic", icon: "textures/items/nether_star" },
  // 名前の色
  { id: "c_aqua",  cat: "color", label: "§b水色の名前",   value: "§b", price: 80,  rarity: "rare", icon: "textures/items/dye_powder_light_blue" },
  { id: "c_green", cat: "color", label: "§a緑の名前",     value: "§a", price: 80,  rarity: "rare", icon: "textures/items/dye_powder_lime" },
  { id: "c_gold",  cat: "color", label: "§6金色の名前",   value: "§6", price: 300, rarity: "epic", icon: "textures/items/gold_ingot" },
  { id: "c_pink",  cat: "color", label: "§dピンクの名前", value: "§d", price: 300, rarity: "epic", icon: "textures/items/dye_powder_pink" },
  // 撃破エフェクト(敵を倒した場所)
  { id: "k_heart", cat: "kill", label: "ハート",   particle: "minecraft:heart_particle",      count: 6,  price: 150, rarity: "rare",   icon: "textures/items/apple_golden" },
  { id: "k_star",  cat: "kill", label: "きらきら", particle: "minecraft:endrod",              count: 10, price: 250, rarity: "epic",   icon: "textures/blocks/end_rod" },
  { id: "k_totem", cat: "kill", label: "トーテム", particle: "minecraft:totem_particle",      count: 14, price: 500, rarity: "legend", icon: "textures/items/totem" },
  { id: "k_soul",  cat: "kill", label: "青い炎",   particle: "minecraft:blue_flame_particle", count: 12, price: 500, rarity: "legend", icon: "textures/items/blaze_powder" },
  // 足あと(footprint: true = ICE BOW の足あと。地面に左右交互に残る / それ以外は足元に粒)
  { id: "f_paw",    cat: "trail", label: "肉球",     particle: "kr:fp_paw",    footprint: true, price: 300, rarity: "rare",   icon: "textures/items/bone" },
  { id: "f_shoe",   cat: "trail", label: "くつあと", particle: "kr:fp_shoe",   footprint: true, price: 300, rarity: "rare",   icon: "textures/items/leather_boots" },
  { id: "f_flower", cat: "trail", label: "花",       particle: "kr:fp_flower", footprint: true, price: 400, rarity: "epic",   icon: "textures/blocks/flower_tulip_pink" },
  { id: "f_star",   cat: "trail", label: "星",       particle: "kr:fp_star",   footprint: true, price: 400, rarity: "epic",   icon: "textures/items/nether_star" },
  { id: "f_slime",  cat: "trail", label: "スライム", particle: "kr:fp_slime",  footprint: true, price: 500, rarity: "epic",   icon: "textures/items/slimeball" },
  { id: "f_sakura", cat: "trail", label: "桜吹雪",   particle: "minecraft:cherry_leaves_particle", price: 600, rarity: "legend", icon: "textures/items/dye_powder_pink" },
  // ペット(entity は BP の entities/kr_pet_*.json。flying = 浮いてついてくる)
  { id: "p_goldfish", cat: "pet", label: "テラい金魚",   entity: "kr:pet_goldfish",    price: 300,  rarity: "rare",   icon: "textures/items/fish_clownfish_raw" },
  { id: "p_penguin",  cat: "pet", label: "ペンギン",     entity: "kr:pet_penguin",     price: 500,  rarity: "epic",   icon: "textures/items/fish_salmon_raw" },
  { id: "p_dolphin",  cat: "pet", label: "イルカ",       entity: "kr:pet_dolphin",     price: 500,  rarity: "epic",   flying: true, icon: "textures/items/fish_raw" },
  { id: "p_turtle",   cat: "pet", label: "カメ",         entity: "kr:pet_turtle",      price: 700,  rarity: "legend", flying: true, icon: "textures/items/turtle_shell_piece" },
  { id: "p_moon",     cat: "pet", label: "テラいウサギ", entity: "kr:pet_moon_rabbit", price: 800,  rarity: "legend", flying: true, ambient: "minecraft:endrod", icon: "textures/items/rabbit_foot" },
  { id: "p_sakura",   cat: "pet", label: "桜ぎつね",     entity: "kr:pet_sakura_fox",  price: 1200, rarity: "mythic", flying: true, ambient: "minecraft:cherry_leaves_particle", icon: "textures/items/sweet_berries" },
];
const CATS = [
  { id: "weapon", label: "武器",         icon: "textures/items/iron_sword" },
  { id: "armor",  label: "防具",         icon: "textures/items/iron_chestplate" },
  { id: "item",   label: "回復アイテム", icon: "textures/items/apple_golden" },
  { id: "title", label: "称号",          icon: "textures/items/name_tag" },
  { id: "color", label: "名前の色",      icon: "textures/items/dye_powder_cyan" },
  { id: "kill",  label: "撃破エフェクト", icon: "textures/items/blaze_powder" },
  { id: "trail", label: "足あと",        icon: "textures/items/feather" },
  { id: "pet",   label: "ペット",        icon: "textures/items/lead" },
];
const RARITY = { rare: { c: "§9", n: "レア" }, epic: { c: "§5", n: "エピック" }, legend: { c: "§6", n: "レジェンド" }, mythic: { c: "§d", n: "ミシック" } };
const DAILY_COUNT = 3, DAILY_OFF = 0.25;

export const itemById = id => SHOP.find(x => x.id === id);
export function equipped(p, cat) { return itemById(getData(p).cos[cat]); }

// 名前の前の称号・名前の色を yarikomi.js の名前表示に渡す
setNameDecorator(d => ({ title: itemById(d.cos.title)?.label ?? "", color: itemById(d.cos.color)?.value ?? "" }));
addMenuButton("§lショップ", "textures/items/emerald", p => showShop(p));

// ---- 今日のおすすめ(日付をシードにした乱数 → 全員同じ並び) ----
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function dailyPicks() {
  const day = new Date().toLocaleDateString("ja-JP");
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = seeded(h), pool = [...SHOP], out = [];
  while (out.length < DAILY_COUNT && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
const priceOf = it => dailyPicks().includes(it) ? Math.round(it.price * (1 - DAILY_OFF)) : it.price;

// ---- メニュー ----
export async function showShop(p) {
  const d = getData(p);
  const f = gridForm("ショップ").body(`§eコイン ${d.coin}  §7武器・防具・回復は持ち物に入る。ほかは見た目だけ`);
  const acts = [];
  f.button("今日のおすすめ\n§c25%引き", "textures/items/clock_item"); acts.push(() => itemList(p, "今日のおすすめ", dailyPicks()));
  for (const c of CATS) {
    const list = SHOP.filter(x => x.cat === c.id), own = list.filter(x => d.own.includes(x.id)).length;
    const sub = c.id === "item" ? "何回でも買える" : `${own}/${list.filter(x => !x.consumable).length} 所持`;
    f.button(`${c.label}\n${sub}`, c.icon); acts.push(() => itemList(p, c.label, list));
  }
  f.button("やり込み", "textures/items/nether_star"); acts.push(() => showYarikomiMenu(p));
  const r = await f.show(p); if (!r.canceled) acts[r.selection]?.();
}
async function itemList(p, title, list) {
  const d = getData(p), picks = dailyPicks();
  const f = gridForm(title).body(`§eコイン ${d.coin}`);
  for (const it of list) {
    const ra = RARITY[it.rarity] ?? RARITY.rare, on = d.cos[it.cat] === it.id, own = d.own.includes(it.id);
    const state = it.give && !it.consumable && own ? "§2購入済み" : on ? "§a装備中" : own && !it.consumable ? "§2持ってる" : picks.includes(it) ? `§c${priceOf(it)}コイン §8(${it.price})` : `§e${it.price}コイン`;
    f.button(`${it.label.replace(/§./g, "")}\n${state}\n${ra.c}${ra.n}`, it.icon);
  }
  f.button("戻る", "textures/items/arrow");
  const r = await f.show(p); if (r.canceled) return;
  const it = list[r.selection]; if (!it) return showShop(p);
  await itemAction(p, it); itemList(p, title, list);
}
// ---- 装備・アイテム: 持ち物に入れる ----
function inventoryOf(p) { try { return /** @type {any} */ (p.getComponent("minecraft:inventory")).container; } catch (e) { return undefined; } }
function giveItems(p, it) {
  const c = inventoryOf(p);
  for (const [id, n] of it.give) {
    const stack = new ItemStack(id, n);
    let left = stack;
    try { left = c ? c.addItem(stack) : stack; } catch (e) {}
    if (left) { try { p.dimension.spawnItem(left, p.location); } catch (e) {} }
  }
}
function hasAll(p, it) {
  const ids = new Set();
  const c = inventoryOf(p);
  if (c) for (let k = 0; k < c.size; k++) { const x = c.getItem(k); if (x) ids.add(x.typeId); }
  try {
    const eq = /** @type {any} */ (p.getComponent("minecraft:equippable"));
    for (const slot of ["Head", "Chest", "Legs", "Feet", "Offhand"]) { const x = eq?.getEquipment(slot); if (x) ids.add(x.typeId); }
  } catch (e) {}
  return it.give.every(([id]) => ids.has(id));
}
async function buyGear(p, it) {
  const d = getData(p), name = it.label;
  if (!it.consumable && d.own.includes(it.id)) {   // 買ったことがある装備 → 無くしていたら無料で受け取り直せる
    if (hasAll(p, it)) { try { p.sendMessage(`§7${name} はもう持ってる`); } catch (e) {} return; }
    giveItems(p, it);
    try { p.sendMessage(`§a${name} §fを受け取り直した`); p.playSound("random.pop"); } catch (e) {}
    return;
  }
  const price = priceOf(it);
  if (d.coin < price) { try { p.sendMessage(`§cコインが足りない (あと${price - d.coin})`); p.playSound("note.bass"); } catch (e) {} return; }
  const ok = await new MessageFormData().title("購入").body(`${name} を ${price}コインで買う？\n§7(所持 ${d.coin} → ${d.coin - price})`).button1("やめる").button2("買う").show(p);
  if (ok.canceled || ok.selection !== 1) return;
  const d2 = getData(p);
  if (d2.coin < price || (!it.consumable && d2.own.includes(it.id))) return;
  d2.coin -= price;
  if (!it.consumable) d2.own.push(it.id);
  saveData(p, d2);
  giveItems(p, it);
  try { p.playSound("random.levelup"); p.sendMessage(`§a${name} §fを買った！ 持ち物に入れたよ`); } catch (e) {}
}

async function itemAction(p, it) {
  if (it.give) return buyGear(p, it);
  const d = getData(p);
  if (d.own.includes(it.id)) {   // 持ってる → 付け外し
    d.cos[it.cat] = d.cos[it.cat] === it.id ? undefined : it.id;
    saveData(p, d); refreshName(p);
    try { p.playSound("armor.equip_generic"); } catch (e) {}
    return;
  }
  const price = priceOf(it);
  if (d.coin < price) { try { p.sendMessage(`§cコインが足りない (あと${price - d.coin})`); p.playSound("note.bass"); } catch (e) {} return; }
  const ok = await new MessageFormData().title("購入").body(`${it.label.replace(/§./g, "")} を ${price}コインで買う？\n§7(所持 ${d.coin} → ${d.coin - price})`).button1("やめる").button2("買う").show(p);
  if (ok.canceled || ok.selection !== 1) return;
  const d2 = getData(p);   // フォームを開いてる間に変わってるかもしれないので読み直す
  if (d2.coin < price || d2.own.includes(it.id)) return;
  d2.coin -= price; d2.own.push(it.id); d2.cos[it.cat] = it.id;   // 買ったらそのまま装備
  saveData(p, d2); refreshName(p);
  try { p.playSound("random.levelup"); p.sendMessage(`§a${it.label.replace(/§./g, "")} §fを買って装備した!`); } catch (e) {}
}

// ---- 撃破エフェクト: プレイヤーが倒した敵の場所に粒を出す ----
world.afterEvents.entityDie.subscribe(ev => {
  const killer = ev.damageSource?.damagingEntity;
  if (killer?.typeId !== "minecraft:player") return;
  const it = equipped(killer, "kill"); if (!it) return;
  let l; try { l = ev.deadEntity.location; } catch (e) { return; }
  const dim = killer.dimension;
  for (let i = 0; i < it.count; i++) {
    try { dim.spawnParticle(it.particle, { x: l.x + (Math.random() - 0.5) * 1.2, y: l.y + 0.3 + Math.random() * 1.4, z: l.z + (Math.random() - 0.5) * 1.2 }); } catch (e) {}
  }
});
// ---- 足あと ----
// footprint: 地面を0.8マス進むごとに、左右交互に1つ(ICE BOW と同じ) / それ以外: 動いている時に足元に粒
const STEP = 0.8, SIDE = 0.17;
const lastPos = new Map(); // playerId -> { x, z, side }
system.runInterval(() => {
  for (const p of world.getAllPlayers()) {
    const it = equipped(p, "trail"); if (!it) { lastPos.delete(p.id); continue; }
    const l = p.location, st = lastPos.get(p.id);
    let onGround = true; try { onGround = p.isOnGround; } catch (e) {}
    if (!st || !onGround) { lastPos.set(p.id, { x: l.x, z: l.z, side: st?.side ?? 1 }); continue; }
    const dx = l.x - st.x, dz = l.z - st.z, d = Math.hypot(dx, dz);
    if (d > 3) { lastPos.set(p.id, { x: l.x, z: l.z, side: st.side }); continue; }   // テレポートなど
    if (d < (it.footprint ? STEP : 0.3)) continue;
    const side = -st.side, nx = dx / d, nz = dz / d;
    const pos = it.footprint ? { x: l.x - nz * SIDE * side, y: l.y + 0.03, z: l.z + nx * SIDE * side } : { x: l.x, y: l.y + 0.1, z: l.z };
    try { p.dimension.spawnParticle(it.particle, pos); } catch (e) {}
    lastPos.set(p.id, { x: l.x, z: l.z, side });
  }
}, 2);
world.afterEvents.playerLeave.subscribe(ev => lastPos.delete(ev.playerId));
