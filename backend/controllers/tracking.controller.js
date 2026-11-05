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

        // El procedimiento devuelve un texto sin nombre de columna
        const fila = result.recordset[0] || {};
        const mensaje = String(Object.values(fila)[0] || 'Procesado.');
        if (/ya existe/i.test(mensaje)) return res.status(409).json({ ok: false, error: mensaje });
        const id = (await pool.request().input('S', sql.NVarChar(sql.MAX), Seguimiento)
            .query('SELECT TOP 1 IdSeguimiento FROM C_Seguimientos WHERE Seguimiento = @S ORDER BY IdSeguimiento DESC')).recordset[0];
        res.json({ ok: true, mensaje, idSeguimiento: id ? id.IdSeguimiento : null });
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
// Trackings con artículos que todavía no tienen orden de pago, tengan o no la entrada a casillero.
// Si no la tienen, se registra sola al crear la orden.
const getEntradasCasillero = async (req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().query(`
            SELECT 
                S.IdSeguimiento, 
                RTRIM(S.Seguimiento) AS Seguimiento, 
                S.CambioSeguimiento, 
                S.IdEstado,
                S.FechaSalidaInicio, 
                S.FechaEstimadaEntrega,
                EC.IdEntradaCasillero, 
                EC.EntradaMiami, 
                EC.EntregaEstimada,
                ISNULL(CE.NombreCasillero, CP.NombreCasillero) AS NombreCasillero,
                
                -- Forzamos los alias explícitos
                X.Articulos   AS Articulos,
                X.Unidades    AS Unidades,
                X.Pedidos     AS Pedidos,
                X.Tiendas     AS Tiendas,
                
                CAST(X.Gramos / 454.0 AS decimal(10,2)) AS TotalPesoLibras,
                CAST(
                    CASE WHEN X.Gramos < 454 THEN 1 ELSE X.Gramos / 454.0 END 
                    * ISNULL(ISNULL(CE.PrecioLibra, CP.PrecioLibra), 0) 
                    AS decimal(10,2)
                ) AS TotalPago
            FROM C_Seguimientos S
            CROSS APPLY (
                SELECT 
                    COUNT(*) AS Articulos, 
                    SUM(D.CantidadArticulos) AS Unidades, 
                    ISNULL(SUM(D.PesoTotal), 0) AS Gramos,
                    MIN(D.IdPedido) AS IdPedido,
                    STUFF((
                        SELECT DISTINCT ', ' + RTRIM(P2.NumeroPedido) 
                        FROM C_DetallePedido D2 
                        JOIN C_Pedidos P2 ON P2.IdPedido = D2.IdPedido
                        WHERE D2.IdSeguimiento = S.IdSeguimiento 
                        FOR XML PATH('')
                    ), 1, 2, '') AS Pedidos,
                    STUFF((
                        SELECT DISTINCT ', ' + E2.NombreEmpresa 
                        FROM C_DetallePedido D2 
                        JOIN C_Pedidos P2 ON P2.IdPedido = D2.IdPedido
                        JOIN A_Empresas E2 ON E2.IdEmpresa = P2.IdEmpresa 
                        WHERE D2.IdSeguimiento = S.IdSeguimiento 
                        FOR XML PATH('')
                    ), 1, 2, '') AS Tiendas
                FROM C_DetallePedido D 
                WHERE D.IdSeguimiento = S.IdSeguimiento
            ) X
            LEFT JOIN C_EntradasCasillero EC ON EC.IdSeguimiento = S.IdSeguimiento
            LEFT JOIN A_Casilleros CE ON CE.IdCasillero = EC.IdCasillero
            LEFT JOIN C_Pedidos PP ON PP.IdPedido = X.IdPedido
            LEFT JOIN A_Casilleros CP ON CP.IdEmpresa = PP.IdCasillero
            WHERE X.Articulos > 0 
              AND EC.IdOrden IS NULL
            ORDER BY ISNULL(EC.EntradaMiami, S.FechaSalidaInicio) DESC, S.IdSeguimiento DESC
        `);
        res.json({ ok: true, data: r.recordset });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

const getArticulosPorSeguimiento = async (req, res) => {
    try {
        const { idSeguimiento } = req.params;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('IdSeguimiento', sql.Int, parseInt(idSeguimiento))
            .query(`SELECT CT.IdDetallePedido, CT.NombreCliente, CT.NombreArticulo, CT.TallaColor, CT.DescripcionArticulo,
                           V.CodigoVendedor, CT.CantidadArticulos, DP.Fotografia
                    FROM ListadoPedidoCostoTodos CT
                    LEFT JOIN A_Vendedores V ON CT.IdVendedor = V.IdVendedor
                    LEFT JOIN C_DetallePedido DP ON DP.IdDetallePedido = CT.IdDetallePedido
                    WHERE CT.IdSeguimiento = @IdSeguimiento
                    ORDER BY CT.NombreCliente, CT.IdDetallePedido`);

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
// Asignar la orden a los trackings elegidos. Si un tracking no tiene entrada a casillero,
// se registra en ese momento (llegada = fecha de la orden; casillero = el del pedido).
const asignarOrdenAEntradas = async (req, res) => {
    const { idsSeguimiento, IdOrden } = req.body;
    if (!Array.isArray(idsSeguimiento) || idsSeguimiento.length === 0 || !IdOrden) {
        return res.status(400).json({ ok: false, mensaje: 'Faltan idsSeguimiento o IdOrden.' });
    }
    const pool = await poolPromise;
    const tx = new sql.Transaction(pool);
    try {
        await tx.begin();
        const orden = (await new sql.Request(tx).input('O', sql.Int, parseInt(IdOrden))
            .query('SELECT Fecha FROM C_OrdenesEntrega WHERE IdOrden = @O')).recordset[0];
        if (!orden) throw new Error('No encontré la orden');
        let nuevas = 0;
        for (const idSeguimiento of idsSeguimiento) {
            const id = parseInt(idSeguimiento);
            const seg = (await new sql.Request(tx).input('S', sql.Int, id).query(`
                SELECT S.FechaEstimadaEntrega, S.CambioSeguimiento,
                       (SELECT COUNT(*) FROM C_EntradasCasillero WHERE IdSeguimiento = S.IdSeguimiento) AS Entradas
                FROM C_Seguimientos S WHERE S.IdSeguimiento = @S`)).recordset[0];
            if (!seg) throw new Error('No encontré el tracking ' + id);
            if (!seg.Entradas) {
                await new sql.Request(tx)
                    .input('EntradaMiami', sql.Date, orden.Fecha)
                    .input('EntregaEstimada', sql.Date, seg.FechaEstimadaEntrega || orden.Fecha)
                    .input('IdSeguimiento', sql.Int, id)
                    .input('CambioSeguimiento', sql.NVarChar(50), seg.CambioSeguimiento || null)
                    .execute('In_EntradasCasillero');
                nuevas++;
            }
            await new sql.Request(tx).input('IdSeguimiento', sql.Int, id).input('IdOrden', sql.Int, parseInt(IdOrden))
                .execute('Up_EntradasCasilleroIdOrden');
        }
        await tx.commit();
        res.json({ ok: true, mensaje: 'Orden asignada a los trackings seleccionados.' + (nuevas ? ` Se registró la entrada a casillero de ${nuevas}.` : '') });
    } catch (err) {
        try { await tx.rollback(); } catch (_) {}
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
            .query(`SELECT OE.IdOrden, OE.NumeroOrden, OE.Fecha, OE.CantidadPagada, OE.Peso, OE.IdMetodoPago, OE.IdCuenta,
                           CB.Banco, CB.NombreCuenta, MP.Metodo, COUNT(EC.IdEntradaCasillero) AS TotalSeguimientos
                    FROM C_OrdenesEntrega OE
                    LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = OE.IdCuenta
                    LEFT JOIN A_MetodosPagos MP ON MP.IdMetodoPago = OE.IdMetodoPago
                    LEFT JOIN C_EntradasCasillero EC ON EC.IdOrden = OE.IdOrden
                    WHERE CAST(OE.Fecha AS DATE) BETWEEN @FechaInicio AND @FechaFin
                    GROUP BY OE.IdOrden, OE.NumeroOrden, OE.Fecha, OE.CantidadPagada, OE.Peso, OE.IdMetodoPago, OE.IdCuenta, CB.Banco, CB.NombreCuenta, MP.Metodo
                    ORDER BY OE.Fecha DESC, OE.IdOrden DESC`);

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
            .input('IdOrden', sql.Int, parseInt(idOrden))
            .query(`SELECT DP.IdDetallePedido, CT.NombreCliente, CT.NombreArticulo, DP.CodigoArticulo, CT.TallaColor,
                           LEFT(CT.DescripcionArticulo, 80) AS DescripcionCorta, CT.CantidadArticulos, V.CodigoVendedor,
                           S.Seguimiento, E.NombreEmpresa AS Tienda, ISNULL(DP.EstaEntregado, 0) AS EstaEntregado,
                           ISNULL(DP.PeroCobradoReal, 0) AS PesoEnvioG, ISNULL(DP.ValorCobradoReal, 0) AS ValorEnvio
                    FROM C_EntradasCasillero EC
                    INNER JOIN C_Seguimientos S ON S.IdSeguimiento = EC.IdSeguimiento
                    INNER JOIN C_DetallePedido DP ON DP.IdSeguimiento = EC.IdSeguimiento
                    INNER JOIN ListadoPedidoCostoTodos CT ON CT.IdDetallePedido = DP.IdDetallePedido
                    LEFT JOIN A_Vendedores V ON V.IdVendedor = CT.IdVendedor
                    LEFT JOIN C_Pedidos P ON P.IdPedido = DP.IdPedido
                    LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
                    WHERE EC.IdOrden = @IdOrden
                    ORDER BY V.CodigoVendedor, CT.NombreCliente`);

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

// Datos completos de un artículo para la ventana "Ver artículo"
const getDetalleArticulo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id) return res.status(400).json({ ok: false, error: 'Falta el artículo' });
        const pool = await poolPromise;
        const r = await pool.request().input('Id', sql.Int, id).query(`
            SELECT D.IdDetallePedido, RTRIM(P.NumeroPedido) AS NumeroPedido, P.FechaPedido, P.TasaCambio,
                   A.NombreArticulo, D.DescripcionArticulo, D.TallaColor, D.CodigoArticulo, D.Fotografia, D.Link,
                   D.NoPedidoAplicacion, E.NombreEmpresa, D.ValorCompra, D.CantidadArticulos, D.ValorCobroCliente,
                   D.IdCliente, ISNULL(C.Nombre + ' ' + C.Apellido, 'Sin cliente') AS NombreCliente,
                   D.IdVendedor, V.Nombres + ' ' + V.Apellidos AS NombreVendedor, V.CodigoVendedor,
                   D.IdSeguimiento, S.Seguimiento, D.Peso, ISNULL(D.EstaEntregado, 0) AS EstaEntregado
            FROM C_DetallePedido D
            JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
            LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo
            LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
            LEFT JOIN C_Clientes C ON C.IdCliente = D.IdCliente
            LEFT JOIN A_Vendedores V ON V.IdVendedor = D.IdVendedor
            LEFT JOIN C_Seguimientos S ON S.IdSeguimiento = D.IdSeguimiento
            WHERE D.IdDetallePedido = @Id`);
        if (!r.recordset.length) return res.status(404).json({ ok: false, error: 'No encontré el artículo' });
        res.json({ ok: true, data: r.recordset[0] });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};

// Trackings de una orden (para editarla)
const getTrackingsOrden = async (req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().input('O', sql.Int, parseInt(req.params.idOrden)).query(`
            SELECT S.IdSeguimiento, RTRIM(S.Seguimiento) AS Seguimiento,
                   (SELECT COUNT(*) FROM C_DetallePedido D WHERE D.IdSeguimiento = S.IdSeguimiento) AS Articulos,
                   CAST((SELECT ISNULL(SUM(D.PesoTotal), 0) FROM C_DetallePedido D WHERE D.IdSeguimiento = S.IdSeguimiento) / 454.0 AS decimal(10,2)) AS PesoLibras
            FROM C_EntradasCasillero EC JOIN C_Seguimientos S ON S.IdSeguimiento = EC.IdSeguimiento
            WHERE EC.IdOrden = @O ORDER BY S.Seguimiento`);
        res.json({ ok: true, data: r.recordset });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Editar una orden de pago y, si se indica, quitarle trackings. Luego se recalcula el reparto del
// envío real entre sus trackings y artículos (los triggers corren al tocar las entradas de la orden).
const editarOrden = async (req, res) => {
    const id = parseInt(req.params.idOrden);
    const { NumeroOrden, Fecha, CantidadPagada, IdMetodoPago, Peso, IdCuenta, quitar } = req.body || {};
    if (!id || !NumeroOrden || !Fecha || CantidadPagada == null || Peso == null || !IdCuenta)
        return res.status(400).json({ ok: false, error: 'Faltan datos de la orden.' });
    const pool = await poolPromise;
    const tx = new sql.Transaction(pool);
    try {
        await tx.begin();
        await new sql.Request(tx).input('Id', sql.Int, id).input('N', sql.NVarChar(50), NumeroOrden).input('F', sql.Date, Fecha)
            .input('C', sql.Decimal(18, 2), CantidadPagada).input('M', sql.Int, parseInt(IdMetodoPago) || null)
            .input('P', sql.Decimal(18, 2), Peso).input('Cta', sql.Int, parseInt(IdCuenta))
            .query(`UPDATE C_OrdenesEntrega SET NumeroOrden = @N, Fecha = @F, CantidadPagada = @C, IdMetodoPago = @M, Peso = @P, IdCuenta = @Cta WHERE IdOrden = @Id`);
        for (const s of (Array.isArray(quitar) ? quitar : [])) {
            await new sql.Request(tx).input('Id', sql.Int, id).input('S', sql.Int, parseInt(s)).query(`
                UPDATE C_EntradasCasillero SET IdOrden = NULL, PesoGramosReal = NULL, ValorPesoReal = NULL WHERE IdOrden = @Id AND IdSeguimiento = @S;
                UPDATE C_Seguimientos SET IdEstado = 3 WHERE IdSeguimiento = @S;
                UPDATE C_DetallePedido SET PeroCobradoReal = NULL, ValorCobradoReal = NULL WHERE IdSeguimiento = @S;`);
        }
        // tocar las entradas que quedan en la orden para que los triggers recalculen el reparto
        await new sql.Request(tx).input('Id', sql.Int, id).query('UPDATE C_EntradasCasillero SET IdOrden = IdOrden WHERE IdOrden = @Id');
        await tx.commit();
        res.json({ ok: true, mensaje: 'Orden actualizada.' });
    } catch (err) {
        try { await tx.rollback(); } catch (_) {}
        res.status(500).json({ ok: false, error: err.message });
    }
};

module.exports = {
    getTrackingsOrden,
    editarOrden,
    getDetalleArticulo,
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
