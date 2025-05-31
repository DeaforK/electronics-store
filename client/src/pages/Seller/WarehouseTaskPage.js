import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Barcode from "react-barcode";
import Pagination from '../../components/Layout/Pagination';
import BarcodeScanner from "../../components/Seller/BarcodeScanner";

const itemsPerPage = 5;

const WarehouseTasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [showScanner, setShowScanner] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await axios.get('http://localhost:8081/warehouse-tasks', { withCredentials: true });
                const sorted = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setTasks(sorted);
                setFilteredTasks(sorted);
            } catch (error) {
                console.error('Ошибка при загрузке заданий на сборку:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            await axios.put(`http://localhost:8081/warehouse-tasks/${taskId}/status`, { status: newStatus }, { withCredentials: true });
            setTasks(prev => prev.map(task => task._id === taskId ? { ...task, status: newStatus } : task));
        } catch (error) {
            console.error('Ошибка при обновлении статуса задачи:', error);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleDetected = (err, result) => {
        if (result?.text) {
            setScannedBarcode(result.text);
            filterByBarcode(result.text);
            setShowScanner(false);
        }
    };

    const filterByBarcode = (barcode) => {
        const filtered = tasks.filter(task =>
            task.items.some(item => item.variation_id?.barcode === barcode)
        );
        setFilteredTasks(filtered);
        setCurrentPage(1);
    };

    const resetFilter = () => {
        setScannedBarcode('');
        setFilteredTasks(tasks);
    };

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirst, indexOfLast);

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Загрузка задач...</div>;

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex align-items-center mb-4">
                    <Button variant="link" onClick={() => navigate('/seller')} className="me-2">
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h3 className="mb-0">Задания на сборку</h3>
                </div>

                <div className="mb-3">
                    <Button variant="secondary" onClick={() => setShowScanner(!showScanner)}>
                        {showScanner ? 'Закрыть сканер' : 'Сканировать штрихкод'}
                    </Button>
                    {' '}
                    {scannedBarcode && (
                        <>
                            <span className="ms-2">Найдено по штрихкоду: <strong>{scannedBarcode}</strong></span>
                            {' '}
                            <Button variant="outline-secondary" size="sm" onClick={resetFilter}>Сбросить</Button>
                        </>
                    )}
                </div>

                {showScanner && (
                    <div className="mb-3 border p-2">
                        <BarcodeScanner
                            width={400}
                            height={150}
                            onUpdate={handleDetected}
                        />
                    </div>
                )}

                {currentTasks.length === 0 ? (
                    <p className="text-muted">Нет заданий на сборку.</p>
                ) : (
                    currentTasks.map(task => (
                        <Card key={task._id} className="mb-3 shadow-sm">
                            <Card.Body>
                                <Card.Title>
                                    Заказ: #{task.order_id?._id?.toString().slice(-6) || 'Неизвестно'}
                                </Card.Title>
                                <p><strong>Склад:</strong> {task.warehouse_id?.name || 'Неизвестно'}</p>
                                <p>
                                    <strong>Статус:</strong>{' '}
                                    <Badge bg={
                                        task.status === 'Собрано' ? 'success' :
                                            task.status === 'Передано' ? 'secondary' :
                                                task.status === 'Задерживается' ? 'danger' : 'warning'
                                    }>
                                        {task.status}
                                    </Badge>
                                </p>

                                <div>
                                    <strong>Товары для сборки:</strong>
                                    <ul className="mt-2">
                                        {task.items.map((item, idx) => (
                                            <li key={idx}>
                                                <div>
                                                    <div><strong>{item.variation_id?.product_id?.name || 'Неизвестный товар'}</strong></div>
                                                    <div>Количество: {item.quantity} шт.</div>
                                                    {item.variation_id?.barcode && (
                                                        <div>Штрихкод: <Barcode value={item.variation_id.barcode} width={1.2} height={40} fontSize={12} /></div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {task.status === 'Ожидает сборки' && (
                                    <Button variant="success" className="mt-2" onClick={() => updateTaskStatus(task._id, 'Собрано')}>
                                        Отметить как "Собрано"
                                    </Button>
                                )}
                                {task.status === 'Собрано' && (
                                    <Button variant="primary" className="mt-2" onClick={() => updateTaskStatus(task._id, 'Передано')}>
                                        Отметить как "Передано курьеру"
                                    </Button>
                                )}
                            </Card.Body>
                        </Card>
                    ))
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredTasks.length / itemsPerPage)}
                    onPageChange={handlePageChange}
                />
            </div>
            <Footer />
        </>
    );
};

export default WarehouseTasksPage;
