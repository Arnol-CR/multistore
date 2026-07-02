const express = require('express');
const router  = express.Router();
const { getCategorias, crearCategoria, editarCategoria, getArticulos, crearArticulo, editarArticulo } = require('../controllers/catalogo.controller');

/* Categorías */
router.get('/categorias',     getCategorias);
router.post('/categorias',    crearCategoria);
router.put('/categorias',     editarCategoria);

/* Artículos */
router.get('/articulos',      getArticulos);
router.post('/articulos',     crearArticulo);
router.put('/articulos',      editarArticulo);

module.exports = router;
