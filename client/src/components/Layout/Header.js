import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../style/Header.css'; // Убедитесь, что пути к стилям верны
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaRegHeart, FaShoppingCart, FaUser, FaSearch } from 'react-icons/fa';

const Header = () => {
    const [auth, setAuth] = useState(false);
    const [message, setMessage] = useState('');
    const [role, setRole] = useState('');
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081/', { withCredentials: true }); // Проверка аутентификации
                if (res.data.message === "Успех") {
                    setAuth(true);
                    setRole(res.data.data.role);
                } else {
                    setAuth(false);
                    setMessage(res.data.error);
                }
            } catch (error) {
                console.error(error);
                setAuth(false);
                setMessage('Произошла ошибка при проверке аутентификации.');
            }
        };

        const fetchCategories = async () => {
            try {
                const res = await axios.get('http://localhost:8081/categories/active', { withCredentials: true });// Запрос на отображение активных категорий
                const filteredCategories = res.data
                    .filter(category => category.categories_id === null)
                setCategories(filteredCategories);
            } catch (error) {
                console.error('Ошибка при загрузке категорий:', error);
            }
        };

        checkAuth();
        fetchCategories();
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchTerm.trim()) {
                try {
                    const res = await axios.get(`http://localhost:8081/search?q=${encodeURIComponent(searchTerm)}`, {
                        withCredentials: true
                    });
                    setSearchResults(res.data);
                } catch (err) {
                    console.error('Ошибка поиска:', err);
                    setSearchResults([]);
                }
            } else {
                setSearchResults([]);
            }
        }, 300); // debounce

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);


    const handleUserClick = () => {
        if (role === 'admin') {
            navigate('/admin');
        } else if (role === 'courier') {
            navigate('/courier'); // Здесь может быть маршрут для курьеров
        } else if (role === 'seller') {
            navigate('/seller'); // Здесь может быть маршрут для курьеров
        } else if (auth) {
            navigate('/profile');
        } else {
            navigate('/login');
        }
    };

    const handleBasketClick = () => {
        navigate('/cart');
    };

    return (
        <header className="site-header">
            <HeaderTop
                auth={auth}
                role={role}
                onUserClick={handleUserClick}
                onBasketClick={handleBasketClick}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                navigate={navigate}
            />
            <HeaderNav categories={categories} />
        </header>
    );
};

const HeaderTop = ({
    auth, role, onUserClick, onBasketClick,
    searchTerm, setSearchTerm,
    searchResults, setSearchResults,
    navigate
}) => (
    <div className="header-top">
        <nav className="navbar navbar-expand-lg navbar-white">
            <div className="container-fluid">
                <div className="d-flex align-items-center w-100">
                    <Link className="navbar-brand text-white" to="/">
                        <img src="http://localhost:8081/assets/icon/Logo_black.png" alt="Logo" />
                    </Link>

                    <div className="search-input mx-auto">
                        <span className="icon">
                            <FaSearch size={20} />
                        </span>
                        <div className="search-input mx-auto position-relative">
                            {/* <span className="icon"><FaSearch size={20} /></span> */}
                            <input
                                type="text"
                                placeholder="Поиск"
                                aria-label="Поиск"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <ul className="search-dropdown">
                                    {searchResults.map((item, idx) => (
                                        <li key={idx} onClick={() => {
                                            if (item.type === 'product') navigate(`/products/${item._id}`);
                                            if (item.type === 'category') navigate(`/catalog/${item._id}`);
                                            if (item.type === 'promotion') navigate(`/catalog/promotion/${item._id}`);
                                            setSearchTerm('');
                                            setSearchResults([]);
                                        }}>
                                            <strong>{item.name}</strong><span className="badge bg-secondary ms-2">
                                                {item.type === 'product'
                                                    ? 'Товар'
                                                    : item.type === 'category'
                                                        ? 'Категория'
                                                        : item.type === 'promotion'
                                                            ? 'Акция'
                                                            : 'Неизвестно'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <ul className="navbar-nav me-auto d-flex align-items-center">
                        <li className="nav-item">
                            <Link className="nav-link active" to="/">Главная</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/catalog">Каталог</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/promotions">Акции</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/contact">Контакт</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/about">О нас</Link>
                        </li>
                    </ul>

                    <ul className="navbar-nav ms-auto d-flex align-items-center">
                        <li className="nav-item">
                            <Link className="nav-link nav-icon" to="/favorite">
                                <FaRegHeart size={24} />
                                <span className="d-inline d-md-none">Избранное</span>
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link nav-icon" to="/cart">
                                <FaShoppingCart size={24} />
                                <span className="d-inline d-md-none">Корзина</span>
                            </Link>
                        </li>
                        <li className="nav-item">
                            <button className="nav-link nav-icon" onClick={onUserClick}>
                                <FaUser size={24} />
                                <span className="d-inline d-md-none">Личный кабинет</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    </div>
);

const HeaderNav = ({ categories }) => (
    <nav className="header-nav">
        <ul>
            {categories.map((category, index) => (
                <li key={category._id || index}> {/* Используем category.id или fallback на index */}
                    <Link to={`/catalog/${category._id}`}>
                        <img src={`http://localhost:8081${category.icon_white}`} alt={category.name} />
                        <span>{category.name}</span>
                    </Link>
                </li>
            ))}
        </ul>
    </nav>
);

export default Header;
