const Order = require('../models/order');
const { User } = require('../models/user');
const Warehouse = require('../models/warehouse');
const WarehouseInventory = require('../models/warehouseInventory');
const WarehouseTask = require('../models/warehouseTask');
const ProductVariation = require('../models/productVariation');
const Promotion = require('../models/promotion');
const PromotionProductCategory = require('../models/promotionProductCategory');
const LoyaltyHistory = require('../models/loyaltyHistory');
const inventoryService = require('../services/inventoryService');
const reportService = require('../services/reportService');
const promotionService = require('../services/promotionService');

const mongoose = require('mongoose');

const reportController = {
    // I. Финансовая отчётность

    // 1. Доход, скидки, налог, чистая прибыль по месяцам (уже есть)
    async getFinancialSummary(req, res) {
        try {
            const { startDate, endDate, groupBy = 'month' } = req.query;

            const matchStage = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status: { $in: ['Доставлено', 'Обрабатывается'] }
            };

            const groupFormat = {
                month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                quarter: {
                    $concat: [
                        { $toString: { $year: "$createdAt" } },
                        "-Q",
                        { $toString: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } } }
                    ]
                }
            };

            const grouped = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: groupFormat[groupBy],
                        ordersCount: { $sum: 1 },
                        totalRevenue: { $sum: "$total_amount" },
                        totalTax: { $sum: "$tax" },
                        totalDiscount: { $sum: "$discount_applied" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            const formatted = grouped.map(item => ({
                period: item._id,
                orders: item.ordersCount,
                revenue: parseFloat(item.totalRevenue),
                tax: parseFloat(item.totalTax),
                discount: parseFloat(item.totalDiscount),
                netRevenue: parseFloat(item.totalRevenue) - parseFloat(item.totalTax) - parseFloat(item.totalDiscount)
            }));

            res.status(200).json({ success: true, data: formatted });

        } catch (error) {
            console.error('Ошибка при формировании финансового отчёта:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 2. Налоговые отчисления по ставкам (группировка по налоговой ставке)
    async getTaxReport(req, res) {
        try {
            const { startDate, endDate, groupBy = 'month' } = req.query;

            const matchStage = {
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
                status: { $in: ['Доставлено', 'Обрабатывается'] }
            };

            const groupFormat = {
                month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                quarter: {
                    $concat: [
                        { $toString: { $year: "$createdAt" } },
                        "-Q",
                        { $toString: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } } }
                    ]
                }
            };

            const grouped = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            period: groupFormat[groupBy],
                            taxRate: "$tax_rate"
                        },
                        totalTaxAmount: { $sum: "$tax" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.period": 1, "_id.taxRate": 1 } }
            ]);

            const formatted = grouped.map(item => ({
                period: item._id.period,
                taxRate: item._id.taxRate,
                totalTax: item.totalTaxAmount,
                ordersCount: item.count
            }));

            res.status(200).json({ success: true, data: formatted });

        } catch (error) {
            console.error('Ошибка при формировании налогового отчёта:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 3. Статистика отменённых заказов и задолженностей
    async getCanceledOrdersStats(req, res) {
        try {
            // Статистика по отменённым заказам, группировка по дате
            const { startDate, endDate, groupBy = 'month' } = req.query;

            const matchStage = {
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
                status: "Отменён"
            };

            const groupFormat = {
                month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            };

            const grouped = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: groupFormat[groupBy],
                        canceledOrdersCount: { $sum: 1 },
                        canceledOrdersSum: { $sum: "$total_amount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            res.status(200).json({ success: true, data: grouped });
        } catch (error) {
            console.error('Ошибка при получении статистики отменённых заказов:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 4. Распределение заказов по способам оплаты
    async getPaymentMethodsDistribution(req, res) {
        try {
            const { startDate, endDate } = req.query;

            const matchStage = {
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
                status: { $in: ['Доставлено', 'Обрабатывается'] }
            };

            const distribution = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$payment_method",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$total_amount" }
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]);

            res.status(200).json({ success: true, data: distribution });
        } catch (error) {
            console.error('Ошибка при формировании отчёта по способам оплаты:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },


    // II. Складские отчёты

    // 5. Остатки по складам
    async getCurrentStockByWarehouse(req, res) {
        try {
            const stocks = await WarehouseInventory.aggregate([
                // Подтянуть информацию о вариации
                {
                    $lookup: {
                        from: "productvariations",
                        localField: "product_id", // это ID вариации!
                        foreignField: "_id",
                        as: "variation"
                    }
                },
                { $unwind: "$variation" },

                // Подтянуть информацию о продукте
                {
                    $lookup: {
                        from: "products",
                        localField: "variation.product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                { $unwind: "$product" },

                // Собираем enriched product
                {
                    $addFields: {
                        enrichedProduct: {
                            variation_id: "$product_id",
                            sku: "$variation.sku",
                            attributes: "$variation.attributes",
                            product_id: "$product._id",
                            name: "$product.name",
                            brand: "$product.attributes.brand_name",
                            quantity: "$quantity"
                        }
                    }
                },

                // Группируем по складу
                {
                    $group: {
                        _id: "$warehouse_id",
                        totalQuantity: { $sum: "$quantity" },
                        products: { $push: "$enrichedProduct" }
                    }
                },

                // Подтянуть название склада
                {
                    $lookup: {
                        from: "warehouses",
                        localField: "_id",
                        foreignField: "_id",
                        as: "warehouse"
                    }
                },
                { $unwind: "$warehouse" },

                // Финальное представление
                {
                    $project: {
                        _id: 1,
                        warehouseName: "$warehouse.name",
                        totalQuantity: 1,
                        products: 1
                    }
                }
            ]);

            res.status(200).json({ success: true, data: stocks });
        } catch (error) {
            console.error('Ошибка при формировании отчёта по остаткам на складах:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 6. Оборачиваемость товара (Days on Hand) - упрощённая версия
    async getSlowMovingProducts(req, res) {
        try {
            const { thresholdDays = 90 } = req.query;

            // Вычисляем дату сдвига назад
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

            // Ищем товары, которые не продавались за thresholdDays (по variation)
            // Здесь можно использовать логику по OrderItems и датам последних продаж

            // Для простоты — считаем по последней дате продажи из Order
            const slowProducts = await ProductVariation.aggregate([
                {
                    $lookup: {
                        from: "orders",
                        let: { variationId: "$_id" },
                        pipeline: [
                            { $match: { status: { $in: ['Доставлено', 'Обрабатывается'] } } },
                            { $unwind: "$items" },
                            { $match: { $expr: { $eq: ["$items.variation_id", "$$variationId"] } } },
                            { $sort: { createdAt: -1 } },
                            { $limit: 1 },
                            { $project: { lastSoldAt: "$createdAt" } }
                        ],
                        as: "lastSale"
                    }
                },
                {
                    $addFields: {
                        lastSaleDate: { $arrayElemAt: ["$lastSale.lastSoldAt", 0] }
                    }
                },
                {
                    $match: {
                        $or: [
                            { lastSaleDate: { $exists: false } },
                            { lastSaleDate: { $lte: thresholdDate } }
                        ]
                    }
                }
            ]);

            res.status(200).json({ success: true, data: slowProducts });

        } catch (error) {
            console.error('Ошибка при получении неликвидных товаров:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 7. История изменений склада (складских остатков и задач)
    async getInventoryChangesHistory(req, res) {
        try {
            // Допустим, есть лог изменения WarehouseInventory и WarehouseTask
            // Для примера агрегируем события задач и изменения остатков за период

            const { startDate, endDate } = req.query;

            const inventoryChanges = await WarehouseInventory.aggregate([
                {
                    $match: {
                        updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                    }
                },
                {
                    $project: {
                        product_variation_id: 1,
                        warehouse_id: 1,
                        quantity: 1,
                        updatedAt: 1
                    }
                }
            ]);

            const tasksChanges = await WarehouseTask.aggregate([
                {
                    $match: {
                        updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                    }
                },
                {
                    $project: {
                        order_id: 1,
                        status: 1,
                        warehouse_id: 1,
                        updatedAt: 1
                    }
                }
            ]);

            res.status(200).json({ success: true, data: { inventoryChanges, tasksChanges } });

        } catch (error) {
            console.error('Ошибка при формировании истории изменений склада:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    async getWarehouseTurnoverRate(req, res) {
        try {
            const { warehouseId } = req.query;

            if (!warehouseId) {
                return res.status(400).json({ error: 'warehouseId обязателен' });
            }
            const turnoverRate = await inventoryService.calculateTurnoverRate({ warehouseId });

            res.json({ success: true, data: { warehouseId, turnoverRate } });
        } catch (error) {
            console.error('Ошибка расчёта оборачиваемости:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    },


    // III. Отчёты по продажам и клиентам

    async getCustomerLifetimeValue(req, res) {
        try {
            const { userId } = req.params;
            console.log(userId)
            const ltv = await reportService.calculateCustomerLTV({ userId });

            res.json({ success: true, data: { ltv } });
        } catch (error) {
            console.error('Ошибка LTV:', error);
            res.status(500).json({ error: 'Ошибка расчёта LTV' });
        }
    },

    async getLoyaltyPointsUsage(req, res) {
        try {
            const result = await reportService.getLoyaltyStats();
            res.json({ success: true, data: { result } });
        } catch (err) {
            console.error('Ошибка анализа лояльности:', err);
            res.status(500).json({ error: 'Ошибка получения статистики лояльности' });
        }
    },

    async getPromotionEffectiveness(req, res) {
        try {
            const { promotionId } = req.params;
            const result = await promotionService.analyzePromotionEffectiveness(promotionId);
            res.json({ success: true, data: { result } });
        } catch (err) {
            console.error('Ошибка анализа эффективности акции:', err);
            res.status(500).json({ error: 'Ошибка анализа акции' });
        }
    },

    async getOrdersByPromotion(req, res) {
        try {
            const orders = await Order.find({ promotions: { $exists: true, $ne: [] } });
            res.json({ success: true, data: { count: orders.length, orders } });
        } catch (err) {
            console.error('Ошибка выборки заказов по акциям:', err);
            res.status(500).json({ error: 'Ошибка выборки' });
        }
    },

    async getPromotionRevenueDelta(req, res) {
        try {
            const orders = await Order.find();

            let promoRevenue = 0;
            let noPromoRevenue = 0;

            for (const order of orders) {
                const total = parseFloat(order.total_amount.toString());
                const discount = parseFloat(order.discount_applied?.toString() || '0');

                if (discount > 0) {
                    promoRevenue += total;
                } else {
                    noPromoRevenue += total;
                }
            }

            const delta = promoRevenue - noPromoRevenue;
            const percentDifference = noPromoRevenue > 0
                ? ((delta / noPromoRevenue) * 100).toFixed(2)
                : '∞';

            res.json({
                success: true,
                data: {
                    promoRevenue,
                    noPromoRevenue,
                    delta,
                    percentDifference
                }
            });
        } catch (err) {
            console.error('Ошибка сравнения выручки:', err);
            res.status(500).json({ error: 'Ошибка сравнения' });
        }
    },

    // 8. Популярные товары (топ N по количеству продаж)
    async getTopSellingProducts(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const { startDate, endDate } = req.query;

            // Проверим, что даты переданы
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: 'startDate и endDate обязательны' });
            }

            const popular = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                    }
                },
                { $unwind: "$order_items" },

                // Считаем суммарное количество и выручку по вариациям товара
                {
                    $group: {
                        _id: "$order_items.product_variation_id",
                        totalQuantity: { $sum: "$order_items.quantity" },
                        totalRevenue: { $sum: { $multiply: ["$order_items.price", "$order_items.quantity"] } }
                    }
                },

                // Подтягиваем данные по вариации из коллекции productvariations
                {
                    $lookup: {
                        from: "productvariations",
                        localField: "_id",
                        foreignField: "_id",
                        as: "variation"
                    }
                },
                { $unwind: "$variation" },

                // Из вариации подтягиваем продукт
                {
                    $lookup: {
                        from: "products",
                        localField: "variation.product_id", // предположим, что variation ссылается на product
                        foreignField: "_id",
                        as: "product"
                    }
                },
                { $unwind: "$product" },

                { $sort: { totalQuantity: -1 } },
                { $limit: limit },

                {
                    $project: {
                        productVariationId: "$_id",
                        productName: "$product.name",
                        variationName: "$variation.name", // если нужно имя вариации
                        totalQuantity: 1,
                        totalRevenue: 1
                    }
                }
            ]);

            res.status(200).json({ success: true, data: popular });
        } catch (error) {
            console.error('Ошибка при получении популярных товаров:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 9. Заказы по категориям и брендам
    async getOrderStatsByCategory(req, res) {
        try {
            const { startDate, endDate } = req.query;

            const stats = await Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                { $unwind: "$order_items" },
                {
                    $lookup: {
                        from: "productvariations",
                        localField: "order_items.product_variation_id",
                        foreignField: "_id",
                        as: "variation"
                    }
                },
                { $unwind: "$variation" },
                {
                    $lookup: {
                        from: "products",
                        localField: "variation.product_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                { $unwind: "$product" },
                {
                    $group: {
                        _id: {
                            category: "$product.categories_id",
                        },
                        totalQuantity: { $sum: "$order_items.quantity" },
                        // totalRevenue можно рассчитывать, если включить цену продажи в ProductVariation
                        totalRevenue: {
                            $sum: {
                                $multiply: [
                                    "$order_items.quantity",
                                    { $toDouble: "$variation.price" }
                                ]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "_id.category",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: "$category" },
                { $sort: { totalQuantity: -1 } }
            ]);

            const formatted = stats.map(item => ({
                category: item.category.name,
                totalQuantity: item.totalQuantity,
                totalRevenue: item.totalRevenue
            }));

            res.status(200).json({ success: true, data: formatted });
        } catch (error) {
            console.error('Ошибка при формировании отчёта по категориям и брендам:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    },

    // 10. Лояльность и бонусы (начисления и списания)
    async getLoyaltyHistory(req, res) {
        try {
            const { userId, startDate, endDate } = req.query;

            const filter = {};
            if (userId) filter.user_id = mongoose.Types.ObjectId(userId);
            if (startDate || endDate) filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);

            const history = await LoyaltyHistory.find(filter).sort({ createdAt: -1 });

            res.status(200).json({ success: true, data: history });
        } catch (error) {
            console.error('Ошибка при получении истории лояльности:', error);
            res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
    }

};

module.exports = reportController;
