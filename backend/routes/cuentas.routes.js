const express = require('express');
const router  = express.Router();
const { getResumenCuentas, getDetalleCuenta } = require('../controllers/cuentas.controller');
const { soloAdmin } = require('../middleware/auth.middleware');
router.use(soloAdmin);

router.get('/resumen',  getResumenCuentas);
router.get('/detalle',  getDetalleCuenta);

module.exports = router;
