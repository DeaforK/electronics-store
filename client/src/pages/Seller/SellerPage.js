import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListGroup, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import '../../style/SellerPage.css'; // можно скопировать из Courier.css

function SellerPage() {
    const [loading, setLoading] = useState(true);
    const [isSeller, setIsSeller] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSellerData = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/seller', { withCredentials: true });

                if (userResponse.data.user.role === 'seller') {
                    setIsSeller(true);
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Ошибка при проверке роли продавца-приёмщика:', error);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchSellerData();
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

    if (loading) {
        return (
            <Spinner animation="border" role="status" className="loading-spinner">
                <span className="visually-hidden">Загрузка...</span>
            </Spinner>
        );
    }

    return (
        <>
            <Header />
            <div className="seller-page">
                <h1 className="text-center mb-4">Панель продавца-приёмщика</h1>
                {isSeller ? (
                    <div className="seller-content">
                        <ListGroup className="seller-list">
                            <ListGroup.Item action onClick={() => handleGoToPage('/seller/stock-in')} className="seller-list-item mb-3">
                                <strong>Добавить товар (сканер штрихкодов)</strong>
                            </ListGroup.Item>
                            <ListGroup.Item action onClick={() => handleGoToPage('/seller/stock-out')} className="seller-list-item mb-3">
                                <strong>Отпустить товар клиенту (по штрихкоду)</strong>
                            </ListGroup.Item>
                            <ListGroup.Item action onClick={() => handleGoToPage('/seller/stock-check')} className="seller-list-item mb-3">
                                <strong>Проверить остатки на складе</strong>
                            </ListGroup.Item>
                            <ListGroup.Item action onClick={() => handleGoToPage('/seller/movements')} className="seller-list-item mb-3">
                                <strong>История поступлений и списаний</strong>
                            </ListGroup.Item>
                            <ListGroup.Item action onClick={() => handleGoToPage('/seller/warehouse-task')} className="seller-list-item mb-3">
                                <strong>Данные о заказах</strong>
                            </ListGroup.Item>
                        </ListGroup>
                        <div className="action-buttons mt-4">
                            <Button variant="outline-danger" className="logout-button" onClick={handleLogout}>
                                Выйти
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Alert variant="danger" className="text-center">
                        Ошибка: Роль продавца-приёмщика не найдена.
                    </Alert>
                )}

                {message && <Alert variant="success" className="text-center">{message}</Alert>}
                {error && <Alert variant="danger" className="text-center">{error}</Alert>}
            </div>
            <Footer />
        </>
    );
}

export default SellerPage;
