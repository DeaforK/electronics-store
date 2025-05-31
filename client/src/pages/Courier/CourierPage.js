import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListGroup, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import '../../style/Courier.css';

function CourierPage() {
    const [loading, setLoading] = useState(true);
    const [isCourier, setIsCourier] = useState(false);
    const [courierId, setCourierId] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const [isActive, setIsActive] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourierData = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/courier', { withCredentials: true });

                if (userResponse.data.user.role === 'courier') {
                    setIsCourier(true);
                    const res = await axios.get(`http://localhost:8081/couriers/${userResponse.data.user.userId}`, { withCredentials: true });
                    setIsActive(res.data.status); // ✅ вместо map → берём первый объект
                    setCourierId(res.data._id);   // ✅ берём ID напрямую
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
    }, [navigate]);

    const handleGoToPage = (path) => navigate(path);

    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:8081/logout', {}, { withCredentials: true });
            navigate('/');
        } catch (error) {
            setError('Ошибка при выходе из аккаунта.');
            console.error('Ошибка при выходе из аккаунта:', error);
        }
    };

    const toggleCourierStatus = async () => {
        if (isActive === 'занят') {
            setMessage('Вы не можете сменить статус, пока выполняется заказ.');
            return;
        }

        const newStatus = isActive === 'доступен' ? 'недоступен' : 'доступен';

        try {
            await axios.patch(`http://localhost:8081/couriers/${courierId}/status`, { status: newStatus }, { withCredentials: true });
            setIsActive(newStatus);
            setMessage(`Статус изменён: вы теперь ${newStatus === 'доступен' ? 'в сети' : 'не в сети'}`);
        } catch (err) {
            setError('Ошибка при изменении статуса.');
            console.error(err);
        }
    };

    if (loading)
        return (
            <Spinner animation="border" role="status" className="loading-spinner">
                <span className="visually-hidden">Загрузка...</span>
            </Spinner>
        );

    return (
        <>
            <Header />
            <div className="courier-page">
                <h1 className="text-center mb-4">Курьерская панель</h1>
                {message && <Alert variant="success" className="text-center">{message}</Alert>}
                {error && <Alert variant="danger" className="text-center">{error}</Alert>}
                {isCourier ? (
                    <div className="courier-content">
                        <Button
                            variant={isActive === "доступен" ? "success" : isActive === "недоступен" ? "secondary" : "warning"}
                            className="mb-3"
                            onClick={toggleCourierStatus}
                            disabled={isActive === 'занят'}
                        >
                            {isActive === "доступен" && "Вы в сети (нажмите, чтобы выйти)"}
                            {isActive === "недоступен" && "Вы не в сети (нажмите, чтобы войти)"}
                            {isActive === "занят" && "Вы заняты (завершите доставку)"}
                        </Button>
                        <ListGroup className="courier-list">
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/courier/tasks')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Список активных заказов</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/courier/assigned-orders')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Список выбранных заказов</strong>
                            </ListGroup.Item>
                            {/* <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/courier/products')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление товарами</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/courier/orders')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление заказами</strong>
                            </ListGroup.Item> */}
                        </ListGroup>
                        <div className="action-buttons mt-4">
                            {/* <Button
                                variant="primary"
                                className="go-to-dashboard"
                                onClick={() => navigate('/courier/dashboard')}
                            >
                                Перейти к статистике
                            </Button> */}
                            <Button
                                variant="outline-danger"
                                className="logout-button"
                                onClick={handleLogout}
                            >
                                Выйти
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Alert variant="danger" className="text-center">
                        Ошибка: Роль курьера не найдена.
                    </Alert>
                )}
            </div>
            <Footer />
        </>
    );
}

export default CourierPage;
