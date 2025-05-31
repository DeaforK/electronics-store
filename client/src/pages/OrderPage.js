import React, { useState, useEffect } from "react";
import AddressStep from "../components/steps/AddressStep";
import DeliveryStep from "../components/steps/DeliveryStep";
import PaymentStep from "../components/steps/PaymentStep";
import ConfirmationPage from "../components/steps/ConfirmationPage";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const OrderPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        address: null,
        deliveryMethod: null,
        paymentMethod: null,
        user: null,
    });

    const [auth, setAuth] = useState(false);
    const [message, setMessage] = useState("");
    const [userId, setUserId] = useState(null);

    const navigate = useNavigate();

    // Проверка аутентификации пользователя
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get("http://localhost:8081/", { withCredentials: true });
                if (res.data.message === "Успех") {
                    setAuth(true);
                    setUserId(res.data.data.userId);
                    const userRes = await axios.get(`http://localhost:8081/users/${res.data.data.userId}`, { withCredentials: true });
                    setFormData((prev) => ({ ...prev, user: userRes.data }));
                } else {
                    navigate("/");
                    setAuth(false);
                    setMessage("Пожалуйста, войдите или зарегистрируйтесь для оформления заказа.");
                }
            } catch (error) {
                setAuth(false);
                setMessage("Произошла ошибка при проверке аутентификации.");
            }
        };

        checkAuth();
    }, [navigate]);

    // Обработчик перехода на следующий шаг
    const handleNextStep = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setCurrentStep((prev) => prev + 1);
    };

    // Обработчик перехода на предыдущий шаг
    const handlePrevStep = () => {
        setCurrentStep((prev) => prev - 1);
    };


    // Отправка данных на сервер
    const handleSubmit = async (data) => {
        const submissionData = { ...formData, ...data };

        const payload = {
            users_id: userId,
            payment_method: submissionData.paymentMethod.method,
            total_amount: submissionData.paymentMethod.totalPrice,
            tax: submissionData.paymentMethod.totalTax,
            bonus_points_used: submissionData.paymentMethod.pointsUsed || 0,
            discount_applied: (submissionData.paymentMethod.userDiscount || 0) + (submissionData.paymentMethod.promotionDiscount || 0),
            delivery_cost: submissionData.paymentMethod.deliveryCost || 0,
            subtotal: submissionData.paymentMethod.subtotal || 0,
            order_items: (() => {
                const parts = submissionData.deliveryMethod.delivery_parts;
                const isCombined = !!parts[0]?.warehouse_ids;

                if (isCombined) {
                    // Объединённая доставка
                    const warehouseMap = new Map();
                    for (const w of parts[0].warehouse_ids) {
                        for (const variationId of w.product_variation_ids) {
                            warehouseMap.set(variationId, w.warehouse_id);
                        }
                    }

                    return parts[0].items.map(item => ({
                        variationId: item.variationId,
                        quantity: item.quantity,
                        warehouse_id: warehouseMap.get(item.variationId),
                        estimated_delivery_date: parts[0].estimated_delivery_date
                    }));
                } else {
                    // Частичная доставка
                    return parts.flatMap(part =>
                        part.items.map(item => ({
                            variationId: item.variationId,
                            quantity: item.quantity,
                            warehouse_id: part.warehouse_id,
                            estimated_delivery_date: part.estimated_delivery_date
                        }))
                    );
                }
            })(),
            delivery_data: {
                _id: submissionData.deliveryMethod._id,
                delivery_parts: submissionData.deliveryMethod.delivery_parts,
                method: submissionData.deliveryMethod.method,
                total_cost: submissionData.deliveryMethod.total_cost,
                estimated_delivery: submissionData.deliveryMethod.estimated_delivery,
            },
            address: {
                label: submissionData.address.label || submissionData.address.name,
                address: submissionData.address.address,
                location: submissionData.address.location,
            }
    };
    console.log("Отправка данных на сервер:", payload);

    try {
        const response = await axios.post("http://localhost:8081/order", payload, {
            withCredentials: true,
        });
        console.log("Ответ от сервера:", response.data);

        // Переходим на страницу подтверждения
        setCurrentStep(4);
    } catch (error) {
        console.error("Ошибка отправки данных на сервер:", error);
        alert("Произошла ошибка при оформлении заказа. Попробуйте снова.");
    }
};


return (
    <div className="checkout-page">
        <Header />

        <main>
            {currentStep === 1 && <AddressStep onNext={handleNextStep} />}
            {currentStep === 2 && (
                <DeliveryStep
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                    address={formData.address}
                />
            )}
            {currentStep === 3 && (
                <PaymentStep
                    onPrev={handlePrevStep}
                    onSubmit={(data) => {
                        handleNextStep(data);
                        handleSubmit(data);
                    }}
                    address={formData.address}
                    deliveryMethod={formData.deliveryMethod}
                />
            )}
            {currentStep === 4 && <ConfirmationPage />}
        </main>

        <Footer />
    </div>
);
};

export default OrderPage;
