const mongoose = require('mongoose');

// Схема склада
const warehouseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: Object, // JSON для хранения местоположения (широта и долгота)
        required: true
    },
    address: {
        type: String, // Поле для хранения преобразованного адреса
        required: true
    },
    type: {
        type: String,
        enum: ['Склад', 'Магазин'], // Возможные типы объекта
        required: true
    }
}, { timestamps: true });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

module.exports = Warehouse;
