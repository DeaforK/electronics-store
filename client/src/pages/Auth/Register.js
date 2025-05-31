import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa'; // Импортируем иконку стрелки из react-icons

function Register() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [apiError, setApiError] = useState('');
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        try {
            const response = await axios.post('http://localhost:8081/register', data, { withCredentials: true });
            if (response.status === 200) {
                navigate('/');
            }
        } catch (error) {
            setApiError(error.response?.data?.error || 'Ошибка регистрации');
        }
    };

    const handleBack = () => {
        navigate(-1); // Возвращаемся на предыдущую страницу
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundColor: '#f8f9fa' }}>
            {/* Кнопка назад в левом верхнем углу */}
            <button
                className="btn btn-link position-absolute"
                style={{ top: '20px', left: '20px' }}
                onClick={handleBack}
            >
                <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} /> {/* Иконка стрелки */}
            </button>

            <div className="p-4 rounded w-50" style={{ backgroundColor: '#ffffff', border: '1px solid #ddd' }}>
                <h2 className="text-center mb-4" style={{ color: '#333' }}>Регистрация</h2>
                {apiError && <div className="alert alert-danger">{apiError}</div>}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-3">
                        <label htmlFor="name" className="form-label" style={{ color: '#333' }}>Имя</label>
                        <input
                            type="text"
                            className="form-control"
                            id="name"
                            {...register('name', { required: 'Имя обязательно' })}
                        />
                        {errors.name && <div className="text-danger">{errors.name.message}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label" style={{ color: '#333' }}>Электронная почта</label>
                        <input
                            type="email"
                            className="form-control"
                            id="email"
                            {...register('email', {
                                required: 'Электронная почта обязательна',
                                pattern: {
                                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                                    message: 'Неверный формат электронной почты'
                                }
                            })}
                        />
                        {errors.email && <div className="text-danger">{errors.email.message}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="telephone" className="form-label" style={{ color: '#333' }}>Телефон</label>
                        <input
                            type="text"
                            className="form-control"
                            id="telephone"
                            {...register('phone', {
                                required: 'Телефон обязателен',
                                pattern: {
                                    value: /^[0-9]{11}$/,
                                    message: 'Телефон должен содержать 11 цифр'
                                }
                            })}
                        />
                        {errors.phone && <div className="text-danger">{errors.phone.message}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password" className="form-label" style={{ color: '#333' }}>Пароль</label>
                        <input
                            type="password"
                            className="form-control"
                            id="password"
                            {...register('password', {
                                required: 'Пароль обязателен',
                                minLength: {
                                    value: 6,
                                    message: 'Пароль должен быть не менее 6 символов'
                                }
                            })}
                        />
                        {errors.password && <div className="text-danger">{errors.password.message}</div>}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <button type="submit" className="btn btn-dark">Зарегистрироваться</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register;
