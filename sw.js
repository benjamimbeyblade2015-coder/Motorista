/* sw.js – Meu mês na rua: avisos (fica na mesma pasta do index.html) */
const DB='mmr-avisos',ST='kv',H=36e5;
/* horários de pico (hora inicial, hora final) – edite à vontade */
const PICOS=[[6,9],[11.5,13.5],[17,20]];
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const get=async k=>{try{const d=await idb();return await new Promise(ok=>{const q=d.transaction(ST).objectStore(ST).get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok()})}catch(e){}};
const put=async(k,v)=>{try{const d=await idb();return await new Promise(ok=>{const t=d.transaction(ST,'readwrite');t.objectStore(ST).put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ok()})}catch(e){}};
const br=n=>Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const chave=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const TX={
  pico:'ATENÇÃO: melhor horário para ganhar dinheiro na Uber/99 🚗',
  chuva:'ATENÇÃO: agora está chovendo, as propostas de dinheiro aumentam 👀',
  mes:v=>'ATENÇÃO: você conseguiu R$ '+br(v)+' no mês passado! 💰'
};
async function mostra(tag,body){
  const icon=await get('icone'),image=await get('img_'+tag);
  return self.registration.showNotification('Meu mês na rua',{body,tag,icon:icon||undefined,image:image||undefined,lang:'pt-BR',vibrate:[200,100,200]});
}
async function chovendo(){
  const p=await get('pos');if(!p)return false;
  try{
    const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude='+p.lat+'&longitude='+p.lon+'&current=precipitation,weather_code');
    const c=(await r.json()).current||{};
    return c.precipitation>0||[51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(c.weather_code);
  }catch(e){return false}
}
async function checar(){
  const d=new Date(),ts=d.getTime(),h=d.getHours()+d.getMinutes()/60,est=(await get('est'))||{};
  /* 1) mês passado: SÓ no dia 1, uma vez por mês */
  if(d.getDate()===1&&est.mes!==chave(d)){
    const ant=new Date(d.getFullYear(),d.getMonth()-1,1),r=((await get('resumo'))||{})[chave(ant)];
    if(r&&r.n>0&&r.tot>0)await mostra('mes',TX.mes(r.tot));
    est.mes=chave(d);
  }
  /* sem avisos de madrugada */
  if(h>=6&&h<23){
    let enviou=false;
    /* 2) chuva (no máx. 1 a cada 3 h) */
    if(ts-(est.chuva||0)>3*H&&await chovendo()){await mostra('chuva',TX.chuva);est.chuva=ts;enviou=true}
    /* 3) melhor horário (picos + sex/sáb à noite; no máx. 1 a cada 4 h) */
    const pico=PICOS.some(([a,b])=>h>=a&&h<b)||((d.getDay()===5||d.getDay()===6)&&h>=21);
    if(!enviou&&pico&&ts-(est.pico||0)>4*H){await mostra('pico',TX.pico);est.pico=ts}
  }
  await put('est',est);
}

/* ===== escutas do service worker ===== */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('message',e=>{if(e.data==='checar')e.waitUntil(checar())});
self.addEventListener('periodicsync',e=>{if(e.tag==='avisos')e.waitUntil(checar())});
/* botões IR PARA O CHAT / FECHAR da notificação de mensagem */
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const d=e.notification.data||{};
  if(e.action==='fechar'||!d.chat)return;
  e.waitUntil((async()=>{
    const cs=await clients.matchAll({type:'window',includeUncontrolled:true});
    if(cs.length){await cs[0].focus();cs[0].postMessage({abrirChat:d.chat,nome:d.nome||''})}
    else await clients.openWindow(self.registration.scope+'?chat='+encodeURIComponent(d.chat)+'&n='+encodeURIComponent(d.nome||''));
  })());
});
