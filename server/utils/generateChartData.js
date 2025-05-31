// utils/generateChartData.js
const Order = require('../models/order');

exports.generateChartData = async () => {
  const result = await Order.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        total: { $sum: "$total_amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    labels: result.map(r => r._id),
    sales: result.map(r => parseFloat(r.total)),
    count: result.map(r => r.count)
  };
};
