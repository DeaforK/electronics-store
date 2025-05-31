const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Category = require('../models/category');
const Product = require('../models/product');
const schedule = require('node-schedule');
const { imageWhitelist } = require('../config/whitelist'); // Белый список расширений
const { body, validationResult } = require('express-validator'); // Для валидации
const mongoose = require('mongoose'); // Добавляем mongoose

const router = express.Router();

// Настройки multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../assets/icon');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (imageWhitelist.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Неподдерживаемый формат файла'), false);
    }
};

// Middleware для обработки загрузки иконок
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
}).fields([{ name: 'icon_white', maxCount: 1 }, { name: 'icon_black', maxCount: 1 }]);

// Валидация полей
const validateCategory = [
    body('name')
        .notEmpty().withMessage('Имя категории обязательно')
        .isString().withMessage('Имя категории должно быть строкой'),
    body('categories_id')
        .optional()
        .isMongoId().withMessage('Некорректный ID родительской категории')
        .custom(value => {
            if (value !== null && !mongoose.Types.ObjectId.isValid(value)) { // Исправлено здесь
                throw new Error('Некорректный ID родительской категории');
            }
            return true;
        }),
];

// Функция рекурсивного архивирования подкатегорий
const archiveSubcategories = async (parentId) => {
    const subcategories = await Category.find({ categories_id: parentId });

    for (const subcategory of subcategories) {
        subcategory.status = 'В Архиве';
        subcategory.archivedAt = new Date();
        await subcategory.save();

        // Архивируем товары, принадлежащие этой подкатегории
        await Product.updateMany(
            { categories_id: subcategory._id },
            { $set: { status: 'В Архиве из-за Категории' } }
        );

        // Рекурсивно архивируем вложенные подкатегории
        await archiveSubcategories(subcategory._id);
    }
};

// Добавление новой категории с загрузкой иконок
router.post('/', upload, validateCategory, async (req, res) => {
    const errors = validationResult(req);
    console.log(req.body)
    if (!errors.isEmpty()) {
        console.error('Ошибка валидации:', errors.array()); // Вывод ошибок в консоль
        return res.status(400).send({ errors: errors.array() });
    }

    const { name, categories_id } = req.body;
    let icon_white = '', icon_black = '';

    if (req.files['icon_white']) {
        icon_white = `/assets/icon/${req.files['icon_white'][0].filename}`;
    }
    if (req.files['icon_black']) {
        icon_black = `/assets/icon/${req.files['icon_black'][0].filename}`;
    }

    try {
        const newCategory = new Category({
            name,
            icon_white,
            icon_black,
            categories_id
        });

        await newCategory.save();
        res.status(201).send({ message: 'Категория добавлена', category: newCategory });
    } catch (error) {
        console.error('Ошибка добавления категории:', error);
        res.status(500).send({ message: 'Ошибка сервера', error });
    }
});

// Получение всех категорий
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().populate('categories_id');
        res.status(200).send(categories);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении категорий', error });
    }
});

// Получение всех архивированных категорий и товаров
router.get('/archived', async (req, res) => {
    try {
        const activeCategories = await Category.find({ status: 'В Архиве' }).populate('categories_id');

        // Если архивных категорий нет, возвращаем пустой массив
        if (!activeCategories.length) {
            return res.status(200).send([]);
        }

        res.status(200).send(activeCategories);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении архивированных категорий', error });
    }
});

// Получение всех активных категорий
router.get('/active', async (req, res) => {
    try {
        const activeCategories = await Category.find({ status: 'Активна' }).populate('categories_id');

        // Если активных категорий нет, возвращаем пустой массив
        if (!activeCategories.length) {
            return res.status(200).send([]);
        }

        res.status(200).send(activeCategories);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении активных категорий', error });
    }
});

// Получение категории по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id).populate('categories_id');

        // Если категория не найдена
        if (!category) {
            return res.status(404).send({ message: 'Категория не найдена' });
        }

        res.status(200).send(category);
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при получении категории', error });
    }
});

// Обновление категории с загрузкой иконок
router.put('/:id', upload, validateCategory, async (req, res) => {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Ошибка валидации:', errors.array()); // Вывод ошибок в консоль
        return res.status(400).send({ errors: errors.array() });
    }

    const { name, categories_id } = req.body;
    let updates = {}; // Объект для хранения изменений

    // Если имя передано, добавляем его в объект обновлений
    if (name) {
        updates.name = name;
    }

    // Если передана родительская категория, добавляем её в объект обновлений
    if (categories_id) {
        updates.categories_id = categories_id;
    }

    // Обновление иконок, если они были загружены
    if (req.files['icon_white']) {
        updates.icon_white = `/assets/icon/${req.files['icon_white'][0].filename}`;
    }
    if (req.files['icon_black']) {
        updates.icon_black = `/assets/icon/${req.files['icon_black'][0].filename}`;
    }

    try {
        // Обновляем только переданные поля
        const updatedCategory = await Category.findByIdAndUpdate(id, { $set: updates }, { new: true });

        if (!updatedCategory) {
            return res.status(404).send({ message: 'Категория не найдена' });
        }

        res.status(200).send({ message: 'Категория обновлена', category: updatedCategory });
    } catch (error) {
        res.status(500).send({ message: 'Ошибка при обновлении категории', error });
    }
});

// Архивирование категории, её подкатегорий и товаров
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).send({ message: "Категория не найдена" });
        }

        category.status = 'В Архиве';
        category.archivedAt = new Date();
        await category.save();

        // Архивируем товары в этой категории
        await Product.updateMany(
            { categories_id: id },
            { $set: { status: 'В Архиве из-за Категории' } }
        );

        // Архивируем все подкатегории
        await archiveSubcategories(id);

        res.status(200).send({ message: "Категория и все её подкатегории архивированы" });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при архивировании категории", error });
    }
});

// Восстановление категории и связанных товаров
router.put('/restore/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category || category.status !== 'В Архиве') {
            return res.status(404).send({ message: "Категория не найдена или не в архиве" });
        }

        // Восстанавливаем категорию
        category.status = 'Активна';
        category.archivedAt = null; // Сбрасываем дату архивирования
        await category.save();

        // Восстанавливаем товары этой категории
        const updatedProducts = await Product.find({ categories_id: id, status: 'В Архиве из-за Категории' });

        await Product.updateMany(
            { categories_id: id, status: 'В Архиве из-за Категории' },
            { $set: { status: 'Закончился', archivedDueToCategory: false } } // Статус на "Закончился", но обновится дальше
        );

        // Обновляем статус товаров в зависимости от их вариаций
        for (const product of updatedProducts) {
            await Product.updateProductStatus(product._id);
        }

        res.status(200).send({ message: "Категория и связанные товары восстановлены", category });
    } catch (error) {
        console.error("Ошибка при восстановлении категории:", error);
        res.status(500).send({ message: "Ошибка при восстановлении категории", error });
    }
});


module.exports = router;
