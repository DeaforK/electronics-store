const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Схема условия, влияющего на стоимость доставки
const conditionSchema = new Schema({
    // Тип условия: вес, объём, расстояние или сумма заказа
    condition_type: {
        type: String,
        enum: ['Вес', 'Объём', 'Расстояние', 'Сумма заказа'],
        required: true
    },
    // Минимальное значение диапазона (включительно)
    min: Schema.Types.Decimal128,

    // Максимальное значение диапазона (включительно)
    max: Schema.Types.Decimal128,

    // Модификатор стоимости (доплата в рублях)
    cost_modifier: Schema.Types.Decimal128
}, { _id: false });

// Схема метода доставки
const deliveryMethodSchema = new Schema({
    // Название метода доставки (отображается пользователю и администратору)
    name: {
        type: String,
        required: true
    },

    // Базовая стоимость доставки (в рублях)
    base_cost: {
        type: Schema.Types.Decimal128,
        required: true
    },

    // Срок доставки (например, "1-2 дня")
    delivery_time_days: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },

    // Тип доставки
    type: {
        type: String,
        enum: ['Курьерская', 'Самовывоз'], // Удалил  почту
        required: true
    },

    // Географическая зона доставки
    zone: {
        type: String,
        enum: ['Локальная', 'Региональная', 'Межрегиональная'], // можно заменить на custom зоны, если понадобится
        required: true
    },

    // Условия, которые влияют на стоимость (надбавки за вес, объём и т.п.)
    conditions: [conditionSchema],

    // Бесплатная доставка при заказе от указанной суммы
    free_from: Schema.Types.Decimal128,

    // Ограничение по расстоянию, в км (например, курьер работает в радиусе 20 км)
    distance_limit_km: Schema.Types.Decimal128,

    // Активен ли метод доставки (для временного отключения)
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryMethod', deliveryMethodSchema);
