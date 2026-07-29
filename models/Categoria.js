const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  tipo: {
    type: String,
    enum: ['ingreso', 'gasto'],
    required: [true, 'El tipo es obligatorio']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Categoria', categoriaSchema);
