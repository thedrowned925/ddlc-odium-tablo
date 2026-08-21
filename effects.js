(() => {
  const portraits = {
    Monika: 'https://ddlc.moe/images/sticker_m.png',
    Natsuki: 'https://ddlc.moe/images/sticker_n.png',
    Sayori: 'https://ddlc.moe/images/sticker_s.png',
    Yuri: 'https://ddlc.moe/images/sticker_y.png'
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function attachPortraits(){
    document.querySelectorAll('.character-card').forEach(card => {
      const name = card.querySelector('.char-name')?.textContent?.trim();
      const img = card.querySelector('.char-portrait');
      if(!name || !img || !portraits[name]) return;
      img.src = portraits[name];
      img.alt = `${name} karakter görseli`;
      img.addEventListener('load', () => card.classList.add('portrait-loaded'), {once:true});
      img.addEventListener('error', () => {
        img.hidden = true;
        card.classList.add('portrait-failed');
      }, {once:true});
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
      img.style.transitionDelay = `${350 + index * 110}ms`;
    });
  }

  attachPortraits();
  wireCards();
  wireLineup();

  if(reducedMotion){
    awaken();
  } else {
    setTimeout(awaken, 420);
    window.addEventListener('load', () => setTimeout(awaken, 80), {once:true});
  }
})();
