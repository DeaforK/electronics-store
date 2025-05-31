const express = require('express');
const Courier = require('../models/courier');
const warehouseTask = require('../models/warehouseTask');
const router = express.Router();
const ProductVariation = require('../models/productVariation');


// Создание нового курьера
router.post('/', async (req, res) => {
    const { user_id, delivery_area, location, vehicle_type } = req.body;

    try {
        const newCourier = new Courier({
            user_id,
            delivery_area,
            location,
            vehicle_type
        });

        const savedCourier = await newCourier.save();
        res.status(201).json(savedCourier);
    } catch (error) {
        res.status(500).json({ message: "Ошибка создания курьера", error });
    }
});

// Получение всех курьеров
router.get('/', async (req, res) => {
    try {
        const couriers = await Courier.find().populate('user_id').populate('current_orders');
        const tasks = await warehouseTask.find({ order_id: couriers.current_orders._id }).populate('order_id')
            .populate('warehouse_id')
            .populate('items.variation_id');
        res.status(200).json(couriers, tasks);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения списка курьеров", error });
    }
});

// Получение курьера по ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // ✅ Используем findOne, а не find
        const courier = await Courier.findOne({ user_id: id })
            .populate('user_id')
            .populate('current_orders')
            .populate({
                path: 'warehouse_task',
                populate: [
                    { path: 'order_id' },
                    { path: 'warehouse_id' },
                    { path: 'items.variation_id', populate: 'product_id' } // более корректно
                ]
            });

        if (!courier) {
            return res.status(404).json({ message: "Курьер не найден" });
        }

        // Можно дополнительно логировать
        // console.log("courier: ", courier);

        res.status(200).json(courier);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Ошибка получения данных курьера", error });
    }
});

// Обновление курьера по ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status, delivery_area, location, vehicle_type } = req.body;

    try {
        const updatedCourier = await Courier.findByIdAndUpdate(
            id,
            { status, delivery_area, location, vehicle_type },
            { new: true }
        );

        if (!updatedCourier) {
            return res.status(404).json({ message: "Курьер не найден" });
        }

        res.status(200).json(updatedCourier);
    } catch (error) {
        res.status(500).json({ message: "Ошибка обновления данных курьера", error });
    }
});

// Назначить один или несколько заказов курьеру
router.put('/:id/assign-order', async (req, res) => {
    const { id } = req.params; // id курьера
    let { order_id, warehouseTask_id } = req.body;

    if (!order_id || !warehouseTask_id) {
        return res.status(400).json({ message: "Не передан order_id или warehouseTask_id" });
    }

    try {
        const courier = await Courier.findById(id);
        if (!courier) {
            return res.status(404).json({ message: "Курьер не найден" });
        }

        // Приводим к массиву, если передан один заказ
        if (!Array.isArray(order_id)) {
            order_id = [order_id];
        }

        // Добавим только те, которых ещё нет
        const uniqueOrders = order_id.filter(
            oid => !courier.current_orders.some(existing => existing.toString() === oid)
        );
        // Приводим к массиву, если передан один заказ
        if (!Array.isArray(warehouseTask_id)) {
            warehouseTask_id = [warehouseTask_id];
        }

        // Добавим только те, которых ещё нет
        const uniqueWarehouseTask = warehouseTask_id.filter(
            oid => !courier.warehouse_task.some(existing => existing.toString() === oid)
        );

        if (uniqueOrders.length > 0 || uniqueWarehouseTask.length > 0) {
            courier.current_orders.push(...uniqueOrders);
            courier.warehouse_task.push(...uniqueWarehouseTask)
            courier.status = 'занят';
            await courier.save();
        }

        res.status(200).json({
            message: `Назначено ${uniqueOrders.length} новых заказов`,
            courier
        });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при назначении заказов", error });
    }
});


// Завершить заказ (удалить из списка текущих)
router.put('/:id/complete-order', async (req, res) => {
    const { id } = req.params; // id курьера
    const { order_id } = req.body;

    try {
        const courier = await Courier.findById(id);
        if (!courier) return res.status(404).json({ message: "Курьер не найден" });

        courier.current_orders = courier.current_orders.filter(oid => oid.toString() !== order_id);
        if (courier.current_orders.length === 0) {
            courier.status = 'доступен'; // если больше нет заказов
        }

        await courier.save();
        res.status(200).json({ message: "Заказ завершён", courier });
    } catch (error) {
        res.status(500).json({ message: "Ошибка завершения заказа", error });
    }
});

// Завершить заказ (удалить из списка текущих)
router.put('/:id/complete-order', async (req, res) => {
    const { id } = req.params; // id курьера
    const { order_id } = req.body;

    try {
        const courier = await Courier.findById(id);
        if (!courier) return res.status(404).json({ message: "Курьер не найден" });

        courier.current_orders = courier.current_orders.filter(oid => oid.toString() !== order_id);
        if (courier.current_orders.length === 0) {
            courier.status = 'доступен'; // если больше нет заказов
        }

        await courier.save();
        res.status(200).json({ message: "Заказ завершён", courier });
    } catch (error) {
        res.status(500).json({ message: "Ошибка завершения заказа", error });
    }
});


// Обновление статуса курьера
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const courier = await Courier.findById(id);
        if (!courier) {
            return res.status(404).json({ message: "Курьер не найден" });
        }

        courier.status = status;
        await courier.save();

        res.status(200).json({ message: "Статус курьера обновлен", courier });
    } catch (error) {
        res.status(500).json({ message: "Ошибка обновления статуса курьера", error });
    }
});

// Удаление курьера (логическое удаление, изменяем статус на 'недоступен')
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const courier = await Courier.findById(id);
        if (!courier) {
            return res.status(404).json({ message: "Курьер не найден" });
        }

        courier.status = 'недоступен';
        await courier.save();

        res.status(200).json({ message: "Курьер помечен как 'недоступен'", courier });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при изменении статуса курьера", error });
    }
});

module.exports = router;
