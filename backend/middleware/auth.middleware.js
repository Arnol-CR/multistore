/**
 * Sesión con token (JWT).
 * - El login firma un token con el Id del vendedor y si es administrador.
 * - Toda llamada a /api/* debe traer "Authorization: Bearer <token>".
 * - El servidor toma la identidad del TOKEN, no de lo que mande el navegador:
 *   idVendedor/esAdmin en la URL e idUsuario en el cuerpo se reemplazan por los del token.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('⚠  Falta JWT_SECRET en el .env: se usa una clave temporal y las sesiones se cierran al reiniciar el servidor.');
}
const DURACION = process.env.JWT_DURACION || '12h';

// Rutas que NO piden sesión (relativas a /api)
const PUBLICAS = [/^\/auth\/login$/, /^\/cotizaciones\/img$/];

function firmar(u) {
  return jwt.sign({ id: u.id, esAdmin: !!u.esAdmin }, SECRET, { expiresIn: DURACION });
}

function requiereSesion(req, res, next) {
  if (PUBLICAS.some(r => r.test(req.path))) return next();
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, sesion: false, error: 'Iniciá sesión para continuar.' });
  let datos;
  try { datos = jwt.verify(token, SECRET); }
  catch (e) { return res.status(401).json({ ok: false, sesion: false, error: 'La sesión expiró. Volvé a iniciar sesión.' }); }

  req.usuario = { id: datos.id, esAdmin: !!datos.esAdmin };
  // Identidad desde el token: nadie puede hacerse pasar por otro usuario o por administrador
  const q = { ...req.query };
  if ('idVendedor' in q || 'esAdmin' in q) { q.idVendedor = String(datos.id); q.esAdmin = datos.esAdmin ? '1' : '0'; }
  Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true, enumerable: true });
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) req.body.idUsuario = datos.id;
  next();
}

function soloAdmin(req, res, next) {
  if (req.usuario && req.usuario.esAdmin) return next();
  res.status(403).json({ ok: false, error: 'Solo el administrador puede hacer esto.' });
}

module.exports = { firmar, requiereSesion, soloAdmin };
