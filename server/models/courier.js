const mongoose = require('mongoose');

// Схема курьера
const courierSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Внешний ключ на таблицу users
        required: true
    },
    current_orders: [  // изменено с current_order_id
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        }
    ],
    warehouse_task: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WarehouseTask'
        }
    ],
    status: {
        type: String,
        enum: ['доступен', 'занят', 'недоступен'],  // Возможные статусы курьера
        default: 'недоступен'  // По умолчанию курьер доступен
    },
    delivery_area: {
        type: Object,  // JSON для хранения области доставки
        required: true
    },
    location: {
        type: Object,  // JSON для хранения текущего местоположения
        required: true
    },
    vehicle_type: {
        type: String,  // Тип транспорта
        required: true
    }
}, { timestamps: true });

const Courier = mongoose.model('Courier', courierSchema);

module.exports = Courier;
