const express = require('express');
const router  = express.Router();
const {
  getTiendas, getCasilleros, getMonedas, getArticulos,
  getNumeroPedido, crearPedido, getPedidosAbiertos,
  getDetallesPedido, agregarArticulo, editarArticulo,
  actualizarCuentaPedido, eliminarArticulo
} = require('../controllers/crear-pedidos.controller');

router.get('/tiendas',          getTiendas);
router.get('/casilleros',       getCasilleros);
router.get('/monedas',          getMonedas);
router.get('/articulos',        getArticulos);
router.get('/numero-pedido',    getNumeroPedido);
router.post('/crear',           crearPedido);
router.get('/pedidos-abiertos', getPedidosAbiertos);
router.get('/detalles',         getDetallesPedido);
router.post('/agregar',         agregarArticulo);
router.put('/editar-articulo',  editarArticulo);
router.put('/cuenta-pedido',    actualizarCuentaPedido);
router.delete('/articulo',      eliminarArticulo);
router.put('/foto',            require('../controllers/crear-pedidos.controller').cambiarFoto);

module.exports = router;