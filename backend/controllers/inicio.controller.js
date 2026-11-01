const { sql, poolPromise } = require('../db/connection');

// ─────────────────────────────────────────────────────────────
//  Inicio — KPIs, tendencias y alertas en una sola llamada.
//  Cada bloque va en su propio try/catch: si una tabla o vista
//  no existe, ese bloque queda vacío y el resto sigue funcionando.
// ─────────────────────────────────────────────────────────────

const cacheCols = {};
async function columnas(pool, tabla) {
  if (cacheCols[tabla]) return cacheCols[tabla];
  const r = await pool.request().input('t', sql.NVarChar, tabla)
    .query(`SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(@t)`);
  const set = new Set(r.recordset.map(x => x.name.toLowerCase()));
  const map = new Map(r.recordset.map(x => [x.name.toLowerCase(), x.name]));
  cacheCols[tabla] = { has: n => set.has(n.toLowerCase()), name: n => map.get(n.toLowerCase()), size: set.size };
  return cacheCols[tabla];
}
// Devuelve el primer nombre de columna que exista (solo nombres de esta lista, nunca del usuario)
const elegir = (cols, candidatos) => { for (const c of candidatos) if (cols.has(c)) return cols.name(c); return null; };

const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const claveMes = d => { const f = new Date(d); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`; };
const DIA = 86400000;

const getResumen = async (req, res) => {
  const idUsuario = parseInt(req.query.idVendedor) || 0;
  const out = { ok: true, generado: new Date(), avisos: [] };
  let pool;
  try { pool = await poolPromise; } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  const hoy = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1); meses.push(claveMes(d)); }
  const mesActual = meses[5], mesAnterior = meses[4];
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

  // ── 1. Detalle de pedidos (últimos 6 meses + todo lo no entregado) ──
  let det = [];
  let colVenta = null, colVend = null;
  try {
    const cd = await columnas(pool, 'dbo.C_DetallePedido');
    colVenta = elegir(cd, ['ValorCobroCliente', 'ValorVenta', 'PrecioVenta', 'ValorCobro']);
    colVend  = elegir(cd, ['IdVendedor']);
    const colLink = elegir(cd, ['Link']);
    const r = await pool.request().input('desde', sql.DateTime, desde).query(`
      SELECT D.IdDetallePedido, D.IdPedido, P.FechaPedido, P.TasaCambio,
             ISNULL(D.ValorCompra,0) AS ValorCompra, ISNULL(D.CantidadArticulos,1) AS Cantidad,
             ISNULL(D.EstaEntregado,0) AS Entregado, D.IdCliente,
             ${colVenta ? `ISNULL(D.[${colVenta}],0)` : '0'} AS Venta,
             ${colVend ? `D.[${colVend}]` : 'NULL'} AS IdVendedor,
             ${colLink ? `D.[${colLink}]` : 'NULL'} AS Link,
             E.NombreEmpresa AS Tienda
      FROM C_DetallePedido D
      JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
      LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
      WHERE P.FechaPedido >= @desde OR ISNULL(D.EstaEntregado,0) = 0`);
    det = r.recordset;
    if (!colVenta) out.avisos.push('No encontré la columna de precio de venta en C_DetallePedido.');
  } catch (e) { out.avisos.push('Detalle de pedidos: ' + e.message); }

  // ── 2. Artículos activos con datos de presentación (SP existente, vista de admin) ──
  let act = [];
  try {
    const r = await pool.request().input('IdVendedor', sql.Int, idUsuario).input('EsAdmin', sql.Bit, 1).execute('SP_PedidosRecientes');
    act = r.recordset;
  } catch (e) { out.avisos.push('Pedidos activos: ' + e.message); }

  // ── 3. Pagos de clientes ──
  let pagos = [], pagosPorCliente = null;
  try {
    const cv = await columnas(pool, 'dbo.vw_pagos');
    const colCli = elegir(cv, ['IdCliente']);
    const r = await pool.request().input('desde', sql.DateTime, desde).query(`
      SELECT FechaMovimiento, ISNULL(Monto,0) AS Monto FROM vw_pagos WHERE FechaMovimiento >= @desde`);
    pagos = r.recordset;
    if (colCli) {
      const r2 = await pool.request().query(`SELECT [${colCli}] AS IdCliente, SUM(ISNULL(Monto,0)) AS Pagado FROM vw_pagos GROUP BY [${colCli}]`);
      pagosPorCliente = new Map(r2.recordset.map(x => [x.IdCliente, num(x.Pagado)]));
    }
  } catch (e) { out.avisos.push('Pagos: ' + e.message); }

  // ── 4. Cotizaciones ──
  let cot = null;
  try {
    const ex = await pool.request().query(`SELECT OBJECT_ID('dbo.C_Cotizaciones') AS id`);
    if (ex.recordset[0].id) {
      const r = await pool.request().query(`
        SELECT IdCotizacion, NumeroCotizacion, Fecha, NombreCliente, IdVendedor, TotalLempiras, Estado
        FROM C_Cotizaciones WHERE Fecha >= DATEADD(day,-90,GETDATE()) OR Estado IN ('Borrador','Enviada')`);
      cot = r.recordset;
    }
  } catch (e) { out.avisos.push('Cotizaciones: ' + e.message); }

  // ── 5. Entregados del año (SP existente) ──
  try {
    const r = await pool.request().input('IdVendedor', sql.Int, idUsuario).input('EsAdmin', sql.Bit, 1).execute('SP_DashboardStats');
    out.entregadosAnio = (r.recordset[0] || {}).EntregadosAnio ?? null;
  } catch (e) { out.entregadosAnio = null; }

  // ── 6. Saldos de clientes (vendido − pagado), solo si la vista de pagos trae IdCliente ──
  let saldos = null;
  if (pagosPorCliente && colVenta) {
    try {
      const r = await pool.request().query(`
        SELECT D.IdCliente, SUM(ISNULL(D.[${colVenta}],0)) AS Vendido
        FROM C_DetallePedido D WHERE D.IdCliente IS NOT NULL GROUP BY D.IdCliente`);
      saldos = r.recordset.map(x => ({ IdCliente: x.IdCliente, saldo: num(x.Vendido) - (pagosPorCliente.get(x.IdCliente) || 0) }))
                          .filter(x => x.saldo > 1);
    } catch (e) { out.avisos.push('Saldos: ' + e.message); }
  }

  // ══════════════ Cálculos ══════════════
  const costoL = d => num(d.ValorCompra) * num(d.Cantidad || 1) * num(d.TasaCambio);
  const serie = Object.fromEntries(meses.map(m => [m, { mes: m, ventas: 0, costo: 0, ganancia: 0, compras: 0, cobrado: 0, articulos: 0 }]));
  const vendMes = new Map(), tiendaMes = new Map();
  for (const d of det) {
    const k = claveMes(d.FechaPedido); const s = serie[k]; if (!s) continue;
    const v = num(d.Venta), c = costoL(d);
    s.articulos++; s.compras += c;
    if (v > 0) { s.ventas += v; s.costo += c; s.ganancia += v - c; }
    if (k === mesActual) {
      const t = d.Tienda || 'Otra';
      const ti = tiendaMes.get(t) || { nombre: t, articulos: 0, compras: 0 }; ti.articulos++; ti.compras += c; tiendaMes.set(t, ti);
      if (d.IdVendedor) { const vv = vendMes.get(d.IdVendedor) || { id: d.IdVendedor, ventas: 0, ganancia: 0, articulos: 0 };
        vv.articulos++; if (v > 0) { vv.ventas += v; vv.ganancia += v - c; } vendMes.set(d.IdVendedor, vv); }
    }
  }
  for (const p of pagos) { const s = serie[claveMes(p.FechaMovimiento)]; if (s) s.cobrado += num(p.Monto); }
  out.serie = meses.map(m => serie[m]);
  out.mes = serie[mesActual]; out.mesAnterior = serie[mesAnterior];
  out.tieneVenta = !!colVenta;

  // Activos: combinar el SP (nombres, foto, estado) con el detalle (costo, tasa)
  const detMap = new Map(det.map(d => [d.IdDetallePedido, d]));
  const nombresVend = new Map();
  const items = act.map(p => {
    const d = detMap.get(p.IdDetallePedido) || {};
    if (p.IdVendedor) nombresVend.set(p.IdVendedor, { nombre: p.NombreVendedor, codigo: p.CodigoVendedor });
    const venta = num(p.ValorCobroCliente ?? d.Venta);
    const costo = costoL(d);
    const dias = p.FechaPedido ? Math.floor((hoy - new Date(p.FechaPedido)) / DIA) : 0;
    return {
      IdDetallePedido: p.IdDetallePedido, NombreArticulo: p.NombreArticulo, DescripcionArticulo: p.DescripcionArticulo,
      CodigoArticulo: p.CodigoArticulo, TallaColor: p.TallaColor, Fotografia: p.Fotografia, Link: d.Link || null,
      NumeroPedido: p.NumeroPedido, NoPedidoAplicacion: p.NoPedidoAplicacion, FechaPedido: p.FechaPedido, Tienda: p.NombreEmpresa,
      IdCliente: p.IdCliente, NombreCliente: p.NombreCliente, IdVendedor: p.IdVendedor, NombreVendedor: p.NombreVendedor,
      IdSeguimiento: p.IdSeguimiento, IdEstado: p.IdEstado, Seguimiento: p.Seguimiento,
      ValorCompra: d.ValorCompra ?? null, Cantidad: d.Cantidad ?? 1, TasaCambio: d.TasaCambio ?? null,
      Venta: venta, CostoL: costo, dias
    };
  });

  const resumirActivos = lista => {
    const r = { total: lista.length, sinCliente: 0, sinPrecio: 0, sinVendedor: 0, sinTracking: 0, bajoCosto: 0,
                atrasados: 0, listos: 0, capital: 0, porFacturar: 0, ventaPendiente: 0,
                etapas: { sinTracking: 0, creado: 0, miami: 0, honduras: 0, recibido: 0 },
                antiguedad: { a15: 0, a30: 0, a45: 0, mas: 0 } };
    for (const i of lista) {
      if (!i.IdCliente) r.sinCliente++;
      if (!i.Venta) r.sinPrecio++;
      if (!i.IdVendedor) r.sinVendedor++;
      r.capital += i.CostoL;
      if (i.Venta) r.ventaPendiente += i.Venta; else r.porFacturar += i.CostoL;
      if (i.Venta && i.CostoL && i.Venta < i.CostoL) r.bajoCosto++;
      if (!i.IdSeguimiento) { r.sinTracking++; r.etapas.sinTracking++; }
      else if (i.IdEstado === 1) r.etapas.creado++;
      else if (i.IdEstado === 2) r.etapas.miami++;
      else if (i.IdEstado === 3) r.etapas.honduras++;
      else if (i.IdEstado === 4) { r.etapas.recibido++; r.listos++; }
      else r.etapas.creado++;
      if (i.dias > 40 && i.IdEstado !== 4) r.atrasados++;
      if (i.dias <= 15) r.antiguedad.a15++; else if (i.dias <= 30) r.antiguedad.a30++; else if (i.dias <= 45) r.antiguedad.a45++; else r.antiguedad.mas++;
    }
    return r;
  };
  out.activos = resumirActivos(items);
  out.mios = resumirActivos(items.filter(i => i.IdVendedor === idUsuario));
  out.mios.mes = { ventas: vendMes.get(idUsuario)?.ventas || 0, ganancia: vendMes.get(idUsuario)?.ganancia || 0, articulos: vendMes.get(idUsuario)?.articulos || 0 };

  // Urgentes: lo que más pide atención (para la lista con "Ver artículo")
  const prioridad = i => {
    if (i.IdEstado === 4) return { p: 1, motivo: 'Recibido, listo para entregar' };
    if (i.Venta && i.CostoL && i.Venta < i.CostoL) return { p: 2, motivo: 'Precio por debajo del costo' };
    if (i.dias > 40) return { p: 3, motivo: `${i.dias} días sin entregar` };
    if (!i.IdSeguimiento && i.dias > 10) return { p: 4, motivo: `Sin tracking hace ${i.dias} días` };
    if (!i.IdCliente) return { p: 5, motivo: 'Sin cliente' };
    if (!i.Venta) return { p: 6, motivo: 'Sin precio de venta' };
    return null;
  };
  out.urgentes = items.map(i => ({ ...i, ...(prioridad(i) || { p: 99 }) }))
    .filter(i => i.p < 99).sort((a, b) => a.p - b.p || b.dias - a.dias).slice(0, 40);

  out.vendedores = [...vendMes.values()].map(v => ({ ...v, ...(nombresVend.get(v.id) || {}) }))
    .sort((a, b) => b.ventas - a.ventas).slice(0, 6);
  out.tiendas = [...tiendaMes.values()].sort((a, b) => b.compras - a.compras).slice(0, 6);

  // Cotizaciones
  if (cot) {
    const hace3 = hoy - 3 * DIA, ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const delMes = cot.filter(c => new Date(c.Fecha) >= ini);
    const cerradas = delMes.filter(c => ['Aceptada', 'Parcial', 'Convertida'].includes(c.Estado)).length;
    out.cotizaciones = {
      abiertas: cot.filter(c => ['Borrador', 'Enviada'].includes(c.Estado)).length,
      montoAbierto: cot.filter(c => ['Borrador', 'Enviada'].includes(c.Estado)).reduce((a, c) => a + num(c.TotalLempiras), 0),
      sinRespuesta: cot.filter(c => c.Estado === 'Enviada' && new Date(c.Fecha) < hace3).length,
      delMes: delMes.length, cerradasMes: cerradas,
      conversion: delMes.length ? Math.round(cerradas * 100 / delMes.length) : null,
      mias: cot.filter(c => c.IdVendedor === idUsuario && ['Borrador', 'Enviada'].includes(c.Estado)).length
    };
  } else out.cotizaciones = null;

  // Saldos
  if (saldos) {
    out.porCobrar = { total: saldos.reduce((a, s) => a + s.saldo, 0), clientes: saldos.length };
  } else out.porCobrar = null;

  res.json(out);
};

module.exports = { getResumen };
