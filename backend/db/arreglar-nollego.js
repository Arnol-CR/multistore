// Corrige los "No llegó" en los que se le quitó el cobro al cliente antes del arreglo:
// se habían guardado como devolución (tipo 5), que en el saldo SUMA deuda. Pasan a abono sin banco (tipo 3).
// Uso (desde la carpeta backend):  node db/arreglar-nollego.js
const { poolPromise } = require('./connection');
(async () => {
  const pool = await poolPromise;
  const r = await pool.request().query(`UPDATE C_MovimientoClientes SET IdMovimiento = 3, IdCuentaBanco = NULL
                                        WHERE NumeroReferencia LIKE 'NOLLEGO-%' AND IdMovimiento = 5`);
  await pool.request().execute('RecalcularSaldoClientes');
  console.log(`Corregidos: ${r.rowsAffected[0]} movimiento(s). Saldos recalculados.`);
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
