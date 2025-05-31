const router = require('express').Router();
const Order = require('../models/order');
const ProductVariation = require('../models/productVariation');
const { User } = require('../models/user');
const WarehouseInventory = require('../models/warehouseInventory');
const WarehouseTask = require('../models/warehouseTask');
const Cart = require('../models/cart');
const LoyaltyHistory = require('../models/loyaltyHistory');

router.post('/', async (req, res) => {
    try {
        const {
            users_id,
            payment_method,
            address,
            bonus_points_used,
            discount_applied,
            subtotal,
            tax,
            total_amount,
            delivery_data,
            order_items
        } = req.body;

        // Определение уникальных складов и склада-исполнителя
        const assembledWarehouses = [...new Set(order_items.map(item => item.warehouse_id))];
        const fulfillmentWarehouseId = assembledWarehouses[0];

        // Получение пользователя
        const user = await User.findById(users_id);

        // Создание нового заказа
        const order = new Order({
            status: 'Ожидает',
            payment_method,
            total_amount,
            tax,
            users_id,
            bonus_points_used,
            discount_applied,
            warehouse_id: {
                fulfillment_warehouse_id: fulfillmentWarehouseId,
                assembled_from_warehouses: assembledWarehouses
            },
            delivery_methods_id: delivery_data._id,
            distance_km: req.body.distance_km,
            delivery_data: {
                recipient_name: user.name,
                phone: user.phone,
                address: address.address,
                location: {
                    lat: address.location.latitude,
                    lng: address.location.longitude
                },
                additional_info: delivery_data.additional_info || '',
                delivery_method: delivery_data.method,
                delivery_parts: delivery_data.delivery_parts
            },
            estimated_delivery_datetime: new Date(delivery_data.estimated_delivery.max_date),
            requires_assembly: assembledWarehouses.length > 1,
            assembly_time_hours: assembledWarehouses.length > 1 ? 24 : 0,
            order_items: order_items.map(i => ({
                product_variation_id: i.variationId,
                quantity: i.quantity,
                source_warehouse_id: i.warehouse_id
            })),
            assembly_log: []
        });

        // Сохраняем заказ
        await order.save();

        // Обновляем количество на складе и в общем складе товаров
        for (const item of order_items) {
            await WarehouseInventory.updateOne(
                { warehouse_id: item.warehouse_id, product_id: item.variationId },
                { $inc: { quantity: -item.quantity } }
            );

            await ProductVariation.findByIdAndUpdate(
                item.variationId,
                { $inc: { quantity: -item.quantity } }
            );
        }

        // Создание задач для продавцов-приёмщиков на каждый склад
        for (const warehouseId of assembledWarehouses) {
            // console.log("order_items: ", order_items.filter(i => i.warehouse_id === warehouseId))
            await WarehouseTask.create({
                order_id: order._id,
                warehouse_id: warehouseId,
                items: order_items
                    .filter(i => i.warehouse_id === warehouseId)
                    .map(i => ({ variation_id: i.variationId, quantity: i.quantity })),
                status: 'Ожидает сборки'
            });
        }

        // ✅ Обновление общей суммы выкупа
        user.total_orders_sum = (parseFloat(user.total_orders_sum.toString()) || 0) + parseFloat(total_amount.toString());
        await user.updateDiscount(); // функция должна быть реализована в userSchema.methods

        const productVariations = await ProductVariation.find({
            _id: { $in: order_items.map(i => i.variationId) }
        }).populate('product_id');

        // ✅ Начисление бонусов
        let earnedPoints = 0;

        for (const item of order_items) {
            const variation = productVariations.find(v => v._id.toString() === item.variationId);
            const product = variation?.product_id;

            if (product?.bonus_points) {
                earnedPoints += item.quantity * product.bonus_points;
            }
        }

        if (earnedPoints > 0) {
            user.bonus_points = (user.bonus_points || 0) + earnedPoints;

            await LoyaltyHistory.create({
                user_id: users_id,
                order_id: order._id,
                change_type: 'начисление',
                points: earnedPoints,
                comment: 'Начисление за покупку',
            });
        }

        if (bonus_points_used && bonus_points_used > 0) {
            await LoyaltyHistory.create({
                user_id: users_id,
                order_id: order._id,
                change_type: 'списание',
                points: -bonus_points_used,
                comment: 'Списание баллов при оформлении заказа',
            });

            user.bonus_points = Math.max((user.bonus_points || 0) - bonus_points_used, 0);
        }

        await user.save();

        // ✅ Очистка корзины пользователя
        await Cart.deleteMany({ users_id });

        res.status(201).json({ message: 'Заказ успешно создан', order });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при создании заказа', error });
    }
});

// Получение всех заказов
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().populate('order_items users_id delivery_methods_id courier_id warehouse_id');
        res.status(200).send(orders);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении заказов", error });
    }
});


// Получение заказа по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const order = await Order.findById(id).populate('users_id delivery_methods_id courier_id  warehouse_id');
        if (!order) {
            return res.status(404).send({ message: "Заказ не найден" });
        }
        res.status(200).send(order);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении заказа", error });
    }
});

// Получение всех заказов пользователя
router.get('/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const orders = await Order.find({ users_id: id }).populate('delivery_methods_id courier_id warehouse_id');
        res.status(200).send(orders);
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка при получении заказов", error });
    }
});

// Обновление заказа (включая данные о доставке)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status, delivery_data } = req.body;

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).send({ message: "Заказ не найден" });
        }

        if (status) order.status = status;
        if (delivery_data) order.delivery_data = delivery_data;

        await order.save();
        res.status(200).send({ message: "Заказ обновлен", order });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при обновлении заказа", error });
    }
});

// Обновление заказа (включая данные о доставке)
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).send({ message: "Заказ не найден" });
        }

        if (status) order.status = status;

        await order.save();
        res.status(200).send({ message: "Заказ обновлен", order });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при обновлении заказа", error });
    }
});

// Удаление заказа
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).send({ message: "Заказ не найден" });
        }

        await order.remove();
        res.status(200).send({ message: "Заказ успешно удален" });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при удалении заказа", error });
    }
});

module.exports = router;
