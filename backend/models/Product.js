const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['In Stock', 'Out of Stock'],
    default: function() {
      return this.stock > 0 ? 'In Stock' : 'Out of Stock';
    }
  },
  image: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

productSchema.pre('save', function(next) {
  this.status = this.stock > 0 ? 'In Stock' : 'Out of Stock';
  next();
});

// Handle findOneAndUpdate, findByIdAndUpdate
productSchema.pre(['findOneAndUpdate', 'findByIdAndUpdate'], function(next) {
  const update = this.getUpdate();
  if (update.stock !== undefined) {
    const stockNumber = parseInt(update.stock) || 0;
    update.stock = stockNumber;
    update.status = stockNumber > 0 ? 'In Stock' : 'Out of Stock';
  }
  next();
});

productSchema.index({ name: 'text', category: 'text', brand: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

module.exports = mongoose.model('Product', productSchema);