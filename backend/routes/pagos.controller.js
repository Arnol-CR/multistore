const { sql, poolPromise } = require('../db/connection');

const getMetodosPagos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().execute('Se_MetodosPagos');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getCuentasBanco = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().execute('Se_CuentaBanco');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const registrarPago = async (req, res) => {
  try {
    const { fechaPago, idCliente, cantidad, idMetodoPago, observaciones, referencia, idCuenta, idMovimiento } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('FechaPago',        sql.Date,          fechaPago)
      .input('IdCliente',        sql.Int,            idCliente)
      .input('Cantidad',         sql.Decimal(18,2),  cantidad)
      .input('IdMetodoPago',     sql.Int,            idMetodoPago)
      .input('Observaciones',    sql.NVarChar,       observaciones || '')
      .input('Referencia',       sql.NVarChar,       referencia || '')
      .input('IdCuenta',         sql.Int,            idCuenta)
      .input('IdMovimiento',     sql.Int,            idMovimiento || 3)
      .execute('InPagoClientes');
    res.json({ ok: true, mensaje: 'Pago registrado correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getPagosRecientes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const pool  = await poolPromise;
    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit)
          IdMovimientoCliente AS IdPago,
          CONVERT(varchar(10), FechaMovimiento, 120) AS FechaPago,
          Monto AS Cantidad,
          NumeroReferencia AS Referencia,
          NombreCompleto AS NombreCliente,
          Metodo,
          NombreCuenta
        FROM vw_pagos
        ORDER BY FechaMovimiento DESC, IdMovimientoCliente DESC
      `);
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { getMetodosPagos, getCuentasBanco, registrarPago, getPagosRecientes };
