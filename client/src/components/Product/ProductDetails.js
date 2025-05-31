import React, { useState, useEffect } from 'react';
import '../../style/ProductPage.css'; // Подключаем стили
import { CSSTransition } from 'react-transition-group';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const ProductDetails = () => {
    const { id } = useParams(); // Получаем ID продукта из параметров URL
    const [product, setProduct] = useState(null);
    const [showDetails, setShowDetails] = useState(false); // Начальное состояние скрыто
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProductInfo = async () => {
            if (id) {
                try {
                    // Запрос для получения информации о продукте
                    const productResponse = await axios.get(`http://localhost:8081/products/${id}`);
                    const productData = productResponse.data;
                    // console.log("Ответ от API:", productData); // Вывод всего ответа в консоль для отладки
                    setProduct(productData);
                } catch (error) {
                    setError('Ошибка при загрузке информации о продукте.');
                    console.error('Ошибка при загрузке информации о продукте:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchProductInfo();
    }, [id]);

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>{error}</div>;
    if (!product) return null; // Если данные еще не загружены

    // Извлечение описания и характеристик из данных продукта
    const description = product.description || ''; // Описание продукта
    const specs = product.attributes ? Object.entries(product.attributes) : []; // Преобразуем объект атрибутов в массив пар [ключ, значение]

    // console.log("Описание продукта:", description); // Отладка описания
    // console.log("Характеристики продукта:", specs); // Отладка массива характеристик

    return (
        <div className="container product-details">
            <h2>Описание</h2>

            <div
                className="product-details-text"
                dangerouslySetInnerHTML={{ __html: description }}
            />

            {/* Показываем таблицу характеристик, только если они есть */}
            {specs.length > 0 && (
                <>
                    <CSSTransition
                        in={showDetails}
                        timeout={300}
                        classNames="details"
                        unmountOnExit
                    >
                        <div className="details-content mt-4">
                            <h4 className="mb-3 fw-semibold">Характеристики</h4>
                            {specs.map(([section, attributes], index) => (
                                <div key={index} className="mb-3">
                                    <h6 className="fw-bold border-bottom pb-1 mb-2 text-body">{section}</h6>
                                    <div className="d-flex flex-column gap-2">
                                        {Object.entries(attributes).map(([key, value], i) => (
                                            <div key={i} className="d-flex justify-content-between border p-2 rounded small bg-white">
                                                <span className="text-secondary">{key}</span>
                                                <span className="text-dark">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CSSTransition>

                    <div
                        className={`btn-show-more ${showDetails ? 'open' : 'closed'}`}
                        onClick={() => setShowDetails(prev => !prev)}
                        style={{ cursor: "pointer", color: "#000", marginTop: "1rem", fontSize: "0.95rem" }}
                    >
                        {showDetails ? 'Скрыть характеристики' : 'Показать характеристики'}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 6 }}>
                            <path d="M3 6L8 11L13 6H3Z" fill="currentColor" />
                        </svg>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductDetails;
