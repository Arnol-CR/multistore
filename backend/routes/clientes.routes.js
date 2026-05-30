const express = require('express');
const router = express.Router();
const { getClientes } = require('../controllers/clientes.controller');
router.get('/', getClientes);
module.exports = router;
