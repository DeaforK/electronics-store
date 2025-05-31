import axios from 'axios';

const BASE = 'http://localhost:8081';

const endpoints = {
  // Финансовые
  financeSummary: `${BASE}/reports/finance/summary`,
  financeTaxes: `${BASE}/reports/finance/taxes`,
  financePaymentMethods: `${BASE}/reports/finance/payment-methods`,
  canceledOrders: `${BASE}/reports/orders/cancellations`,

  // Складские
  currentStock: `${BASE}/reports/inventory/stock`,
  slowMoving: `${BASE}/reports/inventory/slow-moving`,
  inventoryTurnover: `${BASE}/reports/inventory/turnover`,
  inventoryChanges: `${BASE}/reports/inventory/changes`,

  // Продажи и клиенты
  topProducts: `${BASE}/reports/sales/top-products`,
  salesByCategory: `${BASE}/reports/sales/by-category`,
  ltv: (userId) => `${BASE}/reports/customers/${userId}/ltv`,
  loyaltyUsage: `${BASE}/reports/customers/loyalty-usage`,

  // Акции и маркетинг
  promotionEffectiveness: (id) => `${BASE}/reports/promotions/${id}/effectiveness`,
  promotionOrders: `${BASE}/reports/promotions/orders`,
  promotionRevenueDelta: `${BASE}/reports/promotions/revenue-delta`,

  // Прогнозирование
  forecastSales: (productId) => `${BASE}/reports/forecast/sales/${productId}`,
  forecastWarehouseLoad: `${BASE}/reports/forecast/warehouse-load`,
  forecastRevenueGrowth: `${BASE}/reports/forecast/revenue-growth`
};

export const fetchReport = async (type, filters = {}) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v != null && v !== '')
  );

  switch (type) {
    // ===== Финансы =====
    case 'financeSummary':
      if (!cleanFilters.startDate || !cleanFilters.endDate) {
        throw new Error('startDate и endDate обязательны');
      }
      return (await axios.get(endpoints.financeSummary, { params: cleanFilters })).data;

    case 'financeTaxes':
      return (await axios.get(endpoints.financeTaxes, { params: cleanFilters })).data;

    case 'financePaymentMethods':
      if (!cleanFilters.startDate || !cleanFilters.endDate) {
        throw new Error('startDate и endDate обязательны');
      }
      return (await axios.get(endpoints.financePaymentMethods, { params: cleanFilters })).data;

    case 'canceledOrders':
      if (!cleanFilters.startDate || !cleanFilters.endDate) {
        throw new Error('startDate и endDate обязательны');
      }
      return (await axios.get(endpoints.canceledOrders, { params: cleanFilters })).data;

    // ===== Склад =====
    case 'currentStock':
      return (await axios.get(endpoints.currentStock)).data;

    case 'slowMoving':
      return (await axios.get(endpoints.slowMoving, { params: cleanFilters })).data;

    case 'inventoryTurnover':
      if (!cleanFilters.warehouseId) throw new Error('warehouseId обязателен');
      return (await axios.get(endpoints.inventoryTurnover, { params: cleanFilters })).data;

    case 'inventoryChanges':
      return (await axios.get(endpoints.inventoryChanges, { params: cleanFilters })).data;

    // ===== Продажи / Клиенты =====
    case 'topProducts':
      return (await axios.get(endpoints.topProducts, { params: cleanFilters })).data;

    case 'salesByCategory':
      return (await axios.get(endpoints.salesByCategory, { params: cleanFilters })).data;

    case 'ltv':
      if (!cleanFilters.userId) throw new Error('userId обязателен');
      return (await axios.get(endpoints.ltv(cleanFilters.userId))).data;

    case 'loyaltyUsage':
      return (await axios.get(endpoints.loyaltyUsage)).data;

    // ===== Акции =====
    case 'promotionEffectiveness':
      if (!cleanFilters.promotionId) throw new Error('promotionId обязателен');
      return (await axios.get(endpoints.promotionEffectiveness(cleanFilters.promotionId))).data;

    case 'promotionOrders':
      return (await axios.get(endpoints.promotionOrders)).data;

    case 'promotionRevenueDelta':
      return (await axios.get(endpoints.promotionRevenueDelta)).data;

    // ===== Прогнозы =====
    case 'forecastSales':
      if (!cleanFilters.productId) throw new Error('productId обязателен');
      return (await axios.get(endpoints.forecastSales(cleanFilters.productId))).data;

    case 'forecastWarehouseLoad':
      if (!cleanFilters.warehouseId) throw new Error('warehouseId обязателен');
      return (await axios.get(endpoints.forecastWarehouseLoad, { params: cleanFilters })).data;

    case 'forecastRevenueGrowth':
      return (await axios.get(endpoints.forecastRevenueGrowth)).data;

    default:
      throw new Error(`Неизвестный тип отчёта: ${type}`);
  }
};
