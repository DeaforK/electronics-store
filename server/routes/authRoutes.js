const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Product = require('../models/product');
const Category = require('../models/category');
const Promotion = require('../models/promotion');
const { User } = require('../models/user');
const { authenticateRole, verifyUser } = require('../middleware/auth');
const fs = require('fs');
const { addToken, isTokenBlacklisted } = require('../config/blacklist');
require('dotenv').config(); // Подключаем файл .env

const router = express.Router();

// Чтение RSA ключей
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
const publicKey = fs.readFileSync(process.env.PUBLIC_KEY_PATH, 'utf8');

// Middleware для проверки черного списка токенов
router.use((req, res, next) => {
    const token = req.cookies.token; // Получаем токен из cookies

    if (token && isTokenBlacklisted(token)) {
        return res.status(401).send({ message: "Токен отозван. Пожалуйста, войдите снова." });
    }
    next();
});

// Маршрут для проверки аутентификации
router.get('/', verifyUser, (req, res) => {
    const { role, userId } = req.user;

    res.send({
        message: "Успех",
        data: {
            role,
            userId
        }
    });
});

// Пример защищенного маршрута для админов
router.get('/admin', authenticateRole('admin'), (req, res) => {
    res.send({ message: "Доступ разрешен для администратора", user: req.user });
});

// Пример защищенного маршрута для курьера
router.get('/courier', authenticateRole('courier'), (req, res) => {
    res.send({ message: "Доступ разрешен для курьеров", user: req.user });
});

// Пример защищенного маршрута для клиента
router.get('/user', authenticateRole('client'), (req, res) => {
    res.send({ message: "Доступ разрешен для клиента", user: req.user });
});

// Пример защищенного маршрута для продавца-приемщика
router.get('/seller', authenticateRole('seller'), (req, res) => {
    res.send({ message: "Доступ разрешен для продавца-приемщика", user: req.user });
});

router.get('/search', async (req, res) => {
    const q = req.query.q;
    const regex = new RegExp(q, 'i');

    const [products, categories, promotions] = await Promise.all([
        Product.find({ name: regex }).limit(5),
        Category.find({ name: regex }).limit(5),
        Promotion.find({ name: regex }).limit(5)
    ]);

    const results = [
        ...products.map(p => ({ _id: p._id, name: p.name, type: 'product' })),
        ...categories.map(c => ({ _id: c._id, name: c.name, type: 'category' })),
        ...promotions.map(pr => ({ _id: pr._id, name: pr.name, type: 'promotion' })),
    ];

    res.json(results);
});


// Регистрация пользователя
router.post('/register', async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    try {
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ message: "Email уже зарегистрирован" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            phone,
            password: passwordHash,
            role
        });

        await newUser.save();

        const deviceInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };

        const token = jwt.sign(
            { userId: newUser._id, role: newUser.role, deviceInfo },
            privateKey,
            { algorithm: 'RS256', expiresIn: '3d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3 * 24 * 60 * 60 * 1000
        });

        res.send({ message: "Регистрация прошла успешно" });
    } catch (error) {
        res.status(500).send({ message: "Ошибка сервера", error });
    }
});

// Вход пользователя
router.post('/login', async (req, res) => {
    const { emailOrPhone, password } = req.body;
    // console.log(req.body)

    try {
        let user = await User.findOne({
            $or: [
                { email: emailOrPhone },
                { phone: emailOrPhone }
            ]
        });
        if (!user) {
            return res.status(400).send({ message: "Неверный email/телефон" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        // console.log(isMatch)
        if (!isMatch) {
            return res.status(400).send({ message: "Неверный пароль" });
        }

        const deviceInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };

        const token = jwt.sign(
            { userId: user._id, role: user.role, deviceInfo },
            privateKey,
            { algorithm: 'RS256', expiresIn: '3d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3 * 24 * 60 * 60 * 1000
        });

        res.send({ message: "Успех входа" });
    } catch (error) {
        res.status(500).send({ message: "Ошибка сервера", error });
    }
});

// Маршрут для выхода из аккаунта
router.post('/logout', (req, res) => {
    const token = req.cookies.token;

    if (token) {
        addToken(token);
        res.clearCookie('token');
        return res.send({ message: "Выход выполнен успешно." });
    }

    res.status(400).send({ message: "Токен не найден." });
});

module.exports = router;
