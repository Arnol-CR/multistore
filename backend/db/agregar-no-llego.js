// Agrega a C_DetallePedido las columnas para marcar artículos que NO LLEGARON.
// Solo agrega columnas (no borra ni cambia datos). Se puede correr varias veces.
// Uso (desde la carpeta backend):  node db/agregar-no-llego.js
const { poolPromise } = require('./connection');

const COLUMNAS = [
  ['NoLlego', 'bit NULL'],
  ['FechaNoLlego', 'date NULL'],
  ['MotivoNoLlego', 'nvarchar(100) NULL'],
  ['ReembolsoNoLlego', 'decimal(18,2) NULL'],
  ['NoLlegoQuitoCobro', 'bit NULL']
];

(async () => {
  const pool = await poolPromise;
  for (const [c, tipo] of COLUMNAS) {
    const r = await pool.request().query(`SELECT COL_LENGTH('dbo.C_DetallePedido', '${c}') AS L`);
    if (r.recordset[0].L != null) { console.log(`Ya existe: ${c}`); continue; }
    await pool.request().query(`ALTER TABLE dbo.C_DetallePedido ADD ${c} ${tipo}`);
    console.log(`Agregada: ${c}`);
  }
  console.log('Listo.');
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
