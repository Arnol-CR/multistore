const express = require('express');
const router = express.Router();
const { listar, historial } = require('../controllers/trazabilidad.controller');

router.get('/', listar);
router.get('/:id/historial', historial);

module.exports = router;
