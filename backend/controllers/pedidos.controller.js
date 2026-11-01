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

// Precio de compra (precio de la app) y cantidad de los artículos aún no entregados
const getCostos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT D.IdDetallePedido, D.ValorCompra, D.CantidadArticulos, D.Link, P.TasaCambio
      FROM C_DetallePedido D
      JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
      WHERE ISNULL(D.EstaEntregado, 0) = 0`);
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { getDashboardStats, getPedidosRecientes, getPedidos, getTodosPedidos, getCostos };
