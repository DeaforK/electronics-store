const express = require('express');
const LoyaltyHistory = require('../models/loyaltyHistory');
const router = express.Router();

// Создание новой записи в истории лояльности
router.post('/', async (req, res) => {
    const { user_id, order_id, change_type, points, comment } = req.body;

    try {
        const newLoyaltyHistory = new LoyaltyHistory({
            user_id,
            order_id,
            change_type,
            points,
            comment
        });

        const savedLoyaltyHistory = await newLoyaltyHistory.save();
        res.status(201).json(savedLoyaltyHistory);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при создании записи", error });
    }
});

// Получение всех записей истории лояльности для пользователя
router.get('/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        const loyaltyHistory = await LoyaltyHistory.find({ user_id });
        // if (loyaltyHistory.length === 0) {
        //     return res.status(404).json({ message: "Записи не найдены" });
        // }
        res.status(200).json(loyaltyHistory);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении записей", error });
    }
});

// Получение одной записи истории лояльности по ID
router.get('/record/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const loyaltyHistoryRecord = await LoyaltyHistory.findById(id);
        if (!loyaltyHistoryRecord) {
            return res.status(404).json({ message: "Запись не найдена" });
        }
        res.status(200).json(loyaltyHistoryRecord);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении записи", error });
    }
});

// Удаление записи истории лояльности по ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedLoyaltyHistory = await LoyaltyHistory.findByIdAndDelete(id);
        if (!deletedLoyaltyHistory) {
            return res.status(404).json({ message: "Запись не найдена" });
        }
        res.status(200).json({ message: "Запись удалена", deletedLoyaltyHistory });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при удалении записи", error });
    }
});

module.exports = router;
