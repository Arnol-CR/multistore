/**
 * ver-articulo.js — MultiStore
 * Ventana "Ver artículo" compartida + generación de tarjetas.
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
  .va-util{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:#9ca3af;margin-top:-4px;padding:0 4px}
  .va-util b{font-weight:700}.va-util i{font-style:normal;color:#fbbf24}
  .va-util-nota{flex-basis:100%;font-size:11.5px;color:#fbbf24}
  .va-nl{margin:0 18px 12px;border:1px solid #3f1d24;background:#1a1013;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
  .va-nl[hidden]{display:none}
  .va-nl-tit{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f87171}
  .va-nl-fila{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .va-nl label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#9ca3af}
  .va-nl .va-chk{flex-direction:row;align-items:center;gap:8px;font-size:12.5px;color:#e2e8f0}
  .va-nl-acc{display:flex;gap:8px;justify-content:flex-end}
  .va-nl-txt{font-size:13px;color:#e2e8f0;line-height:1.5}
  .va-btn.rojo{color:#fca5a5;border-color:#3f1d24}
  @media(max-width:560px){.va-nl-fila{grid-template-columns:1fr}}
  .va-btn.rosa{color:#fff;background:#E8327A;border-color:#E8327A}
  .va-btn.rosa:hover{background:#d12a6d}
  .va-btn.rosa:disabled{opacity:.6;cursor:wait}
  .va-btn.sec{color:#f9a8d4;border-color:#5b1d3a;background:#1f0c16}
  .va-btn.sec:hover{background:#2a0f1e;color:#fff}
  .va-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#052e16;border:1px solid #14532d;color:#4ade80;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;z-index:1300;box-shadow:0 8px 30px rgba(0,0,0,.6);font-family:'Segoe UI',sans-serif}
  .va-toast.err{background:#1f0707;border-color:#7f1d1d;color:#fca5a5}
  .va-foto{position:relative;width:100%;aspect-ratio:auto;height:min(380px,52vh)}
  .va-cuerpo{gap:16px;padding:14px 18px}
  .va-der{gap:9px}
  .va-nom{font-size:17px}
  .va-desc{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px}
  .va-desc.abierta{display:block}
  .va-mas{background:none;border:none;color:#60a5fa;font-size:12px;cursor:pointer;padding:0;font-family:inherit;align-self:flex-start;margin-top:-4px}
  .va-precio{padding:9px 12px}.va-precio span{font-size:20px}
  .va-dato{padding:7px 10px}
  .va-pie{padding:12px 18px}.va-btn{padding:9px}
  .va-foto-acc{position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:6px;justify-content:center;opacity:0;transition:.15s}
  .va-foto:hover .va-foto-acc,.va-foto.vacia .va-foto-acc,.va-foto:focus-within .va-foto-acc{opacity:1}
  .va-fb{background:rgba(13,16,23,.88);border:1px solid #2a3342;color:#e2e8f0;border-radius:7px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;backdrop-filter:blur(4px)}
  .va-fb:hover{border-color:#3b82f6}
  .va-link{display:none;gap:6px;margin-top:-6px;margin-bottom:6px}
  .va-link.on{display:flex}
  .va-nom-fila{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
  .va-cambiar{background:none;border:1px solid #2a3342;color:#93c5fd;border-radius:6px;padding:3px 9px;font-size:11.5px;font-weight:600;cursor:pointer;flex-shrink:0;font-family:inherit;margin-top:3px}
  .va-cambiar:hover{border-color:#3b82f6;color:#fff}
  .va-cat{border:1px solid #1e2530;background:#0b0f15;border-radius:9px;padding:8px;display:flex;flex-direction:column;gap:6px}
  .va-cat[hidden],.va-cat-nuevo[hidden]{display:none}
  .va-cat-fila{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);gap:6px}
  .va-cat-lista{max-height:170px;overflow-y:auto;display:flex;flex-direction:column}
  .va-cat-it{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12.5px;color:#e2e8f0;background:none;border:none;text-align:left;font-family:inherit;width:100%}
  .va-cat-it:hover,.va-cat-it.sel{background:#1a2540}
  .va-cat-it small{color:#6b7280;white-space:nowrap;font-size:11px}
  .va-cat-it.actual{color:#4ade80}
  .va-cat-add{color:#4ade80;font-weight:600}
  .va-cat-vacio{font-size:12px;color:#6b7280;padding:6px 8px}
  .va-cat-nuevo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,130px) 70px auto;gap:6px;border-top:1px solid #1e2530;padding-top:6px}
  .va-in{background:#13181f;border:1px solid #1e2530;border-radius:7px;padding:7px 9px;color:#e2e8f0;font-size:12.5px;outline:none;font-family:inherit;width:100%;min-width:0}
  .va-in:focus{border-color:#3b82f6;background:#0c1525}
  .va-dato select.va-in,.va-dato input.va-in{margin-top:2px;padding:5px 7px;font-size:12.5px;font-weight:600}
  .va-dato.edit{cursor:pointer}
  .va-dato.edit:hover{border-color:#1e3a5f}
  .va-dato .va-hint{font-size:10.5px;color:#4b5563;margin-top:3px;display:block}
  .va-nt{display:none;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:flex-end}
  .va-nt.on{display:flex}
  .va-nt label{display:flex;flex-direction:column;gap:3px;font-size:10px;color:#6b7280;flex:1;min-width:110px}
  .va-sub{opacity:.6;pointer-events:none}
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
    document.addEventListener('keydown', e => { const cb = fondo && fondo.querySelector('.va-cat'); if (e.key === 'Escape' && cb && !cb.hidden && fondo.classList.contains('abierto')) { e.stopPropagation(); cb.hidden = true; return; } if (e.key === 'Escape' && fondo.classList.contains('abierto')) { e.stopPropagation(); cerrar(); } }, true);
  }
  function cerrar() { fondo && fondo.classList.remove('abierto'); }
  function toast(txt, err) {
    document.querySelectorAll('.va-toast').forEach(x => x.remove());
    const t = document.createElement('div'); t.className = 'va-toast' + (err ? ' err' : ''); t.textContent = txt;
    document.body.appendChild(t); setTimeout(() => t.remove(), err ? 7000 : 2600);
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
    return {
      cant, compra, venta, costoL,
      gan: venta && costoL ? venta - costoL : null,
      tienda: a.NombreEmpresa || a.Tienda || '',
      pedido: a.NoPedidoAplicacion || a.NumeroPedido || '',
      link: a.Link && /^https?:\/\//i.test(a.Link) ? a.Link : ''
    };
  }

  // ══════════ Edición rápida: foto, vendedor y tracking ══════════
  function esAdminVA() { try { return !!(JSON.parse(localStorage.getItem('ms_usuario') || '{}').esAdmin); } catch (e) { return false; } }
  function fotoHtml(src) {
    return (src ? `<img src="${esc(src)}" alt="">` : `${ico(IMG, 28)}Sin fotografía`) +
      `<div class="va-foto-acc">${actual && actual.Link && /^https?:/i.test(actual.Link) ? '<button class="va-fb va-desde-tienda" type="button" title="Toma la foto de la página del producto">Desde la tienda</button>' : ''}<button class="va-fb va-subir" type="button">Subir</button><button class="va-fb va-pegar-link" type="button">Link</button><span class="va-fb" style="cursor:default;font-weight:400;color:#9ca3af" title="Pegá una imagen, un link o lo que copió el marcador">o Ctrl+V</span></div>`;
  }
  const esImagen = u => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(u) || /ltwebstatic\.com|kwcdn\.com|media-amazon\.com|images-amazon\.com|blob\.core\.windows\.net|alicdn\.com/i.test(u);
  async function fotoDesdePagina(url) {
    const r = await fetch('/api/cotizaciones/leer-link?url=' + encodeURIComponent(url));
    const d = await r.json().catch(() => ({}));
    if (d.ok && d.data && d.data.foto) return d.data.foto;
    throw new Error(d.bloqueado ? 'la tienda no dejó leer la página. Copiá la imagen (clic derecho → Copiar imagen) y pegala con Ctrl+V' : (d.error || 'no encontré la foto en esa página'));
  }
  // Texto copiado por el marcador: MULTISTORE_IMPORT{...}
  function leerMarcador(t) {
    t = String(t || '');
    const i = t.indexOf('MULTISTORE_IMPORT'); if (i < 0) return null;
    const a = t.indexOf('{', i), b = t.lastIndexOf('}'); if (a < 0 || b < a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
  }
  const abs = u => { u = String(u || '').trim(); if (u.indexOf('//') === 0) u = 'https:' + u; return /^https?:/i.test(u) ? u : ''; };
  function fotoDeMarcador(t) {
    const d = leerMarcador(t); if (!d) return '';
    const it = (d.items || []).find(x => abs(x.foto));
    return it ? abs(it.foto) : '';
  }
  function linkDeMarcador(t) {
    const d = leerMarcador(t); if (!d) return '';
    const it = (d.items || []).find(x => abs(x.link));
    return it ? abs(it.link) : '';
  }
  window.fotoDeMarcadorMS = fotoDeMarcador;
  window.fotoDesdeLinkMS = async u => esImagen(u) ? u : await fotoDesdePagina(u);
  function avisar(a, campos) { try { window.dispatchEvent(new CustomEvent('articulo-actualizado', { detail: { articulo: a, campos } })); } catch (e) {} }
  let vendedoresVA = null, seguimientosVA = null;
  async function json(url, op) {
    const r = await fetch(url, op);
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw new Error(d.error || d.mensaje || ('Error ' + r.status));
    return d;
  }

  async function guardarFoto(a, cuerpo) {
    const f = fondo.querySelector('.va-foto'); f.classList.add('va-sub');
    try {
      const d = await json('/api/crear-pedidos/foto', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({ idDetallePedido: a.IdDetallePedido }, cuerpo)) });
      a.Fotografia = d.fotografia || null;
      f.classList.toggle('vacia', !a.Fotografia); f.innerHTML = fotoHtml(a.Fotografia); engancharFoto(a);
      fondo.querySelector('.va-link').classList.remove('on');
      toast('Foto actualizada'); avisar(a, ['foto']);
    } catch (e) { toast('No se pudo cambiar la foto: ' + e.message, true); }
    f.classList.remove('va-sub');
  }
  function leerImagen(a, file) {
    if (!file || !/^image\//.test(file.type)) return;
    if (file.size > 8 * 1024 * 1024) { toast('La imagen es muy grande (máx. 8 MB)', true); return; }
    const r = new FileReader();
    r.onload = e => guardarFoto(a, { fotoBase64: e.target.result.split(',')[1], fotoMime: file.type });
    r.readAsDataURL(file);
  }
  function engancharFoto(a) {
    const s = fondo.querySelector('.va-subir'), l = fondo.querySelector('.va-pegar-link');
    if (s) s.onclick = e => { e.stopPropagation(); fondo.querySelector('.va-file').click(); };
    if (l) l.onclick = e => { e.stopPropagation(); const box = fondo.querySelector('.va-link'); box.classList.toggle('on'); box.querySelector('input').focus(); };
    const dt = fondo.querySelector('.va-desde-tienda'); if (dt && fondo._usarLink) dt.onclick = e => { e.stopPropagation(); fondo._usarLink(a.Link); };
    const img = fondo.querySelector('.va-foto img'); if (img) img.onerror = () => { img.remove(); fondo.querySelector('.va-foto').classList.add('vacia'); };
  }
  // ══════════ Cambiar el artículo del catálogo ══════════
  let ARTS = null, CATS = null;
  const nrm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  async function catalogoVA(forzar) {
    if (ARTS && !forzar) return;
    const [x, y] = await Promise.all([json('/api/catalogo/articulos'), json('/api/catalogo/categorias')]);
    ARTS = x.data || []; CATS = y.data || [];
  }
  // Marcar "no llegó": el costo pasa a ser pérdida en Finanzas (solo administrador)
  function engancharNoLlego(a) {
    const caja = fondo.querySelector('.va-nl'), btn = fondo.querySelector('.va-nl-btn');
    if (!caja || !btn) return;
    let est = null;
    const hoyS = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
    const api = async (metodo, cuerpo) => {
      const r = await fetch('/api/tracking/no-llego' + (metodo === 'GET' ? '/' + a.IdDetallePedido : ''), metodo === 'GET' ? {} : { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const d = await r.json().catch(() => ({})); if (!d.ok) throw new Error(d.error || 'Error ' + r.status); return d;
    };
    const marcado = () => {
      caja.hidden = false; btn.textContent = 'No llegó (marcado)';
      caja.innerHTML = `<div class="va-nl-tit">Marcado como no llegó</div>
        <div class="va-nl-txt">${esc(est.Motivo || 'No llegó')} · desde el ${esc(fecha(est.Fecha) || est.Fecha || '')}${num(est.Reembolso) ? ` · reembolso ${fmtL(num(est.Reembolso))}` : ''}${num(est.QuitoCobro) ? ' · se le quitó el cobro al cliente' : ''}. Cuenta como pérdida en Finanzas.</div>
        <div class="va-nl-acc"><button class="va-fb va-nl-des" type="button">Deshacer</button></div>`;
      caja.querySelector('.va-nl-des').onclick = async e => {
        const b = e.currentTarget;
        if (!confirm('¿Deshacer? Vuelve a quedar pendiente y, si se le quitó el cobro al cliente, se le vuelve a cobrar.')) return;
        b.disabled = true;
        try { await api('PUT', { id: a.IdDetallePedido, noLlego: false }); est.NoLlego = 0; caja.hidden = true; btn.textContent = 'No llegó'; avisoVA('Listo, ya no cuenta como pérdida'); }
        catch (err) { avisoVA('No se pudo: ' + err.message, true); b.disabled = false; }
      };
    };
    const formulario = () => {
      const venta = num(est && est.Venta), conCli = est && est.IdCliente && venta > 0;
      caja.hidden = false;
      caja.innerHTML = `<div class="va-nl-tit">Marcar como no llegó</div>
        <div class="va-nl-fila">
          <label>Fecha<input class="va-in va-nl-f" type="date" value="${hoyS()}"></label>
          <label>Motivo<select class="va-in va-nl-m"><option>No llegó</option><option>Llegó dañado</option><option>La tienda lo canceló</option><option>Se perdió en el casillero</option><option>Otro</option></select></label>
          <label>Reembolso de la tienda (L)<input class="va-in va-nl-r" type="number" min="0" step="0.01" placeholder="0.00"></label>
        </div>
        ${conCli ? `<label class="va-chk"><input type="checkbox" class="va-nl-q" checked> Quitarle el cobro al cliente (${fmtL(venta)}); lo que ya pagó le queda a favor</label>` : ''}
        <div class="va-nl-acc"><button class="va-fb va-nl-no" type="button">Cancelar</button><button class="va-fb va-nl-ok" type="button" style="background:#b91c1c;border-color:#b91c1c">Guardar como pérdida</button></div>`;
      caja.querySelector('.va-nl-no').onclick = () => { caja.hidden = true; };
      caja.querySelector('.va-nl-ok').onclick = async e => {
        const b = e.currentTarget, q = caja.querySelector('.va-nl-q');
        const cuerpo = { id: a.IdDetallePedido, noLlego: true, fecha: caja.querySelector('.va-nl-f').value, motivo: caja.querySelector('.va-nl-m').value, reembolso: caja.querySelector('.va-nl-r').value, quitarCobro: q ? q.checked : false };
        b.disabled = true;
        try { const d = await api('PUT', cuerpo); est = { ...est, NoLlego: 1, Fecha: cuerpo.fecha, Motivo: cuerpo.motivo, Reembolso: cuerpo.reembolso, QuitoCobro: d.quitoCobro ? 1 : 0 }; marcado(); avisoVA('Marcado como no llegó'); }
        catch (err) { avisoVA('No se pudo: ' + err.message, true); b.disabled = false; }
      };
    };
    api('GET').then(d => { if (actual !== a) return; est = d.data || {}; if (num(est.NoLlego)) marcado(); }).catch(() => {});
    btn.onclick = () => { if (!caja.hidden) { caja.hidden = true; return; } est && num(est.NoLlego) ? marcado() : formulario(); };
  }
  // Utilidad real: venta − (costo + envío + combustible). Sin orden pagada, se muestra con envío estimado.
  function engancharUtilidad(a, d) {
    const caja = fondo.querySelector('.va-util'); if (!caja) return;
    fetch(`/api/trazabilidad/${a.IdDetallePedido}/costos`).then(r => r.json()).then(r => {
      if (actual !== a || !r.ok || !r.data) return;
      const x = r.data, venta = num(x.Venta) || d.venta, costo = num(x.CostoL) || num(d.costoL), real = !!x.IdOrden;
      const envio = real ? num(x.EnvioReal) : num(x.EnvioEstimado), comb = real ? num(x.Combustible) : 0;
      const util = venta - costo - envio - comb, pct = venta ? (util / venta * 100).toFixed(1) + '%' : '';
      if (!venta) {   // sin precio: lo que va costando con envío
        caja.hidden = false;
        caja.innerHTML = `<span>Costo ${fmtL(Math.round(costo))}</span><span>Envío ${fmtL(Math.round(envio))}${real ? '' : ' <i>estimado</i>'}</span>${comb ? `<span>Combustible ${fmtL(Math.round(comb))}</span>` : ''}<span><b>Costo total ${fmtL(Math.round(costo + envio + comb))}</b></span>`
          + (real ? '' : '<div class="va-util-nota">Envío estimado por peso según el casillero. Cuando tenga orden de pago se usa el real.</div>');
        return;
      }
      const gan = fondo.querySelector('.va-gan');
      if (gan) { gan.className = 'va-gan ' + (util >= 0 ? 'va-pos' : 'va-neg'); gan.textContent = (util >= 0 ? '+' : '−') + fmtL(Math.abs(Math.round(util))) + (real ? '' : ' aprox.');
        gan.title = real ? 'Utilidad: venta menos costo, envío real y combustible' : 'Utilidad aproximada con envío estimado por peso'; }
      caja.hidden = false;
      caja.innerHTML = `<span>Costo ${fmtL(Math.round(costo))}</span><span>Envío ${fmtL(Math.round(envio))}${real ? '' : ' <i>estimado</i>'}</span>${comb ? `<span>Combustible ${fmtL(Math.round(comb))}</span>` : ''}<span class="${util >= 0 ? 'va-pos' : 'va-neg'}"><b>Utilidad ${util < 0 ? '−' : ''}${fmtL(Math.abs(Math.round(util)))}</b> ${pct}</span>`
        + (real ? '' : '<div class="va-util-nota">Todavía no tiene orden de pago: el envío es estimado por peso y no incluye combustible.</div>');
    }).catch(() => {});
  }
  function num(v) { return Number(v) || 0; }
  function avisoVA(t, err) { if (typeof window.showToast === 'function') window.showToast(t, err); else if (typeof window.toast === 'function') window.toast(err ? 'err' : 'ok', t); else if (err) alert(t); }

  function engancharArticulo(a) {
    const box = fondo.querySelector('.va-cat'), sel = box.querySelector('.va-cat-sel'), q = box.querySelector('.va-cat-q');
    const lista = box.querySelector('.va-cat-lista'), nuevo = box.querySelector('.va-cat-nuevo');
    let vis = [], marca = 0;
    const pintar = () => {
      const t = nrm(q.value).trim(), c = sel.value, palabras = t.split(/\s+/).filter(Boolean);
      vis = ARTS.filter(x => (!c || String(x.IdCategoria) === c) && palabras.every(w => nrm(x.NombreArticulo + ' ' + x.CategoriaProducto).includes(w))).slice(0, 80);
      marca = 0;
      const exacto = ARTS.some(x => nrm(x.NombreArticulo).trim() === t);
      lista.innerHTML = vis.map((x, i) => `<button class="va-cat-it${i === 0 && t ? ' sel' : ''}${nrm(x.NombreArticulo) === nrm(a.NombreArticulo) ? ' actual' : ''}" type="button" data-id="${x.IdArticulo}">${esc(x.NombreArticulo)}<small>${esc(x.CategoriaProducto || '')}${parseFloat(x.PesoArticulo) ? ' · ' + parseFloat(x.PesoArticulo) + ' g' : ''}</small></button>`).join('')
        + (t && !exacto ? `<button class="va-cat-it va-cat-add" type="button">+ Agregar "${esc(q.value.trim())}" al catálogo</button>` : '')
        + (!vis.length && !t ? '<div class="va-cat-vacio">No hay artículos en esta categoría</div>' : '');
    };
    const asignar = async idArt => {
      try {
        const r = await json('/api/crear-pedidos/articulo-catalogo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idDetallePedido: a.IdDetallePedido, idArticulo: idArt }) });
        a.IdArticulo = idArt; a.NombreArticulo = r.nombre;
        const cambioPeso = r.peso != null && parseFloat(r.peso) !== parseFloat(r.pesoAntes);
        if (r.peso != null) a.Peso = r.peso;
        fondo.querySelector('.va-nom').textContent = r.nombre;
        box.hidden = true;
        toast('Artículo cambiado a ' + r.nombre + (cambioPeso ? ` · peso ${parseFloat(r.peso)} g` : ''));
        avisar(a, ['articulo']);
      } catch (e) { toast('No se pudo cambiar: ' + e.message, true); }
    };
    fondo.querySelector('.va-cambiar').onclick = async () => {
      if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false; nuevo.hidden = true;
      lista.innerHTML = '<div class="va-cat-vacio">Cargando catálogo…</div>';
      try { await catalogoVA(); } catch (e) { lista.innerHTML = `<div class="va-cat-vacio">No se pudo cargar: ${esc(e.message)}</div>`; return; }
      const opts = CATS.map(c => `<option value="${c.IdCategoria}">${esc(c.CategoriaProducto)}</option>`).join('');
      sel.innerHTML = '<option value="">Todas las categorías</option>' + opts;
      box.querySelector('.va-nv-cat').innerHTML = opts;
      const act = ARTS.find(x => nrm(x.NombreArticulo) === nrm(a.NombreArticulo));
      sel.value = act ? String(act.IdCategoria) : '';
      q.value = ''; pintar(); q.focus();
    };
    sel.onchange = () => { pintar(); q.focus(); };
    q.oninput = pintar;
    q.onkeydown = e => {
      const its = [...lista.querySelectorAll('.va-cat-it')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); marca = Math.max(0, Math.min(its.length - 1, marca + (e.key === 'ArrowDown' ? 1 : -1))); its.forEach((x, i) => x.classList.toggle('sel', i === marca)); its[marca] && its[marca].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); its[marca] && its[marca].click(); }
    };
    lista.onclick = e => {
      const b = e.target.closest('.va-cat-it'); if (!b) return;
      if (b.classList.contains('va-cat-add')) {
        nuevo.hidden = false;
        box.querySelector('.va-nv-nom').value = q.value.trim();
        if (sel.value) box.querySelector('.va-nv-cat').value = sel.value;
        box.querySelector('.va-nv-peso').focus();
        return;
      }
      asignar(+b.dataset.id);
    };
    box.querySelector('.va-nv-ok').onclick = async () => {
      const nom = box.querySelector('.va-nv-nom').value.trim(), cat = box.querySelector('.va-nv-cat').value, peso = parseFloat(box.querySelector('.va-nv-peso').value) || 0;
      if (!nom || !cat) { toast('Poné el nombre y la categoría', true); return; }
      if (ARTS.some(x => nrm(x.NombreArticulo).trim() === nrm(nom) && String(x.IdCategoria) === cat)) { toast('Ese artículo ya existe en esa categoría', true); return; }
      const b = box.querySelector('.va-nv-ok'); b.disabled = true;
      try {
        await json('/api/catalogo/articulos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Nombre: nom, IdCategoria: +cat, Peso: peso }) });
        await catalogoVA(true);
        const n = ARTS.filter(x => nrm(x.NombreArticulo).trim() === nrm(nom) && String(x.IdCategoria) === cat).sort((x, y) => y.IdArticulo - x.IdArticulo)[0];
        if (!n) throw new Error('Se creó, pero no lo encontré para asignarlo');
        await asignar(n.IdArticulo);
      } catch (e) { toast('No se pudo crear: ' + e.message, true); }
      finally { b.disabled = false; }
    };
    box.querySelector('.va-nv-peso').onkeydown = e => { if (e.key === 'Enter') box.querySelector('.va-nv-ok').click(); };
  }

  function engancharEdicion(a) {
    engancharFoto(a);
    fondo.querySelector('.va-file').onchange = e => leerImagen(a, e.target.files[0]);
    const usarLink = async (v) => {
      v = (typeof v === 'string' ? v : fondo.querySelector('.va-url').value).trim();
      const fmk = fotoDeMarcador(v); if (fmk) { guardarFoto(a, { url: fmk }); return; }
      if (leerMarcador(v)) {   // el marcador no trajo la foto: buscarla en la página del producto
        const lk = linkDeMarcador(v);
        if (!lk) { toast('El texto copiado no trae foto ni link del producto. Copialo de nuevo desde la página del producto.', true); return; }
        v = lk;
      }
      if (!/^https?:\/\/\S+$/i.test(v)) { toast('Pegá un link válido (https://…)', true); return; }
      if (esImagen(v)) { guardarFoto(a, { url: v }); return; }
      const f = fondo.querySelector('.va-foto'); f.classList.add('va-sub'); toast('Buscando la foto en la página…');
      try { const foto = await fotoDesdePagina(v); f.classList.remove('va-sub'); await guardarFoto(a, { url: foto }); }
      catch (e) { f.classList.remove('va-sub'); toast('No se pudo: ' + e.message, true); }
    };
    fondo.onpaste = e => {
      if (e.target.closest && e.target.closest('input')) return;
      const it = [...(e.clipboardData?.items || [])].find(x => x.type.startsWith('image/'));
      if (it) { e.preventDefault(); leerImagen(a, it.getAsFile()); return; }
      const txt = (e.clipboardData?.getData('text') || '').trim();
      const fm = fotoDeMarcador(txt);
      if (fm) { e.preventDefault(); guardarFoto(a, { url: fm }); return; }
      if (leerMarcador(txt)) { e.preventDefault(); usarLink(txt); return; }
      if (/^https?:\/\/\S+$/i.test(txt)) { e.preventDefault(); usarLink(txt); }
    };
    fondo._usarLink = usarLink;
    const desdeTienda = fondo.querySelector('.va-desde-tienda'); if (desdeTienda) desdeTienda.onclick = e => { e.stopPropagation(); usarLink(a.Link); };
    fondo.querySelector('.va-url-ok').onclick = () => usarLink();
    fondo.querySelector('.va-url').onkeydown = e => { if (e.key === 'Enter') usarLink(); };

    // Vendedor (solo administrador)
    const sv = fondo.querySelector('.va-vend');
    if (sv) {
      (async () => {
        if (!vendedoresVA) { try { vendedoresVA = (await json('/api/vendedores')).data || []; } catch (e) { vendedoresVA = []; } }
        sv.innerHTML = '<option value="">Sin vendedor</option>' + vendedoresVA.map(v => `<option value="${v.IdVendedor}">${esc(((v.Nombres || '') + ' ' + (v.Apellidos || '')).trim())}</option>`).join('');
        sv.value = a.IdVendedor || '';
      })();
      sv.onchange = async () => {
        const v = sv.value; if (!v) { sv.value = a.IdVendedor || ''; toast('Para dejarlo sin vendedor usá "Quitar vendedor" en Asignar vendedores', true); return; }
        sv.disabled = true;
        try {
          await json('/api/vendedores/asignar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idDetalle: a.IdDetallePedido, idVendedor: +v }) });
          const vv = vendedoresVA.find(x => String(x.IdVendedor) === v) || {};
          a.IdVendedor = +v; a.NombreVendedor = ((vv.Nombres || '') + ' ' + (vv.Apellidos || '')).trim(); a.CodigoVendedor = vv.CodigoVendedor;
          toast('Vendedor asignado: ' + a.NombreVendedor); avisar(a, ['vendedor']);
        } catch (e) { sv.value = a.IdVendedor || ''; toast('No se pudo asignar: ' + e.message, true); }
        sv.disabled = false;
      };
    }

    // Tracking
    const ti = fondo.querySelector('.va-trk'), hint = fondo.querySelector('.va-trk-hint'), nt = fondo.querySelector('.va-nt');
    const cargarTrk = async (forzar) => {
      if (!seguimientosVA || forzar) { try { seguimientosVA = (await json('/api/tracking/seguimientos')).data || []; } catch (e) { seguimientosVA = []; } }
      const dl = fondo.querySelector('#va-dl-trk'); if (dl) dl.innerHTML = seguimientosVA.slice(0, 400).map(x => `<option value="${esc(x.Seguimiento)}">`).join('');
    };
    cargarTrk();
    const buscar = t => (seguimientosVA || []).find(x => String(x.Seguimiento).trim().toLowerCase() === t.trim().toLowerCase());
    const asignar = async (s) => {
      await json('/api/tracking/asignar-seguimiento', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ IdDetalleCliente: a.IdDetallePedido, IdSeguimiento: s.IdSeguimiento }) });
      a.IdSeguimiento = s.IdSeguimiento; a.Seguimiento = s.Seguimiento; if (!a.IdEstado) a.IdEstado = 1;
      nt.classList.remove('on'); hint.textContent = 'Tracking asignado'; hint.style.color = '#4ade80';
      toast('Tracking asignado'); avisar(a, ['tracking']);
    };
    const intentar = async () => {
      const t = ti.value.trim(); if (!t || t === (a.Seguimiento || '')) return;
      await cargarTrk();
      const s = buscar(t);
      if (s) { try { await asignar(s); } catch (e) { toast('No se pudo asignar: ' + e.message, true); } return; }
      const hoy = new Date(), en30 = new Date(Date.now() + 30 * 86400000), iso = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      fondo.querySelector('.va-nt-sal').value = iso(hoy); fondo.querySelector('.va-nt-ent').value = iso(en30);
      nt.classList.add('on'); hint.textContent = 'Ese tracking no existe: confirmá las fechas para crearlo.'; hint.style.color = '#fbbf24';
    };
    fondo.querySelector('.va-trk-ok').onclick = intentar;
    ti.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); intentar(); } };
    fondo.querySelector('.va-nt-ok').onclick = async (e) => {
      const b = e.currentTarget, num = ti.value.trim(), sal = fondo.querySelector('.va-nt-sal').value, ent = fondo.querySelector('.va-nt-ent').value;
      if (!num || !sal || !ent) { toast('Completá el tracking y las dos fechas', true); return; }
      b.disabled = true;
      try {
        await json('/api/tracking/seguimientos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ Seguimiento: num, FechaSalidaInicio: sal, FechaEstimadaEntrega: ent }) });
        await cargarTrk(true);
        const s = buscar(num); if (!s) throw new Error('se creó pero no lo encuentro; recargá la página');
        await asignar(s);
      } catch (e2) { toast('No se pudo crear el tracking: ' + e2.message, true); }
      b.disabled = false;
    };
  }

  window.verArticuloModal = function (a) {
    if (!a) return;
    montar();
    actual = a;
    const d = datos(a);
    fondo.innerHTML = `<div class="va-caja" role="dialog" aria-label="Ver artículo">
      <div class="va-cab"><h3>${ico(OJO)} Ver artículo</h3><button class="va-x" title="Cerrar (Esc)">${ico(X, 18)}</button></div>
      <div class="va-cuerpo">
        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
          <div class="va-foto ${a.Fotografia ? '' : 'vacia'}" tabindex="0" title="Pegá una imagen con Ctrl+V para cambiar la foto">${fotoHtml(a.Fotografia)}</div>
          <div class="va-link"><input class="va-in va-url" placeholder="Link del producto (SHEIN, Temu, Amazon) o link de la imagen"><button class="va-fb va-url-ok" style="background:#1d4ed8;border-color:#1d4ed8">Usar</button></div>
          <input type="file" accept="image/*" class="va-file" style="display:none">
        </div>
        <div class="va-der">
          <div class="va-id"><span>ID detalle pedido</span><span>${esc(a.IdDetallePedido)}</span></div>
          <div class="va-nom-fila"><div class="va-nom">${esc(a.NombreArticulo || 'Sin nombre')}</div><button class="va-cambiar" type="button" title="Cambiar el artículo del catálogo">Cambiar</button></div>
          <div class="va-cat" hidden>
            <div class="va-cat-fila"><select class="va-in va-cat-sel"><option value="">Todas las categorías</option></select><input class="va-in va-cat-q" placeholder="Buscar artículo del catálogo…" autocomplete="off"></div>
            <div class="va-cat-lista"></div>
            <div class="va-cat-nuevo" hidden><input class="va-in va-nv-nom" placeholder="Nombre del artículo"><select class="va-in va-nv-cat"></select><input class="va-in va-nv-peso" type="number" min="0" step="1" placeholder="Peso g"><button class="va-fb va-nv-ok" type="button" style="background:#15803d;border-color:#15803d">Crear</button></div>
          </div>
          ${a.DescripcionArticulo ? `<div class="va-desc">${esc(a.DescripcionArticulo)}</div>${a.DescripcionArticulo.length > 160 ? '<button class="va-mas" type="button" onclick="this.previousElementSibling.classList.toggle(\'abierta\');this.textContent=this.previousElementSibling.classList.contains(\'abierta\')?\'Ver menos\':\'Ver más\'">Ver más</button>' : ''}` : ''}
          <div class="va-tags">
            ${a.TallaColor ? `<span class="va-tag">${esc(a.TallaColor)}</span>` : ''}
            ${d.cant > 1 ? `<span class="va-tag">${d.cant} unidades</span>` : ''}
            ${a.CodigoArticulo ? `<span class="va-tag mono">${esc(a.CodigoArticulo)}</span>` : ''}
          </div>
          <div class="va-precio"><b>Precio de venta</b>
            ${d.venta ? `<span>${fmtL(d.venta)}${d.gan != null ? `<small class="va-gan ${d.gan >= 0 ? 'va-pos' : 'va-neg'}" title="Precio de venta menos lo que costó en la app">${d.gan >= 0 ? '+' : '−'}${fmtL(Math.abs(Math.round(d.gan)))}</small>` : ''}</span>` : '<span class="sin">Sin precio</span>'}
          </div>
          ${esAdminVA() ? '<div class="va-util" hidden></div>' : ''}
          <div class="va-grid">
            ${dato('Precio app', d.compra != null ? `${d.cant > 1 ? `<small>${d.cant} × </small>` : ''}$${d.compra.toFixed(2)}${d.costoL ? ` <small>≈ ${fmtL(Math.round(d.costoL))}</small>` : ''}` : '—', d.compra != null ? '' : 'va-nada')}
            ${dato('Pedido', d.pedido ? `${esc(d.pedido)} <small>${esc(d.tienda)}</small>` : '—', d.pedido ? '' : 'va-nada')}
            ${dato('Cliente', a.NombreCliente ? esc(a.NombreCliente) : 'Sin cliente', a.NombreCliente ? '' : 'va-neg')}
            ${esAdminVA() ? `<div class="va-dato"><b>Vendedor</b><select class="va-in va-vend"><option value="">${a.NombreVendedor ? esc(a.NombreVendedor) : 'Sin vendedor'}</option></select></div>`
                          : dato('Vendedor', a.NombreVendedor ? esc(a.NombreVendedor) : 'Sin vendedor', a.NombreVendedor ? '' : 'va-nada')}
            <div class="va-dato" style="grid-column:1/-1"><b>Tracking</b>
              <div style="display:flex;gap:6px"><input class="va-in va-trk" list="va-dl-trk" value="${esc(a.Seguimiento || '')}" placeholder="Escribí o buscá el tracking y Enter" autocomplete="off"><datalist id="va-dl-trk"></datalist><button class="va-fb va-trk-ok" style="background:#1d4ed8;border-color:#1d4ed8;white-space:nowrap">Asignar</button></div>
              <div class="va-nt"><label>Salida<input class="va-in va-nt-sal" type="date"></label><label>Entrega estimada<input class="va-in va-nt-ent" type="date"></label><button class="va-fb va-nt-ok" style="background:#047857;border-color:#047857">Crear y asignar</button></div>
              <span class="va-hint va-trk-hint">${a.Seguimiento ? '' : 'Sin tracking'}</span></div>
            ${dato('Fecha del pedido', fecha(a.FechaPedido) || '—', a.FechaPedido ? '' : 'va-nada')}
          </div>
        </div>
      </div>
      ${esAdminVA() ? `<div class="va-nl" hidden></div>` : ''}
      <div class="va-pie">
        <button class="va-btn rosa va-copiar" title="Copia una tarjeta con la foto y los datos para pegar en WhatsApp">${ico(COPIAR)} Copiar imagen</button>
        <button class="va-btn va-bajar" title="Descargar la tarjeta como PNG">${ico(BAJAR)} Descargar</button>
        ${d.link ? `<a class="va-btn sec" href="${esc(d.link)}" target="_blank" rel="noopener">${ico(EXT)} Abrir en la tienda</a>` : ''}
        ${esAdminVA() ? `<button class="va-btn rojo va-nl-btn" title="Marcar que este artículo no llegó (se cuenta como pérdida)">No llegó</button>` : ''}
        <button class="va-btn va-cerrar">Cerrar</button>
      </div>
    </div>`;
    fondo.querySelector('.va-x').onclick = cerrar;
    fondo.querySelector('.va-cerrar').onclick = cerrar;
    fondo.querySelector('.va-copiar').onclick = e => copiar(e.currentTarget);
    fondo.querySelector('.va-bajar').onclick = e => descargar(e.currentTarget);
    engancharEdicion(a);
    engancharArticulo(a);
    engancharNoLlego(a);
    engancharUtilidad(a, d);
    const img = fondo.querySelector('.va-foto img');
    if (img) img.onerror = () => { img.remove(); img.parentElement && img.parentElement.classList.add('vacia'); };
    fondo.classList.add('abierto');
  };
  window.cerrarVerArticuloModal = cerrar;

  // ══════════ Helpers de imagen ══════════
  function cargarImg(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      let url = src;
      try {
        const u = new URL(src, location.href);
        if (/^https?:$/.test(u.protocol) && u.origin !== location.origin)
          url = '/api/cotizaciones/img?url=' + encodeURIComponent(u.href);
      } catch (e) {}
      im.src = url;
    });
  }
  function lineas(ctx, texto, ancho, max) {
    const pal = String(texto || '').split(/\s+/).filter(Boolean);
    const out = [];
    let l = '';
    for (const p of pal) {
      const prueba = l ? l + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && l) {
        out.push(l); l = p;
        if (out.length === max) break;
      } else l = prueba;
    }
    if (out.length < max && l) out.push(l);
    if (out.length === max && pal.join(' ').length > out.join(' ').length) {
      let u = out[max - 1];
      while (ctx.measureText(u + '…').width > ancho && u.length) u = u.slice(0, -1);
      out[max - 1] = u.replace(/\s+$/, '') + '…';
    }
    return out;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ══════════ Tarjeta individual (mejorada) ══════════
  async function tarjeta(a) {
    const d = datos(a);
    const W = 1080, H = 1520, M = 56, F = "'Segoe UI', Arial, sans-serif";
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Franja superior
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#E8327A');
    g.addColorStop(1, '#EF7A30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 12);

    const [foto, logo] = await Promise.all([
      cargarImg(a.Fotografia),
      cargarImg('/assets/shopaholic-logo.png')
    ]);

    // Encabezado
    let y = 48;
    if (logo) {
      const lh = 68, lw = logo.width * lh / logo.height;
      ctx.drawImage(logo, M, y, lw, lh);
    } else {
      ctx.fillStyle = '#E8327A';
      ctx.font = `800 42px ${F}`;
      ctx.textBaseline = 'top';
      ctx.fillText('ShopAholic', M, y + 12);
    }

    // Nº de pedido (derecha)
    if (d.pedido) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = `600 20px ${F}`;
      ctx.fillText('PEDIDO', W - M, y + 8);
      ctx.fillStyle = '#111827';
      ctx.font = `700 28px ${F}`;
      ctx.fillText(d.pedido, W - M, y + 34);
      ctx.textAlign = 'left';
    }

    y = 140;

    // Foto
    const fh = 680, fw = W - 2 * M;
    rr(ctx, M, y, fw, fh, 24);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    if (foto) {
      ctx.save();
      rr(ctx, M, y, fw, fh, 24);
      ctx.clip();
      const s = Math.min(fw / foto.width, fh / foto.height);
      const iw = foto.width * s, ih = foto.height * s;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(M, y, fw, fh);
      ctx.drawImage(foto, M + (fw - iw) / 2, y + (fh - ih) / 2, iw, ih);
      ctx.restore();
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `500 28px ${F}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sin fotografía', W / 2, y + fh / 2);
      ctx.textAlign = 'left';
    }

    y += fh + 36;

    // Nombre
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 46px ${F}`;
    for (const l of lineas(ctx, a.NombreArticulo || 'Artículo', W - 2 * M, 2)) {
      ctx.fillText(l, M, y);
      y += 54;
    }

    // Descripción
    if (a.DescripcionArticulo) {
      y += 6;
      ctx.fillStyle = '#64748b';
      ctx.font = `400 26px ${F}`;
      for (const l of lineas(ctx, a.DescripcionArticulo, W - 2 * M, 2)) {
        ctx.fillText(l, M, y);
        y += 34;
      }
    }

    // Chips
    y += 18;
    let x = M;
    ctx.font = `600 24px ${F}`;
    const chips = [];
    if (a.TallaColor) chips.push(a.TallaColor);
    if (d.cant > 1) chips.push(d.cant + ' unidades');

    for (const t of chips) {
      const tw = ctx.measureText(t).width + 36;
      rr(ctx, x, y, tw, 44, 22);
      ctx.fillStyle = '#fdf2f8';
      ctx.fill();
      ctx.strokeStyle = '#f9a8d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#be185d';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, x + 18, y + 23);
      x += tw + 12;
    }
    if (chips.length) y += 60;

    // Separador
    y += 10;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(M, y);
    ctx.lineTo(W - M, y);
    ctx.stroke();
    y += 28;

    // Bloque de información
    const colW = (W - 2 * M - 24) / 2;

    // Tienda
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 18px ${F}`;
    ctx.fillText('TIENDA', M, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 26px ${F}`;
    ctx.fillText(lineas(ctx, d.tienda || '—', colW, 1)[0], M, y + 26);

    // Fecha
    const fechaTxt = fecha(a.FechaPedido) || '—';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 18px ${F}`;
    ctx.fillText('FECHA DEL PEDIDO', M + colW + 24, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 26px ${F}`;
    ctx.fillText(fechaTxt, M + colW + 24, y + 26);

    y += 72;

    // Cliente
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 18px ${F}`;
    ctx.fillText('PEDIDO PARA', M, y);
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 28px ${F}`;
    ctx.fillText(lineas(ctx, a.NombreCliente || 'Sin cliente', colW + 40, 1)[0], M, y + 28);

    // Precio
    if (d.venta) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.font = `600 18px ${F}`;
      ctx.fillText('PRECIO', W - M, y);
      ctx.fillStyle = '#E8327A';
      ctx.font = `800 52px ${F}`;
      ctx.fillText(fmtL(d.venta), W - M, y + 22);
      ctx.textAlign = 'left';
    }

    // Pie
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, H - 48, W, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 18px ${F}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ShopAholic  ·  Gracias por tu compra', W / 2, H - 24);
    ctx.textAlign = 'left';

    return c;
  }

  const aBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
  const nombreArchivo = a => ('shopaholic-' + (a.NombreArticulo || 'articulo') + '-' + (a.IdDetallePedido || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-') + '.png';

  async function descargar(btn) {
    if (!actual) return;
    btn.disabled = true;
    try {
      const blob = await aBlob(await tarjeta(actual));
      const u = URL.createObjectURL(blob);
      const l = document.createElement('a');
      l.href = u; l.download = nombreArchivo(actual); l.click();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
    } catch (e) { toast('No se pudo generar la imagen', true); }
    btn.disabled = false;
  }

  async function copiar(btn) {
    if (!actual) return;
    const txt = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Generando…';
    try {
      const c = await tarjeta(actual);
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sin-portapapeles');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': aBlob(c) })]);
      toast('Imagen copiada. Pegala en WhatsApp con Ctrl+V');
    } catch (e) {
      if (String(e && e.name) === 'SecurityError' || /tainted|insecure/i.test(String(e))) {
        toast('La foto de la tienda no se pudo copiar. Probá con Descargar.', true);
      } else {
        toast('Tu navegador no deja copiar imágenes aquí. Se descargó el archivo.', true);
        try {
          const c = await tarjeta(actual);
          const blob = await aBlob(c);
          const u = URL.createObjectURL(blob);
          const l = document.createElement('a');
          l.href = u; l.download = nombreArchivo(actual); l.click();
        } catch (_) {}
      }
    }
    btn.disabled = false; btn.innerHTML = txt;
  }

  // ══════════ Listado de varios artículos (para vendedores) ══════════
  // Imagen interna de MultiStore: tabla numerada con foto, artículo, descripción y talla,
  // tienda / pedido / fecha, cantidad y precio de la app. Pie con "Generado por".
  window.generarTarjetasMultiples = async function (articulos) {
    if (!articulos || !articulos.length) throw new Error('No hay artículos');
    const F = "'Segoe UI', Arial, sans-serif";
    const AZUL = '#2563eb', ROSA = '#E8327A', NAR = '#EF7A30', TINTA = '#1f2937', GRIS = '#6b7280', LINEA = '#e5e7eb';
    const W = 1280, M = 48, IN = W - 2 * M;
    const ds = articulos.map(datos);
    const vend = a => (a.NombreVendedor || a.CodigoVendedor || '').trim();
    const vends = [...new Set(articulos.map(vend))];
    const sinVend = articulos.every(a => !a.IdVendedor && !vend(a));
    const unVend = !sinVend && vends.length === 1;
    let u = {}; try { u = JSON.parse(localStorage.getItem('ms_usuario') || '{}') || {}; } catch (e) {}
    const autor = `${u.nombres || u.nombre || ''} ${u.apellidos || ''}`.trim() || 'MultiStore';
    const FILA = 120, CAB = 140, BLOQUE = 112, THEAD = 46, TOT = 112, PIE = 64;
    const H = CAB + BLOQUE + THEAD + FILA * articulos.length + TOT + PIE;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    const gb = ctx.createLinearGradient(0, 0, W, 0); gb.addColorStop(0, ROSA); gb.addColorStop(1, NAR);
    ctx.fillStyle = gb; ctx.fillRect(0, 0, W, 8);

    const [marca, logo, ...fotos] = await Promise.all([cargarImg('/assets/shopaholic-logo.png'), cargarImg('/assets/Recurso 3.png'), ...articulos.map(a => cargarImg(a.Fotografia))]);

    // Encabezado: logo de ShopAholic + título
    let y = 32;
    if (marca) { const lh = 70, lw = marca.width * lh / marca.height; ctx.drawImage(marca, M, y, lw, lh); }
    else { ctx.fillStyle = ROSA; ctx.font = `800 38px ${F}`; ctx.fillText('ShopAholic', M, y + 14); }
    ctx.textAlign = 'right';
    ctx.fillStyle = ROSA; ctx.font = `700 26px ${F}`;
    ctx.fillText('ASIGNACIÓN DE ARTÍCULOS A VENDEDOR', W - M, y + 2);
    ctx.fillStyle = TINTA; ctx.font = `600 18px ${F}`;
    ctx.fillText(sinVend ? 'Pendientes de asignar' : unVend ? 'Asignados a ' + vends[0] : 'Asignados a varios vendedores', W - M, y + 38);
    ctx.fillStyle = GRIS; ctx.font = `400 16px ${F}`;
    ctx.fillText(new Date().toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }), W - M, y + 64);
    ctx.textAlign = 'left';
    y = CAB - 20;
    ctx.fillStyle = ROSA; ctx.fillRect(M, y, IN, 3);

    // Bloque: vendedor
    y += 20;
    const unidades = ds.reduce((s, d) => s + d.cant, 0);
    ctx.fillStyle = '#f1f5f9'; rr(ctx, M, y, IN, 72, 8); ctx.fill();
    ctx.fillStyle = sinVend ? '#dc2626' : ROSA; ctx.fillRect(M, y, 5, 72);
    ctx.font = `700 14px ${F}`; ctx.fillStyle = sinVend ? '#dc2626' : ROSA; ctx.fillText('VENDEDOR', M + 24, y + 12);
    ctx.font = `700 25px ${F}`; ctx.fillStyle = TINTA;
    ctx.fillText(sinVend ? 'Sin vendedor asignado' : unVend ? vends[0] : 'Varios vendedores', M + 24, y + 34);
    ctx.textAlign = 'right'; ctx.font = `400 19px ${F}`; ctx.fillStyle = GRIS;
    ctx.fillText(`${articulos.length} artículo${articulos.length === 1 ? '' : 's'} · ${unidades} unidad${unidades === 1 ? '' : 'es'}`, W - M - 20, y + 26);
    ctx.textAlign = 'left';
    y = CAB + BLOQUE;

    // Columnas
    const X = { n: M, foto: M + 46, art: M + 150, desc: M + 450, tienda: M + 790, cant: M + 990, precio: W - M };
    const ancho = { art: X.desc - X.art - 20, desc: X.tienda - X.desc - 24, tienda: X.cant - X.tienda - 10 };
    ctx.font = `700 14px ${F}`; ctx.fillStyle = TINTA;
    ctx.textAlign = 'center'; ctx.fillText('#', X.n + 16, y + 14); ctx.fillText('CANT.', X.cant + 30, y + 14);
    ctx.textAlign = 'left'; ctx.fillText('ARTÍCULO', X.art, y + 14); ctx.fillText('DESCRIPCIÓN / TALLA', X.desc, y + 14); ctx.fillText('TIENDA / PEDIDO', X.tienda, y + 14);
    ctx.textAlign = 'right'; ctx.fillText('PRECIO APP', X.precio, y + 14); ctx.textAlign = 'left';
    ctx.fillStyle = TINTA; ctx.fillRect(M, y + THEAD - 3, IN, 2);
    y += THEAD;

    // Filas
    let total = 0, sinCosto = 0;
    articulos.forEach((a, i) => {
      const d = ds[i], f = fotos[i], cy = y + FILA / 2;
      ctx.fillStyle = GRIS; ctx.font = `700 20px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), X.n + 16, cy);
      // foto
      const fs = 88, fx = X.foto, fy = cy - fs / 2;
      ctx.save(); rr(ctx, fx, fy, fs, fs, 10); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.clip();
      if (f) { const s = Math.max(fs / f.width, fs / f.height); ctx.drawImage(f, fx + (fs - f.width * s) / 2, fy + (fs - f.height * s) / 2, f.width * s, f.height * s); }
      ctx.restore(); rr(ctx, fx, fy, fs, fs, 10); ctx.strokeStyle = LINEA; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      // artículo (+ vendedor si hay varios)
      const subArt = !sinVend && !unVend ? (vend(a) || 'Sin vendedor') : '';
      ctx.font = `700 22px ${F}`; const ln = lineas(ctx, a.NombreArticulo || 'Artículo', ancho.art, 2);
      let ty = cy - (ln.length * 28 + (subArt ? 24 : 0)) / 2;
      ctx.fillStyle = TINTA; ln.forEach(l => { ctx.fillText(l, X.art, ty); ty += 28; });
      if (subArt) { ctx.font = `600 16px ${F}`; ctx.fillStyle = vend(a) ? AZUL : '#dc2626'; ctx.fillText(lineas(ctx, subArt, ancho.art, 1)[0] || '', X.art, ty + 2); }
      // descripción + talla
      ctx.font = `400 17px ${F}`;
      const dl = a.DescripcionArticulo ? lineas(ctx, a.DescripcionArticulo, ancho.desc, a.TallaColor ? 2 : 3) : [];
      const altoD = dl.length * 22 + (a.TallaColor ? 32 : 0);
      ty = cy - altoD / 2;
      ctx.fillStyle = GRIS; dl.forEach(l => { ctx.fillText(l, X.desc, ty); ty += 22; });
      if (a.TallaColor) {
        ctx.font = `700 16px ${F}`; const t = lineas(ctx, a.TallaColor, ancho.desc - 24, 1)[0] || '';
        const tw = ctx.measureText(t).width + 22;
        rr(ctx, X.desc, ty + 4, tw, 26, 13); ctx.fillStyle = '#eff6ff'; ctx.fill(); ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#1d4ed8'; ctx.fillText(t, X.desc + 11, ty + 9);
      }
      if (!dl.length && !a.TallaColor) { ctx.fillStyle = '#9ca3af'; ctx.font = `400 17px ${F}`; ctx.fillText('—', X.desc, cy - 10); }
      // tienda / pedido / fecha
      ctx.font = `700 19px ${F}`; ctx.fillStyle = TINTA; ctx.fillText(lineas(ctx, d.tienda || '—', ancho.tienda, 1)[0] || '—', X.tienda, cy - 36);
      ctx.font = `400 16px ${F}`; ctx.fillStyle = GRIS;
      ctx.fillText(d.pedido ? lineas(ctx, 'N° ' + d.pedido, ancho.tienda, 1)[0] : '', X.tienda, cy - 10);
      ctx.fillText(fecha(a.FechaPedido), X.tienda, cy + 14);
      // cantidad
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 22px ${F}`; ctx.fillStyle = d.cant > 1 ? '#b45309' : TINTA;
      ctx.fillText(String(d.cant), X.cant + 30, cy);
      // precio de la app
      ctx.textAlign = 'right';
      if (d.compra != null) {
        const lt = d.compra * d.cant; total += lt;
        ctx.font = `800 23px ${F}`; ctx.fillStyle = TINTA; ctx.fillText('$' + lt.toFixed(2), X.precio, cy);
        if (d.cant > 1) { ctx.font = `400 15px ${F}`; ctx.fillStyle = GRIS; ctx.fillText('$' + d.compra.toFixed(2) + ' c/u', X.precio, cy + 25); }
      } else { sinCosto++; ctx.font = `600 18px ${F}`; ctx.fillStyle = '#9ca3af'; ctx.fillText('—', X.precio, cy); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      y += FILA;
      ctx.fillStyle = LINEA; ctx.fillRect(M, y - 1, IN, 1);
    });

    // Total
    y += 20;
    const tw = 380, tx = W - M - tw;
    ctx.fillStyle = TINTA; ctx.fillRect(tx, y, tw, 2); ctx.fillRect(tx, y + 70, tw, 2);
    ctx.font = `700 19px ${F}`; ctx.fillText('TOTAL APP', tx + 6, y + 14);
    ctx.font = `400 15px ${F}`; ctx.fillStyle = GRIS;
    ctx.fillText(sinCosto ? `${sinCosto} sin precio registrado` : `${unidades} unidad${unidades === 1 ? '' : 'es'}`, tx + 6, y + 42);
    ctx.textAlign = 'right'; ctx.font = `800 32px ${F}`; ctx.fillStyle = ROSA; ctx.fillText('$' + total.toFixed(2), W - M - 6, y + 18);
    ctx.textAlign = 'left';

    // Pie: generado por
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, H - PIE, W, PIE);
    ctx.fillStyle = LINEA; ctx.fillRect(0, H - PIE, W, 1);
    let px = M;
    if (logo) { const lh = 28, lw = logo.width * lh / logo.height; ctx.drawImage(logo, M, H - PIE / 2 - lh / 2, lw, lh); px = M + lw + 10; }
    ctx.textBaseline = 'middle'; ctx.font = `400 17px ${F}`; ctx.fillStyle = GRIS;
    const hora = new Date().toLocaleString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    ctx.fillText('Generado por ', px, H - PIE / 2);
    let w1 = ctx.measureText('Generado por ').width;
    ctx.font = `700 17px ${F}`; ctx.fillStyle = TINTA; ctx.fillText(autor, px + w1, H - PIE / 2);
    w1 += ctx.measureText(autor).width;
    ctx.font = `400 17px ${F}`; ctx.fillStyle = GRIS; ctx.fillText(' en MultiStore', px + w1, H - PIE / 2);
    ctx.textAlign = 'right'; ctx.fillText(hora, W - M, H - PIE / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    return c;
  };

})();