const express = require('express');
const axios = require('axios');
const router = express.Router();
const Warehouse = require('../models/warehouse');
const ActivityLog = require('../models/activityLog');

// Ваш API ключ для Яндекс.Карт
const YANDEX_API_KEY = 'fe9ec694-cdc4-4b75-a2cd-5b920200a71f';

// Функция для получения адреса по координатам
const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
        const response = await axios.get('https://geocode-maps.yandex.ru/1.x/', {
            params: {
                geocode: `${longitude},${latitude}`,
                format: 'json',
                apikey: YANDEX_API_KEY
            }
        });
        const geoObject = response.data.response.GeoObjectCollection.featureMember[0]?.GeoObject;
        return geoObject ? geoObject.name : 'Неизвестный адрес';
    } catch (error) {
        console.error('Ошибка при получении адреса:', error);
        return 'Ошибка при получении адреса';
    }
};

// Функция для добавления записи в ActivityLog
const logActivity = async (userId, actionType, itemId, description) => {
    try {
        const logEntry = new ActivityLog({
            user_id: userId,
            action_type: actionType,
            item_id: itemId,
            description
        });
        await logEntry.save();
    } catch (error) {
        console.error('Ошибка при логировании действия:', error);
    }
};

// Создание нового склада или магазина
router.post('/', async (req, res) => {
    const { name, location, type, userId } = req.body; // Добавлено поле userId для логирования

    if (!location?.latitude || !location?.longitude) {
        return res.status(400).send({ message: "Координаты обязательны." });
    }

    try {
        // Получение адреса по координатам
        const address = await getAddressFromCoordinates(location.latitude, location.longitude);

        const warehouse = new Warehouse({
            name,
            location,
            address,
            type
        });

        await warehouse.save();

        // Логирование действия
        await logActivity(userId, 'Создание', warehouse._id, `Создан склад/магазин: ${name}`);

        res.status(201).send({ message: "Склад/магазин успешно создан", warehouse });
    } catch (error) {
        console.error('Ошибка при создании склада/магазина:', error);
        res.status(500).send({ message: "Ошибка при создании склада/магазина", error });
    }
});

// Получение списка всех складов и магазинов
router.get('/', async (req, res) => {
    try {
        const warehouses = await Warehouse.find();
        res.status(200).send(warehouses);
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка при получении складов/магазинов", error });
    }
});

// Получение списка всех магазинов
router.get('/shop', async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ type: 'Магазин' });
        res.status(200).send(warehouses);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении складов/магазинов", error });
    }
});

// Получение информации о конкретном складе/магазине
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            return res.status(404).send({ message: "Склад/магазин не найден" });
        }
        res.status(200).send(warehouse);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении склада/магазина", error });
    }
});

// Обновление информации о складе/магазине
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, location, type, userId } = req.body; // Добавлено поле userId для логирования

    try {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            return res.status(404).send({ message: "Склад/магазин не найден" });
        }

        let updates = [];
        if (location?.latitude && location?.longitude) {
            const address = await getAddressFromCoordinates(location.latitude, location.longitude);
            warehouse.address = address;
            warehouse.location = location;
            updates.push('Обновлены координаты и адрес');
        }

        if (name && name !== warehouse.name) {
            warehouse.name = name;
            updates.push('Обновлено название');
        }

        if (type && type !== warehouse.type) {
            warehouse.type = type;
            updates.push('Обновлен тип');
        }

        await warehouse.save();

        // Логирование действия
        await logActivity(userId, 'Обновление', warehouse._id, `Обновлен склад/магазин: ${updates.join(', ')}`);

        res.status(200).send({ message: "Информация о складе/магазине обновлена", warehouse });
    } catch (error) {
        console.error('Ошибка при обновлении склада/магазина:', error);
        res.status(500).send({ message: "Ошибка при обновлении склада/магазина", error });
    }
});

// Удаление склада/магазина
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;  // Используем req.query для получения userId
    try {
        // Находим склад до удаления
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            return res.status(404).send({ message: "Склад/магазин не найден" });
        }

        // Сохраняем необходимые данные для лога
        const { name } = warehouse;

        // Удаляем склад
        await Warehouse.deleteOne({ _id: id });

        // Логируем удаление с использованием сохранённых данных
        await logActivity(userId, 'Удаление', id, `Удален склад/магазин: ${name}`);

        res.status(200).send({ message: "Склад/магазин успешно удален" });
    } catch (error) {
        console.error('Ошибка при удалении склада/магазина:', error);
        res.status(500).send({ message: "Ошибка при удалении склада/магазина", error });
    }
});


module.exports = router;
