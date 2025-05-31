// analytics/services/courierService.js
const Courier = require('../models/courier');
const Order = require('../models/order');

const courierService = {

  // Количество заказов, доставленных каждым курьером за период
  async getDeliveredOrdersByCourier({ startDate, endDate }) {
    const match = { status: 'delivered' };
    if (startDate) match.updatedAt = { $gte: new Date(startDate) };
    if (endDate) match.updatedAt = Object.assign(match.updatedAt || {}, { $lte: new Date(endDate) });

    const pipeline = [
      { $match: match },
      { $group: {
        _id: '$courierId',
        deliveredOrdersCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' }
      }},
      { $lookup: {
        from: 'couriers',
        localField: '_id',
        foreignField: '_id',
        as: 'courier'
      }},
      { $unwind: '$courier' }
    ];

    return Order.aggregate(pipeline);
  },

  // Среднее время доставки
  async getAverageDeliveryTime() {
    // Нужно хранить время начала и окончания доставки (например, timestamps по статусам)
    // Пока упрощённо — можно хранить поле deliveryTime в заказах
    const pipeline = [
      { $match: { deliveryTime: { $exists: true } } },
      { $group: {
        _id: null,
        avgDeliveryTimeMinutes: { $avg: '$deliveryTime' }
      }}
    ];

    const [result] = await Order.aggregate(pipeline);
    return result?.avgDeliveryTimeMinutes || 0;
  }
};

module.exports = courierService;
