const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const jwt      = require('jsonwebtoken');
require('dotenv').config();

const Transaccion  = require('./models/Transaccion');
const Categoria    = require('./models/Categoria');
const SaldoInicial = require('./models/SaldoInicial');
const Usuario      = require('./models/Usuario');
const { auth, JWT_SECRET } = require('./middleware/auth');

const ADMIN_EMAIL = 'cristobal_fear20@live.cl';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir el frontend estático
app.use(express.static(__dirname));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Conectado exitosamente a MongoDB Atlas');
    try {
      // Obtener todos los IDs de usuarios registrados válidos
      const usuariosValidos = await Usuario.find().select('_id');
      const idsValidos = usuariosValidos.map(u => u._id);

      // Eliminar registros huérfanos (sin usuarioId o cuyo usuario ya no existe)
      const txDel  = await Transaccion.deleteMany({ usuarioId: { $nin: idsValidos } });
      const catDel = await Categoria.deleteMany({ usuarioId: { $nin: idsValidos } });
      const salDel = await SaldoInicial.deleteMany({ usuarioId: { $nin: idsValidos } });
      const total  = txDel.deletedCount + catDel.deletedCount + salDel.deletedCount;
      if (total > 0) {
        console.log(`🧹 Limpieza automática: ${total} registro(s) huérfano(s) eliminados de MongoDB`);
      }

      // Asegurar que el usuario admin tenga rol 'admin'
      const adminUser = await Usuario.findOne({ email: ADMIN_EMAIL });
      if (adminUser && adminUser.rol !== 'admin') {
        adminUser.rol = 'admin';
        await adminUser.save();
        console.log(`👑 Rol Admin asignado a ${ADMIN_EMAIL}`);
      }
    } catch (e) {
      console.warn('⚠️ Error en inicialización DB:', e.message);
    }
  })
  .catch((error) => console.error('❌ Error de conexión a MongoDB:', error));

// Generar token JWT
function generarToken(usuario) {
  const esAdmin = usuario.email === ADMIN_EMAIL || usuario.rol === 'admin';
  return jwt.sign(
    { id: usuario._id, email: usuario.email, nombre: usuario.nombre, rol: esAdmin ? 'admin' : 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware para verificar rol de Administrador
async function esAdmin(req, res, next) {
  try {
    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuario.email === ADMIN_EMAIL || usuario.rol === 'admin') {
      req.usuario = usuario;
      return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

// POST /api/auth/registro — crear cuenta
app.post('/api/auth/registro', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const emailClean = email.toLowerCase().trim();
    const existe = await Usuario.findOne({ email: emailClean });
    if (existe) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    const rol = emailClean === ADMIN_EMAIL ? 'admin' : 'user';
    const usuario = new Usuario({ nombre, email: emailClean, password, rol });
    await usuario.save();

    const token = generarToken(usuario);
    res.status(201).json({
      mensaje: 'Cuenta creada exitosamente',
      token,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login — iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const emailClean = email.toLowerCase().trim();
    const usuario = await Usuario.findOne({ email: emailClean });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Si es el admin y su rol aún no es admin en la BD, actualizarlo
    if (emailClean === ADMIN_EMAIL && usuario.rol !== 'admin') {
      usuario.rol = 'admin';
      await usuario.save();
    }

    const token = generarToken(usuario);
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me — obtener datos del usuario actual
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const esAdminUser = usuario.email === ADMIN_EMAIL || usuario.rol === 'admin';
    res.json({
      ...usuario.toObject(),
      rol: esAdminUser ? 'admin' : 'user'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PANEL DE ADMINISTRACIÓN (Solo Admin)
// ============================================================

// GET /api/admin/usuarios — listar todos los usuarios con conteo de datos
app.get('/api/admin/usuarios', auth, esAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select('-password').sort({ createdAt: -1 });

    // Para cada usuario, contar sus transacciones
    const listaConEstadisticas = await Promise.all(
      usuarios.map(async (u) => {
        const txCount  = await Transaccion.countDocuments({ usuarioId: u._id });
        const catCount = await Categoria.countDocuments({ usuarioId: u._id });
        return {
          _id: u._id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol || (u.email === ADMIN_EMAIL ? 'admin' : 'user'),
          createdAt: u.createdAt,
          txCount,
          catCount
        };
      })
    );

    res.json(listaConEstadisticas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/usuarios/:id — eliminar usuario y todos sus datos asociados
app.delete('/api/admin/usuarios/:id', auth, esAdmin, async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Prevenir que el admin se elimine a sí mismo
    if (userIdToDelete === req.usuarioId.toString()) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
    }

    const usuarioTarget = await Usuario.findById(userIdToDelete);
    if (!usuarioTarget) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (usuarioTarget.email === ADMIN_EMAIL) {
      return res.status(400).json({ error: 'No se puede eliminar la cuenta principal de administrador.' });
    }

    // Eliminar usuario y todo su contenido asociado en cascada
    await Transaccion.deleteMany({ usuarioId: userIdToDelete });
    await Categoria.deleteMany({ usuarioId: userIdToDelete });
    await SaldoInicial.deleteMany({ usuarioId: userIdToDelete });
    await Usuario.findByIdAndDelete(userIdToDelete);

    res.json({ mensaje: `Usuario ${usuarioTarget.email} y todos sus datos fueron eliminados correctamente.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta de prueba de la API
app.get('/api', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API de Billetera Personal — funcionando correctamente' });
});

// ============================================================
// TRANSACCIONES (protegidas)
// ============================================================

app.get('/api/transacciones', auth, async (req, res) => {
  try {
    const transacciones = await Transaccion.find({ usuarioId: req.usuarioId }).sort({ fecha: -1 });
    res.json(transacciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transacciones', auth, async (req, res) => {
  try {
    const { tipo, categoria, monto, descripcion, mes, fecha } = req.body;
    const nueva = new Transaccion({ usuarioId: req.usuarioId, tipo, categoria, monto, descripcion, mes, fecha });
    await nueva.save();
    res.status(201).json({ mensaje: 'Transacción guardada', transaccion: nueva });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/transacciones/mes/:mes/tipo/:tipo', auth, async (req, res) => {
  try {
    const result = await Transaccion.deleteMany({
      usuarioId: req.usuarioId,
      mes:  req.params.mes,
      tipo: req.params.tipo
    });
    res.json({ mensaje: result.deletedCount + ' transacción(es) eliminada(s)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transacciones/:id', auth, async (req, res) => {
  try {
    const result = await Transaccion.findOneAndDelete({ _id: req.params.id, usuarioId: req.usuarioId });
    if (!result) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json({ mensaje: 'Transacción eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CATEGORÍAS (protegidas)
// ============================================================

app.get('/api/categorias', auth, async (req, res) => {
  try {
    const categorias = await Categoria.find({ usuarioId: req.usuarioId }).sort({ tipo: 1, nombre: 1 });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categorias', auth, async (req, res) => {
  try {
    const { nombre, tipo } = req.body;
    const nueva = new Categoria({ usuarioId: req.usuarioId, nombre, tipo });
    await nueva.save();
    res.status(201).json({ mensaje: 'Categoría agregada', categoria: nueva });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/categorias/:id', auth, async (req, res) => {
  try {
    const { nombre } = req.body;
    const updated = await Categoria.findOneAndUpdate(
      { _id: req.params.id, usuarioId: req.usuarioId },
      { nombre },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ mensaje: 'Categoría actualizada', categoria: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/categorias/:id', auth, async (req, res) => {
  try {
    const result = await Categoria.findOneAndDelete({ _id: req.params.id, usuarioId: req.usuarioId });
    if (!result) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SALDOS INICIALES (protegidos)
// ============================================================

app.get('/api/saldos', auth, async (req, res) => {
  try {
    const saldos = await SaldoInicial.find({ usuarioId: req.usuarioId });
    res.json(saldos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/saldos/:mes', auth, async (req, res) => {
  try {
    const { monto } = req.body;
    const saldo = await SaldoInicial.findOneAndUpdate(
      { mes: req.params.mes, usuarioId: req.usuarioId },
      { monto },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ mensaje: 'Saldo inicial guardado', saldo });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});