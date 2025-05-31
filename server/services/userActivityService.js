// analytics/services/userActivityService.js
const { User } = require('../models/user');
const Order = require('../models/order');
const Review = require('../models/review');

const userActivityService = {

  // Количество новых пользователей за период
  async getNewUsersCount({ startDate, endDate }) {
    const query = {};
    if (startDate) query.createdAt = { $gte: new Date(startDate) };
    if (endDate) query.createdAt = Object.assign(query.createdAt || {}, { $lte: new Date(endDate) });

    return User.countDocuments(query);
  },

  // Активные пользователи — сделали заказ/оставили отзыв за период
  async getActiveUsers({ startDate, endDate }) {
    const orderUsers = await Order.distinct('userId', {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    const reviewUsers = await Review.distinct('userId', {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    // Уникальные ID
    const userSet = new Set([...orderUsers, ...reviewUsers]);
    return userSet.size;
  },

  // Среднее число заказов на пользователя за период
  async getAvgOrdersPerUser({ startDate, endDate }) {
    const match = {};
    if (startDate) match.createdAt = { $gte: new Date(startDate) };
    if (endDate) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(endDate) });

    const pipeline = [
      { $match: match },
      { $group: { _id: '$userId', ordersCount: { $sum: 1 } } },
      { $group: { _id: null, avgOrders: { $avg: '$ordersCount' } } }
    ];

    const [result] = await Order.aggregate(pipeline);
    return result?.avgOrders || 0;
  },

  // Можно добавить анализ пользовательских сегментов, retention, churn и т.п.

};

module.exports = userActivityService;
