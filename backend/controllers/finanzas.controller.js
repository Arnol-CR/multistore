// ═══════════════════════════════════════════════════════════════════════════
// FINANZAS (solo administrador) — solo lectura
// Devuelve los datos crudos; los repartos (envío real y combustible) y los
// totales los calcula la página para poder filtrar por fechas sin ir y volver.
// ═══════════════════════════════════════════════════════════════════════════
const { sql, poolPromise } = require('../db/connection');

const F = c => `CONVERT(varchar(10), ${c}, 23)`;
const nombre = (n, a) => `LTRIM(RTRIM(CONCAT(${n}, ' ', ${a})))`;

const CONSULTAS = {
  lineas: `
    SELECT D.IdDetallePedido, D.IdPedido, ${F('P.FechaPedido')} AS Fecha, RTRIM(P.NumeroPedido) AS NumeroPedido,
           E.NombreEmpresa AS Tienda, A.NombreArticulo, D.TallaColor, D.CantidadArticulos AS Cant, D.Fotografia,
           D.IdCliente, ${nombre('C.Nombre', 'C.Apellido')} AS Cliente,
           D.IdVendedor, ${nombre('V.Nombres', 'V.Apellidos')} AS Vendedor,
           ISNULL(D.ValorCobroCliente, 0) AS Venta, ISNULL(D.TotalCompraLempiras, 0) AS CostoCompra,
           ISNULL(D.TotalCompra, 0) AS CostoUSD, P.TasaCambio, ISNULL(D.PesoTotal, 0) AS PesoTotal,
           CAST(ISNULL(D.PesoTotal, 0) / 454.0 * ISNULL(CA.PrecioLibra, 0) AS decimal(18,2)) AS EnvioEstimado,
           D.ValorCobradoReal AS EnvioRealGuardado, D.IdSeguimiento, RTRIM(S.Seguimiento) AS Seguimiento,
           S.IdEstado, ISNULL(D.EstaEntregado, 0) AS Entregado
    FROM C_DetallePedido D
    JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
    LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
    LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo
    LEFT JOIN C_Clientes C ON C.IdCliente = D.IdCliente
    LEFT JOIN A_Vendedores V ON V.IdVendedor = D.IdVendedor
    LEFT JOIN C_Seguimientos S ON S.IdSeguimiento = D.IdSeguimiento
    LEFT JOIN A_Casilleros CA ON CA.IdEmpresa = P.IdCasillero`,
  ordenes: `
    SELECT OE.IdOrden, RTRIM(OE.NumeroOrden) AS NumeroOrden, ${F('OE.Fecha')} AS Fecha, ISNULL(OE.CantidadPagada, 0) AS Pagado,
           ISNULL(OE.Peso, 0) AS PesoLb, OE.IdCombustible, CB.NombreCuenta AS Cuenta
    FROM C_OrdenesEntrega OE LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = OE.IdCuenta`,
  entradas: `
    SELECT EC.IdEntradaCasillero, EC.IdOrden, EC.IdSeguimiento, RTRIM(S.Seguimiento) AS Seguimiento,
           ISNULL(EC.PesoGramosCobrado, 0) AS PesoCobrado, ISNULL(EC.PesoGramosReal, 0) AS PesoReal,
           ISNULL(EC.ValorPesoCobrado, 0) AS ValorCobrado, ISNULL(EC.ValorPesoReal, 0) AS ValorReal,
           ${F('EC.EntradaMiami')} AS EntradaMiami, CA.NombreCasillero AS Casillero
    FROM C_EntradasCasillero EC
    LEFT JOIN C_Seguimientos S ON S.IdSeguimiento = EC.IdSeguimiento
    LEFT JOIN A_Casilleros CA ON CA.IdCasillero = EC.IdCasillero`,
  combustible: `
    SELECT C.IdCombustible, ${F('C.Fecha')} AS Fecha, ISNULL(C.CantidadPagar, 0) AS Monto, ISNULL(C.EstaCancelado, 0) AS Cancelado,
           C.Observaciones, CB.NombreCuenta AS Cuenta, C.IdVendedor, ${nombre('V.Nombres', 'V.Apellidos')} AS Vendedor
    FROM C_Combustible C
    LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = C.IdCuentaBancaria
    LEFT JOIN A_Vendedores V ON V.IdVendedor = C.IdVendedor`,
  otros: `
    SELECT OG.IdOtrosGastos, OG.NombreGasto, ${F('OG.Fecha')} AS Fecha, ISNULL(OG.Monto, 0) AS Monto, OG.Observaciones,
           OG.Empresa, OG.Referencia, CB.NombreCuenta AS Cuenta
    FROM A_OtrosGastos OG LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = OG.IdCuentaBancaria`,
  transacciones: `
    SELECT T.IdTransaccion, ${F('T.Fecha')} AS Fecha, ISNULL(T.Valor, 0) AS Valor, T.Observaciones,
           CP.NombreCuenta AS CuentaPorPagar, CB.NombreCuenta AS Cuenta, ${nombre('V.Nombres', 'V.Apellidos')} AS Vendedor
    FROM A_Transacciones T
    LEFT JOIN A_CuentasPorPagar CP ON CP.IdCuentasPorPagar = T.IdCuentaPorPagar
    LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = T.IdCuentaBancaria
    LEFT JOIN A_Vendedores V ON V.IdVendedor = T.IdVendedor`,
  capital: `
    SELECT K.IdCapital, ${F('K.Fecha')} AS Fecha, ISNULL(K.Valor, 0) AS Valor, K.Referencia, K.IdVendedor,
           ${nombre('V.Nombres', 'V.Apellidos')} AS Socio, MP.Metodo, CB.NombreCuenta AS Cuenta
    FROM A_Capital K
    LEFT JOIN A_Vendedores V ON V.IdVendedor = K.IdVendedor
    LEFT JOIN A_MetodosPagos MP ON MP.IdMetodoPago = K.IdMetodoPago
    LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = K.IdCuentaBanco`,
  movimientos: `
    SELECT M.IdMovimientoCuenta, ${F('M.Fecha')} AS Fecha, ISNULL(M.Valor, 0) AS Valor, M.Observaciones, M.NumeroReferencia,
           CB.NombreCuenta AS Cuenta
    FROM A_MoviminentoCuenta M LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = M.IdCuenta`,
  cobros: `SELECT ${F('FechaMovimiento')} AS Fecha, Monto FROM vw_Pagos`,
  puntos: `
    SELECT P.IdPedido, P.IdEmpresa, RTRIM(P.NumeroPedido) AS NumeroPedido, ${F('P.FechaPedido')} AS Fecha, E.NombreEmpresa AS Tienda,
           ISNULL(P.PuntosUtilizados, 0) AS Puntos, ISNULL(P.ValorDolaresPuntos, 0) AS ValorPunto, P.TasaCambio
    FROM C_Pedidos P LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
    WHERE ISNULL(P.PuntosUtilizados, 0) <> 0 OR ISNULL(P.ValorDolaresPuntos, 0) <> 0`
};

async function getDatos(req, res) {
  const out = { ok: true, avisos: [] };
  try {
    const pool = await poolPromise;
    await Promise.all(Object.entries(CONSULTAS).map(async ([k, q]) => {
      try { out[k] = (await pool.request().query(q)).recordset; }
      catch (e) { out[k] = []; out.avisos.push(`${k}: ${e.message}`); }
    }));
    res.json(out);
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
}

// Resumen por cuenta bancaria (usa el procedimiento existente)
async function getBancos(req, res) {
  try {
    const pool = await poolPromise;
    const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const r = await pool.request()
      .input('FechaInicio', sql.Date, d(req.query.desde) || '2000-01-01')
      .input('FechaFin', sql.Date, d(req.query.hasta) || new Date())
      .execute('Se_ResumenCuentaBancos');
    res.json({ ok: true, data: r.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
}

module.exports = { getDatos, getBancos };
