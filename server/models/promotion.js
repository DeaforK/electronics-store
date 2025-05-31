const mongoose = require('mongoose');

// Схема для таблицы акций (promotions)
const promotionSchema = new mongoose.Schema({
    name: {
        type: String,  // Название акции
        required: true,
        maxlength: 255
    },
    description: {
        type: String,  // Описание акции
        required: true
    },
    discount_type: {
        type: String,  // Тип скидки: процентная, фиксированная сумма, подарок
        enum: ['Процент', 'Фиксированная сумма', 'Подарок'],
        required: true
    },
    discount_value: {
        type: mongoose.Types.Decimal128,  // Значение скидки
        required: true
    },
    gift_product_id: {
        type: mongoose.Schema.Types.ObjectId,  // Код подарочного товара (если подарок)
        ref: 'Product',
        required: function() {
            return this.discount_type === 'Подарок';  // Обязательно, если это подарок
        }
    },
    start_date: {
        type: Date,  // Дата начала действия акции
        required: true
    },
    end_date: {
        type: Date,  // Дата окончания действия акции
        required: true
    },
    min_order_amount: {
        type: mongoose.Types.Decimal128,  // Минимальная сумма заказа (nullable)
        default: null
    },
    max_discount: {
        type: mongoose.Types.Decimal128,  // Максимальная сумма скидки (nullable)
        default: null
    },
    is_active: {
        type: Boolean,  // Статус акции: активна или нет
        default: true
    },
    is_combinable: {
        type: Boolean,  // Возможность комбинирования с другими акциями
        default: false
    },
    background_color: {
        type: String,
        default: '#FFFFFF' // Можно задать дефолтный цвет, например белый
    },
    banner: {
        type: String,  // HTML-код баннера акции
        default: "",  // Пустая строка, если баннер не задан
    }
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
