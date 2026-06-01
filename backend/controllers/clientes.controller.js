const { sql, poolPromise } = require('../db/connection');

const buscarClientes = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Nombre', sql.NVarChar, req.query.nombre || '')
            .execute('Se_ClientesBuscar');
        res.json({ ok: true, data: result.recordset });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarCliente = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('IdCliente', sql.Int, req.body.idCliente)
            .input('IdDetallePedido', sql.Int, req.body.idDetallePedido)
            .execute('Up_IdClientePedido');
        res.json({ ok: true, mensaje: 'Cliente asignado correctamente' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarClienteMultiple = async (req, res) => {
    try {
        const { idCliente, idDetalles } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('IdCliente', sql.Int, idCliente)
            .input('IdDetalles', sql.NVarChar, idDetalles)
            .execute('Up_IdClientePedidoMultiple');
        res.json({ ok: true, mensaje: 'Clientes asignados correctamente' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarPrecio = async (req, res) => {
    try {
        const { idDetallePedido, valorCobro } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('IdDetalleCliente', sql.Int, idDetallePedido)
            .input('ValorCobro', sql.Decimal(18,2), valorCobro)
            .execute('Up_ValorVentaDetallesPedidos');
        res.json({ ok: true, mensaje: 'Precio asignado correctamente' });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio };