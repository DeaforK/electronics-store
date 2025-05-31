import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import ProductCard from './Product/ProductCard';
import '../style/ProductSection.css'; // Используем тот же CSS

function FavoriteMain() {
    const [favorites, setFavorites] = useState([]);
    const [Fav, setFav] = useState([]);
    const [variations, setVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const [auth, setAuth] = useState(false);
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState(null);

    // Проверка аутентификации пользователя
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081/', { withCredentials: true });
                if (res.data.message === "Успех") {
                    setAuth(true);
                    setUserId(res.data.data.userId);
                } else {
                    setAuth(false);
                    setMessage('Пожалуйста, войдите или зарегистрируйтесь для просмотра избранного.');
                }
            } catch (error) {
                setAuth(false);
                setMessage('Произошла ошибка при проверке аутентификации.');
            }
        };

        checkAuth();
    }, []);

    // Загрузка избранных товаров, если пользователь авторизован
    useEffect(() => {
        if (auth && userId) {
            const fetchFavorites = async () => {
                setLoading(true);
                try {
                    // Загружаем список избранных товаров
                    const response = await axios.get(`http://localhost:8081/favorites/${userId}`, { withCredentials: true });
                    const favoriteItems = response.data || [];

                    // Получаем только ID продуктов
                    const productIds = favoriteItems.map(fav => fav.products_id._id);

                    // Загружаем товары с фильтрацией по ID
                    const productsResponse = await axios.get(`http://localhost:8081/products/active/search`, {
                        params: {
                            // productIds: productIds.join(','),
                            limit: 1000, // гарантируем, что все подгрузятся
                        },
                        withCredentials: true
                    });
                    console.log("productsResponse.data: ", productsResponse.data)
                    // после получения всех variations
                    const variations = productsResponse.data.variations || [];

                    const filteredVariations = variations.filter(v =>
                        productIds.includes(v.product?._id)
                    );
                    // Группируем вариации по product._id
                    const grouped = {};
                    filteredVariations.forEach(variation => {
                        const product = variation.product;
                        const productId = product._id;

                        if (!grouped[productId]) {
                            grouped[productId] = {
                                ...product,
                                variations: [],
                                applicable_promotions: variation.applicable_promotions || [],
                            };
                        }

                        grouped[productId].variations.push({
                            ...variation,
                            price: variation.price?.$numberDecimal || '0',
                            discount: variation.discount?.$numberDecimal || '0',
                        });
                    });

                    // Преобразуем в массив
                    const productsWithVariations = Object.values(grouped).map(product => {
                        // Определяем превью изображение
                        product.images = product.images?.length
                            ? `http://localhost:8081${product.images[0]}`
                            : null;
                        return product;
                    });

                    // Сопоставляем избранные товары
                    setFav(favoriteItems);
                    setFavorites(productsWithVariations);
                } catch (error) {
                    setError('Ошибка при загрузке избранных товаров.');
                    console.error('Ошибка при загрузке избранных товаров:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchFavorites();
        }
    }, [auth, userId]);

    const refreshFavorites = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:8081/favorites/${userId}`, { withCredentials: true });
            const favoriteItems = response.data || [];


            // Преобразуем данные товаров перед установкой в состояние
            const transformedFavorites = favoriteItems.map(fav => {
                const productData = fav.products_id;

                // Обрабатываем изображение товара
                productData.images = productData.images && productData.images.length > 0
                    ? `http://localhost:8081${productData.images[0]}`
                    : null;

                return fav;  // Возвращаем обновленный элемент избранного
            });
            const responseVariation = await axios.get(`http://localhost:8081/product-variations/active`, { withCredentials: true });
            const productsVariationData = responseVariation.data;

            const uniqueProductsVariation = Object.values(
                productsVariationData.reduce((acc, item) => {
                    if (!acc[item.product_id._id]) {
                        acc[item.product_id._id] = item;
                    }
                    return acc;
                }, {})
            );
            const variation = uniqueProductsVariation.map(product => ({
                ...product,
                price: product.price.$numberDecimal,
                discount: product.discount.$numberDecimal,
            }));

            setVariations(variation);

            const favorites = transformedFavorites.map(fav => fav.products_id)
            console.log(favorites)
            setFavorites(favorites);
        } catch (error) {
            setError('Ошибка при загрузке избранных товаров.');
            console.error('Ошибка при загрузке избранных товаров:', error);
        } finally {
            setLoading(false);
        }
    };

    // Функция для удаления товара из избранного
    const toggleFavorite = async (product) => {
        try {
            const favorite_id = Fav.find(fav => fav.products_id === product)
            // Удаляем запись избранного с указанным _id
            await axios.delete(`http://localhost:8081/favorites/${favorite_id._id}`, { withCredentials: true });
            refreshFavorites();
        } catch (error) {
            console.error('Ошибка при удалении товара из избранного:', error);
        }
    };


    // Обработчик клика по товару
    const handleProductClick = (productId) => {
        navigate(`/products/${productId}`);
    };

    // Отображение при загрузке или ошибке
    if (loading) return <Spinner animation="border" role="status"><span className="visually-hidden">Загрузка...</span></Spinner>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <section className="product-section">
            <h1>Избранные товары</h1>
            {!auth ? (
                <div>
                    <Alert variant="warning">{message}</Alert>
                    <Button variant="primary" onClick={() => navigate('/login')}>Войти</Button>
                    <Button variant="secondary" onClick={() => navigate('/register')}>Зарегистрироваться</Button>
                </div>
            ) : (
                <Container className="product-section mt-4">
                    {loading ? (
                        <div className="text-center">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : !favorites.length ? (
                        <Alert variant="info">Нет избранных товаров</Alert>
                    ) : (
                        <div className="row g-3">
                            {favorites.map((product) => {
                                const { _id, name, images, variations = [], applicable_promotions = [] } = product;

                                const prices = variations.map(v => parseFloat(v.price || 0));
                                const discounts = variations.map(v => parseFloat(v.discount || 0));

                                const minPrice = Math.min(...prices);
                                const maxDiscount = Math.max(...discounts, 0);
                                const finalPrice = maxDiscount ? (minPrice * (1 - maxDiscount / 100)).toFixed(2) : minPrice.toFixed(2);

                                // Проверка наличия акции
                                const promo = applicable_promotions?.[0] || null;

                                return (
                                    <ProductCard
                                        key={_id}
                                        image={images}
                                        title={name}
                                        status={product.status}
                                        originalPrice={`${minPrice.toFixed(2)} руб.`}
                                        discountedPrice={`${finalPrice} руб.`}
                                        discount={maxDiscount || null}
                                        onClick={() => navigate(`/products/${_id}`)}
                                        is_on_sale={product.is_on_sale}
                                        promotion={product.is_on_sale ? promo : null}
                                        onFavoriteClick={async () => {
                                            try {
                                                const favItem = Fav.find(fav => fav.products_id._id === _id);
                                                if (favItem) {
                                                    await axios.delete(`http://localhost:8081/favorites/${favItem._id}`, { withCredentials: true });

                                                    // Удаляем товар из состояния
                                                    setFav(prev => prev.filter(f => f._id !== favItem._id));
                                                    setFavorites(prev => prev.filter(p => p._id !== _id));

                                                }
                                            } catch (error) {
                                                console.error("Ошибка при удалении из избранного", error);
                                            }
                                        }}
                                        isFavorite={true}
                                    />
                                );
                            })}
                        </div>
                    )}
                </Container>
            )}
        </section>
    );
}

export default FavoriteMain;
