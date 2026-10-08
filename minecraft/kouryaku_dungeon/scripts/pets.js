// ===== ペット(ICE BOW の petSystem.js を軽くしたもの) =====
// shop.js で装備したペットを、飼い主の後ろについてこさせる。
// ・近くにいる間は、そっと引き寄せる力を加えるだけ(テレポートしないので動きが自然)
// ・14マス以上はぐれたらワープで戻す / 飛ぶペットは頭の少し上に浮かせる
// ・ペットは無敵(BP側の damage_sensor + 念のためここでも即回復)。敵(monster)扱いにはならない
// ・ワールドを閉じた時に残ったペットや、飼い主がいなくなったペットは自動で片付ける
// 使い方: main.js で import "./pets.js"; するだけ
import { world, system } from "@minecraft/server";
import { equipped } from "./shop.js";

const TAG = "kr_pet";
const NUDGE = 2.5, WARP = 14, HOVER = 1.8;
const pets = new Map(); // playerId -> { entity, id }

function removePet(pid) {
  const d = pets.get(pid); if (!d) return;
  try { d.entity.remove(); } catch (e) {}
  pets.delete(pid);
}

world.afterEvents.entityHurt.subscribe(ev => {
  try { if (!ev.hurtEntity.hasTag(TAG)) return; const h = ev.hurtEntity.getComponent("minecraft:health"); h?.setCurrentValue(h.effectiveMax); } catch (e) {}
});
world.afterEvents.playerLeave.subscribe(ev => removePet(ev.playerId));

system.runInterval(() => {
  for (const p of world.getAllPlayers()) {
    const it = equipped(p, "pet");
    let d = pets.get(p.id);
    if (!it) { removePet(p.id); continue; }
    if (d && (d.id !== it.id || !d.entity.isValid)) { removePet(p.id); d = null; }
    if (!d) {
      try {
        const e = p.dimension.spawnEntity(it.entity, p.location);
        e.addTag(TAG); e.nameTag = `§7${p.name}の${it.label}`;
        pets.set(p.id, { entity: e, id: it.id });
      } catch (e) {}
      continue;
    }
    const e = d.entity;
    try {
      if (e.dimension.id !== p.dimension.id) { e.teleport(p.location, { dimension: p.dimension }); continue; }
      const l = p.location, t = { x: l.x, y: l.y + (it.flying ? HOVER : 0), z: l.z }, el = e.location;
      const dx = t.x - el.x, dy = t.y - el.y, dz = t.z - el.z, dist = Math.hypot(dx, dy, dz);
      if (dist > WARP) { e.teleport(t); continue; }
      if (dist > NUDGE) {
        const sp = Math.min(0.5, dist * 0.06);
        e.applyImpulse({ x: (dx / dist) * sp, y: it.flying ? 0 : (dy > 0.5 ? 0.15 : 0), z: (dz / dist) * sp });
      }
      if (it.flying) e.applyImpulse({ x: 0, y: Math.max(-0.1, Math.min(0.1, dy * 0.05)), z: 0 });
      if (it.ambient && Math.random() < 0.4) e.dimension.spawnParticle(it.ambient, { x: el.x + (Math.random() - 0.5) * 0.6, y: el.y + 0.4 + Math.random() * 0.5, z: el.z + (Math.random() - 0.5) * 0.6 });
    } catch (err) {}
  }
}, 5);

// 誰にもついていないペットを片付ける(ワールドを開き直した時の残りなど)
system.runInterval(() => {
  const keep = new Set([...pets.values()].map(d => d.entity.id));
  for (const id of ["overworld", "nether", "the_end"]) {
    let found = []; try { found = world.getDimension(id).getEntities({ tags: [TAG] }); } catch (e) {}
    for (const e of found) if (!keep.has(e.id)) { try { e.remove(); } catch (err) {} }
  }
}, 100);
