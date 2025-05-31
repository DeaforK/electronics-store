const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Review = require('../models/review');
const { User } = require('../models/user');
const Product = require('../models/product');

// Функция пересчёта рейтинга товара
async function updateProductRating(productId) {
    const reviews = await Review.find({ products_id: productId });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length ? totalRating / reviews.length : 0;

    await Product.findByIdAndUpdate(productId, { rating: avgRating });
}

// Добавление отзыва
router.post('/', async (req, res) => {
    const { comment, rating, users_id, products_id } = req.body;

    try {
        // Проверка, что пользователь и продукт существуют
        const user = await User.findById(users_id);
        const product = await Product.findById(products_id);

        if (!user || !product) {
            return res.status(400).send({ message: "Пользователь или товар не найдены" });
        }

        // Создаем новый отзыв
        const newReview = new Review({
            comment,
            rating,
            users_id,
            products_id
        });

        await newReview.save();

        await updateProductRating(products_id);
        
        res.status(201).send({ message: "Отзыв добавлен", review: newReview });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка сервера", error });
    }
});

// Получение всех отзывов для конкретного товара
router.get('/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        // Получение всех отзывов для товара
        const reviews = await Review.find({ products_id: productId }).populate('users_id', 'name');
        res.status(200).send(reviews);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении отзывов", error });
    }
});

// Удаление отзыва
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).send({ message: "Отзыв не найден" });
        }

        const productId = review.products_id;

        await Review.findByIdAndDelete(id);

        await updateProductRating(productId);

        res.status(200).send({ message: "Отзыв удален" });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка при удалении отзыва", error });
    }
});

module.exports = router;
