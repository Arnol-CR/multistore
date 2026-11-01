const express = require('express');
const router = express.Router();
const { getVendedores, asignarVendedor } = require('../controllers/vendedores.controller');

router.get('/',        getVendedores);
router.post('/asignar', require('../middleware/auth.middleware').soloAdmin, asignarVendedor);

module.exports = router;
