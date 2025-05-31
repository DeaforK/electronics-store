import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListGroup, Spinner, Alert, Button, Form, Row, Col, Modal, Image, Table } from 'react-bootstrap';
import '../../style/ProductsPage.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import Footer from '../../components/Layout/Footer';
import Header from '../../components/Layout/Header';
import Notification from '../../components/Layout/Notification'; // Импортируйте компонент Notification
import Pagination from '../../components/Layout/Pagination';

function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [archivedProducts, setArchivedProducts] = useState([]);
    const [productVariations, setProductVariations] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [filtersApplied, setFiltersApplied] = useState(false); // Отслеживает, были ли применены фильтры
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);
    const [activeCategories, setActiveCategories] = useState([]);
    const [filter, setFilter] = useState({
        category: '',
        minPrice: 0,
        maxPrice: null,
        discountRange: '',
        ratingRange: '',
        searchName: '' // добавлено
    });
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState({
        name: '',
        description: '',
        // price: '',
        // discount: '',
        category: '',
        images: [],
        imagesToDelete: [],
        attributes: []
    });
    const [showArchived, setShowArchived] = useState(false);
    const [message, setMessage] = useState('');

    const [previewImages, setPreviewImages] = useState([]);

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('http://localhost:8081/products/active', { withCredentials: true });
                console.log("Активные товары:", response.data)
                setProducts(response.data);
                setFilteredProducts(response.data);
            } catch (error) {
                setError('Ошибка при загрузке товаров. Попробуйте позже.');
            } finally {
                setLoading(false);
            }
        };

        const fetchArchivedProducts = async () => {
            try {
                const response = await axios.get('http://localhost:8081/products/archived', { withCredentials: true });
                console.log("Архивные товары:", response.data)
                setArchivedProducts(response.data);
            } catch (error) {
                console.error('Ошибка при загрузке архивных товаров:', error);
            }
        };

        const fetchCategories = async () => {
            try {
                const response = await axios.get('http://localhost:8081/categories', { withCredentials: true });
                setCategories(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Ошибка при загрузке категорий:', error);
            }
        };
        const fetchActiveCategories = async () => {
            try {
                const response = await axios.get('http://localhost:8081/categories/active', { withCredentials: true });
                setActiveCategories(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Ошибка при загрузке активных категорий:', error);
            }
        };

        const fetchProductVariations = async () => {
            try {
                const response = await axios.get('http://localhost:8081/product-variations', { withCredentials: true });
                console.log(response.data)
                setProductVariations(response.data);
            } catch (error) {
                console.error('Ошибка при загрузке вариаций товаров:', error);
            }
        };

        fetchProducts();
        fetchArchivedProducts();
        fetchCategories();
        fetchProductVariations();
        fetchActiveCategories();
    }, []);

    useEffect(() => {
        return () => {
            // Освобождаем все URL для избежания утечек памяти
            previewImages.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [showArchived, products, filter, previewImages]);

    // Функция для сброса уведомления
    const resetMessage = () => {
        setMessage('');
        setError(null);
    };

    const toggleShowArchived = () => {
        setShowArchived(prevShowArchived => !prevShowArchived);
    };

    // Функция для применения и сброса фильтров
    const toggleFilters = () => {
        if (filtersApplied) {
            // Сброс фильтров
            setFilteredProducts(products);
            setFiltersApplied(false);
        } else {
            // Применение фильтров
            const currentProducts = products;
            let filtered = currentProducts;

            // Фильтрация по категории
            if (filter.category) {
                filtered = filtered.filter(product => product.categories_id?.toString() === filter.category);
            }

            // Фильтрация по диапазону цен
            if (filter.minPrice !== null && filter.maxPrice !== null) {
                filtered = filtered.filter(product => {
                    const variations = productVariations.filter(variation => variation.product_id._id === product._id);
                    const minVariationPrice = Math.min(...variations.map(v => parseFloat(v.price?.$numberDecimal || v.price || 0)));
                    return minVariationPrice >= filter.minPrice && minVariationPrice <= filter.maxPrice;
                });
            }

            // Фильтрация по диапазону скидок
            if (filter.discountRange) {
                const [minDiscount, maxDiscount] = filter.discountRange.split('-').map(Number);
                filtered = filtered.filter(product => {
                    const variations = productVariations.filter(variation => variation.product_id._id === product._id);
                    const maxVariationDiscount = Math.max(...variations.map(v => parseFloat(v.discount?.$numberDecimal || v.discount || 0)));
                    return maxDiscount !== undefined
                        ? maxVariationDiscount >= minDiscount && maxVariationDiscount <= maxDiscount
                        : maxVariationDiscount >= minDiscount;
                });
            }

            // Фильтрация по диапазону рейтингов
            if (filter.ratingRange) {
                const [minRating, maxRating] = filter.ratingRange.split('-').map(Number);
                filtered = filtered.filter(product => {
                    const rating = parseFloat(product.rating?.$numberDecimal || product.rating || 0);
                    return maxRating !== undefined ? (rating >= minRating && rating <= maxRating) : rating >= minRating;
                });
            }
            setCurrentPage(1);
            setFilteredProducts(filtered);
            setFiltersApplied(true);
        }
    };
    // Обработчики изменений фильтров
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter({ ...filter, [name]: value });

        // Если обновляется поле поиска — сразу фильтруем
        if (name === 'searchName') {
            const searchValue = value.toLowerCase();
            const currentProducts = showArchived ? archivedProducts : products;

            const filtered = currentProducts.filter(product =>
                product.name.toLowerCase().includes(searchValue)
            );

            setFilteredProducts(filtered);
            setFiltersApplied(true);
            setCurrentPage(1);
        }
    };

    const handlePriceChange = (e) => {
        const { name, value } = e.target;
        setFilter({ ...filter, [name]: Number(value) });
    };


    const handleShowProductModal = (product) => {
        if (product != null) {
            setSelectedProduct({
                ...product,
                category: product.categories_id // Передача значения categories_id в поле category
            });
        }

        // Добавляем базовый URL к уже загруженным изображениям
        const existingImageUrls = (product?.images || []).map((imgPath) => `http://localhost:8081${imgPath}`);
        setPreviewImages(existingImageUrls);

        setShowProductModal(true);
    };


    const handleCloseProductModal = () => {
        setSelectedProduct(null);
        setShowProductModal(false);
    };

    const refreshProducts = async () => {
        try {
            const activeResponse = await axios.get('http://localhost:8081/products/active', { withCredentials: true });
            const archivedResponse = await axios.get('http://localhost:8081/products/archived', { withCredentials: true });
            setProducts(activeResponse.data);
            setArchivedProducts(archivedResponse.data);
        } catch (error) {
            setError('Ошибка при обновлении категорий.');
        }
    };

    const handleSaveProduct = async () => {
        try {
            const formData = new FormData();
            formData.append('name', selectedProduct.name);
            formData.append('description', selectedProduct.description);

            // // Добавляем цену (в редактировании $numberDecimal, в добавлении обычное значение)
            // const priceValue = selectedProduct?.price?.$numberDecimal || selectedProduct?.price;
            // if (priceValue) {
            //     formData.append('price', priceValue);
            // }

            // // Добавляем скидку (в редактировании $numberDecimal, в добавлении обычное значение)
            // const discountValue = selectedProduct?.discount?.$numberDecimal || selectedProduct?.discount;
            // if (discountValue) {
            //     formData.append('discount', discountValue);
            // }

            formData.append('categories_id', selectedProduct.category);
            formData.append('attributes', JSON.stringify(selectedProduct.attributes));

            // Добавляем новые изображения
            if (selectedProduct.images) {
                Array.from(selectedProduct.images).forEach((image) => {
                    formData.append('images', image);
                });
            }

            // Добавляем изображения для удаления
            if (selectedProduct.imagesToDelete) {
                formData.append('imagesToDelete', JSON.stringify(selectedProduct.imagesToDelete));
            }

            if (selectedProduct._id) {
                // Обновление товара по ID
                await axios.put(`http://localhost:8081/products/${selectedProduct._id}`, formData, { withCredentials: true });
                await refreshProducts(); // Обновление списка товаров после сохранения
            } else {
                // Добавление нового товара
                const response = await axios.post('http://localhost:8081/products', formData, { withCredentials: true });
                setProducts([...products, response.data]);
            }

            handleCloseProductModal(); // Закрытие модального окна
        } catch (error) {
            console.log(error);
            setError('Ошибка при сохранении товара. Попробуйте позже.');
        }
    };


    const handleRemoveImage = (src, index) => {
        setPreviewImages((prevImages) => prevImages.filter((_, i) => i !== index));

        // Если удаляемое изображение уже существует на сервере, добавляем его в imagesToDelete
        const imagePath = src.replace('http://localhost:8081', ''); // Преобразуем URL в путь на сервере
        setSelectedProduct((prevProduct) => ({
            ...prevProduct,
            imagesToDelete: [...(prevProduct.imagesToDelete || []), imagePath],
        }));
    };

    const handleImageChange = (e) => {
        const files = e.target.files;
        setSelectedProduct((prevProduct) => ({
            ...prevProduct,
            images: files
        }));

        // Добавляем новые изображения для предварительного просмотра
        const newImageUrls = Array.from(files).map((file) => URL.createObjectURL(file));
        setPreviewImages((prevImages) => [...prevImages, ...newImageUrls]);
    };

    const handleDeleteProduct = async (productId) => {
        // Логика удаления товара (Перемещения в архив)
        try {
            await axios.delete(`http://localhost:8081/products/${productId}`, { withCredentials: true });
            setMessage('Товар добавлен в архив');
            await refreshProducts();
        } catch {
            setError('Ошибка при выполнении действия.');
        } finally {
            // Очистить сообщение через 3 секунды
            setTimeout(() => {
                setMessage('');
                setError(null);
            }, 3000);
        }
    };

    const handleRestoreProduct = async (product) => {
        if (product.status === "В Архиве из-за Категории") {
            // Открыть модальное окно для выбора новой категории
            setSelectedProduct(product);
            setShowCategoryModal(true);
        } else {
            // Восстановление из архива без изменения категории
            try {
                console.log(product)
                await axios.put(`http://localhost:8081/products/restore/${product._id}`, { withCredentials: true });
                setMessage('Товар восстановлен из архива');
                await refreshProducts();
            } catch {
                setError('Ошибка при выполнении действия.');
            } finally {
                // applyFilters();
                setTimeout(() => {
                    setMessage('');
                    setError(null);
                }, 3000);
            }
        }
    };

    const handleCategoryChange = (event) => {
        setSelectedCategory(event.target.value);
    };

    const handleSaveCategory = async () => {
        if (!selectedCategory) return; // Проверка на выбор категории

        try {
            // Отправка запроса на восстановление товара с новой категорией
            await axios.put(
                `http://localhost:8081/products/restore-product/${selectedProduct._id}`,
                { category_id: selectedCategory },
                { withCredentials: true }
            );

            setMessage('Категория обновлена, товар восстановлен.');
            await refreshProducts();
            setShowCategoryModal(false);
        } catch (error) {
            setError('Ошибка при обновлении категории.');
        } finally {
            // applyFilters();
            setTimeout(() => {
                setMessage('');
                setError(null);
            }, 3000);
        }
    };

    // Модальное окно для выбора категории
    const CategoryModal = () => (
        <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>Выбор новой категории</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group>
                        <Form.Label>Выберите категорию:</Form.Label>
                        <Form.Select value={selectedCategory} onChange={handleCategoryChange}>
                            <option value="">Выберите категорию</option>
                            {activeCategories.map(category => (
                                <option key={category._id} value={category._id}>
                                    {category.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
                    Отмена
                </Button>
                <Button variant="primary" onClick={handleSaveCategory}>
                    Сохранить
                </Button>
            </Modal.Footer>
        </Modal>
    );

    const categoryMap = categories.reduce((map, category) => {
        map[category._id] = category.name;
        return map;
    }, {});

    // Рендеринг вариаций с ценой и скидкой
    const renderProductVariations = (productId) => {
        const variations = productVariations.filter(variation => variation.product_id._id === productId);
        if (variations.length === 0) {
            return <p>Вариации отсутствуют</p>;
        }

        return (
            <Table responsive bordered className="table-sm text-center align-middle" style={{ fontSize: '0.9rem' }}>
                <thead className="table-light">
                    <tr>
                        <th style={{ width: "40%" }}>Атрибуты</th>
                        <th>Цена</th>
                        <th>Скидка</th>
                        <th>Количество</th>
                    </tr>
                </thead>
                <tbody>
                    {variations.map(variation => (
                        <tr key={variation._id}>
                            <td>
                                {variation.attributes && typeof variation.attributes === 'object'
                                    ? Object.entries(variation.attributes).map(([key, value], index) => (
                                        <div key={index}>
                                            <strong>{key}</strong>: {value}
                                        </div>
                                    ))
                                    : <em>Нет атрибутов</em>}
                            </td>
                            <td>{parseFloat(variation.price?.$numberDecimal || variation.price || 0).toFixed(2)} ₽</td>
                            <td>{parseFloat(variation.discount?.$numberDecimal || variation.discount || 0).toFixed(2)}%</td>
                            <td>{variation.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        );
    };
    const currentProducts = filtersApplied
        ? filteredProducts
        : showArchived
            ? archivedProducts
            : products;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = currentProducts.slice(startIndex, endIndex);


    // Рендеринг товаров
    const renderProducts = () => {
        const currentProducts = filtersApplied
            ? filteredProducts
            : showArchived
                ? archivedProducts
                : products;

        if (!currentProducts || currentProducts.length === 0) {
            return (
                <ListGroup.Item className="text-center">
                    {filtersApplied ? 'Нет товаров, соответствующих фильтрам' : 'Товары отсутствуют'}
                </ListGroup.Item>
            );
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = currentProducts.slice(startIndex, endIndex);

        return paginatedProducts.map((product) => (
            <ListGroup.Item key={product._id} className="d-flex justify-content-between align-items-center">
                <div>
                    <h5>{product.name}</h5>
                    <p>Категория: {categoryMap[product.categories_id] || 'Неизвестная категория'}</p>
                    <p>Статус: {product.status}</p>
                    {product.is_on_sale ? (<p>Участвует в акции</p>) : (<></>)}
                    <p>Вариации:</p>
                    <p style={{ width: "140%" }}>{renderProductVariations(product._id)}</p>
                </div>
                <div>
                    <Button variant="warning" className="me-2" onClick={() => navigate(`/admin/products/${product._id}`)}>
                        Редактировать
                    </Button>
                    <Button variant="success" className="me-2" onClick={() => navigate(`/admin/products/variations/${product._id}`)}>
                        Управлять вариациями
                    </Button>
                    {showArchived ? (
                        <Button variant="info" className="me-2" onClick={() => handleRestoreProduct(product)}>
                            Восстановить
                        </Button>
                    ) : (
                        <Button variant="danger" className="me-2" onClick={() => handleDeleteProduct(product._id)}>
                            Архивировать
                        </Button>
                    )}
                </div>
            </ListGroup.Item>
        ))
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    return (
        <>
            <Header />
            <div className='p-5'>
                <Button variant="link" onClick={() => navigate('/admin')} className="me-3">
                    <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                </Button>
                <h1>Товары</h1>
                {error && <Alert variant="danger">{error}</Alert>}
                {message && (
                    <Notification message={message} onDismiss={resetMessage} />
                )}

                {/* Кнопки "Добавить товар" и "Показать архивные товары" */}
                <div className="d-flex gap-3 mb-4">
                    <Button variant="success" onClick={() => navigate('/admin/products/new')}>
                        Добавить товар
                    </Button>
                    <Button variant="info" onClick={toggleShowArchived}>
                        {showArchived ? 'Показать активные товары' : 'Показать архивные товары'}
                    </Button>
                </div>

                {/* Контейнер фильтров */}
                <Form>
                    <Row className="mb-4">
                        <Col xs={12} sm={6} md={4} lg={3}>
                            <Form.Group controlId="filterCategory">
                                <Form.Label>Категория</Form.Label>
                                <Form.Select name="category" value={filter.category} onChange={handleFilterChange}>
                                    <option value="">Все категории</option>
                                    {categories.map((category) => (
                                        <option key={category._id} value={category._id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col xs={12} sm={6} md={4} lg={3}>
                            <Form.Group controlId="filterPrice">
                                <Form.Label>Цена</Form.Label>
                                <div className="range-values d-flex gap-2">
                                    <Form.Control
                                        type="number"
                                        name="minPrice"
                                        placeholder="От"
                                        min="0"
                                        max="20000000000"
                                        value={filter.minPrice}
                                        onChange={handlePriceChange}
                                    />
                                    <Form.Control
                                        type="number"
                                        name="maxPrice"
                                        placeholder="До"
                                        min="0"
                                        max="20000000000"
                                        value={filter.maxPrice}
                                        onChange={handlePriceChange}
                                    />
                                </div>
                            </Form.Group>
                        </Col>
                        <Col xs={12} sm={6} md={4} lg={3}>
                            <Form.Group controlId="filterDiscountRange">
                                <Form.Label>Скидка</Form.Label>
                                <Form.Select name="discountRange" value={filter.discountRange} onChange={handleFilterChange}>
                                    <option value="">Любая</option>
                                    <option value="0-10">До 10%</option>
                                    <option value="10-20">10% - 20%</option>
                                    <option value="20-50">20% - 50%</option>
                                    <option value="50-100">Более 50%</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col xs={12} sm={6} md={4} lg={3}>
                            <Form.Group controlId="filterRatingRange">
                                <Form.Label>Рейтинг</Form.Label>
                                <Form.Select name="ratingRange" value={filter.ratingRange} onChange={handleFilterChange}>
                                    <option value="">Любой</option>
                                    <option value="0-1">0 - 1</option>
                                    <option value="1-2">1 - 2</option>
                                    <option value="2-3">2 - 3</option>
                                    <option value="3-4">3 - 4</option>
                                    <option value="4-5">4 - 5</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col xs={12} className="text-center mt-3">
                            <Button variant={filtersApplied ? "danger" : "primary"} onClick={toggleFilters}>
                                {filtersApplied ? "Сбросить фильтры" : "Применить фильтры"}
                            </Button>
                        </Col>
                        <Col xs={12} sm={6} md={4} lg={3}>
                            <Form.Group controlId="searchName">
                                <Form.Label>Поиск по названию</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="searchName"
                                    placeholder="Введите название"
                                    value={filter.searchName}
                                    onChange={handleFilterChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
                <p>Найдено товара: {(filtersApplied ? filteredProducts : showArchived ? archivedProducts : products).length}</p>

                {loading ? (
                    <Spinner animation="border" />
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : (
                    <ListGroup>{renderProducts()}</ListGroup>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(currentProducts.length / itemsPerPage)}
                    onPageChange={handlePageChange}
                />
            </div>
            <CategoryModal />
            <Footer />
        </>
    );
}

export default ProductsPage;