const express = require('express');
const router = express.Router();
const WarehouseTask = require('../models/warehouseTask');
const ProductVariation = require('../models/productVariation');
const Product = require('../models/product');
const Order = require('../models/order');
const Warehouse = require('../models/warehouse');
const Courier = require('../models/courier');

router.get('/', async (req, res) => {
    try {
        const tasks = await WarehouseTask.find()
            .sort({ createdAt: -1 }) // Сортировка: новые сверху
            .populate('order_id')
            .populate('warehouse_id')
            .populate('items.variation_id');

        // Дополнительно: подгрузим product для каждой вариации
        for (const task of tasks) {
            for (const item of task.items) {
                if (item.variation_id) {
                    item.variation_id = await ProductVariation.findById(item.variation_id).populate('product_id');
                }
            }
        }

        res.json(tasks);
    } catch (error) {
        console.error('Ошибка при получении задач:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/active', async (req, res) => {
    try {
        const tasks = await WarehouseTask.find({
            status: { $nin: ['Задерживается', 'Передано'] } // исключаем эти статусы
        })
            .populate('order_id')
            .populate('warehouse_id')
            .populate('items.variation_id');

        // Дополнительно подгружаем product_id для каждой variation
        for (const task of tasks) {
            for (const item of task.items) {
                if (item.variation_id) {
                    item.variation_id = await ProductVariation.findById(item.variation_id).populate('product_id');
                }
            }
        }

        res.json(tasks);
    } catch (error) {
        console.error('Ошибка при получении задач:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// Получить все задачь для курьра
router.get('/courier', async (req, res) => {
    const { warehouse_id, status = 'Собрано' } = req.query;

    const filter = {};
    if (warehouse_id) filter.warehouse_id = warehouse_id;
    if (status) filter.status = status;

    try {
        const tasks = await WarehouseTask.find(filter)
            .populate('order_id')
            .populate('warehouse_id')
            .populate('items.variation_id');

        // Дополнительно: подгрузим product для каждой вариации
        for (const task of tasks) {
            for (const item of task.items) {
                if (item.variation_id) {
                    item.variation_id = await ProductVariation.findById(item.variation_id).populate('product_id');
                }
            }
        }

        res.json(tasks);
    } catch (error) {
        console.error('Ошибка при получении задач:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:id/status', async (req, res) => {
    const { status } = req.body;

    // Проверка допустимого статуса
    const validStatuses = ['Ожидает сборки', 'Собрано', 'Передано', 'Задерживается', 'Доставлено'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Недопустимый статус' });
    }

    try {
        // Обновляем статус задачи
        const task = await WarehouseTask.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!task) return res.status(404).json({ error: 'Задача не найдена' });

        // Получаем связанный заказ
        const order = await Order.findById(task.order_id);
        if (!order) return res.status(404).json({ error: 'Связанный заказ не найден' });

        // Находим курьера, у которого эта задача в списке
        const courier = await Courier.findOne({ warehouse_task: req.params.id });
        if (courier && status === 'Передано') {
            // Удаляем задачу из списка warehouse_task
            courier.warehouse_task = courier.warehouse_task.filter(taskId => taskId.toString() !== req.params.id);

            // Если больше задач нет, меняем статус курьера на "доступен"
            if (courier.warehouse_task.length === 0) {
                courier.status = 'доступен';
            }

            await courier.save();
        }

        const isPartial = order.requires_assembly && order.warehouse_id?.assembled_from_warehouses?.length > 1;

        // Добавляем запись в журнал сборки
        order.assembly_log.push({
            status,
            warehouse_id: task.warehouse_id,
            timestamp: new Date(),
            note: isPartial ? 'Часть заказа' : 'Полный заказ'
        });

        // Если статус заказа "Ожидает", переводим его в "Обрабатывается"
        if (order.status === 'Ожидает') {
            order.status = 'Обрабатывается';
        }

        // Получаем все задачи по заказу
        const relatedTasks = await WarehouseTask.find({ order_id: order._id });

        // Если хотя бы одна задача задерживается — заказ задерживается
        const anyDelayed = relatedTasks.some(t => t.status === 'Задерживается');
        if (anyDelayed) {
            order.status = 'Задерживается';
        } else {
            // Если все доставлены — заказ доставлен
            const allDelivered = relatedTasks.every(t => t.status === 'Передано');
            if (allDelivered) {
                order.status = 'Доставлено';
            }
        }
        if (status === 'Доставлено'){
            order.status = 'Доставлено';
        }

        await order.save();

        res.json({ message: 'Статус задачи и заказа обновлены', task });

    } catch (error) {
        console.error('Ошибка обновления статуса задачи:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


// Создать задачу (например, при создании заказа)
router.post('/', async (req, res) => {
    try {
        const newTask = new WarehouseTask(req.body);
        const saved = await newTask.save();
        res.status(201).json(saved);
    } catch (error) {
        console.error('Ошибка при создании задачи:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
