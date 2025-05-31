import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff6666', '#00C49F', '#FFBB28'];

const KPI_TYPES = ['ltv', 'loyaltyUsage', 'forecastWarehouseLoad', 'forecastRevenueGrowth'];
const PIE_TYPES = ['financePaymentMethods', 'salesByCategory', 'promotionOrders'];

// Главный компонент
export default function ReportChart({ type, data }) {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  const rows = Array.isArray(data) ? data : [data];
  const isKpi = KPI_TYPES.includes(type);
  const isPie = PIE_TYPES.includes(type);

  const first = rows[0];
  const keys = Object.keys(first || {});
  const xKey = keys.find(k =>
    k.toLowerCase().includes('period') ||
    k.toLowerCase().includes('date') ||
    k.toLowerCase().includes('product') ||
    k.toLowerCase().includes('category') ||
    k.toLowerCase().includes('method')) || keys[0];

  const yKeys = keys.filter(k => typeof first[k] === 'number' && k !== xKey);
  

  return (
    <div className="w-full bg-white shadow rounded p-4 mb-6">
      <h2 className="text-lg font-semibold mb-2">График: {type}</h2>

      {isKpi ? (
        <KpiBlock type={type} data={data} />
      ) : isPie ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={rows}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {type === 'financeSummary' || type.includes('forecast') || type === 'inventoryTurnover' ? (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}


function KpiBlock({ type, data }) {
  const metrics = [];

  if (type === 'ltv') {
    metrics.push(
      { label: 'LTV клиента', value: data.lifetimeValue },
      { label: 'Всего заказов', value: data.orderCount },
      { label: 'Средний чек', value: data.averageOrderValue },
      { label: 'Общая выручка', value: data.totalRevenue }
    );
  }

  if (type === 'loyaltyUsage') {
    metrics.push(
      { label: 'Начислено бонусов', value: data.totalAccrued },
      { label: 'Списано бонусов', value: data.totalSpent }
    );
  }

  if (type === 'forecastWarehouseLoad') {
    metrics.push(
      { label: 'Ожидаемая загрузка склада (%)', value: data.predictedLoad }
    );
  }

  if (type === 'forecastRevenueGrowth') {
    const dataArray = Array.isArray(data) ? data : [];
    dataArray.forEach(item => {
      metrics.push({ label: item.month, value: item.forecast });
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {metrics.map((m, i) => (
        <div
          key={i}
          className="p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl shadow-sm text-center"
        >
          <div className="text-sm text-gray-500">{m.label}</div>
          <div className="text-2xl font-semibold text-indigo-700 mt-1">{m.value}</div>
        </div>
      ))}
    </div>
  );
}
