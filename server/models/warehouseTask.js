const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const warehouseTaskSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items: [{
    variation_id: { type: Schema.Types.ObjectId, ref: 'ProductVariation' },
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['Ожидает сборки', 'Собрано', 'Передано'],
    default: 'Ожидает сборки'
  }
}, { timestamps: true });

module.exports = mongoose.model('WarehouseTask', warehouseTaskSchema);
