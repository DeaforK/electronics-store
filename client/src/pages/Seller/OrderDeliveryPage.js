import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import BarcodeScanner from '../../components/Seller/BarcodeScanner';

const OrderDeliveryPage = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchPhone, setSearchPhone] = useState('');
    const [scannedItems, setScannedItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scanMessage, setScanMessage] = useState(null); // новое состояние для сообщений
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await axios.get('http://localhost:8081/warehouse-tasks/active', { withCredentials: true });
                const sorted = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                console.log(sorted)
                setOrders(sorted);
                setFilteredOrders(res.data);
            } catch (err) {
                console.error('Ошибка при получении заказов на отпуск:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const handlePhoneSearch = () => {
        const filtered = orders.filter(order =>
            order?.order_id?.delivery_data?.phone?.includes(searchPhone)
        );
        setFilteredOrders(filtered);
    };

    const handleDetected = (barcode) => {
        console.log("Считанный штрихкод:", barcode);
        if (barcode && selectedOrder) {
            const found = selectedOrder.items.find(item =>
                item.variation_id?.barcode === barcode
            );
            if (found) {
                const id = found.variation_id._id;
                setScannedItems(prev => ({
                    ...prev,
                    [id]: (prev[id] || 0) + 1
                }));
            } else {
                alert(`Товар со штрихкодом ${barcode} не найден в заказе!`);
            }
        }
    };


    const isOrderFullyScanned = () => {
        if (!selectedOrder) return false;
        return selectedOrder.items.every(item => {
            const scannedQty = scannedItems[item.variation_id._id] || 0;
            return scannedQty >= item.quantity;
        });
    };

    const handleFinishDelivery = async () => {
        try {
            const status = selectedOrder?.order_id?.delivery_data?.delivery_method === "Самовывоз" ? 'Доставлено' : 'Передано';
            console.log(selectedOrder)
            await axios.put(`http://localhost:8081/warehouse-tasks/${selectedOrder._id}/status`, {status}, { withCredentials: true });
            alert('Заказ успешно завершён!');
            setSelectedOrder(null);
            setScannedItems({});
            setFilteredOrders(prev => prev.filter(o => o._id !== selectedOrder._id));
        } catch (error) {
            console.error('Ошибка при завершении заказа:', error);
            alert('Ошибка при завершении заказа');
        }
    };

    useEffect(() => {
        if (scanMessage) {
            const timer = setTimeout(() => setScanMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [scanMessage]);


    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Загрузка заказов...</div>;

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex align-items-center mb-4">
                    <Button variant="link" onClick={() => navigate('/seller')} className="me-2">
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h3 className="mb-0">Отпуск товара</h3>
                </div>

                {!selectedOrder ? (
                    <>
                        <Form className="mb-3 d-flex">
                            <Form.Control
                                type="text"
                                placeholder="Поиск по номеру телефона"
                                value={searchPhone}
                                onChange={e => setSearchPhone(e.target.value)}
                                className="me-2"
                            />
                            <Button onClick={handlePhoneSearch}>Поиск</Button>
                        </Form>

                        {filteredOrders.length === 0 ? (
                            <p className="text-muted">Нет заказов, ожидающих отпуск.</p>
                        ) : (
                            filteredOrders.map(order => (
                                <Card key={order._id} className="mb-3 shadow-sm">
                                    <Card.Body>
                                        <Card.Title>Заказ #{order._id.slice(-6)}</Card.Title>
                                        {console.log(order?.order_id?.delivery_data?.delivery_method)}
                                        {order?.order_id?.delivery_data?.delivery_method === "Самовывоз" ? (
                                            <p><strong>Клиент:</strong> {order?.order_id?.delivery_data?.recipient_name} — {order?.order_id?.delivery_data?.phone}</p>
                                        ) : (
                                            <p><strong>Курьеру</strong></p>
                                        )}
                                        <p><strong>Статус:</strong> <Badge bg="warning">Ожидает отпуск</Badge></p>
                                        <Button variant="primary" onClick={() => setSelectedOrder(order)}>
                                            Перейти к выдаче
                                        </Button>
                                    </Card.Body>
                                </Card>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        <Card className="mb-3">
                            <Card.Body>
                                <Card.Title>Выдача для заказа #{selectedOrder._id.slice(-6)}</Card.Title>
                                <p><strong>Клиент:</strong> {selectedOrder.customer?.name} — {selectedOrder.customer?.phone}</p>

                                <ul className="mt-3">
                                    {selectedOrder.items.map((item, idx) => {
                                        const scannedQty = scannedItems[item.variation_id._id] || 0;
                                        return (
                                            <li key={idx}>
                                                <strong>{item.variation_id?.product_id?.name}</strong> — {scannedQty}/{item.quantity} шт.
                                            </li>
                                        );
                                    })}
                                </ul>

                                <div className="my-3">
                                    <Button variant="secondary" onClick={() => setShowScanner(!showScanner)}>
                                        {showScanner ? 'Скрыть сканер' : 'Сканировать штрихкод'}
                                    </Button>
                                </div>

                                {showScanner && (
                                    <div className="mb-3 border p-2">
                                        <BarcodeScanner width={400} height={150} onDetected={handleDetected} />
                                    </div>
                                )}
                                {scanMessage && (
                                    <Alert variant={scanMessage.startsWith('✅') ? 'success' : 'danger'}>
                                        {scanMessage}
                                    </Alert>
                                )}

                                {isOrderFullyScanned() ? (
                                    <Alert variant="success">Все товары отсканированы. Готово к выдаче.</Alert>
                                ) : (
                                    <Alert variant="warning">Не все товары отсканированы.</Alert>
                                )}

                                <div className="d-flex mt-3 gap-2">
                                    <Button variant="outline-secondary" onClick={() => {
                                        setSelectedOrder(null);
                                        setScannedItems({});
                                    }}>
                                        Назад к заказам
                                    </Button>
                                    <Button
                                        variant="success"
                                        disabled={!isOrderFullyScanned()}
                                        onClick={handleFinishDelivery}
                                    >
                                        Завершить отпуск
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </>
                )}
            </div>
            <Footer />
        </>
    );
};

export default OrderDeliveryPage;
