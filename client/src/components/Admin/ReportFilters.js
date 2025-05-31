import { useState, useEffect } from "react";
import axios from "axios";

const BASE = "http://localhost:8081";

const reportTypes = [
  // Финансы
  { id: 'financeSummary', name: '📈 Финансовая сводка' },
  { id: 'financeTaxes', name: '🧾 Налоги по периодам' },
  { id: 'financePaymentMethods', name: '💳 Способы оплаты' },
  { id: 'canceledOrders', name: '❌ Отменённые заказы' },

  // Склад
  { id: 'currentStock', name: '📦 Остатки на складе' },
  { id: 'slowMoving', name: '🐢 Медленные товары' },
  { id: 'inventoryTurnover', name: '🔁 Оборачиваемость склада' },
  { id: 'inventoryChanges', name: '📊 Изменения запасов' },

  // Продажи и клиенты
  { id: 'topProducts', name: '🔥 Топ товаров' },
  { id: 'salesByCategory', name: '📂 Продажи по категориям' },
  { id: 'ltv', name: '🧑‍💼 LTV клиента' },
  { id: 'loyaltyUsage', name: '🎯 Бонусы и лояльность' },

  // Акции
  { id: 'promotionEffectiveness', name: '📉 Эффективность акции' },
  { id: 'promotionOrders', name: '🛍 Заказы с акциями' },
  { id: 'promotionRevenueDelta', name: '📈 Сравнение выручки (скидки)' },

  // Прогнозы
  { id: 'forecastSales', name: '🔮 Прогноз продаж по товару' },
  { id: 'forecastWarehouseLoad', name: '🏗 Прогноз загрузки склада' },
  { id: 'forecastRevenueGrowth', name: '📊 Прогноз выручки' },
];

export default function ReportFilters({ onChangeType, onChangeFilters, onSubmit }) {
  const [type, setType] = useState('financeSummary');
  const [localFilters, setLocalFilters] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get(`${BASE}/warehouses`).then(res => setWarehouses(res.data));
    axios.get(`${BASE}/users`).then(res => setUsers(res.data));
    axios.get(`${BASE}/promotions`).then(res => setPromotions(res.data));
    axios.get(`${BASE}/products`).then(res => setProducts(res.data));
  }, []);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setType(newType);
    onChangeType(newType);
    setLocalFilters({});
    onChangeFilters({});
  };

  const handleFilterChange = (field) => (e) => {
    const value = e.target.value;
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onChangeFilters(updated);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full mb-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <select
          className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-indigo-200"
          value={type}
          onChange={handleTypeChange}
        >
          {reportTypes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        {['financeSummary', 'financeTaxes', 'financePaymentMethods', 'canceledOrders', 'inventoryChanges', 'topProducts', 'salesByCategory', 'forecastRevenueGrowth'].includes(type) && (
          <>
            <input
              type="date"
              value={localFilters.startDate || ''}
              onChange={handleFilterChange('startDate')}
              className="p-3 border border-gray-300 rounded-lg shadow-sm"
            />
            <input
              type="date"
              value={localFilters.endDate || ''}
              onChange={handleFilterChange('endDate')}
              className="p-3 border border-gray-300 rounded-lg shadow-sm"
            />
          </>
        )}

        {type === 'slowMoving' && (
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Порог (дней)</label>
            <input
              type="number"
              className="p-3 border border-gray-300 rounded-lg shadow-sm"
              defaultValue={90}
              onChange={handleFilterChange('thresholdDays')}
            />
          </div>
        )}

        {['inventoryTurnover', 'forecastWarehouseLoad'].includes(type) && (
          <select
            onChange={handleFilterChange('warehouseId')}
            className="p-3 border border-gray-300 rounded-lg shadow-sm"
          >
            <option value="">Выберите склад</option>
            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
        )}

        {type === 'ltv' && (
          <select
            onChange={handleFilterChange('userId')}
            className="p-3 border border-gray-300 rounded-lg shadow-sm"
          >
            <option value="">Выберите клиента</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.email || u.name}</option>)}
          </select>
        )}

        {type === 'promotionEffectiveness' && (
          <select
            onChange={handleFilterChange('promotionId')}
            className="p-3 border border-gray-300 rounded-lg shadow-sm"
          >
            <option value="">Выберите акцию</option>
            {promotions.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        )}

        {type === 'forecastSales' && (
          <select
            onChange={handleFilterChange('productId')}
            className="p-3 border border-gray-300 rounded-lg shadow-sm"
          >
            <option value="">Выберите товар</option>
            {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        )}
      </div>

      <button
        onClick={onSubmit}
        className="bg-indigo-600 px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition"
      >
        📄 Сформировать отчёт
      </button>
    </div>
  );
}

