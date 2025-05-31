import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'; // Импортируем стили Bootstrap
import axios from 'axios';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa'; // Импортируем иконку стрелки из react-icons

function Login() {
    // Инициализация хука useForm для работы с формами
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [apiError, setApiError] = useState(''); // Состояние для хранения ошибок API
    const navigate = useNavigate(); // Хук для навигации
    axios.defaults.withCredentials = true; // Настройка axios для отправки куки

    // Функция обработки отправки формы
    const onSubmit = async (data) => {
        try {
            // Изменяем имя поля с email на emailOrPhone
            const response = await axios.post('http://localhost:8081/login', {
                emailOrPhone: data.identifier, // Используем identifier как emailOrPhone
                password: data.password
            });

            // Проверяем статус ответа
            if (response.data.message === 'Успех входа') {
                navigate('/'); // Перенаправляем на главную страницу при успешном входе
            } else {
                setApiError('Неверные учетные данные'); // Устанавливаем сообщение об ошибке
            }
        } catch (error) {
            // Устанавливаем сообщение об ошибке, если запрос не удался
            console.log(error)
            setApiError(error.response?.data?.message || 'Ошибка входа'); // Исправлено с error.data.error на error.data.message
        }
    };

    // Функция для возврата на предыдущую страницу
    const handleBack = () => {
        navigate(-1); // Возвращаемся на предыдущую страницу
    };

    return (
        <div className='d-flex justify-content-center align-items-center vh-100' style={{ backgroundColor: '#f8f9fa' }}>
            {/* Кнопка назад в левом верхнем углу */}
            <button 
                className="btn btn-link position-absolute" 
                style={{ top: '20px', left: '20px' }}
                onClick={handleBack}
            >
                <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} /> {/* Иконка стрелки */}
            </button>

            {/* Основная форма для входа */}
            <div className='p-4 rounded w-25' style={{ backgroundColor: '#ffffff', border: '1px solid #ddd' }}>
                <h2 className="text-center mb-4" style={{ color: '#333' }}>Вход</h2>
                {apiError && <div className="alert alert-danger">{apiError}</div>} {/* Отображение сообщения об ошибке */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-3">
                        <label htmlFor='identifier' className="form-label" style={{ color: '#333' }}>Email или Телефон</label>
                        <input
                            type="text" // Изменено с email на text для возможности ввода телефона
                            className="form-control"
                            id='identifier'
                            {...register('identifier', { 
                                required: 'Поле обязательно для заполнения', 
                            })}
                            placeholder="Введите email или телефон"
                        />
                        {errors.identifier && <div className="text-danger">{errors.identifier.message}</div>} {/* Отображение ошибки валидации */}
                    </div>
                    <div className="mb-3">
                        <label htmlFor='password' className="form-label" style={{ color: '#333' }}>Пароль</label>
                        <input
                            type="password"
                            className="form-control"
                            id='password'
                            {...register('password', { 
                                required: 'Пароль обязателен', 
                                minLength: {
                                    value: 6,
                                    message: 'Пароль должен содержать не менее 6 символов'
                                }
                            })}
                            placeholder="Введите пароль"
                        />
                        {errors.password && <div className="text-danger">{errors.password.message}</div>} {/* Отображение ошибки валидации */}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <button type="submit" className="btn btn-dark">Войти</button> {/* Кнопка отправки формы */}
                    </div>
                    <p className="text-center">
                        Нет аккаунта? <a href='/register' style={{ color: '#555' }}>Регистрация</a> {/* Ссылка на регистрацию */}
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Login;
