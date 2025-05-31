import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from './OrderContext';
import axios from 'axios';

function DeliveryPage() {
    const { orderDetails, setOrderDetails } = useOrder();
    const [deliveryMethods, setDeliveryMethods] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDeliveryMethods = async () => {
            try {
                const response = await axios.get('http://localhost:8081/delivery-methods', { withCredentials: true });
                setDeliveryMethods(response.data.data || []);
            } catch (error) {
                console.error('Ошибка при загрузке способов доставки:', error);
            }
        };

        fetchDeliveryMethods();
    }, []);

    const handleDeliverySelection = (e) => {
        setOrderDetails(prev => ({ ...prev, deliveryMethod: e.target.value }));
        navigate('/payment');
    };

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-center mb-4">
                <div className="step-indicator">
                    <span className="step completed">Шаг 1</span> <span className="text-muted">Адрес</span>
                </div>
                <div className="step-indicator active mx-4">
                    <span className="step">Шаг 2</span> <span>Доставка</span>
                </div>
                <div className="step-indicator">
                    <span className="step text-muted">Шаг 3</span> <span className="text-muted">Оплата</span>
                </div>
            </div>

            <div className="card p-4 shadow-sm">
                <h5 className="mb-3">Способ доставки</h5>
                <form>
                    {deliveryMethods.map(method => (
                        <div className="form-check mb-3 p-3 border rounded d-flex justify-content-between align-items-center" key={method.id}>
                            <input className="form-check-input" type="radio" name="delivery" id={`delivery${method.id}`} value={method.id} checked={orderDetails.deliveryMethod === method.id} onChange={handleDeliverySelection} />
                            <label className="form-check-label flex-grow-1 ms-2 d-flex justify-content-between align-items-center" htmlFor={`delivery${method.id}`}>
                                <div>
                                    <strong>{method.price} руб.</strong> <span className="ms-2 text-muted">{method.name}</span>
                                </div>
                                <div>
                                    <span className="text-muted">{method.date}</span>
                                </div>
                            </label>
                        </div>
                    ))}
                    <div className="d-flex justify-content-between mt-4">
                        <button type="button" className="btn btn-outline-secondary">Назад</button>
                        <button type="button" className="btn btn-dark" onClick={handleDeliverySelection}>Далее</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default DeliveryPage;
