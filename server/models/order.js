const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Определение схемы заказа
const orderSchema = new Schema({
    status: {
        type: String,
        enum: ["Ожидает", "Обрабатывается", "Доставлено", "Отменено", "Задерживается"],
        required: true
    },
    date_delivery: {
        type: Date,
    },
    payment_method: {
        type: String,
        enum: ['Картой', 'Наличные'],
        required: true
    },
    total_amount: {
        type: Schema.Types.Decimal128,
        required: true
    },
    tax: {
        type: Schema.Types.Decimal128,
        required: true
    },
    order_items: [{
        product_variation_id: {
            type: Schema.Types.ObjectId,
            ref: 'ProductVariation',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        // Можно позже использовать для аналитики
        source_warehouse_id: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse'
        }
    }],
    users_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    delivery_methods_id: {
        type: Schema.Types.ObjectId,
        ref: 'DeliveryMethod',
        required: true
    },
    courier_id: {
        type: Schema.Types.ObjectId,
        ref: 'Courier'
    },
    bonus_points_used: {
        type: Number,
        default: 0
    },
    discount_applied: {
        type: Schema.Types.Decimal128,
        default: 0.00
    },
    warehouse_id: {
        fulfillment_warehouse_id: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse'
        },
        assembled_from_warehouses: [{
            type: Schema.Types.ObjectId,
            ref: 'Warehouse'
        }]
    },
    delivery_data: { // Новое поле для данных о доставке
        recipient_name: { type: String, required: true }, // Имя получателя
        phone: { type: String, required: true }, // Телефон получателя
        address: { type: String, required: true }, // Адрес доставки
        location: { // Координаты доставки (широта, долгота)
            lat: { type: Number, required: false },
            lng: { type: Number, required: false }
        },
        additional_info: { type: String }, // Дополнительная информация (например, подъезд, код домофона)
        delivery_method: { type: String },
        delivery_parts: { type: Object}
    },
    requires_assembly: Boolean, //чтобы понимать, нужно ли собирать заказ из разных точек
    assembly_time_hours: {
        type: Schema.Types.Decimal128,
        default: 0.00
    },
    estimated_delivery_datetime: {
        type: Date,
        required: true
    },
    assembly_log: [{
        status: String, // например, 'ожидает', 'в пути', 'на складе'
        warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
        timestamp: Date,
        note: String
    }]
}, { timestamps: true });

// Экспорт модели
module.exports = mongoose.model('Order', orderSchema);
