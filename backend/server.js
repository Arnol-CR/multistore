const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const listadoPedidosRoutes = require('./routes/listado-pedidos.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Todas las páginas cargan /assets/auth.js (pone el token en las llamadas a la API)
const fs = require('fs');
const FRONT = path.join(__dirname, '../frontend');
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    const ruta = req.path === '/' ? '/login.html' : req.path;
    if (!ruta.endsWith('.html')) return next();
    const archivo = path.join(FRONT, path.normalize(ruta));
    if (!archivo.startsWith(FRONT)) return next();
    fs.readFile(archivo, 'utf8', (err, html) => {
        if (err) return next();
        res.set('Cache-Control', 'no-cache');
        res.type('html').send(html.replace(/<head([^>]*)>/i, m => m + '\n<script src="/assets/auth.js"></script>\n<link rel="manifest" href="/manifest.webmanifest">\n<link rel="apple-touch-icon" href="/assets/icono-192.png">\n<meta name="theme-color" content="#0d1017">'));
    });
});
app.use(express.static(FRONT));

// Toda la API (menos el login) exige sesión
const { requiereSesion } = require('./middleware/auth.middleware');
app.use('/api', requiereSesion);

const authRoutes         = require('./routes/auth.routes');
const pedidosRoutes      = require('./routes/pedidos.routes');
const trackingRoutes     = require('./routes/tracking.routes');
const vendedoresRoutes   = require('./routes/vendedores.routes');
const clientesRoutes     = require('./routes/clientes.routes');
const pagosRoutes        = require('./routes/pagos.routes');
const crearPedidosRoutes = require('./routes/crear-pedidos.routes');
const cuentasRoutes = require('./routes/cuentas.routes');
const catalogoRoutes = require('./routes/catalogo.routes');
const cotizacionesRoutes = require('./routes/cotizaciones.routes');

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
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/inicio', require('./routes/inicio.routes'));
app.use('/api/finanzas', require('./routes/finanzas.routes'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 MultiStore corriendo en http://localhost:' + PORT);
});