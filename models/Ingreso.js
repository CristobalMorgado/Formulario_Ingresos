const mongoose = require('mongoose');

const ingresoSchema = new mongoose.Schema({
  monto: {
    type: Number,
    required: [true, 'El monto es obligatorio']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    trim: true
  },
  categoria: {
    type: String,
    default: 'General'
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Agrega automáticamente campos createdAt y updatedAt
});

module.exports = mongoose.model('Ingreso', ingresoSchema);