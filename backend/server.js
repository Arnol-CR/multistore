const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const authRoutes = require('./routes/auth.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const trackingRoutes = require('./routes/tracking.routes');
const vendedoresRoutes = require('./routes/vendedores.routes');
const clientesRoutes = require('./routes/clientes.routes');
const pagosRoutes = require('./routes/pagos.routes');

app.use('/api/auth', authRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/pagos', pagosRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 MultiStore corriendo en http://localhost:' + PORT);
});
