const express = require('express');
const Banner = require('../models/banner');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { allowedExtensions } = require('../config/whitelist'); // Белый список расширений
const sanitizeHtml = require('sanitize-html');

// Настройка для сохранения изображений
const storage= multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'assets/banners'),
    filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

// Фильтр для проверки допустимых расширений файлов
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Недопустимый формат файла. Разрешены только изображения.'));
    }
};

const upload = multer({ storage: storage, fileFilter }).single('image');

// API для загрузки изображений
router.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        res.status(200).json({ url: `http://localhost:8081/assets/banners/${req.file.filename}` });
    });
})

// Создание баннера
router.post('/', async (req, res) => {
    try {
        const banner = new Banner(req.body);
        const savedBanner = await banner.save();
        res.status(201).json(savedBanner);
    } catch (error) {
        console.error('Ошибка при создании баннера:', error);
        res.status(500).json({ message: 'Ошибка при создании баннера', error });
    }
});

// Получение всех баннеров
router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения баннеров', error });
    }
});

// Получение активных баннеров (по времени, is_active, позиции и приоритету)
router.get('/active', async (req, res) => {
    const now = new Date();
    const { position, priority } = req.query;

    const query = {
        is_active: true,
        start_date: { $lte: now },
        end_date: { $gte: now }
    };

    if (position) {
        query.position = position;
    }

    if (priority) {
        const priorityValues = priority.split(',').map(Number).filter(n => !isNaN(n));
        if (priorityValues.length > 0) {
            query.priority = { $in: priorityValues };
        }
    }

    try {
        const banners = await Banner.find(query).sort({ priority: -1 });
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения активных баннеров', error });
    }
});


// Обновление баннера
router.put('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const updatedBanner = await Banner.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedBanner) {
            return res.status(404).json({ message: 'Баннер не найден' });
        }

        res.status(200).json(updatedBanner);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка обновления баннера', error });
    }
});

// Удаление баннера
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedBanner = await Banner.findByIdAndDelete(id);
        if (!deletedBanner) {
            return res.status(404).json({ message: 'Баннер не найден' });
        }

        res.status(200).json({ message: 'Баннер удалён', deletedBanner });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка удаления баннера', error });
    }
});

module.exports = router;
