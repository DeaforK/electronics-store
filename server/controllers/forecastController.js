// analytics/controllers/forecastController.js
const salesService = require('../services/salesService');
const inventoryService = require('../services/inventoryService');
const financeService = require('../services/financeService');
const Order = require('../models/order');

function linearRegression(xs, ys) {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

const forecastController = {

  /**
   * Прогноз продаж на следующий месяц по конкретному товару
   * @param {string} productId - id товара
   * @returns прогнозируемое количество продаж
   */
  async predictSalesNextMonth(req, res) {
    try {
      const { productId } = req.params;
      if (!productId) return res.status(400).json({ success: false, message: 'productId обязателен' });

      // Пример: salesService содержит ML или статистические методы для прогноза
      const prediction = await salesService.predictSalesNextMonth(productId);

      res.json({ success: true, data: { productId, predictedSales: prediction } });
    } catch (error) {
      console.error('Ошибка прогнозирования продаж:', error);
      res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
  },

  /**
   * Прогноз загрузки склада (количество и оборачиваемость)
   * Возвращает, сколько товара потребуется, сколько будет на складе, сколько нужно докупить
   */
  async predictWarehouseLoad(req, res) {
    try {
      const { warehouseId } = req.query;
      if (!warehouseId) return res.status(400).json({ success: false, message: 'warehouseId обязателен' });

      const forecast = await inventoryService.predictWarehouseLoad({ warehouseId });

      res.json({ success: true, data: forecast });
    } catch (error) {
      console.error('Ошибка прогнозирования загрузки склада:', error);
      res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
  },

  /**
   * Прогноз месячного роста выручки
   * Возвращает прогнозный доход и динамику
   */

  async predictMonthlyRevenueGrowth(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const now = new Date();
      // Для начала 12-месячного периода берём 1 число месяца 11 месяцев назад (всего 12 мес в выборке)
      const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const end = endDate ? new Date(endDate) : now;

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $in: ['Доставлено'] }  // только завершённые заказы
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: { $toDouble: "$total_amount" } }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ];

      const data = await Order.aggregate(pipeline);

      if (!data.length) {
        return res.json({
          success: true,
          data: {
            predictedNextMonthRevenue: 0,
            historicalData: [],
            slope: 0,
            intercept: 0
          }
        });
      }

      // Преобразуем агрегированные данные в временной ряд
      const timeSeries = data.map(d => ({
        date: new Date(d._id.year, d._id.month - 1, 1),
        revenue: d.revenue
      }));

      const xs = timeSeries.map((_, i) => i);
      const ys = timeSeries.map(d => d.revenue);

      const { slope, intercept } = linearRegression(xs, ys);

      const nextX = xs.length;
      const predictedRevenue = intercept + slope * nextX;

      return res.json({
        success: true,
        data: {
          predictedNextMonthRevenue: Math.max(predictedRevenue, 0),
          historicalData: timeSeries,
          slope,
          intercept
        }
      });
    } catch (error) {
      console.error('Ошибка прогноза выручки:', error);
      return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
  },

  /**
   * Общий endpoint прогнозов с выбором типа прогноза
   * Может принимать type=sales|warehouse|revenue и перенаправлять на нужный метод
   */
  async getForecast(req, res) {
    try {
      const { type } = req.query;
      if (!type) return res.status(400).json({ success: false, message: 'type обязателен' });

      switch (type) {
        case 'sales':
          return this.predictSalesNextMonth(req, res);
        case 'warehouse':
          return this.predictWarehouseLoad(req, res);
        case 'revenue':
          return this.predictMonthlyRevenueGrowth(req, res);
        default:
          return res.status(400).json({ success: false, message: 'Неизвестный тип прогноза' });
      }
    } catch (error) {
      console.error('Ошибка в getForecast:', error);
      res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
  }

};

module.exports = forecastController;
