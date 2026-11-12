/* Fokusdex – lagrer appen på enheten så den åpner uten nett. Bildene fra PokeAPI og Showdown mellomlagres første gang de vises.
   Øk versjonsnummeret når fillista endres. */
const CACHE = 'fokusdex-v50', IMG = 'fokusdex-img-v1';
const FILES = ['./', './index.html', './style.css', './data.js', './data2.js', './game.js', './battle.js', './league.js', './bfx.js', './ebx.js', './ebxp.js', './raid.js', './raidf.js', './raidx.js', './bossf.js', './darkf.js', './music.js', './pack.js', './bui.js', './help.js', './show.js', './ui.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'api.github.com') return;
  if (url.origin !== location.origin) {
    if (!/raw\.githubusercontent\.com$|pokemonshowdown\.com$/.test(url.hostname)) return;
    e.respondWith(caches.open(IMG).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  const key = e.request.mode === 'navigate' ? './index.html' : e.request;
  e.respondWith(caches.open(CACHE).then(c => c.match(key, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => { if (res && res.ok) c.put(key, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
