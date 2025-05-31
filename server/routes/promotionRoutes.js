const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Promotion = require('../models/promotion');
const PromotionProductCategory = require('../models/promotionProductCategory');
const ActivityLog = require('../models/activityLog');
const multer = require('multer');
const path = require('path');
const { allowedExtensions } = require('../config/whitelist');
const Product = require('../models/product');
const ProductVariation = require('../models/productVariation');


async function updateProductSaleStatusForProduct(productId) {
    const product = await Product.findById(productId);
    if (!product) return;

    let brand = null;
    if (product.attributes && typeof product.attributes === 'object') {
        for (const section of Object.values(product.attributes)) {
            if (section && section['Производитель']) {
                brand = section['Производитель'];
                break;
            }
        }
    }

    // Находим все связи товара с акциями
    const filters = [
        { product_id: productId },
        { category_id: { $in: product.categories_id || [] } }
    ];

    // Добавляем бренд только если он существует
    if (brand !== null) {
        filters.push({ brand_name: brand });
    }

    const related = await PromotionProductCategory.find({
        $or: filters
    });

    const promotionIds = related.map(r => r.promotion_id);

    // Проверяем, есть ли среди них активные акции
    const activeCount = await Promotion.countDocuments({
        _id: { $in: promotionIds },
        is_active: true
    });

    await Product.findByIdAndUpdate(productId, { is_on_sale: activeCount > 0 });
}

async function syncPromotionTargets(promotionId, targets = []) {
    // Получаем товары из старых целей
    const oldTargets = await PromotionProductCategory.find({ promotion_id: promotionId });
    const oldProductIds = new Set();

    for (const t of oldTargets) {
        if (t.product_id) oldProductIds.add(t.product_id.toString());
        if (t.category_id) {
            const products = await Product.find({ categories_id: t.category_id }, '_id');
            products.forEach(p => oldProductIds.add(p._id.toString()));
        }
        if (t.brand_name) {
            const products = await Product.find({
                $expr: {
                    $gt: [
                        {
                            $size: {
                                $filter: {
                                    input: { $objectToArray: "$attributes" },
                                    as: "section",
                                    cond: {
                                        $eq: ["$$section.v.Производитель", t.brand_name]
                                    }
                                }
                            }
                        },
                        0
                    ]
                }
            }, '_id');
            products.forEach(p => oldProductIds.add(p._id.toString()));
        }
    }

    // Удаляем старые связи
    await PromotionProductCategory.deleteMany({ promotion_id: promotionId });

    // Создаём новые связи
    const targetDocs = targets.map(t => ({
        promotion_id: promotionId,
        product_id: t.product_id || null,
        category_id: t.category_id || null,
        brand_name: t.brand_name || null
    }));
    await PromotionProductCategory.insertMany(targetDocs);

    // Получаем товары из новых целей
    const newProductIds = new Set();
    for (const t of targets) {
        if (t.product_id) newProductIds.add(t.product_id.toString());
        if (t.category_id) {
            const products = await Product.find({ categories_id: t.category_id }, '_id');
            products.forEach(p => newProductIds.add(p._id.toString()));
        }
        if (t.brand_name) {
            const products = await Product.find({
                $expr: {
                    $gt: [
                        {
                            $size: {
                                $filter: {
                                    input: { $objectToArray: "$attributes" },
                                    as: "section",
                                    cond: {
                                        $eq: ["$$section.v.Производитель", t.brand_name]
                                    }
                                }
                            }
                        },
                        0
                    ]
                }
            }, '_id');
            products.forEach(p => newProductIds.add(p._id.toString()));
        }
    }

    // Объединяем оба списка
    const allAffectedIds = new Set([...oldProductIds, ...newProductIds]);

    // Обновляем флаг is_on_sale у всех затронутых товаров
    for (const productId of allAffectedIds) {
        await updateProductSaleStatusForProduct(productId);
    }

    return targetDocs;
}

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

// Настройка для сохранения изображений
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'assets/promotions'),
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
        res.status(200).json({ url: `http://localhost:8081/assets/promotions/${req.file.filename}` });
    });
})

// Создание новой акции
router.post('/', async (req, res) => {
    const {
        name, description, discount_type, discount_value, gift_product_id,
        start_date, end_date, min_order_amount, max_discount,
        is_active, is_combinable, user_id, targets = [], background_color, banner
    } = req.body;

    try {
        const newPromotion = new Promotion({
            name,
            description,
            discount_type,
            discount_value,
            gift_product_id,
            start_date,
            end_date,
            min_order_amount,
            max_discount,
            is_active,
            is_combinable,
            background_color,
            banner
        });

        const savedPromotion = await newPromotion.save();

        await syncPromotionTargets(savedPromotion._id, targets);

        await ActivityLog.create({
            user_id,
            action_type: 'Создание акции',
            item_id: savedPromotion._id,
            description: `Создана акция "${name}"`
        });

        res.status(201).json(savedPromotion);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при создании акции", error });
    }
});


// Получение всех акций
router.get('/', async (req, res) => {
    try {
        const promotions = await Promotion.find();
        res.status(200).json(promotions);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении акций", error });
    }
});

// Получение всех акций
router.get('/active', async (req, res) => {
    try {
        const promotions = await Promotion.find({ is_active: true });
        res.status(200).json(promotions);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении акций", error });
    }
});

// Получение акции по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const promotion = await Promotion.findById(id);
        if (!promotion) {
            return res.status(404).json({ message: "Акция не найдена" });
        }
        const targets = await PromotionProductCategory.find({ promotion_id: id });
        res.status(200).json({ promotion, targets });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Ошибка при получении акции", error });
    }
});

// Получение акций, подходящих для товара
router.get('/by-product/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    // Категории товара — массив
    const categoryIds = Array.isArray(product.categories_id)
      ? product.categories_id
      : [product.categories_id];

    // Все значения "Производитель" из attributes
    const manufacturerValues = getAllManufacturers(product.attributes);

    // Запрос в PromotionProductCategory с учётом брендов
    const targets = await PromotionProductCategory.find({
      $or: [
        { product_id: product._id },
        { category_id: { $in: categoryIds } },
        { brand_name: { $in: manufacturerValues } }
      ]
    });

    // Выбираем уникальные promotion_id из найденных связей
    const promotionIds = [...new Set(targets.map(t => t.promotion_id))];

    const promotions = await Promotion.find({
      _id: { $in: promotionIds },
      is_active: true
    });

    res.status(200).json(promotions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка при фильтрации акций", error });
  }
});

function getAllManufacturers(attributes) {
  if (!attributes || typeof attributes !== 'object') return [];
  const values = [];

  for (const sectionKey in attributes) {
    const section = attributes[sectionKey];
    if (section && typeof section === 'object' && section['Производитель']) {
      values.push(section['Производитель']);
    }
  }

  return values;
}



// Получение адаптивных фильтров по акции
router.get('/:id/filters', async (req, res) => {
    const { id } = req.params;

    try {
        const targets = await PromotionProductCategory.find({ promotion_id: id });

        const matchStages = [];

        const productIds = targets.filter(t => t.product_id).map(t => t.product_id);
        if (productIds.length > 0) {
            matchStages.push({ _id: { $in: productIds } });
        }

        const categoryIds = targets.filter(t => t.category_id).map(t => t.category_id);
        if (categoryIds.length > 0) {
            matchStages.push({ category_id: { $in: categoryIds } });
        }

        const brandNames = targets.filter(t => t.brand_name).map(t => t.brand_name);

        const aggregationPipeline = [];

        if (matchStages.length > 0) {
            aggregationPipeline.push({ $match: { $or: matchStages } });
        }

        if (brandNames.length > 0) {
            aggregationPipeline.push({
                $match: {
                    $or: brandNames.map(brand => ({
                        $expr: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: { $objectToArray: "$attributes" },
                                            as: "section",
                                            cond: {
                                                $eq: [
                                                    {
                                                        $ifNull: [
                                                            {
                                                                $getField: {
                                                                    field: "Производитель",
                                                                    input: "$$section.v"
                                                                }
                                                            },
                                                            null
                                                        ]
                                                    },
                                                    brand
                                                ]
                                            }
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }))
                }
            });
        }

        const products = await Product.aggregate(aggregationPipeline);
        const productMap = new Map(); // Map<product_id, attributes>
        const filters = {}; // { section: { key: Set(values) } }
        const attributeSectionMap = {}; // key -> section (определяется по товарам)

        for (const product of products) {
            const attrs = product.attributes;
            if (!attrs || typeof attrs !== 'object') continue;

            const productId = product._id.toString();
            productMap.set(productId, attrs);

            for (const [section, sectionAttrs] of Object.entries(attrs)) {
                if (typeof sectionAttrs !== 'object') continue;

                if (!filters[section]) filters[section] = {};

                for (const [key, value] of Object.entries(sectionAttrs)) {
                    if (!attributeSectionMap[key]) {
                        attributeSectionMap[key] = section; // запоминаем первую встреченную секцию
                    }

                    if (!filters[section][key]) filters[section][key] = new Set();
                    filters[section][key].add(value);
                }
            }
        }

        // Получаем все вариации по найденным товарам
        const variationDocs = await ProductVariation.find({
            product_id: { $in: Array.from(productMap.keys()) }
        });

        for (const variation of variationDocs) {
            const attrs = variation.attributes;
            if (!attrs || typeof attrs !== 'object') continue;

            for (const [key, value] of Object.entries(attrs)) {
                const section = attributeSectionMap[key] || 'Общие';

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


// Маршрут для получения товаров участвующих в акции с фильтрацией 
router.get('/:id/products', async (req, res) => {
    const { id } = req.params;
    const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        order = 'desc',
        minPrice,
        maxPrice,
        category,
        discountRange,
        ratingRange,
        search = '',
        ...restFilters
    } = req.query;
    // console.log("req.params: ", req.params)
    // console.log(req.query)

    try {
        const targets = await PromotionProductCategory.find({ promotion_id: id });

        if (!targets.length) {
            return res.status(200).json({ total: 0, variations: [] });
        }

        const matchPromotion = {
            $or: []
        };

        for (const t of targets) {
            if (t.product_id) matchPromotion.$or.push({ 'product._id': t.product_id });
            if (t.category_id) matchPromotion.$or.push({ 'product.categories_id': t.category_id });
            if (t.brand_name) {
                matchPromotion.$or.push({
                    $expr: {
                        $gt: [
                            {
                                $size: {
                                    $filter: {
                                        input: { $objectToArray: "$product.attributes" },
                                        as: "section",
                                        cond: {
                                            $eq: [`$$section.v.Производитель`, t.brand_name]
                                        }
                                    }
                                }
                            },
                            0
                        ]
                    }
                });
            }
        }

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

            {
                $match: {
                    'product.status': { $in: ['В наличие', 'Закончился'] },
                    'product.is_on_sale': true
                }
            },

            {
                $match: matchPromotion
            }
        ];

        // Фильтрация по поиску (name)
        if (search.trim()) {
            pipeline.push({
                $match: {
                    'product.name': { $regex: search.trim(), $options: 'i' }
                }
            });
        }

        // Фильтр по цене
        const priceFilter = {};
        if (minPrice) priceFilter.$gte = parseFloat(minPrice);
        if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
        if (Object.keys(priceFilter).length > 0) {
            pipeline.push({ $match: { price: priceFilter } });
        }

        // Фильтр по категориям
        if (Array.isArray(category) && category.length) {
            const validIds = category
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));

            if (validIds.length) {
                pipeline.push({ $match: { 'product.categories_id': { $in: validIds } } });
            }
        }

        // Фильтр по атрибутам
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

        // Фильтрация по скидке
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
        const countResult = await ProductVariation.aggregate(countPipeline);
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

        const variations = await ProductVariation.aggregate(pipeline);

        res.status(200).json({
            total,
            page: pageNum,
            limit: limitNum,
            variations
        });
    } catch (error) {
        console.error('Ошибка при получении товаров по акции:', error);
        res.status(500).json({ message: 'Ошибка при получении товаров по акции', error });
    }
});


// Обновление акции по ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        name, description, discount_type, discount_value, gift_product_id,
        start_date, end_date, min_order_amount, max_discount,
        is_active, is_combinable, user_id, targets = [], background_color, banner
    } = req.body;

    try {
        const updatedPromotion = await Promotion.findByIdAndUpdate(
            id,
            {
                name, description, discount_type, discount_value, gift_product_id,
                start_date, end_date, min_order_amount, max_discount,
                is_active, is_combinable, background_color, banner
            },
            { new: true }
        );

        if (!updatedPromotion) {
            return res.status(404).json({ message: "Акция не найдена" });
        }

        await syncPromotionTargets(updatedPromotion._id, targets);

        await ActivityLog.create({
            user_id,
            action_type: 'Обновление акции',
            item_id: updatedPromotion._id,
            description: `Обновлена акция "${updatedPromotion.name}"`
        });

        res.status(200).json(updatedPromotion);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Ошибка при обновлении акции", error });
    }
});

// Архивирование
router.put('/archive/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
        const promotion = await Promotion.findByIdAndUpdate(id, { is_active: false }, { new: true });
        if (!promotion) return res.status(404).json({ message: "Акция не найдена" });
        const related = await PromotionProductCategory.find({ promotion_id: id });
        for (const r of related) {
            if (r.product_id) await updateProductSaleStatusForProduct(r.product_id);
        }
        await ActivityLog.create({
            user_id,
            action_type: 'Архивация акции',
            item_id: promotion._id,
            description: `Акция "${promotion.name}" архивирована`
        });

        res.status(200).json(promotion);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при архивировании", error });
    }
});

// Восстановление
router.put('/restore/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
        const promotion = await Promotion.findByIdAndUpdate(id, { is_active: true }, { new: true });
        if (!promotion) return res.status(404).json({ message: "Акция не найдена" });
        const related = await PromotionProductCategory.find({ promotion_id: id });
        for (const r of related) {
            if (r.product_id) await updateProductSaleStatusForProduct(r.product_id);
        }
        await ActivityLog.create({
            user_id,
            action_type: 'Восстановление акции',
            item_id: promotion._id,
            description: `Акция "${promotion.name}" восстановлена`
        });

        res.status(200).json(promotion);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при восстановлении", error });
    }
});

// Удаление
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;

    try {
        const deletedPromotion = await Promotion.findByIdAndDelete(id);
        if (!deletedPromotion) return res.status(404).json({ message: "Акция не найдена" });

        const related = await PromotionProductCategory.find({ promotion_id: id });
        for (const r of related) {
            if (r.product_id) await updateProductSaleStatusForProduct(r.product_id);
        }
        await PromotionProductCategory.deleteMany({ promotion_id: id });

        await ActivityLog.create({
            user_id,
            action_type: 'Удаление акции',
            item_id: deletedPromotion._id,
            description: `Удалена акция "${deletedPromotion.name}"`
        });

        res.status(200).json({ message: "Акция удалена", deletedPromotion });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при удалении", error });
    }
});


module.exports = router;