const express = require('express');
const router = express.Router();
const { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio, desbloquearPrecio } = require('../controllers/clientes.controller');
router.get('/buscar', buscarClientes);
router.post('/asignar', asignarCliente);
router.post('/asignar-multiple', asignarClienteMultiple);
router.post('/precio', asignarPrecio);
router.post('/desbloquear-precio', desbloquearPrecio);
module.exports = router;
