const express = require('express');
const router = express.Router();
const Cart = require('../models/cart');
const ProductVariation = require('../models/productVariation');  // Допустим, что есть такая модель
const PromotionProductCategory = require('../models/promotionProductCategory');
const Promotion = require('../models/promotion');
const Product = require('../models/product');
const { User } = require('../models/user');  // Модель пользователя

// Добавление товара в корзину
router.post('/', async (req, res) => {
    const { quantity, product_variations_id, users_id } = req.body;

    try {
        // Проверка, что продукт и пользователь существуют
        const product = await ProductVariation.findById(product_variations_id);
        const user = await User.findById(users_id);
        if (!product || !user) {
            return res.status(400).send({ message: "Неверные данные: продукт или пользователь не найдены" });
        }

        // Создаем новую запись корзины
        const newCartItem = new Cart({
            quantity,
            product_variations_id,
            users_id
        });

        await newCartItem.save();
        res.status(201).send({ message: "Товар добавлен в корзину", cartItem: newCartItem });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка сервера", error });
    }
});

// Получение всех товаров в корзине для пользователя
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const cartItems = await Cart.find({ users_id: userId }).populate('product_variations_id');
        res.status(200).send(cartItems);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении корзины", error });
    }
});

// GET /cart/:userId/summary
router.get('/:userId/summary', async (req, res) => {
    const { userId } = req.params;

    try {
        const cartItems = await Cart.find({ users_id: userId }).populate({
            path: 'product_variations_id',
            populate: { path: 'product_id' }
        });

        if (!cartItems.length) {
            return res.status(200).send({ summary: [], total: 0, tax: 0 });
        }

        const TAX_RATE = 0.05;
        const summary = [];
        let totalOriginal = 0;
        let totalDiscount = 0;
        let subtotal = 0;

        const productIds = [];

        for (const item of cartItems) {
            const variation = item.product_variations_id;
            const product = variation.product_id;

            productIds.push(product._id);

            const quantity = item.quantity;
            const price = parseFloat(variation.price.toString());
            const discountPercent = parseFloat(variation.discount?.toString() || '0');

            const discountAmountPerUnit = price * (discountPercent / 100);
            const priceAfterDiscount = price - discountAmountPerUnit;

            const originalPrice = price * quantity;
            const discountTotal = discountAmountPerUnit * quantity;
            const itemSubtotal = priceAfterDiscount * quantity;

            summary.push({
                name: product.name,
                quantity,
                originalPrice,
                discount: discountTotal,
                subtotal: itemSubtotal
            });

            totalOriginal += originalPrice;
            totalDiscount += discountTotal;
            subtotal += itemSubtotal;
        }

        // 🔍 Поиск акций по всем товарам
        const productDocs = await Product.find({ _id: { $in: productIds } });

        const allTargets = await PromotionProductCategory.find({
            $or: productDocs.flatMap(product => {
                const categories = Array.isArray(product.categories_id)
                    ? product.categories_id
                    : [product.categories_id];

                const manufacturers = getAllManufacturers(product.attributes);

                return [
                    { product_id: product._id },
                    { category_id: { $in: categories } },
                    { brand_name: { $in: manufacturers } }
                ];
            })
        });

        const promotionIds = [...new Set(allTargets.map(t => t.promotion_id.toString()))];

        const promotions = await Promotion.find({
            _id: { $in: promotionIds },
            is_active: true
        });

        // 👇 Применение только первой подходящей акции
        let promotionDiscount = 0;
        let appliedPromotion = null;

        for (const promo of promotions) {
            const minOrderAmount = parseFloat(promo.min_order_amount?.toString() || '0');

            if (subtotal >= minOrderAmount) {
                if (promo.discount_type === 'Процент') {
                    const percent = parseFloat(promo.discount_value.toString());
                    promotionDiscount = subtotal * (percent / 100);
                } else if (promo.discount_type === 'Фиксированная сумма') {
                    promotionDiscount = parseFloat(promo.discount_value.toString());
                }

                // 👉 Ограничение по максимальной скидке
                if (promo.max_discount) {
                    const maxDiscount = parseFloat(promo.max_discount.toString());
                    promotionDiscount = Math.min(promotionDiscount, maxDiscount);
                }
                appliedPromotion = {
                    name: promo.name,
                    discount_type: promo.discount_type,
                    discount_value: promo.discount_value,
                    end_date: promo.end_date,
                    gift_product_id: promo.gift_product_id
                };
                break; // применяем только первую подходящую акцию
            }
        }

        subtotal -= promotionDiscount;
        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax;

        res.status(200).json({
            summary,
            totalOriginal,
            totalDiscount,
            promotionDiscount,
            promotion: appliedPromotion,
            subtotal,
            tax,
            total
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Ошибка при расчёте итогов корзины", error });
    }
});

// Вспомогательная функция
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
// Обновление количества товара в корзине
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    try {
        const cartItem = await Cart.findById(id);
        if (!cartItem) {
            return res.status(404).send({ message: "Товар в корзине не найден" });
        }

        cartItem.quantity = quantity;
        await cartItem.save();
        res.status(200).send({ message: "Количество обновлено", cartItem });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при обновлении товара в корзине", error });
    }
});

// Удаление товара из корзины
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const cartItem = await Cart.findById(id);
        if (!cartItem) {
            return res.status(404).send({ message: "Товар в корзине не найден" });
        }

        await Cart.deleteOne({ _id: id });
        res.status(200).send({ message: "Товар удален из корзины" });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при удалении товара из корзины", error });
    }
});

module.exports = router;
