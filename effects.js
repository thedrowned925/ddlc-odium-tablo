(() => {
  const portraits = {
    Monika: 'https://ddlc.moe/images/sticker_m.png',
    Natsuki: 'https://ddlc.moe/images/sticker_n.png',
    Sayori: 'https://ddlc.moe/images/sticker_s.png',
    Yuri: 'https://ddlc.moe/images/sticker_y.png'
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wiredCards = new WeakSet();

  function attachPortraits(){
    document.querySelectorAll('.character-card').forEach(card => {
      const name = card.querySelector('.char-name')?.textContent?.trim();
      const img = card.querySelector('.char-portrait');
      if(!name || !img || !portraits[name]) return;
      if(img.dataset.bound === '1') return;

      img.dataset.bound = '1';
      img.hidden = false;
      img.referrerPolicy = 'no-referrer';
      img.alt = `${name} karakter görseli`;

      const loaded = () => {
        img.hidden = false;
        card.classList.remove('portrait-failed');
        card.classList.add('portrait-loaded');
      };
      const failed = () => {
        card.classList.remove('portrait-loaded');
        card.classList.add('portrait-failed');
      };

      img.addEventListener('load', loaded, {once:true});
      img.addEventListener('error', failed, {once:true});
      img.src = portraits[name];

      // Önbellekten çok hızlı gelen görsellerde load olayı listener'dan önce
      // tamamlanmış olabileceği için durumu ayrıca kontrol et.
      if(img.complete && img.naturalWidth > 0) loaded();
      else card.classList.add('portrait-loaded');
    });
  }

  function awaken(){
    if(document.body.classList.contains('page-awake')) return;
    requestAnimationFrame(() => document.body.classList.add('page-awake'));
  }

  function burst(card, clientX, clientY){
    if(reducedMotion) return;
    const rect = card.getBoundingClientRect();
    const x = clientX == null ? rect.width * .5 : clientX - rect.left;
    const y = clientY == null ? rect.height * .34 : clientY - rect.top;
    const symbols = ['✦','♡','✧','·','♡'];
    symbols.forEach((symbol, i) => {
      const particle = document.createElement('span');
      particle.className = 'spark-burst';
      particle.textContent = symbol;
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      const angle = (Math.PI * 2 / symbols.length) * i - Math.PI / 2;
      const distance = 28 + Math.random() * 34;
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--spin', `${-70 + Math.random() * 140}deg`);
      card.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove(), {once:true});
    });
  }

  function wireCards(){
    document.querySelectorAll('.character-card').forEach(card => {
      if(wiredCards.has(card)) return;
      wiredCards.add(card);
      let lastBurst = 0;
      const maybeBurst = (event) => {
        const now = performance.now();
        if(now - lastBurst < 500) return;
        lastBurst = now;
        burst(card, event?.clientX, event?.clientY);
      };
      card.addEventListener('pointerenter', maybeBurst);
      card.addEventListener('pointerdown', maybeBurst);
    });
  }

  function wireLineup(){
    document.querySelectorAll('.club-member img').forEach((img, index) => {
      img.referrerPolicy = 'no-referrer';
      img.style.transitionDelay = `${350 + index * 110}ms`;
    });
  }

  function refreshDynamicEffects(){
    attachPortraits();
    wireCards();
    wireLineup();
  }

  document.addEventListener('ddlc:data-ready', refreshDynamicEffects);
  refreshDynamicEffects();

  if(reducedMotion){
    awaken();
  } else {
    setTimeout(awaken, 420);
    window.addEventListener('load', () => setTimeout(awaken, 80), {once:true});
  }
})();
