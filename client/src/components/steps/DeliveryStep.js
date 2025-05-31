import React, { useState, useEffect } from "react";
import "../../style/OrderPage.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Notification from "../Layout/Notification";

const DeliveryStep = ({ onNext, onPrev, address }) => {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [shopInventory, setShopInventory] = useState([]);
    const [deliveryMethods, setDeliveryMethods] = useState([]);
    const [auth, setAuth] = useState(false);
    const [userId, setUserId] = useState(null);
    const [notification, setNotification] = useState({ message: "", type: "" });
    const [loading, setLoading] = useState(true);


    const navigate = useNavigate();
    // console.log(address)

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get("http://localhost:8081/", { withCredentials: true });
                if (res.data.message === "Успех") {
                    setAuth(true);
                    setUserId(res.data.data.userId);
                } else {
                    navigate("/");
                }
            } catch {
                navigate("/");
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        if (auth && userId) {
            const fetchData = async () => {
                try {
                    const cartResponse = await axios.get(`http://localhost:8081/cart/${userId}`, { withCredentials: true });
                    const inventoryResponse = await axios.get("http://localhost:8081/warehouseInventory", { withCredentials: true });

                    setCartItems(cartResponse.data);
                    // console.log('CartItems: ', cartResponse.data)
                    setShopInventory(inventoryResponse.data);

                    const updatedCartItems = await Promise.all(
                        cartResponse.data.map(async (item) => {
                            const productResponse = await axios.get(`http://localhost:8081/products/${item.product_variations_id.product_id}`, { withCredentials: true });
                            return {
                                ...item,
                                productDetails: productResponse.data, // Это может быть не нужно, если вся информация о товаре в cartItem уже есть
                                price: item.product_variations_id.price?.$numberDecimal || 0, // Используем цену из вариации
                                discount: item.product_variations_id.discount?.$numberDecimal || 0, // Используем скидку из вариации
                            };
                        })
                    );

                    setCartItems(updatedCartItems);
                    const cart = cartResponse.data;
                    const serverData = cart.map(item => {
                        return {
                            product_variations_id: item.product_variations_id._id,
                            quantity: item.quantity,
                        }
                    })
                    const addressData = {
                        type: address.warehouse_id ? 'Самовывоз' : 'Курьерская',
                        location: {
                            latitude: address.location.latitude,
                            longitude: address.location.longitude
                        },
                        address: address.address,
                        ...(address.warehouse_id && { warehouse_id: address.warehouse_id })
                    };

                    const deliveryData = await axios.post(`http://localhost:8081/delivery-methods/delivery/options`, { items: serverData, address: addressData }, { withCredentials: true });
                    console.log(deliveryData.data);
                    const parsed = deliveryData.data?.options || [];
                    setDeliveryMethods(parsed);

                } catch (error) {
                    console.error("Ошибка загрузки данных:", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchData();
        }
    }, [auth, userId]);


    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    };

    const handleNext = () => {
        if (selectedMethod) {
            onNext({ deliveryMethod: selectedMethod });
            console.log(selectedMethod)
        } else {
            showNotification("Выберите вариант доставки", "danger");
        }
    };

    return (
        <div className="container mt-4">
            {/* Step Indicator */}
            <div className="step-indicator d-flex justify-content-between align-items-center mb-4">
                <div className="step text-center">
                    <img className="step-icon  opacity-25" src="http://localhost:8081/assets/icon/Location.png" />
                    <span className="opacity-25">
                        <strong>Шаг 1</strong>
                        <br />
                        Адрес
                    </span>
                </div>
                <div className="line-blur mx-2">
                    <div className="line"></div>
                </div>
                <div className="step text-center">
                    <img className="step-icon" src="http://localhost:8081/assets/icon/Shipping.png" />
                    <span>
                        <strong>Шаг 2</strong>
                        <br />
                        Доставка
                    </span>
                </div>
                <div className="line-blur mx-2">
                    <div className="line"></div>
                </div>
                <div className="step text-center">
                    <img className="step-icon opacity-25" src="http://localhost:8081/assets/icon/Payment.png" />
                    <span className="opacity-25">
                        <strong>Шаг 3</strong>
                        <br />
                        Оплата
                    </span>
                </div>
            </div>

            <h2>Выберите вариант доставки</h2>
            <div className="delivery-options mt-4">
                {deliveryMethods.map((method, index) => (
                    <label
                        key={index}
                        htmlFor={`delivery-option-${index}`}
                        className="delivery-option border rounded mb-4 p-4 shadow-sm bg-light d-block"
                        onClick={() => setSelectedMethod(method)}
                    >
                        <div className="d-flex align-items-center mb-3">
                            <input
                                type="radio"
                                id={`delivery-option-${index}`}
                                name="delivery-method"
                                value={method.type}
                                onChange={() => setSelectedMethod(method)}
                                className="form-check-input me-3"
                            />
                            <strong className="fs-5">{method.method}</strong>
                        </div>

                        {method.delivery_parts.map((part, i) => (
                            <div key={i} className="mb-3">
                                <h6 className="fw-bold mb-2">Часть доставки #{i + 1}</h6>
                                <p className="text-muted mt-1" > Ожидается {new Date(part.estimated_delivery_date).toLocaleDateString("ru-RU")}</p>
                                <div className="row g-4">
                                    {part.items.map((item, idx) => {
                                        const cartItem = cartItems.find(ci => ci.product_variations_id._id === item.variationId);
                                        return (
                                            <div key={idx} className="col-6 col-md-4 col-lg-3">
                                                <div className="card border-0 h-100 shadow-sm bg-white position-relative">
                                                    <div className="card-img-container bg-light">
                                                        <img
                                                            src={`http://localhost:8081${cartItem?.productDetails?.images[0]}`}
                                                            alt={cartItem?.productDetails?.name}
                                                            className="card-img-top"
                                                        />
                                                    </div>
                                                    <div className="card-body text-center">
                                                        <h6 className="card-title text-dark fw-bold mb-2">
                                                            {cartItem?.productDetails?.name}
                                                        </h6>
                                                        <p className="card-text text-secondary fw-bold text-dark">
                                                            {(cartItem?.product_variations_id.price?.$numberDecimal *
                                                                (1 - cartItem?.product_variations_id.discount?.$numberDecimal / 100) *
                                                                item.quantity).toFixed(2)} ₽
                                                        </p>
                                                    </div>
                                                    {item.quantity > 1 && (
                                                        <span className="badge bg-dark text-white position-absolute top-0 end-0 m-2">
                                                            x{item.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <p className="text-dark fw-bold mt-2">
                            Стоимость доставки: {method.total_cost || 0} ₽
                        </p>
                    </label>
                ))}
            </div>

            {notification.message && (
                <Notification message={notification.message} type={notification.type} />
            )}

            <div className="action-buttons d-flex justify-content-end mt-4">
                <button type="button" className="btn btn-outline-dark" onClick={onPrev}>
                    Назад
                </button>
                <button type="button" className="btn btn-dark" onClick={handleNext}>
                    Далее
                </button>
            </div>
        </div>
    );
};

export default DeliveryStep;
