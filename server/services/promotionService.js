// analytics/services/promotionService.js
const Promotion = require('../models/promotion');
const PromotionProductCategory = require('../models/promotionProductCategory');
const Order = require('../models/order');

const promotionService = {

    // Общее число активных акций за период
    async getActivePromotionsCount({ startDate, endDate }) {
        const now = new Date();
        const match = {
            startDate: { $lte: now },
            endDate: { $gte: now }
        };
        if (startDate) match.startDate = { $gte: new Date(startDate) };
        if (endDate) match.endDate = { ...match.endDate, $lte: new Date(endDate) };

        const count = await Promotion.countDocuments(match);
        return count;
    },

    // Отчёт по эффекту акций — сколько скидок применено и их общий размер
    async getPromotionEffectSummary({ startDate, endDate }) {
        // Найдём заказы, где скидка от акций > 0
        const match = { 'discount': { $gt: 0 } };
        if (startDate) match.createdAt = { $gte: new Date(startDate) };
        if (endDate) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(endDate) });

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: null,
                    ordersCount: { $sum: 1 },
                    totalPromotionDiscount: { $sum: '$discount' }
                }
            }
        ];
        const [result] = await Order.aggregate(pipeline);
        return result || { ordersCount: 0, totalPromotionDiscount: 0 };
    },

    // Статистика по типам скидок (процентные, фиксированные, бонусы)
    async getPromotionTypesStats() {
        const pipeline = [
            {
                $group: {
                    _id: '$discountType',
                    count: { $sum: 1 }
                }
            }
        ];
        const result = await Promotion.aggregate(pipeline);
        return result;
    },

    // Статистика по связанным товарам и категориям (какие категории/бренды участвуют чаще)
    async getPromotionTargetsStats() {
        const pipeline = [
            {
                $group: {
                    _id: '$brand_name',
                    count: { $sum: 1 }
                }
            }
        ];
        const brandStats = await PromotionProductCategory.aggregate(pipeline);

        // Аналогично можно сделать по product_id и category_id
        return { brandStats };
    },

    // Можно добавить более детальные отчёты: какие товары приносят больше скидок и т.п.

    async analyzePromotionEffectiveness ({ promotionId }) {
        const allOrders = await Order.find({ status: 'delivered' });

        const withPromo = allOrders.filter(o => o.promotions?.includes(promotionId));
        const withoutPromo = allOrders.filter(o => !o.promotions?.includes(promotionId));

        const revenueWith = withPromo.reduce((sum, o) => sum + o.total_price, 0);
        const revenueWithout = withoutPromo.reduce((sum, o) => sum + o.total_price, 0);

        return {
            promotionId,
            withPromotion: {
                orders: withPromo.length,
                revenue: revenueWith
            },
            withoutPromotion: {
                orders: withoutPromo.length,
                revenue: revenueWithout
            },
            delta: revenueWith - revenueWithout
        };
    },
};

module.exports = promotionService;
