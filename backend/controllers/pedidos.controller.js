const { sql, poolPromise } = require('../db/connection');

const getDashboardStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdVendedor', sql.Int, parseInt(req.query.idVendedor))
      .input('EsAdmin', sql.Bit, parseInt(req.query.esAdmin))
      .execute('SP_DashboardStats');
    res.json({ ok: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getPedidosRecientes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdVendedor', sql.Int, parseInt(req.query.idVendedor))
      .input('EsAdmin', sql.Bit, parseInt(req.query.esAdmin))
      .execute('SP_PedidosRecientes');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getPedidos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdVendedor', sql.Int, parseInt(req.query.idVendedor))
      .input('EsAdmin', sql.Bit, parseInt(req.query.esAdmin))
      .execute('SP_PedidosRecientes');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getTodosPedidos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdVendedor', sql.Int, parseInt(req.query.idVendedor))
      .input('EsAdmin', sql.Bit, parseInt(req.query.esAdmin))
      .execute('SP_TodosLosPedidos');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Precio de compra (precio de la app), cantidad y peso de los artículos (entregados o no)
const getCostos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT D.IdDetallePedido, D.ValorCompra, D.CantidadArticulos, D.Link, P.TasaCambio, D.Peso,
             -- si el casillero no tiene precio por libra, se usa el de otro casillero; si la línea no tiene peso, el del catálogo
             COALESCE(NULLIF(CA.PrecioLibra, 0), (SELECT TOP 1 PrecioLibra FROM A_Casilleros WHERE PrecioLibra > 0 ORDER BY IdCasillero)) AS PrecioLibra,
             NULLIF(A.PesoArticulo, 0) AS PesoCatalogo, ISNULL(D.ValorCobradoReal, 0) AS EnvioReal,
             CASE WHEN EXISTS (SELECT 1 FROM C_EntradasCasillero X WHERE X.IdSeguimiento = D.IdSeguimiento AND X.IdOrden IS NOT NULL) THEN 1 ELSE 0 END AS TieneOrden
      FROM C_DetallePedido D
      JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
      LEFT JOIN A_Casilleros CA ON CA.IdCasillero = P.IdCasillero
      LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo`);
    // artículos marcados "no llegó" (si la columna todavía no existe, no hay ninguno)
    let perdidos = [];
    try { perdidos = (await pool.request().query('SELECT IdDetallePedido FROM C_DetallePedido WHERE NoLlego = 1')).recordset.map(x => x.IdDetallePedido); } catch (e) {}
    res.json({ ok: true, data: result.recordset, noLlego: perdidos });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Foto y link de todos los artículos (para la página Pedidos)
const getExtras = async (req, res) => {
  try {
    const pool = await poolPromise;
    // también la orden de pago de casillero de cada artículo (para filtrar por orden)
    const r = await pool.request().query(`
      SELECT D.IdDetallePedido, D.Fotografia, D.Link, RTRIM(OE.NumeroOrden) AS NumeroOrden, CONVERT(varchar(10), OE.Fecha, 23) AS FechaOrden
      FROM C_DetallePedido D
      OUTER APPLY (SELECT TOP 1 X.IdOrden FROM C_EntradasCasillero X WHERE X.IdSeguimiento = D.IdSeguimiento AND X.IdOrden IS NOT NULL ORDER BY X.IdEntradaCasillero DESC) EC
      LEFT JOIN C_OrdenesEntrega OE ON OE.IdOrden = EC.IdOrden`);
    res.json({ ok: true, data: r.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { getExtras, getDashboardStats, getPedidosRecientes, getPedidos, getTodosPedidos, getCostos };
