import React, { useState, useEffect } from "react";
import "../../style/PaymentStep.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Notification from "../Layout/Notification";;

const PaymentStep = ({ onPrev, onSubmit, deliveryMethod, address }) => {
    const [selectedPayment, setSelectedPayment] = useState(null);

    const [cartItems, setCartItems] = useState([]);
    const [shopInventory, setShopInventory] = useState([]);
    const [auth, setAuth] = useState(false);
    const [userId, setUserId] = useState(null);
    const [notification, setNotification] = useState({ message: "", type: "" });
    const [loading, setLoading] = useState(true);
    const [userDiscount, setUserDiscount] = useState([]);
    const [availablePoints, setAvailablePoints] = useState(0);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [tax, setTax] = useState(0);
    const [products, setProducts] = useState([]);

    const [errorMessage, setErrorMessage] = useState("");
    const [cartSummary, setCartSummary] = useState(null);

    const navigate = useNavigate();

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
                    const userResponse = await axios.get(`http://localhost:8081/users/${userId}`, { withCredentials: true });
                    const userData = userResponse.data;

                    setAvailablePoints(userData.bonus_points);
                    setUserDiscount(userData.discount.$numberDecimal)

                    const cartResponse = await axios.get(`http://localhost:8081/cart/${userId}`, { withCredentials: true });
                    const inventoryResponse = await axios.get("http://localhost:8081/warehouseInventory", { withCredentials: true });

                    setCartItems(cartResponse.data);
                    setShopInventory(inventoryResponse.data);

                    const updatedCartItems = await Promise.all(
                        cartResponse.data.map(async (item) => {
                            const productResponse = await axios.get(`http://localhost:8081/products/${item.product_variations_id.product_id}`, { withCredentials: true });
                            return {
                                ...item,
                                productDetails: productResponse.data,
                            };
                        })
                    );

                    setCartItems(updatedCartItems);
                    const cartData = cartResponse.data;
                    // Сбор идентификаторов товаров
                    const productIds = [
                        ...new Set(cartData.map(item => item.product_variations_id?.product_id).filter(Boolean))
                    ];

                    if (productIds.length > 0) {
                        // Запрос данных о товарах
                        const productResponses = await Promise.all(
                            productIds.map(_id => axios.get(`http://localhost:8081/products/${_id}`))
                        );

                        // Обработка данных товаров
                        const productData = productResponses.map(({ data }) => ({
                            ...data,
                            images: data.images?.length > 0 ? `http://localhost:8081${data.images[0]}` : null,
                            price: data.price?.$numberDecimal || data.price,
                            discount: data.discount?.$numberDecimal || data.discount,
                        }));

                        setProducts(productData);
                        const summaryRes = await axios.get(`http://localhost:8081/cart/${userId}/summary`, { withCredentials: true });
                        setCartSummary(summaryRes.data);
                        console.log(summaryRes.data)
                    } else {
                        console.warn('Нет связанных товаров с вариациями.');
                    }
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
    const handlePointsChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (value > availablePoints) {
            setErrorMessage("Вы не можете использовать больше баллов, чем у вас доступно.");
            setPointsToUse(availablePoints); // Ограничиваем максимальное значение
        } else {
            setErrorMessage(""); // Убираем сообщение об ошибке
            setPointsToUse(value >= 0 ? value : 0); // Убедимся, что значение не меньше 0
        }
    };

    const handleSubmit = () => {
        if (!selectedPayment) {
            showNotification("Выберите способ оплаты", "danger");
            return;
        }

        const paymentData = {
            method: selectedPayment === "cash" ? "Наличные" : "Картой",
            pointsUsed: pointsToUse,
            totalPrice: parseFloat(totalAmount),
            totalTax: parseFloat(cartSummary?.tax || 0),
            userDiscount: parseFloat(userDiscount),
            promotionDiscount: parseFloat(cartSummary?.promotionDiscount || 0),
            deliveryCost: parseFloat(deliveryMethod?.total_cost || 0),
            subtotal: parseFloat(cartSummary?.subtotal || 0),
        };

        onSubmit({ paymentMethod: paymentData });
        console.log("Отправка данных об оплате:", paymentData);
        console.log("Отправка данных об адресе:", address);
        console.log("Отправка данных об методе доставки:", deliveryMethod);
    };

    const totalPriceUser = cartSummary?.subtotal * (userDiscount / 100);
    const totalAmount = (parseFloat(cartSummary?.total) - (pointsToUse) + deliveryMethod?.total_cost - totalPriceUser).toFixed(2);  // Округляем итоговую сумму

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
                    <img className="step-icon  opacity-25" src="http://localhost:8081/assets/icon/Shipping.png" />
                    <span className="opacity-25">
                        <strong>Шаг 2</strong>
                        <br />
                        Доставка
                    </span>
                </div>
                <div className="line-blur mx-2">
                    <div className="line"></div>
                </div>
                <div className="step text-center">
                    <img className="step-icon" src="http://localhost:8081/assets/icon/Payment.png" />
                    <span>
                        <strong>Шаг 3</strong>
                        <br />
                        Оплата
                    </span>
                </div>
            </div>

            <div className="row">
                {/* Блок с описанием заказа */}
                <div className="col-lg-6 mb-4">
                    <div className="order-summary-card">
                        <div className="card-body">
                            <h5 className="order-summary-title">Краткое описание заказа</h5>
                            {cartItems.map((item, index) => {
                                const product = item.productDetails;
                                const priceAfterDiscount = (
                                    item.product_variations_id.price.$numberDecimal *
                                    (1 - item.product_variations_id.discount.$numberDecimal / 100) *
                                    item.quantity
                                ).toFixed(2);


                                return (
                                    <div key={index} className="order-item">
                                        <img
                                            src={`http://localhost:8081${product?.images[0]}`}
                                            alt={product?.name || "Товар"}
                                            className="product-image"
                                        />
                                        <div className="product-info">
                                            <h6 className="product-name">{product?.name || "Название не указано"}</h6>
                                            <p className="product-quantity">Количество: {item.quantity}</p>
                                        </div>
                                        <p className="price">{priceAfterDiscount.toLocaleString("ru-RU")} ₽</p>
                                    </div>
                                );
                            })}
                            <ul className="summary-list">
                                <li className="summary-item d-flex justify-content-between">
                                    <span><strong>Адрес доставки:</strong></span>
                                    <span>{address.address}</span>
                                </li>
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Цена товара без скидки</span>
                                    <span>{cartSummary?.totalOriginal?.toLocaleString('ru-RU')} ₽</span>
                                </li>
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Количество товара</span>
                                    <span>{cartSummary?.summary.length.toLocaleString('ru-RU')} ед.</span>
                                </li>
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Скидка</span>
                                    <span>- {cartSummary?.totalDiscount?.toLocaleString('ru-RU')} ₽</span>
                                </li>
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Личная скидка</span>
                                    <span>- {totalPriceUser.toLocaleString("ru-RU")} ₽</span>
                                </li>
                                {cartSummary?.promotionDiscount && (
                                    <li className="d-flex justify-content-between mt-3">
                                        <span>Скидка по акции:</span>
                                        <strong className="text-success">
                                            - {cartSummary.promotionDiscount?.toLocaleString('ru-RU')} ₽
                                        </strong>
                                    </li>
                                )}
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Налог</span>
                                    <span>{cartSummary?.tax?.toLocaleString('ru-RU')} ₽</span>
                                </li>
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Использованные баллы</span>
                                    <span>- {pointsToUse.toLocaleString('ru-RU')}</span>
                                </li>
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Стоимость доставки</span>
                                    <span>{deliveryMethod?.total_cost.toLocaleString('ru-RU')} ₽</span>
                                </li>
                                <li className="summary-item d-flex justify-content-between">
                                    <strong>Итого</strong>
                                    <strong>{totalAmount.toLocaleString("ru-RU")} ₽</strong>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Блок оплаты */}
                <div className="col-lg-6">
                    <div className="payment-card">
                        <div className="card-body">
                            <h5 className="payment-title">Оплата</h5>
                            <div className="points-section">
                                <div className="mb-3">
                                    <label className="form-label">Доступные баллы</label>
                                    <input type="text" className="form-control" value={availablePoints} readOnly />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Количество баллов для использования</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Введите количество баллов"
                                        value={pointsToUse}
                                        onChange={handlePointsChange}
                                        max={availablePoints}
                                        min={0}
                                    />
                                    {errorMessage && (
                                        <p className="text-danger mt-2">{errorMessage}</p>
                                    )}
                                </div>
                            </div>
                            <ul className="payment-methods">
                                <li className="payment-method">
                                    <button
                                        className={`payment-btn ${selectedPayment === "cash" ? "active" : ""}`}
                                        onClick={() => setSelectedPayment("cash")}
                                    >
                                        Наличными
                                    </button>
                                </li>
                                <li className="payment-method">
                                    <button
                                        className={`payment-btn ${selectedPayment === "card" ? "active" : ""}`}
                                        onClick={() => setSelectedPayment("card")}
                                    >
                                        Картой
                                    </button>
                                </li>
                            </ul>
                            {selectedPayment === "cash" && (
                                <p>
                                    Оплата наличными при получении. Сумма: <strong>{totalAmount.toLocaleString("ru-RU")} ₽</strong>.
                                </p>
                            )}
                            {selectedPayment === "card" && (
                                <p>Оплата картой при получении. Подготовьте карту для оплаты.</p>
                            )}
                            <div className="action-buttons">
                                <button type="button" className="btn btn-outline-dark me-3" onClick={onPrev}>
                                    Назад
                                </button>
                                <button type="button" className="btn btn-dark" onClick={handleSubmit}>
                                    Подтвердить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {notification.message && (
                <Notification message={notification.message} type={notification.type} />
            )}
        </div>
    );
};

export default PaymentStep;
