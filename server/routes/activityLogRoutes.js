const express = require('express');
const ActivityLog = require('../models/activityLog');  // Подключаем модель ActivityLog

const router = express.Router();

// Получить все записи журнала активности
router.get('/', async (req, res) => {
    try {
        const logs = await ActivityLog.find().populate('user_id', 'name email').exec();  // Запрашиваем все логи с деталями пользователя
        res.status(200).json(logs);
    } catch (error) {
        console.error('Ошибка при получении журналов активности:', error);
        res.status(500).json({ message: 'Не удалось получить данные.' });
    }
});

// Получить только действия пользователей с ролью 'seller'
router.get('/seller', async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .populate({
                path: 'user_id',
                select: 'name email role',
                match: { role: 'seller' }  // фильтруем только продавцов
            })
            .exec();

        // Убираем логи, где пользователь не был найден (не продавец)
        const sellerLogs = logs.filter(log => log.user_id);

        res.status(200).json(sellerLogs);
    } catch (error) {
        console.error('Ошибка при получении журналов активности продавцов:', error);
        res.status(500).json({ message: 'Не удалось получить данные.' });
    }
});


// Создать новую запись в журнале активности
router.post('/', async (req, res) => {
    try {
        const { user_id, action_type, item_id, description, device_info } = req.body;

        // Проверка наличия необходимых данных
        if (!user_id || !action_type || !item_id || !description) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения.' });
        }

        const newActivityLog = new ActivityLog({
            user_id,
            action_type,
            item_id,
            description,
            device_info: device_info || 'Неизвестное устройство'  // Добавляем новое поле
        });

        // Сохраняем запись в журнал
        await newActivityLog.save();
        res.status(201).json({ message: 'Запись в журнале активности создана успешно.', log: newActivityLog });
    } catch (error) {
        console.error('Ошибка при создании записи в журнале активности:', error);
        res.status(500).json({ message: 'Не удалось создать запись в журнале активности.' });
    }
});

// Удалить запись из журнала активности
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const log = await ActivityLog.findById(id);

        if (!log) {
            return res.status(404).json({ message: 'Запись не найдена.' });
        }

        // Удаляем запись
        await log.remove();
        res.status(200).json({ message: 'Запись успешно удалена.' });
    } catch (error) {
        console.error('Ошибка при удалении записи журнала активности:', error);
        res.status(500).json({ message: 'Не удалось удалить запись.' });
    }
});

module.exports = router;
