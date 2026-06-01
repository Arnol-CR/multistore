const { sql, poolPromise } = require('../db/connection');

const buscarClientes = async (req, res) => {
    try {
        const { nombre } = req.query;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Nombre', sql.NVarChar, nombre || '')
            .execute('Se_ClientesBuscar');
        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const asignarCliente = async (req, res) => {
    try {
        const { idDetallePedido, idCliente } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('IdCliente', sql.Int, idCliente)
            .input('IdDetallePedido', sql.Int, idDetallePedido)
            .execute('Up_IdClientePedido');
        res.json({ ok: true, mensaje: 'Cliente asignado correctamente' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

module.exports = { buscarClientes, asignarCliente };