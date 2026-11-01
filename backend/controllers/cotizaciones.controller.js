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
  tablasListas = true;
}

const err = (res, e, code = 500) => res.status(code).json({ ok: false, error: e.message || String(e) });

/* Valores por defecto: última tasa de cambio usada y última tarifa por casillero */
const getDefaults = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const t = await pool.request().query(`
      SELECT TOP 1 TasaCambio FROM C_Pedidos WHERE TasaCambio IS NOT NULL AND TasaCambio > 0 ORDER BY IdPedido DESC`);
    const tc = await pool.request().query(`
      SELECT TOP 1 TasaCambio FROM C_Cotizaciones WHERE TasaCambio > 0 ORDER BY IdCotizacion DESC`);
    const tarifas = await pool.request().query(`
      SELECT c.IdCasillero, c.TarifaLibra FROM C_Cotizaciones c
      WHERE c.IdCasillero IS NOT NULL AND c.TarifaLibra > 0
        AND c.IdCotizacion = (SELECT MAX(x.IdCotizacion) FROM C_Cotizaciones x WHERE x.IdCasillero = c.IdCasillero AND x.TarifaLibra > 0)`);
    res.json({ ok: true, data: {
      tasaCambio: (tc.recordset[0] || t.recordset[0] || {}).TasaCambio || null,
      tarifas: tarifas.recordset
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
          IdCasillero=@IdCasillero, TarifaLibra=@TarifaLibra, ImpuestoPct=@ImpuestoPct, MargenPct=@MargenPct, TasaCambio=@TasaCambio,
          RedondearLibras=@RedondearLibras, TotalUSD=@TotalUSD, TotalLempiras=@TotalLempiras, Notas=@Notas
        WHERE IdCotizacion=@Id AND Estado <> 'Convertida';
        SELECT @@ROWCOUNT AS n;`);
      if (!r.recordset[0].n) { await tx.rollback(); return err(res, 'No se puede editar: la cotización no existe o ya se convirtió en pedido', 400); }
      await new sql.Request(tx).input('Id', sql.Int, id).query('DELETE FROM C_CotizacionDetalle WHERE IdCotizacion=@Id');
    } else {
      const r = await cab(new sql.Request(tx)).query(`
        INSERT INTO C_Cotizaciones (IdCliente, NombreCliente, Telefono, IdVendedor, IdCasillero, TarifaLibra, ImpuestoPct, MargenPct, TasaCambio, RedondearLibras, TotalUSD, TotalLempiras, Notas)
        OUTPUT INSERTED.IdCotizacion
        VALUES (@IdCliente, @NombreCliente, @Telefono, @IdVendedor, @IdCasillero, @TarifaLibra, @ImpuestoPct, @MargenPct, @TasaCambio, @RedondearLibras, @TotalUSD, @TotalLempiras, @Notas);`);
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
        .query(`INSERT INTO C_CotizacionDetalle (IdCotizacion, Nombre, Link, Foto, Sku, TallaColor, PrecioUSD, Cantidad, PesoLb, IdArticulo, PrecioFinalL)
                VALUES (@Id, @Nombre, @Link, @Foto, @Sku, @TallaColor, @PrecioUSD, @Cantidad, @PesoLb, @IdArticulo, @PrecioFinalL)`);
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
    const ok = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'];
    const estado = req.body.estado;
    if (!ok.includes(estado)) return err(res, 'Estado no válido', 400);
    const pool = await poolPromise; await asegurarTablas(pool);
    await pool.request().input('Id', sql.Int, parseInt(req.params.id)).input('Estado', sql.NVarChar(20), estado)
      .query("UPDATE C_Cotizaciones SET Estado=@Estado WHERE IdCotizacion=@Id AND Estado <> 'Convertida'");
    res.json({ ok: true });
  } catch (e) { err(res, e); }
};

const eliminar = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const r = await pool.request().input('Id', sql.Int, parseInt(req.params.id))
      .query("DELETE FROM C_Cotizaciones WHERE IdCotizacion=@Id AND Estado <> 'Convertida'; SELECT @@ROWCOUNT AS n;");
    if (!r.recordset[0].n) return err(res, 'No se puede eliminar una cotización ya convertida en pedido', 400);
    res.json({ ok: true });
  } catch (e) { err(res, e); }
};

/* Convertir en pedido: cada línea pasa a C_DetallePedido del pedido elegido,
   con cliente y precio de venta ya asignados. */
const convertir = async (req, res) => {
  try {
    const pool = await poolPromise; await asegurarTablas(pool);
    const id = parseInt(req.params.id);
    const { idPedido, articulos, noPedidoTienda } = req.body || {};   // articulos: { IdDetalle: IdArticulo }
    if (!idPedido) return err(res, 'Elige el pedido', 400);
    const c = (await pool.request().input('Id', sql.Int, id).query('SELECT * FROM C_Cotizaciones WHERE IdCotizacion=@Id')).recordset[0];
    if (!c) return err(res, 'La cotización no existe', 404);
    if (c.Estado === 'Convertida') return err(res, 'Esta cotización ya se convirtió en pedido', 400);
    const lineas = (await pool.request().input('Id', sql.Int, id).query('SELECT * FROM C_CotizacionDetalle WHERE IdCotizacion=@Id ORDER BY IdDetalle')).recordset;
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
      creados++;
    }
    await pool.request().input('Id', sql.Int, id).input('IdPedido', sql.Int, parseInt(idPedido))
      .query("UPDATE C_Cotizaciones SET Estado='Convertida', IdPedido=@IdPedido WHERE IdCotizacion=@Id");
    res.json({ ok: true, creados });
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

module.exports = { getDefaults, listar, obtener, guardar, cambiarEstado, eliminar, convertir, imagen };
