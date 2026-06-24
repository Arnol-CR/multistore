const { sql, poolPromise } = require('../db/connection');

/* =========================================================
   PESTAÑA 1 — ARTÍCULOS SIN SEGUIMIENTO
   ========================================================= */

// Listar artículos sin seguimiento (SP_DetallePedidoSinSeguimiento)
const getArticulosSinSeguimiento = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .execute('Sp_DetallePedidoSinSeguimiento');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Crear un nuevo seguimiento (In_Seguimientos)
const crearSeguimiento = async (req, res) => {
    try {
        const { Seguimiento, FechaSalidaInicio, FechaEstimadaEntrega } = req.body;

        if (!Seguimiento || !FechaSalidaInicio || !FechaEstimadaEntrega) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan datos del seguimiento.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('Seguimiento', sql.NVarChar(sql.MAX), Seguimiento)
            .input('FechaSalidaInicio', sql.Date, FechaSalidaInicio)
            .input('FechaEstimadaEntrega', sql.Date, FechaEstimadaEntrega)
            .execute('In_Seguimientos');

        const mensaje = result.recordset[0]?.menjase || 'Procesado.';
        res.json({ ok: true, mensaje });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Asignar/editar el seguimiento de un artículo (Up_DetallesPedidosIdSeguimiento)
const asignarSeguimientoArticulo = async (req, res) => {
    try {
        const { IdDetalleCliente, IdSeguimiento } = req.body;

        if (!IdDetalleCliente || !IdSeguimiento) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan IdDetalleCliente o IdSeguimiento.' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('IdDetalleCliente', sql.Int, IdDetalleCliente)
            .input('IdSeguimiento', sql.Int, IdSeguimiento)
            .execute('Up_DetallesPedidosIdSeguimiento');

        res.json({ ok: true, mensaje: 'Seguimiento asignado correctamente.' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Asignar el mismo seguimiento a varios artículos a la vez (asignación masiva)
const asignarSeguimientoMasivo = async (req, res) => {
    try {
        const { idsDetalle, IdSeguimiento } = req.body;

        if (!Array.isArray(idsDetalle) || idsDetalle.length === 0 || !IdSeguimiento) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan idsDetalle o IdSeguimiento.' });
        }

        const pool = await poolPromise;

        for (const idDetalle of idsDetalle) {
            await pool.request()
                .input('IdDetalleCliente', sql.Int, idDetalle)
                .input('IdSeguimiento', sql.Int, IdSeguimiento)
                .execute('Up_DetallesPedidosIdSeguimiento');
        }

        res.json({ ok: true, mensaje: `${idsDetalle.length} artículo(s) asignado(s) correctamente.` });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

/* =========================================================
   PESTAÑA 2 — ENTRADA A CASILLERO
   ========================================================= */

// Listar seguimientos (Se_Seguimientos) — sirve para elegir a cuál registrar entrada
const getSeguimientos = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .execute('Se_Seguimientos');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Registrar fecha de entrada a casillero (In_EntradasCasillero)
const registrarEntradaCasillero = async (req, res) => {
    try {
        const { EntradaMiami, EntregaEstimada, IdSeguimiento, CambioSeguimiento } = req.body;

        if (!EntradaMiami || !EntregaEstimada || !IdSeguimiento) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan datos de la entrada a casillero.' });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('EntradaMiami', sql.Date, EntradaMiami)
            .input('EntregaEstimada', sql.Date, EntregaEstimada)
            .input('IdSeguimiento', sql.Int, IdSeguimiento)
            .input('CambioSeguimiento', sql.NVarChar(50), CambioSeguimiento || null)
            .execute('In_EntradasCasillero');

        res.json({ ok: true, mensaje: 'Entrada a casillero registrada correctamente.' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

/* =========================================================
   PESTAÑA 3 — ORDEN DE PAGO DE CASILLERO (MULTI-TRACKING)
   ========================================================= */

// Listar entradas de casillero (Se_EntradaCasillero) — para elegir trackings a incluir en la orden
const getEntradasCasillero = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .execute('Se_EntradaCasillero');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Obtener artículos de un seguimiento (Se_Pedidos_Seguimiento)
const getArticulosPorSeguimiento = async (req, res) => {
    try {
        const { idSeguimiento } = req.params;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('IdSeguimiento', sql.Int, idSeguimiento)
            .execute('Se_Pedidos_Seguimiento');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Listar cuentas bancarias (Se_CuentaBanco)
const getCuentasBanco = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .execute('Se_CuentaBanco');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Crear orden de pago de casillero (In_OrdenesEntrega)
const crearOrdenEntrega = async (req, res) => {
    try {
        const { NumeroOrden, Fecha, CantidadPagada, IdMetodoPago, Peso, IdCuenta } = req.body;

        if (!NumeroOrden || !Fecha || CantidadPagada == null || !IdMetodoPago || Peso == null || !IdCuenta) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan datos de la orden de pago.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('NumeroOrden', sql.NVarChar(50), NumeroOrden)
            .input('Fecha', sql.Date, Fecha)
            .input('CantidadPagada', sql.Decimal(18, 2), CantidadPagada)
            .input('IdMetodoPago', sql.Int, IdMetodoPago)
            .input('Peso', sql.Decimal(18, 2), Peso)
            .input('IdCuenta', sql.Int, IdCuenta)
            .execute('In_OrdenesEntrega');

        const idOrden = result.recordset[0]?.IdOrden;
        res.json({ ok: true, idOrden });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Asignar IdOrden a una o varias entradas de casillero (Up_EntradasCasilleroIdOrden)
const asignarOrdenAEntradas = async (req, res) => {
    try {
        const { idsSeguimiento, IdOrden } = req.body;

        if (!Array.isArray(idsSeguimiento) || idsSeguimiento.length === 0 || !IdOrden) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan idsSeguimiento o IdOrden.' });
        }

        const pool = await poolPromise;

        for (const idSeguimiento of idsSeguimiento) {
            await pool.request()
                .input('IdSeguimiento', sql.Int, idSeguimiento)
                .input('IdOrden', sql.Int, IdOrden)
                .execute('Up_EntradasCasilleroIdOrden');
        }

        res.json({ ok: true, mensaje: 'Orden asignada a los seguimientos seleccionados.' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

/* =========================================================
   PESTAÑA 4 — CONSULTA DE ÓRDENES
   ========================================================= */

// Listar órdenes por rango de fechas (Se_OrdenesEntrega)
const getOrdenes = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({ ok: false, mensaje: 'Faltan fechaInicio o fechaFin.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .execute('Se_OrdenesEntrega');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Obtener detalle de artículos de una orden (Se_DetalleOrdenEntrega)
const getDetalleOrden = async (req, res) => {
    try {
        const { idOrden } = req.params;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('IdOrden', sql.Int, idOrden)
            .execute('Se_DetalleOrdenEntrega');

        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Marcar artículo como entregado o no entregado (Up_EstaEntregado)
const marcarEntregado = async (req, res) => {
    try {
        const { IdDetallePedido, EstaEntregado } = req.body;
        if (!IdDetallePedido) return res.status(400).json({ ok: false, error: 'Falta IdDetallePedido.' });

        const pool = await poolPromise;
        await pool.request()
            .input('IdDetallePedido', sql.Int, parseInt(IdDetallePedido))
            .input('EstaEntregado', sql.Bit, EstaEntregado ? 1 : 0)
            .execute('Up_EstaEntregado');

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

module.exports = {
    // Pestaña 1
    getArticulosSinSeguimiento,
    crearSeguimiento,
    asignarSeguimientoArticulo,
    asignarSeguimientoMasivo,
    // Pestaña 2
    getSeguimientos,
    registrarEntradaCasillero,
    // Pestaña 3
    getEntradasCasillero,
    getArticulosPorSeguimiento,
    getCuentasBanco,
    crearOrdenEntrega,
    asignarOrdenAEntradas,
    // Pestaña 4
    getOrdenes,
    getDetalleOrden,
    marcarEntregado
};
