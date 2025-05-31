import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListGroup, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../../style/Admin.css';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';

function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/admin', { withCredentials: true });

                if (userResponse.data.user.role === 'admin') {
                    setIsAdmin(true);
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Ошибка при проверке роли администратора:', error);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
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

    if (loading) return <Spinner animation="border" role="status" style={{ color: '#333' }}><span className="visually-hidden">Загрузка...</span></Spinner>;

    return (
        <>
            <Header />
            <div className="admin-page">
                <h1 className="text-center mb-4">Админ панель</h1>
                {isAdmin && (
                    <div className="courier-content">
                        <ListGroup className="courier-list">
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/categories')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление категориями</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/products')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление товарами</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/warehouse')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление магазинами и складами</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/banner')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление баннерами</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/promotion')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление акциями</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/users')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление пользователями</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/delivery-methods')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление способами доставки</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/orders')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Управление заказами</strong>
                            </ListGroup.Item>
                            <ListGroup.Item
                                action
                                onClick={() => handleGoToPage('/admin/activityLog')}
                                className="courier-list-item mb-3"
                            >
                                <strong>Журнал действий</strong>
                            </ListGroup.Item>
                        </ListGroup>
                        <div className="action-buttons mt-4">
                            <Button
                                variant="primary"
                                className="go-to-dashboard"
                                onClick={() => navigate('/admin/dashboard')}
                            >
                                Перейти к статистике
                            </Button>
                            <Button
                                variant="outline-danger"
                                className="logout-button"
                                onClick={handleLogout}
                            >
                                Выйти
                            </Button>
                        </div>
                    </div>
                )}



                {message && <Alert variant="success" className="text-center">{message}</Alert>}
                {error && <Alert variant="danger" className="text-center">{error}</Alert>}
            </div>
            <Footer />
        </>
    );
}

export default AdminPage;
