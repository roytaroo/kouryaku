/* 通信量を減らす：大きいファイル（data.enc・app.js など）は、1回保存したら更新があるまで使い回す。
   ファイル名に ?v=版 を付けているので、アプリを更新したときだけ新しく取りに行く。
   画面（index.html）だけは毎回ネットを先に見て、更新に気づけるようにする（小さいので通信量はわずか）。 */
const CACHE = "kr-1795502603";
const FILES = ["./", "index.html", "app.js?v=1795502603", "data.enc?v=1795502603", "supabase.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const page = e.request.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("index.html");
  if (page) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("index.html", c)); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })));
});
