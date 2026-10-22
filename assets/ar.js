/* C안 · /ar/ 공통 모션과 UI. GSAP이 없거나 '동작 줄이기' 설정이면 정적인 화면으로 보여줍니다. */
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('no-motion');

  /* ---------- mobile drawer ---------- */
  const drawer = document.getElementById('drawer');
  const openBtn = document.getElementById('menuBtn');
  if (drawer && openBtn) {
    const set = open => { drawer.classList.toggle('open', open); openBtn.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; };
    openBtn.addEventListener('click', () => set(true));
    drawer.querySelector('.close').addEventListener('click', () => set(false));
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- copy buttons ---------- */
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.copy), t = el.textContent.trim();
    const ok = () => { const o = b.textContent; b.textContent = 'تم النسخ'; setTimeout(() => b.textContent = o, 1500); };
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(ok).catch(() => {
      const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
  }));

  /* ---------- reveal on scroll ---------- */
  const rvs = document.querySelectorAll('.rv');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach((el, i) => { el.style.transitionDelay = (el.dataset.delay || 0) + 's'; io.observe(el); });
  } else rvs.forEach(el => el.classList.add('in'));

  /* ---------- hero canvas: drifting gold threads ---------- */
  const cv = document.getElementById('heroCanvas');
  if (cv) {
    const ctx = cv.getContext('2d'); let W, H, t = 0, raf;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        const amp = 22 + k * 8, yb = H * (.3 + k * .08);
        for (let x = 0; x <= W; x += 12) {
          const y = yb + Math.sin(x * .004 + t * .6 + k * .7) * amp + Math.cos(x * .0016 - t * .35 + k) * amp * .6;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(230,199,122,${.05 + k * .02})`; ctx.lineWidth = 1; ctx.stroke();
      }
      t += .006; raf = requestAnimationFrame(draw);
    };
    if (reduce) { draw(); cancelAnimationFrame(raf); }
    else new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!raf) draw(); } else { cancelAnimationFrame(raf); raf = 0; } }).observe(cv);
  }

  /* ---------- GSAP motion ---------- */
  const loader = document.getElementById('loader');
  if (!window.gsap || reduce) { if (loader) loader.remove(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // draw helpers for SVG line art
  const prep = els => els.forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });

  const tl = gsap.timeline();
  if (loader) {
    let skipped = false;
    try { skipped = sessionStorage.getItem('iro-intro') === '1'; sessionStorage.setItem('iro-intro', '1'); } catch (e) {}
    if (skipped) loader.remove();
    else {
      const ps = [...loader.querySelectorAll('path,circle')]; prep(ps);
      tl.to(ps, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: .12 })
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .85, ease: 'expo.inOut' }, '+=.15')
        .set(loader, { display: 'none' });
    }
  }
  if (document.querySelector('.hero h1 .w')) {
    tl.from('.hero h1 .w>span', { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: .1 }, loader ? '-=.4' : 0)
      .from('.hero h1 small, .hero .sub, .hero .ctas, .hero .chips li, .hero .eyebrow', { y: 22, opacity: 0, duration: .8, stagger: .06 }, '-=.8')
      .from('.hero .arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.3, ease: 'expo.inOut' }, '-=1.2')
      .from('.hero .arch-tag', { x: -30, opacity: 0, duration: .7 }, '-=.4');
    const fr = [...document.querySelectorAll('.hero .frame path')]; prep(fr);
    tl.to(fr, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, '-=1.4');
    gsap.to('.hero .arch img', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  if (document.querySelector('.page-hero h1')) {
    gsap.from('.page-hero h1, .page-hero .answer, .page-hero .ctas, .page-hero .meta-line', { y: 26, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out' });
  }

  // focus cards: line art draws as the card enters
  document.querySelectorAll('.fcard .art').forEach(a => {
    const ps = [...a.querySelectorAll('path:not(.ghost),circle')]; prep(ps);
    gsap.to(ps, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out', stagger: .12, scrollTrigger: { trigger: a, start: 'top 85%', once: true } });
  });

  // journey: pinned horizontal travel on desktop (RTL → track moves toward +x)
  const track = document.getElementById('jtrack');
  if (track) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tw = gsap.to(track, { x: dist, ease: 'none', scrollTrigger: { trigger: '#pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
      gsap.to('#jfill', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#pin', start: 'top top', end: () => '+=' + dist(), scrub: 1 } });
      gsap.utils.toArray('.step').forEach(s => gsap.from(s, { opacity: .45, scale: .94, scrollTrigger: { trigger: s, containerAnimation: tw, start: 'right 95%', end: 'right 65%', scrub: true } }));
    });
    mm.add('(max-width: 860px)', () => {
      gsap.utils.toArray('.step').forEach(s => gsap.from(s, { y: 40, opacity: 0, duration: .7, scrollTrigger: { trigger: s, start: 'top 88%', once: true } }));
    });
  }

  // doctor portrait reveal
  document.querySelectorAll('.doctor .arch').forEach(a => gsap.from(a, { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: a, start: 'top 80%', once: true } }));
  gsap.utils.toArray('.cv').forEach(c => gsap.from(c.children, { x: -24, opacity: 0, stagger: .06, duration: .6, scrollTrigger: { trigger: c, start: 'top 82%', once: true } }));
})();
