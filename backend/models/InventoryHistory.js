const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  oldQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  changeAmount: {
    type: Number,
    required: true
  },
  changeType: {
    type: String,
    enum: ['increase', 'decrease', 'adjustment'],
    required: true
  },
  reason: {
    type: String,
    default: 'Manual update'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

inventoryHistorySchema.index({ productId: 1, createdAt: -1 });
inventoryHistorySchema.index({ userId: 1 });

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);