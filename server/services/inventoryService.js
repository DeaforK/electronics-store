// analytics/services/inventoryService.js
const WarehouseInventory = require('../models/warehouseInventory');
const WarehouseTask = require('../models/warehouseTask');
const ProductVariation = require('../models/productVariation');
const Order = require('../models/order');

const mongoose = require('mongoose');

const inventoryService = {

    // Получить текущие остатки по всем складам
    async getCurrentStockByWarehouse() {
        const pipeline = [
            {
                $group: {
                    _id: '$warehouseId',
                    totalQuantity: { $sum: '$quantity' }
                }
            }
        ];
        const results = await WarehouseInventory.aggregate(pipeline);
        return results;
    },

    // Получить товары с медленной оборачиваемостью (зависшие > thresholdDays)
    async getSlowMovingProducts({ thresholdDays = 90 }) {
        // Предполагаем, что WarehouseInventory содержит lastMovementDate
        const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 3600 * 1000);

        const slowProducts = await WarehouseInventory.aggregate([
            { $match: { lastMovementDate: { $lt: cutoffDate } } },
            {
                $lookup: {
                    from: 'productvariations',
                    localField: 'productVariationId',
                    foreignField: '_id',
                    as: 'productVariation'
                }
            },
            { $unwind: '$productVariation' }
        ]);

        return slowProducts;
    },

    // Рассчитать оборачиваемость склада (например, среднее количество дней на складе)
    async getWarehouseTurnoverRate(warehouseId) {
        // Очень упрощённый пример: считаем среднее время от поступления до продажи по заказам из этого склада
        const pipeline = [
            { $match: { warehouseId } },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            {
                $project: {
                    daysInStock: {
                        $divide: [
                            { $subtract: ['$order.createdAt', '$receivedAt'] },
                            1000 * 3600 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgDaysInStock: { $avg: '$daysInStock' }
                }
            }
        ];

        const [result] = await WarehouseTask.aggregate(pipeline);
        return result?.avgDaysInStock || 0;
    },

    // Предупредить о дефиците товара (stock < threshold)
    async getLowStockProducts({ threshold = 10 }) {
        const products = await WarehouseInventory.aggregate([
            { $match: { quantity: { $lt: threshold } } },
            {
                $lookup: {
                    from: 'productvariations',
                    localField: 'productVariationId',
                    foreignField: '_id',
                    as: 'productVariation'
                }
            },
            { $unwind: '$productVariation' }
        ]);
        return products;
    },

    // Добавить прогнозные остатки с учётом ожидаемых заказов и поставок — можно расширить
    async getForecastStock({ warehouseId }) {
        // Логика: currentStock + incomingShipments - pendingOrders
        // Пока упрощённо — возвращаем текущий складской остаток
        const currentStock = await this.getCurrentStockByWarehouse();
        return currentStock.filter(w => w._id.toString() === warehouseId.toString());
    },


    async calculateTurnoverRate({ warehouseId }) {
        const objectId = new mongoose.Types.ObjectId(warehouseId); // ✅ добавили "new"

        const orders = await Order.find({
            'warehouse_id.assembled_from_warehouses': objectId
        });
        const productSales = {};
        orders.forEach(order => {
            if (!Array.isArray(order.order_items)) return;

            order.order_items.forEach(item => {
                const variationId = item.product_variation_id?.toString();
                if (!variationId) return;

                productSales[variationId] = (productSales[variationId] || 0) + item.quantity;
            });
        });
        const stockItems = await WarehouseInventory.find({ warehouse_id: objectId })
            .populate({
                path: 'product_id',            // это поле в WarehouseInventory
                populate: {
                    path: 'product_id',          // это поле в ProductVariation
                    select: 'name'
                }
            });

        const turnoverData = [];

        stockItems.forEach(stock => {
            const variationId = stock.product_id?._id.toString();
            const sold = productSales[variationId] || 0;
            const currentStock = stock.quantity;

            if (sold > 0 && currentStock !== 0) {
                const turnover = sold / ((sold + currentStock) / 2);
                turnoverData.push({ productName: stock.product_id?.product_id?.name, turnover });
            }
        });

        return turnoverData;
    },

    // Прогноз загрузки склада: предполагаем рост на основе прошлых продаж
    async predictWarehouseLoad({ warehouseId, daysAhead = 30 }) {
        const objectId = new mongoose.Types.ObjectId(warehouseId);

        const orders = await Order.find({
            $and: [
                {
                    $or: [
                        { 'warehouse_id.assembled_from_warehouses': objectId },
                        { 'order_items.source_warehouse_id': objectId }
                    ]
                },
                {
                    createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
                }
            ]
        });


        const productSales = {};
        orders.forEach(order => {
            if (!Array.isArray(order.order_items)) return;

            order.order_items.forEach(item => {
                const variationId = item.product_variation_id?.toString();
                if (!variationId) return;

                productSales[variationId] = (productSales[variationId] || 0) + item.quantity;
            });
        });

        // Упрощённый прогноз: ежедневная средняя продажа * daysAhead
        const forecast = Object.entries(productSales).map(([variationId, totalSold]) => ({
            productVariationId: variationId,
            forecastedSales: Math.ceil(totalSold / 90 * daysAhead)
        }));

        return forecast;
    }

};

module.exports = inventoryService;
