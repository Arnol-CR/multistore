const express = require('express');
const router = express.Router();
const { soloAdmin } = require('../middleware/auth.middleware');
const { getDatos, getBancos } = require('../controllers/finanzas.controller');

router.use(soloAdmin);           // todo el módulo es solo para el administrador
router.get('/datos', getDatos);
router.get('/bancos', getBancos);

module.exports = router;
