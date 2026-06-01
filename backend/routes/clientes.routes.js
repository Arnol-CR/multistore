const express = require('express');
const router = express.Router();
const { buscarClientes, asignarCliente, asignarClienteMultiple, asignarPrecio } = require('../controllers/clientes.controller');

router.get('/buscar', buscarClientes);
router.post('/asignar', asignarCliente);
router.post('/asignar-multiple', asignarClienteMultiple);
router.post('/precio', asignarPrecio);

module.exports = router;