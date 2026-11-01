const express = require('express');
const router = express.Router();
const { soloAdmin } = require('../middleware/auth.middleware');
const { registrarPago, getDatos, getBancos, crearGasto, editarGasto, editarCombustible, editarPuntos, guardarCapital } = require('../controllers/finanzas.controller');

router.use(soloAdmin);           // todo el módulo es solo para el administrador
router.get('/datos', getDatos);
router.get('/bancos', getBancos);
router.post('/gastos', crearGasto);
router.put('/gastos', editarGasto);
router.put('/combustible', editarCombustible);
router.put('/puntos', editarPuntos);
router.post('/capital', guardarCapital);
router.post('/pago', registrarPago);

module.exports = router;
