const { sql, poolPromise } = require('../db/connection');

const getTodosPedidos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(`
      SELECT
        P.IdPedido,
        P.NumeroPedido,
        P.FechaPedido,
        P.IdEmpresa,
        P.IdCasillero,
        P.IdMoneda,
        P.Activo,
        P.TasaCambio,
        P.IdCuentaBanco,
        E.NombreEmpresa  AS Tienda,
        C.NombreEmpresa  AS Casillero,
        M.Simbolo,
        COUNT(D.IdDetallePedido)     AS CantArticulos,
        ISNULL(SUM(D.ValorCompra),0) AS TotalCompra
        D.Fotografia
      FROM C_Pedidos P
      LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
      LEFT JOIN A_Empresas C ON C.IdEmpresa = P.IdCasillero
      LEFT JOIN A_Monedas  M ON M.IdMoneda  = P.IdMoneda
      LEFT JOIN C_DetallePedido D ON D.IdPedido = P.IdPedido
      GROUP BY P.IdPedido, P.NumeroPedido, P.FechaPedido, P.IdEmpresa, P.IdCasillero,
               P.IdMoneda, P.Activo, P.TasaCambio, P.IdCuentaBanco,
               E.NombreEmpresa, C.NombreEmpresa, M.Simbolo
      ORDER BY P.IdPedido DESC
    `);
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const editarPedido = async (req, res) => {
  try {
    const { idPedido, numeroPedido, fechaPedido, idEmpresa, idCasillero, idMoneda, activo } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('IdPedido',     sql.Int,      idPedido)
      .input('NumeroPedido', sql.NVarChar, numeroPedido)
      .input('FechaPedido',  sql.Date,     fechaPedido)
      .input('IdEmpresa',    sql.Int,      idEmpresa)
      .input('IdCasillero',  sql.Int,      idCasillero)
      .input('IdMoneda',     sql.Int,      idMoneda)
      .input('Activo',       sql.Bit,      activo)
      .query(`
        UPDATE C_Pedidos
        SET NumeroPedido = @NumeroPedido,
            FechaPedido  = @FechaPedido,
            IdEmpresa    = @IdEmpresa,
            IdCasillero  = @IdCasillero,
            IdMoneda     = @IdMoneda,
            Activo       = @Activo
        WHERE IdPedido = @IdPedido
      `);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const cerrarPedido = async (req, res) => {
  try {
    const { idPedido } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('IdPedido', sql.Int, idPedido)
      .query(`UPDATE C_Pedidos SET Activo = 0 WHERE IdPedido = @IdPedido`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const actualizarTasaPedido = async (req, res) => {
  try {
    const { idPedido, tasaCambio } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('IdPedido', sql.Int,            idPedido)
      .input('Tasa',     sql.Decimal(18,8),  parseFloat(tasaCambio))
      .execute('Up_TasaCambio');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

module.exports = { getTodosPedidos, editarPedido, cerrarPedido, actualizarTasaPedido };
