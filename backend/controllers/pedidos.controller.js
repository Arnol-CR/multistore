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

module.exports = { getDashboardStats, getPedidosRecientes, getPedidos, getTodosPedidos };
