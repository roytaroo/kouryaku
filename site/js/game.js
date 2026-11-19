/* ===== 王道コマンドRPG『Echoes of Aster』の本体 =====
   画面：上にマップ（キャンバス、16pxタイルを2倍＝1マス32px、11×9マス）、下に操作パネル。
   モード：walk（歩く）／talk（会話・場面）／battle（戦闘）／menu（メニュー）／shop（お店・宿屋）
   セーブ：S.rpg.game（マップ移動・場面のあと・戦闘のあと・宿屋・宝箱・お店・メニューから） */
const GV = { W: 11, H: 9, TS: 32 };
let G = null;          // 動いている間の状態
const GIMG = {};       // 画像

/* ---------- データ ---------- */
function gHero(id, lv = 1) {
  const d = GHEROES[id], h = { id, lv, exp: lv > 1 ? gNeed(lv - 1) : 0, eq: { ...d.eq } };
  const s = gStats(h); h.hp = s.hp; h.mp = s.mp; return h;
}
function gStats(h) {
  const d = GHEROES[h.id], s = {};
  for (const k of Object.keys(d.base)) s[k] = d.base[k] + d.grow[k] * (h.lv - 1);
  for (const slot of ["w", "a"]) { const e = GEQUIP[h.eq[slot]]; if (e) for (const k of ["atk", "def", "mag"]) if (e[k]) s[k] += e[k]; }
  return s;
}
function gSkills(h) {
  const out = [];
  for (const sk of GHEROES[h.id].skills) {
    if (h.lv < sk.lv) continue;
    if (sk.id) { out.push(sk.id); continue; }
    let cur = sk.line[0]; while (GSKILLS[cur].evo && h.lv >= GSKILLS[cur].evo.lv) cur = GSKILLS[cur].evo.to; out.push(cur);
  }
  return out;
}
function gNewGame() { return { ver: 1, map: "station", x: 7, y: 5, dir: 0, gold: 30, party: [gHero("ren")], bag: { herb: 2 }, gear: {}, flags: {}, chests: {}, steps: 0, safe: ["station", 7, 5] }; }
function gLoad() { const s = S.rpg && S.rpg.game; return s ? JSON.parse(JSON.stringify(s)) : null; }
function gSave(quiet) {
  if (!G || !ready()) return;
  const snap = JSON.parse(JSON.stringify(G.st));
  G.lastSave = snap;
  patchDoc("rpg", v => { v.game = snap; v.story = v.story || RPG_STORY; v.cleared = G.cleared; }).catch(() => {});
  if (!quiet) gToast("セーブした");
}

/* ---------- 画像 ---------- */
function gLoadImages() {
  if (GIMG.tiles) return;
  const A = typeof GAME_ART !== "undefined" ? GAME_ART : {};
  const mk = src => { const im = new Image(); im.src = src; return im; };
  GIMG.tiles = mk(A.tiles || "");
  GIMG.walk = {}; for (const k in (A.walk || {})) GIMG.walk[k] = mk(A.walk[k]);
  GIMG.etc = {}; for (const k in (A.etc || {})) GIMG.etc[k] = mk(A.etc[k]);
}

/* ---------- マップ ---------- */
function gEnterMap(id, x, y, dir) {
  const def = GMAPS[id], m = def.build();
  if (typeof x === "string") { const sp = (m.spots && m.spots[x]) || [1, 1]; x = sp[0]; y = sp[1]; }
  G.map = m; G.def = def; G.st.map = id; G.st.x = x; G.st.y = y; if (dir != null) G.st.dir = dir;
  G.px = x; G.py = y; G.moving = null; G.encLeft = def.enc ? gEncSteps() : 0;
  // 地面を先に1枚の絵にしておく
  const cv = document.createElement("canvas"); cv.width = m.w * GV.TS; cv.height = m.h * GV.TS;
  const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  const draw = () => { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) for (const t of m.cells[j * m.w + i]) c.drawImage(GIMG.tiles, (t % 8) * 16, Math.floor(t / 8) * 16, 16, 16, i * GV.TS, j * GV.TS, GV.TS, GV.TS); };
  if (GIMG.tiles.complete) draw(); else GIMG.tiles.onload = draw;
  G.ground = cv;
  const spot = a => (m.spots && m.spots[a]) || [1, 1], cs = (m.spots && m.spots.chest) || [];
  G.npcs = (def.npcs || []).filter(n => !(n.hideIf && G.st.flags[n.hideIf])).map(n => n.at ? { ...n, x: spot(n.at)[0], y: spot(n.at)[1] } : { ...n });
  G.chests = (def.chests || []).map(c => c.at != null ? (cs[c.at] ? { ...c, x: cs[c.at][0], y: cs[c.at][1] } : null) : c).filter(Boolean);
  G.events = (def.events || []).map(e => e.at ? { ...e, ax: spot(e.at)[0], ay: spot(e.at)[1] } : e);
  if (def.intro && !G.st.flags["seen_" + def.intro] && !G.pendingScene) G.pendingScene = def.intro;
  $("gMapName").textContent = def.ja;
}
const gEncSteps = () => 10 + Math.floor(Math.random() * (G.def.enc.rate || 14));
function gChestAt(x, y) { return (G.chests || []).find(c => c.x === x && c.y === y); }
function gNpcAt(x, y) { return G.npcs.find(n => n.x === x && n.y === y); }
function gBlocked(x, y) {
  const m = G.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  return m.solid[y * m.w + x] || !!gNpcAt(x, y) || !!gChestAt(x, y);
}

/* ---------- 描画 ---------- */
function gDraw(t) {
  const cv = $("gCanvas"); if (!cv || !G) return; const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
  const m = G.map, TS = GV.TS, vw = GV.W * TS, vh = GV.H * TS;
  let fx = G.px, fy = G.py;
  if (G.moving) { const k = Math.min(1, (t - G.moving.t0) / G.moving.dur); fx = G.moving.fx + (G.moving.tx - G.moving.fx) * k; fy = G.moving.fy + (G.moving.ty - G.moving.fy) * k; }
  const mw = m.w * TS, mh = m.h * TS;
  let cx = fx * TS + TS / 2 - vw / 2, cy = fy * TS + TS / 2 - vh / 2;
  cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx)); cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy));
  c.fillStyle = "#0b0d12"; c.fillRect(0, 0, vw, vh);
  c.drawImage(G.ground, -Math.round(cx), -Math.round(cy));
  const sprites = [];
  for (const p of (G.def.props || [])) sprites.push({ y: p.y, draw: () => { const im = GIMG.etc[p.sprite]; if (im) c.drawImage(im, (Math.floor(t / 160) % 3) * 32, 32, 32, 32, p.x * TS - cx, p.y * TS - cy, TS, TS); } });
  for (const ch of (G.chests || [])) sprites.push({ y: ch.y, draw: () => { const im = GIMG.etc.chest; if (im) c.drawImage(im, (ch.eq ? 2 : 0) * 32, (G.st.chests[ch.id] ? 2 : 0) * 32, 32, 32, ch.x * TS - cx, ch.y * TS - cy, TS, TS); } });
  for (const n of G.npcs) sprites.push({ y: n.y, draw: () => gDrawChar(c, n.sprite, n.dir, 1, n.x * TS - cx, n.y * TS - cy) });
  const frame = G.moving ? [0, 1, 2, 1][Math.floor(t / 110) % 4] : 1;
  sprites.push({ y: fy, draw: () => gDrawChar(c, "ren", G.st.dir, frame, fx * TS - cx, fy * TS - cy) });
  sprites.sort((a, b) => a.y - b.y).forEach(s => s.draw());
  if (G.fade) { c.fillStyle = `rgba(0,0,0,${G.fade})`; c.fillRect(0, 0, vw, vh); }
}
function gDrawChar(c, key, dir, frame, x, y) { const im = GIMG.walk[key]; if (!im || !im.complete) return; c.drawImage(im, frame * 32, dir * 32, 32, 32, Math.round(x), Math.round(y) - 4, 32, 32); }

/* ---------- 毎フレーム ---------- */
const GDIR = { down: [0, 1, 0], left: [-1, 0, 1], right: [1, 0, 2], up: [0, -1, 3] };
function gLoop(t) {
  if (!G || !G.open) return;
  if (G.moving && t - G.moving.t0 >= G.moving.dur) { G.px = G.moving.tx; G.py = G.moving.ty; G.st.x = G.px; G.st.y = G.py; G.moving = null; gOnStep(); }
  if (!G.moving && G.mode === "walk" && G.held && !G.busy) gTryMove(G.held, t);
  gDraw(t);
  requestAnimationFrame(gLoop);
}
function gTryMove(dname, t) {
  const [dx, dy, d] = GDIR[dname]; G.st.dir = d;
  const nx = G.px + dx, ny = G.py + dy, m = G.map;
  if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) { const ev = G.events.find(e => (e.top && ny < 0) || (e.bottom && ny >= m.h) || (e.left && nx < 0) || (e.right && nx >= m.w)); if (ev) gRunEvent(ev); return; }
  if (gBlocked(nx, ny)) return;
  G.moving = { fx: G.px, fy: G.py, tx: nx, ty: ny, t0: t, dur: 150 };
}
function gOnStep() {
  G.st.steps++;
  const evs = G.events.filter(e => (e.x === G.px && e.y === G.py) || (e.rowLE != null && G.py <= e.rowLE && !(e.once && G.st.flags[e.once])) || (e.ax != null && Math.abs(e.ax - G.px) + Math.abs(e.ay - G.py) <= (e.r || 0) && !(e.once && G.st.flags[e.once])));
  for (const ev of evs) { gRunEvent(ev); return; }
  if (G.def.enc && --G.encLeft <= 0) { G.encLeft = gEncSteps(); const grp = GAREAS[G.def.enc.area]; gBattle(grp[Math.floor(Math.random() * grp.length)], null); }
}
function gRunEvent(ev) {
  if (ev.need && !G.st.flags[ev.need]) { if (ev.block) gTalk(GLINES[ev.block]); G.held = null; return; }
  if (ev.scene) { if (ev.once) G.st.flags[ev.once] = 1; G.held = null; return gScene(ev.scene); }
  if (ev.door === "inn") return gInn();
  if (ev.door && GSHOPS[ev.door]) return gShop(ev.door);
  if (ev.look) return gTalk(GLINES[ev.look]);
  if (ev.to) { G.held = null; return gWarp(...ev.to); }
}
function gWarp(map, x, y, dir) {
  G.busy = true; G.fade = 0; const t0 = performance.now();
  const step = t => { const k = (t - t0) / 220; if (k < 1) { G.fade = k; requestAnimationFrame(step); return; } gEnterMap(map, x, y, dir); const t1 = performance.now(); const back = t2 => { const k2 = (t2 - t1) / 220; G.fade = Math.max(0, 1 - k2); if (k2 < 1) requestAnimationFrame(back); else { G.fade = 0; G.busy = false; gSave(true); gAfterWarp(); } }; requestAnimationFrame(back); };
  requestAnimationFrame(step);
}
function gAfterWarp() { if (G.pendingScene) { const s = G.pendingScene; G.pendingScene = null; gScene(s); } else if (G.pendingTalk) { const n = G.pendingTalk; G.pendingTalk = null; gTalk(n); } }
function gInteract() {
  if (G.mode !== "walk" || G.moving || G.busy) return;
  const [dx, dy] = Object.values(GDIR).find(v => v[2] === G.st.dir), tx = G.px + dx, ty = G.py + dy;
  const npc = gNpcAt(tx, ty);
  if (npc) { npc.dir = [3, 2, 1, 0][G.st.dir]; if (npc.talk && !G.st.flags["seen_" + npc.talk]) return gScene(npc.talk); return gTalk(GLINES[npc.lines] || [{ who: null, en: "...", ja: "……" }]); }
  const ch = gChestAt(tx, ty);
  if (ch) return gOpenChest(ch);
  const ev = G.events.find(e => e.x === tx && e.y === ty && e.look);
  if (ev) return gTalk(GLINES[ev.look]);
}
function gOpenChest(ch) {
  if (G.st.chests[ch.id]) return gTalk([{ who: null, en: "The chest is empty.", ja: "宝箱はからっぽだ。" }]);
  G.st.chests[ch.id] = 1; sfx("coin");
  let en, ja;
  if (ch.item) { G.st.bag[ch.item] = (G.st.bag[ch.item] || 0) + (ch.n || 1); const it = GITEMS[ch.item]; en = `Ren found ${ch.n || 1} × ${it.name}!`; ja = `${it.ja}を${ch.n || 1}つ手に入れた！`; }
  else if (ch.eq) { G.st.gear[ch.eq] = (G.st.gear[ch.eq] || 0) + 1; const e = GEQUIP[ch.eq]; en = `Ren found the ${e.name}!`; ja = `${e.ja}を手に入れた！（メニューの「そうび」で装備できる）`; }
  else { G.st.gold += ch.gold; en = `Ren found ${ch.gold} gold!`; ja = `${ch.gold}ゴールドを手に入れた！`; }
  gSave(true); gTalk([{ who: null, en, ja }]);
}

/* ---------- 会話・場面 ---------- */
function gCast(who) { return (who && (RPG_CAST[who] || GEXTRA_CAST[who])) || null; }
function gScene(id) {
  const nodes = GSCENES[id]();
  G.st.flags["seen_" + id] = 1;
  gTalk(nodes, () => gSceneDone(id));
}
function gTalk(nodes, done) {
  G.mode = "talk"; G.held = null; G.talk = { nodes, i: 0, done, ja: false, cg: null };
  gTalkResolve(); gRenderPanel();
}
function gTalkResolve() {
  const T = G.talk, at = l => T.nodes.findIndex(n => n.label === l);
  for (let g = 0; g < 200; g++) {
    const n = T.nodes[T.i]; if (!n) return;
    if (n.label != null) T.i++;
    else if (n.if != null) T.i = G.st.flags[n.if] ? at(n.go) : T.i + 1;
    else if (n.go) T.i = at(n.go);
    else break;
  }
  const n = T.nodes[T.i]; if (n && n.bg) T.cg = n.bg.startsWith("cg_") ? n.bg : null;
}
function gTalkNext() {
  const T = G.talk, n = T.nodes[T.i];
  if (n && n.flag) G.st.flags[n.flag] = 1;
  T.i++; T.ja = false; gTalkResolve();
  const m = T.nodes[T.i];
  if (!m) { const done = T.done; G.talk = null; G.mode = "walk"; gRenderPanel(); gOver(); if (done) done(); return; }
  if (m.battle) { const key = GBOSS_OF[m.battle.name]; T.i++; return gBattle([key], () => { gTalkResolve(); G.mode = "talk"; gRenderPanel(); gOver(); }); }
  sfx("tap"); gRenderPanel();
}
function gRefreshNpcs() { G.npcs = G.npcs.filter(n => !(n.hideIf && G.st.flags[n.hideIf])); }
function gSceneDone(id) {
  const f = G.st.flags;
  const D = typeof GDONE2 !== "undefined" && GDONE2[id];
  if (D) {
    if (D.flag) f[D.flag] = 1;
    if (D.join && !G.st.party.some(h => h.id === D.join)) G.st.party.push(gHero(D.join, Math.max(...G.st.party.map(h => h.lv))));
    if (D.clear) gMarkClear(D.clear);
    gRefreshNpcs(); gSave(true);
    if (D.ending) { G.pendingScene = "ep_all"; return gWarp("station", 7, 5, 0); }
    if (D.msg) return gTalk([{ who: null, en: D.msg[0], ja: D.msg[1] }]);
    return;
  }
  if (id === "ep_all") {
    f.ending = 1; gMarkClear("ep"); for (const h of G.st.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; }
    G.pendingTalk = [{ who: null, en: "Thank you for playing. You can keep exploring Aster.", ja: "クリアおめでとう！　このあとも、王都から各地を歩いて、レベル上げや図鑑のモンスター集めができる。" }];
    return gWarp("capital", 12, 15, 0);
  }
  if (id === "p0_station") { G.pendingScene = null; return gWarp("train", 1, 4, 2); }
  if (id === "p0_train") { gMarkClear("p0"); G.pendingScene = "c1_intro"; return gWarp("village", 12, 15, 3); }
  if (id === "c1_intro") { f.lina_joined = 1; const lv = G.st.party[0].lv; G.st.party.push(gHero("lina", lv)); G.st.safe = ["village", 12, 15]; G.npcs = G.npcs.filter(n => n.id !== "lina"); gSave(true); return gTalk([{ who: null, en: "Lina joined the party!", ja: "リナが仲間になった！　まずは青い屋根の家にいるブラム長老をたずねよう。宿屋・武器屋・道具屋もある。" }]); }
  if (id === "c1_cellar") return gScene("c1_night");
  if (id === "c1_night") { f.c1_done = 1; gMarkClear("c1"); gSave(true); return gTalk([{ who: null, en: "The road to the north is now open.", ja: "第1章クリア！　北の森へ行けるようになった。森には魔物が出る。武器や防具をそろえて、レベルを上げながら進もう。" }]); }
  if (id === "c2_forest") { gSave(true); return; }
  if (id === "c2_knight") { f.c2_done = 1; gMarkClear("c2"); G.npcs = G.npcs.filter(n => n.id !== "knight"); gSave(true); return gTalk([{ who: null, en: "The gate behind the knight is open.", ja: "第2章クリア！　騎士が守っていた奥の門から、水晶の洞窟へ進める。" }]); }
}
function gMarkClear(id) { G.cleared = G.cleared || []; if (!G.cleared.includes(id)) { G.cleared.push(id); setTimeout(() => { sfx("done"); toast("章クリア！小判＋" + RPG_CLEAR_KOBAN); }, 200); } }

/* ---------- 戦闘 ---------- */
function gBattle(keys, onWin) {
  G.mode = "battle"; G.held = null; sfx("bell");
  const foes = keys.map((k, i) => { const d = GFOES[k]; return { k, d, hp: d.hp, max: d.hp, alive: true, i }; });
  G.B = { foes, onWin, boss: foes.some(f => f.d.boss), actor: 0, acts: [], phase: "cmd", log: [], sub: null };
  gNextActor(); gOver(); gRenderPanel();
}
const gAlive = () => G.st.party.filter(h => h.hp > 0);
function gNextActor() { const B = G.B; while (B.actor < G.st.party.length && G.st.party[B.actor].hp <= 0) B.actor++; if (B.actor >= G.st.party.length) gResolve(); else { B.phase = "cmd"; B.sub = null; } }
function gChoose(act) { const B = G.B; B.acts.push({ ...act, who: B.actor }); B.actor++; gNextActor(); gRenderPanel(); gOver(); }
function gDmg(atk, def, pow) { return Math.max(1, Math.round((atk * pow - def / 2) * (0.88 + Math.random() * 0.24))); }
function gResolve() {
  const B = G.B; B.phase = "anim"; const P = G.st.party, msgs = [];
  const order = [...B.acts.map(a => ({ ...a, side: "h", spd: gStats(P[a.who]).spd + Math.random() * 4 })), ...B.foes.filter(f => f.alive).map(f => ({ side: "f", f, spd: f.d.spd + Math.random() * 4 }))].sort((a, b) => b.spd - a.spd);
  for (const a of order) {
    if (B.foes.every(f => !f.alive) || gAlive().length === 0) break;
    if (a.side === "h") {
      const h = P[a.who]; if (h.hp <= 0) continue; const s = gStats(h), nm = GHEROES[h.id].name;
      const pickFoe = () => { let f = B.foes[a.t]; if (!f || !f.alive) f = B.foes.find(x => x.alive); return f; };
      if (a.type === "attack") { const f = pickFoe(); const crit = Math.random() < 0.07; const d = gDmg(s.atk, f.d.def, crit ? 1.8 : 1); f.hp -= d; msgs.push({ en: `${nm} attacks! ${crit ? "Critical hit! " : ""}${d} damage to ${f.d.name}.`, ja: `${GHEROES[h.id].ja}の攻撃！${crit ? "会心の一撃！" : ""}${f.d.ja}に${d}のダメージ。`, hit: f.i, fx: crit ? "crit" : "hit" }); if (f.hp <= 0) { f.alive = false; msgs.push({ en: `${f.d.name} was defeated!`, ja: `${f.d.ja}をたおした！`, down: f.i }); } }
      else if (a.type === "skill") {
        const sk = GSKILLS[a.sk]; if (h.mp < sk.mp) { msgs.push({ en: `${nm} doesn't have enough MP.`, ja: `MPが足りない！` }); continue; }
        h.mp -= sk.mp; const skn = sk.name;
        if (sk.word && !a.ok) { msgs.push({ en: `${nm} used ${skn}... but the words were wrong. Nothing happened.`, ja: `${GHEROES[h.id].ja}の${sk.ja}！……しかし言葉がまちがっていた。何も起こらない。` }); continue; }
        if (sk.kind === "heal" || sk.kind === "healall") {
          const tgts = sk.kind === "healall" ? gAlive() : [P[a.t] && P[a.t].hp > 0 ? P[a.t] : h];
          for (const tg of tgts) { const st = gStats(tg), amt = Math.round(s.mag * sk.pow + 8); tg.hp = Math.min(st.hp, tg.hp + amt); msgs.push({ en: `${nm} cast ${skn}. ${GHEROES[tg.id].name} recovered ${amt} HP.`, ja: `${GHEROES[h.id].ja}の${sk.ja}！${GHEROES[tg.id].ja}のHPが${amt}回復した。`, heal: 1 }); }
        } else {
          const tgts = (sk.kind === "magall" || sk.kind === "atkall") ? B.foes.filter(f => f.alive) : [pickFoe()];
          const phys = sk.kind === "atk" || sk.kind === "atkall", pw = phys ? s.atk : s.mag;
          msgs.push({ en: `${nm} used ${skn}!`, ja: `${GHEROES[h.id].ja}の${sk.ja}！`, fx: "magic" });
          for (const f of tgts) { const d = gDmg(pw, phys ? f.d.def : f.d.def * 0.5, sk.pow); f.hp -= d; msgs.push({ en: `${d} damage to ${f.d.name}.`, ja: `${f.d.ja}に${d}のダメージ。`, hit: f.i, fx: "crit" }); if (f.hp <= 0) { f.alive = false; msgs.push({ en: `${f.d.name} was defeated!`, ja: `${f.d.ja}をたおした！`, down: f.i }); } }
        }
      } else if (a.type === "item") {
        const it = GITEMS[a.it], tg = P[a.t] || h; if (!(G.st.bag[a.it] > 0)) continue; G.st.bag[a.it]--;
        const st = gStats(tg);
        if (it.revive) { if (tg.hp > 0) { msgs.push({ en: `It had no effect.`, ja: `効果がなかった。` }); continue; } tg.hp = Math.round(st.hp * it.revive); msgs.push({ en: `${GHEROES[tg.id].name} was revived!`, ja: `${GHEROES[tg.id].ja}が生き返った！`, heal: 1 }); }
        else if (tg.hp <= 0) msgs.push({ en: `It had no effect.`, ja: `効果がなかった。` });
        else if (it.heal) { tg.hp = Math.min(st.hp, tg.hp + it.heal); msgs.push({ en: `${nm} used a ${it.name}. ${GHEROES[tg.id].name} recovered HP.`, ja: `${GHEROES[h.id].ja}は${it.ja}を使った。${GHEROES[tg.id].ja}のHPが回復した。`, heal: 1 }); }
        else if (it.mp) { tg.mp = Math.min(st.mp, tg.mp + it.mp); msgs.push({ en: `${GHEROES[tg.id].name} recovered MP.`, ja: `${GHEROES[tg.id].ja}のMPが回復した。`, heal: 1 }); }
      } else if (a.type === "run") {
        if (B.boss) { msgs.push({ en: `There is no escape!`, ja: `にげられない！` }); continue; }
        if (Math.random() < 0.7) { msgs.push({ en: `The party ran away!`, ja: `うまくにげきれた！`, ran: 1 }); B.ran = true; break; }
        msgs.push({ en: `Couldn't escape!`, ja: `にげられなかった！` });
      }
    } else {
      const f = a.f; if (!f.alive) continue; const al = gAlive(); if (!al.length) break;
      const tg = al[Math.floor(Math.random() * al.length)], st = gStats(tg), heavy = f.d.boss && Math.random() < 0.28;
      const d = gDmg(f.d.atk, st.def, heavy ? 1.6 : 1); tg.hp = Math.max(0, tg.hp - d);
      msgs.push({ en: `${f.d.name} ${heavy ? "unleashes a crushing blow" : "attacks"}! ${GHEROES[tg.id].name} takes ${d} damage.`, ja: `${f.d.ja}の${heavy ? "痛恨の一撃" : "攻撃"}！${GHEROES[tg.id].ja}は${d}のダメージを受けた。`, hurt: 1 });
      if (tg.hp <= 0) msgs.push({ en: `${GHEROES[tg.id].name} collapsed!`, ja: `${GHEROES[tg.id].ja}はたおれた！`, hurt: 1 });
    }
  }
  B.acts = []; B.queue = msgs; gPlayMsgs();
}
function gPlayMsgs() {
  const B = G.B; const m = B.queue.shift();
  if (!m) return gAfterRound();
  B.msg = m; if (m.hit != null) { B.fx = { i: m.hit, kind: m.fx || "hit", t: Date.now() }; sfx(m.fx === "crit" ? "coin" : "tap"); } else if (m.hurt) { B.fx = { hurt: true, t: Date.now() }; sfx("ng"); } else if (m.heal) sfx("ok");
  gOver(); gRenderPanel();
  clearTimeout(B.timer); B.timer = setTimeout(gPlayMsgs, m.down != null ? 900 : 1050);
}
function gAfterRound() {
  const B = G.B;
  if (B.ran) return gEndBattle(false, true);
  if (B.foes.every(f => !f.alive)) return gWin();
  if (gAlive().length === 0) return gLose();
  B.actor = 0; B.msg = null; gNextActor(); gOver(); gRenderPanel();
}
function gWin() {
  const B = G.B, exp = B.foes.reduce((a, f) => a + f.d.exp, 0), gold = B.foes.reduce((a, f) => a + f.d.gold, 0), msgs = [];
  G.st.gold += gold; msgs.push({ en: `Victory! Gained ${exp} EXP and ${gold} gold.`, ja: `たたかいに勝った！ 経験値${exp}と${gold}ゴールドを手に入れた。` });
  const dexNew = B.foes.filter(f => f.d.mon).map(f => f.d.mon);
  for (const h of G.st.party) {
    if (h.hp <= 0) continue; const before = gSkills(h); h.exp += exp;
    while (h.exp >= gNeed(h.lv)) {
      const old = gStats(h); h.lv++; const nw = gStats(h); h.hp += nw.hp - old.hp; h.mp += nw.mp - old.mp;
      msgs.push({ en: `${GHEROES[h.id].name} reached level ${h.lv}!`, ja: `${GHEROES[h.id].ja}はレベル${h.lv}に上がった！`, lv: 1 });
    }
    const after = gSkills(h);
    for (const s of after) if (!before.includes(s)) { const from = before.find(b => GSKILLS[b].evo && GSKILLS[b].evo.to === s); msgs.push(from ? { en: `${GSKILLS[from].name} evolved into ${GSKILLS[s].name}!`, ja: `${GSKILLS[from].ja}が${GSKILLS[s].ja}に進化した！`, lv: 1 } : { en: `${GHEROES[h.id].name} learned ${GSKILLS[s].name}!`, ja: `${GHEROES[h.id].ja}は${GSKILLS[s].ja}をおぼえた！${GSKILLS[s].desc ? "（" + GSKILLS[s].desc + "）" : ""}`, lv: 1 }); }
  }
  if (!B.boss && Math.random() < 0.12) { G.st.bag.herb = (G.st.bag.herb || 0) + 1; msgs.push({ en: `The monster dropped a Healing Herb.`, ja: `魔物は薬草を落としていった。` }); }
  B.phase = "result"; B.queue = msgs; B.dexNew = dexNew; sfx("done");
  const play = () => { const m = B.queue.shift(); if (!m) { B.msg = null; return gEndBattle(true); } B.msg = m; if (m.lv) sfx("bell"); gRenderPanel(); gOver(); B.resultNext = play; };
  play();
}
function gLose() {
  const B = G.B; B.phase = "lose"; B.msg = { en: "The party has fallen...", ja: "全滅してしまった……。最後に休んだ場所からやり直す。お金は半分になる。" }; sfx("ng"); gRenderPanel(); gOver();
}
function gEndBattle(won, ran) {
  const B = G.B; G.B = null;
  if (won && B.dexNew && B.dexNew.length && ready()) { const dex = { ...(S.rpg.dex || {}) }; for (const n of B.dexNew) dex[n] = (dex[n] || 0) + 1; patchDoc("rpg", v => { v.dex = dex; }).catch(() => {}); }
  G.mode = "walk"; gOver(); gRenderPanel(); gSave(true);
  if (won && B.onWin) B.onWin();
}
function gRetry() {
  const snap = G.lastSave ? JSON.parse(JSON.stringify(G.lastSave)) : gLoad() || gNewGame();
  snap.gold = Math.floor(G.st.gold / 2);
  for (const h of snap.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; }
  G.st = snap; G.B = null; G.talk = null; G.mode = "walk"; gEnterMap(snap.map, snap.x, snap.y, snap.dir); gOver(); gRenderPanel(); gSave(true);
}

/* ---------- 英単語の問題（ワード系の技） ---------- */
function gWordQ() { const qs = typeof rpgExQs === "function" ? rpgExQs().filter(q => q.jaOnly) : []; return qs[0] || null; }

/* ---------- 宿屋・お店・メニュー ---------- */
function gInn() { G.mode = "shop"; G.shop = { kind: "inn" }; G.held = null; gRenderPanel(); }
function gShop(kind) { G.mode = "shop"; G.shop = { kind }; G.held = null; gRenderPanel(); }
function gOpenMenu() { if (G.mode !== "walk" || G.busy) return; G.mode = "menu"; G.menu = { tab: "status" }; G.held = null; gRenderPanel(); }

/* ---------- 画面（パネル） ---------- */
function gToast(t) { toast(t); }
function gPartyBar() {
  return `<div class="g-party">${G.st.party.map(h => { const s = gStats(h); return `<div class="${h.hp <= 0 ? "ko" : h.hp < s.hp / 4 ? "low" : ""}"><b>${GHEROES[h.id].name}<small>Lv${h.lv}</small></b><span>HP ${h.hp}/${s.hp}</span><span>MP ${h.mp}/${s.mp}</span></div>`; }).join("")}</div>`;
}
function gTextBox(n, ja) {
  let c = gCast(n.who); const m = rpgMark(n.en);
  if (n.who === "ren" && G.st.flags.ren_coat && typeof RPG_FACE !== "undefined" && RPG_FACE.rentravel_neutral) c = { ...c, face: "rentravel" };
  return `<div class="g-win g-say" data-g="next" role="button" tabindex="0">
    <div class="g-head">${c ? `<span class="g-name">${esc(ja ? c.ja : c.name)}</span>` : "<span></span>"}<button type="button" class="g-tr${ja ? " on" : ""}" data-g="tr">訳</button></div>
    <div class="g-line">${rpgFace(c, n.face)}<p>${ja ? esc(n.ja) : m.html}</p></div>${ja && m.found.length ? `<div class="rpg-gloss">${m.found.map(w => `<span><b>${esc(w[0])}</b>${esc(rpgShort(w[1]))}</span>`).join("")}</div>` : ""}<i class="g-more">▼</i></div>`;
}
function gRenderPanel() {
  const P = $("gPanel"); if (!P || !G) return; let h = "";
  $("gGold").textContent = G.st.gold + "G";
  if (G.mode === "walk") {
    h = `<div class="g-ctrl"><div class="g-pad">${["up", "left", "right", "down"].map(d => `<button type="button" class="g-d ${d}" data-dir="${d}" aria-label="${d}"></button>`).join("")}<span class="g-c"></span></div>
      <div class="g-ab"><button type="button" class="g-a" data-g="a">A<small>しらべる</small></button><button type="button" class="g-b" data-g="menu">B<small>メニュー</small></button></div></div>${gPartyBar()}`;
  } else if (G.mode === "talk") {
    const T = G.talk, n = T.nodes[T.i];
    if (n && n.choice) h = `<div class="g-win"><div class="g-head"><span class="g-name">${T.ja ? "選択" : "Choice"}</span><button type="button" class="g-tr${T.ja ? " on" : ""}" data-g="tr">訳</button></div><p class="g-q">${esc(T.ja ? n.choice.ja : n.choice.en)}</p>
      <div class="g-list">${n.opts.map((o, k) => `<button type="button" data-g="opt" data-k="${k}">▶ ${esc(T.ja ? o.ja : o.en)}</button>`).join("")}</div></div>`;
    else if (n) h = gTextBox(n, T.ja);
  } else if (G.mode === "battle") h = gBattlePanel();
  else if (G.mode === "shop") h = gShopPanel();
  else if (G.mode === "menu") h = gMenuPanel();
  P.innerHTML = h;
}
function gBattlePanel() {
  const B = G.B; let h = gPartyBar();
  if (B.phase === "lose") return h + `<div class="g-win"><p class="g-msg">${esc(B.msg.ja)}</p><button type="button" class="g-big" data-g="retry">やり直す</button></div>`;
  if (B.msg) return h + `<div class="g-win g-log" data-g="${B.phase === "result" ? "rnext" : "skip"}" role="button"><p class="g-msg">${rpgMark(B.msg.en).html}</p><p class="g-msgja">${esc(B.msg.ja)}</p></div>`;
  const hero = G.st.party[B.actor]; if (!hero) return h;
  const nm = GHEROES[hero.id].ja;
  if (B.sub && B.sub.kind === "word") {
    const q = B.sub.q;
    return h + `<div class="g-win"><p class="g-q">${esc(GSKILLS[B.sub.sk].ja)}：${esc(q.en)}<small>${esc(q.ja)}</small></p><div class="g-grid">${q.opts.map((o, k) => `<button type="button" data-g="wans" data-k="${k}">${esc(o[1])}</button>`).join("")}</div></div>`;
  }
  if (B.sub && B.sub.kind === "target") {
    const list = B.sub.ally ? G.st.party.map((p, i) => [i, `${GHEROES[p.id].ja}（HP ${p.hp}）`]) : B.foes.filter(f => f.alive).map(f => [f.i, f.d.ja]);
    return h + `<div class="g-win"><p class="g-q">${B.sub.ally ? "だれに？" : "どの敵に？"}</p><div class="g-list">${list.map(([i, t]) => `<button type="button" data-g="tgt" data-k="${i}">▶ ${esc(t)}</button>`).join("")}<button type="button" data-g="back">もどる</button></div></div>`;
  }
  if (B.sub && B.sub.kind === "skills") {
    const sks = gSkills(hero);
    return h + `<div class="g-win"><p class="g-q">${nm}のとくぎ（MP ${hero.mp}）</p><div class="g-list">${sks.map(s => { const k = GSKILLS[s]; return `<button type="button" data-g="sk" data-k="${s}"${hero.mp < k.mp ? " disabled" : ""}>▶ ${esc(k.ja)} <small>${esc(k.name)}・MP${k.mp}${k.word ? "・英単語" : ""}</small></button>`; }).join("") || "<p class='g-msgja'>まだ覚えていない</p>"}<button type="button" data-g="back">もどる</button></div></div>`;
  }
  if (B.sub && B.sub.kind === "items") {
    const its = Object.entries(G.st.bag).filter(([, n]) => n > 0);
    return h + `<div class="g-win"><p class="g-q">どうぐ</p><div class="g-list">${its.map(([k, n]) => `<button type="button" data-g="it" data-k="${k}">▶ ${esc(GITEMS[k].ja)} ×${n} <small>${esc(GITEMS[k].desc)}</small></button>`).join("") || "<p class='g-msgja'>何も持っていない</p>"}<button type="button" data-g="back">もどる</button></div></div>`;
  }
  return h + `<div class="g-win"><p class="g-q">${nm}はどうする？</p><div class="g-grid"><button type="button" data-g="cmd" data-k="attack">たたかう</button><button type="button" data-g="cmd" data-k="skills">とくぎ</button><button type="button" data-g="cmd" data-k="items">どうぐ</button><button type="button" data-g="cmd" data-k="run">にげる</button></div></div>`;
}
function gShopPanel() {
  const sh = G.shop, st = G.st;
  if (sh.kind === "inn") return `<div class="g-win"><p class="g-q">「旅の方、ようこそ。ひと晩${GINN_PRICE}ゴールドだよ。泊まっていくかい？」<small>"Welcome, traveler. A night costs ${GINN_PRICE} gold. Will you stay?"</small></p><div class="g-grid"><button type="button" data-g="inn">泊まる（${GINN_PRICE}G）</button><button type="button" data-g="leave">やめる</button></div></div>`;
  const list = GSHOPS[sh.kind];
  return `<div class="g-win"><p class="g-q">${sh.kind === "armory" ? "武器と防具の店" : "道具屋"}　<small>所持金 ${st.gold}G</small></p><div class="g-list">${list.map(k => {
    const e = GEQUIP[k], it = GITEMS[k], o = e || it, info = e ? `${e.who === "ren" ? "レン" : "リナ"}用 ${e.atk ? "攻+" + e.atk : ""}${e.def ? "守+" + e.def : ""}${e.mag ? " 魔+" + e.mag : ""}` : it.desc;
    const own = e ? (st.gear[k] || 0) + st.party.filter(p => p.eq.w === k || p.eq.a === k).length : (st.bag[k] || 0);
    return `<button type="button" data-g="buy" data-k="${k}"${st.gold < o.price ? " disabled" : ""}>▶ ${esc(o.ja)} <b>${o.price}G</b><small>${esc(info)}・持っている数 ${own}</small></button>`;
  }).join("")}<button type="button" data-g="leave">店を出る</button></div></div>`;
}
function gMenuPanel() {
  const st = G.st, tab = G.menu.tab;
  const tabs = `<div class="g-tabs">${[["status", "つよさ"], ["items", "どうぐ"], ["equip", "そうび"], ["save", "セーブ"]].map(([k, l]) => `<button type="button" data-g="tab" data-k="${k}" aria-pressed="${tab === k}">${l}</button>`).join("")}<button type="button" data-g="leave">とじる</button></div>`;
  let body = "";
  if (tab === "status") body = st.party.map(h => { const s = gStats(h); return `<div class="g-stat"><b>${GHEROES[h.id].ja}　Lv${h.lv}</b><span>HP ${h.hp}/${s.hp}　MP ${h.mp}/${s.mp}</span><span>攻撃 ${s.atk}　守備 ${s.def}　魔力 ${s.mag}　素早さ ${s.spd}</span><span>次のレベルまで ${gNeed(h.lv) - h.exp}</span><span>とくぎ：${gSkills(h).map(k => GSKILLS[k].ja).join("・") || "なし"}</span></div>`; }).join("");
  if (tab === "items") { const its = Object.entries(st.bag).filter(([, n]) => n > 0); body = its.length ? its.map(([k, n]) => `<div class="g-row"><span>${esc(GITEMS[k].ja)} ×${n}<small>${esc(GITEMS[k].desc)}</small></span>${GITEMS[k].revive ? "" : st.party.map((p, i) => `<button type="button" data-g="use" data-k="${k}" data-t="${i}">${GHEROES[p.id].ja}に</button>`).join("")}</div>`).join("") : "<p class='g-msgja'>何も持っていない</p>"; }
  if (tab === "equip") body = st.party.map((p, i) => ["w", "a"].map(slot => { const cur = GEQUIP[p.eq[slot]]; const opts = Object.keys(GEQUIP).filter(k => GEQUIP[k].who === p.id && GEQUIP[k].slot === slot && (st.gear[k] > 0)); return `<div class="g-row"><span>${GHEROES[p.id].ja}の${slot === "w" ? "武器" : "防具"}：<b>${esc(cur ? cur.ja : "なし")}</b></span>${opts.map(k => `<button type="button" data-g="eq" data-k="${k}" data-t="${i}">${esc(GEQUIP[k].ja)}に</button>`).join("")}</div>`; }).join("")).join("");
  if (tab === "save") body = `<p class="g-msgja">マップを移動したときや、戦闘・宿屋のあとに自動でセーブされる。今すぐセーブもできる。</p><button type="button" class="g-big" data-g="save">今すぐセーブ</button><p class="g-msgja">モンスター・アイテムの絵：モケモ／マップ・キャラ：ぴぽや</p>`;
  return `<div class="g-win">${tabs}<div class="g-menubody">${body}</div></div>`;
}

/* ---------- 戦闘とCGの絵（キャンバスの上） ---------- */
function gOver() {
  const o = $("gOver"); if (!o || !G) return;
  if (G.mode === "battle" && G.B) {
    const B = G.B, bg = (typeof RPG_BG !== "undefined" && RPG_BG[G.def.bg]) || "";
    const fx = B.fx && Date.now() - B.fx.t < 600 ? B.fx : null;
    o.className = "g-over battle" + (fx && fx.hurt ? " hurt" : "");
    o.style.backgroundImage = bg ? `url('${bg}')` : "";
    o.innerHTML = `<div class="g-foes">${B.foes.map(f => { const src = (f.d.foe && typeof RPG_FOE !== "undefined" && RPG_FOE[f.d.foe]) || rpgMonSrc(f.d.mon); return `<div class="g-foe${f.alive ? "" : " down"}${fx && fx.i === f.i ? " " + fx.kind : ""}${f.d.boss ? " boss" : ""}"><img src="${src}" alt=""><span>${esc(f.d.name)}</span></div>`; }).join("")}</div>`;
    return;
  }
  const cg = G.mode === "talk" && G.talk && G.talk.cg;
  if (cg && typeof RPG_BG !== "undefined" && RPG_BG[cg]) { o.className = "g-over cg"; o.style.backgroundImage = `url('${RPG_BG[cg]}')`; o.innerHTML = ""; return; }
  o.className = "g-over"; o.style.backgroundImage = ""; o.innerHTML = "";
}

/* ---------- 操作 ---------- */
function gClick(e) {
  const b = e.target.closest("[data-g]"); if (!b || b.disabled || !G) return;
  const k = b.dataset.g, v = b.dataset.k, st = G.st;
  if (k === "a") return gInteract();
  if (k === "menu") return gOpenMenu();
  if (k === "tr") { e.stopPropagation(); G.talk.ja = !G.talk.ja; sfx("tap"); return gRenderPanel(); }
  if (k === "next") return gTalkNext();
  if (k === "opt") { const n = G.talk.nodes[G.talk.i], o = n.opts[Number(v)]; if (o.flag) st.flags[o.flag] = 1; G.talk.i = G.talk.nodes.findIndex(x => x.label === o.go); G.talk.ja = false; gTalkResolve(); sfx("ok"); return gRenderPanel(); }
  // 戦闘
  if (G.mode === "battle" && G.B) {
    const B = G.B, hero = st.party[B.actor];
    if (k === "skip") { clearTimeout(B.timer); return gPlayMsgs(); }
    if (k === "rnext") return B.resultNext && B.resultNext();
    if (k === "retry") return gRetry();
    if (k === "back") { B.sub = null; return gRenderPanel(); }
    if (k === "cmd") {
      if (v === "attack") { const al = B.foes.filter(f => f.alive); if (al.length === 1) return gChoose({ type: "attack", t: al[0].i }); B.sub = { kind: "target", next: { type: "attack" } }; return gRenderPanel(); }
      if (v === "skills") { B.sub = { kind: "skills" }; return gRenderPanel(); }
      if (v === "items") { B.sub = { kind: "items" }; return gRenderPanel(); }
      if (v === "run") return gChoose({ type: "run" });
    }
    if (k === "sk") {
      const sk = GSKILLS[v];
      if (sk.word) { const q = gWordQ(); if (!q) return gChoose({ type: "skill", sk: v, ok: true, t: (B.foes.find(f => f.alive) || {}).i }); B.sub = { kind: "word", sk: v, q }; return gRenderPanel(); }
      if (sk.kind === "heal") { B.sub = { kind: "target", ally: true, next: { type: "skill", sk: v } }; return gRenderPanel(); }
      if (sk.kind === "atk" || sk.kind === "mag") { const al = B.foes.filter(f => f.alive); if (al.length === 1) return gChoose({ type: "skill", sk: v, t: al[0].i }); B.sub = { kind: "target", next: { type: "skill", sk: v } }; return gRenderPanel(); }
      return gChoose({ type: "skill", sk: v });
    }
    if (k === "wans") { const ok = Number(v) === B.sub.q.a; sfx(ok ? "ok" : "ng"); toast(ok ? "正解！ " + B.sub.q.tip : "ちがう… " + B.sub.q.tip); const al = B.foes.find(f => f.alive); return gChoose({ type: "skill", sk: B.sub.sk, ok, t: al && al.i }); }
    if (k === "it") { B.sub = { kind: "target", ally: true, next: { type: "item", it: v } }; return gRenderPanel(); }
    if (k === "tgt") return gChoose({ ...B.sub.next, t: Number(v) });
    return;
  }
  // お店・宿屋
  if (k === "leave") { G.mode = "walk"; G.shop = null; G.menu = null; return gRenderPanel(); }
  if (k === "inn") { if (st.gold < GINN_PRICE) return toast("お金が足りない"); st.gold -= GINN_PRICE; for (const h of st.party) { const s = gStats(h); h.hp = s.hp; h.mp = s.mp; } st.safe = [st.map, G.px, G.py]; sfx("done"); G.mode = "walk"; gRenderPanel(); gSave(true); return gTalk([{ who: null, en: "The party rested and recovered fully.", ja: "ぐっすり休んで、HPとMPがすべて回復した。（セーブした）" }]); }
  if (k === "buy") { const e = GEQUIP[v], it = GITEMS[v], price = (e || it).price; if (st.gold < price) return; st.gold -= price; if (e) st.gear[v] = (st.gear[v] || 0) + 1; else st.bag[v] = (st.bag[v] || 0) + 1; sfx("coin"); toast(((e || it).ja) + "を買った" + (e ? "（メニューのそうびで装備）" : "")); gSave(true); return gRenderPanel(); }
  // メニュー
  if (k === "tab") { G.menu.tab = v; return gRenderPanel(); }
  if (k === "use") { const it = GITEMS[v], h = st.party[Number(b.dataset.t)], s = gStats(h); if (!(st.bag[v] > 0) || h.hp <= 0) return toast("使えない"); st.bag[v]--; if (it.heal) h.hp = Math.min(s.hp, h.hp + it.heal); if (it.mp) h.mp = Math.min(s.mp, h.mp + it.mp); sfx("ok"); gSave(true); return gRenderPanel(); }
  if (k === "eq") { const h = st.party[Number(b.dataset.t)], e = GEQUIP[v], old = h.eq[e.slot]; if (!(st.gear[v] > 0)) return; st.gear[v]--; if (old) st.gear[old] = (st.gear[old] || 0) + 1; h.eq[e.slot] = v; const s = gStats(h); h.hp = Math.min(h.hp, s.hp); h.mp = Math.min(h.mp, s.mp); sfx("ok"); gSave(true); return gRenderPanel(); }
  if (k === "save") return gSave();
}
function gKey(e) {
  if (!G || !G.open) return;
  const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  if (map[e.key]) { e.preventDefault(); if (e.type === "keydown") G.held = map[e.key]; else if (G.held === map[e.key]) G.held = null; return; }
  if (e.type !== "keydown") return;
  if (e.key === "z" || e.key === "Enter" || e.key === " ") { e.preventDefault(); if (G.mode === "walk") gInteract(); else if (G.mode === "talk") { const n = G.talk.nodes[G.talk.i]; if (n && !n.choice) gTalkNext(); } else if (G.mode === "battle" && G.B && G.B.msg) { if (G.B.phase === "result") G.B.resultNext(); else { clearTimeout(G.B.timer); gPlayMsgs(); } } }
  if (e.key === "x" || e.key === "Escape") { if (G.mode === "walk") gOpenMenu(); else if (G.mode === "menu" || G.mode === "shop") { G.mode = "walk"; gRenderPanel(); } }
}

/* ---------- 開く・閉じる ---------- */
function gOpen(fresh) {
  gLoadImages();
  if (!document.getElementById("game")) {
    const d = document.createElement("div"); d.id = "game"; d.className = "game";
    d.innerHTML = `<div class="g-top"><b id="gMapName"></b><span id="gGold"></span><button type="button" id="gClose" aria-label="とじる">✕</button></div>
      <div class="g-stage"><canvas id="gCanvas" width="${GV.W * GV.TS}" height="${GV.H * GV.TS}"></canvas><div id="gOver" class="g-over"></div></div><div id="gPanel" class="g-panel"></div>`;
    document.body.append(d);
    d.addEventListener("click", gClick);
    const pad = e => { const b = e.target.closest("[data-dir]"); if (!b || !G) return; e.preventDefault(); G.held = b.dataset.dir; b.setPointerCapture && b.setPointerCapture(e.pointerId); };
    d.addEventListener("pointerdown", pad);
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) d.addEventListener(ev, e => { if (e.target.closest && e.target.closest("[data-dir]") && G) G.held = null; });
    d.addEventListener("keydown", e => { if (e.target.dataset && e.target.dataset.g === "next" && (e.key === "Enter")) { e.preventDefault(); gTalkNext(); } });
    $("gClose").onclick = gClose;
    addEventListener("keydown", gKey); addEventListener("keyup", gKey);
  }
  document.getElementById("game").hidden = false; document.body.classList.add("g-lock");
  const saved = fresh ? null : gLoad();
  G = { st: saved || gNewGame(), open: true, mode: "walk", cleared: [...((S.rpg && S.rpg.cleared) || [])] };
  G.lastSave = saved ? JSON.parse(JSON.stringify(saved)) : null;
  gEnterMap(G.st.map, G.st.x, G.st.y, G.st.dir); gRenderPanel(); gOver();
  requestAnimationFrame(gLoop);
  if (!saved) setTimeout(() => gScene("p0_station"), 300); else if (G.pendingScene) setTimeout(gAfterWarp, 300);
}
function gClose() {
  if (G) { if (G.mode === "battle") { if (!confirm("戦闘中にとじると、この戦闘はなかったことになる。とじる？")) return; } gSave(true); G.open = false; }
  const d = document.getElementById("game"); if (d) d.hidden = true; document.body.classList.remove("g-lock"); G = null; renderRPG();
}
