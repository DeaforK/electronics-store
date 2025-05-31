const mongoose = require('mongoose');

// Схема для истории лояльности (баллы)
const loyaltyHistorySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,  // Внешний ключ для пользователя
        ref: 'User',
        required: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,  // Внешний ключ для заказа
        ref: 'Order',
        required: false
    },
    change_type: {
        type: String,  // Тип изменения баллов: начисление, списание
        enum: ['начисление', 'списание'],
        required: true
    },
    points: {
        type: Number,  // Количество измененных баллов
        required: true
    },
    comment: {
        type: String,  // Комментарий к изменению баллов
        maxlength: 255
    }
}, { timestamps: true });

const LoyaltyHistory = mongoose.model('LoyaltyHistory', loyaltyHistorySchema);

module.exports = LoyaltyHistory;
