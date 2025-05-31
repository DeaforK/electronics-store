import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Accordion, Button, Alert, Spinner, Form } from 'react-bootstrap';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const STATUS_OPTIONS = ["Ожидает", "Обрабатывается", "Доставлено", "Отменено", "Задерживается"];

function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingStatusId, setSavingStatusId] = useState(null); // Для отслеживания статуса обновления
    const navigate = useNavigate();

    const fetchAndEnrichDeliveryItems = async (orders) => {
        const variationIdsSet = new Set();

        // Сбор всех variationId
        orders.forEach(order => {
            order.delivery_data?.delivery_parts?.forEach(part => {
                part.items?.forEach(item => {
                    variationIdsSet.add(item.variationId);
                });
            });
        });

        const variationIds = Array.from(variationIdsSet);

        // Запрашиваем данные вариаций
        const variationResponses = await Promise.all(
            variationIds.map(id => axios.get(`http://localhost:8081/product-variations/${id}`, { withCredentials: true }))
        );

        // Создаём карту для быстрого доступа
        const variationMap = {};
        variationResponses.forEach(response => {
            const variation = response.data;
            variationMap[variation._id] = variation;
        });

        // Встраиваем данные в orders
        const enrichedOrders = orders.map(order => {
            if (order.delivery_data?.delivery_parts) {
                order.delivery_data.delivery_parts = order.delivery_data.delivery_parts.map(part => {
                    const enrichedItems = part.items.map(item => ({
                        ...item,
                        variation: variationMap[item.variationId] || null
                    }));
                    return { ...part, items: enrichedItems };
                });
            }
            return order;
        });

        return enrichedOrders;
    };
    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const response = await axios.get('http://localhost:8081/order', { withCredentials: true });
                const ordersData = response.data || [];
                console.log("ordersData: ", ordersData)
                const enrichedOrders = await fetchAndEnrichDeliveryItems(ordersData);
                setOrders(enrichedOrders);
            } catch (error) {
                setError('Ошибка при загрузке заказов.');
                console.error('Ошибка при загрузке заказов:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const handleStatusChange = (orderId, newStatus) => {
        console.log(orderId)
        setOrders(prev =>
            prev.map(order =>
                order._id === orderId ? { ...order, status: newStatus } : order
            )
        );
    };

    const handleSaveStatus = async (orderId, newStatus) => {
        setSavingStatusId(orderId);
        try {
            await axios.patch(`http://localhost:8081/order/${orderId}/status`, { status: newStatus }, { withCredentials: true });

            // Успешное обновление — уже локально обновлено
        } catch (error) {
            setError('Не удалось обновить статус заказа.');
            console.error('Ошибка при обновлении статуса:', error);
        } finally {
            setSavingStatusId(null);
        }
    };

    if (loading) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <>
            <Header />
            <Container className="mt-5" style={{ maxWidth: '800px', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '20px', border: '1px solid #ddd' }}>
                <Button variant="link" onClick={() => navigate('/admin')} className="me-3">
                    <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                </Button>
                <h1 className="mb-4" style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '15px' }}>Заказы</h1>

                {error && <Alert variant="danger">{error}</Alert>}

                <Accordion className="mt-3">
                    {orders.length ? (
                        orders.map((order) => (
                            <Accordion.Item key={order._id} eventKey={order._id} style={{ backgroundColor: '#f8f9fa', border: '1px solid #ddd' }}>
                                <Accordion.Header>Заказ #{order._id}</Accordion.Header>
                                <Accordion.Body>
                                    <p>
                                        <strong>Дата доставки: </strong>
                                        {order.estimated_delivery_datetime ? (
                                            (() => {
                                                const estimatedDeliveryDate = new Date(order.estimated_delivery_datetime);
                                                const daysUntilDelivery = Math.ceil((estimatedDeliveryDate - Date.now()) / (1000 * 60 * 60 * 24));
                                                return `Через ${daysUntilDelivery} дней (${estimatedDeliveryDate.toLocaleDateString()})`;
                                            })()
                                        ) : (
                                            'Не указано'
                                        )}
                                    </p>
                                    <p>
                                        <strong>Способ доставки: </strong>
                                        {order?.delivery_data?.delivery_method || ''}
                                    </p>
                                    <p>
                                        <strong>Адрес: </strong>
                                        {order.delivery_data?.address || ''}
                                    </p>
                                    <p>
                                        <strong>Способ оплаты: </strong> {order.payment_method || 'Не указан'}
                                    </p>
                                    <p><strong>Итоговая сумма:</strong> {order?.total_amount?.$numberDecimal} руб.</p>

                                    <Form.Group className="mb-3">
                                        <Form.Label><strong>Статус:</strong></Form.Label>
                                        <Form.Select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                            disabled={savingStatusId === order._id}
                                        >
                                            {STATUS_OPTIONS.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>

                                    <Button
                                        variant="primary"
                                        onClick={() => handleSaveStatus(order._id, order.status)}
                                        disabled={savingStatusId === order._id}
                                    >
                                        {savingStatusId === order._id ? 'Сохранение...' : 'Сохранить статус'}
                                    </Button>

                                    {/* Отображение товаров в заказе */}
                                    <hr />
                                    {order.delivery_data?.delivery_parts?.length > 0 && (
                                        <div className="mt-3">
                                            <strong>Доставка по частям:</strong>
                                            {order.delivery_data.delivery_parts.map((part, idx) => (
                                                <div key={idx} className="border rounded p-2 my-3">
                                                    <p><strong>Причина:</strong> {part.reason || '—'}</p>
                                                    <p><strong>Дата доставки:</strong> {new Date(part.estimated_delivery_date).toLocaleDateString()}</p>
                                                    <p><strong>Стоимость:</strong> {part.cost?.toLocaleString('ru-RU')} ₽</p>
                                                    <p><strong>Товары:</strong></p>
                                                    <div className="d-flex flex-wrap">
                                                        {part.items.map((item, i) => {
                                                            const variation = item.variation;
                                                            const product = variation?.product_id; // предполагаем, что в variation есть product_id (populate с сервера)

                                                            return variation && product ? (
                                                                <div key={i} style={{ margin: '10px', maxWidth: '150px' }}>
                                                                    <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }}>
                                                                        <img
                                                                            src={`http://localhost:8081${product.images?.[0]}`}
                                                                            alt={product.name}
                                                                            style={{ width: '100%', borderRadius: '4px' }}
                                                                        />
                                                                        <h6 style={{ marginTop: '10px' }}>{product.name || 'Название недоступно'}</h6>
                                                                        <p>{Object.entries(variation.attributes || {}).map(([key, val]) => `${key}: ${val}`).join(', ')}</p>
                                                                        <p><strong>Количество:</strong> {item.quantity}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div key={i} className="text-muted">
                                                                    Неизвестный товар (ID вариации: {item.variationId})
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Accordion.Body>
                            </Accordion.Item>
                        ))
                    ) : (
                        <Accordion.Item>
                            <Accordion.Body>Нет заказов</Accordion.Body>
                        </Accordion.Item>
                    )}
                </Accordion>
            </Container>
            <Footer />
        </>
    );
}

export default OrdersPage;
