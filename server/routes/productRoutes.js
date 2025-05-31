const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const Product = require('../models/product');
const ProductVariation = require('../models/productVariation');
const router = express.Router();
const { allowedExtensions } = require('../config/whitelist'); // Белый список расширений
const uploadNone = multer().none();


// 🎯 Функция для парсинга диапазона из строки или массива
function parseRange(value) {
    if (Array.isArray(value) && value.length >= 2) {
        const min = parseFloat(value[0]);
        const max = parseFloat(value[1]);
        return (!isNaN(min) && !isNaN(max)) ? [min, max] : null;
    }

    if (typeof value === 'string') {
        const parts = value.split(/[-,]/);
        if (parts.length >= 2) {
            const min = parseFloat(parts[0]);
            const max = parseFloat(parts[1]);
            return (!isNaN(min) && !isNaN(max)) ? [min, max] : null;
        }
    }

    return null;
}

// Настройка для сохранения изображений в директорию assets/products
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'assets/products'); // путь для сохранения файлов
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`); // уникальное имя файла
    }
});
// Настройка для сохранения изображений в описании товаров
const storageDescriptionImages = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'assets/description'),
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

const upload = multer({ storage, fileFilter }).array('images', 10); // максимум 10 изображений
const uploadDescriptionImages = multer({ storage: storageDescriptionImages, fileFilter }).single('image');

// API для загрузки изображений в описание товара
router.post('/upload', (req, res) => {
    uploadDescriptionImages(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        res.status(200).json({ url: `http://localhost:8081/assets/description/${req.file.filename}` });
    });
})

// Создание нового товара
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(err)
            return res.status(400).json({ message: err.message });
        }

        const { name, description, attributes, categories_id, bonus_points } = req.body;

        if (!ObjectId.isValid(categories_id)) {
            return res.status(400).json({ message: "Некорректный ID категории" });
        }

        try {
            const sanitizedDescription = sanitizeHtml(description, {
                allowedTags: ['b', 'i', 'em', 'strong', 'p', 'ul', 'ol', 'li', 'br', 'img'],
                allowedAttributes: {
                    img: ['src', 'alt', 'width', 'height', 'style']
                }
            });

            const parsedAttributes = JSON.parse(attributes);
            const newProduct = new Product({
                name,
                description: sanitizedDescription,
                status: 'Закончился',
                images: req.files ? req.files.map(file => `/assets/products/${file.filename}`) : [],
                attributes: parsedAttributes,
                categories_id: new ObjectId(categories_id),
                bonus_points: bonus_points || 0,
                is_on_sale: false
            });

            const savedProduct = await newProduct.save();
            res.status(201).json(savedProduct);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Ошибка создания товара", error });
        }
    });
});

// Получение всех товаров 
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения товаров", error });
    }
});

// Получение всех активных товаров
router.get('/active', async (req, res) => {
    try {
        const activeProducts = await Product.find({ status: { $in: ['В наличие', 'Закончился'] } });
        res.status(200).json(activeProducts);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения активных товаров", error });
    }
});

// Получение всех архивных товаров
router.get('/archived', async (req, res) => {
    try {
        const archivedProducts = await Product.find({ status: { $in: ['В Архиве', 'В Архиве из-за Категории'] } });
        res.status(200).json(archivedProducts);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения архивных товаров", error });
    }
});

// Маршрут для получения статистики товаров
router.get('/statistics', async (req, res) => {
    try {
        // Общая статистика
        const totalProducts = await Product.countDocuments();

        // Статистика по статусам
        const statusStats = await Product.aggregate([
            {
                $group: {
                    _id: '$status', // Группируем по статусу
                    count: { $sum: 1 }, // Подсчитываем количество
                },
            },
        ]);

        // Статистика по дате создания (последние 7 и 30 дней)
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const recentStats = await Product.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }, // Фильтруем товары за последние 7 дней
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            },
        ]);

        const monthlyStats = await Product.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }, // Фильтруем товары за последние 30 дней
                },
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json({
            totalProducts,
            statusStats,
            recentProducts: recentStats[0]?.count || 0,
            monthlyProducts: monthlyStats[0]?.count || 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при получении статистики товаров', error });
    }
});

// Получение фильтров по активным товарам
router.get('/filters', async (req, res) => {
    try {
        const activeProducts = await Product.find({ status: { $in: ['В наличие', 'Закончился'] } }).lean();
        const productIds = activeProducts.map(p => p._id);
        const variations = await ProductVariation.find({ product_id: { $in: productIds } }).lean();

        const filters = {}; // { section: { key: Set(values) } }
        const keyToSectionMap = {}; // автоопределение секций

        // Сначала добавляем фильтры из attributes товаров
        for (const product of activeProducts) {
            const attrs = product.attributes;
            if (!attrs || typeof attrs !== 'object') continue;

            for (const [section, sectionAttrs] of Object.entries(attrs)) {
                if (typeof sectionAttrs !== 'object') continue;

                if (!filters[section]) filters[section] = {};

                for (const [key, value] of Object.entries(sectionAttrs)) {
                    // Запоминаем, в какой секции встретился ключ
                    if (!keyToSectionMap[key]) keyToSectionMap[key] = section;

                    if (!filters[section][key]) filters[section][key] = new Set();
                    filters[section][key].add(value);
                }
            }
        }

        // Теперь добавляем фильтры из attributes вариаций (плоский объект)
        for (const variation of variations) {
            const attrs = variation.attributes;
            if (!attrs || typeof attrs !== 'object') continue;

            for (const [key, value] of Object.entries(attrs)) {
                // Автоопределение секции
                const section = keyToSectionMap[key] || 'Общие';

                if (!filters[section]) filters[section] = {};
                if (!filters[section][key]) filters[section][key] = new Set();
                filters[section][key].add(value);
            }
        }

        // Преобразуем Set в массивы
        const normalizedFilters = {};
        for (const [section, keys] of Object.entries(filters)) {
            normalizedFilters[section] = {};
            for (const [key, valueSet] of Object.entries(keys)) {
                normalizedFilters[section][key] = Array.from(valueSet);
            }
        }

        res.status(200).json({ filters: normalizedFilters });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка при получении фильтров", error });
    }
});


// Получение активных товаров с фильтрами, сортировкой и пагинацией
router.get('/active/search', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 9,
            sortBy = 'createdAt',
            order = 'desc',
            minPrice,
            maxPrice,
            category,
            discountRange,
            ratingRange,
            ...restFilters
        } = req.query;

        // console.log(req.query)

        // Чистим от неатрибутных полей
        const EXCLUDED_KEYS = [
            'page', 'limit', 'sortBy', 'order',
            'minPrice', 'maxPrice', 'category',
            'ratingRange', 'discountRange'
        ];

        const attributeFilters = {};
        for (const [key, value] of Object.entries(restFilters)) {
            if (!EXCLUDED_KEYS.includes(key)) {
                if (typeof value === 'string') {
                    attributeFilters[key] = value;
                } else if (Array.isArray(value)) {
                    attributeFilters[key] = { $in: value };
                } else {
                    console.warn(`⚠️ Пропущен фильтр: ${key}=${value}`);
                }
            } else {
                console.warn(`⚠️ Пропущен фильтр: ${key}=${value}`);
            }
        }


        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const sortOrder = order === 'asc' ? 1 : -1;

        // Категории
        const categoryIds = Array.isArray(category)
            ? category.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
            : [];

        // Построение агрегационного пайплайна
        const pipeline = [
            {
                $match: {
                    status: { $in: ['В наличии', 'Закончился'] }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },

            // Статус товара
            {
                $match: {
                    'product.status': { $in: ['В наличие', 'Закончился'] }
                }
            },
            {
                $lookup: {
                    from: 'promotionproductcategories',
                    let: {
                        product_id: '$product_id',
                        categories_id: '$product.categories_id',
                        attributes: '$product.attributes'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$product_id', '$$product_id'] },
                                        { $eq: ['$category_id', '$$categories_id'] },
                                        {
                                            $gt: [
                                                {
                                                    $size: {
                                                        $filter: {
                                                            input: { $objectToArray: '$$attributes' },
                                                            as: 'section',
                                                            cond: {
                                                                $eq: ['$$section.v.Производитель', '$brand_name']
                                                            }
                                                        }
                                                    },
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'promotion_targets'
                }
            },
            {
                $lookup: {
                    from: 'promotions',
                    let: { now: new Date(), targets: '$promotion_targets' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$is_active', true] },
                                        { $lte: ['$start_date', '$$now'] },
                                        { $gte: ['$end_date', '$$now'] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'promotionproductcategories',
                                localField: '_id',
                                foreignField: 'promotion_id',
                                as: 'targets'
                            }
                        },
                        {
                            $match: {
                                $expr: {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: '$targets',
                                                    as: 't',
                                                    cond: {
                                                        $or: [
                                                            { $in: ['$$t.product_id', '$$targets.product_id'] },
                                                            { $in: ['$$t.category_id', '$$targets.category_id'] },
                                                            { $in: ['$$t.brand_name', '$$targets.brand_name'] }
                                                        ]
                                                    }
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                discount_type: 1,
                                discount_value: 1,
                                gift_product_id: 1,
                                start_date: 1,
                                end_date: 1,
                                min_order_amount: 1,
                                max_discount: 1,
                                is_combinable: 1
                            }
                        }
                    ],
                    as: 'applicable_promotions'
                }
            },
            {
                $addFields: {
                    applicable_promotions: {
                        $cond: [
                            { $eq: ['$product.is_on_sale', true] },
                            '$applicable_promotions',
                            []
                        ]
                    }
                }
            }

        ];

        // Фильтр по цене
        const priceFilter = {};
        if (minPrice) priceFilter.$gte = parseFloat(minPrice);
        if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
        if (Object.keys(priceFilter).length > 0) {
            pipeline.push({ $match: { price: priceFilter } });
        }

        // Фильтр по категориям
        if (categoryIds.length > 0) {
            pipeline.push({ $match: { 'product.categories_id': { $in: categoryIds } } });
        }

        // Фильтр по атрибутам вариации и товара
        // console.log("attributeFilters: ", attributeFilters)

        for (const [key, rawValue] of Object.entries(attributeFilters)) {
            // Поддержка формата { $in: [...] }
            const values =
                rawValue && typeof rawValue === 'object' && rawValue.$in
                    ? rawValue.$in
                    : Array.isArray(rawValue)
                        ? rawValue
                        : typeof rawValue === 'string'
                            ? [rawValue]
                            : [];

            if (values.length === 0) continue;

            // console.log(`Фильтрация по атрибуту "${key}" со значениями:`, values);

            pipeline.push({
                $match: {
                    $or: [
                        // Проверяем, есть ли хотя бы одно значение в вариации
                        { [`attributes.${key}`]: { $in: values } },

                        // Проверяем, есть ли хотя бы одно значение в товаре (в любой секции)
                        {
                            $expr: {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: { $objectToArray: "$product.attributes" },
                                                as: "section",
                                                cond: {
                                                    $in: [`$$section.v.${key}`, values]
                                                }
                                            }
                                        }
                                    },
                                    0
                                ]
                            }
                        }
                    ]
                }
            });
        }

        // --- Discount ---
        const discountRangeParsed = parseRange(discountRange);
        if (discountRangeParsed) {
            const [minDiscount, maxDiscount] = discountRangeParsed;
            pipeline.push({
                $match: {
                    discount: { $gte: minDiscount, $lte: maxDiscount }
                }
            });
        } else if (discountRange) {
            console.warn(`⚠️ Невалидный discountRange:`, discountRange);
        }

        // --- Rating ---
        const ratingRangeParsed = parseRange(ratingRange);
        if (ratingRangeParsed) {
            const [minRating, maxRating] = ratingRangeParsed;
            pipeline.push({
                $match: {
                    'product.rating': { $gte: minRating, $lte: maxRating }
                }
            });
        } else if (ratingRange) {
            console.warn(`⚠️ Невалидный ratingRange:`, ratingRange);
        }


        // Подсчёт total
        const countPipeline = [...pipeline, { $count: 'total' }];
        // console.log("countPipeline: ", countPipeline)
        const countResult = await ProductVariation.aggregate(countPipeline);
        // console.log("countResult: ", countResult)
        const total = countResult[0]?.total || 0;

        // Сортировка и пагинация
        pipeline.push({
            $addFields: {
                discountedPrice: {
                    $cond: [
                        { $gt: ['$discount', 0] },
                        {
                            $subtract: [
                                { $toDouble: '$price' },
                                {
                                    $divide: [
                                        { $multiply: [{ $toDouble: '$price' }, { $toDouble: '$discount' }] },
                                        100
                                    ]
                                }
                            ]
                        },
                        { $toDouble: '$price' }
                    ]
                },
                ratingDouble: { $toDouble: '$product.rating' },
                discountDouble: { $toDouble: '$discount' }
            }
        });

        let sortField;
        switch (sortBy) {
            case 'variations.price':
                sortField = 'discountedPrice';
                break;
            case 'rating':
                sortField = 'ratingDouble';
                break;
            case 'variations.discount':
                sortField = 'discountDouble';
                break;
            default:
                sortField = sortBy;
        }

        pipeline.push(
            { $sort: { [sortField]: sortOrder } },
            { $skip: skip },
            { $limit: limitNum }
        );

        // console.log("pipeline: ", pipeline)
        const variations = await ProductVariation.aggregate(pipeline);

        res.status(200).json({
            total,
            page: pageNum,
            limit: limitNum,
            variations
        });

    } catch (error) {
        console.error('Ошибка при поиске активных вариаций:', error);
        res.status(500).json({ message: 'Ошибка при поиске активных вариаций', error });
    }
});

// Получение товара по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Товар не найден" });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения товара", error });
    }
});

// Обновление товара с удалением изображений
router.put('/:id', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        const { id } = req.params;
        const { name, description, categories_id, attributes, imagesToDelete, bonus_points, is_on_sale } = req.body;

        try {
            const categoryObjectId = ObjectId.isValid(categories_id) ? new ObjectId(categories_id) : null;
            if (!categoryObjectId) {
                return res.status(400).json({ message: "Некорректный ID категории" });
            }

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({ message: "Товар не найден" });
            }

            if (imagesToDelete) {
                const imagesToDeleteArray = JSON.parse(imagesToDelete);

                await Promise.all(imagesToDeleteArray.map(async (image) => {
                    const imagePath = path.join(__dirname, '..', 'public', image);
                    if (fs.existsSync(imagePath)) {
                        await fs.promises.unlink(imagePath);
                    }
                    product.images = product.images.filter(img => img !== image);
                }));
            }

            if (req.files) {
                const newImages = req.files.map(file => `/assets/products/${file.filename}`);
                product.images = [...product.images, ...newImages];
            }

            const sanitizedDescription = sanitizeHtml(description, {
                allowedTags: ['b', 'i', 'em', 'strong', 'p', 'ul', 'ol', 'li', 'br', 'img'],
                allowedAttributes: {
                    img: ['src', 'alt', 'width', 'height', 'style']
                }
            });

            product.name = name || product.name;
            product.description = sanitizedDescription || product.description;
            product.attributes = attributes ? JSON.parse(attributes) : product.attributes;
            product.categories_id = categoryObjectId;
            product.bonus_points = bonus_points !== undefined ? parseInt(bonus_points, 10) : product.bonus_points;
            product.is_on_sale = is_on_sale !== undefined ? is_on_sale === 'true' : product.is_on_sale;

            const updatedProduct = await product.save();
            res.status(200).json(updatedProduct);
        } catch (error) {
            console.error("Ошибка обновления товара:", error);
            res.status(500).json({ message: "Ошибка обновления товара", error });
        }
    });
});

// "Удаление" товара (смена статуса на "archived")
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Товар не найден" });
        }

        product.status = 'В Архиве';
        await product.save();

        res.status(200).json({ message: "Товар перемещен в архив" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка архивирования товара", error });
    }
});

// Восстановление товара из архива
router.put('/restore/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);
        if (!product || product.status !== 'В Архиве') {
            return res.status(404).json({ message: "Товар не найден или не в архиве" });
        }
        // Обновляем статус товаров в зависимости от их вариаций
        await Product.updateProductStatus(product._id);
        await product.save();

        res.status(200).json({ message: "Товар восстановлен", product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка восстановления товара", error });
    }
});

// Восстановление товара с изменением категории
router.put('/restore-product/:productId', async (req, res) => {
    const { productId } = req.params;
    const { category_id } = req.body;

    if (!category_id) {
        return res.status(400).json({ message: "Необходимо указать новую категорию для товара" });
    }

    try {
        const product = await Product.findById(productId);
        if (!product || product.status !== 'В Архиве из-за Категории') {
            return res.status(404).json({ message: "Товар не найден или не в архиве" });
        }

        product.categories_id = category_id;
        // Обновляем статус товаров в зависимости от их вариаций
        await Product.updateProductStatus(product._id);
        await product.save();

        res.status(200).json({ message: "Товар восстановлен и перемещён в новую категорию", product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка при восстановлении товара", error });
    }
});

module.exports = router;
