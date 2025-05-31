const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Определение схемы отзыва
const reviewSchema = new Schema({
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Schema.Types.Decimal128,
        required: true,
        min: 0,
        max: 5
    },
    users_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }
}, { timestamps: true });

// Экспорт модели
module.exports = mongoose.model('Review', reviewSchema);
