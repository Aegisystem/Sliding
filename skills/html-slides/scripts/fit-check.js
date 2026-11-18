// Revisor de layout para un deck html-slides.
// Pégalo en la consola (o en la herramienta javascript del navegador) con la ventana a
// 1280x720 y vuelve a correrlo a 1024x768. Devuelve "OK" o una lista de problemas por slide.
//
// Revisa, en cada slide:
//   1. FUERA DE PANTALLA  algo se sale por arriba, por los lados o tapa la barra inferior.
//   2. DESBORDE           un bloque HTML (tarjeta, código, título) tiene contenido más ancho o alto que su caja.
//   3. CRUZA BORDE        un texto SVG cruza el borde de un rect del mismo dibujo (debe quedar dentro o fuera).
//   4. CHOQUE             dos textos SVG del mismo dibujo se pisan.
//   5. LETRA CHICA        texto visible con menos de 16 px reales en pantalla.
(async () => {
  const MIN_PX = 16, BOTTOM_BAR = 30, TOL = 1;
  // Congela animaciones en su estado final para medir el layout real.
  const freeze = document.createElement('style');
  freeze.textContent = `.slide{visibility:visible!important}
    .art .d{stroke-dashoffset:0!important;animation:none!important}
    .art .p,.art .f,.rise{opacity:1!important;transform:none!important;animation:none!important}`;
  document.head.appendChild(freeze);
  await new Promise(r => setTimeout(r, 300));

  const H = innerHeight, W = innerWidth, report = [];
  const inter = (a, b) => a.x < b.x + b.width - TOL && b.x < a.x + a.width - TOL && a.y < b.y + b.height - TOL && b.y < a.y + a.height - TOL;
  const inside = (a, b) => a.x >= b.x - TOL && a.y >= b.y - TOL && a.x + a.width <= b.x + b.width + TOL && a.y + a.height <= b.y + b.height + TOL;
  const short = el => (el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  // Caja de un elemento SVG en coordenadas del <svg> raíz (incluye transforms de grupos).
  const boxIn = (el, svg) => {
    const b = el.getBBox(), m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  };

  document.querySelectorAll('.slide').forEach((s, k) => {
    const issues = [];
    const els = [...s.querySelectorAll('*')].filter(e => !e.closest('.notes'));

    // 1. fuera de pantalla
    els.forEach(e => {
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.top < 0 || b.left < 0 || b.right > W || b.bottom > H - BOTTOM_BAR)
        issues.push(`FUERA DE PANTALLA: <${e.tagName.toLowerCase()}> "${short(e)}"`);
    });

    // 2. desborde horizontal de bloques HTML (palabras o código más anchos que su caja)
    s.querySelectorAll('h1,h2,h3,p,pre,.card,.big,.sub,blockquote,.grid,.split,.row').forEach(e => {
      if (e.closest('.notes')) return;
      if (e.scrollWidth > e.clientWidth + 2)
        issues.push(`DESBORDE: <${e.tagName.toLowerCase()}> "${short(e)}"`);
    });

    // 3–5. dibujos SVG
    s.querySelectorAll('svg.art').forEach(svg => {
      const texts = [...svg.querySelectorAll('text')].map(t => ({ t, b: boxIn(t, svg) }));
      const rects = [...svg.querySelectorAll('rect')].map(r => boxIn(r, svg));
      texts.forEach(({ t, b }) => {
        if (rects.some(r => inter(b, r) && !inside(b, r)))
          issues.push(`CRUZA BORDE: texto SVG "${short(t)}"`);
        const px = t.getBoundingClientRect().height * 0.8;
        if (px < MIN_PX) issues.push(`LETRA CHICA: texto SVG "${short(t)}" ≈ ${px.toFixed(0)}px`);
      });
      for (let a = 0; a < texts.length; a++)
        for (let c = a + 1; c < texts.length; c++)
          if (inter(texts[a].b, texts[c].b))
            issues.push(`CHOQUE: "${short(texts[a].t)}" con "${short(texts[c].t)}"`);
    });

    // 5. letra chica en HTML (una línea por bloque, no por cada <span>)
    els.forEach(e => {
      if (e.closest('svg') || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const px = parseFloat(getComputedStyle(e).fontSize);
      const parentPx = parseFloat(getComputedStyle(e.parentElement).fontSize);
      if (px < MIN_PX && !(parentPx < MIN_PX && e.parentElement.closest('.slide')))
        issues.push(`LETRA CHICA: "${short(e)}" ${px.toFixed(0)}px`);
    });

    if (issues.length) report.push(`Slide ${k + 1}:\n  - ` + [...new Set(issues)].join('\n  - '));
  });

  freeze.remove();
  return report.length ? report.join('\n') + `\n(viewport ${W}x${H})` : `OK: ninguna slide con problemas (viewport ${W}x${H})`;
})();
