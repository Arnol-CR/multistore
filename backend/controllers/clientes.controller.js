const { sql, poolPromise } = require('../db/connection');

const getTodosClientes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().execute('Se_Clientes');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getHistorialCliente = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdCliente', sql.Int, parseInt(req.query.idCliente))
      .execute('Se_HistorialCliente');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { getTodosClientes, getHistorialCliente };
