const fmt = new Intl.NumberFormat('tr-TR');
const names = ['Monika','Natsuki','Sayori','Yuri'];
const meta = {
  Monika:{color:'#69a57a',mark:'M',stamp:'KULÜP BAŞKANI',note:'Kayıt tarafında yarı yolu geçmeye en yakın dosyalardan biri.'},
  Natsuki:{color:'#ef77a8',mark:'N',stamp:'MANGA RAFI',note:'Mix kuyruğu büyüyor; eksik kayıtlar hâlâ önemli bir parça.'},
  Sayori:{color:'#76b8d7',mark:'S',stamp:'%100 KAYIT',note:'Kayıt alınması gereken bilinen repliklerin tamamı kayıtta.'},
  Yuri:{color:'#8e74b7',mark:'Y',stamp:'ŞİİR KÖŞESİ',note:'Yoğun sahneler nedeniyle hem mixte hem eksikte büyük hacim var.'}
};
const labels = {missing:'Eksik',mix:'Mix bekliyor',done:'Tamamlandı',none:'Yok',other:'Diğer'};
let DATA=null;

function pct(n,d){ return d ? (n/d*100) : 0; }
function one(n){ return n.toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1}); }

function boot(){
  const raw = window.DDLC_DATA;
  if(!raw) throw new Error('DDLC_DATA bulunamadı');
  const statusMap={d:'done',m:'mix',x:'missing',n:'none',o:'other'};
  DATA={summary:raw.s,entries:raw.r.map((r,i)=>({id:i+1,script:r[0],group:r[1],statuses:Object.fromEntries(names.map((n,ix)=>[n,statusMap[r[2][ix]]||'none'])),counts:Object.fromEntries(names.map((n,ix)=>[n,r[3][ix]||null])),countLabel:names.map((n,ix)=>r[3][ix]?`${n}: ${r[3][ix]}`:'').filter(Boolean).join(' / ')}))};
  hydrateSummary();
  renderCharacters();
  setupTracker();
  setupMotion();
  makeFloaters();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
}

function hydrateSummary(){
  const s=DATA.summary;
  const set=(id,val)=>document.getElementById(id).textContent=val;
  set('recordingPercent',`${one(s.recordingProgress)}%`);
  set('totalLines',fmt.format(s.totalLines));
  set('mixQueue',fmt.format(s.mixQueueLines));
  set('mixedLines',fmt.format(s.mixedLines));
  set('updatedAt',s.updated);
  set('recordedLines',fmt.format(s.recordedLines));
  set('recordedSub',`%${one(s.recordingProgress)} • kayıt tarafı`);
  set('queueLines',fmt.format(s.mixQueueLines));
  set('queueSub',`%${one(pct(s.mixQueueLines,s.totalLines))} • kayıt alındı, mix bekliyor`);
  set('doneLines',fmt.format(s.mixedLines));
  set('doneSub',`%${one(s.mixProgress)} • tamamen tamamlandı`);
  set('missingLines',fmt.format(s.missingLines));
  set('missingSub',`%${one(pct(s.missingLines,s.totalLines))} • kayıt bekliyor`);
  setTimeout(()=>document.getElementById('recordingRing').style.setProperty('--value',s.recordingProgress),250);
}

function renderCharacters(){
  const grid=document.getElementById('characterGrid');
  const tpl=document.getElementById('characterTemplate');
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
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});
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
try{boot()}catch(err){console.error(err);document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;left:12px;right:12px;bottom:12px;background:#432b38;color:#fff;padding:12px;z-index:999;font:12px sans-serif">Veri dosyası yüklenemedi.</div>')}
