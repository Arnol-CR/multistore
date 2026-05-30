const express = require('express');
const router = express.Router();
const { getPagos } = require('../controllers/pagos.controller');
router.get('/', getPagos);
module.exports = router;
