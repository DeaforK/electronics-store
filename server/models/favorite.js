const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Определение схемы избранного
const favoriteSchema = new Schema({
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
module.exports = mongoose.model('Favorite', favoriteSchema);
