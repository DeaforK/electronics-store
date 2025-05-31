import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../Product/ProductCard';
import '../../style/ProductSection.css';
import Notification from "../Layout/Notification";

const ProductSaleSection = () => {
    const [products, setProducts] = useState([]);
    const [variations, setVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [filter, setFilter] = useState('new-arrivals');

    const [user, setUser] = useState(null);
    const [auth, setAuth] = useState(false);

    const [notification, setNotification] = useState({ message: "", type: "" });

    const navigate = useNavigate();

    const fetchUser = async () => {
        try {
            const response = await axios.get('http://localhost:8081', { withCredentials: true });
            setUser(response.data.data);
            setAuth(true);
        } catch (error) {
            console.error('Ошибка при проверке аутентификации:', error);
            setAuth(false);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const responseVariation = await axios.get(`http://localhost:8081/product-variations/active`, { withCredentials: true });
            const productsVariationData = responseVariation.data;
            console.log("productsVariationData:", productsVariationData)

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
            const productsData = uniqueProductsVariation.map(item => item.product_id);

            const productsArray = Array.isArray(productsData) ? productsData : [];
            const productsWithImages = productsArray.map(product => ({
                ...product,
                images: product.images && product.images.length > 0 ? `http://localhost:8081${product.images[0]}` : null,
                rating: parseFloat(product.rating?.$numberDecimal || 0),
                createdAt: new Date(product.createdAt)
            }));

            setProducts(productsWithImages);
            setError(null);
        } catch (error) {
            setError('Ошибка при загрузке товаров.');
            console.error('Ошибка при загрузке товаров:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        fetchProducts();
    }, []);

    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) return;
            try {
                const userId = user.userId;
                const response = await axios.get(`http://localhost:8081/favorites/${userId}`, { withCredentials: true });
                setFavorites(response.data);
                console.log("Favorites:", response.data);
            } catch (error) {
                console.error('Ошибка при загрузке избранного:', error);
            }
        };
        fetchFavorites();
    }, [user]);

    const toggleFavorite = async (product) => {
        if (!auth) {
            showNotification("Пожалуйста, войдите в аккаунт для добавления в избранное.", "danger");
            return;
        }

        const userId = user.userId;
        try {
            const isFavorite = favorites.some(fav => fav.products_id._id === product._id); // Сравниваем с _id продукта
            if (isFavorite) {
                const favorite = favorites.find(fav => fav.products_id._id === product._id);
                await axios.delete(`http://localhost:8081/favorites/${favorite._id}`, { withCredentials: true });
                setFavorites(favorites.filter(fav => fav._id !== favorite._id));
            } else {
                await axios.post(`http://localhost:8081/favorites`, { users_id: userId, products_id: product._id }, { withCredentials: true });
                const response = await axios.get(`http://localhost:8081/favorites/${userId}`, { withCredentials: true });
                setFavorites(response.data);
            }
        } catch (error) {
            console.error('Ошибка при добавлении/удалении товара в избранное:', error);
        }
    };


    const handleProductClick = (productId) => {
        navigate(`/products/${productId}`);
    };

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
    };

    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    };

    const getFilteredProducts = () => {
        const base = variations.filter(variation =>
            products.some(product => product._id === variation.product_id._id)
        );

        if (filter === 'new-arrivals') {
            return base
                .sort((a, b) => new Date(b.product_id.createdAt) - new Date(a.product_id.createdAt))
                .slice(0, 4);
        }

        if (filter === 'bestsellers') {
            return base
                .sort((a, b) => b.product_id.rating - a.product_id.rating)
                .slice(0, 4);
        }

        return base.slice(0, 4); // для "all"
    };


    const filteredProducts = getFilteredProducts();

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>{error}</div>;

    return (
        <section className="product-section">
            <ul className="nav nav-underline mb-4" id="myTab" role="tablist">
                <li className="nav-item" role="presentation">
                    <button className={`nav-link text-black ${filter === 'new-arrivals' ? 'active' : ''}`} onClick={() => handleFilterChange('new-arrivals')}>
                        Новые поступления
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button className={`nav-link text-black ${filter === 'bestsellers' ? 'active' : ''}`} onClick={() => handleFilterChange('bestsellers')}>
                        Бестселлеры
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button className={`nav-link text-black ${filter === 'all' ? 'active' : ''}`} onClick={() => handleFilterChange('all')}>
                        Все продукты
                    </button>
                </li>
            </ul>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
                {filteredProducts.length === 0 ? (
                    <div className="col-12">
                        <p>Нет доступных товаров</p>
                    </div>
                ) : (
                    filteredProducts.map(variation => (
                        <ProductCard
                            key={variation.product_id._id}
                            image={products.find(product => product._id === variation.product_id._id)?.images}
                            status={variation.product_id.status}
                            title={variation.product_id.name}
                            originalPrice={`${variation.price} руб.`}
                            discountedPrice={`${(variation.price * (1 - variation.discount / 100)).toFixed(2)} руб.`}
                            discount={variation.discount > 0 ? variation.discount : null}
                            onFavoriteClick={() => toggleFavorite(variation.product_id)}
                            onClick={() => handleProductClick(variation.product_id._id)}
                            is_on_sale={variation.product_id.is_on_sale}
                            isFavorite={favorites.some(fav => fav.products_id._id === variation.product_id._id)}
                        />
                    ))
                )}
                {notification.message && (
                    <Notification message={notification.message} type={notification.type} />
                )}
            </div>
        </section>
    );
};

export default ProductSaleSection;
