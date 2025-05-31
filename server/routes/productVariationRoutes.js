const express = require('express');
const mongoose = require('mongoose');
const ProductVariation = require('../models/productVariation');
const ActivityLog = require('../models/activityLog');
const Product = require('../models/product');
const WarehouseInventory = require('../models/warehouseInventory');
const router = express.Router();

const logActivity = async (userId, actionType, itemId, description) => {
    try {
        const logEntry = new ActivityLog({
            user_id: userId,
            action_type: actionType,
            item_id: itemId,
            description
        });
        await logEntry.save();
    } catch (error) {
        console.error("Ошибка записи в журнал активности:", error.message);
    }
};
const generateBarcode = async () => {
    const prefix = '100'; // Например, префикс компании/типа
    const timestamp = Date.now().toString().slice(-6); // Последние 6 цифр текущего времени
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // случайное число

    const candidate = `${prefix}${timestamp}${random}`; // длина 12

    // Проверка уникальности (для EAN-13 можно потом добавить контрольную цифру)
    const exists = await ProductVariation.findOne({ barcode: candidate });
    if (exists) return generateBarcode(); // рекурсия, пока не найдётся уникальный

    return candidate;
};


router.post('/', async (req, res) => {
    const { attributes, quantity, product_id, price, discount, user_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(product_id)) {
        return res.status(400).json({ message: "Некорректный ID товара" });
    }

    try {
        let parsedAttributes = attributes;
        if (typeof attributes === 'string') {
            parsedAttributes = JSON.parse(attributes);
        }
        if (Array.isArray(parsedAttributes)) {
            parsedAttributes = parsedAttributes[0];
        }
        const barcode = await generateBarcode();

        const newVariation = new ProductVariation({
            attributes: parsedAttributes,
            quantity,
            status: "Закончился",
            product_id,
            price,
            discount,
            barcode
        });
        
        
        const savedVariation = await newVariation.save();

        const product = await Product.findById(product_id);
        if (product && product.status !== 'В Архиве') {
            product.status = 'В наличие';
            await product.save();
        }

        await logActivity(user_id, "Создание вариации", savedVariation._id, `Создана новая вариация товара с ID ${savedVariation._id}`);

        res.status(201).json(savedVariation);
    } catch (error) {
        console.error("Ошибка создания вариации товара:", error);
        res.status(500).json({ message: "Ошибка создания вариации товара", error });
    }
});

// Получение всех вариаций товаров
router.get('/', async (req, res) => {
    try {
        const productVariations = await ProductVariation.find().populate('product_id');
        res.status(200).json(productVariations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка получения вариаций товара", error });
    }
});

// Получение всех активных вариаций товара
router.get('/active', async (req, res) => {
    try {
        const activeVariations = await ProductVariation.find({ status: 'В наличии' }).populate('product_id');
        res.status(200).json(activeVariations);
    } catch (error) {
        console.error("Ошибка получения активных вариаций товара:", error);
        res.status(500).json({ message: "Ошибка получения активных вариаций товара", error });
    }
});

// Получение всех архивированных вариаций товара
router.get('/archived', async (req, res) => {
    try {
        const archivedVariations = await ProductVariation.find({ status: 'В Архиве' });
        res.status(200).json(archivedVariations);
    } catch (error) {
        console.error("Ошибка получения архивированных вариаций товара:", error);
        res.status(500).json({ message: "Ошибка получения архивированных вариаций товара", error });
    }
});

// Маршрут для получения статистики по товарам и их вариациям
router.get('/statistics', async (req, res) => {
    try {
        // Общая статистика
        const totalProducts = await Product.countDocuments();
        const totalVariations = await ProductVariation.countDocuments();

        // Статистика по статусам товаров
        const productStatusStats = await Product.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Статистика по статусам вариаций товаров
        const variationStatusStats = await ProductVariation.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Статистика по дате создания товаров за последние 7 дней
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentProducts = await Product.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            },
        ]);

        // Статистика по дате создания вариаций за последние 30 дней
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentVariations = await ProductVariation.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json({
            totalProducts,
            totalVariations,
            productStatusStats,
            variationStatusStats,
            recentProductsCount: recentProducts[0]?.count || 0,
            recentVariationsCount: recentVariations[0]?.count || 0,
        });
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ message: 'Ошибка при получении статистики', error });
    }
});

// Получение вариации товара по штрихкоду
router.get('/scan/barcode/:barcode', async (req, res) => {
    const { barcode } = req.params;

    if (!barcode) {
        return res.status(400).json({ message: "Штрихкод не указан" });
    }

    try {
        const variation = await ProductVariation.findOne({ barcode }).populate('product_id');
        if (!variation) {
            return res.status(404).json({ message: "Вариация товара с таким штрихкодом не найдена" });
        }
        res.status(200).json(variation);
    } catch (error) {
        console.error("Ошибка при поиске вариации по штрихкоду:", error);
        res.status(500).json({ message: "Ошибка при поиске вариации по штрихкоду", error });
    }
});



// Получение вариации товара по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const productVariation = await ProductVariation.findById(id).populate('product_id');
        if (!productVariation) {
            return res.status(404).json({ message: "Вариация товара не найдена" });
        }
        res.status(200).json(productVariation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка получения вариации товара", error });
    }
});

// Получение вариации товара по ID товара
router.get('/product/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const productVariation = await ProductVariation.find({ product_id: id }).populate('product_id');
        if (!productVariation) {
            return res.status(404).json({ message: "Вариация товара не найдена" });
        }
        res.status(200).json(productVariation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка получения вариации товара", error });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { attributes, quantity, status, price, discount, barcode, user_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Некорректный ID вариации" });
    }

    try {
        const parsedAttributes = JSON.parse(attributes);
        const variation = await ProductVariation.findById(id);
        if (!variation) {
            return res.status(404).json({ message: "Вариация товара не найдена" });
        }

        variation.attributes = parsedAttributes || variation.attributes;
        variation.quantity = quantity !== undefined ? quantity : variation.quantity;
        variation.status = status || variation.status;
        variation.price = price !== undefined ? price : variation.price;
        variation.discount = discount !== undefined ? discount : variation.discount;
        variation.barcode = barcode || variation.barcode;

        await logActivity(user_id, 'Обновление', id, `Обновлена вариация товара с ID ${id}`);

        const updatedVariation = await variation.save();
        res.status(200).json(updatedVariation);
    } catch (error) {
        console.error("Ошибка обновления вариации товара:", error);
        res.status(500).json({ message: "Ошибка обновления вариации товара", error });
    }
});

// "Удаление" вариации товара по ID (меняем статус на "В Архиве")
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    try {
        const productVariation = await ProductVariation.findById(id);
        if (!productVariation) {
            return res.status(404).json({ message: "Вариация товара не найдена" });
        }

        productVariation.status = 'В Архиве';
        await productVariation.save();

        // Логирование действия
        await logActivity(
            userId,
            'Удаление',
            id,
            `Вариация товара с ID ${id} помечена как "В Архиве"`
        );

        res.status(200).json({ message: "Вариация товара помечена как 'Удалена'", productVariation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка при удалении вариации товара", error });
    }
});

// Восстановление вариации товара по ID
router.put('/restore/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const productVariation = await ProductVariation.findById(id);
        if (!productVariation) {
            return res.status(404).json({ message: "Вариация товара не найдена" });
        }

        productVariation.status = 'В наличии';
        await productVariation.save();

        // Логирование действия
        await logActivity(
            userId,
            'Востановление',
            id,
            `Вариация товара с ID ${id} помечена как "В наличии"`
        );

        res.status(200).json({ message: "Вариация товара помечена как 'В наличии'", productVariation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка при востановлении вариации товара", error });
    }
});

// Окончательное удаление вариации из БД
router.delete('/permanent/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    try {
        const productVariation = await ProductVariation.findById(id);
        if (!productVariation) {
            return res.status(404).json({ message: "Вариация товара не найдена" });
        }

        if (productVariation.status === 'В Архиве') {
            // Удаление записи вариации товара
            await ProductVariation.findByIdAndDelete(id);

            // Удаление записей из WarehouseInventory
            const warehouseInventoryResult = await WarehouseInventory.deleteMany({ product_id: id });

            // Логирование действия
            await logActivity(
                userId,
                'Окончательное удаление',
                id,
                `Вариация товара с ID ${id} и связанные записи из WarehouseInventory (${warehouseInventoryResult.deletedCount} шт.) окончательно удалены`
            );

            res.status(200).json({
                message: "Вариация товара и связанные записи из WarehouseInventory окончательно удалены",
                deletedInventoryRecords: warehouseInventoryResult.deletedCount,
            });
        } else {
            res.status(400).json({
                message: "Вариация товара должна быть 'В Архиве' для окончательного удаления"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Ошибка при окончательном удалении вариации товара",
            error
        });
    }
});


module.exports = router;
