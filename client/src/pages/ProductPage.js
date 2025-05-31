import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Reviews from '../components/Product/Reviews';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import ProductImages from '../components/Product/ProductImages';
import ProductInfo from '../components/Product/ProductInfo';
import '../style/ProductPage.css';
import ProductDetails from '../components/Product/ProductDetails';

function ProductPage() {
    const { id } = useParams(); // Получение product_id из URL
    const [product, setProduct] = useState(null);
    const [variations, setVariations] = useState([]); // Состояние для хранения вариаций
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0); // Состояние для хранения среднего рейтинга
    const [userId, setUserId] = useState(null); // Состояние для хранения userId

    // Функция для получения userId после проверки аутентификации
    const fetchUserId = async () => {
        try {
            const response = await axios.get('http://localhost:8081', { withCredentials: true });
            setUserId(response.data._id); // Сохранение userId в состоянии
        } catch (error) {
            console.error('Ошибка при проверке аутентификации:', error);
        }
    };

    useEffect(() => {
        fetchUserId(); // Получаем userId при монтировании компонента
    }, []);

    return (
        <>
        <Header />
        <Breadcrumbs />
        <div className="container product-page">
            <div className="row">
                {/* Product Images */}
                <div className="col-md-6">
                    <ProductImages />
                </div>

                {/* Product Info */}
                <div className="col-md-6">
                    <ProductInfo />
                </div>
            </div>
        </div>
        <ProductDetails />
        <Reviews />
        <Footer />
        </>
    );
}

export default ProductPage;
