// analytics/services/financeService.js
const Order = require('../models/order');
const { mean, linearRegression } = require('../utils/statistics'); // Можно реализовать статистику или использовать npm-библиотеки

const financeService = {

  /**
   * Прогноз месячного роста выручки на основе исторических данных
   * Можно применять линейную регрессию, экспоненциальное сглаживание и т.п.
   */
  async predictMonthlyRevenueGrowth({ startDate, endDate }) {
    // Выберем последние 12 месяцев по умолчанию
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = endDate ? new Date(endDate) : now;

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } }},
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }},
        revenue: { $sum: '$totalPrice' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 }}
    ];

    const data = await Order.aggregate(pipeline);

    if (!data.length) return { prediction: 0, data: [] };

    // Преобразуем для анализа: [ { date: Date, revenue: Number }, ... ]
    const timeSeries = data.map(d => ({
      date: new Date(d._id.year, d._id.month - 1, 1),
      revenue: d.revenue,
    }));

    // Линейная регрессия по времени для прогноза (x — номер месяца, y — выручка)
    const xs = timeSeries.map((_, i) => i);
    const ys = timeSeries.map(d => d.revenue);

    const { slope, intercept } = linearRegression(xs, ys);

    // Прогноз на следующий месяц
    const nextX = xs.length;
    const predictedRevenue = intercept + slope * nextX;

    return {
      historicalData: timeSeries,
      predictedNextMonthRevenue: Math.max(predictedRevenue, 0),
      slope,
      intercept
    };
  }

  // Другие финансовые метрики и функции можно добавить здесь
};

module.exports = financeService;
