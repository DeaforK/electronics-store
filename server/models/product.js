const mongoose = require('mongoose');

// Схема для товаров
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['В наличие', 'Закончился', 'В Архиве', 'В Архиве из-за Категории'],
        default: 'Закончился'
    },
    images: {
        type: Array,
        default: []
    },
    rating: {
        type: mongoose.Types.Decimal128,
        default: 0.00
    },
    attributes: {
        type: Object,
        default: {}
    },
    categories_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    bonus_points: {
        type: Number,
        default: 0
    },
    is_on_sale: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Метод для обновления статуса товара
productSchema.statics.updateProductStatus = async function (productId) {
    try {
        // Динамически получаем модель ProductVariation
        const ProductVariation = mongoose.model('ProductVariation');
        
        // Находим все вариации для данного товара
        const variations = await ProductVariation.find({ product_id: productId });

        // Считаем общее количество всех вариаций
        const totalQuantity = variations.reduce((sum, variation) => sum + variation.quantity, 0);

        // Обновляем статус товара
        const product = await this.findById(productId);
        if (!product) throw new Error('Товар не найден');

        product.status = totalQuantity > 0 ? 'В наличие' : 'Закончился';
        await product.save();
        console.log(`Статус товара с ID ${productId} обновлен: ${product.status}`);
    } catch (error) {
        console.error(`Ошибка при обновлении статуса товара с ID ${productId}: ${error.message}`);
        throw new Error('Ошибка при обновлении статуса товара');
    }
};

module.exports = mongoose.model('Product', productSchema);
