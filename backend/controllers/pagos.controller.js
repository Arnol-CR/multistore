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
    if (!(req.usuario && req.usuario.esAdmin)) result.recordset.forEach(c => { delete c.Capital; });
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
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 15, 1), 1000);
    const pool  = await poolPromise;
    const result = await pool.request()
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit)
          V.IdMovimientoCliente AS IdPago,
          CONVERT(varchar(10), V.FechaMovimiento, 120) AS FechaPago,
          V.Monto AS Cantidad,
          V.NumeroReferencia AS Referencia,
          V.NombreCompleto AS NombreCliente,
          V.IdCliente, V.Metodo, V.NombreCuenta, V.IdCuentaBanco, V.Observaciones, V.IdTipoMovimiento,
          MC.IdMetodoPago
        FROM vw_pagos V
        JOIN C_MovimientoClientes MC ON MC.IdMovimientoCliente = V.IdMovimientoCliente
        ORDER BY V.FechaMovimiento DESC, V.IdMovimientoCliente DESC
      `);
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Editar un pago de cliente (solo administrador). Después se recalcula el saldo de los clientes.
const editarPago = async (req, res) => {
  try {
    if (!(req.usuario && req.usuario.esAdmin)) return res.status(403).json({ ok: false, error: 'Solo el administrador puede editar pagos' });
    const id = parseInt(req.params.id), b = req.body || {}, monto = parseFloat(b.cantidad);
    if (!id || !(monto > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(b.fechaPago || '')) return res.status(400).json({ ok: false, error: 'Fecha y monto son obligatorios' });
    const pool = await poolPromise;
    const r = await pool.request().input('Id', sql.Int, id).input('F', sql.Date, b.fechaPago).input('M', sql.Decimal(18, 2), monto)
      .input('Met', sql.Int, parseInt(b.idMetodoPago) || null).input('Cta', sql.Int, parseInt(b.idCuenta) || null)
      .input('Ref', sql.NVarChar(sql.MAX), (b.referencia || '').trim()).input('Obs', sql.NVarChar(sql.MAX), (b.observaciones || '').trim())
      .query(`UPDATE C_MovimientoClientes SET FechaMovimiento = @F, Monto = @M, IdMetodoPago = @Met, IdCuentaBanco = @Cta, NumeroReferencia = @Ref, Observaciones = @Obs
              WHERE IdMovimientoCliente = @Id AND IdMovimiento = 3 AND ISNULL(NumeroReferencia, '') NOT LIKE 'NOLLEGO-%'`);
    if (!r.rowsAffected[0]) return res.status(404).json({ ok: false, error: 'Ese pago no se puede editar' });
    try { await pool.request().execute('RecalcularSaldoClientes'); } catch (e) {}
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Eliminar un pago registrado por error (solo administrador)
const eliminarPago = async (req, res) => {
  try {
    if (!(req.usuario && req.usuario.esAdmin)) return res.status(403).json({ ok: false, error: 'Solo el administrador puede eliminar pagos' });
    const pool = await poolPromise;
    const r = await pool.request().input('Id', sql.Int, parseInt(req.params.id))
      .query(`DELETE FROM C_MovimientoClientes WHERE IdMovimientoCliente = @Id AND IdMovimiento = 3 AND ISNULL(NumeroReferencia, '') NOT LIKE 'NOLLEGO-%'`);
    if (!r.rowsAffected[0]) return res.status(404).json({ ok: false, error: 'Ese pago no se puede eliminar' });
    try { await pool.request().execute('RecalcularSaldoClientes'); } catch (e) {}
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { getMetodosPagos, getCuentasBanco, registrarPago, getPagosRecientes, editarPago, eliminarPago };
