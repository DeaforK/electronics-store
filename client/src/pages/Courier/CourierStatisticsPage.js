import React, { useState, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Bar, Pie, Line, Radar } from 'react-chartjs-2';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { FaArrowLeft } from 'react-icons/fa';
import Header from '../../components/Layout/Header';  // Подключаем компонент Header
import Footer from '../../components/Layout/Footer';  // Подключаем компонент Footer
import { useNavigate } from 'react-router-dom';  // Для навигации на предыдущую страницу

// Регистрация компонентов Chart.js
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    RadialLinearScale
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, RadialLinearScale, Title, Tooltip, Legend);

function StatisticsPage() {
    const [orderStats, setOrderStats] = useState([]);
    const [warehouseStats, setWarehouseStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartType, setChartType] = useState('bar'); // Стейт для выбора типа диаграммы

    const navigate = useNavigate();

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                const { data: ordersData } = await axios.get('http://localhost:8081/order/statistics', { withCredentials: true });
                const { data: warehousesData } = await axios.get('http://localhost:8081/warehouse-inventory/statistics', { withCredentials: true });

                setOrderStats(ordersData.ordersSummary || []); // Устанавливаем массив ordersSummary
                setWarehouseStats(warehousesData.warehouseSummary || []); // Устанавливаем массив warehouseSummary
            } catch (err) {
                setError('Ошибка при загрузке статистики.');
            } finally {
                setLoading(false);
            }
        };

        fetchStatistics();
    }, []);

    // Данные для графиков
    const orderChartData = {
        labels: orderStats.map(stat => stat._id),
        datasets: [
            {
                label: 'Количество заказов',
                data: orderStats.map(stat => stat.totalOrders),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    // Обрабатываем данные для диаграммы складов
    const warehouseChartData = {
        labels: warehouseStats.map(stat => stat.name || 'Неизвестный склад'),
        datasets: [
            {
                label: 'Общая сумма заказов',
                data: warehouseStats.map(stat => parseFloat(stat.totalAmount?.$numberDecimal || 0)),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40',
                ],
            },
        ],
    };

    const handleGeneratePDF = () => {
        const doc = new jsPDF();
        doc.text('Статистика по заказам и складам', 10, 10);
        doc.text('Заказы:', 10, 20);

        orderStats.forEach((stat, index) => {
            const totalAmount = parseFloat(stat?.totalAmount?.$numberDecimal || 0);
            doc.text(`${index + 1}. Статус: ${stat._id}, Количество: ${stat.totalOrders}, Сумма: ${totalAmount.toFixed(2)} руб.`, 10, 30 + index * 10);
        });

        doc.text('Склады:', 10, 30 + orderStats.length * 10 + 10);
        warehouseStats.forEach((stat, index) => {
            const totalAmount = parseFloat(stat?.totalAmount?.$numberDecimal || 0);
            doc.text(`${index + 1}. Название: ${stat.name}, Общая сумма заказов: ${totalAmount.toFixed(2)} руб.`, 10, 30 + orderStats.length * 10 + 20 + index * 10);
        });

        doc.save('Статистика.pdf');
    };

    const handleGenerateWord = async () => {
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: 'Статистика по заказам и складам', bold: true, size: 24 })],
                        }),
                        new Paragraph({ children: [new TextRun({ text: 'Заказы:', bold: true, size: 18 })] }),
                        ...orderStats.map(
                            (stat, index) =>
                                new Paragraph(`${index + 1}. Статус: ${stat._id}, Количество: ${stat.totalOrders}, Сумма: ${parseFloat(stat.totalAmount?.$numberDecimal || 0).toFixed(2)} руб.`)
                        ),
                        // new Paragraph({ children: [new TextRun({ text: 'Склады:', bold: true, size: 18 })] }),
                        // ...warehouseStats.map(
                        //     (stat, index) =>
                        //         new Paragraph(`${index + 1}. Название: ${stat.name}, Общая сумма заказов: ${parseFloat(stat.totalAmount?.$numberDecimal || 0).toFixed(2)} руб.`)
                        // ),
                    ],
                },
            ],
        });

        const buffer = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(buffer);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Статистика.docx';
        link.click();
    };

    if (loading) return <p>Загрузка...</p>;
    if (error) return <p className="text-danger">{error}</p>;

    const renderChart = () => {
        switch (chartType) {
            case 'bar':
                return <Bar data={orderChartData} />;
            case 'pie':
                return <Pie data={warehouseChartData} />;
            case 'line':
                return <Line data={orderChartData} />;
            case 'radar':
                return <Radar data={warehouseChartData} />;
            default:
                return <Bar data={orderChartData} />;
        }
    };

    return (
        <>
            <Header />
            <div className="container mt-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <Button
                        variant="link"
                        onClick={() => navigate(-1)} // Кнопка "Назад"
                        className="me-2 p-0"
                    >
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h1>Статистика</h1>
                </div>

                <div className="mb-4">
                    <Form.Label>Выберите тип диаграммы</Form.Label>
                    <Form.Control
                        as="select"
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                    >
                        <option value="bar">Гистограмма</option>
                        {/* <option value="pie">Круговая диаграмма</option> */}
                        <option value="line">Линейный график</option>
                        <option value="radar">Радарная диаграмма</option>
                    </Form.Control>
                </div>


                <div className="mt-4">
                    <h3>График заказов</h3>
                    {renderChart()}
                </div>

                <div className="mt-4 d-flex gap-3">
                    <Button variant="primary" onClick={handleGeneratePDF}>
                        Скачать PDF
                    </Button>
                    <Button variant="secondary" onClick={handleGenerateWord}>
                        Скачать Word
                    </Button>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default StatisticsPage;
