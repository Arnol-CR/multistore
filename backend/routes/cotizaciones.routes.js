const express = require('express');
const router  = express.Router();
const { getDefaults, listar, obtener, guardar, cambiarEstado, eliminar, convertir, imagen, leerLink } = require('../controllers/cotizaciones.controller');

router.get('/defaults',        getDefaults);
router.get('/img',             imagen);
router.get('/leer-link',       leerLink);
router.get('/',                listar);
router.get('/:id',             obtener);
router.post('/',               guardar);
router.put('/:id/estado',      cambiarEstado);
router.delete('/:id',          eliminar);
router.post('/:id/convertir',  convertir);

module.exports = router;
