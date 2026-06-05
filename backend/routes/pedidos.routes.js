const express = require('express');
const router  = express.Router();
const { getDashboardStats, getPedidosRecientes, getPedidos, getTodosPedidos } = require('../controllers/pedidos.controller');

router.get('/stats',     getDashboardStats);
router.get('/recientes', getPedidosRecientes);
router.get('/',          getPedidos);
router.get('/todos',     getTodosPedidos);

module.exports = router;
