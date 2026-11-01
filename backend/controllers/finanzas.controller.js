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
           C.Observaciones, C.IdCuentaBancaria, CB.NombreCuenta AS Cuenta, C.IdVendedor, ${nombre('V.Nombres', 'V.Apellidos')} AS Vendedor
    FROM C_Combustible C
    LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = C.IdCuentaBancaria
    LEFT JOIN A_Vendedores V ON V.IdVendedor = C.IdVendedor`,
  otros: `
    SELECT OG.IdOtrosGastos, OG.NombreGasto, ${F('OG.Fecha')} AS Fecha, ISNULL(OG.Monto, 0) AS Monto, OG.Observaciones,
           OG.Empresa, OG.Referencia, OG.IdCuentaBancaria, CB.NombreCuenta AS Cuenta
    FROM A_OtrosGastos OG LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = OG.IdCuentaBancaria`,
  transacciones: `
    SELECT T.IdTransaccion, ${F('T.Fecha')} AS Fecha, ISNULL(T.Valor, 0) AS Valor, T.Observaciones,
           CP.NombreCuenta AS CuentaPorPagar, CB.NombreCuenta AS Cuenta, ${nombre('V.Nombres', 'V.Apellidos')} AS Vendedor
    FROM A_Transacciones T
    LEFT JOIN A_CuentasPorPagar CP ON CP.IdCuentasPorPagar = T.IdCuentaPorPagar
    LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = T.IdCuentaBancaria
    LEFT JOIN A_Vendedores V ON V.IdVendedor = T.IdVendedor`,
  capital: `
    SELECT K.IdCapital, ${F('K.Fecha')} AS Fecha, ISNULL(K.Valor, 0) AS Valor, K.Referencia, K.IdVendedor, K.IdCuentaBanco, K.IdMetodoPago,
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
           , ISNULL(T.TotalCompra, 0) AS TotalCompra, ISNULL(T.Lineas, 0) AS Lineas
    FROM C_Pedidos P LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
    LEFT JOIN (SELECT IdPedido, SUM(TotalCompra) AS TotalCompra, COUNT(*) AS Lineas FROM C_DetallePedido GROUP BY IdPedido) T ON T.IdPedido = P.IdPedido`,
  vendedores: `SELECT IdVendedor, ${nombre('Nombres', 'Apellidos')} AS Nombre FROM A_Vendedores ORDER BY Nombres`,
  cuentas: `SELECT IdCuentaBanco, NombreCuenta, Banco FROM A_CuentaBanco ORDER BY NombreCuenta`,
  metodos: `SELECT IdMetodoPago, Metodo FROM A_MetodosPagos ORDER BY Metodo`
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

// ── Registros ──
const txt = v => (v == null ? null : String(v).trim() || null);
const fecha = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null);

// Nuevo gasto (usa el procedimiento existente)
async function crearGasto(req, res) {
  try {
    const b = req.body || {};
    const monto = parseFloat(b.monto);
    if (!txt(b.concepto) || !fecha(b.fecha) || !(monto > 0)) return res.status(400).json({ ok: false, error: 'Fecha, concepto y monto son obligatorios' });
    const pool = await poolPromise;
    await pool.request()
      .input('NombreGasto', sql.NVarChar(sql.MAX), txt(b.concepto))
      .input('Fecha', sql.Date, b.fecha)
      .input('Monto', sql.Decimal(18, 2), monto)
      .input('Observaciones', sql.NVarChar(sql.MAX), txt(b.observaciones))
      .input('IdCuentaBancaria', sql.Int, parseInt(b.idCuenta) || null)
      .input('Empresa', sql.NVarChar(sql.MAX), txt(b.empresa) || 'TODOS')
      .input('Referencia', sql.VarChar(sql.MAX), txt(b.referencia))
      .execute('In_OtrosGastos');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

// Corregir un gasto
async function editarGasto(req, res) {
  try {
    const b = req.body || {}, id = parseInt(b.id), monto = parseFloat(b.monto);
    if (!id || !txt(b.concepto) || !fecha(b.fecha) || !(monto > 0)) return res.status(400).json({ ok: false, error: 'Fecha, concepto y monto son obligatorios' });
    const pool = await poolPromise;
    await pool.request().input('Id', sql.Int, id)
      .input('NombreGasto', sql.NVarChar(sql.MAX), txt(b.concepto)).input('Fecha', sql.Date, b.fecha)
      .input('Monto', sql.Decimal(18, 2), monto).input('Observaciones', sql.NVarChar(sql.MAX), txt(b.observaciones))
      .input('IdCuenta', sql.Int, parseInt(b.idCuenta) || null).input('Empresa', sql.NVarChar(sql.MAX), txt(b.empresa) || 'TODOS')
      .input('Referencia', sql.NVarChar(sql.MAX), txt(b.referencia))
      .query(`UPDATE A_OtrosGastos SET NombreGasto = @NombreGasto, Fecha = @Fecha, Monto = @Monto, Observaciones = @Observaciones,
              IdCuentaBancaria = @IdCuenta, Empresa = @Empresa, Referencia = @Referencia WHERE IdOtrosGastos = @Id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

// Combustible de una fecha de órdenes: monto, persona, pagado y cuenta
async function editarCombustible(req, res) {
  try {
    const b = req.body || {}, id = parseInt(b.id), monto = parseFloat(b.monto);
    if (!id || !(monto >= 0)) return res.status(400).json({ ok: false, error: 'Monto no válido' });
    const pagado = !!b.pagado, cuenta = parseInt(b.idCuenta) || null;
    if (pagado && !cuenta) return res.status(400).json({ ok: false, error: 'Elegí la cuenta de donde se pagó' });
    const pool = await poolPromise;
    await pool.request().input('Id', sql.Int, id).input('Monto', sql.Decimal(18, 2), monto)
      .input('Vend', sql.Int, parseInt(b.idVendedor) || null).input('Obs', sql.NVarChar(sql.MAX), txt(b.observaciones))
      .input('Pagado', sql.Bit, pagado).input('Cuenta', sql.Int, pagado ? cuenta : null)
      .query(`UPDATE C_Combustible SET CantidadPagar = @Monto, IdVendedor = @Vend, Observaciones = @Obs,
              EstaCancelado = @Pagado, IdCuentaBancaria = @Cuenta WHERE IdCombustible = @Id`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

// Puntos usados en un pedido (valor total en dólares)
async function editarPuntos(req, res) {
  try {
    const b = req.body || {}, id = parseInt(b.idPedido), pts = parseFloat(b.puntos) || 0, val = parseFloat(b.valorDolares) || 0;
    if (!id || pts < 0 || val < 0) return res.status(400).json({ ok: false, error: 'Datos no válidos' });
    const pool = await poolPromise;
    await pool.request().input('Id', sql.Int, id).input('Pts', sql.Decimal(18, 2), pts).input('Val', sql.Decimal(18, 2), val)
      .query('UPDATE C_Pedidos SET PuntosUtilizados = @Pts, ValorDolaresPuntos = @Val WHERE IdPedido = @Id');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

// Aporte de capital de un socio (nuevo o corrección)
async function guardarCapital(req, res) {
  try {
    const b = req.body || {}, id = parseInt(b.id) || null, valor = parseFloat(b.valor);
    if (!fecha(b.fecha) || !(valor > 0) || !parseInt(b.idSocio) || !parseInt(b.idCuenta))
      return res.status(400).json({ ok: false, error: 'Fecha, socio, cuenta y monto son obligatorios' });
    const pool = await poolPromise;
    const r = pool.request().input('Fecha', sql.Date, b.fecha).input('Valor', sql.Decimal(18, 2), valor)
      .input('Socio', sql.Int, parseInt(b.idSocio)).input('Cuenta', sql.Int, parseInt(b.idCuenta))
      .input('Metodo', sql.Int, parseInt(b.idMetodo) || null).input('Ref', sql.NVarChar(50), (txt(b.referencia) || '').substring(0, 50) || null);
    if (id) await r.input('Id', sql.Int, id).query(`UPDATE A_Capital SET Fecha = @Fecha, Valor = @Valor, IdVendedor = @Socio, IdCuentaBanco = @Cuenta,
            IdMetodoPago = @Metodo, Referencia = @Ref WHERE IdCapital = @Id`);
    else await r.query(`
      IF COLUMNPROPERTY(OBJECT_ID('dbo.A_Capital'), 'IdCapital', 'IsIdentity') = 1
        INSERT INTO A_Capital (IdCuentaBanco, Valor, IdMetodoPago, IdVendedor, Referencia, Fecha) VALUES (@Cuenta, @Valor, @Metodo, @Socio, @Ref, @Fecha)
      ELSE
        INSERT INTO A_Capital (IdCapital, IdCuentaBanco, Valor, IdMetodoPago, IdVendedor, Referencia, Fecha)
        SELECT ISNULL(MAX(IdCapital), 0) + 1, @Cuenta, @Valor, @Metodo, @Socio, @Ref, @Fecha FROM A_Capital WITH (UPDLOCK, HOLDLOCK)`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

module.exports = { getDatos, getBancos, crearGasto, editarGasto, editarCombustible, editarPuntos, guardarCapital };
