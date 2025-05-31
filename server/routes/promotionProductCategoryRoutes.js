const express = require('express');
const PromotionProductCategory = require('../models/promotionProductCategory');
const router = express.Router();
const Product = require('../models/product');

async function updateProductSaleStatusForProduct(productId) {
    const product = await Product.findById(productId);
    if (!product) return;

    const brand = product.attributes?.['Производитель'] || null;

    const activePromotions = await PromotionProductCategory.find({
        $or: [
            { product_id: productId },
            { category_id: product.category_id },
            { brand_name: brand }
        ]
    }).populate('promotion_id');

    const hasActivePromotion = activePromotions.some(
        p => p.promotion_id?.is_active
    );

    await Product.findByIdAndUpdate(productId, { is_on_sale: hasActivePromotion });
}

// Создание новой записи акции с товаром или категорией
router.post('/promotion-product-category', async (req, res) => {
    const { promotion_id, product_id, category_id } = req.body;

    try {
        const newRecord = new PromotionProductCategory({
            promotion_id,
            product_id,
            category_id
        });

        const savedRecord = await newRecord.save();
        res.status(201).json(savedRecord);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при создании записи", error });
    }
});

// Получение всех записей
router.get('/', async (req, res) => {
    try {
        const records = await PromotionProductCategory.find()
            .populate('promotion_id')
            .populate('product_id')
            .populate('category_id');
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении записей", error });
    }
});

// Получение записи по ID
router.get('/promotion-product-category/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const record = await PromotionProductCategory.findById(id)
            .populate('promotion_id')
            .populate('product_id')
            .populate('category_id');
        if (!record) {
            return res.status(404).json({ message: "Запись не найдена" });
        }
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении записи", error });
    }
});

// Обновление записи по ID
router.put('/promotion-product-category/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const updatedRecord = await PromotionProductCategory.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedRecord) {
            return res.status(404).json({ message: "Запись не найдена" });
        }
        res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при обновлении записи", error });
    }
});

// Удаление записи по ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedRecord = await PromotionProductCategory.findByIdAndDelete(id);
        if (!deletedRecord) {
            return res.status(404).json({ message: "Запись не найдена" });
        }
        res.status(200).json({ message: "Запись удалена", deletedRecord });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при удалении записи", error });
    }
});

module.exports = router;
