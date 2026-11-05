// ═══════════════════════════════════════════════════════════════════════════
// TRAZABILIDAD — todo lo que sabemos de cada artículo, en una sola consulta:
// pedido, cliente, vendedor, costo, tracking, casillero, orden de pago, entrega.
// El vendedor solo ve sus artículos y sin costos; el administrador ve todo.
// ═══════════════════════════════════════════════════════════════════════════
const { sql, poolPromise } = require('../db/connection');

const F = c => `CONVERT(varchar(10), ${c}, 23)`;
const nom = (n, a) => `NULLIF(LTRIM(RTRIM(CONCAT(${n}, ' ', ${a}))), '')`;
const COSTOS = ['ValorCompra', 'CostoUSD', 'CostoL', 'TasaCambio', 'EnvioReal', 'PesoRealG'];

async function hayColumna(pool, c) {
  const r = await pool.request().query(`SELECT COL_LENGTH('dbo.C_DetallePedido', '${c}') AS L`);
  return r.recordset[0].L != null;
}

async function listar(req, res) {
  try {
    const pool = await poolPromise;
    const admin = !!(req.usuario && req.usuario.esAdmin);
    const nl = await hayColumna(pool, 'NoLlego');
    const r = pool.request();
    if (!admin) r.input('V', sql.Int, req.usuario.id);
    const q = `
      SELECT D.IdDetallePedido, D.IdPedido, ${F('P.FechaPedido')} AS Fecha, RTRIM(P.NumeroPedido) AS NumeroPedido, D.NoPedidoAplicacion,
             E.NombreEmpresa AS Tienda, CA.NombreCasillero AS Casillero,
             A.NombreArticulo, CAT.CategoriaProducto AS Categoria, D.DescripcionArticulo AS Descripcion, D.TallaColor,
             RTRIM(D.CodigoArticulo) AS SKU, ISNULL(D.CantidadArticulos, 1) AS Cant, D.Fotografia, D.Link,
             D.IdCliente, ${nom('C.Nombre', 'C.Apellido')} AS Cliente, C.CodigoCliente, C.Telefeno AS Telefono,
             D.IdVendedor, ${nom('V.Nombres', 'V.Apellidos')} AS Vendedor, V.CodigoVendedor,
             D.ValorCompra, ISNULL(D.TotalCompra, 0) AS CostoUSD, ISNULL(D.TotalCompraLempiras, 0) AS CostoL, P.TasaCambio,
             D.Peso, ISNULL(D.PesoTotal, 0) AS PesoTotal, ISNULL(D.ValorCobroCliente, 0) AS Venta,
             D.IdSeguimiento, RTRIM(S.Seguimiento) AS Seguimiento, S.CambioSeguimiento, ${F('S.FechaSalidaInicio')} AS Salida,
             ${F('S.FechaEstimadaEntrega')} AS EntregaEstimada, EP.EstadoPaquetes AS EstadoTracking,
             ${F('EC.EntradaMiami')} AS EntradaCasillero, EC.IdOrden, RTRIM(OE.NumeroOrden) AS NumeroOrden, ${F('OE.Fecha')} AS FechaOrden,
             D.ValorCobradoReal AS EnvioReal, D.PeroCobradoReal AS PesoRealG,
             ISNULL(D.EstaEntregado, 0) AS Entregado, ISNULL(D.SeFueInventario, 0) AS Inventario
             ${nl ? `, ISNULL(D.NoLlego, 0) AS NoLlego, ${F('D.FechaNoLlego')} AS FechaNoLlego, D.MotivoNoLlego, ISNULL(D.ReembolsoNoLlego, 0) AS Reembolso` : ''}
      FROM C_DetallePedido D
      JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
      LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
      LEFT JOIN A_Casilleros CA ON CA.IdCasillero = P.IdCasillero
      LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo
      LEFT JOIN A_Categorias CAT ON CAT.IdCategoria = A.IdCategoria
      LEFT JOIN C_Clientes C ON C.IdCliente = D.IdCliente
      LEFT JOIN A_Vendedores V ON V.IdVendedor = D.IdVendedor
      LEFT JOIN C_Seguimientos S ON S.IdSeguimiento = D.IdSeguimiento
      LEFT JOIN A_EstadoPaquetes EP ON EP.IdEstado = S.IdEstado
      OUTER APPLY (SELECT TOP 1 X.EntradaMiami, X.IdOrden FROM C_EntradasCasillero X
                   WHERE X.IdSeguimiento = D.IdSeguimiento ORDER BY CASE WHEN X.IdOrden IS NULL THEN 1 ELSE 0 END, X.IdEntradaCasillero DESC) EC
      LEFT JOIN C_OrdenesEntrega OE ON OE.IdOrden = EC.IdOrden
      ${admin ? '' : 'WHERE D.IdVendedor = @V'}
      ORDER BY P.FechaPedido DESC, D.IdDetallePedido DESC`;
    let data = (await r.query(q)).recordset;
    if (!admin) data = data.map(x => { COSTOS.forEach(k => delete x[k]); return x; });
    res.json({ ok: true, admin, data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

// Historial de cambios de un artículo (precio, cliente, vendedor…)
async function historial(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Falta el artículo' });
    const pool = await poolPromise;
    const admin = !!(req.usuario && req.usuario.esAdmin);
    if (!admin) {
      const v = await pool.request().input('Id', sql.Int, id).query('SELECT IdVendedor FROM C_DetallePedido WHERE IdDetallePedido = @Id');
      if (!v.recordset[0] || v.recordset[0].IdVendedor !== req.usuario.id) return res.status(403).json({ ok: false, error: 'Sin permiso' });
    }
    let cambios = [];
    try {
      cambios = (await pool.request().input('Id', sql.Int, id).query(`
        SELECT CONVERT(varchar(16), B.Fecha, 120) AS Fecha, B.Campo, B.ValorAnterior, B.ValorNuevo, ${nom('V.Nombres', 'V.Apellidos')} AS Usuario
        FROM C_BitacoraCambios B LEFT JOIN A_Vendedores V ON V.IdVendedor = B.IdUsuario
        WHERE B.IdDetallePedido = @Id ORDER BY B.Fecha DESC`)).recordset;
    } catch (e) { /* la bitácora puede no existir todavía */ }
    res.json({ ok: true, cambios });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

// Utilidad de un artículo con lo que se sabe: costo, envío real (o estimado) y combustible (solo administrador)
async function costos(req, res) {
  try {
    if (!(req.usuario && req.usuario.esAdmin)) return res.status(403).json({ ok: false, error: 'Solo el administrador' });
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    const r = await pool.request().input('Id', sql.Int, id).query(`
      SELECT ISNULL(D.TotalCompraLempiras, 0) AS CostoL, ISNULL(D.ValorCobroCliente, 0) AS Venta,
             EC.IdOrden, ISNULL(D.ValorCobradoReal, 0) AS EnvioReal,
             CAST(ISNULL(D.PesoTotal, 0) / 454.0 * ISNULL(CA.PrecioLibra, 0) AS decimal(18,2)) AS EnvioEstimado,
             CAST(ISNULL(CO.CantidadPagar, 0) * ISNULL(D.PeroCobradoReal, 0) / NULLIF((
                 SELECT SUM(ISNULL(D2.PeroCobradoReal, 0)) FROM C_DetallePedido D2
                 JOIN C_EntradasCasillero E2 ON E2.IdSeguimiento = D2.IdSeguimiento
                 JOIN C_OrdenesEntrega O2 ON O2.IdOrden = E2.IdOrden
                 WHERE O2.IdCombustible = OE.IdCombustible), 0) AS decimal(18,2)) AS Combustible
      FROM C_DetallePedido D
      JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
      LEFT JOIN A_Casilleros CA ON CA.IdCasillero = P.IdCasillero
      OUTER APPLY (SELECT TOP 1 X.IdOrden FROM C_EntradasCasillero X WHERE X.IdSeguimiento = D.IdSeguimiento AND X.IdOrden IS NOT NULL ORDER BY X.IdEntradaCasillero DESC) EC
      LEFT JOIN C_OrdenesEntrega OE ON OE.IdOrden = EC.IdOrden
      LEFT JOIN C_Combustible CO ON CO.IdCombustible = OE.IdCombustible
      WHERE D.IdDetallePedido = @Id`);
    res.json({ ok: true, data: r.recordset[0] || null });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
}

module.exports = { listar, historial, costos };
