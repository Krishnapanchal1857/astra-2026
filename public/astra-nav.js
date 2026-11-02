/* ASTRA nav add-on. Builds the nav DOM itself, so your HTML content stays untouched. */
(() => {
  'use strict';
  /* ===== EDIT THIS BLOCK ONLY ===== */
  const CFG = {
    brand: 'ASTRA',
    current: 'About Us',                      // which link shows as the active page
    links: [                                   // [label, href, icon]
      ['Home', '/', 'Home'], ['Events', '/events', 'Events'], ['Departments', '/event.html', 'Departments'],
      ['Schedule', '/timeline.html', 'Schedule'], ['About Us', '#heritage', 'About'], ['Contact Us', '/contact', 'Contact']
    ],
    sideLinks: ['Home', 'Events', 'Departments', 'Contact Us', 'About Us'],
    signIn: ['Sign in / Register', '/login'],
    social: { instagram: '', x: '', linkedin: '', facebook: '', youtube: '', whatsapp: '' } // real official URLs only; empty = disabled
  };

  const I = {
    Home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', Events: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    Departments: '<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>', Schedule: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    Contact: '<path d="M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    About: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 6"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".6"/>',
    x: '<path d="M5 4l14 16M19 4L5 20"/>', linkedin: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 11v5M8 8v.1M12 16v-5M12 13a2.5 2.5 0 0 1 5 0v3"/>',
    facebook: '<path d="M14 21v-8h3l.5-3H14V8c0-1 .5-2 2-2h1.600V3.300A20 20 0 0 0 15 3c-2.500 0-4 1.500-4 4v3H8v3h3v8z"/>',
    youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10 9.500v5l4.500-2.500z"/>',
    whatsapp: '<path d="M4 20l1.400-4.200A8 8 0 1 1 8.400 18.600z"/><path d="M9 9c0 3 3 6 6 6l1-1.500-2-1-1 .7c-1-.4-1.800-1.200-2.200-2.200l.7-1-1-2z"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
  const cur = t => t === CFG.current ? ' aria-current="page"' : '';
  const soc = (cls) => Object.keys(CFG.social).map(k => {
    const u = CFG.social[k], n = k[0].toUpperCase() + k.slice(1);
    return `<a href="${u || '#'}" ${cls ? `data-tip="${n}" ` : ''}aria-label="ASTRA on ${n}"${u ? ' target="_blank" rel="noopener noreferrer"' : ' aria-disabled="true"'}>${svg(k)}</a>`;
  }).join('');

  const root = document.documentElement, body = document.body;
  const wrap = document.createElement('div');
  wrap.className = 'ax';
  wrap.innerHTML = `
    <a class="ax-skip" href="#hero">Skip to content</a>
    <div class="ax-progress" id="axBar" aria-hidden="true"></div>
    <a class="ax-logo" href="${CFG.links[0][1]}" aria-label="${CFG.brand} home"><img src="/Image/astra-logo.png" alt="" style="height:58px;width:auto;display:block"></a>
    <nav class="ax-nav" aria-label="Main"><ul>${CFG.links.map(([t, h]) => `<li><a href="${h}"${cur(t)}>${t}</a></li>`).join('')}</ul></nav>
    <a class="ax-sign" href="${CFG.signIn[1]}">${CFG.signIn[0]}</a>
    <aside class="ax-side l" aria-label="Quick links">${CFG.sideLinks.map(n => { const l = CFG.links.find(x => x[0] === n); return `<a href="${l[1]}"${cur(n)}>${svg(l[2])}${n}</a>`; }).join('')}</aside>
    <aside class="ax-side r" aria-label="Social links">${soc(true)}</aside>
    <button class="ax-burger" id="axBurger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="axMenu"><i></i><i></i><i></i></button>
    <div class="ax-menu" id="axMenu" role="dialog" aria-modal="true" aria-label="Menu">
      <ul>${CFG.links.map(([t, h, k]) => `<li><a href="${h}"${cur(t)}>${svg(k)}${t}</a></li>`).join('')}</ul>
      <a class="ax-msign" href="${CFG.signIn[1]}">${CFG.signIn[0]}</a>
      <div class="ax-msoc" aria-label="Social links">${soc(false)}</div>
    </div>`;
  body.prepend(wrap);
  wrap.querySelectorAll('[aria-disabled=true]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* ----- mobile menu ----- */
  const burger = document.getElementById('axBurger'), menu = document.getElementById('axMenu');
  const focusables = () => [...menu.querySelectorAll('a:not([aria-disabled=true])')].concat(burger);
  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector('a').focus(); else burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a[href]') && !e.target.closest('[aria-disabled=true]')) setMenu(false); });
  addEventListener('keydown', e => {
    if (!menu.classList.contains('open')) return;
    if (e.key === 'Escape') setMenu(false);
    if (e.key === 'Tab') { const f = focusables(), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });
  matchMedia('(min-width:1180px) and (min-height:561px)').addEventListener('change', e => { if (e.matches && menu.classList.contains('open')) setMenu(false); });

  /* ----- scroll progress + velocity skew on headings ----- */
  const bar = document.getElementById('axBar'), reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let last = scrollY, sk = 0, raf = 0;
  const tick = () => {
    raf = 0;
    const y = scrollY, max = root.scrollHeight - innerHeight;
    bar.style.setProperty('--ax-p', max > 0 ? (y / max).toFixed(4) : 0);
    if (!reduce) {
      const tgt = Math.max(-3, Math.min(3, (y - last) * .12)); last = y;
      sk += (tgt - sk) * .25;
      if (Math.abs(sk) < .02 && Math.abs(tgt) < .02) { sk = 0; root.style.setProperty('--ax-sk', '0deg'); return; }
      root.style.setProperty('--ax-sk', sk.toFixed(2) + 'deg');
      raf = requestAnimationFrame(tick);
    }
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  tick();

  /* ----- subtle magnetic hover (desktop pointers only) ----- */
  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches)
    wrap.querySelectorAll('.ax-sign,.ax-nav a').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.translate = `${((e.clientX - r.left - r.width / 2) * .08).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .15).toFixed(1)}px`; });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
})();
