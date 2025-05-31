import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Loader from '../../components/Layout/Loader';
import Notification from '../../components/Layout/Notification';
import { FaArrowLeft } from 'react-icons/fa';

function CourierOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterDate, setFilterDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [showModal, setShowModal] = useState(false);
    const [userId, setUserId] = useState(null);

    const [productVariations, setProductVariations] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081/courier', { withCredentials: true });
                setUserId(res.data.user.userId);
            } catch (err) {
                navigate('/login');
            }
        };

        const fetchOrders = async () => {
            try {
                const response = await axios.get('http://localhost:8081/order', { withCredentials: true });
                setOrders(response.data);
                setFilteredOrders(response.data);
            } catch (err) {
                setError('Не удалось загрузить данные о заказах.');
            } finally {
                setLoading(false);
            }
        };


        checkAuth();
        fetchOrders();
    }, []);

    useEffect(() => {
        const fetchProductVariations = async () => {
            try {
                const response = await axios.get('http://localhost:8081/product-variations', { withCredentials: true });
                setProductVariations(response.data);
            } catch (err) {
                console.error('Ошибка при загрузке вариаций товаров:', err);
                setError('Не удалось загрузить данные о товарах.');
            }
        };

        if (showModal) {
            fetchProductVariations();
        }
    }, [showModal]);

    const getProductName = (productVariationsId) => {
        const variation = productVariations.find(variation => variation._id === productVariationsId);
        return variation?.product_id?.name || 'Название не найдено';
    };

    const handleFilterDateChange = (e) => {
        const date = e.target.value;
        setFilterDate(date);
        if (date) {
            setFilteredOrders(orders.filter(order => order.createdAt.startsWith(date)));
        } else {
            setFilteredOrders(orders);
        }
    };

    const handleOpenModal = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!selectedOrder) return;
        try {
            console.log(newStatus)
            await axios.patch(`http://localhost:8081/order/${selectedOrder._id}/status`, { status: newStatus }, { withCredentials: true });
            setNotification({ message: 'Статус заказа обновлен!', type: 'success' });
            setOrders(prev => prev.map(order => order._id === selectedOrder._id ? { ...order, status: newStatus } : order));
            setFilteredOrders(prev => prev.map(order => order._id === selectedOrder._id ? { ...order, status: newStatus } : order));
            handleCloseModal();
        } catch (err) {
            setNotification({ message: 'Ошибка при обновлении статуса.', type: 'danger' });
        }
    };

    if (loading) return <Loader />;
    if (error) return <div className="text-danger">{error}</div>;

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <Button
                        variant="link"
                        onClick={() => navigate('/courier')}
                        className="me-2 p-0"
                    >
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h2>Заказы</h2>
                    <Form.Control
                        type="date"
                        value={filterDate}
                        onChange={handleFilterDateChange}
                        style={{ maxWidth: '200px' }}
                    />
                </div>

                {notification.message && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onDismiss={() => setNotification({ message: '', type: '' })}
                    />
                )}

                <ListGroup>
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <ListGroup.Item
                                key={order._id}
                                className="d-flex justify-content-between align-items-center"
                                onClick={() => handleOpenModal(order)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span>
                                    <strong>Заказ #{order._id}</strong>
                                    <br />
                                    <small>Дата: {new Date(order.createdAt).toLocaleDateString()}</small>
                                </span>
                                <span>{order.status}</span>
                            </ListGroup.Item>
                        ))) : (
                        <ListGroup.Item>Нет заказов.</ListGroup.Item>
                    )}
                </ListGroup>
            </div>

            {selectedOrder && (
                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Детали заказа</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {error && <p className="text-danger">{error}</p>}
                        <p><strong>ID заказа:</strong> {selectedOrder._id}</p>
                        <p><strong>Дата создания:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                        <p><strong>Статус:</strong> {selectedOrder.status}</p>
                        <p><strong>Сумма:</strong> {selectedOrder.total_amount.$numberDecimal} руб.</p>
                        <p><strong>Товары:</strong></p>
                        <ul>
                            {selectedOrder.order_items.map(item => (
                                <li key={item.product_variations_id}>
                                    {console.log(item.product_variations_id)}
                                    {getProductName(item.product_variations_id)} — {item.quantity} шт.
                                </li>
                            ))}
                        </ul>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>Закрыть</Button>
                        <Button variant="success" onClick={() => handleUpdateStatus('Доставлен')}>Отметить как доставлен</Button>
                        <Button variant="danger" onClick={() => handleUpdateStatus('Отменен')}>Отменить заказ</Button>
                    </Modal.Footer>
                </Modal>
            )}
            <Footer />
        </>
    );
}

export default CourierOrdersPage;
