// CardYeung service worker: app shell offline, fresh code when online, never caches API or admin traffic.
const VERSION='cardyeung-v1';
const SHELL=['./','index.html','landing.css','language.css','locale.js','config.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png',
 'wallet/','wallet/index.html','wallet/app.js','wallet/style.css','wallet/qr.js','wallet/assets/coffee.jpg','wallet/assets/gym.jpg','wallet/assets/cinema.jpg','wallet/assets/other.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin||/\/(api|admin|telegram|healthz)(\/|$)/.test(url.pathname))return;
 if(/\.(jpg|png|svg)$/.test(url.pathname)){e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));return res})));return}
 e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}return res}).catch(()=>caches.match(req,{ignoreSearch:true}).then(hit=>hit||caches.match('wallet/index.html'))));
});
