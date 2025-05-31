import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Barcode from "react-barcode";

const CourierTasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [isCourier, setIsCourier] = useState(false);
    const [courierId, setCourierId] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await axios.get('http://localhost:8081/warehouse-tasks/courier', {
                    withCredentials: true
                });
                setTasks(res.data);
            } catch (error) {
                console.error('Ошибка при загрузке заданий:', error);
            } finally {
                setLoading(false);
            }
        };
        const fetchCourierData = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/courier', { withCredentials: true });

                if (userResponse.data.user.role === 'courier') {
                    setIsCourier(true);
                    const res = await axios.get(`http://localhost:8081/couriers/${userResponse.data.user?.userId}`, { withCredentials: true });
                    console.log(userResponse.data.user?.userId)
                    console.log(res.data)
                    setCourierId(res.data?._id);   // ✅ берём ID напрямую
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Ошибка при проверке роли курьера:', error);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchCourierData();
        fetchTasks();
    }, []);

    const toggleSelectTask = (task) => {
        const isSelected = selectedTasks.some(t => t._id === task._id);
        if (isSelected) {
            setSelectedTasks(prev => prev.filter(t => t._id !== task._id));
        } else {
            if (
                selectedTasks.length === 0 ||
                selectedTasks.every(t => t.warehouse_id._id === task.warehouse_id._id)
            ) {
                setSelectedTasks(prev => [...prev, task]);
            } else {
                alert('Можно выбрать только заказы с одного склада');
            }
        }
    };

    const takeSelectedOrders = async () => {
        try {
            const orderIds = selectedTasks.map(task => task.order_id._id);
            const warehouseTaskId = selectedTasks.map(task => task._id);
            console.log(courierId)
            console.log(warehouseTaskId)

            await axios.put(`http://localhost:8081/couriers/${courierId}/assign-order`, {
                order_id: orderIds,
                warehouseTask_id: warehouseTaskId
            }, {
                withCredentials: true
            });

            setTasks(prev =>
                prev.map(task =>
                    selectedTasks.some(t => t._id === task._id)
                        ? { ...task, courier_assigned: true }
                        : task
                )
            );

            setSelectedTasks([]);
        } catch (error) {
            console.error('Ошибка при назначении заказов:', error);
        }
    };


    if (loading) {
        return <div className="text-center mt-5"><Spinner animation="border" /> Загрузка задач...</div>;
    }

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex align-items-center mb-4">
                    <Button variant="link" onClick={() => navigate('/courier')} className="me-2 p-0">
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h3 className="mb-0">Активные заказы на доставку</h3>
                </div>
                {tasks.length === 0 ? (
                    <p className="text-muted">Нет активных заданий.</p>
                ) : (
                    <>
                        {tasks.map(task => (
                            <Card key={task._id} className="mb-3 shadow-sm">
                                <Card.Body>
                                    <Card.Title>
                                        Заказ #{task.order_id?._id?.toString().slice(-6) || '???'}
                                    </Card.Title>

                                    <p><strong>Забрать со склада:</strong> {task.warehouse_id?.name}</p>
                                    <p><strong>Доставить по адресу:</strong> {task.order_id?.delivery_data?.address}</p>
                                    <p>
                                        <strong>Статус:</strong>{' '}
                                        <Badge bg={
                                            task.status === 'Собрано' ? 'success' :
                                                task.status === 'Передано' ? 'secondary' : 'warning'
                                        }>
                                            {task.status}
                                        </Badge>
                                    </p>

                                    <div>
                                        <strong>Товары для доставки:</strong>
                                        <ul className="mt-2">
                                            {task.items.map((item, idx) => (
                                                <li key={idx}>
                                                    <div>
                                                        <div><strong>{item.variation_id?.product_id?.name || 'Неизвестный товар'}</strong></div>
                                                        <div>Количество: {item.quantity} шт.</div>
                                                        {item.variation_id?.barcode && (
                                                            <div className="mt-2">
                                                                <Barcode value={item.variation_id.barcode} height={50} fontSize={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {!task.courier_assigned && (
                                        <Form.Check
                                            type="checkbox"
                                            label="Выбрать заказ"
                                            checked={selectedTasks.some(t => t._id === task._id)}
                                            onChange={() => toggleSelectTask(task)}
                                            className="mt-3"
                                        />
                                    )}
                                    {task.courier_assigned && (
                                        <Badge bg="info" className="mt-3">Вы назначены на доставку</Badge>
                                    )}
                                </Card.Body>
                            </Card>
                        ))}

                        {selectedTasks.length > 0 && (
                            <Button
                                variant="primary"
                                className="mt-3"
                                onClick={takeSelectedOrders}
                            >
                                Взять выбранные заказы
                            </Button>
                        )}
                    </>
                )}
            </div>
            <Footer />
        </>
    );
};

export default CourierTasksPage;
