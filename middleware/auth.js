const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'billetera_js_secret_key_dev_2026';

/**
 * Middleware de autenticación.
 * Verifica el token JWT enviado en la cabecera Authorization.
 * Si es válido, inyecta req.usuarioId para que las rutas lo usen.
 */
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token de autenticación.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
  }
}

module.exports = { auth, JWT_SECRET };
