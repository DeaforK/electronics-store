const mongoose = require('mongoose');

// Схема для таблицы связи акций с товарами и категориями
const promotionProductCategorySchema = new mongoose.Schema({
    promotion_id: {
        type: mongoose.Schema.Types.ObjectId,  // Внешний ключ акции
        ref: 'Promotion',
        required: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,  // Внешний ключ товара (nullable)
        ref: 'Product',
        default: null
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,  // Внешний ключ категории (nullable)
        ref: 'Category',
        default: null
    },
    brand_name: {
        type: String,
        default: null
    },    
}, { timestamps: true });

const PromotionProductCategory = mongoose.model('PromotionProductCategory', promotionProductCategorySchema);

module.exports = PromotionProductCategory;
