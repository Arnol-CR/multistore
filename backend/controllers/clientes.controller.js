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

const asignarCliente = async (req, res) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('IdCliente', sql.Int, req.body.idCliente)
      .input('IdDetallePedido', sql.Int, req.body.idDetallePedido)
      .execute('Up_IdClientePedido');
    res.json({ ok: true, mensaje: 'Cliente asignado correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarClienteMultiple = async (req, res) => {
  try {
    const { idCliente, idDetalles } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('IdCliente', sql.Int, idCliente)
      .input('IdDetalles', sql.NVarChar, idDetalles)
      .execute('Up_IdClientePedidoMultiple');
    res.json({ ok: true, mensaje: 'Clientes asignados correctamente' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

const asignarPrecio = async (req, res) => {
  try {
    const { idDetallePedido, valorCobro } = req.body;
    const pool = await poolPromise;
    await pool.request()
      .input('IdDetalleCliente', sql.Int, idDetallePedido)
      .input('ValorCobro', sql.Decimal(18,2), valorCobro)
      .execute('Up_ValorVentaDetallesPedidos');
    res.json({ ok: true, mensaje: 'Precio asignado correctamente' });
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
    const { nombre, apellido, telefono, correo, direccion, idVendedor } = req.body;
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

module.exports = { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio, desbloquearPrecio, getTodosClientes, getHistorialCliente, crearCliente };
