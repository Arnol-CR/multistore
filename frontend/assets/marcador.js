/**
 * marcador.js — MultiStore
 * Código del botón de marcadores "Tienda → MultiStore".
 * La función sheinScraper() se ejecuta en la página de la TIENDA (SHEIN, Amazon…), no en MultiStore,
 * por eso debe ser autocontenida (no puede usar nada de fuera).
 *
 * Lee:
 *   - Detalle de un PEDIDO (SHEIN / Amazon)  → varios artículos
 *   - Página de un PRODUCTO (SHEIN / Amazon / otras con datos estándar) → 1 artículo
 * Copia al portapapeles: MULTISTORE_IMPORT{ tienda, pedido, tipo, items:[...] }
 *
 * Uso en una página:  <a id="bm-shein">…</a>  y  marcadorHref()  para obtener el href.
 */
function sheinScraper() {
    var host = location.hostname, tienda = '', pedido = '', tipo = 'pedido', items = [];
    function lineasDe(el) { return (el.innerText || '').split(/[\n\t]/).map(function (x) { return x.trim(); }).filter(Boolean); }
    function filaCon(el) { var r = el; while (r && r !== document.body && !r.querySelector('img')) r = r.parentElement; return (r && r !== document.body) ? r : null; }
    function imgDe(row) {
        var img = row.querySelector('img'); var f = img ? (img.getAttribute('data-src') || img.currentSrc || img.src || '') : '';
        if (f.indexOf('//') === 0) f = 'https:' + f; return /^data:/.test(f) ? '' : f;
    }
    function meta(n) { var m = document.querySelector('meta[property="' + n + '"], meta[name="' + n + '"]'); return m ? (m.getAttribute('content') || '') : ''; }
    function txt(sel) { var e = document.querySelector(sel); return e ? (e.innerText || e.textContent || '').trim() : ''; }
    function num(t) { var m = String(t || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; }
    // "1.2 libras", "500 g", "12 onzas", "0.8 kg", "1.5 Pounds" → libras
    function aLibras(t) {
        t = String(t || '').toLowerCase().replace(/,/g, '.');
        var m = t.match(/(\d+(?:\.\d+)?)\s*(libras?|lbs?|pounds?|onzas?|oz|ounces?|kilogramos?|kg|kilograms?|gramos?|g\b|grams?)/);
        if (!m) return 0;
        var v = parseFloat(m[1]), u = m[2];
        if (/^(onza|oz|ounce)/.test(u)) return v / 16;
        if (/^(kilo|kg)/.test(u)) return v * 2.20462;
        if (/^(gramo|g$|g\b|gram)/.test(u)) return v / 453.592;
        return v;
    }
    function jsonLdProducto() {
        var s = document.querySelectorAll('script[type="application/ld+json"]');
        for (var i = 0; i < s.length; i++) {
            try {
                var d = JSON.parse(s[i].textContent), arr = [].concat(d['@graph'] || d);
                for (var k = 0; k < arr.length; k++) if (arr[k] && /Product/i.test(arr[k]['@type'])) return arr[k];
            } catch (e) {}
        }
        return null;
    }

    /* ───────── PEDIDO SHEIN ───────── */
    if (/shein\./i.test(host) && /order/i.test(location.pathname)) {
        tienda = 'SHEIN';
        var m = location.pathname.match(/detail\/([A-Z0-9]+)/i); pedido = m ? m[1] : '';
        var vistos = [], all = document.querySelectorAll('body *');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.children.length > 2) continue;
            var ms = (el.textContent || '').trim().match(/^SKU\s*[:：]\s*([A-Za-z0-9\-_]+)$/);
            if (!ms) continue;
            var row = filaCon(el);
            if (!row || vistos.indexOf(row) >= 0) continue;
            vistos.push(row);
            var lineas = lineasDe(row), t2 = lineas.join('\n');
            var precio = (t2.match(/\$\s*([\d,]+\.\d{1,2})/) || [])[1] || '0';
            var cant = 1, titulo = '', talla = '';
            lineas.forEach(function (l) {
                if (/^\d{1,3}$/.test(l) && cant === 1) cant = parseInt(l, 10);
                else if (!talla && / \/ /.test(l) && l.length < 50 && l.indexOf('$') < 0 && !/SKU/i.test(l)) talla = l;
                else if (!titulo && l.length > 12 && !/SKU|\$|devolver|devoluci|Pol[ií]tica/i.test(l)) titulo = l;
            });
            var a = row.querySelector('a[href*="-p-"], a[href*="goods"]');
            var gid = a ? (a.href.match(/-p-(\d+)/) || [])[1] : '';
            items.push({ sku: ms[1], titulo: titulo.replace(/^\d+\s+piezas?\s+/i, ''), talla: talla,
                precio: parseFloat(precio.replace(/,/g, '')) || 0, cant: cant,
                foto: imgDe(row).replace(/_thumbnail_\d+x\d*/, ''), link: gid ? location.origin + '/p-' + gid + '.html' : '' });
        }
    }
    /* ───────── PEDIDO AMAZON ───────── */
    else if (/amazon\./i.test(host) && /order/i.test(location.pathname + location.search)) {
        tienda = 'Amazon';
        pedido = new URLSearchParams(location.search).get('orderID') || ((document.body.innerText.match(/\b(\d{3}-\d{7}-\d{7})\b/) || [])[1] || '');
        var filas = [], links = document.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]');
        for (var k = 0; k < links.length; k++) {
            var ln = links[k], tt = (ln.innerText || '').trim();
            var asin = (ln.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/) || [])[1];
            if (!asin || tt.length < 15 || /^(ver|view|comprar|buy)\b/i.test(tt)) continue;
            var r = filaCon(ln);
            if (!r || filas.indexOf(r) >= 0) continue;
            var rt = r.innerText || '';
            if (!/Vendido por|Sold by|Comprar nuevamente|Buy it again|Ver el art[ií]culo|View your item|devoluci|Return/i.test(rt)) continue;
            filas.push(r);
            var pr = (rt.match(/(?:US\$|\$)\s*([\d,]+\.\d{2})/) || [])[1] || '0';
            var q = (rt.match(/(?:Cantidad|Qty|Quantity)\s*:?\s*(\d+)/i) || [])[1];
            if (!q) { var badge = r.querySelector('[class*="qty"], [class*="quantity"]'); if (badge && /^\d+$/.test(badge.innerText.trim())) q = badge.innerText.trim(); }
            var var_ = lineasDe(r).filter(function (l) { return /^(Talla|Tamaño|Size|Color|Colour|Estilo|Style)\s*:/i.test(l); }).map(function (l) { return l.replace(/^[^:]+:\s*/, ''); }).join(' / ');
            items.push({ sku: asin, titulo: tt.replace(/\s+/g, ' '), talla: var_, precio: parseFloat(pr.replace(/,/g, '')) || 0,
                cant: parseInt(q || '1', 10), foto: imgDe(r).replace(/\._[^./]+_\./, '.'), link: 'https://www.amazon.com/dp/' + asin });
        }
    }

    /* ───────── PEDIDO TEMU ───────── */
    else if (/temu\./i.test(host) && /order/i.test(location.pathname)) {
        tienda = 'Temu';
        pedido = new URLSearchParams(location.search).get('parent_order_sn') || ((document.body.innerText.match(/\b(PO-\d{3}-\d{8,})\b/) || [])[1] || '');
        // Cada artículo tiene un marcador de cantidad "×N"
        var marcasT = [].filter.call(document.querySelectorAll('body *'), function (e) { return !e.children.length && /^[x×]\s*\d{1,3}$/i.test((e.textContent || '').trim()); });
        var cuantasT = function (el) { var n = 0; for (var q = 0; q < marcasT.length; q++) if (el.contains(marcasT[q])) n++; return n; };
        var fotoProd = function (im) { var src = im.currentSrc || im.src || im.getAttribute('data-src') || ''; var w = im.naturalWidth || im.width || 0; return /kwcdn|temu/i.test(src) && !/avatar|logo|icon|flag/i.test(src) && (w === 0 || w >= 50) ? src : ''; };
        // fotos de producto en orden de aparición (por si la foto está fuera de la fila)
        var todasFotos = [].map.call(document.querySelectorAll('img'), fotoProd).filter(Boolean);
        marcasT.forEach(function (mk, idx) {
            // subir mientras el contenedor siga teniendo SOLO este artículo
            var fila = mk;
            var completa = function (el) { return [].some.call(el.querySelectorAll('img'), function (im) { return !!fotoProd(im); }) && /\$\s*[\d,]+\.\d{2}/.test(el.innerText || ''); };
            while (fila.parentElement && fila.parentElement !== document.body && cuantasT(fila.parentElement) === 1 && !completa(fila)) fila = fila.parentElement;
            var lt = lineasDe(fila);
            var precioT = ((fila.innerText || '').match(/\$\s*([\d,]+\.\d{2})/) || [])[1] || '0';
            var tituloT = '', varianteT = '';
            lt.forEach(function (l) {
                if (/^\$|^[x×]\s*\d+$|Qu[eé] incluye|rese[ñn]a|Comprar de nuevo|Devoluci|Rastrear|recibo|Vendido y enviado|cr[eé]dito|Despu[eé]s de|Env[ií]o gratis|Excepto art/i.test(l)) return;
                var limpio = l.replace(/\s*\$\s*[\d,]+\.\d{2}\s*$/, '').replace(/\s*[x×]\s*\d+$/i, '').trim();
                if (!limpio) return;
                if (!tituloT && limpio.length > 15) tituloT = limpio;
                else if (tituloT && !varianteT && limpio.length < 120) varianteT = limpio;   // la línea corta después del nombre: color / talla
            });
            // foto: la de esta fila; si la fila no tiene, la foto N° idx de la página
            var imsFila = [].map.call(fila.querySelectorAll('img'), fotoProd).filter(Boolean);
            var fotoT = (imsFila[0] || (marcasT.length === todasFotos.length ? todasFotos[idx] : '') || '').split('?')[0];
            var aT = fila.querySelector('a[href*="goods"], a[href*="-g-"]');
            var gidT = aT ? ((aT.href.match(/goods_id=(\d+)/) || aT.href.match(/-g-(\d+)/) || [])[1] || '') : '';
            if (!tituloT) return;
            items.push({ sku: gidT, titulo: tituloT.replace(/\.{3}$|…$/, '').trim(), talla: varianteT.replace(/\s*[x×]\s*\d+$/i, '').replace(/\.{3}$|…$/, '').trim(),
                precio: parseFloat(precioT.replace(/,/g, '')) || 0, cant: parseInt((mk.textContent.match(/\d+/) || ['1'])[0], 10) || 1,
                foto: fotoT, link: gidT ? 'https://www.temu.com/goods.html?goods_id=' + gidT : location.href });
        });
    }

    /* ───────── CARRITO SHEIN ───────── */
    else if (/shein\./i.test(host) && /cart/i.test(location.pathname)) {
        tienda = 'SHEIN'; tipo = 'carrito';
        var tachado = function (e) {
            for (var x = e; x && x !== document.body; x = x.parentElement) {
                if (/^(DEL|S|STRIKE)$/.test(x.tagName)) return true;
                if ((getComputedStyle(x).textDecorationLine || '').indexOf('line-through') >= 0) return true;
            }
            return false;
        };
        // Precio real: elemento cuyo texto completo es "$8.86" y que NO está tachado (SHEIN parte el precio en varios <span>)
        var precioDe = function (fila) {
            var els = fila.querySelectorAll('*');
            for (var e = 0; e < els.length; e++) {
                var t = (els[e].textContent || '').replace(/\s+/g, '');
                if (/^(US)?\$[\d,]+(\.\d{1,2})?$/.test(t) && !tachado(els[e])) return parseFloat(t.replace(/[^\d.]/g, '')) || 0;
            }
            return 0;
        };
        var tituloLimpio = function (t) {
            return t.replace(/\s+/g, ' ').trim().replace(/^(Local|Trends|Nuevo|New|Hot)\s+/i, '').replace(/^-?\d+%\s*/, '').replace(/^\d+\s+piezas?\s+/i, '');
        };
        // Cada producto del carrito tiene UN control "Qty": se usa para separar los productos.
        var marcas = [].filter.call(document.querySelectorAll('body *'), function (e) {
            return /^(Qty|Cant(idad)?)\s*[:：]?\s*\d*$/i.test((e.textContent || '').replace(/\s+/g, ' ').trim());
        });
        marcas = marcas.filter(function (e) { return !marcas.some(function (o) { return o !== e && e.contains(o); }); });   // los más internos
        var cuenta = function (el) { var n = 0; for (var q = 0; q < marcas.length; q++) if (el.contains(marcas[q])) n++; return n; };
        var ruido = /\$|vendid|sold|Qty|Cant(idad)?\s*:|agotad|restante|Baj[oó] de precio|Env[ií]o|[uú]ltimos|estimado|cup[oó]n|^-?\d+%|^(Local|Trends|Nuevo)$/i;
        var filasC = [];
        marcas.forEach(function (m) {
            var fr = m;
            while (fr.parentElement && fr.parentElement !== document.body && cuenta(fr.parentElement) === 1) fr = fr.parentElement;
            if (!fr.querySelector('img') || filasC.indexOf(fr) >= 0) return;
            filasC.push(fr);
            var ls = lineasDe(fr), tit = '', vc = '', iTit = -1;
            for (var k = 0; k < ls.length; k++) if (ls[k].length >= 15 && !ruido.test(ls[k])) { tit = ls[k]; iTit = k; break; }
            if (!tit) return;
            var at = fr.querySelectorAll('[class*="attr"], [class*="sku-info"], [class*="skuInfo"], [class*="sale-attr"], [class*="goods-size"], [class*="color-size"]');
            for (var z = 0; z < at.length && !vc; z++) {
                var tz = (at[z].innerText || '').replace(/\s+/g, ' ').trim();
                if (tz && tz.length < 80 && !ruido.test(tz) && tz !== tit) vc = tz;
            }
            if (!vc) for (var k2 = iTit + 1; k2 < ls.length && !vc; k2++) {
                var l2 = ls[k2];
                if (l2.length < 60 && !ruido.test(l2) && !/vendido por|sold by/i.test(l2)) vc = l2;
            }
            vc = vc.replace(/[\s⌄▾▼˅⌵›>∨]+$/, '').trim();
            var qc = ((fr.innerText || '').match(/(?:Qty|Cant(?:idad)?)\s*[:：]?\s*(\d+)/i) || [])[1] || '1';
            var ah = fr.querySelector('a[href*="-p-"]');
            var gidC = ah ? (ah.href.match(/-p-(\d+)/) || [])[1] : '';
            var skuEl = fr.querySelector('[data-sku]');
            items.push({ sku: skuEl ? skuEl.getAttribute('data-sku') : '', titulo: tituloLimpio(tit), talla: vc,
                precio: precioDe(fr), cant: parseInt(qc, 10) || 1,
                foto: imgDe(fr).replace(/_thumbnail_\d+x\d*/, ''), link: gidC ? location.origin + '/p-' + gidC + '.html' : '' });
        });
    }
    /* ───────── CARRITO TEMU ───────── */
    else if (/temu\./i.test(host) && /cart/i.test(location.pathname)) {
        tienda = 'Temu'; tipo = 'carrito';
        // Cada producto del carrito tiene su selector "Cant. N" (las recomendaciones de abajo no)
        var cantMk = [].filter.call(document.querySelectorAll('body *'), function (e) {
            var t = (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
            return t.length < 14 && /^(Cant\.?|Cantidad|Qty)\s*:?\s*\d{1,3}$/i.test(t);
        });
        // También selectores desplegables de cantidad
        [].forEach.call(document.querySelectorAll('select, [role="combobox"], [aria-label*="antidad"], [aria-label*="uantity"]'), function (e) {
            var ok = e.tagName === 'SELECT' ? (e.options.length && [].every.call(e.options, function (o) { return /^\d{1,3}$/.test(o.value || o.text); }))
                                            : /^\D{0,12}\d{1,3}$/.test((e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim());
            if (ok && cantMk.indexOf(e) < 0) cantMk.push(e);
        });
        cantMk = cantMk.filter(function (e) { return !cantMk.some(function (o) { return o !== e && e.contains(o); }); });   // el más interno
        // Si no hay "Cant." visible, cada producto se reconoce por "… después de las promociones y créditos"
        if (!cantMk.length) {
            cantMk = [].filter.call(document.querySelectorAll('body *'), function (e) { return /despu[eé]s de (las )?promociones/i.test(e.textContent || '') && e.textContent.length < 160; });
            cantMk = cantMk.filter(function (e) { return !cantMk.some(function (o) { return o !== e && e.contains(o); }); });
        }
        var cuentaC = function (el) { var n = 0; for (var q = 0; q < cantMk.length; q++) if (el.contains(cantMk[q])) n++; return n; };
        var esProd = function (im) { var r = im.getBoundingClientRect(); return r.width >= 70 && r.height >= 70; };
        var tieneFoto = function (el) { return [].some.call(el.querySelectorAll('img'), esProd); };
        var RUIDO = /^(ENV[IÍ]O GRATIS|BLACK FRIDAY|ADELANTADO|Enviado por Temu|CASI AGOTADO|[ÚU]LTIMOS?\b|GRAN VENTA|[ÚU]LTIMAS? \d|HORAS|L[ií]mite|Cant\.?|Cantidad|Almac[eé]n local|Precio m[aá]s bajo|Oferta|\d+% |-\d+%)/i;
        var cantDe = function (fila, mk) {
            var sel = fila.querySelector('select'); if (sel && /^\d+$/.test(sel.value)) return parseInt(sel.value, 10);
            var m = ((mk && (mk.innerText || mk.textContent)) || '').match(/^\s*(?:Cant\.?|Cantidad|Qty)\s*:?\s*(\d{1,3})\s*$/i)
                 || (fila.innerText || '').match(/(?:Cant\.?|Cantidad|Qty)\s*:?\s*(\d{1,3})\b/i);
            return m ? parseInt(m[1], 10) || 1 : 1;
        };
        cantMk.forEach(function (mk) {
            var f = mk;
            while (f.parentElement && f.parentElement !== document.body && cuentaC(f.parentElement) === 1 && !tieneFoto(f)) f = f.parentElement;
            // subir un poco más si todavía no está el precio, sin juntar dos productos
            while (f.parentElement && f.parentElement !== document.body && cuentaC(f.parentElement) === 1 && !/\$\s*[\d,]+\.\d{2}/.test(f.innerText || '')) f = f.parentElement;
            var texto = f.innerText || '';
            // Precio: el que dice "ÚLTIMO DÍA $X después de…" o, si no, el menor de los dos primeros (el otro es el tachado)
            var mp = texto.replace(/\s+/g, ' ').match(/\$\s*([\d,]+\.\d{2})\s*despu[eé]s/i);
            var montos = (texto.match(/\$\s*[\d,]+\.\d{2}/g) || []).map(function (x) { return parseFloat(x.replace(/[^\d.]/g, '')); });
            var precioC = mp ? parseFloat(mp[1].replace(/,/g, '')) : (montos.length > 1 ? Math.min(montos[0], montos[1]) : (montos[0] || 0));
            var ti = '', va = '';
            lineasDe(f).forEach(function (l) {
                var c = l.replace(/[›>]\s*$/, '').trim();
                if (c.indexOf('|') >= 0) c = c.split('|').pop().trim();
                if (!c || /\$\s*\d/.test(c) || RUIDO.test(c)) return;
                if (!ti && c.length > 15) ti = c;
                else if (ti && !va && c.length < 90) va = c;
            });
            if (!ti) return;
            // Foto: la imagen más grande de la fila (las pequeñas son etiquetas)
            var fotoC = '', ancho = 0;
            [].forEach.call(f.querySelectorAll('img'), function (im) { var r = im.getBoundingClientRect(), w = Math.min(r.width, r.height); var src = im.currentSrc || im.src || ''; if (w > ancho && !/^data:/.test(src)) { ancho = w; fotoC = src; } });
            var aC = f.querySelector('a[href*="goods"], a[href*="-g-"]');
            var gC = aC ? ((aC.href.match(/goods_id=(\d+)/) || aC.href.match(/-g-(\d+)/) || [])[1] || '') : '';
            items.push({ sku: gC, titulo: ti.replace(/\.{3}$|…$/, '').trim(), talla: va, precio: precioC,
                cant: cantDe(f, mk),
                foto: fotoC.split('?')[0], link: gC ? 'https://www.temu.com/goods.html?goods_id=' + gC : '' });
        });
        // quitar repetidos (mismo producto detectado dos veces)
        var vistosK = {}; items = items.filter(function (x) { var k = x.titulo + '|' + x.talla + '|' + x.precio; if (vistosK[k]) return false; vistosK[k] = 1; return true; });
        if (!items.length) { alert('MultiStore: no encontré los productos del carrito de Temu. Esperá a que cargue todo el carrito y volvé a tocar el marcador.'); return; }
    }

    /* ───────── CARRITO AMAZON ───────── */
    else if (/amazon\./i.test(host) && /cart/i.test(location.pathname)) {
        tienda = 'Amazon'; tipo = 'carrito';
        var activos = document.querySelector('#sc-active-cart') || document;
        var cs = activos.querySelectorAll('[data-asin][data-price], .sc-list-item[data-asin]');
        for (var a2 = 0; a2 < cs.length; a2++) {
            var ci = cs[a2], asn = ci.getAttribute('data-asin');
            if (!asn || items.some(function (x) { return x.sku === asn; })) continue;
            var tt2 = (ci.querySelector('.sc-product-title, .a-truncate-full, .sc-product-link') || {}).innerText || '';
            var im2 = ci.querySelector('img');
            var vars = [].map.call(ci.querySelectorAll('.sc-product-variation, .a-list-item .a-size-small'), function (e) { return (e.innerText || '').replace(/^[^:]+:\s*/, '').trim(); }).filter(Boolean).slice(0, 3);
            items.push({ sku: asn, titulo: tt2.replace(/\s+/g, ' ').trim(), talla: vars.join(' / '),
                precio: parseFloat(ci.getAttribute('data-price')) || num((ci.querySelector('.sc-product-price, .a-price .a-offscreen') || {}).innerText),
                cant: parseInt(ci.getAttribute('data-quantity'), 10) || 1,
                foto: im2 ? (im2.src || '').replace(/\._[^./]+_\./, '.') : '', link: 'https://www.amazon.com/dp/' + asn });
        }
        items = items.filter(function (x) { return x.titulo; });
    }

    /* ───────── PÁGINA DE PRODUCTO (cotizar) ───────── */
    if (!items.length) {
        tipo = 'producto';
        var it = { sku: '', titulo: '', talla: '', precio: 0, cant: 1, foto: '', link: location.href.split('?')[0], pesoLb: 0 };
        var ld = jsonLdProducto();
        if (/amazon\./i.test(host)) {
            tienda = 'Amazon';
            it.sku = (location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/) || [])[1] || '';
            it.titulo = txt('#productTitle');
            it.precio = num(txt('#corePrice_feature_div .a-offscreen') || txt('#corePriceDisplay_desktop_feature_div .a-offscreen') || txt('.a-price .a-offscreen') || txt('#priceblock_ourprice'));
            var im = document.querySelector('#landingImage, #imgBlkFront');
            it.foto = im ? (im.getAttribute('data-old-hires') || im.src || '') : '';
            var vs = [txt('#variation_size_name .selection'), txt('#variation_color_name .selection'), txt('#variation_style_name .selection')].filter(Boolean);
            it.talla = vs.join(' / ');
            // Peso: tablas de detalles del producto
            var celdas = document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #detailBullets_feature_div li, #prodDetails tr, #tech tr');
            var envio = 0, articulo = 0;
            for (var c = 0; c < celdas.length; c++) {
                var tc = (celdas[c].innerText || '').replace(/\s+/g, ' ');
                if (/peso del env[ií]o|shipping weight/i.test(tc)) envio = envio || aLibras(tc);
                else if (/peso del art[ií]culo|item weight|peso del producto|^\s*peso\b/i.test(tc)) articulo = articulo || aLibras(tc);
            }
            it.pesoLb = envio || articulo;
            if (it.sku) it.link = 'https://www.amazon.com/dp/' + it.sku;
        } else {
            tienda = /shein\./i.test(host) ? 'SHEIN' : /temu\./i.test(host) ? 'Temu' : host.replace(/^www\./, '');
            if (ld) {
                it.titulo = ld.name || '';
                it.sku = ld.sku || ld.mpn || '';
                var img = [].concat(ld.image || [])[0]; it.foto = typeof img === 'string' ? img : (img && img.url) || '';
                var of = [].concat(ld.offers || [])[0] || {};
                it.precio = num(of.price || of.lowPrice || (of.priceSpecification && of.priceSpecification.price));
                if (ld.weight) it.pesoLb = aLibras((ld.weight.value || ld.weight) + ' ' + (ld.weight.unitText || ld.weight.unitCode || 'lb'));
            }
            if (!it.titulo) it.titulo = txt('h1') || meta('og:title') || document.title;
            if (!it.foto) it.foto = meta('og:image');
            if (!it.precio) {
                var pe = document.querySelector('[class*="productPrice"], [class*="mainprice"], [class*="main-price"], [class*="sale-price"], [class*="price__sale"], [itemprop="price"]');
                it.precio = num(pe ? (pe.getAttribute('content') || pe.innerText) : '') || num(meta('product:price:amount') || meta('og:price:amount'));
            }
            if (/shein\.|temu\./i.test(host)) {
                // El precio y la talla se buscan JUNTO AL TÍTULO del producto
                // (en la página también hay precios del carrito desplegable y de recomendaciones).
                var esTachado = function (e) {
                    for (var x = e; x && x !== document.body; x = x.parentElement) {
                        if (/^(DEL|S|STRIKE)$/.test(x.tagName)) return true;
                        if ((getComputedStyle(x).textDecorationLine || '').indexOf('line-through') >= 0) return true;
                    }
                    return false;
                };
                var primerPrecio = function (cont) {
                    var els = cont.querySelectorAll('*');
                    for (var e = 0; e < els.length; e++) {
                        var t = (els[e].textContent || '').replace(/\s+/g, '');
                        if (/^(US)?\$[\d,]+(\.\d{1,2})?$/.test(t) && !esTachado(els[e]) && els[e].offsetParent !== null) return parseFloat(t.replace(/[^\d.]/g, '')) || 0;
                    }
                    return 0;
                };
                var h1 = document.querySelector('h1') || document.querySelector('[class*="goods-name"], [class*="product-intro__head-name"]');
                var intro = h1;
                while (intro && intro.parentElement && intro !== document.body && !primerPrecio(intro)) intro = intro.parentElement;
                if (intro && intro !== document.body) {
                    var pIntro = primerPrecio(intro); if (pIntro) it.precio = pIntro;
                    var skuM = ((intro.innerText || '').match(/SKU\s*[:：]\s*([A-Za-z0-9\-_]+)/) || [])[1]; if (skuM) it.sku = skuM;
                    // talla / color seleccionados: botones marcados (sin imagen, texto corto)
                    var selec = [], cand = intro.parentElement ? intro.parentElement.querySelectorAll('[aria-checked="true"], [aria-selected="true"], [class*="active"], [class*="selected"], [class*="checked"]') : [];
                    for (var c2 = 0; c2 < cand.length && selec.length < 2; c2++) {
                        var el2 = cand[c2];
                        if (el2.querySelector('img') && !(el2.getAttribute('aria-label') || el2.getAttribute('title'))) continue;
                        var tx = ((el2.innerText || '').trim() || el2.getAttribute('aria-label') || el2.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
                        if (!tx || tx.length > 40 || /\$|talla|color|size|cup[oó]n|env[ií]o|añadir|bolsa|^\d+$/i.test(tx) || selec.indexOf(tx) >= 0) continue;
                        selec.push(tx);
                    }
                    if (selec.length) it.talla = selec.join(' / ');
                    // "Color: Leonado" / "Talla: M" escritos junto al título
                    var etq = lineasDe(intro.parentElement || intro).map(function (l) { var m = l.match(/^(Color|Colour|Talla|Tamaño|Size|Estilo|Style|Modelo)\s*[:：]\s*(.{1,40})$/i); return m ? m[2].trim() : ''; }).filter(Boolean);
                    if (etq.length) it.talla = etq.slice(0, 3).join(' / ');
                } else {
                    var skuB = (document.body.innerText.match(/SKU\s*[:：]\s*([A-Za-z0-9\-_]+)/) || [])[1]; if (skuB) it.sku = skuB;
                }
                var gid2 = (location.pathname.match(/-p-(\d+)/) || [])[1]; if (gid2) it.link = location.origin + '/p-' + gid2 + '.html';
                if (/temu\./i.test(host)) {
                    var gidT2 = new URLSearchParams(location.search).get('goods_id') || (location.pathname.match(/-g-(\d+)/) || [])[1] || '';
                    if (gidT2) { it.sku = it.sku || gidT2; it.link = 'https://www.temu.com/goods.html?goods_id=' + gidT2; }
                    if (!it.foto || /logo/i.test(it.foto)) {
                        var grandes = [].filter.call(document.querySelectorAll('img'), function (im) { return /kwcdn/i.test(im.currentSrc || im.src || '') && (im.naturalWidth || im.width) >= 250; });
                        if (grandes[0]) it.foto = grandes[0].currentSrc || grandes[0].src;
                    }
                    it.foto = (it.foto || '').split('?')[0];
                    it.titulo = (it.titulo || '').replace(/\s*[-|]\s*Temu.*$/i, '');
                }
                it.foto = it.foto.replace(/_thumbnail_\d+x\d*/, '');
            }
            if (it.foto && it.foto.indexOf('//') === 0) it.foto = 'https:' + it.foto;
        }
        it.titulo = (it.titulo || '').replace(/\s+/g, ' ').trim().replace(/^(Local|Trends)\s+/i, '').replace(/^\d+\s*(piezas?|pcs?|pc|unidades?)\s+/i, '');
        if (it.titulo) items.push(it);
    }

    if (!items.length) { alert('MultiStore: no encontré artículos en esta página. Abre el DETALLE de un pedido o la página de un producto y espera a que cargue.'); return; }
    var data = 'MULTISTORE_IMPORT' + JSON.stringify({ tienda: tienda, pedido: pedido, tipo: tipo, items: items });
    var ok = function () {
        alert(tipo === 'carrito'
            ? 'MultiStore: ' + items.length + ' productos copiados del carrito de ' + tienda + '.\nVe a MultiStore → Cotización → Pegar'
            : tipo === 'producto'
            ? 'MultiStore: producto copiado (' + tienda + ').\n' + items[0].titulo.substring(0, 80) + (items[0].precio ? '\n$' + items[0].precio : '') + (items[0].pesoLb ? ' · ' + items[0].pesoLb.toFixed(2) + ' lb' : '') + '\nVe a MultiStore → Cotización → Pegar'
            : 'MultiStore: ' + items.length + ' artículos copiados del pedido ' + tienda + ' ' + pedido + '.\nVe a MultiStore → Pegar varios (o Cotización) → Pegar');
    };
    function viejo() { var ta = document.createElement('textarea'); ta.value = data; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).then(ok, viejo); else viejo();
}

function marcadorHref() { return 'javascript:' + encodeURIComponent('(' + sheinScraper.toString() + ')()'); }
