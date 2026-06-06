const express = require('express');
const router  = express.Router();
const { getMetodosPagos, getCuentasBanco, registrarPago, getPagosRecientes } = require('../controllers/pagos.controller');

router.get('/metodos',    getMetodosPagos);
router.get('/cuentas',    getCuentasBanco);
router.get('/recientes',  getPagosRecientes);
router.post('/registrar', registrarPago);

module.exports = router;
