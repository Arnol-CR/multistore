/**
 * ver-articulo.js — MultiStore
 * Ventana "Ver artículo" compartida. Uso:
 *   <script src="/assets/ver-articulo.js"></script>
 *   verArticuloModal(objetoArticulo)
 * Acepta los campos de SP_PedidosRecientes / C_DetallePedido:
 *   IdDetallePedido, NombreArticulo, DescripcionArticulo, CodigoArticulo, TallaColor, Fotografia, Link,
 *   NumeroPedido, NoPedidoAplicacion, FechaPedido, NombreEmpresa|Tienda, NombreCliente, NombreVendedor,
 *   ValorCompra, CantidadArticulos|Cantidad, ValorCobroCliente|Venta, TasaCambio
 *
 * "Copiar imagen" arma una tarjeta para el cliente (foto, nombre, talla, cantidad, precio de venta).
 * No incluye costo, precio de la app ni vendedor.
 */
(function () {
  const css = `
  .va-fondo{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:1200;align-items:center;justify-content:center;padding:16px}
  .va-fondo.abierto{display:flex}
  .va-caja{background:#0d1017;border:1px solid #1e2530;border-radius:14px;width:100%;max-width:960px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.6);font-family:'Segoe UI',sans-serif;color:#e2e8f0;overflow:hidden}
  .va-cab{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1e2530;flex-shrink:0}
  .va-cab h3{font-size:15px;color:#fff;display:flex;align-items:center;gap:8px;margin:0}
  .va-x{background:none;border:none;color:#6b7280;cursor:pointer;padding:5px;border-radius:6px;display:flex}
  .va-x:hover{color:#e2e8f0;background:#13181f}
  .va-cuerpo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;padding:18px;overflow-y:auto;min-height:0}
  .va-foto{background:#fff;border:1px solid #1e2530;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;aspect-ratio:1/1;align-self:start;position:sticky;top:0}
  .va-foto img{width:100%;height:100%;object-fit:contain}
  .va-foto.vacia{background:#13181f;color:#4b5563;font-size:12px;flex-direction:column;gap:6px}
  .va-der{display:flex;flex-direction:column;gap:12px;min-width:0}
  .va-id{font-size:11px;color:#4b5563;display:flex;justify-content:space-between}
  .va-id span:last-child{font-family:monospace;color:#9ca3af}
  .va-nom{font-size:19px;font-weight:800;color:#f8fafc;line-height:1.25;letter-spacing:-.2px}
  .va-desc{font-size:13px;color:#9ca3af;line-height:1.5}
  .va-tags{display:flex;gap:8px;flex-wrap:wrap}
  .va-tag{font-size:12px;color:#cbd5e1;background:#13181f;border:1px solid #1e2530;border-radius:6px;padding:4px 9px}
  .va-tag.mono{font-family:monospace;color:#9ca3af;font-size:11.5px}
  .va-precio{display:flex;align-items:baseline;justify-content:space-between;gap:10px;background:#13181f;border:1px solid #1e2530;border-radius:10px;padding:12px 14px}
  .va-precio b{font-size:10.5px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600}
  .va-precio span{font-size:24px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums}
  .va-precio span.sin{font-size:15px;color:#f87171;font-weight:600}
  .va-precio small{font-size:12px;font-weight:600;margin-left:6px}
  .va-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .va-dato{background:#0a0c10;border:1px solid #1e2530;border-radius:8px;padding:9px 11px;min-width:0}
  .va-dato b{display:block;font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:3px}
  .va-dato span{font-size:13px;color:#e2e8f0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
  .va-dato small{font-size:11px;color:#6b7280;font-weight:400}
  .va-pos{color:#4ade80!important}.va-neg{color:#f87171!important}.va-nada{color:#4b5563!important;font-weight:400!important}
  .va-pie{display:flex;gap:8px;padding:14px 18px;border-top:1px solid #1e2530;flex-shrink:0;flex-wrap:wrap}
  .va-btn{flex:1;min-width:140px;background:#13181f;color:#9ca3af;border:1px solid #1e2530;border-radius:8px;padding:11px;font-size:13px;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;font-weight:600}
  .va-btn:hover{color:#e2e8f0;border-color:#374151}
  .va-btn.rosa{color:#fff;background:#E8327A;border-color:#E8327A}
  .va-btn.rosa:hover{background:#d12a6d}
  .va-btn.rosa:disabled{opacity:.6;cursor:wait}
  .va-btn.sec{color:#f9a8d4;border-color:#5b1d3a;background:#1f0c16}
  .va-btn.sec:hover{background:#2a0f1e;color:#fff}
  .va-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#052e16;border:1px solid #14532d;color:#4ade80;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;z-index:1300;box-shadow:0 8px 30px rgba(0,0,0,.6);font-family:'Segoe UI',sans-serif}
  .va-toast.err{background:#1f0707;border-color:#7f1d1d;color:#fca5a5}
  @media(max-width:760px){.va-cuerpo{grid-template-columns:1fr}.va-foto{position:static;max-height:46vh;aspect-ratio:auto;height:46vh}.va-nom{font-size:17px}}
  @media(max-width:420px){.va-grid{grid-template-columns:1fr}}`;
  const ico = (p, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const OJO = '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>';
  const X = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
  const IMG = '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>';
  const EXT = '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>';
  const COPIAR = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
  const BAJAR = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>';

  let fondo, actual = null;
  function montar() {
    if (fondo) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    fondo = document.createElement('div'); fondo.className = 'va-fondo';
    fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
    document.body.appendChild(fondo);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && fondo.classList.contains('abierto')) { e.stopPropagation(); cerrar(); } }, true);
  }
  function cerrar() { fondo && fondo.classList.remove('abierto'); }
  function toast(txt, err) {
    const t = document.createElement('div'); t.className = 'va-toast' + (err ? ' err' : ''); t.textContent = txt;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtL = n => 'L ' + Number(n).toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fecha = f => { if (!f) return ''; const d = new Date(f); return isNaN(d) ? '' : d.toLocaleDateString('es-HN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const dato = (t, v, cls) => `<div class="va-dato"><b>${t}</b><span class="${cls || ''}">${v}</span></div>`;

  function datos(a) {
    const cant = parseInt(a.CantidadArticulos ?? a.Cantidad ?? 1) || 1;
    const compra = a.ValorCompra != null ? parseFloat(a.ValorCompra) : null;
    const venta = parseFloat(a.ValorCobroCliente ?? a.Venta ?? 0) || 0;
    const tasa = parseFloat(a.TasaCambio || 0);
    const costoL = compra != null && tasa ? compra * cant * tasa : (a.CostoL || null);
    return { cant, compra, venta, costoL, gan: venta && costoL ? venta - costoL : null,
             tienda: a.NombreEmpresa || a.Tienda || '', pedido: a.NoPedidoAplicacion || a.NumeroPedido || '',
             link: a.Link && /^https?:\/\//i.test(a.Link) ? a.Link : '' };
  }

  window.verArticuloModal = function (a) {
    if (!a) return;
    montar();
    actual = a;
    const d = datos(a);
    fondo.innerHTML = `<div class="va-caja" role="dialog" aria-label="Ver artículo">
      <div class="va-cab"><h3>${ico(OJO)} Ver artículo</h3><button class="va-x" title="Cerrar (Esc)">${ico(X, 18)}</button></div>
      <div class="va-cuerpo">
        <div class="va-foto ${a.Fotografia ? '' : 'vacia'}">${a.Fotografia ? `<img src="${esc(a.Fotografia)}" alt="">` : `${ico(IMG, 28)}Sin fotografía`}</div>
        <div class="va-der">
          <div class="va-id"><span>ID detalle pedido</span><span>${esc(a.IdDetallePedido)}</span></div>
          <div class="va-nom">${esc(a.NombreArticulo || 'Sin nombre')}</div>
          ${a.DescripcionArticulo ? `<div class="va-desc">${esc(a.DescripcionArticulo)}</div>` : ''}
          <div class="va-tags">
            ${a.TallaColor ? `<span class="va-tag">${esc(a.TallaColor)}</span>` : ''}
            ${d.cant > 1 ? `<span class="va-tag">${d.cant} unidades</span>` : ''}
            ${a.CodigoArticulo ? `<span class="va-tag mono">${esc(a.CodigoArticulo)}</span>` : ''}
          </div>
          <div class="va-precio"><b>Precio de venta</b>
            ${d.venta ? `<span>${fmtL(d.venta)}${d.gan != null ? `<small class="${d.gan >= 0 ? 'va-pos' : 'va-neg'}">${d.gan >= 0 ? '+' : '−'}${fmtL(Math.abs(Math.round(d.gan)))}</small>` : ''}</span>` : '<span class="sin">Sin precio</span>'}
          </div>
          <div class="va-grid">
            ${dato('Precio app', d.compra != null ? `${d.cant > 1 ? `<small>${d.cant} × </small>` : ''}$${d.compra.toFixed(2)}${d.costoL ? ` <small>≈ ${fmtL(Math.round(d.costoL))}</small>` : ''}` : '—', d.compra != null ? '' : 'va-nada')}
            ${dato('Pedido', d.pedido ? `${esc(d.pedido)} <small>${esc(d.tienda)}</small>` : '—', d.pedido ? '' : 'va-nada')}
            ${dato('Cliente', a.NombreCliente ? esc(a.NombreCliente) : 'Sin cliente', a.NombreCliente ? '' : 'va-neg')}
            ${dato('Vendedor', a.NombreVendedor ? esc(a.NombreVendedor) : 'Sin vendedor', a.NombreVendedor ? '' : 'va-nada')}
            ${dato('Fecha del pedido', fecha(a.FechaPedido) || '—', a.FechaPedido ? '' : 'va-nada')}
          </div>
        </div>
      </div>
      <div class="va-pie">
        <button class="va-btn rosa va-copiar" title="Copia una tarjeta con la foto y los datos para pegar en WhatsApp">${ico(COPIAR)} Copiar imagen</button>
        <button class="va-btn va-bajar" title="Descargar la tarjeta como PNG">${ico(BAJAR)} Descargar</button>
        ${d.link ? `<a class="va-btn sec" href="${esc(d.link)}" target="_blank" rel="noopener">${ico(EXT)} Abrir en la tienda</a>` : ''}
        <button class="va-btn va-cerrar">Cerrar</button>
      </div>
    </div>`;
    fondo.querySelector('.va-x').onclick = cerrar;
    fondo.querySelector('.va-cerrar').onclick = cerrar;
    fondo.querySelector('.va-copiar').onclick = e => copiar(e.currentTarget);
    fondo.querySelector('.va-bajar').onclick = e => descargar(e.currentTarget);
    const img = fondo.querySelector('.va-foto img');
    if (img) img.onerror = () => { const f = img.parentElement; f.classList.add('vacia'); f.innerHTML = `${ico(IMG, 28)}Sin fotografía`; };
    fondo.classList.add('abierto');
  };
  window.cerrarVerArticuloModal = cerrar;

  // ══════════ Tarjeta para el cliente (canvas) ══════════
  function cargarImg(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      // Las fotos de las tiendas pasan por el servidor para que el navegador deje copiarlas
      let url = src;
      try { const u = new URL(src, location.href); if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) url = '/api/cotizaciones/img?url=' + encodeURIComponent(u.href); } catch (e) {}
      im.src = url;
    });
  }
  function lineas(ctx, texto, ancho, max) {
    const pal = String(texto || '').split(/\s+/).filter(Boolean); const out = []; let l = '';
    for (const p of pal) {
      const prueba = l ? l + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && l) { out.push(l); l = p; if (out.length === max) break; } else l = prueba;
    }
    if (out.length < max && l) out.push(l);
    if (out.length === max && pal.join(' ').length > out.join(' ').length) {
      let u = out[max - 1]; while (ctx.measureText(u + '…').width > ancho && u.length) u = u.slice(0, -1); out[max - 1] = u.replace(/\s+$/, '') + '…';
    }
    return out;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  async function tarjeta(a) {
    const d = datos(a);
    const W = 1080, H = 1350, M = 64, F = "'Segoe UI', Arial, sans-serif";
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    // franja superior de marca
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#E8327A'); g.addColorStop(1, '#EF7A30');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 10);

    const [foto, logo] = await Promise.all([cargarImg(a.Fotografia), cargarImg('/assets/shopaholic-logo.png')]);
    // encabezado
    let y = 44;
    if (logo) { const lh = 70, lw = logo.width * lh / logo.height; ctx.drawImage(logo, M, y, lw, lh); }
    else { ctx.fillStyle = '#E8327A'; ctx.font = `800 44px ${F}`; ctx.textBaseline = 'top'; ctx.fillText('ShopAholic', M, y + 10); }
    // (el nombre de la tienda no va en la tarjeta: es para el cliente)
    y = 140;
    // foto
    const fh = 720, fw = W - 2 * M;
    rr(ctx, M, y, fw, fh, 28); ctx.fillStyle = '#f5f5f7'; ctx.fill();
    if (foto) {
      ctx.save(); rr(ctx, M, y, fw, fh, 28); ctx.clip();
      const s = Math.min(fw / foto.width, fh / foto.height); const iw = foto.width * s, ih = foto.height * s;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(M, y, fw, fh);
      ctx.drawImage(foto, M + (fw - iw) / 2, y + (fh - ih) / 2, iw, ih); ctx.restore();
    } else { ctx.fillStyle = '#9ca3af'; ctx.font = `500 30px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Sin fotografía', W / 2, y + fh / 2); ctx.textAlign = 'left'; }
    y += fh + 40;
    // nombre
    ctx.textBaseline = 'top'; ctx.fillStyle = '#111827'; ctx.font = `800 50px ${F}`;
    for (const l of lineas(ctx, a.NombreArticulo || 'Artículo', W - 2 * M, 1)) { ctx.fillText(l, M, y); y += 60; }
    // descripción
    if (a.DescripcionArticulo) {
      ctx.fillStyle = '#6b7280'; ctx.font = `400 28px ${F}`;
      for (const l of lineas(ctx, a.DescripcionArticulo, W - 2 * M, 2)) { ctx.fillText(l, M, y); y += 38; }
    }
    y += 16;
    // chips
    let x = M; ctx.font = `600 28px ${F}`;
    const chips = []; if (a.TallaColor) chips.push(a.TallaColor); if (d.cant > 1) chips.push(d.cant + ' unidades');
    for (const t of chips) { const w = ctx.measureText(t).width + 40; rr(ctx, x, y, w, 52, 26); ctx.fillStyle = '#fdf2f8'; ctx.fill(); ctx.strokeStyle = '#fbcfe8'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#be185d'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 20, y + 27); x += w + 14; }
    // precio y cliente al pie
    const pieY = H - 150;
    ctx.strokeStyle = '#eef0f3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, pieY - 24); ctx.lineTo(W - M, pieY - 24); ctx.stroke();
    ctx.textBaseline = 'top';
    if (a.NombreCliente) { ctx.fillStyle = '#9ca3af'; ctx.font = `600 22px ${F}`; ctx.fillText('PEDIDO PARA', M, pieY); ctx.fillStyle = '#111827'; ctx.font = `700 34px ${F}`; ctx.fillText(lineas(ctx, a.NombreCliente, 520, 1)[0] || '', M, pieY + 32); }
    if (d.venta) {
      ctx.textAlign = 'right'; ctx.fillStyle = '#9ca3af'; ctx.font = `600 22px ${F}`; ctx.fillText('PRECIO', W - M, pieY);
      ctx.fillStyle = '#E8327A'; ctx.font = `800 64px ${F}`; ctx.fillText(fmtL(d.venta), W - M, pieY + 26); ctx.textAlign = 'left';
    }
    return c;
  }
  const aBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
  const nombreArchivo = a => ('shopaholic-' + (a.NombreArticulo || 'articulo') + '-' + (a.IdDetallePedido || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-') + '.png';

  async function descargar(btn) {
    if (!actual) return;
    btn.disabled = true;
    try {
      const blob = await aBlob(await tarjeta(actual));
      const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = nombreArchivo(actual); l.click();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch (e) { toast('No se pudo generar la imagen', true); }
    btn.disabled = false;
  }

  async function copiar(btn) {
    if (!actual) return;
    const txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Generando…';
    try {
      const c = await tarjeta(actual);
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sin-portapapeles');
      // Safari pide la promesa dentro del ClipboardItem
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': aBlob(c) })]);
      toast('Imagen copiada. Pegala en WhatsApp con Ctrl+V');
    } catch (e) {
      if (String(e && e.name) === 'SecurityError' || /tainted|insecure/i.test(String(e))) toast('La foto de la tienda no se pudo copiar. Probá con Descargar.', true);
      else { toast('Tu navegador no deja copiar imágenes aquí. Se descargó el archivo.', true); try { const c = await tarjeta(actual); const blob = await aBlob(c); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = nombreArchivo(actual); l.click(); } catch (_) {} }
    }
    btn.disabled = false; btn.innerHTML = txt;
  }
})();
