import React from 'react';

export default function ReportTable({ type, data }) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <p className="text-gray-500 italic">Нет данных для отображения</p>;
  }

  const rows = Array.isArray(data) ? data : [data];

  // Сбор всех ключей, включая вложенные
  const getAllKeys = (row, prefix = '') => {
    if (!row || typeof row !== 'object') return [];
    return Object.entries(row).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        return [path]; // массив не разворачиваем — обработаем отдельно
      } else if (typeof value === 'object' && value !== null) {
        return getAllKeys(value, path);
      } else {
        return [path];
      }
    });
  };

  const headers = getAllKeys(rows[0]);

  // Доступ к вложенным значениям по пути: "warehouse.name"
  const getValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  return (
    <div className="overflow-auto bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Таблица данных: {type}</h2>
      <table className="min-w-full table-auto border text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="border px-2 py-1 text-left bg-gray-100">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              {headers.map((key, colIndex) => {
                const val = getValue(row, key);

                return (
                  <td key={colIndex} className="p-2 text-sm">
                    {Array.isArray(val)
                      ? (
                        <ul className="list-disc pl-4">
                          {val.map((item, idx) => {
                            if (typeof item === 'object' && item !== null) {
                              const display = item.name || item.title || item.product?.name || item.sku || item._id;

                              return (
                                <li key={idx}>
                                  {display || JSON.stringify(item)}
                                </li>
                              );
                            } else {
                              return <li key={idx}>{String(item)}</li>;
                            }
                          })}
                        </ul>
                      )
                      : typeof val === 'object' && val !== null
                        ? JSON.stringify(val)
                        : String(val ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
