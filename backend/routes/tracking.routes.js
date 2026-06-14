const express = require('express');
const router = express.Router();
const {
    // Pestaña 1
    getArticulosSinSeguimiento,
    crearSeguimiento,
    asignarSeguimientoArticulo,
    asignarSeguimientoMasivo,
    // Pestaña 2
    getSeguimientos,
    registrarEntradaCasillero,
    // Pestaña 3
    getEntradasCasillero,
    getArticulosPorSeguimiento,
    getCuentasBanco,
    crearOrdenEntrega,
    asignarOrdenAEntradas
} = require('../controllers/tracking.controller');

/* PESTAÑA 1 — Ver / asignar / editar tracking a artículos sin seguimiento */
router.get('/sin-seguimiento', getArticulosSinSeguimiento);
router.post('/seguimientos', crearSeguimiento);
router.put('/asignar-seguimiento', asignarSeguimientoArticulo);
router.put('/asignar-seguimiento-masivo', asignarSeguimientoMasivo);

/* PESTAÑA 2 — Entrada a casillero */
router.get('/seguimientos', getSeguimientos);
router.post('/entrada-casillero', registrarEntradaCasillero);

/* PESTAÑA 3 — Orden de pago de casillero (multi-tracking) */
router.get('/entradas-casillero', getEntradasCasillero);
router.get('/articulos/:idSeguimiento', getArticulosPorSeguimiento);
router.get('/cuentas', getCuentasBanco);
router.post('/ordenes-entrega', crearOrdenEntrega);
router.put('/ordenes-entrega/asignar', asignarOrdenAEntradas);

module.exports = router;
