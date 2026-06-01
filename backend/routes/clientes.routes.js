const express = require('express');
const router = express.Router();
const { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio, desbloquearPrecio } = require('../controllers/clientes.controller');

router.post('/desbloquear-precio', desbloquearPrecio);
router.get('/buscar', buscarClientes);
router.post('/asignar', asignarCliente);
router.post('/asignar-multiple', asignarClienteMultiple);
router.post('/precio', asignarPrecio);

module.exports = router;