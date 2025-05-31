const Order = require('../models/order');
const dayjs = require('dayjs');

exports.forecastSales = async () => {
  const now = dayjs();
  const months = [0, 1, 2].map(i => now.subtract(i, 'month').format('YYYY-MM'));

  const result = await Order.aggregate([
    {
      $project: {
        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        total: "$total_amount"
      }
    },
    { $match: { month: { $in: months } } },
    {
      $group: {
        _id: "$month",
        total: { $sum: "$total" }
      }
    }
  ]);

  const values = result.map(r => parseFloat(r.total));
  const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);

  return {
    months,
    values,
    forecastNextMonth: parseFloat(avg.toFixed(2))
  };
};
