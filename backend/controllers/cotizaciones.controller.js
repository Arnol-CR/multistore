const { sql, poolPromise } = require('../db/connection');

/* ════════════════════════════════════════════════════════════════
   COTIZACIONES
   Las tablas se crean solas la primera vez (si no existen).
   Script equivalente: backend/db/cotizaciones.sql
   ════════════════════════════════════════════════════════════════ */

let tablasListas = false;
async function asegurarTablas(pool) {
  if (tablasListas) return;
  await pool.request().query(`
    IF OBJECT_ID('dbo.C_Cotizaciones', 'U') IS NULL
    CREATE TABLE dbo.C_Cotizaciones (
      IdCotizacion     INT IDENTITY(1,1) PRIMARY KEY,
      NumeroCotizacion NVARCHAR(30)  NULL,
      Fecha            DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
      IdCliente        INT           NULL,
      NombreCliente    NVARCHAR(150) NULL,
      Telefono         NVARCHAR(40)  NULL,
      IdVendedor       INT           NULL,
      IdCasillero      INT           NULL,
      TarifaLibra      DECIMAL(18,2) NOT NULL DEFAULT 0,
      ImpuestoPct      DECIMAL(9,2)  NOT NULL DEFAULT 8,
      MargenPct        DECIMAL(9,2)  NOT NULL DEFAULT 18,
      TasaCambio       DECIMAL(18,4) NOT NULL DEFAULT 0,
      RedondearLibras  BIT           NOT NULL DEFAULT 1,
      TotalUSD         DECIMAL(18,2) NOT NULL DEFAULT 0,
      TotalLempiras    DECIMAL(18,2) NOT NULL DEFAULT 0,
      Estado           NVARCHAR(20)  NOT NULL DEFAULT 'Borrador',
      Notas            NVARCHAR(1000) NULL,
      IdPedido         INT           NULL
    );
    IF OBJECT_ID('dbo.C_CotizacionDetalle', 'U') IS NULL
    CREATE TABLE dbo.C_CotizacionDetalle (
      IdDetalle     INT IDENTITY(1,1) PRIMARY KEY,
      IdCotizacion  INT NOT NULL REFERENCES dbo.C_Cotizaciones(IdCotizacion) ON DELETE CASCADE,
      Nombre        NVARCHAR(300) NOT NULL,
      Link          NVARCHAR(600) NULL,
      Foto          NVARCHAR(MAX) NULL,
      Sku           NVARCHAR(100) NULL,
      TallaColor    NVARCHAR(150) NULL,
      PrecioUSD     DECIMAL(18,2) NOT NULL DEFAULT 0,
      Cantidad      INT           NOT NULL DEFAULT 1,
      PesoLb        DECIMAL(18,3) NOT NULL DEFAULT 0,
      IdArticulo    INT           NULL,
      PrecioFinalL  DECIMAL(18,2) NOT NULL DEFAULT 0
    );
  `);
  await pool.request().query(`IF COL_LENGTH('dbo.C_Cotizaciones', 'IdTienda') IS NULL ALTER TABLE dbo.C_Cotizaciones ADD IdTienda INT NULL;`);
  await pool.request().query(`IF COL_LENGTH('dbo.C_CotizacionDetalle', 'IdDetallePedido') IS NULL ALTER TABLE dbo.C_CotizacionDetalle ADD IdDetallePedido INT NULL;`);
  tablasListas = true;
}

const err = (res, e, code = 500) => res.status(code).json({ ok: false, error: e.message || String(e) });

/* Valores por defecto:
   - casilleros con su tarifa: A_Casilleros.PrecioLibra
   - impuesto de cada tienda:  A_Empresas.ValorImpuesto
   - última tasa de cambio usada */
const getDefaults = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const t = await pool.request().query(`
      SELECT TOP 1 TasaCambio FROM C_Pedidos WHERE TasaCambio IS NOT NULL AND TasaCambio > 0 ORDER BY IdPedido DESC`);
    const tc = await pool.request().query(`
      SELECT TOP 1 TasaCambio FROM C_Cotizaciones WHERE TasaCambio > 0 ORDER BY IdCotizacion DESC`);
    const cas = await pool.request().query(`
      SELECT C.IdCasillero, C.IdEmpresa, C.NombreCasillero, E.NombreEmpresa, CAST(C.PrecioLibra AS DECIMAL(18,2)) AS PrecioLibra
      FROM A_Casilleros C LEFT JOIN A_Empresas E ON E.IdEmpresa = C.IdEmpresa
      ORDER BY E.NombreEmpresa, C.NombreCasillero`);
    const imp = await pool.request().query(`
      SELECT IdEmpresa, NombreEmpresa, CAST(ValorImpuesto AS DECIMAL(18,4)) AS ValorImpuesto FROM A_Empresas WHERE ValorImpuesto IS NOT NULL`);
    res.json({ ok: true, data: {
      tasaCambio: (tc.recordset[0] || t.recordset[0] || {}).TasaCambio || null,
      casilleros: cas.recordset,
      impuestos: imp.recordset
    }});
  } catch (e) { err(res, e); }
};

/* Historial */
const listar = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const esAdmin = req.query.esAdmin === '1';
    const r = await pool.request()
      .input('IdVendedor', sql.Int, parseInt(req.query.idVendedor) || null)
      .input('EsAdmin', sql.Bit, esAdmin ? 1 : 0)
      .query(`
        SELECT c.IdCotizacion, c.NumeroCotizacion, c.Fecha, c.IdCliente,
               COALESCE(NULLIF(c.NombreCliente, ''), 'Sin cliente') AS NombreCliente, c.Telefono,
               c.TotalUSD, c.TotalLempiras, c.Estado, c.IdPedido, c.IdVendedor,
               (SELECT COUNT(*) FROM C_CotizacionDetalle d WHERE d.IdCotizacion = c.IdCotizacion) AS CantLineas,
               (SELECT TOP 1 d.Foto FROM C_CotizacionDetalle d WHERE d.IdCotizacion = c.IdCotizacion AND d.Foto IS NOT NULL AND d.Foto NOT LIKE 'data:%' ORDER BY d.IdDetalle) AS FotoPortada
        FROM C_Cotizaciones c
        WHERE @EsAdmin = 1 OR c.IdVendedor = @IdVendedor OR c.IdVendedor IS NULL
        ORDER BY c.IdCotizacion DESC`);
    res.json({ ok: true, data: r.recordset });
  } catch (e) { err(res, e); }
};

/* Una cotización con sus líneas */
const obtener = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const id = parseInt(req.params.id);
    const c = await pool.request().input('Id', sql.Int, id).query('SELECT * FROM C_Cotizaciones WHERE IdCotizacion = @Id');
    if (!c.recordset.length) return err(res, 'La cotización no existe', 404);
    const d = await pool.request().input('Id', sql.Int, id).query('SELECT * FROM C_CotizacionDetalle WHERE IdCotizacion = @Id ORDER BY IdDetalle');
    res.json({ ok: true, data: { ...c.recordset[0], lineas: d.recordset } });
  } catch (e) { err(res, e); }
};

/* Crear o actualizar (reemplaza las líneas) */
const guardar = async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.lineas) || !b.lineas.length) return err(res, 'Agrega al menos un producto', 400);
  let tx;
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    tx = new sql.Transaction(pool);
    await tx.begin();
    const cab = (r) => r
      .input('IdCliente',       sql.Int,            b.idCliente ? parseInt(b.idCliente) : null)
      .input('NombreCliente',   sql.NVarChar(150),  (b.nombreCliente || '').substring(0, 150))
      .input('Telefono',        sql.NVarChar(40),   (b.telefono || '').substring(0, 40))
      .input('IdVendedor',      sql.Int,            b.idVendedor ? parseInt(b.idVendedor) : null)
      .input('IdCasillero',     sql.Int,            b.idCasillero ? parseInt(b.idCasillero) : null)
      .input('IdTienda',        sql.Int,            b.idTienda ? parseInt(b.idTienda) : null)
      .input('TarifaLibra',     sql.Decimal(18,2),  parseFloat(b.tarifaLibra) || 0)
      .input('ImpuestoPct',     sql.Decimal(9,2),   parseFloat(b.impuestoPct) || 0)
      .input('MargenPct',       sql.Decimal(9,2),   parseFloat(b.margenPct) || 0)
      .input('TasaCambio',      sql.Decimal(18,4),  parseFloat(b.tasaCambio) || 0)
      .input('RedondearLibras', sql.Bit,            b.redondearLibras ? 1 : 0)
      .input('TotalUSD',        sql.Decimal(18,2),  parseFloat(b.totalUSD) || 0)
      .input('TotalLempiras',   sql.Decimal(18,2),  parseFloat(b.totalLempiras) || 0)
      .input('Notas',           sql.NVarChar(1000), (b.notas || '').substring(0, 1000));

    let id = parseInt(b.idCotizacion) || null;
    if (id) {
      const r = await cab(new sql.Request(tx)).input('Id', sql.Int, id).query(`
        UPDATE C_Cotizaciones SET IdCliente=@IdCliente, NombreCliente=@NombreCliente, Telefono=@Telefono, IdVendedor=@IdVendedor,
          IdCasillero=@IdCasillero, IdTienda=@IdTienda, TarifaLibra=@TarifaLibra, ImpuestoPct=@ImpuestoPct, MargenPct=@MargenPct, TasaCambio=@TasaCambio,
          RedondearLibras=@RedondearLibras, TotalUSD=@TotalUSD, TotalLempiras=@TotalLempiras, Notas=@Notas
        WHERE IdCotizacion=@Id AND Estado <> 'Convertida';
        SELECT @@ROWCOUNT AS n;`);
      if (!r.recordset[0].n) { await tx.rollback(); return err(res, 'No se puede editar: la cotización no existe o ya se convirtió en pedido', 400); }
      await new sql.Request(tx).input('Id', sql.Int, id).query('DELETE FROM C_CotizacionDetalle WHERE IdCotizacion=@Id');
    } else {
      const r = await cab(new sql.Request(tx)).query(`
        INSERT INTO C_Cotizaciones (IdCliente, NombreCliente, Telefono, IdVendedor, IdCasillero, IdTienda, TarifaLibra, ImpuestoPct, MargenPct, TasaCambio, RedondearLibras, TotalUSD, TotalLempiras, Notas)
        OUTPUT INSERTED.IdCotizacion
        VALUES (@IdCliente, @NombreCliente, @Telefono, @IdVendedor, @IdCasillero, @IdTienda, @TarifaLibra, @ImpuestoPct, @MargenPct, @TasaCambio, @RedondearLibras, @TotalUSD, @TotalLempiras, @Notas);`);
      id = r.recordset[0].IdCotizacion;
      await new sql.Request(tx).input('Id', sql.Int, id).query(`
        UPDATE C_Cotizaciones SET NumeroCotizacion = 'COT-' + FORMAT(Fecha, 'yyMMdd') + '-' + RIGHT('000' + CAST(IdCotizacion AS VARCHAR(10)), 4) WHERE IdCotizacion=@Id`);
    }

    for (const l of b.lineas) {
      await new sql.Request(tx)
        .input('Id',           sql.Int,           id)
        .input('Nombre',       sql.NVarChar(300), (l.nombre || 'Producto').substring(0, 300))
        .input('Link',         sql.NVarChar(600), l.link ? String(l.link).substring(0, 600) : null)
        .input('Foto',         sql.NVarChar(sql.MAX), l.foto || null)
        .input('Sku',          sql.NVarChar(100), l.sku ? String(l.sku).substring(0, 100) : null)
        .input('TallaColor',   sql.NVarChar(150), l.tallaColor ? String(l.tallaColor).substring(0, 150) : null)
        .input('PrecioUSD',    sql.Decimal(18,2), parseFloat(l.precioUSD) || 0)
        .input('Cantidad',     sql.Int,           parseInt(l.cantidad) || 1)
        .input('PesoLb',       sql.Decimal(18,3), parseFloat(l.pesoLb) || 0)
        .input('IdArticulo',   sql.Int,           l.idArticulo ? parseInt(l.idArticulo) : null)
        .input('PrecioFinalL', sql.Decimal(18,2), parseFloat(l.precioFinalL) || 0)
        .input('IdDetallePedido', sql.Int,        l.idDetallePedido ? parseInt(l.idDetallePedido) : null)
        .query(`INSERT INTO C_CotizacionDetalle (IdCotizacion, Nombre, Link, Foto, Sku, TallaColor, PrecioUSD, Cantidad, PesoLb, IdArticulo, PrecioFinalL, IdDetallePedido)
                VALUES (@Id, @Nombre, @Link, @Foto, @Sku, @TallaColor, @PrecioUSD, @Cantidad, @PesoLb, @IdArticulo, @PrecioFinalL, @IdDetallePedido)`);
    }
    await tx.commit();
    const n = await pool.request().input('Id', sql.Int, id).query('SELECT NumeroCotizacion FROM C_Cotizaciones WHERE IdCotizacion=@Id');
    res.json({ ok: true, idCotizacion: id, numero: n.recordset[0].NumeroCotizacion });
  } catch (e) {
    try { if (tx) await tx.rollback(); } catch (_) {}
    err(res, e);
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const ok = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'];   // 'Parcial' y 'Convertida' los pone el sistema
    const estado = req.body.estado;
    if (!ok.includes(estado)) return err(res, 'Estado no válido', 400);
    const pool = await poolPromise; await asegurarTablas(pool);
    await pool.request().input('Id', sql.Int, parseInt(req.params.id)).input('Estado', sql.NVarChar(20), estado)
      .query("UPDATE C_Cotizaciones SET Estado=@Estado WHERE IdCotizacion=@Id AND Estado NOT IN ('Convertida','Parcial')");
    res.json({ ok: true });
  } catch (e) { err(res, e); }
};

const eliminar = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const r = await pool.request().input('Id', sql.Int, parseInt(req.params.id))
      .query("DELETE FROM C_Cotizaciones WHERE IdCotizacion=@Id AND Estado NOT IN ('Convertida','Parcial'); SELECT @@ROWCOUNT AS n;");
    if (!r.recordset[0].n) return err(res, 'No se puede eliminar: la cotización ya tiene productos en un pedido', 400);
    res.json({ ok: true });
  } catch (e) { err(res, e); }
};

/* Convertir en pedido: cada línea pasa a C_DetallePedido del pedido elegido,
   con cliente y precio de venta ya asignados. */
const convertir = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const id = parseInt(req.params.id);
    const { idPedido, articulos, noPedidoTienda, posiciones } = req.body || {};   // posiciones: índices (0,1,2…) de las líneas a convertir
    if (!idPedido) return err(res, 'Elige el pedido', 400);
    const c = (await pool.request().input('Id', sql.Int, id).query('SELECT * FROM C_Cotizaciones WHERE IdCotizacion=@Id')).recordset[0];
    if (!c) return err(res, 'La cotización no existe', 404);
    if (c.Estado === 'Convertida') return err(res, 'Esta cotización ya se convirtió en pedido', 400);
    const todas = (await pool.request().input('Id', sql.Int, id).query('SELECT * FROM C_CotizacionDetalle WHERE IdCotizacion=@Id ORDER BY IdDetalle')).recordset;
    const elegidas = Array.isArray(posiciones) && posiciones.length ? todas.filter((l, i) => posiciones.includes(i)) : todas;
    const lineas = elegidas.filter(l => !l.IdDetallePedido);
    if (!lineas.length) return err(res, 'Esos productos ya están en un pedido', 400);
    const falta = lineas.filter(l => !(articulos && articulos[l.IdDetalle]) && !l.IdArticulo);
    if (falta.length) return err(res, `Falta elegir el artículo del catálogo en ${falta.length} línea(s)`, 400);

    let creados = 0;
    for (const l of lineas) {
      const idArt = parseInt((articulos && articulos[l.IdDetalle]) || l.IdArticulo);
      const codigo = (l.Sku || c.NumeroCotizacion + '-' + l.IdDetalle).substring(0, 100);
      await pool.request()
        .input('CodigoArticulo',      sql.NVarChar,      codigo)
        .input('DescripcionArticulo', sql.NVarChar,      (l.Nombre || '').substring(0, 200))
        .input('Peso',                sql.Decimal(18,2), Math.round((parseFloat(l.PesoLb) || 0) * 453.592))   // gramos
        .input('IdArticulo',          sql.Int,           idArt)
        .input('IdCliente',           sql.Int,           null)
        .input('IdPedido',            sql.Int,           parseInt(idPedido))
        .input('IdSeguimiento',       sql.Int,           null)
        .input('TallaColor',          sql.NVarChar,      l.TallaColor || '')
        .input('ValorCompra',         sql.Decimal(18,2), parseFloat(l.PrecioUSD) || 0)
        .input('ValorCobroCliente',   sql.Decimal(18,2), null)
        .input('CantidadArticulos',   sql.Int,           l.Cantidad || 1)
        .input('Link',                sql.NVarChar,      l.Link || null)
        .input('NoPedidoAplicacion',  sql.NVarChar,      noPedidoTienda || c.NumeroCotizacion)
        .execute('In_DetallePedido');
      const nuevo = (await pool.request().input('IdPedido', sql.Int, parseInt(idPedido)).input('Codigo', sql.NVarChar, codigo)
        .query('SELECT TOP 1 IdDetallePedido FROM C_DetallePedido WHERE IdPedido=@IdPedido AND CodigoArticulo=@Codigo ORDER BY IdDetallePedido DESC')).recordset[0];
      if (!nuevo) continue;
      const idDet = nuevo.IdDetallePedido;
      if (l.Foto) await pool.request().input('F', sql.NVarChar(sql.MAX), l.Foto).input('Id', sql.Int, idDet)
        .query('UPDATE C_DetallePedido SET Fotografia=@F WHERE IdDetallePedido=@Id');
      if (c.IdCliente) await pool.request().input('IdCliente', sql.Int, c.IdCliente).input('IdDetallePedido', sql.Int, idDet).execute('Up_IdClientePedido');
      if (c.IdVendedor) await pool.request().input('IdDetalleCliente', sql.Int, idDet).input('IdVendedor', sql.Int, c.IdVendedor).execute('Up_DetallesPedidosIdVendedor');
      if (l.PrecioFinalL > 0) await pool.request().input('IdDetalleCliente', sql.Int, idDet).input('ValorCobro', sql.Decimal(18,2), l.PrecioFinalL)
        .execute('Up_ValorVentaDetallesPedidos');
      await pool.request().input('Det', sql.Int, idDet).input('Id', sql.Int, l.IdDetalle)
        .query('UPDATE C_CotizacionDetalle SET IdDetallePedido=@Det WHERE IdDetalle=@Id');
      creados++;
    }
    const pend = (await pool.request().input('Id', sql.Int, id)
      .query('SELECT COUNT(*) AS n FROM C_CotizacionDetalle WHERE IdCotizacion=@Id AND IdDetallePedido IS NULL')).recordset[0].n;
    const estado = pend ? 'Parcial' : 'Convertida';
    await pool.request().input('Id', sql.Int, id).input('IdPedido', sql.Int, parseInt(idPedido)).input('Estado', sql.NVarChar(20), estado)
      .query("UPDATE C_Cotizaciones SET Estado=@Estado, IdPedido=@IdPedido WHERE IdCotizacion=@Id");
    res.json({ ok: true, creados, pendientes: pend, estado });
  } catch (e) { err(res, e); }
};

/* Proxy de imágenes de tiendas (para poder generar la imagen/PDF de la cotización con las fotos) */
const HOSTS_IMG = /(^|\.)(ltwebstatic\.com|shein\.com|media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com|alicdn\.com|kwcdn\.com|temu\.com|blob\.core\.windows\.net)$/i;
const imagen = async (req, res) => {
  try {
    const u = new URL(String(req.query.url || ''));
    if (!/^https?:$/.test(u.protocol) || !HOSTS_IMG.test(u.hostname)) return res.status(400).end();
    const r = await fetch(u.href, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || !tipo.startsWith('image/')) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) return res.status(413).end();
    res.set('Content-Type', tipo).set('Cache-Control', 'public, max-age=86400').set('Access-Control-Allow-Origin', '*').send(buf);
  } catch (e) { res.status(400).end(); }
};

/* ════════ Leer un link de producto desde el servidor ════════
   El navegador no puede abrir páginas de SHEIN/Amazon por seguridad (CORS); el servidor sí lo intenta.
   Algunas tiendas bloquean a los servidores: en ese caso se avisa y se usa el marcador 📦. */
const HOSTS_TIENDA = /(^|\.)(shein\.com|shein\.top|sheinlink\.com|amazon\.com|amzn\.to|a\.co|temu\.com|aliexpress\.com|aliexpress\.us|walmart\.com|ebay\.com)$/i;
const decodificar = t => String(t || '').replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\\u002F/g, '/').replace(/\\\//g, '/').trim();
function metaDe(html, prop) {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))
         || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
  return m ? decodificar(m[1]) : '';
}
function aLibras(t) {
  const m = String(t || '').toLowerCase().replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*(libras?|lbs?|pounds?|onzas?|oz|ounces?|kilogramos?|kg|kilograms?|gramos?|grams?|g)\b/);
  if (!m) return 0;
  const v = parseFloat(m[1]), u = m[2];
  if (/^(onza|oz|ounce)/.test(u)) return v / 16;
  if (/^(kilo|kg)/.test(u)) return v * 2.20462;
  if (/^(gramo|gram|g$)/.test(u)) return v / 453.592;
  return v;
}
const leerLink = async (req, res) => {
  let u;
  try { u = new URL(String(req.query.url || '')); } catch (e) { return err(res, 'Link no válido', 400); }
  if (!/^https?:$/.test(u.protocol) || !HOSTS_TIENDA.test(u.hostname)) return err(res, 'Solo se leen links de SHEIN, Amazon, Temu, AliExpress, Walmart o eBay', 400);
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(u.href, { signal: ctrl.signal, redirect: 'follow', headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-419,es;q=0.9,en;q=0.8' } });
    clearTimeout(tm);
    const html = (await r.text()).substring(0, 3000000);
    const final = new URL(r.url || u.href);
    const d = { nombre: '', precio: 0, foto: '', talla: '', pesoLb: 0, sku: '', link: final.origin + final.pathname, tienda: '' };

    // Datos estándar (JSON-LD / OpenGraph)
    const lds = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of lds) {
      try {
        const j = JSON.parse(m[1]); const arr = [].concat(j['@graph'] || j);
        const p = arr.find(x => x && /Product/i.test(x['@type']));
        if (p) {
          d.nombre = d.nombre || p.name || '';
          d.sku = d.sku || p.sku || '';
          const img = [].concat(p.image || [])[0]; d.foto = d.foto || (typeof img === 'string' ? img : (img && img.url) || '');
          const of = [].concat(p.offers || [])[0] || {};
          d.precio = d.precio || parseFloat(of.price || of.lowPrice) || 0;
        }
      } catch (e) {}
    }
    d.nombre = d.nombre || metaDe(html, 'og:title');
    d.foto = d.foto || metaDe(html, 'og:image');
    d.precio = d.precio || parseFloat(metaDe(html, 'product:price:amount') || metaDe(html, 'og:price:amount')) || 0;

    if (/shein/i.test(final.hostname)) {
      d.tienda = 'SHEIN';
      const sp = html.match(/"salePrice"\s*:\s*\{[^}]*?"amount"\s*:\s*"?([\d.]+)/) || html.match(/"sale_price"\s*:\s*\{[^}]*?"amount"\s*:\s*"?([\d.]+)/);
      if (sp) d.precio = parseFloat(sp[1]) || d.precio;
      const gn = html.match(/"goods_name"\s*:\s*"([^"]{10,400})"/); if (gn) d.nombre = decodificar(gn[1]);
      const gi = html.match(/"goods_img"\s*:\s*"([^"]+)"/); if (gi) d.foto = decodificar(gi[1]);
      const gs = html.match(/"goods_sn"\s*:\s*"([^"]+)"/); if (gs) d.sku = gs[1];
      const gid = final.pathname.match(/-p-(\d+)/); if (gid) d.link = final.origin + '/p-' + gid[1] + '.html';
      d.foto = d.foto.replace(/_thumbnail_\d+x\d*/, '');
    } else if (/amazon|amzn|a\.co/i.test(final.hostname)) {
      d.tienda = 'Amazon';
      const t = html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/); if (t) d.nombre = decodificar(t[1].replace(/<[^>]+>/g, ''));
      const p = html.match(/class="a-offscreen">\s*(?:US)?\$\s*([\d,]+\.\d{2})/); if (p) d.precio = parseFloat(p[1].replace(/,/g, '')) || d.precio;
      const im = html.match(/data-old-hires="([^"]+)"/) || html.match(/"hiRes"\s*:\s*"([^"]+)"/); if (im) d.foto = im[1];
      const asin = (final.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/) || [])[1]; if (asin) { d.sku = asin; d.link = 'https://www.amazon.com/dp/' + asin; }
      const pw = html.match(/(Shipping Weight|Peso del env[ií]o|Item Weight|Peso del art[ií]culo)[\s\S]{0,300}?(\d+(?:[.,]\d+)?\s*(?:libras?|pounds?|onzas?|ounces?|kilogramos?|kilograms?|gramos?|grams?))/i);
      if (pw) d.pesoLb = aLibras(pw[2]);
    }
    if (d.foto && d.foto.startsWith('//')) d.foto = 'https:' + d.foto;
    d.nombre = decodificar(d.nombre).replace(/\s*[|\-–]\s*(SHEIN|Amazon\.com).*$/i, '').substring(0, 300);
    if (/captcha|robot check|verify you are human|access denied/i.test(html) && !d.precio) return res.json({ ok: false, bloqueado: true, error: 'La tienda bloqueó la lectura automática' });
    res.json({ ok: !!(d.nombre || d.precio || d.foto), data: d, error: (d.nombre || d.precio || d.foto) ? undefined : 'No encontré datos del producto en la página' });
  } catch (e) { res.json({ ok: false, error: e.name === 'AbortError' ? 'La tienda tardó demasiado' : 'No se pudo abrir la página' }); }
};

module.exports = { getDefaults, listar, obtener, guardar, cambiarEstado, eliminar, convertir, imagen, leerLink };
