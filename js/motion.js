// Marksuite — movimento e interação da landing. JavaScript puro, sem bibliotecas.
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => [...r.querySelectorAll(s)];
  const raf = requestAnimationFrame;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const safe = (nome, fn) => { try { fn(); } catch (e) { console.warn('[motion] ' + nome + ':', e.message); } };

  /* ---------- números a subir ---------- */
  const fmt = (n, dec = 0, kz = false) => {
    let [i, d] = n.toFixed(dec).split('.');
    if (kz || i.length > 3) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return d ? i + ',' + d : i;
  };
  const finalText = el => fmt(parseFloat(el.dataset.count), +el.dataset.dec || 0, el.hasAttribute('data-kz')) + (el.dataset.suffix || '');
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, kz = el.hasAttribute('data-kz'), suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = finalText(el); return; }
    const dur = 1500, t0 = performance.now() + (+el.dataset.delay || 0), ease = t => 1 - Math.pow(1 - t, 3);
    (function step(now) {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      el.textContent = fmt(to * ease(p), dec, kz) + suf;
      if (p < 1) raf(step); else el.textContent = finalText(el);
    })(performance.now());
  }

  /* ---------- revelação ao rolar ---------- */
  safe('revelar', () => {
    $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => { c.setAttribute('data-reveal', ''); c.dataset.delay = i * 90; }));
    const els = $$('[data-reveal]');
    els.forEach(el => el.style.setProperty('--d', (el.dataset.delay || 0) + 'ms'));
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      $$('[data-count]').forEach(countUp);
      return;
    }
    $$('[data-count]').forEach(el => { el.textContent = '0'; });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const t = e.target;
      t.classList.add('in'); io.unobserve(t);
      $$('[data-count]', t).forEach(countUp);
    }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    els.forEach(el => io.observe(el));
    setTimeout(() => $$('[data-count]').forEach(el => { if (!el.dataset.done) { el.dataset.done = '1'; el.textContent = finalText(el); } }), 12000);
  });

  /* ---------- barras do painel ---------- */
  $$('.bars i').forEach((b, i) => b.style.setProperty('--i', i));

  /* ---------- palavra que alterna no herói ---------- */
  safe('palavras', () => {
    const rot = $('#rot');
    if (!rot || reduce) return;
    const words = rot.dataset.words.split(',');
    let i = 0;
    setInterval(async () => {
      rot.classList.add('out');
      await sleep(320);
      i = (i + 1) % words.length;
      rot.textContent = words[i];
      rot.classList.add('pre'); rot.classList.remove('out');
      void rot.offsetWidth;
      rot.classList.remove('pre');
    }, 2300);
  });

  /* ---------- briefing que se escreve sozinho ---------- */
  safe('escrita', () => {
    const tw = $('#tw');
    if (!tw || reduce) return;
    const lines = ['Aqui está o seu briefing de hoje.', '3 facturas vencem esta semana.', 'Proposta sem resposta há 5 dias.', 'Fluxo de caixa dentro do previsto.'];
    let li = 0;
    (async function loop() {
      await sleep(1600);
      for (;;) {
        const s = lines[li];
        for (let i = 0; i <= s.length; i++) { tw.textContent = s.slice(0, i); await sleep(34); }
        await sleep(1900);
        for (let i = s.length; i >= 0; i--) { tw.textContent = s.slice(0, i); await sleep(12); }
        await sleep(260);
        li = (li + 1) % lines.length;
      }
    })();
  });

  /* ---------- parallax do rato e inclinação do painel ---------- */
  safe('parallax', () => {
    const hero = $('#hero'), tilt = $('#tilt');
    if (!hero || reduce || !fine) return;
    let pend = null;
    hero.addEventListener('pointermove', e => {
      pend = e;
      if (hero._r) return;
      hero._r = raf(() => {
        hero._r = 0;
        const r = hero.getBoundingClientRect(), x = (pend.clientX - r.left) / r.width - .5, y = (pend.clientY - r.top) / r.height - .5;
        hero.style.setProperty('--mx', x.toFixed(3)); hero.style.setProperty('--my', y.toFixed(3));
        if (tilt) { tilt.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg'); tilt.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg'); }
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0);
      if (tilt) { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); }
    });
  });

  /* ---------- foco do rato nos cartões e botões magnéticos ---------- */
  safe('rato', () => {
    if (!fine) return;
    $$('.spot').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', (e.clientX - r.left) + 'px'); el.style.setProperty('--y', (e.clientY - r.top) + 'px');
    }, { passive: true }));
    if (reduce) return;
    $$('.mag').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 10}px, ${((e.clientY - r.top) / r.height - .5) * 8}px)`;
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  });

  /* ---------- progresso, cabeçalho e CTA fixo ---------- */
  safe('scroll', () => {
    const prog = $('#prog'), hdr = $('#hdr'), sticky = $('#sticky'), valores = $('#valores');
    let t = false;
    const upd = () => {
      t = false;
      const y = scrollY, h = root.scrollHeight - innerHeight;
      if (prog) prog.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
      if (hdr) hdr.classList.toggle('sm', y > 24);
      if (sticky && valores) {
        const r = valores.getBoundingClientRect();
        const noValores = r.top < innerHeight * .85 && r.bottom > 0;
        sticky.classList.toggle('show', y > 650 && !noValores);
      }
    };
    addEventListener('scroll', () => { if (!t) { t = true; raf(upd); } }, { passive: true });
    addEventListener('resize', upd, { passive: true });
    upd();
  });

  /* ---------- comparador antes / depois ---------- */
  safe('antes-depois', () => {
    const ba = $('#ba'), br = $('#ba-range');
    if (!ba || !br) return;
    const setP = v => ba.style.setProperty('--p', v + '%');
    br.addEventListener('input', () => { ba.classList.add('touched'); setP(br.value); });
    if (reduce || !('IntersectionObserver' in window)) return;
    const demo = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      demo.disconnect();
      const seq = [24, 76, 50]; let k = 0, cur = 50;
      const go = () => {
        if (ba.classList.contains('touched') || k >= seq.length) return;
        const from = cur, to = seq[k++], t0 = performance.now(), d = 1000;
        (function s(now) {
          if (ba.classList.contains('touched')) return;
          const p = Math.min(1, (now - t0) / d), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          cur = from + (to - from) * e; setP(cur.toFixed(1)); br.value = cur;
          if (p < 1) raf(s); else setTimeout(go, 220);
        })(t0);
      };
      setTimeout(go, 600);
    }, { threshold: .6 });
    demo.observe(ba);
  });

  /* ---------- explorador do sistema ---------- */
  safe('explorador', () => {
    const xp = $('#xp');
    if (!xp) return;
    const tabs = $$('.xp-tab', xp), panels = $$('.xp-panel', xp);
    let cur = 0, timer = null;
    const show = (i, focus) => {
      cur = i;
      tabs.forEach((t, k) => { const on = k === i; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
      panels.forEach((p, k) => { p.hidden = k !== i; p.classList.toggle('on', k === i); });
      if (focus) tabs[i].focus();
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } xp.classList.remove('auto'); };
    tabs.forEach((t, i) => t.addEventListener('click', () => { stop(); show(i); }));
    xp.querySelector('.xp-tabs').addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); stop(); show((cur + k + tabs.length) % tabs.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); stop(); show(0, true); }
      else if (e.key === 'End') { e.preventDefault(); stop(); show(tabs.length - 1, true); }
    });
    ['pointerenter', 'focusin', 'touchstart'].forEach(ev => xp.addEventListener(ev, stop, { passive: true }));
    if (reduce || !('IntersectionObserver' in window)) return;
    const vis = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      vis.disconnect();
      xp.classList.add('auto');
      timer = setInterval(() => show((cur + 1) % tabs.length), 6000);
    }, { threshold: .55 });
    vis.observe(xp);
  });
})();
