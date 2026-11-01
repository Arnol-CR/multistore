const { sql, poolPromise } = require('../db/connection');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

// Catálogos
const getTiendas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().execute('Se_EmpresasTiendas');
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const getCasilleros = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().execute('Se_EmpresasCasilleros');
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const getMonedas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().execute('Se_Monedas');
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const getArticulos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().execute('Se_Articulos');
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Número de pedido sugerido
const getNumeroPedido = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('Fecha', sql.Date, req.query.fecha)
      .execute('Se_NumeroPedido');
    res.json({ ok: true, numero: r.recordset[0].NumeroPedidoSugerido });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Crear pedido cabecera
const crearPedido = async (req, res) => {
  try {
    const { fechaPedido, numeroPedido, idEmpresa, idMoneda, idCasillero } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('FechaPedido',   sql.Date,        fechaPedido)
      .input('NumeroPedido',  sql.NVarChar,    numeroPedido)
      .input('IdEmpresa',     sql.Int,         idEmpresa)
      .input('IdMoneda',      sql.Int,         idMoneda)
      .input('IdCasillero',   sql.Int,         idCasillero)
      .execute('In_CrearPedidos');

    // Obtener IdPedido recién creado
    const r2 = await pool.request()
      .query("SELECT TOP 1 IdPedido FROM C_Pedidos ORDER BY IdPedido DESC");
    res.json({ ok: true, idPedido: r2.recordset[0].IdPedido, numeroPedido });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Pedidos abiertos para el selector
const getPedidosAbiertos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request().query(`
      SELECT TOP 50
        P.IdPedido,
        P.NumeroPedido,
        P.FechaPedido,
        E.NombreEmpresa AS Tienda,
        C.NombreEmpresa AS Casillero,
        M.Simbolo,
        COUNT(D.IdDetallePedido) AS CantArticulos,
        SUM(CASE WHEN D.EstaEntregado = 1 THEN 1 ELSE 0 END) AS CantEntregados,
        ISNULL(SUM(D.ValorCompra * D.CantidadArticulos), 0)  AS TotalCompra,
        P.TasaCambio,
        ISNULL(SUM(D.ValorCompra), 0) * P.TasaCambio AS TotalLempiras,
        P.IdCuentaBanco,
        CB.Banco,
        CB.NombreCuenta
      FROM C_Pedidos P
      LEFT JOIN A_Empresas E ON E.IdEmpresa = P.IdEmpresa
      LEFT JOIN A_Empresas C ON C.IdEmpresa = P.IdCasillero
      LEFT JOIN A_Monedas M ON M.IdMoneda = P.IdMoneda
      LEFT JOIN C_DetallePedido D ON D.IdPedido = P.IdPedido
      LEFT JOIN A_CuentaBanco CB ON CB.IdCuentaBanco = P.idCuentaBanco
      WHERE P.Activo = 1 OR P.Activo IS NULL
      GROUP BY P.IdPedido, P.NumeroPedido, P.FechaPedido, E.NombreEmpresa, C.NombreEmpresa,
               M.Simbolo, P.TasaCambio, P.IdCuentaBanco, CB.Banco, CB.NombreCuenta
      ORDER BY P.FechaPedido DESC, P.IdPedido DESC
    `);
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Detalles de un pedido
const getDetallesPedido = async (req, res) => {
  try {
    const pool = await poolPromise;
    const r = await pool.request()
      .input('IdPedido', sql.Int, parseInt(req.query.idPedido))
      .query(`
        SELECT
          D.IdDetallePedido,
          D.CodigoArticulo,
          D.DescripcionArticulo,
          D.Peso,
          D.TallaColor,
          D.ValorCompra,
          D.CantidadArticulos,
          D.NoPedidoAplicacion,
          D.Link,
          D.Fotografia,
          D.IdArticulo,
          D.IdCliente,
          D.EstaEntregado,
          A.NombreArticulo
        FROM C_DetallePedido D
        LEFT JOIN A_Articulos A ON A.IdArticulo = D.IdArticulo
        WHERE D.IdPedido = @IdPedido
        ORDER BY D.IdDetallePedido DESC
      `);
    res.json({ ok: true, data: r.recordset });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Agregar artículo con foto opcional
const agregarArticulo = async (req, res) => {
  try {
    const {
      codigoArticulo, descripcionArticulo, peso, idArticulo,
      idPedido, tallaColor, valorCompra, cantidadArticulos,
      link, noPedidoAplicacion, fotoBase64, fotoMime, fotoUrl
    } = req.body;

    // Foto por URL (importación SHEIN): se guarda el link directo
    let urlFoto = (!fotoBase64 && fotoUrl && /^https?:\/\//.test(fotoUrl)) ? fotoUrl : null;

    // Subir foto a Azure Blob si viene
    if (fotoBase64 && process.env.AZURE_STORAGE_CONNECTION_STRING) {
      try {
        const blobService = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const container = blobService.getContainerClient('fotos-articulos');
        const ext = fotoMime === 'image/jpeg' ? 'jpg' : fotoMime === 'image/webp' ? 'webp' : 'png';
        const blobName = uuidv4() + '.' + ext;
        const blob = container.getBlockBlobClient(blobName);
        const buffer = Buffer.from(fotoBase64, 'base64');
        await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: fotoMime || 'image/png' } });
        urlFoto = blob.url;
      } catch (blobErr) {
        console.error('Azure Blob error:', blobErr.message);
        // Continuar sin foto si falla
      }
    }

    const pool = await poolPromise;
    await pool.request()
      .input('CodigoArticulo',      sql.NVarChar,     codigoArticulo)
      .input('DescripcionArticulo', sql.NVarChar,     descripcionArticulo || '')
      .input('Peso',                sql.Decimal(18,2), parseFloat(peso) || 0)
      .input('IdArticulo',          sql.Int,           idArticulo ? parseInt(idArticulo) : null)
      .input('IdCliente',           sql.Int,           null)
      .input('IdPedido',            sql.Int,           idPedido)
      .input('IdSeguimiento',       sql.Int,           null)
      .input('TallaColor',          sql.NVarChar,     tallaColor || '')
      .input('ValorCompra',         sql.Decimal(18,2), parseFloat(valorCompra) || 0)
      .input('ValorCobroCliente',   sql.Decimal(18,2), null)
      .input('CantidadArticulos',   sql.Int,           parseInt(cantidadArticulos) || 1)
      .input('Link',                sql.NVarChar,     link || null)
      .input('NoPedidoAplicacion',  sql.NVarChar,     noPedidoAplicacion || null)
      .execute('In_DetallePedido');

    // ID del artículo recién insertado (mismo pedido y mismo SKU, el más reciente)
    const rId = await pool.request()
      .input('IdPedido', sql.Int, parseInt(idPedido))
      .input('Codigo',   sql.NVarChar, codigoArticulo)
      .query('SELECT TOP 1 IdDetallePedido FROM C_DetallePedido WHERE IdPedido = @IdPedido AND CodigoArticulo = @Codigo ORDER BY IdDetallePedido DESC');
    const idDetallePedido = rId.recordset[0] ? rId.recordset[0].IdDetallePedido : null;

    // Guardar URL de foto si existe
    if (urlFoto && idDetallePedido) {
      await pool.request()
        .input('UrlFoto', sql.NVarChar(sql.MAX), urlFoto)
        .input('Id', sql.Int, idDetallePedido)
        .query('UPDATE C_DetallePedido SET Fotografia = @UrlFoto WHERE IdDetallePedido = @Id');
    }

    res.json({ ok: true, mensaje: 'Artículo agregado', urlFoto, idDetallePedido });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Editar artículo existente
const editarArticulo = async (req, res) => {
  try {
    const {
      idDetallePedido, codigoArticulo, descripcionArticulo, peso,
      idArticulo, tallaColor, valorCompra, cantidadArticulos, link, noPedidoAplicacion,
      fotoBase64, fotoMime
    } = req.body;

    const pool = await poolPromise;

    // Si no viene idArticulo, usar el que ya tiene el registro en BD
    let idArtFinal = idArticulo ? parseInt(idArticulo) : null;
    if (!idArtFinal) {
      const existing = await pool.request()
        .input('IdDetallePedido', sql.Int, parseInt(idDetallePedido))
        .query('SELECT IdArticulo FROM C_DetallePedido WHERE IdDetallePedido = @IdDetallePedido');
      idArtFinal = existing.recordset[0]?.IdArticulo || null;
    }

    await pool.request()
      .input('IdDetallePedido',    sql.Int,           parseInt(idDetallePedido))
      .input('CodigoArticulo',     sql.NVarChar,      codigoArticulo || '')
      .input('DescripcionArticulo',sql.NVarChar,      descripcionArticulo || '')
      .input('Peso',               sql.Decimal(18,2), parseFloat(peso) || 0)
      .input('IdArticulo',         sql.Int,           idArtFinal)
      .input('TallaColor',         sql.NVarChar,      tallaColor || '')
      .input('ValorCompra',        sql.Decimal(18,2), parseFloat(valorCompra) || 0)
      .input('CantidadArticulos',  sql.Int,           parseInt(cantidadArticulos) || 1)
      .input('Link',               sql.NVarChar,      link || null)
      .input('NoPedidoAplicacion', sql.NVarChar,      noPedidoAplicacion || null)
      .execute('Se_DetallePedido');

    // Subir y actualizar foto si viene una nueva
    let urlFoto = null;
    if (fotoBase64 && process.env.AZURE_STORAGE_CONNECTION_STRING) {
      try {
        const blobService = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const container = blobService.getContainerClient('fotos-articulos');
        const ext = fotoMime === 'image/jpeg' ? 'jpg' : fotoMime === 'image/webp' ? 'webp' : 'png';
        const blobName = uuidv4() + '.' + ext;
        const blob = container.getBlockBlobClient(blobName);
        const buffer = Buffer.from(fotoBase64, 'base64');
        await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: fotoMime || 'image/png' } });
        urlFoto = blob.url;

        await pool.request()
          .input('UrlFoto', sql.NVarChar(sql.MAX), urlFoto)
          .input('IdDetallePedido', sql.Int, parseInt(idDetallePedido))
          .query('UPDATE C_DetallePedido SET Fotografia = @UrlFoto WHERE IdDetallePedido = @IdDetallePedido');
      } catch (blobErr) {
        console.error('Azure Blob error:', blobErr.message);
        // Continuar sin actualizar foto si falla
      }
    }

    res.json({ ok: true, urlFoto });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Actualizar cuenta bancaria de un pedido
const actualizarCuentaPedido = async (req, res) => {
  try {
    const { idPedido, idCuentaBanco } = req.body;
    if (!idPedido) return res.status(400).json({ ok: false, error: 'Falta idPedido.' });
    const pool = await poolPromise;
    await pool.request()
      .input('IdPedido', sql.Int, parseInt(idPedido))
      .input('IdCuentaBanco', sql.Int, idCuentaBanco ? parseInt(idCuentaBanco) : null)
      .query('UPDATE C_Pedidos SET IdCuentaBanco = @IdCuentaBanco WHERE IdPedido = @IdPedido');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

// Eliminar artículo del pedido
const eliminarArticulo = async (req, res) => {
  try {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Falta el id del artículo.' });
    const pool = await poolPromise;
    const r = await pool.request().input('Id', sql.Int, id)
      .query('SELECT EstaEntregado FROM C_DetallePedido WHERE IdDetallePedido = @Id');
    if (!r.recordset.length) return res.status(404).json({ ok: false, error: 'El artículo ya no existe.' });
    if (r.recordset[0].EstaEntregado) return res.status(400).json({ ok: false, error: 'No se puede eliminar: el artículo ya fue entregado.' });
    await pool.request().input('Id', sql.Int, id)
      .query('DELETE FROM C_DetallePedido WHERE IdDetallePedido = @Id');
    res.json({ ok: true });
  } catch (e) {
    const fk = /REFERENCE constraint|FOREIGN KEY/i.test(e.message);
    res.status(fk ? 400 : 500).json({ ok: false, error: fk ? 'No se puede eliminar: el artículo tiene pagos, cobros o seguimiento registrados.' : e.message });
  }
};

function verFaltantes(numeroPedido) {
    window.location.href = `/dashboard.html?pedido=${encodeURIComponent(numeroPedido)}`;
}

// Cambiar solo la foto de un artículo: imagen subida (base64) o un link de imagen
const cambiarFoto = async (req, res) => {
  try {
    const { idDetallePedido, fotoBase64, fotoMime, url } = req.body;
    const id = parseInt(idDetallePedido);
    if (!id) return res.status(400).json({ ok: false, error: 'Falta el artículo' });
    let nueva = null;
    if (fotoBase64) {
      if (!process.env.AZURE_STORAGE_CONNECTION_STRING) return res.status(500).json({ ok: false, error: 'No está configurado el almacenamiento de fotos' });
      const blobService = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
      const container = blobService.getContainerClient('fotos-articulos');
      const ext = fotoMime === 'image/jpeg' ? 'jpg' : fotoMime === 'image/webp' ? 'webp' : 'png';
      const blob = container.getBlockBlobClient(uuidv4() + '.' + ext);
      const buffer = Buffer.from(fotoBase64, 'base64');
      if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'La imagen es muy grande (máx. 8 MB)' });
      await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: fotoMime || 'image/png' } });
      nueva = blob.url;
    } else if (typeof url === 'string') {
      const u = url.trim();
      if (u && !/^https?:\/\/\S+$/i.test(u)) return res.status(400).json({ ok: false, error: 'El link de la imagen no es válido' });
      nueva = u || null;   // vacío = quitar la foto
    } else return res.status(400).json({ ok: false, error: 'Falta la imagen' });
    const pool = await poolPromise;
    await pool.request().input('Foto', sql.NVarChar(sql.MAX), nueva).input('Id', sql.Int, id)
      .query('UPDATE C_DetallePedido SET Fotografia = @Foto WHERE IdDetallePedido = @Id');
    res.json({ ok: true, fotografia: nueva });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

module.exports = { cambiarFoto, getTiendas, getCasilleros, getMonedas, getArticulos, getNumeroPedido, crearPedido, getPedidosAbiertos, getDetallesPedido, agregarArticulo, editarArticulo, actualizarCuentaPedido, eliminarArticulo };
