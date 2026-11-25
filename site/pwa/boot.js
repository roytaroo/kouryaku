/* ===== 全画面アプリ版の起動：ログイン → 鍵で単語データを開く → 本体（app.js）を読む =====
   記録は Supabase の kouryaku_docs に保存する（1行＝1文書。col と id は今までの "days/2026-11-13" の形を2つに分けたもの）。
   本体は今まで通り window.claude.use("db") で保存先を受け取るので、ここでその形をまねる。 */
(function () {
  const CFG = window.KR_CONFIG;
  const KEY_LS = "kr-data-key";
  const $g = id => document.getElementById(id);
  const gate = $g("gate"), gMsg = $g("gateMsg"), gForm = $g("gateForm");
  const say = t => { gMsg.textContent = t; };

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  /* アプリに戻ってきたとき、新しい版が出ていたら自動で読み込み直す（iPhone は閉じても裏で開いたままのことがある） */
  let lastChk = Date.now();
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || Date.now() - lastChk < 60000) return;
    lastChk = Date.now();
    try {
      const t = await (await fetch("index.html?t=" + Date.now(), { cache: "no-store" })).text();
      const m = t.match(/"ver": ?"([^"]+)"/);
      if (m && m[1] !== String(CFG.ver) && !document.activeElement.matches("input,textarea")) location.reload();
    } catch (e) {}
  });

  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });

  /* ---- 保存先：今までの db と同じ形（collection / doc / onSnapshot / set / delete） ---- */
  function makeDb(uid, rows) {
    const cache = new Map(); // "col/id" -> data
    for (const r of rows) cache.set(r.col + "/" + r.id, r.data);
    const colSubs = new Map(), docSubs = new Map();
    const split = path => { const i = path.indexOf("/"); return [path.slice(0, i), path.slice(i + 1)]; };
    const snapCol = col => ({ docs: [...cache].filter(([k]) => split(k)[0] === col).map(([k, v]) => ({ id: split(k)[1], data: () => v })) });
    const snapDoc = path => ({ exists: cache.has(path), data: () => cache.get(path) });
    const notify = path => {
      const col = split(path)[0];
      for (const cb of colSubs.get(col) || []) try { cb(snapCol(col)); } catch (e) { console.warn(e); }
      for (const cb of docSubs.get(path) || []) try { cb(snapDoc(path)); } catch (e) { console.warn(e); }
    };
    const sub = (map, key, cb, snap) => { if (!map.has(key)) map.set(key, []); map.get(key).push(cb); setTimeout(() => cb(snap()), 0); };
    const chk = ({ error }) => { if (error) throw error; };
    async function refresh() {
      const all = await loadRows(uid);
      const seen = new Set();
      for (const r of all) { const k = r.col + "/" + r.id; seen.add(k); if (JSON.stringify(cache.get(k)) !== JSON.stringify(r.data)) { cache.set(k, r.data); notify(k); } }
      for (const k of [...cache.keys()]) if (!seen.has(k)) { cache.delete(k); notify(k); }
    }
    // ほかの端末で変わったら反映する
    sb.channel("kr-" + uid).on("postgres_changes", { event: "*", schema: "public", table: "kouryaku_docs", filter: "user_id=eq." + uid }, p => {
      const r = p.eventType === "DELETE" ? p.old : p.new; if (!r || !r.col) return;
      const k = r.col + "/" + r.id;
      if (p.eventType === "DELETE") cache.delete(k); else { if (JSON.stringify(cache.get(k)) === JSON.stringify(r.data)) return; cache.set(k, r.data); }
      notify(k);
    }).subscribe();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh().catch(() => {}); });
    return {
      collection: col => ({ onSnapshot: (cb) => sub(colSubs, col, cb, () => snapCol(col)) }),
      doc: path => ({
        onSnapshot: (cb) => sub(docSubs, path, cb, () => snapDoc(path)),
        set: async v => { const [col, id] = split(path); cache.set(path, v); notify(path); chk(await sb.from("kouryaku_docs").upsert({ user_id: uid, col, id, data: v, updated_at: new Date().toISOString() })); },
        delete: async () => { const [col, id] = split(path); cache.delete(path); notify(path); chk(await sb.from("kouryaku_docs").delete().eq("user_id", uid).eq("col", col).eq("id", id)); }
      })
    };
  }
  async function loadRows(uid) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from("kouryaku_docs").select("col,id,data").eq("user_id", uid).range(from, from + 999);
      if (error) throw error;
      out.push(...data); if (data.length < 1000) return out;
    }
  }

  /* ---- ファイル保存（記録の書き出し） ---- */
  const downloads = { save: async ({ filename, data }) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = filename; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } };

  /* ---- 単語データ：鍵で開いて、gzip を戻す ---- */
  const b64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  async function getKey() {
    let k = null; try { k = localStorage.getItem(KEY_LS); } catch (e) {}
    if (!k) {
      const { data, error } = await sb.from("kouryaku_secret").select("k").eq("id", 1).maybeSingle();
      if (error) throw new Error("鍵を読めない：" + (error.code || "") + " " + (error.message || ""));
      if (!data) throw new Error("鍵が見つからない（ログイン中：" + ((await sb.auth.getUser()).data.user || {}).email + "）");
      k = data.k; try { localStorage.setItem(KEY_LS, k); } catch (e) {}
    }
    return crypto.subtle.importKey("raw", b64(k), "AES-GCM", false, ["decrypt"]);
  }
  async function openData(key) {
    const buf = new Uint8Array(await (await fetch("data.enc?v=" + CFG.ver)).arrayBuffer());
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, key, buf.slice(12));
    const txt = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    return JSON.parse(txt);
  }

  /* ---- 今までの記録を最初の1回だけ移す ---- */
  async function migrate(uid, rows, m) {
    if (!m || rows.some(r => r.col === "settings")) return rows;
    say("今までの記録を移している…");
    const all = Object.entries(m).map(([path, data]) => { const i = path.indexOf("/"); return { user_id: uid, col: path.slice(0, i), id: path.slice(i + 1), data }; });
    for (let i = 0; i < all.length; i += 200) { const { error } = await sb.from("kouryaku_docs").upsert(all.slice(i, i + 200)); if (error) throw error; }
    return loadRows(uid);
  }

  async function start(session) {
    gForm.hidden = true; say("読み込み中…");
    const uid = session.user.id;
    let D;
    try { D = await openData(await getKey()); }
    catch (e) { try { localStorage.removeItem(KEY_LS); } catch (x) {} console.warn(e); say("単語データを開けなかった。" + (e.message || "")); return; }
    let rows = await loadRows(uid);
    rows = await migrate(uid, rows, D.MIGRATE);
    for (const n of ["CHARS", "SEIKEI_QA", "SEIKEI_QUIZ", "KOBUN", "TARGET_WORDS", "RPG_BG", "RPG_MON", "RPG_ITEM", "RPG_FACE", "RPG_FOE", "GAME_ART", "IJIN_IMG"]) window[n] = D[n];
    const db = makeDb(uid, rows);
    window.claude = { use: async kind => kind === "db" ? db : kind === "downloads" ? downloads : null };
    const s = document.createElement("script"); s.src = "app.js?v=" + CFG.ver;
    s.onload = () => { gate.hidden = true; };
    s.onerror = () => say("アプリを読み込めなかった。電波を確認して開き直して。");
    document.body.append(s);
  }

  gForm.addEventListener("submit", async e => {
    e.preventDefault(); say("ログイン中…");
    const { data, error } = await sb.auth.signInWithPassword({ email: $g("gEmail").value.trim(), password: $g("gPass").value });
    if (error) { say("ログインできなかった。メールとパスワードを確認して。"); return; }
    start(data.session).catch(err => say("エラー：" + (err.message || err)));
  });
  sb.auth.getSession().then(({ data }) => {
    if (data.session) start(data.session).catch(err => say("エラー：" + (err.message || err)));
    else { say("最初の1回だけログインして。"); gForm.hidden = false; }
  });
})();
