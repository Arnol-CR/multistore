const express = require('express');
const router = express.Router();
const { listar, historial, costos } = require('../controllers/trazabilidad.controller');

router.get('/', listar);
router.get('/:id/historial', historial);
router.get('/:id/costos', costos);

module.exports = router;
