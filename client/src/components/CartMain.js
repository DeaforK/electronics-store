import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert, Form } from 'react-bootstrap';
import '../style/CartMain.css';
import { FaMinus, FaPlus } from "react-icons/fa6";
import { MdClose } from "react-icons/md";

const formatAttributes = (attributes) => {
    if (!attributes || typeof attributes !== 'object') return 'Стандартная комплектация';

    return Object.entries(attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
};

function CartMain() {
    const [cartItems, setCartItems] = useState([]);
    const [variations, setVariations] = useState({});
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addToCartErrors, setAddToCartErrors] = useState({});
    const navigate = useNavigate();

    const [auth, setAuth] = useState(false);
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState(null);

    const [promotion, setPromotion] = useState(null);
    const [cartSummary, setCartSummary] = useState(null);


    // Проверка аутентификации пользователя
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081/', { withCredentials: true });
                if (res.data.message === 'Успех') {
                    setAuth(true);
                    setUserId(res.data.data.userId);
                } else {
                    setAuth(false);
                    setMessage('Пожалуйста, войдите или зарегистрируйтесь для просмотра корзины.');
                }
            } catch (error) {
                setAuth(false);
                setMessage('Произошла ошибка при проверке аутентификации.');
            }
        };

        checkAuth();
    }, []);

    const fetchCartItems = async () => {
        try {
            const response = await axios.get(`http://localhost:8081/cart/${userId}`, { withCredentials: true });
            const cartData = response.data || [];
            setCartItems(cartData);

            // Обработка вариаций
            const variationsMap = cartData.map(item => {
                const variation = item.product_variations_id;
                return {
                    ...variation,
                    price: parseFloat(variation.price?.$numberDecimal || 0), // Преобразуем цену в число
                    discount: parseFloat(variation.discount?.$numberDecimal || 0), // Преобразуем скидку в число
                };
            });

            // console.log(variationsMap);
            setVariations(variationsMap);

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
                // console.log(productData._id)

                //Проверка на участвует ли товар в акции
                const allPromotions = [];
                for (const product of productData) {
                    const res = await axios.get(`http://localhost:8081/promotions/by-product/${product._id}`);
                    if (res.data.length > 0) {
                        allPromotions.push(...res.data);
                    }
                }
                if (allPromotions.length > 0) {
                    setPromotion(allPromotions[0]); // Или показывай несколько
                }
                const summaryRes = await axios.get(`http://localhost:8081/cart/${userId}/summary`, { withCredentials: true });
                setCartSummary(summaryRes.data);
                // console.log(summaryRes.data)
            } else {
                console.warn('Нет связанных товаров с вариациями.');
            }
        } catch (error) {
            setError('Ошибка при загрузке корзины.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка данных корзины
    useEffect(() => {
        if (auth && userId) {
            fetchCartItems();
        }
    }, [auth, userId]);

    // Удаление товара из корзины
    const handleRemoveItem = async (itemId) => {
        try {
            await axios.delete(`http://localhost:8081/cart/${itemId}`, { withCredentials: true });
            const updatedCart = cartItems.filter(item => item._id !== itemId);
            setCartItems(updatedCart);
            fetchCartItems();
        } catch (error) {
            console.error('Ошибка при удалении товара из корзины:', error);
        }
    };

    // Изменение количества товара
    const handleQuantityChange = async (item, newQuantity) => {
        if (newQuantity <= 0) {
            handleRemoveItem(item._id);
            return;
        }

        const variation = item.product_variations_id;
        if (variation && newQuantity > variation.quantity) {
            setAddToCartErrors(prevErrors => ({
                ...prevErrors,
                [item.product_variations_id._id]: 'Недостаточно товара на складе.'
            }));
            return;
        }

        try {
            await axios.put(`http://localhost:8081/cart/${item._id}`, { quantity: newQuantity }, { withCredentials: true });
            const updatedCart = cartItems.map(cartItem =>
                cartItem._id === item._id ? { ...cartItem, quantity: newQuantity } : cartItem
            );
            setCartItems(updatedCart);
            fetchCartItems();
        } catch (error) {
            console.error('Ошибка при изменении количества товара в корзине:', error);
        }
    };


    if (loading) {
        return (
            <Spinner animation="border" role="status">
                <span className="visually-hidden">Загрузка...</span>
            </Spinner>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    const isPromotionApplicable = () => {
        if (!promotion || !promotion.min_order_amount) return false;
        return parseFloat(cartSummary.total) >= parseFloat(promotion.min_order_amount.$numberDecimal);
    };


    const totalAmount = cartSummary ? parseFloat(cartSummary.total).toFixed(2) : '0.00';

    return (
        <Container className="mt-5">
            <Row>
                <Col md={8}>
                    <h2 className="mb-4">Корзина</h2>
                    {/* {console.log(promotion)} */}
                    {cartItems.length === 0 ? (
                        <Alert variant="info">Ваша корзина пуста.</Alert>
                    ) : (
                        cartItems.map(item => {
                            const variation = item.product_variations_id;
                            const product = products.find(p => p._id === item.product_variations_id.product_id);
                            const priceAfterDiscount = ((variation.price.$numberDecimal * (1 - variation.discount.$numberDecimal / 100)) * item.quantity).toFixed(2);
                            return (
                                <div key={item._id} className="d-flex align-items-center mb-4">
                                    <img
                                        src={product?.images || 'default-image.png'}
                                        alt={product?.name || 'Товар'}
                                        className="img-fluid me-3"
                                        style={{ width: '80px' }}
                                    />
                                    <div className="flex-grow-1">
                                        <h5 className="mb-1">{product?.name || 'Название не указано'}</h5>
                                        <p className="mb-0">{variation ? formatAttributes(variation.attributes) : 'Атрибуты не указаны'}</p>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <Button
                                            variant="outline-secondary"
                                            className="button3"
                                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                        >
                                            <FaMinus />
                                        </Button>
                                        <Form.Control
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(item, parseInt(e.target.value, 10))}
                                            className="mx-2 text-center"
                                            style={{ width: '60px' }}
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            className="button3"
                                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                        >
                                            <FaPlus />
                                        </Button>
                                    </div>
                                    <p className="mb-0 ms-3">{priceAfterDiscount.toLocaleString('ru-RU')} руб.</p>
                                    <Button
                                        variant="link"
                                        className="ms-3 p-0"
                                        style={{ color: 'black' }}
                                        onClick={() => handleRemoveItem(item._id)}
                                    >
                                        <MdClose size={24} />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                    {addToCartErrors && Object.values(addToCartErrors).map((error, index) => (
                        <div key={index} className="error-message">{error}</div>
                    ))}
                </Col>
                <Col md={4}>
                    <div className="p-4 border rounded-3">
                        <h5>Краткое описание заказа</h5>
                        <ul className="list-unstyled">
                            <li className="d-flex justify-content-between mt-3">
                                <span>Цена товара без скидки</span>
                                <span>{cartSummary?.totalOriginal?.toLocaleString('ru-RU')} руб.</span>
                            </li>
                            <li className="d-flex justify-content-between mt-3">
                                <span>Количество товара</span>
                                <span>{cartSummary?.summary.length.toLocaleString('ru-RU')} ед.</span>
                            </li>
                            <li className="d-flex justify-content-between mt-3">
                                <span>Скидка</span>
                                <span>- {cartSummary?.totalDiscount?.toLocaleString('ru-RU')} руб.</span>
                            </li>
                            <li className="d-flex justify-content-between mt-3">
                                <span>Промежуточный итог</span>
                                <span>{cartSummary?.subtotal?.toLocaleString('ru-RU')} руб.</span>
                            </li>
                            {promotion && cartSummary?.promotionDiscount && (
                                <li className="d-flex justify-content-between mt-3">
                                    <span>Скидка по акции:</span>
                                    <strong className="text-success">
                                        - {cartSummary.promotionDiscount?.toLocaleString('ru-RU')} руб.
                                    </strong>
                                </li>
                            )}
                            <li className="d-flex justify-content-between mt-3">
                                <span>Налог</span>
                                <span>{cartSummary?.tax?.toLocaleString('ru-RU')} руб.</span>
                            </li>
                            <li className="d-flex justify-content-between mt-3">
                                <strong>Итого</strong>
                                <strong>{cartSummary?.total?.toLocaleString('ru-RU')} руб.</strong>
                            </li>
                            {promotion && (
                                <div className="mt-3 p-3 border rounded" style={{ backgroundColor: promotion.background_color || '#f0f0f0' }}>
                                    <h6>Акция: {promotion.name}</h6>
                                    {isPromotionApplicable() ? (
                                        <>
                                            {promotion.discount_type === 'Процент' && (
                                                <p>Скидка: {promotion.discount_value?.$numberDecimal}%</p>
                                            )}
                                            {promotion.discount_type === 'Фиксированная сумма' && (
                                                <p>Скидка: -{promotion.discount_value?.$numberDecimal}₽</p>
                                            )}
                                            {promotion.gift_product_id && (
                                                <p>Подарок: {promotion.gift_product_id.name}</p>
                                            )}
                                            <small>Акция действует до: {new Date(promotion.end_date).toLocaleDateString()}</small>
                                        </>
                                    ) : (
                                        <>
                                            <p>Добавьте товаров на сумму {parseFloat(promotion.min_order_amount.$numberDecimal).toLocaleString('ru-RU')} руб. для участия в акции.</p>
                                            <small>Текущая сумма заказа: {parseFloat(totalAmount).toLocaleString('ru-RU')} руб.</small>
                                        </>
                                    )}
                                </div>
                            )}
                        </ul>
                        <Button
                            variant="primary"
                            className="w-100"
                            onClick={() => navigate('/checkout')}
                        >
                            Оформить заказ
                        </Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default CartMain;
