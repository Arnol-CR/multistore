// ═══════════════════════════════════════════════════════════════════════════
// MIGRACIÓN: costo y peso POR UNIDAD en C_DetallePedido
//
//   node db/migrar-unidades.js --probar     Hace todo en una transacción, muestra
//                                           el antes/después y lo DESHACE. No guarda nada.
//   node db/migrar-unidades.js --aplicar    Igual, pero guarda (COMMIT). Crea respaldo antes.
//   node db/migrar-unidades.js --deshacer   Vuelve todo como estaba usando el respaldo.
//
// Regla nueva:
//   ValorCompra, ValorCompraLempiras y Peso  = por UNIDAD
//   TotalCompra, TotalCompraLempiras, PesoTotal = cantidad × unidad (columnas calculadas)
//   ValorCobroCliente = lo que paga el cliente por la línea (no cambia)
//   PrecioUnitarioVenta = ValorCobroCliente ÷ cantidad (columna calculada)
// ═══════════════════════════════════════════════════════════════════════════
const path = require('path');
const { sql, poolPromise } = require('./connection');
const OBJ = require('./migrar-unidades.objetos.json');

const RESPALDO = 'C_DetallePedido_Respaldo_20261101';
const RESPALDO_OBJ = 'Z_RespaldoObjetos_20261101';
// Líneas cuyo costo se guardó como total de la línea (se divide entre la cantidad)
const COSTO = [1320,1310,1303,1299,1291,1270,1266,1085,1084,974,801,778,735,670,653,582,562,386,292,291,250,219,215,210];
// Líneas cuyo peso se guardó como total de la línea
const PESO = [...COSTO, 1340];
// Valores esperados ANTES (si no coinciden, se cancela: evita aplicar dos veces)
const ESPERADO = {1340:[2.70,180],1320:[16.95,120],1310:[1.78,125],1303:[2.56,100],1299:[21.68,200],1291:[3.42,35],1270:[1.98,45],1266:[5.40,120],1085:[1.94,40],1084:[1.94,40],974:[2.86,50],801:[6.98,100],778:[7.38,50],735:[2.90,100],670:[3.21,75],653:[4.64,60],582:[1.50,80],562:[29.48,160],386:[6.91,80],292:[4.26,280],291:[9.14,220],250:[4.29,240],219:[15.56,500],215:[5.37,300],210:[5.03,100]};
const VER = [...new Set([...PESO, 1607, 1606, 1585, 1481, 1399])];

const ORDEN = ['ListadoPedido','ListadoPedidoCliente','ListadoPedidoCosto','ListadoPedidoCostoTodos','vw_OrdenesEntradas',
  'Se_DetallePedidoReporte','Se_PedidoCliente','Se_PedidoCliente&Vendedor','SP_PedidosRecientes','SP_TodosLosPedidos',
  'Se_EntradaCasillero','Se_OrdenesEntradas','Up_ValorCantidadTotalPedido','Se_PedidosDataGeneral','ResumenPedidosPorEmpresa',
  'InsertarPuntosPorFechaEmpresa','In_DetallePedido','Se_DetallePedido','trg_CalculateAndAdjustPesoAndValor','trg_UpdateDetallePedido'];

const modo = process.argv[2];
const L = n => n == null ? '—' : Number(n).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function foto(tx) {
  const r = await new sql.Request(tx).input('IdVendedor', sql.Int, 1).input('EsAdmin', sql.Bit, 1).execute('SP_TodosLosPedidos');
  const m = new Map(r.recordset.filter(x => VER.includes(x.IdDetallePedido)).map(x => [x.IdDetallePedido, x]));
  const d = (await new sql.Request(tx).query(`SELECT IdDetallePedido, CantidadArticulos, ValorCompra, Peso FROM C_DetallePedido WHERE IdDetallePedido IN (${VER.join(',')})`)).recordset;
  return new Map(d.map(x => [x.IdDetallePedido, { ...x, sug: m.get(x.IdDetallePedido)?.PrecioSugerido, costo: m.get(x.IdDetallePedido)?.Costo, art: m.get(x.IdDetallePedido)?.NombreArticulo }]));
}

async function lote(tx, texto) { await new sql.Request(tx).batch(texto); }

async function migrar(tx) {
  // 0) Verificaciones previas
  const ya = (await new sql.Request(tx).query(`SELECT COL_LENGTH('dbo.C_DetallePedido','TotalCompra') AS c, OBJECT_ID('dbo.${RESPALDO}') AS r`)).recordset[0];
  if (ya.c || ya.r) throw new Error('La migración ya se aplicó (existe TotalCompra o la tabla de respaldo). No se hizo nada.');
  const act = (await new sql.Request(tx).query(`SELECT IdDetallePedido, ValorCompra, Peso, CantidadArticulos FROM C_DetallePedido WHERE IdDetallePedido IN (${Object.keys(ESPERADO).join(',')})`)).recordset;
  for (const a of act) {
    const [vc, p] = ESPERADO[a.IdDetallePedido];
    if (Math.abs(a.ValorCompra - vc) > 0.001 || Math.abs(a.Peso - p) > 0.001 || a.CantidadArticulos < 2)
      throw new Error(`La línea ${a.IdDetallePedido} cambió desde la revisión (costo ${a.ValorCompra}, peso ${a.Peso}). No se hizo nada.`);
  }
  if (act.length !== Object.keys(ESPERADO).length) throw new Error('Faltan líneas esperadas. No se hizo nada.');

  // 1) Respaldo de la tabla y de los objetos que se modifican
  await lote(tx, `SELECT * INTO dbo.${RESPALDO} FROM dbo.C_DetallePedido`);
  await lote(tx, `CREATE TABLE dbo.${RESPALDO_OBJ} (Objeto nvarchar(200) PRIMARY KEY, Definicion nvarchar(max))`);
  for (const n of ORDEN) await new sql.Request(tx).input('o', sql.NVarChar, n).input('d', sql.NVarChar(sql.MAX), OBJ[n].original)
    .query(`INSERT INTO dbo.${RESPALDO_OBJ} (Objeto, Definicion) VALUES (@o, @d)`);

  // 2) Corregir las líneas guardadas como total
  const r1 = await new sql.Request(tx).query(`UPDATE C_DetallePedido SET ValorCompra = ROUND(ValorCompra / CantidadArticulos, 2),
      ValorCompraLempiras = ROUND(ValorCompraLempiras / CantidadArticulos, 2) WHERE IdDetallePedido IN (${COSTO.join(',')})`);
  const r2 = await new sql.Request(tx).query(`UPDATE C_DetallePedido SET Peso = ROUND(Peso / CantidadArticulos, 2) WHERE IdDetallePedido IN (${PESO.join(',')})`);
  // 3) Lempiras con la tasa real del pedido (antes se usaba 26 o 27 fijo)
  const r3 = await new sql.Request(tx).query(`UPDATE D SET D.ValorCompraLempiras = ROUND(D.ValorCompra * P.TasaCambio, 2)
      FROM C_DetallePedido D JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
      WHERE P.TasaCambio IS NOT NULL AND D.ValorCompra IS NOT NULL AND ABS(D.ValorCompraLempiras - D.ValorCompra * P.TasaCambio) > 1`);

  // 4) Columnas calculadas
  await lote(tx, `ALTER TABLE dbo.C_DetallePedido ADD
      TotalCompra         AS (CAST(ValorCompra * CantidadArticulos AS decimal(18,2))),
      TotalCompraLempiras AS (CAST(ValorCompraLempiras * CantidadArticulos AS decimal(18,2))),
      PesoTotal           AS (CAST(Peso * CantidadArticulos AS decimal(18,2))),
      PrecioUnitarioVenta AS (CAST(ValorCobroCliente / NULLIF(CantidadArticulos, 0) AS decimal(18,2)))`);

  // 5) Vistas, procedimientos y triggers con la regla nueva
  for (const n of ORDEN) await lote(tx, OBJ[n].nuevo);
  return { costo: r1.rowsAffected[0], peso: r2.rowsAffected[0], tasa: r3.rowsAffected[0] };
}

async function deshacer(tx) {
  const ex = (await new sql.Request(tx).query(`SELECT OBJECT_ID('dbo.${RESPALDO}') AS r, OBJECT_ID('dbo.${RESPALDO_OBJ}') AS o`)).recordset[0];
  if (!ex.r || !ex.o) throw new Error('No encuentro las tablas de respaldo. No se hizo nada.');
  const defs = (await new sql.Request(tx).query(`SELECT Objeto, Definicion FROM dbo.${RESPALDO_OBJ}`)).recordset;
  for (const d of defs) await lote(tx, d.Definicion);   // vuelven las definiciones originales
  await lote(tx, `ALTER TABLE dbo.C_DetallePedido DROP COLUMN TotalCompra, TotalCompraLempiras, PesoTotal, PrecioUnitarioVenta`);
  const r = await new sql.Request(tx).query(`UPDATE D SET D.ValorCompra = R.ValorCompra, D.ValorCompraLempiras = R.ValorCompraLempiras, D.Peso = R.Peso
      FROM C_DetallePedido D JOIN dbo.${RESPALDO} R ON R.IdDetallePedido = D.IdDetallePedido
      WHERE ISNULL(D.ValorCompra,-1) <> ISNULL(R.ValorCompra,-1) OR ISNULL(D.ValorCompraLempiras,-1) <> ISNULL(R.ValorCompraLempiras,-1) OR ISNULL(D.Peso,-1) <> ISNULL(R.Peso,-1)`);
  await lote(tx, `DROP TABLE dbo.${RESPALDO}; DROP TABLE dbo.${RESPALDO_OBJ};`);
  return r.rowsAffected[0];
}

(async () => {
  if (!['--probar', '--aplicar', '--deshacer'].includes(modo)) {
    console.log('Uso: node db/migrar-unidades.js --probar | --aplicar | --deshacer'); process.exit(1);
  }
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    if (modo === '--deshacer') {
      const n = await deshacer(tx);
      await tx.commit();
      console.log(`\nDeshecho. ${n} líneas restauradas, objetos y columnas como estaban.`);
      process.exit(0);
    }
    const antes = await foto(tx);
    const res = await migrar(tx);
    const despues = await foto(tx);

    console.log('\n' + (modo === '--probar' ? 'PRUEBA (no se guarda nada)' : 'APLICANDO'));
    console.log(`Líneas con costo corregido: ${res.costo} · peso corregido: ${res.peso} · lempiras con tasa real: ${res.tasa}`);
    console.log(`Objetos actualizados: ${ORDEN.length}\n`);
    console.log('Id    Cant  Artículo                     Costo $ unit (antes→ahora)   Peso g unit   Sugerido L (antes→ahora)');
    for (const id of VER) {
      const a = antes.get(id), d = despues.get(id); if (!a || !d) continue;
      console.log(`${String(id).padEnd(6)}${String(d.CantidadArticulos).padEnd(6)}${String(d.art || '').substring(0, 28).padEnd(29)}`
        + `${(L(a.ValorCompra) + ' → ' + L(d.ValorCompra)).padEnd(29)}${(L(a.Peso) + ' → ' + L(d.Peso)).padEnd(14)}${L(a.sug)} → ${L(d.sug)}`);
    }
    if (modo === '--probar') { await tx.rollback(); console.log('\nTodo se deshizo. Si se ve bien, corré con --aplicar.'); }
    else { await tx.commit(); console.log(`\nGuardado. Respaldo en ${RESPALDO} y ${RESPALDO_OBJ}. Para volver atrás: --deshacer`); }
    process.exit(0);
  } catch (e) {
    try { await tx.rollback(); } catch (_) {}
    console.error('\nError, no se guardó nada:', e.message);
    process.exit(1);
  }
})();
