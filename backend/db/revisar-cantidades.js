// Revisa las líneas con cantidad > 1 para saber si el costo y el peso se guardaron
// por unidad o por el total de la línea. Solo hace SELECT: no cambia nada.
// No incluye nombres de clientes. Uso (desde backend):  node db/revisar-cantidades.js
const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./connection');

(async () => {
  const pool = await poolPromise;
  // Línea por línea, con el subtotal que cobró la tienda en ese pedido
  const lineas = (await pool.request().query(`
    SELECT D.IdDetallePedido, D.IdPedido, CONVERT(varchar(10), P.FechaPedido, 23) AS Fecha,
           RTRIM(P.NumeroPedido) AS NumeroPedido, E.NombreEmpresa AS Tienda,
           A.NombreArticulo, D.CantidadArticulos AS Cant, D.ValorCompra, D.ValorCompraLempiras,
           P.TasaCambio, D.Peso, A.PesoArticulo, D.ValorCobroCliente
    FROM C_DetallePedido D
    JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
    LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
    LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo
    WHERE D.CantidadArticulos > 1
    ORDER BY D.IdDetallePedido DESC`)).recordset;

  // Por pedido: ¿el subtotal de la tienda cuadra sumando "por línea" o "por unidad × cantidad"?
  const pedidos = (await pool.request().query(`
    SELECT P.IdPedido, RTRIM(P.NumeroPedido) AS NumeroPedido, P.VSubTotalArticulos, P.VTotalPedido,
           P.VDescuentos, P.VImpuesto, P.VEnvio,
           SUM(D.ValorCompra) AS SumaComoTotal,
           SUM(D.ValorCompra * D.CantidadArticulos) AS SumaComoUnitario,
           COUNT(*) AS Lineas
    FROM C_Pedidos P
    JOIN C_DetallePedido D ON D.IdPedido = P.IdPedido
    WHERE P.IdPedido IN (SELECT IdPedido FROM C_DetallePedido WHERE CantidadArticulos > 1)
    GROUP BY P.IdPedido, P.NumeroPedido, P.VSubTotalArticulos, P.VTotalPedido, P.VDescuentos, P.VImpuesto, P.VEnvio
    ORDER BY P.IdPedido DESC`)).recordset;

  // Cuántas veces la tasa guardada en lempiras no coincide con la del pedido
  const tasa = (await pool.request().query(`
    SELECT COUNT(*) AS Lineas,
           SUM(CASE WHEN ABS(D.ValorCompraLempiras - D.ValorCompra * P.TasaCambio) > 1 THEN 1 ELSE 0 END) AS LempirasNoCuadran
    FROM C_DetallePedido D JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
    WHERE P.TasaCambio IS NOT NULL AND D.ValorCompra IS NOT NULL`)).recordset[0];

  const out = { generado: new Date().toISOString(), lineas, pedidos, tasa };
  const archivo = path.join(__dirname, 'revision-cantidades.json');
  fs.writeFileSync(archivo, JSON.stringify(out, null, 1), 'utf8');
  console.log(`Listo: ${archivo}  (${lineas.length} líneas, ${pedidos.length} pedidos)`);
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
