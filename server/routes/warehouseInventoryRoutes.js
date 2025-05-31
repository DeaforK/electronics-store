const express = require('express');
const router = express.Router();
const WarehouseInventory = require('../models/warehouseInventory');
const Product = require('../models/productVariation');
const ProductModel = require('../models/product'); // Подключаем модель товара
const Warehouse = require('../models/warehouse');
const ActivityLog = require('../models/activityLog');
const mongoose = require('mongoose');

async function updateProductVariationQuantity(product_id) {
    const total = await WarehouseInventory.aggregate([
        { $match: { product_id: new mongoose.Types.ObjectId(product_id) } },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
    ]);

    const totalQuantity = total.length ? total[0].total : 0;

    // Определение нового статуса
    const status = totalQuantity === 0 ? 'Закончился' : 'В наличии';

    // Обновляем quantity и статус
    await Product.findByIdAndUpdate(product_id, {
        quantity: totalQuantity,
        status
    });

    // ⬇️ Добавить это:
    const variation = await Product.findById(product_id);
    if (variation) {
        await ProductModel.updateProductStatus(variation.product_id);
    }
}

// Добавление нового запаса на складе (с проверкой существующей записи)
router.post('/', async (req, res) => {
    const { product_id, warehouse_id, quantity, user_id } = req.body;

    try {
        const product = await Product.findById(product_id).populate("product_id");
        const warehouse = await Warehouse.findById(warehouse_id);

        if (!product || !warehouse) {
            return res.status(400).send({ message: "Продукт или склад не найдены" });
        }

        const existingInventory = await WarehouseInventory.findOne({ product_id, warehouse_id });

        if (existingInventory) {
            const oldQuantity = existingInventory.quantity;
            existingInventory.quantity += quantity;
            await existingInventory.save();

            // Обновление общей quantity в ProductVariation
            await updateProductVariationQuantity(product_id);

            await ActivityLog.create({
                user_id,
                action_type: 'Обновление количества',
                item_id: existingInventory._id,
                description: `Увеличено количество товара ${product.name} на складе ${warehouse.name} с ${oldQuantity} до ${existingInventory.quantity}`
            });

            return res.status(200).send({ message: "Количество обновлено", inventory: existingInventory });
        }

        const inventoryItem = new WarehouseInventory({ product_id, warehouse_id, quantity });
        await inventoryItem.save();

        // Обновление общей quantity в ProductVariation
        await updateProductVariationQuantity(product_id);

        await ActivityLog.create({
            user_id,
            action_type: 'Добавление товара',
            item_id: inventoryItem._id,
            description: `Добавлен новый запас для товара ${product.product_id.name} на складе ${warehouse.name} в количестве ${quantity}`
        });

        res.status(201).send({ message: "Запас успешно добавлен", inventory: inventoryItem });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка сервера", error });
    }
});



// Получение всех запасов на складах
router.get('/', async (req, res) => {
    try {
        const inventoryItems = await WarehouseInventory.find()
            .populate('product_id warehouse_id');
        res.status(200).send(inventoryItems);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении запасов", error });
    }
});
// Получение всех запасов в магазинах
router.get('/shop', async (req, res) => {
    try {
        const inventoryItems = await WarehouseInventory.find()
            .populate({
                path: 'warehouse_id',
                match: { type: 'Магазин' } // Фильтруем только те, где тип "Магазин"
            })
            .populate('product_id');

        // Убираем записи, где warehouse_id отсутствует из-за фильтрации
        const filteredItems = inventoryItems.filter(item => item.warehouse_id);

        res.status(200).send(filteredItems);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении запасов", error });
    }
});

// Получение запасов по ID склада
router.get('/warehouse/:warehouseId', async (req, res) => {
    const { warehouseId } = req.params;

    try {
        const inventoryItems = await WarehouseInventory.find({ warehouse_id: warehouseId })
            .populate('product_id warehouse_id');
        res.status(200).send(inventoryItems);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении запасов", error });
    }
});

// Получение всех складов и магазинов, где есть конкретная вариация
router.get('/by-variation/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Некорректный ID вариации" });
    }

    try {
        const warehousesWithVariation = await WarehouseInventory.find({ product_id: id, quantity: { $gt: 0 } })
            .populate('warehouse_id'); // Предполагается, что warehouse_id связан с коллекцией складов

        if (warehousesWithVariation.length === 0) {
            return res.status(404).json({ message: "Вариация не найдена ни на одном складе" });
        }

        // // Можно вернуть только нужные данные склада + количество
        // const result = warehousesWithVariation.map(entry => ({
        //     warehouse: entry.warehouse_id,
        //     quantity: entry.quantity,
        //     reserved: entry.reserved,
        //     available: entry.quantity - (entry.reserved || 0),
        // }));

        res.status(200).json(warehousesWithVariation);
    } catch (error) {
        console.error("Ошибка при получении складов с вариацией:", error);
        res.status(500).json({ message: "Ошибка при получении складов", error });
    }
});


// Обновление количества запаса по ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity, user_id } = req.body;

    try {
        const inventoryItem = await WarehouseInventory.findById(id);
        if (!inventoryItem) {
            return res.status(404).send({ message: "Запас не найден" });
        }

        const oldQuantity = inventoryItem.quantity;
        inventoryItem.quantity = quantity;
        await inventoryItem.save();

        // Обновление общей quantity в ProductVariation
        await updateProductVariationQuantity(inventoryItem.product_id);

        await ActivityLog.create({
            user_id,
            action_type: 'Обновление запаса',
            item_id: inventoryItem._id,
            description: `Обновлено количество запаса с ${oldQuantity} до ${quantity}`
        });

        res.status(200).send({ message: "Количество запаса обновлено", inventory: inventoryItem });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при обновлении запаса", error });
    }
});


// Удаление запаса по ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;

    try {
        const inventoryItem = await WarehouseInventory.findById(id);
        if (!inventoryItem) {
            return res.status(404).send({ message: "Запас не найден" });
        }

        const productId = inventoryItem.product_id;
        await inventoryItem.remove();

        // Обновление общей quantity в ProductVariation
        await updateProductVariationQuantity(productId);

        await ActivityLog.create({
            user_id,
            action_type: 'Удаление запаса',
            item_id: id,
            description: `Удалён запас с ID ${id}`
        });

        res.status(200).send({ message: "Запас успешно удален" });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при удалении запаса", error });
    }
});

// Перенос вариации товара с одного склада на другой
router.post('/transfer', async (req, res) => {
    const { product_id, from_warehouse_id, to_warehouse_id, quantity, user_id } = req.body;

    if (!product_id || !from_warehouse_id || !to_warehouse_id || !quantity || !user_id) {
        return res.status(400).send({ message: "Все поля обязательны" });
    }

    if (from_warehouse_id === to_warehouse_id) {
        return res.status(400).send({ message: "Склады должны быть разными" });
    }

    try {
        const product = await Product.findById(product_id).populate("product_id");
        const fromWarehouse = await Warehouse.findById(from_warehouse_id);
        const toWarehouse = await Warehouse.findById(to_warehouse_id);

        if (!product || !fromWarehouse || !toWarehouse) {
            return res.status(404).send({ message: "Продукт или склады не найдены" });
        }

        const fromInventory = await WarehouseInventory.findOne({ product_id, warehouse_id: from_warehouse_id });
        if (!fromInventory || fromInventory.quantity < quantity) {
            return res.status(400).send({ message: "Недостаточно товара на исходном складе" });
        }

        // Уменьшаем количество на исходном складе
        const oldFromQty = fromInventory.quantity;
        fromInventory.quantity -= quantity;
        await fromInventory.save();

        // Увеличиваем количество на целевом складе
        const toInventory = await WarehouseInventory.findOne({ product_id, warehouse_id: to_warehouse_id });
        let oldToQty = 0;

        if (toInventory) {
            oldToQty = toInventory.quantity;
            toInventory.quantity += quantity;
            await toInventory.save();
        } else {
            const newInventory = new WarehouseInventory({
                product_id,
                warehouse_id: to_warehouse_id,
                quantity
            });
            await newInventory.save();
        }
        // console.log(product)
        // Логируем операцию
        await ActivityLog.create([{
            user_id,
            action_type: 'Перенос запаса',
            item_id: product_id,
            description: `Перенос ${quantity} шт. товара ${product.product_id.name} с ${fromWarehouse.name} (${oldFromQty} → ${fromInventory.quantity}) на ${toWarehouse.name} (${oldToQty} → ${oldToQty + quantity})`
        }]);

        res.status(200).send({ message: "Перенос выполнен успешно" });
    } catch (error) {
        console.error("Ошибка при переносе товара:", error);
        res.status(500).send({ message: "Ошибка при переносе", error });
    }
});

// Маршрут для получения статистики складов и магазинов
router.get('/statistics', async (req, res) => {
    try {
        // 1. Статистика по количеству товаров на складах и в магазинах
        const inventorySummary = await WarehouseInventory.aggregate([
            {
                $lookup: {
                    from: "warehouses",
                    localField: "warehouse_id",
                    foreignField: "_id",
                    as: "warehouse",
                },
            },
            {
                $unwind: "$warehouse",
            },
            {
                $group: {
                    _id: "$warehouse.type",
                    totalProducts: { $sum: "$quantity" },
                    warehousesCount: { $addToSet: "$warehouse._id" },
                },
            },
            {
                $project: {
                    type: "$_id",
                    totalProducts: 1,
                    warehousesCount: { $size: "$warehousesCount" },
                    _id: 0,
                },
            },
        ]);

        // 2. Общая статистика по складам и магазинам
        const warehouseSummary = await Warehouse.aggregate([
            {
                $group: {
                    _id: "$type",
                    totalWarehouses: { $sum: 1 },
                },
            },
            {
                $project: {
                    type: "$_id",
                    totalWarehouses: 1,
                    _id: 0,
                },
            },
        ]);

        // 3. История активности
        const recentActivity = await ActivityLog.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate("user_id", "name email")
            .select("action_type description timestamp user_id");

        // 4. Общая статистика по продуктам
        const productSummary = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: "$quantity" },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalProducts: 1,
                    totalStock: 1,
                },
            },
        ]);

        res.status(200).json({
            inventorySummary,
            warehouseSummary,
            recentActivity,
            productSummary: productSummary[0] || { totalProducts: 0, totalStock: 0 },
        });
    } catch (error) {
        console.log("Ошибка при получении статистики:", error);
        res.status(500).json({ message: "Ошибка при получении статистики", error });
    }
});


module.exports = router;
