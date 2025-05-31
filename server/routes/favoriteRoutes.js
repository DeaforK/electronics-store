const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Favorite = require('../models/favorite');
const { User } = require('../models/user');
const Product = require('../models/product');

// Добавление товара в избранное
router.post('/', async (req, res) => {
    const { users_id, products_id } = req.body;

    try {
        // Проверка, что пользователь и продукт существуют
        const user = await User.findById(users_id);
        const product = await Product.findById(products_id);

        if (!user || !product) {
            return res.status(400).send({ message: "Пользователь или товар не найдены" });
        }

        // Проверка, что товар уже не добавлен в избранное
        const existingFavorite = await Favorite.findOne({ users_id, products_id });
        if (existingFavorite) {
            return res.status(400).send({ message: "Товар уже добавлен в избранное" });
        }

        // Создаем новую запись в избранном
        const newFavorite = new Favorite({
            users_id,
            products_id
        });

        await newFavorite.save();
        res.status(201).send({ message: "Товар добавлен в избранное", favorite: newFavorite });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Ошибка сервера", error });
    }
});

// Получение всех избранных товаров пользователя
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Получение всех избранных товаров для конкретного пользователя
        const favorites = await Favorite.find({ users_id: userId }).populate('products_id');
        res.status(200).send(favorites);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении избранных товаров", error });
    }
});

// Удаление товара из избранного
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Поиск записи избранного по ID
        const favorite = await Favorite.findById(id);
        if (!favorite) {
            return res.status(404).send({ message: "Товар в избранном не найден" });
        }

        await Favorite.deleteOne({ _id: id });
        res.status(200).send({ message: "Товар удален из избранного" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Ошибка при удалении товара из избранного", error });
    }
});

module.exports = router;
