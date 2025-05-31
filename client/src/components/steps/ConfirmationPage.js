import React from "react";
import { useNavigate } from "react-router-dom";
import '../../style/ConfirmationPage.css';

const ConfirmationPage = () => {
    const navigate = useNavigate();

    const handleReturnToHome = () => {
        navigate("/"); // Переход на главную страницу
    };

    const handleViewOrders = () => {
        navigate("/profile"); // Переход к списку заказов
    };

    return (
        <>
            <div className="confirmation-page">
                <div className="confirmation-content">
                    <h1>Спасибо за ваш заказ!</h1>
                    <p>
                        Ваш заказ успешно оформлен и находится в обработке. Мы уведомим вас, как только он будет подтвержден.
                    </p>
                    <div className="confirmation-actions">
                        <button onClick={handleReturnToHome} className="btn btn-primary">
                            На главную
                        </button>
                        <button onClick={handleViewOrders} className="btn btn-secondary">
                            Мои заказы
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationPage;
