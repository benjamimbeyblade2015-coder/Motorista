/* sw.js – NÃO PRECISA MEXER NESTE ARQUIVO.
   Os avisos ficam dentro do index.html (bloco id="sw-codigo"); este arquivo só carrega esse código. */
const PAGE='index.html',KEY='codigo-avisos';
let P;
const carrega=()=>P||(P=(async()=>{
  let t='';
  try{
    t=await(await fetch(PAGE,{cache:'no-cache'})).text();
    caches.open('mmr-sw').then(c=>c.put(KEY,new Response(t))).catch(()=>{});
  }catch(e){const r=await caches.open('mmr-sw').then(c=>c.match(KEY));t=r?await r.text():''}
  const m=t.match(/<script type="text\/plain" id="sw-codigo">([\s\S]*?)<\/script>/);
  if(!m)throw new Error('código dos avisos não encontrado');
  return new Function(m[1]+'\n;return{checar};')();
})().catch(e=>{P=null;throw e}));
const roda=e=>e.waitUntil(carrega().then(l=>l.checar()));
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('periodicsync',e=>{if(e.tag==='avisos')roda(e)});
self.addEventListener('message',e=>{if(e.data==='checar')roda(e)});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.length?l[0].focus():clients.openWindow(self.registration.scope)))});
/* abre o app mesmo sem internet */
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.status===200){const c=r.clone();caches.open('mmr').then(k=>k.put(e.request,c)).catch(()=>{})}return r}).catch(()=>caches.match(e.request)));
});
