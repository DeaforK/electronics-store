import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from './OrderContext';

function AddressPage() {
    const { setOrderDetails } = useOrder();
    const navigate = useNavigate();

    const handleAddressSelection = (e) => {
        setOrderDetails(prev => ({ ...prev, address: e.target.value }));
        navigate('/delivery');
    };

    return (
        <div className="container mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="step active">Шаг 1 <br /> Адрес</div>
                <div className="step">Шаг 2 <br /> Доставка</div>
                <div className="step">Шаг 3 <br /> Оплата</div>
            </div>

            <div className="card p-4 shadow-sm">
                <h5 className="mb-3">Выбор адреса</h5>
                <form>
                    <div className="form-check mb-3 p-3 border rounded d-flex justify-content-between align-items-center">
                        <input className="form-check-input" type="radio" name="address" id="address1" value="Address1" checked />
                        <label className="form-check-label flex-grow-1 ms-2" htmlFor="address1">
                            <strong>Address 1</strong>
                        </label>
                        <button type="button" className="btn btn-outline-secondary btn-sm me-2">✏️</button>
                        <button type="button" className="btn btn-outline-danger btn-sm">✖️</button>
                    </div>
                    <div className="text-center mb-4">
                        <button type="button" className="btn btn-outline-dark">Добавить новый адрес</button>
                    </div>
                    <div className="d-flex justify-content-between">
                        <button type="button" className="btn btn-outline-secondary">Назад</button>
                        <button type="button" className="btn btn-dark" onClick={handleAddressSelection}>Далее</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddressPage;
