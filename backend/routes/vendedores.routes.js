const express = require('express');
const router = express.Router();
const { getVendedores, asignarVendedor } = require('../controllers/vendedores.controller');

router.get('/',        getVendedores);
router.post('/asignar', asignarVendedor);

module.exports = router;
