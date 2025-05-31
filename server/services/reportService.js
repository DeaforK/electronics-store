// analytics/services/reportService.js
const Order = require('../models/order');
const { User } = require('../models/user');
const Warehouse = require('../models/warehouse');
const ProductVariation = require('../models/productVariation');
const WarehouseInventory = require('../models/warehouseInventory');
const WarehouseTask = require('../models/warehouseTask');
const Promotion = require('../models/promotion');
const PromotionProductCategory = require('../models/promotionProductCategory');
const LoyaltyHistory = require('../models/loyaltyHistory');

const reportService = {

    // Суммарный доход за период (учитывая налог, скидки)
    async getIncomeSummary({ startDate, endDate }) {
        const match = {};
        if (startDate) match.createdAt = { $gte: new Date(startDate) };
        if (endDate) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(endDate) });

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' }, // Итоговая сумма по заказам
                    totalDiscount: { $sum: '$discount' },
                    totalTax: { $sum: '$tax' },
                    orderCount: { $sum: 1 }
                }
            }
        ];

        const [result] = await Order.aggregate(pipeline);
        return result || {
            totalRevenue: 0,
            totalDiscount: 0,
            totalTax: 0,
            orderCount: 0,
        };
    },

    // Отчёт по налогам (например, группировка по налоговым ставкам)
    async getTaxReport({ startDate, endDate, groupBy = 'month' }) {
        const match = {};
        if (startDate) match.createdAt = { $gte: new Date(startDate) };
        if (endDate) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(endDate) });

        const groupId = {};
        if (groupBy === 'month') {
            groupId.year = { $year: '$createdAt' };
            groupId.month = { $month: '$createdAt' };
        } else if (groupBy === 'day') {
            groupId.year = { $year: '$createdAt' };
            groupId.month = { $month: '$createdAt' };
            groupId.day = { $dayOfMonth: '$createdAt' };
        } else {
            groupId.year = { $year: '$createdAt' };
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: groupId,
                    totalTax: { $sum: '$tax' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ];

        const results = await Order.aggregate(pipeline);
        return results;
    },

    // Статистика по отменённым и задолжавшим заказам
    async getCanceledOrdersStats() {
        const pipeline = [
            { $match: { status: 'canceled' } },
            {
                $group: {
                    _id: null,
                    canceledCount: { $sum: 1 },
                    totalLostRevenue: { $sum: '$totalPrice' }
                }
            }
        ];

        const [result] = await Order.aggregate(pipeline);
        return result || { canceledCount: 0, totalLostRevenue: 0 };
    },

    // Распределение по способам оплаты
    async getPaymentMethodsDistribution() {
        const pipeline = [
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' }
                }
            }
        ];
        const results = await Order.aggregate(pipeline);
        return results;
    },

    // Отчёт по складам: сколько собрано и отправлено
    async getWarehouseOrderStats() {
        const pipeline = [
            {
                $group: {
                    _id: '$warehouseId',
                    ordersCount: { $sum: 1 },
                    totalRevenue: { $sum: '$totalPrice' }
                }
            }
        ];
        const results = await Order.aggregate(pipeline);
        // Можно дополнительно добавить данные по складам (названия, адреса)
        return results;
    },

    // Добавьте другие методы по необходимости

    async calculateCustomerLTV({ userId }) {
        try {
            const orders = await Order.find({ users_id: userId });

            // Преобразуем Decimal128 в float
            const totalRevenue = orders.reduce((sum, order) => {
                const amount = parseFloat(order.total_amount?.toString() || "0");
                return sum + amount;
            }, 0);

            const orderCount = orders.length;
            const averageOrderValue = orderCount ? totalRevenue / orderCount : 0;

            return {
                userId,
                totalRevenue,
                orderCount,
                averageOrderValue,
                lifetimeValue: totalRevenue
            };
        } catch (error) {
            console.error("Ошибка при расчёте LTV:", error);
            throw new Error("Не удалось рассчитать LTV");
        }
    },

    async getLoyaltyStats() {
        try {
            const usage = await LoyaltyHistory.aggregate([
                {
                    $group: {
                        _id: '$change_type', // 'начисление' | 'списание'
                        totalPoints: { $sum: '$points' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result = {
                totalAccrued: 0,
                totalSpent: 0
            };

            usage.forEach(entry => {
                if (entry._id === 'начисление') result.totalAccrued = entry.totalPoints;
                if (entry._id === 'списание') result.totalSpent = entry.totalPoints;
            });

            return result;
        } catch (error) {
            console.error('Ошибка при получении статистики лояльности:', error);
            throw new Error('Не удалось получить статистику по бонусам');
        }
    },

};

module.exports = reportService;
