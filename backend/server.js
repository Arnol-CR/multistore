const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const listadoPedidosRoutes = require('./routes/listado-pedidos.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const authRoutes         = require('./routes/auth.routes');
const pedidosRoutes      = require('./routes/pedidos.routes');
const trackingRoutes     = require('./routes/tracking.routes');
const vendedoresRoutes   = require('./routes/vendedores.routes');
const clientesRoutes     = require('./routes/clientes.routes');
const pagosRoutes        = require('./routes/pagos.routes');
const crearPedidosRoutes = require('./routes/crear-pedidos.routes');
const cuentasRoutes = require('./routes/cuentas.routes');
const catalogoRoutes = require('./routes/catalogo.routes');

app.use('/api/cuentas', cuentasRoutes);
app.use('/api/auth',          authRoutes);
app.use('/api/pedidos',       pedidosRoutes);
app.use('/api/tracking',      trackingRoutes);
app.use('/api/vendedores',    vendedoresRoutes);
app.use('/api/clientes',      clientesRoutes);
app.use('/api/pagos',         pagosRoutes);
app.use('/api/crear-pedidos', crearPedidosRoutes);
app.use('/api/listado-pedidos', listadoPedidosRoutes);
app.use('/api/catalogo', catalogoRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 MultiStore corriendo en http://localhost:' + PORT);
});