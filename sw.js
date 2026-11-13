/* 電波がないときも開けるよう、同じサイトのファイルを保存しておく（まずネット、だめなら保存した分） */
const CACHE = "kr-1794561111";
const FILES = ["./", "index.html", "app.js?v=1794561111", "data.enc", "manifest.webmanifest", "icon-192.png", "icon-512.png", "supabase.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname.endsWith("data.enc") }).then(r => r || caches.match("index.html"))));
});
