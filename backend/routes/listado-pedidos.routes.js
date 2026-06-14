const express = require('express');
const router  = express.Router();
const { getTodosPedidos, editarPedido, cerrarPedido, actualizarTasaPedido } = require('../controllers/listado-pedidos.controller');

router.get('/todos',       getTodosPedidos);
router.put('/editar',      editarPedido);
router.put('/cerrar',      cerrarPedido);
router.put('/tasa',        actualizarTasaPedido);

module.exports = router;
