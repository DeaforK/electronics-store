// analytics/services/salesService.js
const Order = require('../models/order');

async function predictSalesNextMonth(productId) {
  // Очень упрощённый пример: берём продажи за последние 6 месяцев и делаем прогноз простым средним

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const pipeline = [
    { $match: {
      'items.product_id': productId,
      createdAt: { $gte: sixMonthsAgo, $lte: now }
    }},
    { $unwind: '$items' },
    { $match: { 'items.product_id': productId }},
    { $group: {
      _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }},
      totalQuantity: { $sum: '$items.quantity' }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 }}
  ];

  const results = await Order.aggregate(pipeline);

  if (!results.length) return 0;

  // Среднее количество продаж в месяц за 6 месяцев
  const avgSales = results.reduce((acc, cur) => acc + cur.totalQuantity, 0) / results.length;

  // Можно добавить тренд, сезонность и т.п.

  return Math.round(avgSales);
}

module.exports = { predictSalesNextMonth };
