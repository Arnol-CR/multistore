const { sql, poolPromise } = require('../db/connection');

// Resumen por cuenta (Se_ResumenCuentaBancos)
const getResumenCuentas = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('FechaInicio', sql.Date, fechaInicio || null)
            .input('FechaFin',    sql.Date, fechaFin    || null)
            .execute('Se_ResumenCuentaBancos');
        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Detalle de transacciones (Se_EstadoCuentaBancos)
const getDetalleCuenta = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, idCuenta } = req.query;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('FechaInicio', sql.Date, fechaInicio || null)
            .input('FechaFin',    sql.Date, fechaFin    || null)
            .input('IdCuenta',    sql.Int,  idCuenta    ? parseInt(idCuenta) : null)
            .execute('Se_EstadoCuentaBancos');
        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

module.exports = { getResumenCuentas, getDetalleCuenta };
