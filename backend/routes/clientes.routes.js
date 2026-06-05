const express = require('express');
const router  = express.Router();
const { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio, desbloquearPrecio } = require('../controllers/clientes.controller');
const { getTodosClientes, getHistorialCliente } = require('../controllers/clientes.controller.nuevo');

router.get('/buscar',           buscarClientes);
router.post('/asignar',         asignarCliente);
router.post('/asignar-multiple',asignarClienteMultiple);
router.post('/precio',          asignarPrecio);
router.post('/desbloquear',     desbloquearPrecio);
router.get('/todos',            getTodosClientes);
router.get('/historial',        getHistorialCliente);

module.exports = router;
