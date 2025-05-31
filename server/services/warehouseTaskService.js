// analytics/services/warehouseTaskService.js
const WarehouseTask = require('../models/warehouseTask');

const warehouseTaskService = {

  // Количество выполненных и ожидающих заданий
  async getTaskStatusStats() {
    const pipeline = [
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ];
    return WarehouseTask.aggregate(pipeline);
  },

  // Среднее время выполнения задания (в минутах)
  async getAverageTaskCompletionTime() {
    // Нужно хранить дату начала и окончания
    const pipeline = [
      { $match: { startedAt: { $exists: true }, completedAt: { $exists: true } } },
      {
        $project: {
          durationMinutes: { $divide: [
            { $subtract: ['$completedAt', '$startedAt'] },
            1000 * 60
          ]}
        }
      },
      { $group: {
        _id: null,
        avgDuration: { $avg: '$durationMinutes' }
      }}
    ];
    const [result] = await WarehouseTask.aggregate(pipeline);
    return result?.avgDuration || 0;
  }
};

module.exports = warehouseTaskService;
