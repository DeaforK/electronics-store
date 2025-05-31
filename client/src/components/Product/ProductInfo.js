import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../../style/ProductPage.css';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaMinus, FaPlus } from 'react-icons/fa'; // Импортируем иконки для минуса и плюса

const ProductInfo = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attributes, setAttributes] = useState({});
    const [selectedOptions, setSelectedOptions] = useState({});
    const [variations, setVariations] = useState([]);
    const [promotion, setPromotion] = useState(null);
    const [selectedVariationId, setSelectedVariationId] = useState(null);
    const [selectedVariation, setSelectedVariation] = useState(null);
    const [addToCartError, setAddToCartError] = useState(null);

    const [auth, setAuth] = useState(false);
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState(null);
    const [showModal, setShowModal] = useState(false); // Управление модальным окном
    const [isFavorite, setIsFavorite] = useState(false); // Флаг, находится ли товар в избранном
    const [favoriteId, setFavoriteId] = useState(null);

    const [cartItems, setCartItems] = useState([]);
    const [quantityInCart, setQuantityInCart] = useState(0);

    const navigate = useNavigate();

    const refreshFavorite = async () => {
        try {
            if (userId) {
                console.log(userId)
                const favoritesResponse = await axios.get(`http://localhost:8081/favorites/${userId}`);
                console.log(favoritesResponse.data)
                const favoriteProduct = favoritesResponse.data.find(fav => fav.products_id?._id === id);
                if (favoriteProduct) {
                    setFavoriteId(favoriteProduct._id); // Обновляем ID для корректного удаления
                    setIsFavorite(true);
                } else {
                    setFavoriteId(null);
                    setIsFavorite(false);
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении избранного:', error);
        }
    };

    useEffect(() => {
        const fetchProductInfo = async () => {
            if (id) {
                try {
                    const productResponse = await axios.get(`http://localhost:8081/products/${id}`);
                    const productData = productResponse.data;
                    setProduct(productData);

                    const variationsResponse = await axios.get(`http://localhost:8081/product-variations/product/${id}`);
                    const variationsData = variationsResponse.data.map(variation => ({
                        ...variation,
                        price: parseFloat(variation.price?.$numberDecimal || 0),
                        discount: parseFloat(variation.discount?.$numberDecimal || 0),
                        attributes: variation?.attributes || [],
                        quantity: variation.quantity,  // количество на складе
                    }));
                    setVariations(variationsData);
                    const groupedAttributes = {};
                    variationsData.forEach(variation => {
                        Object.entries(variation.attributes).forEach(([key, value]) => {
                            if (!groupedAttributes[key]) {
                                groupedAttributes[key] = new Set();
                            }
                            groupedAttributes[key].add(value);
                        });
                    });
                    setAttributes(
                        Object.fromEntries(
                            Object.entries(groupedAttributes).map(([key, value]) => [key, Array.from(value)])
                        )
                    );

                    const defaultVariation = variationsData.find(variation => variation.quantity > 0);
                    if (defaultVariation) {
                        setSelectedVariationId(defaultVariation._id);
                        setSelectedVariation(defaultVariation);
                    }
                    //Проверка на участвует ли товар в акции
                    const promotionResponse = await axios.get(`http://localhost:8081/promotions/by-product/${id}`);
                    console.log(promotionResponse.data[0])
                    if (promotionResponse.data.length > 0) {
                        setPromotion(promotionResponse.data[0]);
                    }
                    refreshFavorite();
                } catch (error) {
                    setError('Ошибка при загрузке информации о продукте.');
                    console.error('Ошибка при загрузке информации о продукте:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081/', { withCredentials: true });
                if (res.data.message === "Успех") {
                    setAuth(true);
                    setUserId(res.data.data.userId);
                    console.log('Авторизация успешна:', true);
                } else {
                    setAuth(false);
                }
            } catch (error) {
                console.error('Ошибка проверки авторизации:', error);
                setAuth(false);
            }
        };
        checkAuth();
        fetchProductInfo();
    }, [id]);

    const fetchCartItems = async () => {
        try {
            const response = await axios.get(`http://localhost:8081/cart/${userId}`, { withCredentials: true });
            setCartItems(response.data);
            // Обновляем количество товара в корзине для выбранной вариации
            if (selectedVariationId) {
                const cartItem = response.data.find(item => item.product_variations_id?._id === selectedVariationId);
                setQuantityInCart(cartItem ? cartItem.quantity : 0);
            }
        } catch (error) {
            console.error('Ошибка при загрузке корзины:', error);
        }
    };


    useEffect(() => {
        if (auth && userId) {
            fetchCartItems();
        }
    }, [auth, userId, selectedVariationId]);


    const handleOptionChange = (attrName, value) => {
        setSelectedOptions(prevOptions => {
            const newOptions = { ...prevOptions, [attrName]: value };

            const allAttributesSelected = Object.keys(attributes).every(attr => newOptions[attr]);
            if (allAttributesSelected) {
                const selectedVariation = variations.find(variation =>
                    Object.entries(newOptions).every(([key, val]) => variation.attributes[key] === val)
                );
                if (selectedVariation) {
                    setSelectedVariationId(selectedVariation._id);
                    setSelectedVariation(selectedVariation);

                    // Обновляем количество товара в корзине для выбранной вариации
                    const cartItem = cartItems.find(item => item.product_variations_id === selectedVariation._id);
                    setQuantityInCart(cartItem ? cartItem.quantity : 0);
                } else {
                    setSelectedVariationId(null);
                    setSelectedVariation(null);
                    setQuantityInCart(0);
                }
            } else {
                setSelectedVariationId(null);
                setSelectedVariation(null);
                setQuantityInCart(0);
            }
            return newOptions;
        });
    };


    const handleAddToCart = async () => {
        if (!auth) {
            setShowModal(true); // Показать модальное окно, если пользователь не авторизован
            return;
        }

        if (!selectedVariationId) {
            setAddToCartError('Пожалуйста, выберите вариацию товара.');
            return;
        }

        const cartItem = cartItems.find(item => item.product_variations_id._id === selectedVariationId);
        if (cartItem) {
            // Если товар уже есть в корзине, увеличиваем его количество
            await handleQuantityChange(cartItem, cartItem.quantity + 1);
        } else {
            // Если товара нет в корзине, добавляем новый
            try {
                if (selectedVariation.quantity <= 0) {
                    setAddToCartError('Товар отсутствует на складе');
                    return;
                }
                await axios.post(
                    'http://localhost:8081/cart',
                    { quantity: 1, product_variations_id: selectedVariationId, users_id: userId },
                    { withCredentials: true }
                );
                fetchCartItems(); // Обновляем корзину
            } catch (error) {
                console.error('Ошибка при добавлении товара в корзину:', error);
                setAddToCartError('Не удалось добавить товар в корзину.');
            }
        }
    };


    const handleAddToFavorite = async () => {
        if (!auth) {
            console.log('Пользователь не авторизован, показываем модальное окно');
            setShowModal(true); // Показываем модальное окно, если пользователь не авторизован
            return;
        }

        try {
            if (isFavorite) {
                await axios.delete(`http://localhost:8081/favorites/${favoriteId}`, { withCredentials: true });
                console.log('Товар удалён из избранного.');
                await refreshFavorite();
            } else {
                const response = await axios.post(
                    'http://localhost:8081/favorites',
                    { products_id: id, users_id: userId },
                    { withCredentials: true }
                );
                console.log('Товар добавлен в избранное.');
                setFavoriteId(response.data.favorite._id);
                setIsFavorite(true);
            }
        } catch (error) {
            console.error('Ошибка при добавлении/удалении в избранное:', error);
        }
    };


    const handleQuantityChange = async (item, newQuantity) => {
        if (newQuantity <= 0) {
            await handleRemoveFromCart(item._id); // Удаляем товар, если количество <= 0
            return;
        }

        const maxQuantity = selectedVariation.quantity; // Максимальное количество на складе
        if (newQuantity > maxQuantity) {
            setAddToCartError(`Максимальное количество для добавления: ${maxQuantity}`);
            return;
        }

        try {
            await axios.put(`http://localhost:8081/cart/${item._id}`, { quantity: newQuantity }, { withCredentials: true });
            fetchCartItems(); // Обновляем корзину
        } catch (error) {
            console.error('Ошибка при изменении количества товара в корзине:', error);
        }
    };

    const handleRemoveFromCart = async (itemId) => {
        try {
            await axios.delete(`http://localhost:8081/cart/${itemId}`, { withCredentials: true });
            fetchCartItems(); // Обновляем корзину
        } catch (error) {
            console.error('Ошибка при удалении товара из корзины:', error);
        }
    };



    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>{error}</div>;
    if (!product) return null;

    const { name, price, discount, description, status, images } = product;

    const convertColor = (color) => {
        const colorsMap = {
            Красный: 'red',
            Чёрный: 'black',
            Белый: 'white',
            Зелёный: 'green',
            Синий: 'blue',
            Желтый: 'yellow',
            // Добавить другие цвета по необходимости
            Золотой: '#ffd700',
            Серебрянный: '#c0c0c0',
        };
        return colorsMap[color] || 'transparent';
    };

    return (
        <div className="product-info">
            <h1 className="products-title">{name}</h1>

            {/* Блок цены */}
            <div className="prices-container">
                {selectedVariation ? (
                    <>
                        <span className="product-price-new">
                            {(
                                selectedVariation.price *
                                (1 - selectedVariation.discount / 100)
                            ).toFixed(2)}{' '}
                            руб.
                        </span>
                        {selectedVariation.discount > 0 && (
                            <span className="product-price-old">
                                {selectedVariation.price.toFixed(2)} руб.
                            </span>
                        )}
                    </>
                ) : (
                    <span className="product-price-new">Выберите вариацию</span>
                )}
            </div>
            {promotion && (
                <div className="promotion-info">
                    <h5 className="text-success">Акция: {promotion.name}</h5>
                    {promotion.discount_type === 'Процент' && (
                        <p>Скидка: {promotion.discount_value?.$numberDecimal}%</p>
                    )}
                    {promotion.discount_type === 'Фиксированная сумма' && (
                        <p>Скидка: -{promotion.discount_value?.$numberDecimal}₽</p>
                    )}
                    {promotion.gift_product_id && (
                        <p>Подарок: {promotion.gift_product_id.name}</p>
                    )}
                    {promotion.min_order_amount && (
                        <p>Минимальная сумма заказа: {promotion.min_order_amount?.$numberDecimal}₽</p>
                    )}
                    {promotion.max_discount && (
                        <p>Максимальная скидка: {promotion.max_discount?.$numberDecimal}₽</p>
                    )}
                </div>
            )}

            {/* Блок атрибутов */}
            {Object.keys(attributes).length > 0 && (
                <div className="attributes-container">
                    {Object.keys(attributes).map(attrName => (
                        <div key={attrName} className="attribute-group">
                            <span className="attribute-name">{attrName}:</span>
                            <div className="attribute-options">
                                {attributes[attrName].map((value, index) => {
                                    const bgColor = attrName === 'Цвет' ? convertColor(value) : undefined;
                                    return (
                                        <button
                                            key={index}
                                            className={`attribute-option ${selectedOptions[attrName] === value ? 'selected' : ''
                                                } ${attrName === 'Цвет' ? 'color-option' : ''}`}
                                            onClick={() => handleOptionChange(attrName, value, attributes)}
                                            style={bgColor ? { backgroundColor: bgColor } : {}}
                                        >
                                            {attrName !== 'Цвет' ? value : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Кнопки действий */}
            <div className="action-buttons-container">
                <button className="action-button action-button-outline" onClick={handleAddToFavorite}>
                    {isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                </button>

                {status === 'В наличие' && selectedVariation.status === 'В наличии' ? (
                    quantityInCart > 0 ? (
                        <div className="quantity-controls">
                            <button
                                className="quantity-button"
                                onClick={() => handleQuantityChange(cartItems.find(item => item.product_variations_id._id === selectedVariationId), quantityInCart - 1)}
                            >
                                <FaMinus />
                            </button>
                            <span className="quantity-display">{quantityInCart}</span>
                            <button
                                className="quantity-button"
                                onClick={() => handleQuantityChange(cartItems.find(item => item.product_variations_id._id === selectedVariationId), quantityInCart + 1)}
                            >
                                <FaPlus />
                            </button>
                        </div>
                    ) : (
                        <button className="action-button" onClick={handleAddToCart}>
                            Добавить в корзину
                        </button>
                    )
                ) : (
                    <button className="action-button disabled" disabled>
                        Товар закончился
                    </button>
                )}
            </div>



            {/* Ошибка добавления в корзину */}
            {addToCartError && <div className="error-message">{addToCartError}</div>}

            {/* Дополнительная информация */}
            <div className="additional-info">
                <div className="info-item">
                    <img src="http://localhost:8081/assets/icon/Delivery.png" alt="Доставка" />
                    <span>Доставка 1-2 дня</span>
                </div>
                <div className="info-item">
                    <img src="http://localhost:8081/assets/icon/Stock.png" alt="Наличие" />
                    <span>В наличии Сегодня</span>
                </div>
                <div className="info-item">
                    <img src="http://localhost:8081/assets/icon/Guaranteed.png" alt="Гарантия" />
                    <span>Гарантия 1 год</span>
                </div>
            </div>
            {/* Модальное окно */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Войдите или зарегистрируйтесь</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Для добавления товара в корзину или избранное, пожалуйста, войдите в аккаунт или зарегистрируйтесь.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Закрыть
                    </Button>
                    <Button variant="primary" onClick={() => (navigate('/login'))}>
                        Войти
                    </Button>
                    <Button variant="success" onClick={() => (navigate('/register'))}>
                        Зарегистрироваться
                    </Button>
                </Modal.Footer>
            </Modal>
        </div >
    );
};

export default ProductInfo;
