import { useEffect, useState } from 'react';
import { fetchReport } from '../services/reportService';

const REQUIRED_PARAMS = {
    ltv: ['userId'],
    promotionEffectiveness: ['promotionId'],
    inventoryTurnover: ['warehouseId'],
    forecastSales: ['productId'],
    financeSummary: ['startDate', 'endDate'],
    financeTaxes: ['startDate', 'endDate'],
    slowMoving: ['thresholdDays'],
};

export default function useReportData(type, filters) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!type) return;

        const required = REQUIRED_PARAMS[type] || [];
        const missing = required.filter(key => !filters?.[key]);

        if (missing.length > 0) {
            setError(`Не хватает параметров: ${missing.join(', ')}`);
            setData(null);
            return;
        }

        setLoading(true);
        setError(null);
        setData(null);

        fetchReport(type, filters)
            .then((res) => {
                console.log('[Client] Получены данные из fetchReport:', res.data);
                setData(res.data);
            })
            .catch((err) => {
                console.error('Ошибка отчёта:', err);
                setError(err.response?.data?.error || err.message);
            })
            .finally(() => setLoading(false));

    }, [type, JSON.stringify(filters)]);

    return { data, loading, error };
}
