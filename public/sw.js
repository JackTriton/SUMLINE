const BASE=new URL(self.registration.scope);
const PREFIX='sumline-cache:'+BASE.pathname+':';
const CACHE=PREFIX+'1.3';
const ASSETS=['index.html','offline.html','app.js','config.js','runtime.js','input.js','style.css','mobile.css','engine.js','generator-worker.js','favicon.svg'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(u.origin!==BASE.origin||!u.pathname.startsWith(BASE.pathname)||u.pathname.startsWith(new URL('api/',BASE).pathname)||event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(new URL('offline.html',BASE).href)));return;}
  if(ASSETS.includes(u.href))event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;}).catch(()=>caches.match(event.request)));
});
