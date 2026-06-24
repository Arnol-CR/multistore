const express = require('express');
const router  = express.Router();
const { getResumenCuentas, getDetalleCuenta } = require('../controllers/cuentas.controller');

router.get('/resumen',  getResumenCuentas);
router.get('/detalle',  getDetalleCuenta);

module.exports = router;
