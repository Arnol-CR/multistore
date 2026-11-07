const express = require('express');
const router  = express.Router();
const { getMetodosPagos, getCuentasBanco, registrarPago, getPagosRecientes, editarPago, eliminarPago } = require('../controllers/pagos.controller');

router.get('/metodos',    getMetodosPagos);
router.get('/cuentas',    getCuentasBanco);
router.get('/recientes',  getPagosRecientes);
router.post('/registrar', registrarPago);
router.put('/:id',       editarPago);
router.delete('/:id',    eliminarPago);

module.exports = router;
