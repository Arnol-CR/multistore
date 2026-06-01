const express = require('express');
const router = express.Router();
const { buscarClientes, asignarCliente } = require('../controllers/clientes.controller');

router.get('/buscar', buscarClientes);
router.post('/asignar', asignarCliente);

module.exports = router;