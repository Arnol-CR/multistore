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
            tienda = /shein\./i.test(host) ? 'SHEIN' : host.replace(/^www\./, '');
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
            if (/shein\./i.test(host)) {
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
                } else {
                    var skuB = (document.body.innerText.match(/SKU\s*[:：]\s*([A-Za-z0-9\-_]+)/) || [])[1]; if (skuB) it.sku = skuB;
                }
                var gid2 = (location.pathname.match(/-p-(\d+)/) || [])[1]; if (gid2) it.link = location.origin + '/p-' + gid2 + '.html';
                it.foto = it.foto.replace(/_thumbnail_\d+x\d*/, '');
            }
            if (it.foto && it.foto.indexOf('//') === 0) it.foto = 'https:' + it.foto;
        }
        it.titulo = (it.titulo || '').replace(/\s+/g, ' ').trim();
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
