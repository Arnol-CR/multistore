const express = require('express');
const router = express.Router();
const { getDashboardStats, getPedidosRecientes, getPedidos } = require('../controllers/pedidos.controller');
router.get('/stats', getDashboardStats);
router.get('/recientes', getPedidosRecientes);
router.get('/', getPedidos);
module.exports = router;
