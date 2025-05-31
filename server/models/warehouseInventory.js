// models/warehouseInventory.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const warehouseInventorySchema = new Schema({
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'ProductVariation',
        required: true
    },
    warehouse_id: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    }
}, { timestamps: true });

// Экспорт модели
module.exports = mongoose.model('WarehouseInventory', warehouseInventorySchema);
