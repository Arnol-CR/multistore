const express = require('express');
const router = express.Router();
const { getVendedores } = require('../controllers/vendedores.controller');
router.get('/', getVendedores);
module.exports = router;
