const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const DeliveryMethod = require('../models/deliveryMethod');
const ProductVariation = require('../models/productVariation');
const Product = require('../models/product');
const WarehouseInventory = require('../models/warehouseInventory');
const Warehouse = require('../models/warehouse');
const ActivityLog = require('../models/activityLog');
const geolib = require('geolib');

// Вспомогательная функция для расчёта объёма
function calculateVolume(attributes) {
    if (attributes.length && attributes.width && attributes.height) {
        return attributes.length * attributes.width * attributes.height;
    }
    return 0; // или значение по умолчанию
}

// Вспомогательная функция для расчёта расстояния между двумя точками
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Используем формулу гаверсинуса
    const R = 6371; // Радиус Земли в километрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function distributeItems(itemMap, warehouseStockMap) {
    const result = []; // [{ warehouse_id, items: [], reason }]
    const assigned = {}; // variationId -> remaining

    for (const vid in itemMap) {
        assigned[vid] = itemMap[vid].quantity;
    }

    for (const [wid, { warehouse, stock }] of Object.entries(warehouseStockMap)) {
        const part = {
            warehouse_id: warehouse._id,
            reason: 'Частичная комплектация',
            items: [],
        };

        for (const vid in assigned) {
            if (assigned[vid] <= 0) continue;

            const available = stock[vid] || 0;
            if (available > 0) {
                const qty = Math.min(assigned[vid], available);
                part.items.push({
                    variationId: vid,
                    quantity: qty
                });
                assigned[vid] -= qty;
            }
        }

        if (part.items.length > 0) {
            result.push(part);
        }

        const allAssigned = Object.values(assigned).every(q => q <= 0);
        if (allAssigned) break;
    }

    return result;
}

function getWarehouseOffsetDays(warehouseId, warehouseStockMap, deliveryLocation) {
    const warehouse = warehouseStockMap[warehouseId]?.warehouse;

    if (!warehouse || !warehouse.location || !deliveryLocation) {
        return 0; // если нет данных — возвращаем без смещения
    }

    const distance = calculateDistance(
        warehouse.location.latitude,
        warehouse.location.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude
    );

    // Например: 1 день доставки на каждые 300 км
    const daysOffset = Math.ceil(distance / 300);

    return daysOffset;
}


const parseDecimal = (value) => {
    if (value === null) return null;
    if (value === undefined || value === '') return undefined;
    const str = value.toString();
    if (!/^-?\d+(\.\d+)?$/.test(str)) return undefined; // защита от нечисловых строк
    return mongoose.Types.Decimal128.fromString(str);
};


// Добавление метода доставки
router.post('/', async (req, res) => {
    const {
        name, base_cost, delivery_time_days, type, zone,
        conditions, free_from, distance_limit_km, active, user_id
    } = req.body;

    try {
        const newDeliveryMethod = new DeliveryMethod({
            name,
            base_cost: parseDecimal(base_cost),
            delivery_time_days,
            type,
            zone,
            conditions: (conditions || []).map(cond => ({
                condition_type: cond.condition_type,
                min: parseDecimal(cond.min),
                max: parseDecimal(cond.max),
                cost_modifier: parseDecimal(cond.cost_modifier)
            })),
            free_from: parseDecimal(free_from),
            distance_limit_km: parseDecimal(distance_limit_km),
            active
        });

        await newDeliveryMethod.save();

        await ActivityLog.create({
            user_id,
            action_type: 'Создание метода доставки',
            item_id: newDeliveryMethod._id,
            description: `Добавлен метод доставки "${name}"`
        });

        res.status(201).send({ message: "Метод доставки добавлен", deliveryMethod: newDeliveryMethod });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Ошибка сервера при добавлении метода доставки", error });
    }
});

router.post('/delivery/options', async (req, res) => {
    try {
        const { items, address } = req.body;

        // Шаг 1: Получение информации о товарах
        const productVariationIds = items.map(item => item.product_variations_id);
        const productVariations = await ProductVariation.find({
            _id: { $in: productVariationIds }
        }).populate('product_id');

        let totalWeight = 0;
        let totalVolume = 0;
        let totalPrice = 0;
        // console.log(req.body)

        const itemMap = {}; // key: variationId, value: { quantity, variation }

        for (const item of items) {
            const variation = productVariations.find(pv => pv._id.toString() === item.product_variations_id);
            if (!variation) continue;

            const attributes = variation.product_id.attributes || {};
            const weight = attributes.weight || 0;
            const volume = attributes.volume || calculateVolume(attributes);
            const price = parseFloat(variation.price.toString()) - parseFloat(variation.discount?.toString() || '0');

            totalWeight += weight * item.quantity;
            totalVolume += volume * item.quantity;
            totalPrice += price * item.quantity;

            itemMap[variation._id.toString()] = {
                quantity: item.quantity,
                variation,
                weight,
                volume,
                price
            };
        }
        // console.log("productVariations: ", productVariations)
        // console.log("itemMap: ", itemMap)

        // Шаг 2: Получение данных о складах
        const inventories = await WarehouseInventory.find({
            product_id: { $in: productVariationIds }
        }).populate('warehouse_id');
        // console.log("inventories: ", inventories)

        const warehouseStockMap = {}; // key: warehouseId, value: { variationId -> quantity }

        for (const inv of inventories) {
            const wid = inv.warehouse_id._id.toString();
            const vid = inv.product_id.toString(); // используешь product_id как variationId

            if (!warehouseStockMap[wid]) {
                warehouseStockMap[wid] = {
                    warehouse: inv.warehouse_id,
                    stock: {}
                };
            }

            warehouseStockMap[wid].stock[vid] = inv.quantity;
        }

        // console.log("warehouseAvailability: ", warehouseAvailability)
        const allAvailableWarehouses = Object.values(warehouseStockMap);

        const canFulfillFromSingleWarehouse = allAvailableWarehouses.find(w => {
            return Object.keys(itemMap).every(vid => {
                const requiredQty = itemMap[vid].quantity;
                const availableQty = w.stock[vid] || 0;
                return availableQty >= requiredQty;
            });
        });

        // console.log("canFulfillFromSingleWarehouse: ", canFulfillFromSingleWarehouse)
        // Шаг 3: Получение и фильтрация методов доставки
        const deliveryMethods = await DeliveryMethod.find({
            active: true,
            type: address.type // 'Курьерская' или 'Самовывоз'
        });

        const options = [];

        for (const method of deliveryMethods) {
            let applicable = true;
            let cost = parseFloat(method.base_cost.toString());
            let distance = 0;

            for (const condition of method.conditions) {
                let value = 0;

                switch (condition.condition_type) {
                    case 'Вес':
                        value = totalWeight;
                        break;
                    case 'Объём':
                        value = totalVolume;
                        break;
                    case 'Сумма заказа':
                        value = totalPrice;
                        break;
                    case 'Расстояние':
                        if (address.type === 'Курьерская' && method.zone) {
                            distance = calculateDistance(
                                address.location.latitude,
                                address.location.longitude,
                                method.zone.latitude,
                                method.zone.longitude
                            );
                            value = distance;
                        }
                        break;
                }

                const min = parseFloat(condition.min?.toString() || '0');
                const max = parseFloat(condition.max?.toString() || 'Infinity');

                if (value < min || value > max) {
                    applicable = false;
                    break;
                }

                cost += parseFloat(condition.cost_modifier?.toString() || '0');
            }

            if (!applicable) continue;
            if (method.free_from && totalPrice >= parseFloat(method.free_from.toString())) {
                cost = 0;
            }

            let deliveryTimeMin = method.delivery_time_days.min;
            let deliveryTimeMax = method.delivery_time_days.max;

            const today = new Date();

            if (address.type === 'Самовывоз' && canFulfillFromSingleWarehouse) {
                deliveryTimeMin = 0;
                deliveryTimeMax = 0;
            } else {
                deliveryTimeMin += 1; // +1 день на сборку
                deliveryTimeMax += 1;
            }

            const addDays = (date, days) => {
                const result = new Date(date);
                result.setDate(result.getDate() + days);
                return result.toISOString().slice(0, 10);
            };

            const delivery_parts = [];

            if (!canFulfillFromSingleWarehouse) {
                const distributedParts = distributeItems(itemMap, warehouseStockMap);
                const partMinDelivery = deliveryTimeMin; // уже с +1 на сборку
                const partMaxDelivery = deliveryTimeMax;

                let accumulatedOffsetDays = 0;

                for (const part of distributedParts) {
                    const offsetDays = getWarehouseOffsetDays(
                        part.warehouse_id,
                        warehouseStockMap,
                        address.location
                    );

                    const deliveryDays = partMinDelivery + offsetDays + accumulatedOffsetDays;
                    const estimatedDate = addDays(today, deliveryDays);

                    delivery_parts.push({
                        ...part,
                        estimated_delivery_date: estimatedDate,
                        cost: cost
                    });

                    accumulatedOffsetDays += 2; // +1 день на сборку и +1 день на доставку для каждой следующей партии
                }
                console.log(delivery_parts)

                options.push({
                    _id: method._id,
                    method: `${method.name} (по частям)`,
                    total_cost: cost * delivery_parts.length,
                    estimated_delivery: {
                        min_date: delivery_parts[0].estimated_delivery_date,
                        max_date: delivery_parts[delivery_parts.length - 1].estimated_delivery_date
                    },
                    delivery_parts
                });

                // Дополнительный вариант "забрать всё вместе"
                const combinedLatestDate = delivery_parts.reduce((latest, part) => {
                    return new Date(part.estimated_delivery_date) > new Date(latest)
                        ? part.estimated_delivery_date
                        : latest;
                }, delivery_parts[0].estimated_delivery_date);

                options.push({
                    _id: method._id,
                    method: `${method.name} (забрать всё вместе)`,
                    total_cost: cost,
                    estimated_delivery: {
                        min_date: combinedLatestDate,
                        max_date: combinedLatestDate
                    },
                    delivery_parts: [{
                        warehouse_ids: distributedParts.map(part => ({
                            warehouse_id: part.warehouse_id,
                            product_variation_ids: part.items.map(i => i.variationId)
                        })),
                        reason: 'Объединённая доставка всех частей',
                        items: distributedParts.flatMap(p => p.items),
                        estimated_delivery_date: combinedLatestDate,
                        cost
                    }]
                });

            } else {
                delivery_parts.push({
                    warehouse_id: canFulfillFromSingleWarehouse.warehouse._id,
                    reason: null,
                    items: Object.keys(itemMap).map(vid => ({
                        variationId: vid,
                        quantity: itemMap[vid].quantity
                    })),
                    estimated_delivery_date: addDays(today, deliveryTimeMin),
                    cost
                });

                options.push({
                    _id: method._id,
                    method: method.name,
                    total_cost: cost,
                    estimated_delivery: {
                        min_date: addDays(today, deliveryTimeMin),
                        max_date: addDays(today, deliveryTimeMax)
                    },
                    delivery_parts
                });
            }
        }

        res.status(200).json({ options });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при расчёте вариантов доставки', error });
    }
});


// Получение всех методов доставки
router.get('/', async (req, res) => {
    try {
        const deliveryMethods = await DeliveryMethod.find();
        res.status(200).send(deliveryMethods);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении методов доставки", error });
    }
});

// Получение только активных методов доставки
router.get('/active', async (req, res) => {
    try {
        const methods = await DeliveryMethod.find({ active: true });
        res.status(200).send(methods);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении активных методов доставки", error });
    }
});

// Получение метода по ID
router.get('/:id', async (req, res) => {
    try {
        const deliveryMethod = await DeliveryMethod.findById(req.params.id);
        if (!deliveryMethod) {
            return res.status(404).send({ message: "Метод доставки не найден" });
        }
        res.status(200).send(deliveryMethod);
    } catch (error) {
        res.status(500).send({ message: "Ошибка при получении метода доставки", error });
    }
});

// Обновление метода доставки
router.put('/:id', async (req, res) => {
    const {
        name, base_cost, delivery_time_days, type, zone,
        conditions, free_from, distance_limit_km, active, user_id
    } = req.body;
    try {
        const updated = await DeliveryMethod.findByIdAndUpdate(
            req.params.id,
            {
                name,
                base_cost: parseDecimal(base_cost),
                delivery_time_days,
                type,
                zone,
                conditions: (conditions || []).map(cond => ({
                    condition_type: cond.condition_type,
                    min: parseDecimal(cond.min),
                    max: parseDecimal(cond.max),
                    cost_modifier: parseDecimal(cond.cost_modifier)
                })),
                free_from: parseDecimal(free_from),
                distance_limit_km: parseDecimal(distance_limit_km),
                active
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).send({ message: "Метод доставки не найден" });
        }

        await ActivityLog.create({
            user_id,
            action_type: 'Обновление метода доставки',
            item_id: updated._id,
            description: `Метод доставки "${updated.name}" обновлён`
        });

        res.status(200).send({ message: "Метод доставки обновлён", deliveryMethod: updated });
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Ошибка при обновлении метода доставки", error });
    }
});

// Удаление метода доставки
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;

    try {
        const method = await DeliveryMethod.findById(id);
        if (!method) {
            return res.status(404).send({ message: "Метод доставки не найден" });
        }

        await DeliveryMethod.deleteOne({ _id: id });

        await ActivityLog.create({
            user_id,
            action_type: 'Удаление метода доставки',
            item_id: method._id,
            description: `Метод доставки "${method.name}" удалён`
        });

        res.status(200).send({ message: "Метод доставки удалён" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Ошибка при удалении метода доставки", error });
    }
});

// Получение наилучшего метода доставки
router.post('/best', async (req, res) => {
    const { weight, volume, total_price, distance_km } = req.body;

    try {
        const methods = await DeliveryMethod.find({ active: true });

        const applicableMethods = methods.map(method => {
            let cost = parseFloat(method.base_cost.toString());

            for (const cond of method.conditions || []) {
                const value = {
                    'Вес': weight,
                    'Объём': volume,
                    'Расстояние': distance_km,
                    'Сумма заказа': total_price
                }[cond.condition_type];

                if (value !== undefined) {
                    const min = cond.min ? parseFloat(cond.min.toString()) : -Infinity;
                    const max = cond.max ? parseFloat(cond.max.toString()) : Infinity;
                    if (value >= min && value <= max) {
                        cost += parseFloat(cond.cost_modifier.toString());
                    }
                }
            }

            if (method.free_from && total_price >= parseFloat(method.free_from.toString())) {
                cost = 0;
            }

            return { method, final_cost: cost };
        });

        applicableMethods.sort((a, b) => a.final_cost - b.final_cost);

        res.status(200).send({
            best: applicableMethods[0],
            alternatives: applicableMethods
        });
    } catch (error) {
        res.status(500).send({ message: "Ошибка при расчёте оптимального метода доставки", error });
    }
});

module.exports = router;
