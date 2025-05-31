const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const forecastController = require('../controllers/forecastController');
const exportController = require('../controllers/exportController');

// ====== Финансовые отчёты ======

// Получить сводку по доходам за период (день, месяц, квартал, год)
// query: startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&granularity=month
router.get('/finance/summary', reportController.getFinancialSummary);

// Получить налоговый отчёт по периодам
router.get('/finance/taxes', reportController.getTaxReport);

// Получить статистику отменённых заказов
router.get('/orders/cancellations', reportController.getCanceledOrdersStats);

// Распределение оплат по способам оплаты
router.get('/finance/payment-methods', reportController.getPaymentMethodsDistribution);

// ====== Складские отчёты ======

// Получить текущие остатки по складам
router.get('/inventory/stock', reportController.getCurrentStockByWarehouse);

// Получить товары с низкой оборачиваемостью (thresholdDays = query)
// query: thresholdDays=90
router.get('/inventory/slow-moving', reportController.getSlowMovingProducts);

// Получить коэффициент оборачиваемости склада
// query: warehouseId
router.get('/inventory/turnover', reportController.getWarehouseTurnoverRate);

// История изменений остатков
router.get('/inventory/changes', reportController.getInventoryChangesHistory);

// ====== Отчёты по продажам и клиентам ======

// Топ продаваемых товаров
// query: limit=10
router.get('/sales/top-products', reportController.getTopSellingProducts);

// Заказы по категориям и брендам
router.get('/sales/by-category', reportController.getOrderStatsByCategory);

// Профиль клиента и LTV
// param: userId
router.get('/customers/:userId/ltv', reportController.getCustomerLifetimeValue);

// Использование бонусов и лояльности
router.get('/customers/loyalty-usage', reportController.getLoyaltyPointsUsage);

// ====== Анализ акций и маркетинга ======

// Эффективность акции
// param: promotionId
router.get('/promotions/:promotionId/effectiveness', reportController.getPromotionEffectiveness);

// Заказы с участием акции
router.get('/promotions/orders', reportController.getOrdersByPromotion);

// Сравнение выручки по акции и без неё
router.get('/promotions/revenue-delta', reportController.getPromotionRevenueDelta);

// ====== Прогнозирование ======

// Прогноз продаж по товару
// param: productId
router.get('/forecast/sales/:productId', forecastController.predictSalesNextMonth);

// Прогноз загрузки склада
router.get('/forecast/warehouse-load', forecastController.predictWarehouseLoad);

// Прогноз роста выручки
router.get('/forecast/revenue-growth', forecastController.predictMonthlyRevenueGrowth);

// ====== Экспорт отчётов ======

// Экспорт отчётов в PDF, Excel, CSV
// query: type=finance|inventory|sales|promotions&period=month|quarter|year&format=pdf|excel|csv
router.get('/export', exportController.exportReport);

module.exports = router;
