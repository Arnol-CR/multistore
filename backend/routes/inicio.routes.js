const express = require('express');
const router = express.Router();
const { getResumen } = require('../controllers/inicio.controller');

router.get('/resumen', getResumen);

module.exports = router;
