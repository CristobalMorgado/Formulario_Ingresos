const mongoose = require('mongoose');

const transaccionSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tipo: {
    type: String,
    enum: ['ingreso', 'gasto'],
    required: [true, 'El tipo es obligatorio']
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es obligatoria'],
    trim: true
  },
  monto: {
    type: Number,
    required: [true, 'El monto es obligatorio'],
    min: [0, 'El monto no puede ser negativo']
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  mes: {
    type: String,
    required: [true, 'El mes es obligatorio'],
    match: [/^\d{4}-\d{2}$/, 'El mes debe tener formato YYYY-MM']
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaccion', transaccionSchema);
