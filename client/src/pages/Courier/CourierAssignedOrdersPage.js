import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Spinner, Button } from 'react-bootstrap';
import { FaArrowLeft } from "react-icons/fa";
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import { YMaps, Map } from '@pbe/react-yandex-maps';
import Barcode from "react-barcode";

const CourierAssignedOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courierLocation, setCourierLocation] = useState(null);

    const navigate = useNavigate();

    const normalizeCourierData = (data) => {
        return data.flatMap(courier => {
            return courier.warehouse_task?.map(task => {
                const order = task.order_id;
                const warehouse = task.warehouse_id;

                const items = task.items?.map(item => {
                    return {
                        name: item.variation_id?.product_id?.name || 'Неизвестный товар',
                        quantity: item.quantity,
                        barcode: item.variation_id?.barcode || null,
                        image: item.variation_id?.product_id?.images?.[0] || null,
                        warehouse_task_id: item?._id,
                    };
                }) || [];

                return {
                    orderId: order?._id,
                    status: order?.status || task.status || 'Неизвестен',
                    address: order?.delivery_data?.address || '—',
                    warehouseName: warehouse?.name || '—',
                    warehouseAddress: warehouse?.address,
                    payment_method: order?.payment_method,
                    total_amount: order?.total_amount,
                    location: order?.delivery_data?.location, // { latitude, longitude }
                    warehouseLocation: warehouse?.location,   // { latitude, longitude }
                    warehouse_task_id: task?._id,
                    userData: {
                        userName: order?.delivery_data?.recipient_name,
                        phone: order?.delivery_data?.phone
                    },
                    items
                };
            });
        });
    };

    const fetchCourierPosition = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCourierLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (err) => {
                    console.warn("Ошибка геолокации:", err);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    };

    useEffect(() => {
        fetchCourierPosition();

        const fetchAssignedOrders = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/courier', { withCredentials: true });

                if (userResponse.data.user.role === 'courier') {
                    const res = await axios.get(`http://localhost:8081/couriers/${userResponse.data.user.userId}`, {
                        withCredentials: true
                    });
                    const data = Array.isArray(res.data) ? res.data : [res.data];
                    const normalizedOrders = normalizeCourierData(data);
                    console.log("normalizedOrders: ", normalizedOrders)
                    console.log("data: ", data)
                    setOrders(normalizedOrders);
                } else {
                    navigate('/login');
                }
            } catch (err) {
                console.error('Ошибка при загрузке заказов:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignedOrders();
    }, []);

    const renderMapRoute = () => {
        if (!window.ymaps || !courierLocation || !orders.length) return;

        const ymaps = window.ymaps;
        ymaps.ready(() => {
            const mapInstance = window.mapInstance;
            if (!mapInstance) return;

            mapInstance.geoObjects.removeAll();

            const routePoints = [
                {
                    coords: [courierLocation.latitude, courierLocation.longitude],
                    label: 'Курьер'
                },
                {
                    coords: [orders[0].warehouseLocation.latitude, orders[0].warehouseLocation.longitude],
                    label: 'Склад'
                },
                ...orders.map((order, idx) => ({
                    coords: [order.location.latitude, order.location.longitude],
                    label: `Доставка №${idx + 1}`
                }))
            ];

            const multiRoute = new ymaps.multiRouter.MultiRoute({
                referencePoints: routePoints.map(p => p.coords),
                params: { routingMode: 'auto' }
            }, {
                boundsAutoApply: true,
                wayPointVisible: true,
                wayPointsDraggable: true, // ✅ Разрешает менять порядок точек вручную
                pinIconCaptionEnabled: true // ✅ Включает отображение label при наведении
            });

            // Добавление подсказок на точки маршрута
            multiRoute.model.events.add('requestsuccess', () => {
                const wayPoints = multiRoute.getWayPoints();
                routePoints.forEach((point, index) => {
                    wayPoints.get(index).properties.set('hintContent', point.label); // подсказка при наведении
                    wayPoints.get(index).properties.set('iconContent', point.label); // подпись под иконкой
                });
            });

            mapInstance.geoObjects.add(multiRoute);
        });
    };

    useEffect(() => {
        if (window.ymaps && courierLocation && orders.length) {
            renderMapRoute();
        }
    }, [courierLocation, orders]);

    const handleCompleteOrder = async (order) => {
        const orderId = order.orderId
        console.log(order?.warehouse_task_id)
        try {
            await axios.put(`http://localhost:8081/warehouse-tasks/${order?.warehouse_task_id}/status`, { status: 'Передано' }, { withCredentials: true });

            // Обновим статус на клиенте
            setOrders(prev =>
                prev.map(order =>
                    order.orderId === orderId ? { ...order, status: 'Передано' } : order
                )
            );
        } catch (error) {
            console.error('Ошибка при завершении заказа:', error);
            alert('Не удалось завершить заказ.');
        }
    };

    const handleDelayedOrder = async (order) => {
        const orderId = order.orderId
        console.log(order?.warehouse_task_id)
        try {
            await axios.put(`http://localhost:8081/warehouse-tasks/${order?.warehouse_task_id}/status`, { status: 'Задерживается' }, { withCredentials: true });

            // Обновим статус на клиенте
            setOrders(prev =>
                prev.map(order =>
                    order.orderId === orderId ? { ...order, status: 'Задерживается' } : order
                )
            );
        } catch (error) {
            console.error('Ошибка при завершении заказа:', error);
            alert('Не удалось завершить заказ.');
        }
    };


    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> Загрузка заказов...</div>;

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex align-items-center mb-4">
                    <Button variant="link" onClick={() => navigate('/courier')} className="me-2">
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h3 className="mb-0">Назначенные заказы</h3>
                </div>
                {orders.length === 0 ? (
                    <p>Нет активных заказов</p>
                ) : (

                    orders.map(order => (
                        <Card key={order.orderId} className="mb-3 shadow-sm">
                            <Card.Body>
                                <Card.Title>Заказ #{order.orderId.toString().slice(-6)}</Card.Title>
                                <p><strong>Статус:</strong> {order.status}</p>
                                <p><strong>Адрес доставки:</strong> {order.address}</p>
                                <p><strong>Склад:</strong> {order.warehouseName} <strong>Адрес:</strong> {order.warehouseAddress}</p>
                                <p><strong>Способ оплаты:</strong> {order.payment_method} </p>
                                <p><strong>Цена:</strong> {order?.total_amount?.$numberDecimal} руб.</p>
                                <p><strong>Данные клиента: </strong> {order?.userData?.userName} <strong>Телефон:</strong> {order?.userData?.phone}</p>

                                <div>
                                    <strong>Товары:</strong>
                                    <ul>
                                        {order.items.map((item, idx) => (
                                            <li key={idx}>
                                                <div>{item.name} — {item.quantity} шт.</div>
                                                {item.barcode && <Barcode value={item.barcode} />}
                                                {item.image && <img src={`http://localhost:8081${item.image}`} width={100} alt={item.name} />}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {order.status !== 'Завершён' && (
                                    <button
                                        className="btn btn-success mt-3"
                                        onClick={() => handleCompleteOrder(order)}
                                    >
                                        Завершить заказ
                                    </button>
                                )}
                                {order.status !== 'Завершён' && (
                                    <button
                                        className="btn btn-success mt-3"
                                        onClick={() => handleDelayedOrder(order)}
                                    >
                                        Заказ задерживается
                                    </button>
                                )}

                            </Card.Body>
                        </Card>
                    )))}

                {orders.length > 0 && (
                    <div style={{ height: 400 }}>
                        <YMaps query={{ lang: 'ru_RU', apikey: 'fe9ec694-cdc4-4b75-a2cd-5b920200a71f' }}>
                            <Map
                                defaultState={{ center: [52.2858, 104.3007], zoom: 10 }}
                                instanceRef={ref => window.mapInstance = ref}
                                width="100%"
                                height="100%"
                            />
                        </YMaps>
                    </div>
                )}
            </div >
            <Footer />
        </>
    );
};

export default CourierAssignedOrdersPage;
