import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function TestPage() {
    const [adminData, setAdminData] = useState(null); // Данные администратора
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const response = await axios.get('http://localhost:8081/admin', { withCredentials: true });

                if (response.data.user.role === 'admin') {
                    // Сохраняем данные администратора
                    setAdminData(response.data.user);
                    // Запрашиваем данные пользователя по ID
                    fetchUserData(response.data.user.userId);
                } else {
                    navigate('/login'); // Перенаправление на страницу входа
                }
            } catch (error) {
                handleError(error);
            } finally {
                setLoading(false);
            }
        };

        const fetchUserData = async (userId) => {
            try {
                const userResponse = await axios.get(`http://localhost:8081/users/${userId}`, { withCredentials: true });
                setAdminData(userResponse.data); // Сохраняем данные пользователя
            } catch (error) {
                console.error('Ошибка при получении данных пользователя:', error);
            }
        };

        checkAdmin();
    }, [navigate]);

    const handleError = (error) => {
        if (error.response && error.response.status === 403) {
            console.error('Доступ запрещен, неверная роль пользователя');
        } else if (error.response && error.response.status === 401) {
            console.error('Токен отсутствует или отозван');
        } else {
            console.error('Произошла ошибка проверки администратора', error);
        }
        navigate('/login'); // Перенаправление на страницу входа
    };

    if (loading) {
        return <div>Загрузка...</div>; // Пока идет проверка, показываем индикатор загрузки
    }

    if (!adminData) {
        return null; // Если не администратор, ничего не показываем
    }

    return (
        <div>
            <h1>Добро пожаловать, {adminData.name}</h1>
            <div>
                <img
                    src={adminData.avatar || '../assets/avatar/avatar_default.png'}
                    alt="Avatar"
                    width="100"
                    height="100"
                />
                <p><strong>Email:</strong> {adminData.email}</p>
                <p><strong>Телефон:</strong> {adminData.phone || 'Не указан'}</p>
                <p><strong>Роль:</strong> {adminData.role}</p>
                <p><strong>Скидка:</strong> {adminData.discount ? adminData.discount.$numberDecimal : '0.00'}%</p>
                <p><strong>Бонусные баллы:</strong> {adminData.bonus_points}</p>
            </div>
        </div>
    );
}

export default TestPage;
