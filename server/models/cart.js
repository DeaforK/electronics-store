const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Определение схемы корзины
const cartSchema = new Schema({
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    product_variations_id: {
        type: Schema.Types.ObjectId,  // Внешний ключ на коллекцию вариаций товаров
        ref: 'ProductVariation',
        required: true
    },
    users_id: {
        type: Schema.Types.ObjectId,  // Внешний ключ на коллекцию пользователей
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Экспорт модели
module.exports = mongoose.model('Cart', cartSchema);
