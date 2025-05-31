const mongoose = require('mongoose');

// Схема для вариаций товара
const productVariationSchema = new mongoose.Schema({
    attributes: {
        type: Object,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['В наличии', 'Закончился', 'В Архиве'],
        default: 'В наличии'
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    price: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    discount: {
        type: mongoose.Types.Decimal128,
        default: 0.00
    },
    barcode: {
        type: String,
        maxlength: 50,
        unique: true
    }
}, { timestamps: true });

// Автоматическое обновление статуса товара
productVariationSchema.pre('save', async function (next) {
    try {
        if (this.status === 'В Архиве') {
            return next();
        }
        const Product = mongoose.model('Product');
        await Product.updateProductStatus(this.product_id);
        next();
    } catch (error) {
        console.error(`Ошибка при обновлении статуса товара с ID ${this.product_id}: ${error.message}`);
        next(error);
    }
});

module.exports = mongoose.model('ProductVariation', productVariationSchema);
