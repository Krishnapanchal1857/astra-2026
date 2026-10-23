(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = innerWidth < 700;
  const $ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Text reveals (word / line) ---------- */
  $('.reveal-words').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--n:${i}">${w}</span>`).join(' ');
  });
  // Lines: split by sentence so each reveals separately and wraps naturally
  $('.reveal-lines').forEach(el => {
    const parts = el.textContent.trim().match(/[^.!?]+[.!?]*\s*/g) || [el.textContent];
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = parts.map((t, i) => `<span class="line" aria-hidden="true" style="--n:${i}">${t.trim()}</span>`).join('');
  });
  // Closing word, letter by letter
  const cw = document.getElementById('closingWord');
  cw.innerHTML = [...'ASTRA'].map((c, i) => `<span class="w" aria-hidden="true" style="--n:${i}">${c}</span>`).join('');

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .2 });
  $('.reveal-words,.reveal-lines,.closing-word').forEach(el => io.observe(el));
  $('.card').forEach((c, i) => { c.style.setProperty('--k', i % 3); io.observe(c); });

  /* ---------- Pixel title reveal ---------- */
  const title = document.getElementById('heroTitle');
  const COLS = 14, ROWS = 8;
  const px = document.createElement('div');
  px.className = 'px'; px.setAttribute('aria-hidden', 'true');
  px.style.gridTemplateColumns = `repeat(${COLS},1fr)`;
  px.style.gridTemplateRows = `repeat(${ROWS},1fr)`;
  for (let i = 0; i < COLS * ROWS; i++) px.appendChild(document.createElement('i'));
  title.appendChild(px);
  if (reduce) px.remove();
  else {
    $('i', px).forEach(i => setTimeout(() => { i.style.opacity = 0; }, 300 + Math.random() * 1400));
    setTimeout(() => px.remove(), 2400);
  }

  /* ---------- Parallax (scroll + pointer) ---------- */
  const layers = $('[data-speed]').map(el => ({ el, s: parseFloat(el.dataset.speed), sec: el.closest('section,header') }));
  let mx = 0, my = 0, tx = 0, ty = 0, ticking = false;
  function paint() {
    ticking = false;
    const vh = innerHeight;
    layers.forEach(({ el, s, sec }) => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const off = (r.top + r.height / 2 - vh / 2) * -s;
      const base = el.classList.contains('l-sun') ? 'translateX(-50%) ' : '';
      el.style.transform = `${base}translate3d(${reduce ? 0 : mx * s * 40}px,${off + (reduce ? 0 : my * s * 20)}px,0)`;
    });
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
  if (!reduce) {
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req, { passive: true });
    if (!coarse) addEventListener('pointermove', e => {
      tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; mx = tx; my = ty; req();
    }, { passive: true });
    req();
  }

  /* ---------- Card tilt ---------- */
  function tiltable(el, max, target) {
    const t = target || el;
    el.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * max * 2 + 'deg');
      t.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - .5)) * max * 2 + 'deg');
    });
    el.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
  }
  if (!reduce) $('.tilt').forEach(el => tiltable(el, 8));

  /* ---------- 3D showcase ---------- */
  const stage = document.getElementById('stage'), scene = document.getElementById('scene'), sparks = document.getElementById('sparks');
  const cards = $('.scard');
  if (!reduce && !coarse) stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    scene.style.setProperty('--sx', ((e.clientX - r.left) / r.width - .5) * 10 + 'deg');
    scene.style.setProperty('--sy', (-((e.clientY - r.top) / r.height - .5)) * 6 + 'deg');
  });
  stage.addEventListener('pointerleave', () => { scene.style.setProperty('--sx', '0deg'); scene.style.setProperty('--sy', '0deg'); });
  function burst(card) {
    if (reduce) return;
    const sr = stage.getBoundingClientRect(), cr = card.getBoundingClientRect();
    for (let i = 0; i < (small ? 6 : 12); i++) {
      const b = document.createElement('b');
      b.style.left = cr.left - sr.left + Math.random() * cr.width + 'px';
      b.style.top = cr.top - sr.top + Math.random() * cr.height + 'px';
      b.style.setProperty('--dx', (Math.random() - .5) * 60 + 'px');
      b.style.setProperty('--dy', -20 - Math.random() * 50 + 'px');
      sparks.appendChild(b); setTimeout(() => b.remove(), 900);
    }
  }
  cards.forEach(c => {
    c.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') burst(c); });
    c.addEventListener('focus', () => burst(c));
    const act = () => { const was = c.classList.contains('active'); cards.forEach(o => o.classList.remove('active')); if (!was) { c.classList.add('active'); burst(c); } };
    c.addEventListener('click', act);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });

  /* ---------- Three.js particle field ---------- */
  const canvas = document.getElementById('bg');
  let renderer, scene3, cam, pts, raf = 0;
  try {
    if (!window.THREE) throw 0;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    scene3 = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(60, 1, .1, 100); cam.position.z = 10;
    const N = small ? 70 : 220, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const palette = [[1, .7, .2], [.9, .45, .12], [.7, .15, .12], [1, .93, .75]];
    for (let i = 0; i < N; i++) {
      pos.set([(Math.random() - .5) * 30, (Math.random() - .5) * 20, (Math.random() - .5) * 20], i * 3);
      col.set(palette[i % 4], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // Points render as squares by default: pixel look
    pts = new THREE.Points(g, new THREE.PointsMaterial({ size: small ? 7 : 8, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .75, depthWrite: false }));
    scene3.add(pts);
    const fit = () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
    fit(); addEventListener('resize', fit, { passive: true });
    let sy = 0;
    addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      if (!reduce) {
        pts.rotation.y = t * .015; pts.position.y = sy * .004 % 20 - 0;
        pts.position.y = (sy * .006);
        cam.position.x += (tx * 2 - cam.position.x) * .04;
        cam.position.y += (-ty * 1.4 - cam.position.y) * .04;
        cam.lookAt(0, 0, 0);
      }
      renderer.render(scene3, cam);
    };
    loop();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) loop();
    });
    addEventListener('pagehide', () => { cancelAnimationFrame(raf); renderer.dispose(); g.dispose(); });
  } catch (err) {
    canvas.remove(); // graceful fallback: CSS-only scene remains
  }
})();
