const express = require('express');
const router  = express.Router();
const { buscarClientes, asignarCliente, asignarClienteMultiple, quitarCliente, getBitacora, getEstadoCuenta, asignarPrecio, desbloquearPrecio, getTodosClientes, getHistorialCliente, crearCliente } = require('../controllers/clientes.controller');

router.get('/buscar',            buscarClientes);
router.post('/asignar',          asignarCliente);
router.post('/asignar-multiple', asignarClienteMultiple);
router.post('/quitar',           quitarCliente);
router.get('/bitacora',          getBitacora);
router.get('/estado-cuenta',     getEstadoCuenta);
router.post('/precio',           asignarPrecio);
router.post('/desbloquear-precio', desbloquearPrecio);
router.get('/todos',             getTodosClientes);
router.get('/historial',         getHistorialCliente);
router.post('/nuevo',            crearCliente);

module.exports = router;
