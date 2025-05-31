const express = require('express');
const router = express.Router();
const { User } = require('../models/user'); // Модель пользователя
const bcrypt = require('bcrypt');

// Получение всех пользователей
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении списка пользователей', error });
    }
});

// Получение информации о пользователе
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении данных пользователя', error });
    }
});

// Обновление данных пользователя
router.put('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, password, avatar, role } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar;
        if (role) user.role = role;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.status(200).send({ message: 'Данные пользователя обновлены', user });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: 'Ошибка при обновлении данных пользователя', error });
    }
});

// Удаление пользователя
router.delete('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        await user.remove();
        res.status(200).send({ message: 'Пользователь удален' });
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при удалении пользователя', error });
    }
});

// ================== Работа с адресами ==================

// Получение всех адресов пользователя
router.get('/:userId/addresses', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        res.status(200).send(user.addresses);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении адресов', error });
    }
});

// Добавление нового адреса
router.post('/:userId/addresses', async (req, res) => {
    const { label, address, location, is_default } = req.body;

    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        const newAddress = { label, address, location, is_default };

        if (is_default) {
            user.addresses.forEach(addr => addr.is_default = false); // Сбрасываем текущий основной адрес
        }

        user.addresses.push(newAddress);
        await user.save();

        res.status(201).send({ message: 'Адрес добавлен', addresses: user.addresses });
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при добавлении адреса', error });
    }
});

// Обновление адреса
router.put('/:userId/addresses/:addressId', async (req, res) => {
    const { label, address, location, is_default } = req.body;

    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === req.params.addressId);
        if (addressIndex === -1) return res.status(404).send({ message: 'Адрес не найден' });

        if (label) user.addresses[addressIndex].label = label;
        if (address) user.addresses[addressIndex].address = address;
        if (location) user.addresses[addressIndex].location = location;
        if (is_default) {
            user.addresses.forEach(addr => addr.is_default = false);
            user.addresses[addressIndex].is_default = true;
        }

        await user.save();
        res.status(200).send({ message: 'Адрес обновлен', addresses: user.addresses });
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при обновлении адреса', error });
    }
});

// Удаление адреса
router.delete('/:userId/addresses/:addressId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        user.addresses = user.addresses.filter(addr => addr._id.toString() !== req.params.addressId);
        await user.save();

        res.status(200).send({ message: 'Адрес удален', addresses: user.addresses });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: 'Ошибка при удалении адреса', error });
    }
});

// Установка адреса по умолчанию
router.patch('/:userId/addresses/:addressId/set-default', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).send({ message: 'Пользователь не найден' });

        let addressFound = false;
        user.addresses.forEach(addr => {
            if (addr._id.toString() === req.params.addressId) {
                addr.is_default = true;
                addressFound = true;
            } else {
                addr.is_default = false;
            }
        });

        if (!addressFound) return res.status(404).send({ message: 'Адрес не найден' });

        await user.save();
        res.status(200).send({ message: 'Основной адрес обновлен', addresses: user.addresses });
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при установке основного адреса', error });
    }
});

// ================== Статистика ==================

// Статистика по пользователям
router.get('/statistics', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBonusPoints = await User.aggregate([{ $group: { _id: null, total: { $sum: '$bonus_points' } } }]);
        const totalOrdersSum = await User.aggregate([{ $group: { _id: null, total: { $sum: { $toDouble: '$total_orders_sum' } } } }]);

        res.status(200).json({
            totalUsers,
            totalBonusPoints: totalBonusPoints[0]?.total || 0,
            totalOrdersSum: totalOrdersSum[0]?.total || 0
        });
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении статистики', error });
    }
});

module.exports = router;
