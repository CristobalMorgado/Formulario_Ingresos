const mongoose = require('mongoose');

const saldoInicialSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  mes: {
    type: String,
    required: [true, 'El mes es obligatorio'],
    match: [/^\d{4}-\d{2}$/, 'El mes debe tener formato YYYY-MM']
  },
  monto: {
    type: Number,
    required: [true, 'El monto es obligatorio'],
    min: [0, 'El monto no puede ser negativo'],
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SaldoInicial', saldoInicialSchema);
