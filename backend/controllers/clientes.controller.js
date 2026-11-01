const { sql, poolPromise } = require('../db/connection');

const buscarClientes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Nombre', sql.NVarChar, req.query.nombre || '')
      .execute('Se_ClientesBuscar');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

/* ════════ Reglas de cambios ════════
   - Cliente: cualquier vendedor puede cambiarlo o quitarlo (queda registrado).
   - Precio de venta: ponerlo por primera vez lo puede hacer cualquiera;
     cambiar un precio ya guardado solo el administrador (A_Vendedores.EsAdministrador).
   Cada cambio queda en C_BitacoraCambios (quién, cuándo, antes y después). */

let colVentaCache;
async function colVenta(pool) {
  if (colVentaCache !== undefined) return colVentaCache;
  const r = await pool.request().query(`SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('dbo.C_DetallePedido')`);
  const cols = r.recordset.map(x => x.name);
  colVentaCache = ['ValorCobroCliente', 'ValorVenta', 'PrecioVenta', 'ValorCobro'].find(c => cols.some(x => x.toLowerCase() === c.toLowerCase())) || null;
  return colVentaCache;
}

let bitacoraLista = false;
async function asegurarBitacora(pool) {
  if (bitacoraLista) return;
  await pool.request().query(`
    IF OBJECT_ID('dbo.C_BitacoraCambios') IS NULL
    CREATE TABLE dbo.C_BitacoraCambios (
      IdBitacora      INT IDENTITY(1,1) PRIMARY KEY,
      Fecha           DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
      IdUsuario       INT NULL,
      IdDetallePedido INT NOT NULL,
      Campo           NVARCHAR(30) NOT NULL,
      ValorAnterior   NVARCHAR(200) NULL,
      ValorNuevo      NVARCHAR(200) NULL
    )`);
  bitacoraLista = true;
}
async function anotar(pool, idUsuario, idDetalle, campo, antes, despues) {
  try {
    await asegurarBitacora(pool);
    await pool.request()
      .input('u', sql.Int, idUsuario || null).input('d', sql.Int, idDetalle).input('c', sql.NVarChar, campo)
      .input('a', sql.NVarChar, antes == null ? null : String(antes)).input('n', sql.NVarChar, despues == null ? null : String(despues))
      .query(`INSERT INTO C_BitacoraCambios (IdUsuario, IdDetallePedido, Campo, ValorAnterior, ValorNuevo) VALUES (@u, @d, @c, @a, @n)`);
  } catch (e) { console.error('Bitácora:', e.message); }
}
async function esAdministrador(pool, idUsuario) {
  if (!idUsuario) return false;
  const r = await pool.request().input('id', sql.Int, idUsuario)
    .query(`SELECT TOP 1 CAST(ISNULL(EsAdministrador,0) AS INT) AS a FROM A_Vendedores WHERE IdVendedor = @id`);
  return !!(r.recordset[0] && r.recordset[0].a);
}
async function clientesActuales(pool, ids) {
  const r = await pool.request().input('ids', sql.NVarChar, ids.join(','))
    .query(`SELECT D.IdDetallePedido, D.IdCliente, C.NombreCompleto
            FROM C_DetallePedido D LEFT JOIN A_Clientes C ON C.IdCliente = D.IdCliente
            WHERE D.IdDetallePedido IN (SELECT TRY_CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`)
    .catch(() => pool.request().input('ids', sql.NVarChar, ids.join(','))
      .query(`SELECT IdDetallePedido, IdCliente, NULL AS NombreCompleto FROM C_DetallePedido
              WHERE IdDetallePedido IN (SELECT TRY_CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`));
  return new Map(r.recordset.map(x => [x.IdDetallePedido, x]));
}
async function anotarClientes(pool, idUsuario, antes, idCliente) {
  for (const [id, x] of antes) if ((x.IdCliente || null) !== (idCliente || null))
    await anotar(pool, idUsuario, id, 'Cliente', x.IdCliente ? `${x.IdCliente}${x.NombreCompleto ? ' ' + x.NombreCompleto : ''}` : null, idCliente);
}

const asignarCliente = async (req, res) => {
  try {
    const pool = await poolPromise;
    const id = parseInt(req.body.idDetallePedido);
    const antes = await clientesActuales(pool, [id]).catch(() => new Map());
    await pool.request()
      .input('IdCliente', sql.Int, req.body.idCliente)
      .input('IdDetallePedido', sql.Int, id)
      .execute('Up_IdClientePedido');
    await anotarClientes(pool, parseInt(req.body.idUsuario) || null, antes, req.body.idCliente);
    res.json({ ok: true, mensaje: 'Cliente asignado correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarClienteMultiple = async (req, res) => {
  try {
    const { idCliente, idDetalles } = req.body;
    const pool = await poolPromise;
    const ids = String(idDetalles || '').split(',').map(x => parseInt(x)).filter(Boolean);
    const antes = await clientesActuales(pool, ids).catch(() => new Map());
    await pool.request()
      .input('IdCliente', sql.Int, idCliente)
      .input('IdDetalles', sql.NVarChar, idDetalles)
      .execute('Up_IdClientePedidoMultiple');
    await anotarClientes(pool, parseInt(req.body.idUsuario) || null, antes, idCliente);
    res.json({ ok: true, mensaje: 'Clientes asignados correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Quitar el cliente de artículos que aún no se entregan (cualquier vendedor)
const quitarCliente = async (req, res) => {
  try {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : [req.body.idDetallePedido]).map(x => parseInt(x)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ ok: false, error: 'Faltan artículos' });
    const pool = await poolPromise;
    const antes = await clientesActuales(pool, ids).catch(() => new Map());
    const r = await pool.request().input('ids', sql.NVarChar, ids.join(','))
      .query(`UPDATE C_DetallePedido SET IdCliente = NULL
              WHERE IdDetallePedido IN (SELECT TRY_CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))
                AND ISNULL(EstaEntregado, 0) = 0`);
    await anotarClientes(pool, parseInt(req.body.idUsuario) || null, antes, null);
    res.json({ ok: true, cambiados: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarPrecio = async (req, res) => {
  try {
    const { idDetallePedido, valorCobro } = req.body;
    const idUsuario = parseInt(req.body.idUsuario) || null;
    const nuevo = parseFloat(valorCobro);
    if (!(nuevo > 0)) return res.status(400).json({ ok: false, error: 'El precio debe ser mayor que cero' });
    const pool = await poolPromise;
    const col = await colVenta(pool);

    let anterior = 0;
    if (col) {
      const r = await pool.request().input('id', sql.Int, idDetallePedido)
        .query(`SELECT ISNULL([${col}], 0) AS v FROM C_DetallePedido WHERE IdDetallePedido = @id`);
      anterior = parseFloat((r.recordset[0] || {}).v) || 0;
    }
    if (anterior > 0 && Math.abs(anterior - nuevo) < 0.005) return res.json({ ok: true, mensaje: 'Sin cambios' });

    const admin = anterior > 0 ? await esAdministrador(pool, idUsuario) : false;
    if (anterior > 0 && !admin) {
      return res.status(403).json({ ok: false, bloqueado: true, anterior,
        error: `Este artículo ya tiene precio (L ${anterior}). Solo el administrador puede cambiarlo.` });
    }

    const guardarSP = () => pool.request()
      .input('IdDetalleCliente', sql.Int, idDetallePedido)
      .input('ValorCobro', sql.Decimal(18, 2), nuevo)
      .execute('Up_ValorVentaDetallesPedidos');
    await guardarSP();

    // Si el precio estaba bloqueado por el SP, el administrador lo desbloquea y lo vuelve a guardar
    if (col && anterior > 0) {
      const leer = async () => parseFloat((await pool.request().input('id', sql.Int, idDetallePedido)
        .query(`SELECT ISNULL([${col}], 0) AS v FROM C_DetallePedido WHERE IdDetallePedido = @id`)).recordset[0].v) || 0;
      if (Math.abs(await leer() - nuevo) >= 0.005) {
        try { await pool.request().input('IdDetallePedido', sql.Int, idDetallePedido).execute('SP_DesbloquearPrecio'); await guardarSP(); } catch (e) {}
        if (Math.abs(await leer() - nuevo) >= 0.005)
          await pool.request().input('id', sql.Int, idDetallePedido).input('v', sql.Decimal(18, 2), nuevo)
            .query(`UPDATE C_DetallePedido SET [${col}] = @v WHERE IdDetallePedido = @id`);
      }
    }
    await anotar(pool, idUsuario, idDetallePedido, 'Precio', anterior || null, nuevo);
    res.json({ ok: true, mensaje: anterior > 0 ? 'Precio corregido' : 'Precio asignado correctamente', anterior });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Estado de cuenta: datos del cliente + movimientos + artículos, en una sola llamada
const getEstadoCuenta = async (req, res) => {
  try {
    const id = parseInt(req.query.idCliente);
    if (!id) return res.status(400).json({ ok: false, error: 'Falta el cliente' });
    const pool = await poolPromise;
    const col = await colVenta(pool);
    const [cli, mov, art] = await Promise.all([
      pool.request().input('IdCliente', sql.Int, id).execute('Se_ClientesBuscarIdCliente'),
      pool.request().input('IdCliente', sql.Int, id).execute('Se_HistorialCliente'),
      pool.request().input('id', sql.Int, id).query(`
        SELECT D.IdDetallePedido, P.NumeroPedido, P.FechaPedido, A.NombreArticulo, D.DescripcionArticulo,
               D.CodigoArticulo, D.TallaColor, D.Fotografia, ISNULL(D.CantidadArticulos,1) AS Cantidad,
               ${col ? `ISNULL(D.[${col}],0)` : '0'} AS Venta, ISNULL(D.EstaEntregado,0) AS Entregado
        FROM C_DetallePedido D
        JOIN C_Pedidos P ON P.IdPedido = D.IdPedido
        LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo
        WHERE D.IdCliente = @id
        ORDER BY P.FechaPedido DESC, D.IdDetallePedido DESC`)
    ]);
    const cliente = (cli.recordset || []).find(x => x.IdCliente === id) || cli.recordset[0] || null;
    res.json({ ok: true, cliente, movimientos: mov.recordset || [], articulos: art.recordset || [] });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

// Historial de cambios de un artículo
const getBitacora = async (req, res) => {
  try {
    const pool = await poolPromise;
    await asegurarBitacora(pool);
    const r = await pool.request().input('id', sql.Int, parseInt(req.query.idDetallePedido))
      .query(`SELECT TOP 50 B.Fecha, B.Campo, B.ValorAnterior, B.ValorNuevo, B.IdUsuario,
                     LTRIM(RTRIM(ISNULL(V.Nombres,'') + ' ' + ISNULL(V.Apellidos,''))) AS Usuario
              FROM C_BitacoraCambios B LEFT JOIN A_Vendedores V ON V.IdVendedor = B.IdUsuario
              WHERE B.IdDetallePedido = @id ORDER BY B.Fecha DESC`);
    res.json({ ok: true, data: r.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const desbloquearPrecio = async (req, res) => {
  try {
    const { idDetallePedido } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('IdDetallePedido', sql.Int, idDetallePedido)
      .execute('SP_DesbloquearPrecio');
    res.json({ ok: true, mensaje: 'Precio desbloqueado correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getTodosClientes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdCliente', sql.Int, null)
      .execute('Se_ClientesBuscarIdCliente');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const getHistorialCliente = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('IdCliente', sql.Int, parseInt(req.query.idCliente))
      .execute('Se_HistorialCliente');
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};


const crearCliente = async (req, res) => {
  try {
    const { nombre, apellido, telefono, correo, direccion } = req.body;
    const idVendedor = req.usuario && !req.usuario.esAdmin ? req.usuario.id : req.body.idVendedor;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Nombre',            sql.NVarChar, nombre)
      .input('Apellido',          sql.NVarChar, apellido)
      .input('Telefono',          sql.NVarChar, telefono || '')
      .input('CorreoElectronico', sql.NVarChar, correo || null)
      .input('Direccion',         sql.NVarChar, direccion || '')
      .input('IdVendedor',        sql.Int,      idVendedor)
      .execute('In_Clientes');
    res.json({ ok: true, mensaje: 'Cliente registrado correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

module.exports = { buscarClientes, asignarCliente, asignarClienteMultiple, quitarCliente, getBitacora, getEstadoCuenta, asignarPrecio, desbloquearPrecio, getTodosClientes, getHistorialCliente, crearCliente };
