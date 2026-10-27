/* ===== 立体ドット（ボクセル）エンジン =====
   見えている面だけを作り、角や隙間に陰り（AO）を付ける。three.js（グローバル THREE）を使う */
const VCOL = new Map();
function vcolor(h) { let c = VCOL.get(h); if (!c) { c = new THREE.Color(h[0] === "*" ? h.slice(1) : h); VCOL.set(h, c); } return c; }
class Vox {
  constructor() { this.v = new Map(); this.anchors = { head: [0, 20, 0], hand: [8, 8, 2] }; }
  /** 座標を1つの数にまとめる（文字列より速い）。各軸 -512〜511 */
  key(x, y, z) { return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512); }
  /** key を座標に戻す */
  static xyz(k) { const z = k % 1024, r = (k - z) / 1024, y = r % 1024; return [(r - y) / 1024 - 512, y - 512, z - 512]; }
  set(x, y, z, c) { const k = this.key(Math.round(x), Math.round(y), Math.round(z)); if (c == null) this.v.delete(k); else this.v.set(k, c); }
  get(x, y, z) { return this.v.get(this.key(x, y, z)); }
  has(x, y, z) { return this.v.has(this.key(x, y, z)); }
  box(x0, y0, z0, x1, y1, z1, c) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const v = typeof c === "function" ? c(x, y, z) : c; if (v !== undefined) this.set(x, y, z, v); } }
  /** 楕円体。col は色か (x,y,z)=>色 */
  ell(cx, cy, cz, rx, ry, rz, col) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 > 1) continue;
      const c = typeof col === "function" ? col(x, y, z) : col;
      if (c !== undefined) this.set(x, y, z, c); // undefined は「ここは塗らない」
    }
  }
  /** 縦の円柱（半径は高さで変えられる） */
  cyl(cx, cz, y0, y1, r, col) {
    for (let y = y0; y <= y1; y++) { const rr = typeof r === "function" ? r(y) : r;
      for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) for (let z = Math.floor(cz - rr); z <= Math.ceil(cz + rr); z++)
        if ((x - cx) ** 2 + (z - cz) ** 2 <= rr * rr) this.set(x, y, z, typeof col === "function" ? col(x, y, z) : col); }
  }
  /** 正面（+z）から見た一番手前の z */
  front(x, y) { for (let z = 40; z >= -40; z--) if (this.has(x, y, z)) return z; return null; }
  /** 正面の表面に色を塗る（dz で手前へ出す） */
  paint(x, y, c, dz = 0) { const z = this.front(x, y); if (z != null) this.set(x, y, z + dz, c); }
  /** 左右対称に置く */
  sym(x, y, z, c) { this.set(x, y, z, c); this.set(-x - 1, y, z, c); }
  symBox(x0, y0, z0, x1, y1, z1, c) { this.box(x0, y0, z0, x1, y1, z1, c); this.box(-x1 - 1, y0, z0, -x0 - 1, y1, z1, c); }
  bounds() { let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9]; for (const k of this.v.keys()) { const p = Vox.xyz(k); for (let i = 0; i < 3; i++) { a[i] = Math.min(a[i], p[i]); b[i] = Math.max(b[i], p[i]); } } return { min: a, max: b }; }
  /** 面を作る。色が "*" で始まるボクセルは光る（影も陰りも付かない） */
  mesh() {
    const B = [{ pos: [], col: [], nor: [], idx: [] }, { pos: [], col: [], nor: [], idx: [] }];
    const V = this.v, solid = (x, y, z) => V.has(((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512));
    const F = [
      { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] }, { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
      { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
      { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] }, { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }];
    const shade = [0.64, 0.79, 0.9, 1];
    for (const [k, h] of this.v) {
      const [x, y, z] = Vox.xyz(k), base = vcolor(h), glow = h[0] === "*", b = B[glow ? 1 : 0];
      for (const f of F) {
        const ox = x + f.n[0], oy = y + f.n[1], oz = z + f.n[2];
        if (solid(ox, oy, oz)) continue;
        const s = b.pos.length / 3, ao = [];
        for (const c of f.c) {
          const t = [f.n[0] ? 0 : (c[0] ? 1 : -1), f.n[1] ? 0 : (c[1] ? 1 : -1), f.n[2] ? 0 : (c[2] ? 1 : -1)];
          const ax = [[t[0], 0, 0], [0, t[1], 0], [0, 0, t[2]]].filter(a => a[0] || a[1] || a[2]);
          const s1 = solid(ox + ax[0][0], oy + ax[0][1], oz + ax[0][2]) ? 1 : 0, s2 = solid(ox + ax[1][0], oy + ax[1][1], oz + ax[1][2]) ? 1 : 0;
          const cr = solid(ox + t[0], oy + t[1], oz + t[2]) ? 1 : 0;
          const a = glow ? 3 : s1 && s2 ? 0 : 3 - (s1 + s2 + cr); ao.push(a);
          b.pos.push(x + c[0], y + c[1], z + c[2]); b.nor.push(f.n[0], f.n[1], f.n[2]);
          const m = shade[a]; b.col.push(base.r * m, base.g * m, base.b * m);
        }
        if (ao[0] + ao[2] > ao[1] + ao[3]) b.idx.push(s, s + 1, s + 2, s, s + 2, s + 3); else b.idx.push(s + 1, s + 2, s + 3, s + 1, s + 3, s);
      }
    }
    const group = new THREE.Group();
    B.forEach((b, i) => {
      if (!b.idx.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.idx);
      const mat = i ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0 });
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = !i; mesh.receiveShadow = !i; group.add(mesh);
    });
    return group;
  }
}

/** 1つの WebGL を使い回して、お化けを描く舞台。live=true でゆらゆら動く */
const Stage = (() => {
  let renderer = null, scene, cam, sun, floor, holder, cur = null, raf = 0, liveCanvas = null, ctx2d = null, t0 = 0, lastKey = "";
  function init() {
    if (renderer) return true;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(18, 1, 1, 1000);
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a8aa8, 1.3));
    sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(30, 60, 40); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 5;
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 200 });
    scene.add(sun);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    holder = new THREE.Group(); scene.add(holder);
    return true;
  }
  function place(vox, opt = {}) {
    if (cur) { holder.remove(cur.mesh); cur.mesh.traverse(o => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } }); }
    const mesh = vox.mesh(); holder.add(mesh);
    const b = vox.bounds(), size = [b.max[0] - b.min[0] + 1, b.max[1] - b.min[1] + 1, b.max[2] - b.min[2] + 1];
    const cx = (b.min[0] + b.max[0] + 1) / 2, cz = (b.min[2] + b.max[2] + 1) / 2;
    mesh.position.set(-cx, -b.min[1] + 1, -cz);
    const r = Math.max(size[0], size[1] * 1.05, size[2]);
    const az = opt.az ?? 0.45, el = opt.el ?? 0.36, dist = r * (opt.zoom ?? 4.3);
    cam.position.set(Math.sin(az) * Math.cos(el) * dist, size[1] / 2 + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(0, size[1] * 0.5, 0);
    cur = { mesh, base: -b.min[1] + 1 };
  }
  /** 一枚絵（data URL）。図鑑やガチャの一覧に使う */
  function snapshot(vox, w = 240, h = 240, opt = {}) {
    if (!init()) return "";
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    place(vox, opt); holder.rotation.y = opt.rot ?? 0;
    renderer.render(scene, cam);
    lastKey = "";
    return renderer.domElement.toDataURL("image/png");
  }
  /** ずっと動くお化け（ホームの相棒）。canvas に毎フレーム写す */
  function live(canvas, vox, key, opt = {}) {
    if (!init()) return false;
    liveCanvas = canvas; ctx2d = canvas.getContext("2d");
    if (key !== lastKey) { place(vox, opt); lastKey = key; }
    cancelAnimationFrame(raf); t0 = performance.now();
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = t => {
      if (!liveCanvas || !liveCanvas.isConnected) return;
      const w = liveCanvas.clientWidth || 300, h = liveCanvas.clientHeight || 300, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (liveCanvas.width !== Math.round(w * dpr) || liveCanvas.height !== Math.round(h * dpr)) { liveCanvas.width = Math.round(w * dpr); liveCanvas.height = Math.round(h * dpr); }
      renderer.setSize(liveCanvas.width, liveCanvas.height, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      const s = (t - t0) / 1000;
      if (!reduce) { holder.rotation.y = Math.sin(s * 0.55) * 0.42; cur.mesh.position.y = cur.base + Math.sin(s * 2.1) * 0.45; }
      renderer.render(scene, cam);
      ctx2d.clearRect(0, 0, liveCanvas.width, liveCanvas.height); ctx2d.drawImage(renderer.domElement, 0, 0);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return true;
  }
  function stop() { cancelAnimationFrame(raf); liveCanvas = null; lastKey = ""; }
  function ok() { return init(); }
  return { snapshot, live, stop, ok };
})();
