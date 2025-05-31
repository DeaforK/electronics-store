import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from './OrderContext';

function PaymentPage() {
    const { orderDetails, setOrderDetails } = useOrder();
    const navigate = useNavigate();

    const handlePaymentSelection = (e) => {
        setOrderDetails(prev => ({ ...prev, paymentMethod: e.target.value }));
        // Здесь можно добавить логику для создания заказа через API и очистки корзины
        console.log('Order Details:', orderDetails);
        // Пример: navigate('/success'); // Навигация на страницу успеха после оформления заказа
    };

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-center mb-4">
                <div className="step-indicator">
                    <span className="step completed">Шаг 1</span> <span className="text-muted">Адрес</span>
                </div>
                <div className="step-indicator mx-4">
                    <span className="step completed">Шаг 2</span> <span className="text-muted">Доставка</span>
                </div>
                <div className="step-indicator active">
                    <span className="step">Шаг 3</span> <span>Оплата</span>
                </div>
            </div>

            <div className="card p-4 shadow-sm">
                <h5 className="mb-3">Оплата</h5>
                <form>
                    <div className="form-check mb-3">
                        <input className="form-check-input" type="radio" name="payment" id="card" value="Картой" checked={orderDetails.paymentMethod === 'Картой'} onChange={handlePaymentSelection} />
                        <label className="form-check-label" htmlFor="card">Картой</label>
                    </div>
                    <div className="form-check mb-3">
                        <input className="form-check-input" type="radio" name="payment" id="cash" value="Наличными" checked={orderDetails.paymentMethod === 'Наличными'} onChange={handlePaymentSelection} />
                        <label className="form-check-label" htmlFor="cash">Наличными</label>
                    </div>
                    <div className="form-check mb-3">
                        <input className="form-check-input" type="radio" name="payment" id="paypal" value="PayPal" checked={orderDetails.paymentMethod === 'PayPal'} onChange={handlePaymentSelection} />
                        <label className="form-check-label" htmlFor="paypal">PayPal</label>
                    </div>
                    <div className="d-flex justify-content-between mt-4">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/delivery')}>Назад</button>
                        <button type="button" className="btn btn-dark" onClick={handlePaymentSelection}>Оформить заказ</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PaymentPage;
