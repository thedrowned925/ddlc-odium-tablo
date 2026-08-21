const fmt = new Intl.NumberFormat('tr-TR');
const names = ['Monika','Natsuki','Sayori','Yuri'];
const meta = {
  Monika:{color:'#69a57a',mark:'M',stamp:'KULÜP BAŞKANI',note:'Monika kayıt ve mix ilerlemesi.'},
  Natsuki:{color:'#ef77a8',mark:'N',stamp:'MANGA RAFI',note:'Natsuki kayıt ve mix ilerlemesi.'},
  Sayori:{color:'#76b8d7',mark:'S',stamp:'SAYORI',note:'Sayori kayıt ve mix ilerlemesi.'},
  Yuri:{color:'#8e74b7',mark:'Y',stamp:'ŞİİR KÖŞESİ',note:'Yuri kayıt ve mix ilerlemesi.'}
};
const labels = {missing:'Eksik',mix:'Mix bekliyor',done:'Tamamlandı',none:'Yok',other:'Diğer'};
const LIVE_SHEET = {
  id:'15wAhk_WSDS-o878Gu2viB_R-2xwZpQWlPwyGF_lyEGk',
  gid:'1272886594',
  pollMs:15000,
  timeoutMs:8000
};
let DATA = null;

function pct(n,d){ return d ? (n/d*100) : 0; }
function one(n){ return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1}); }
function compactStatus(status){ return ({done:'d',mix:'m',missing:'x',none:'n',other:'o'})[status] || 'o'; }

function parseStatus(value){
  const s = String(value ?? '').trim().toLocaleUpperCase('tr-TR').replace(/\s+/g,' ');
  if(!s) return 'none';
  if(s.includes('TAMAMLANDI')) return 'done';
  if(s.includes('MIX') || s.includes('SES ATILDI')) return 'mix';
  if(s.includes('EKSİK')) return 'missing';
  if(s.includes('YOK')) return 'none';
  return 'other';
}

function parseCount(text,name){
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match = String(text ?? '').match(new RegExp(`${escaped}\\s*:\\s*(\\d+)`,'i'));
  return match ? Number(match[1]) : null;
}

function classifyGroup(script){
  if(/poemresponses/i.test(script)) return 'Şiir Tepkileri';
  if(/exclusive/i.test(script)) return 'Özel Sahneler';
  return 'Ana Hikâye';
}

function tableCellValue(cell){
  if(!cell) return '';
  if(cell.f != null) return String(cell.f);
  if(cell.v != null) return String(cell.v);
  return '';
}

function liveResponseToRaw(response){
  if(!response || response.status === 'error' || !response.table || !Array.isArray(response.table.rows)){
    throw new Error('Google Sheet yanıtı geçersiz');
  }

  const characters = Object.fromEntries(names.map(name => [name,{total:0,done:0,mix:0,missing:0}]));
  const rows = [];

  for(const row of response.table.rows){
    const cells = row?.c || [];
    const script = tableCellValue(cells[0]).trim();
    if(!/^script-/i.test(script)) continue;

    const countText = tableCellValue(cells[5]);
    const statuses = names.map((name,index) => parseStatus(tableCellValue(cells[index+1])));
    const counts = names.map(name => parseCount(countText,name));

    names.forEach((name,index) => {
      const count = counts[index];
      const status = statuses[index];
      if(count == null) return;
      characters[name].total += count;
      if(status === 'done') characters[name].done += count;
      if(status === 'mix') characters[name].mix += count;
      if(status === 'missing') characters[name].missing += count;
    });

    rows.push([
      script,
      classifyGroup(script),
      statuses.map(compactStatus).join(''),
      counts.map(value => value == null ? null : value)
    ]);
  }

  const totalLines = names.reduce((sum,name) => sum + characters[name].total,0);
  const mixedLines = names.reduce((sum,name) => sum + characters[name].done,0);
  const mixQueueLines = names.reduce((sum,name) => sum + characters[name].mix,0);
  const missingLines = names.reduce((sum,name) => sum + characters[name].missing,0);
  const recordedLines = mixedLines + mixQueueLines;
  const now = new Date();

  return {
    s:{
      totalLines,
      mixedLines,
      mixQueueLines,
      missingLines,
      recordedLines,
      recordingProgress:pct(recordedLines,totalLines),
      mixProgress:pct(mixedLines,totalLines),
      updated:`Canlı • ${now.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}`,
      characters
    },
    r:rows
  };
}

function loadLiveSheet(){
  return new Promise((resolve,reject) => {
    const callbackName = `__ddlcSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const params = new URLSearchParams({
      gid:LIVE_SHEET.gid,
      headers:'0',
      tq:'select A,B,C,D,E,F',
      tqx:`out:json;responseHandler:${callbackName}`,
      _:String(Date.now())
    });
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      try{ delete window[callbackName]; }catch{ window[callbackName] = undefined; }
    };
    const finish = (fn,value) => {
      if(settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    window[callbackName] = response => {
      try{ finish(resolve,liveResponseToRaw(response)); }
      catch(err){ finish(reject,err); }
    };
    script.onerror = () => finish(reject,new Error('Google Sheet yüklenemedi'));
    script.src = `https://docs.google.com/spreadsheets/d/${LIVE_SHEET.id}/gviz/tq?${params.toString()}`;
    script.async = true;
    const timer = setTimeout(() => finish(reject,new Error('Google Sheet zaman aşımı')),LIVE_SHEET.timeoutMs);
    document.head.appendChild(script);
  });
}

function rawSignature(raw){
  if(!raw) return '';
  return JSON.stringify([raw.r,raw.s?.totalLines,raw.s?.mixedLines,raw.s?.mixQueueLines,raw.s?.missingLines]);
}

function normalizeRaw(raw){
  const statusMap={d:'done',m:'mix',x:'missing',n:'none',o:'other'};
  return {
    summary:raw.s,
    entries:raw.r.map((r,i)=>({
      id:i+1,
      script:r[0],
      group:r[1],
      statuses:Object.fromEntries(names.map((n,ix)=>[n,statusMap[r[2]?.[ix]]||'none'])),
      counts:Object.fromEntries(names.map((n,ix)=>[n,r[3]?.[ix] ?? null])),
      countLabel:names.map((n,ix)=>r[3]?.[ix] != null ? `${n}: ${r[3][ix]}`:'').filter(Boolean).join(' / ')
    }))
  };
}

async function boot(){
  const fallback = window.DDLC_DATA;
  let raw = fallback;
  let liveLoaded = false;

  try{
    raw = await loadLiveSheet();
    liveLoaded = true;
    document.body.dataset.dataSource = 'live';
  }catch(err){
    console.warn('Canlı Google Sheet alınamadı, yerel veri kullanılıyor:',err);
    document.body.dataset.dataSource = 'fallback';
  }

  if(!raw) throw new Error('DDLC_DATA bulunamadı');
  DATA = normalizeRaw(raw);
  hydrateSummary();
  renderCharacters();
  setupTracker();
  setupMotion();
  makeFloaters();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  document.dispatchEvent(new CustomEvent('ddlc:data-ready'));
  startLiveWatch(rawSignature(raw),liveLoaded);
}

function hydrateSummary(){
  const s=DATA.summary;
  const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  set('recordingPercent',`${one(s.recordingProgress)}%`);
  set('totalLines',fmt.format(s.totalLines));
  set('mixQueue',fmt.format(s.mixQueueLines));
  set('mixedLines',fmt.format(s.mixedLines));
  set('updatedAt',s.updated || '—');
  set('recordedLines',fmt.format(s.recordedLines));
  set('recordedSub',`%${one(s.recordingProgress)} • kayıt tarafı`);
  set('queueLines',fmt.format(s.mixQueueLines));
  set('queueSub',`%${one(pct(s.mixQueueLines,s.totalLines))} • kayıt alındı, mix bekliyor`);
  set('doneLines',fmt.format(s.mixedLines));
  set('doneSub',`%${one(s.mixProgress)} • tamamen tamamlandı`);
  set('missingLines',fmt.format(s.missingLines));
  set('missingSub',`%${one(pct(s.missingLines,s.totalLines))} • kayıt bekliyor`);
  set('scriptRowCount',fmt.format(DATA.entries.length));
  setTimeout(()=>document.getElementById('recordingRing')?.style.setProperty('--value',s.recordingProgress),250);
}

function renderCharacters(){
  const grid=document.getElementById('characterGrid');
  const tpl=document.getElementById('characterTemplate');
  grid.innerHTML='';
  names.forEach((name,i)=>{
    const c=DATA.summary.characters[name];
    const rec=c.done+c.mix, recPct=pct(rec,c.total), mixPct=pct(c.done,c.total);
    const node=tpl.content.cloneNode(true);
    const card=node.querySelector('.character-card');
    card.style.setProperty('--accent',meta[name].color);
    card.style.transitionDelay=`${i*70}ms`;
    node.querySelector('.char-monogram').textContent=meta[name].mark;
    node.querySelector('.char-name').textContent=name;
    node.querySelector('.char-stamp').textContent=meta[name].stamp;
    node.querySelector('.char-record-percent').textContent=`%${one(recPct)}`;
    node.querySelector('.char-mix-percent').textContent=`%${one(mixPct)}`;
    node.querySelector('.char-total').textContent=fmt.format(c.total);
    node.querySelector('.char-queue').textContent=fmt.format(c.mix);
    node.querySelector('.char-missing').textContent=fmt.format(c.missing);
    node.querySelector('.char-note').textContent=meta[name].note;
    grid.appendChild(node);
    requestAnimationFrame(()=>setTimeout(()=>{
      card.querySelector('.char-record-bar').style.width=`${recPct}%`;
      card.querySelector('.char-mix-bar').style.width=`${mixPct}%`;
    },350+i*90));
  });
}

function setupTracker(){
  const els={
    search:document.getElementById('searchInput'),group:document.getElementById('groupFilter'),
    char:document.getElementById('characterFilter'),status:document.getElementById('statusFilter'),
    clear:document.getElementById('clearFilters'),rows:document.getElementById('trackerRows'),
    count:document.getElementById('resultCount'),empty:document.getElementById('emptyState')
  };
  const render=()=>{
    const q=els.search.value.trim().toLocaleLowerCase('tr-TR');
    const group=els.group.value, char=els.char.value, status=els.status.value;
    const filtered=DATA.entries.filter(e=>{
      if(q && !(e.script+' '+e.countLabel).toLocaleLowerCase('tr-TR').includes(q)) return false;
      if(group!=='all' && e.group!==group) return false;
      if(char!=='all'){
        if(e.statuses[char]==='none') return false;
        if(status!=='all' && e.statuses[char]!==status) return false;
      } else if(status!=='all' && !names.some(n=>e.statuses[n]===status)) return false;
      return true;
    });
    els.rows.innerHTML=filtered.map(rowHTML).join('');
    els.count.textContent=`${fmt.format(filtered.length)} / ${fmt.format(DATA.entries.length)} satır gösteriliyor`;
    els.empty.hidden=filtered.length!==0;
  };
  [els.search,els.group,els.char,els.status].forEach(x=>x.addEventListener('input',render));
  els.clear.addEventListener('click',()=>{els.search.value='';els.group.value='all';els.char.value='all';els.status.value='all';render();els.search.focus()});
  render();
}

function rowHTML(e){
  const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  return `<article class="tracker-row">
    <div class="script-cell"><span class="script-group">${safe(e.group)}</span><div class="script-name">${safe(e.script)}</div>${e.countLabel?`<div class="script-counts">${safe(e.countLabel)}</div>`:''}</div>
    ${names.map(n=>statusHTML(e.statuses[n],e.counts[n])).join('')}
  </article>`;
}
function statusHTML(status,count){
  return `<div class="status-cell"><span class="status-pill ${status}"></span><span class="status-text">${labels[status]||status}</span>${count!=null?`<span class="line-count">${fmt.format(count)} replik</span>`:''}</div>`;
}

function setupMotion(){
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.06,rootMargin:'0px 0px 8% 0px'});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  const chaos=document.getElementById('chaosBtn');
  chaos.addEventListener('click',()=>{
    document.body.classList.add('glitching');
    chaos.textContent='♡';
    setTimeout(()=>{document.body.classList.remove('glitching');chaos.textContent='?'},950);
  });
  document.addEventListener('pointermove',e=>{
    if(window.matchMedia('(pointer:fine)').matches){
      document.documentElement.style.setProperty('--mx',`${e.clientX}px`);
      document.documentElement.style.setProperty('--my',`${e.clientY}px`);
    }
  },{passive:true});
}

function makeFloaters(){
  const root=document.querySelector('.floaters');
  for(let i=0;i<12;i++){
    const h=document.createElement('span');h.className='float-heart';h.textContent=i%4===0?'✎':'♡';
    h.style.left=`${3+Math.random()*94}%`;h.style.top=`${8+Math.random()*86}%`;h.style.fontSize=`${18+Math.random()*35}px`;h.style.setProperty('--speed',`${4+Math.random()*5}s`);h.style.setProperty('--rot',`${-25+Math.random()*50}deg`);h.style.animationDelay=`${-Math.random()*5}s`;root.appendChild(h);
  }
}

function startLiveWatch(initialSignature,initialWasLive){
  let currentSignature = initialSignature;
  let initialLive = initialWasLive;
  let checking = false;

  const check = async () => {
    if(checking || document.hidden) return;
    checking = true;
    try{
      const next = await loadLiveSheet();
      const nextSignature = rawSignature(next);
      if(!initialLive || nextSignature !== currentSignature){
        location.reload();
        return;
      }
      currentSignature = nextSignature;
      initialLive = true;
    }catch(err){
      console.debug('Canlı Sheet kontrolü atlandı:',err);
    }finally{
      checking = false;
    }
  };

  setInterval(check,LIVE_SHEET.pollMs);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); });
  window.addEventListener('focus',check);
}

boot().catch(err=>{
  console.error(err);
  document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;left:12px;right:12px;bottom:12px;background:#432b38;color:#fff;padding:12px;z-index:999;font:12px sans-serif">Veri yüklenemedi. Sayfayı yenileyip tekrar deneyin.</div>');
});
