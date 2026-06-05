const express = require('express');
const router  = express.Router();
const { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio, desbloquearPrecio, getTodosClientes, getHistorialCliente } = require('../controllers/clientes.controller');

router.get('/buscar',            buscarClientes);
router.post('/asignar',          asignarCliente);
router.post('/asignar-multiple', asignarClienteMultiple);
router.post('/precio',           asignarPrecio);
router.post('/desbloquear-precio', desbloquearPrecio);
router.get('/todos',             getTodosClientes);
router.get('/historial',         getHistorialCliente);

module.exports = router;
