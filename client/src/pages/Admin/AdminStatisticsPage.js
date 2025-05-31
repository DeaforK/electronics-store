import { useState } from 'react';
import ReportFilters from '../../components/Admin/ReportFilters';
import ReportTable from '../../components/Admin/ReportTable';
import ReportChart from '../../components/Admin/ReportChart';
import ExportMenu from '../../components/Admin/ExportMenu';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import { fetchReport } from '../../services/reportService';

const ReportsPage = () => {
  const [reportType, setReportType] = useState('inventoryTurnover');
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(null);

      console.log('📤 Отправка запроса на отчёт:');
      console.log('Тип отчёта:', reportType);
      console.log('Фильтры:', filters);

      const result = await fetchReport(reportType, filters);

      console.log('📥 Получен ответ от сервера:', result.data);
      setData(result.data);
    } catch (err) {
      console.error('❌ Ошибка запроса:', err);
      setError(err.message || 'Ошибка при получении отчёта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="container py-4">
        <h1 className="mb-4 fw-bold fs-3 border-bottom pb-2">Аналитика и Отчёты</h1>

        <div className="card mb-4">
          <div className="card-body">
            <ReportFilters
              onChangeType={setReportType}
              onChangeFilters={setFilters}
              onSubmit={handleGenerateReport}
            />
          </div>
        </div>

        {loading && (
          <div className="text-center my-4">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Загрузка...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            Ошибка: {error}
          </div>
        )}

        {data && (
          <>
            <div className="d-flex justify-content-end mb-3">
              <ExportMenu data={data} />
            </div>

            <div className="card mb-4">
              <div className="card-body">
                <ReportChart type={reportType} data={data} />
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-body">
                <ReportTable type={reportType} data={data} />
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
};

export default ReportsPage;
