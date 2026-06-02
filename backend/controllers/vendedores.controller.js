const { sql, poolPromise } = require('../db/connection');

const getVendedores = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT IdVendedor, Nombres, Apellidos, CodigoVendedor, EsAdministrador
      FROM A_Vendedores
      ORDER BY Nombres
    `);
    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const asignarVendedor = async (req, res) => {
  try {
    const { idDetalle, idVendedor } = req.body;
    if (!idDetalle || !idVendedor) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros' });
    }
    const pool = await poolPromise;
    await pool.request()
      .input('IdDetalleCliente', sql.Int, parseInt(idDetalle))
      .input('IdVendedor',       sql.Int, parseInt(idVendedor))
      .execute('Up_DetallesPedidosIdVendedor');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

module.exports = { getVendedores, asignarVendedor };
