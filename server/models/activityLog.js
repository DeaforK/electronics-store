const mongoose = require('mongoose');

// Схема для журнала активности
const activityLogSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,  // Внешний ключ для пользователя
        ref: 'User',
        required: true
    },
    action_type: {
        type: String,  // Тип действия (например, "изменение товара", "перемещение товара")
        required: true
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,  // Идентификатор объекта действия (например, товар или склад)
        required: true
    },
    description: {
        type: String,  // Описание действия
        required: true
    },
    device_info: {
        type: String,  // Информация об устройстве пользователя
        default: 'Неизвестное устройство'
    }
}, { timestamps: true });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
