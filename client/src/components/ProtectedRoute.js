// client/src/components/ProtectedRoute.js

// Импорт необходимых модулей
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

// Компонент ProtectedRoute для защиты маршрутов
function ProtectedRoute({ children }) {
    // Состояние для хранения статуса авторизации
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    // Проверка аутентификации при загрузке компонента
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Отправляем запрос на сервер для проверки аутентификации
                const response = await axios.get('http://localhost:8081/protected', { withCredentials: true });
                // Если ответ успешный, пользователь авторизован
                setIsAuthenticated(true);
            } catch (error) {
                // В случае ошибки пользователь не авторизован
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    // Пока происходит проверка, отображаем загрузку
    if (isAuthenticated === null) {
        return <div>Проверка авторизации...</div>;
    }

    // Если не авторизован, перенаправляем на страницу входа
    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    // Если авторизован, отображаем защищённый контент
    return children;
}

export default ProtectedRoute;
