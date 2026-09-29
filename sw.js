const CACHE = "phantom-v83";
const ASSETS = ["./", "./index.html", "./app.js", "./styles.css", "./manifest.webmanifest", "./splash.png", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return; // live prices
  if (/coingecko\.com|dexscreener\.com|coinbase\.com/.test(url.href)) return; // always live
  const remoteLogo = /clearbit\.com|jsdelivr\.net|google\.com\/s2\/favicons|coin-images\.coingecko\.com|financialmodelingprep\.com|duckduckgo\.com|dexscreener\.com\/.*\.(png|jpg|webp)/.test(url.href);
  if (remoteLogo) {
    // stale-while-revalidate so logos survive going offline
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(e.request).then((hit) => {
          const net = fetch(e.request).then((res) => { c.put(e.request, res.clone()).catch(() => {}); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
