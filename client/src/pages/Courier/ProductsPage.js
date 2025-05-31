import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, ListGroup, Modal, Form, Table, Card, Row, Col, Collapse, Breadcrumb } from "react-bootstrap";
import { CSSTransition } from "react-transition-group";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import { FaArrowLeft, FaTrash, FaUndo, FaEdit, FaArchive } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Loader from "../../components/Layout/Loader";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import Notification from "../../components/Layout/Notification";
import '../../style/CourierProductsPage.css'

function CourierProductsPage() {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productVariations, setProductVariations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalType, setModalType] = useState(""); // "variations", "addVariation"
    const [notification, setNotification] = useState({ message: "", type: "" });
    const [mapCenter, setMapCenter] = useState([52.2858, 104.3007]); // Иркутск
    const [isMapLoading, setIsMapLoading] = useState(true);

    const [archivedVariations, setArchivedVariations] = useState([]);
    const [currentVariation, setCurrentVariation] = useState(null);

    const [showArchivedModal, setShowArchivedModal] = useState(false);

    const [formData, setFormData] = useState({
        attributes: [],
        quantity: 0,
        product_id: '',
        price: 0,
        discount: 0,
    });

    const [showWarehousePanel, setShowWarehousePanel] = useState(false);
    const [warehouseProducts, setWarehouseProducts] = useState([]);

    const [userId, setUserId] = useState(null);

    const [remainingQuantity, setRemainingQuantity] = useState([]); // Количество для распределения
    const [distributionData, setDistributionData] = useState([]); // Склад и количество товара

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, warehousesRes, productVariations] = await Promise.all([
                    axios.get("http://localhost:8081/products", { withCredentials: true }),
                    axios.get("http://localhost:8081/warehouses", { withCredentials: true }),
                    axios.get("http://localhost:8081/product-variations/active", { withCredentials: true }),
                ]);
                setProducts(productsRes.data);
                setWarehouses(warehousesRes.data);
                console.log(productVariations.data)
                const productVar = productVariations.data.map(item => ({
                    ...item,
                    product_id: item.product_id._id,
                }))
                setProductVariations(productVar);
            } catch (err) {
                showNotification("Ошибка загрузки данных. Попробуйте позже.", "danger");
            } finally {
                setLoading(false);
            }
        };
        const fetchArchivedVariations = async () => {
            try {
                const response = await axios.get("http://localhost:8081/product-variations/archived", { withCredentials: true });
                setArchivedVariations(response.data);
            } catch (error) {
                showNotification("Ошибка при загрузке архивированных вариаций", "danger");
            }
        };
        const checkCourierAccess = async () => {
            try {
                const res = await axios.get('http://localhost:8081/courier', { withCredentials: true });
                setUserId(res.data.user.userId)
            } catch (err) {
                console.error('Доступ запрещен:', err);
                navigate('/login'); // Перенаправляем на страницу входа
            }
        };

        fetchData();
        fetchArchivedVariations();
        checkCourierAccess();
    }, []);


    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    };

    // Клик на метку на карте
    const handleWarehouseClick = async (warehouse) => {
        setSelectedWarehouse(warehouse);
        setShowWarehousePanel(true);

        try {
            // Запрос на получения списка товаров и их вариаций 
            const response = await axios.get(`http://localhost:8081/warehouse-inventory/warehouse/${warehouse._id}`, { withCredentials: true });
            console.log(response.data)
            setWarehouseProducts(response.data);
        } catch (error) {
            showNotification("Ошибка при загрузке товаров склада.", "danger");
        }
    };

    const handleProductClick = (product, type, variation = null) => {
        setSelectedProduct(product);
        setModalType(type);

        // Для добавления вариации проверяем наличие других вариаций с таким же product_id
        if (type === "addVariation") {
            // Ищем вариации для текущего продукта
            const existingVariation = productVariations.find(
                (v) => v.product_id == product._id,
            );
            console.log(existingVariation);

            // Если такие вариации есть, проверяем и копируем атрибуты
            if (existingVariation) {
                const attributes = existingVariation.attributes
                    ? Object.keys(existingVariation.attributes).map((key) => ({
                        name: key,
                        value: existingVariation.attributes[key],
                    })) // Преобразуем объект в массив атрибутов
                    : [];

                setFormData({
                    attributes: attributes.map((attr) => ({
                        [attr.name]: "",  // Создаем пустые значения для новых атрибутов
                    })),
                    quantity: 0,
                    product_id: product._id,
                    price: 0,
                    discount: 0
                });
            } else {
                // Если вариаций нет, то просто передаем пустую форму
                setFormData({
                    attributes: [],
                    quantity: 0,
                    product_id: product._id,
                    price: 0,
                    discount: 0
                });
            }
        }

        // Для редактирования вариации передаем ее данные в форму
        else if (type === "editVariation" && variation) {
            setFormData({
                attributes: variation.attributes,
                quantity: variation.quantity,
                product_id: product._id,
                price: variation.price,
                discount: variation.discount,
            });
        }
    };

    const handleMapLoad = () => setIsMapLoading(false);

    const renderModalContent = () => {
        if (!selectedProduct) return null;

        if (modalType === "variations") {
            // Фильтрация вариаций для текущего продукта из productVariations
            const variationsForProduct = productVariations.filter(
                (variation) => variation.product_id === selectedProduct._id
            );

            return (
                <>
                    <Modal.Header closeButton>
                        <Modal.Title>Управление вариациями: {selectedProduct.name}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <ListGroup>
                            {
                                variationsForProduct.length > 0 ? (
                                    variationsForProduct.map((variation) => (
                                        <ListGroup.Item key={variation._id} className="d-flex justify-content-between align-items-center shadow-sm mb-3">
                                            <div>
                                                <span className="fw-bold">
                                                    {/* Проверка на существование attributes и использование map только если attributes существует */}
                                                    {variation.attributes
                                                        ? Object.keys(variation.attributes).map((key) => `${key}: ${variation.attributes[key]}`).join(", ")
                                                        : "Нет атрибутов"} — Количество: {variation.quantity}
                                                </span>
                                            </div>
                                            <div>
                                                <strong>Цена:</strong> {variation.price?.$numberDecimal || "—"} ₽
                                                <br />
                                                <strong>Скидка:</strong> {variation.discount?.$numberDecimal || "—"}%
                                            </div>
                                            <div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleProductClick(selectedProduct, "editVariation", variation)}
                                                    className="me-2"
                                                    variant="outline-primary"
                                                >
                                                    <FaEdit className="me-2" />
                                                    Редактировать
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleArchiveVariation(variation._id)}
                                                    className="me-2"
                                                    variant="outline-danger"
                                                >
                                                    <FaArchive className="me-2" />
                                                    Архивировать
                                                </Button>
                                            </div>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <p>Вариаций нет</p>
                                )
                            }
                        </ListGroup>
                    </Modal.Body>
                </>
            );
        }

        if (modalType === "addVariation" || modalType === "editVariation") {

            return (
                <>
                    <Modal.Header closeButton>
                        <Modal.Title>{modalType === "addVariation" ? "Добавить вариацию" : "Редактировать вариацию"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <h5>{selectedProduct.name}</h5>
                        <Form onSubmit={(e) => e.preventDefault()}>
                            <Form.Group>
                                <Form.Label>Количество</Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Введите количество"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    min={1}
                                    step={1}
                                />
                            </Form.Group>
                            <Form.Group className="mt-3">
                                <Form.Label>Цена (₽)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Введите цену"
                                    value={formData.price?.$numberDecimal || ""}
                                    onChange={(e) => setFormData({ ...formData, price: { $numberDecimal: e.target.value } })}
                                />
                            </Form.Group>
                            <Form.Group className="mt-3">
                                <Form.Label>Скидка (%)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Введите скидку"
                                    value={formData.discount?.$numberDecimal || ""}
                                    onChange={(e) => setFormData({ ...formData, discount: { $numberDecimal: e.target.value } })}
                                />
                            </Form.Group>
                            <Form.Group className="mt-3">
                                <Form.Label>Атрибуты вариации</Form.Label>
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>Название</th>
                                            <th>Значение</th>
                                            <th>Действие</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(modalType === "addVariation"
                                            ? formData.attributes.length > 0 && Object.entries(formData.attributes[0])
                                            : Object.keys(formData.attributes).length > 0 && Object.entries(formData.attributes)
                                        ) ? (
                                            (modalType === "addVariation"
                                                ? Object.entries(formData.attributes[0])
                                                : Object.entries(formData.attributes)
                                            ).map(([key, value], index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <Form.Control
                                                            type="text"
                                                            value={key} // Показываем название атрибута
                                                            onChange={(e) => {
                                                                const updatedAttributes =
                                                                    modalType === "addVariation"
                                                                        ? [{ ...formData.attributes[0] }]
                                                                        : { ...formData.attributes };

                                                                const newKey = e.target.value;
                                                                if (modalType === "addVariation") {
                                                                    updatedAttributes[0][newKey] = value; // Обновляем ключ
                                                                    delete updatedAttributes[0][key]; // Удаляем старый ключ
                                                                } else {
                                                                    updatedAttributes[newKey] = value; // Обновляем ключ
                                                                    delete updatedAttributes[key]; // Удаляем старый ключ
                                                                }
                                                                setFormData({ ...formData, attributes: updatedAttributes });
                                                            }}
                                                            placeholder="Название атрибута"
                                                        />
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            type="text"
                                                            value={value} // Показываем значение атрибута
                                                            onChange={(e) => {
                                                                const updatedAttributes =
                                                                    modalType === "addVariation"
                                                                        ? [{ ...formData.attributes[0] }]
                                                                        : { ...formData.attributes };

                                                                if (modalType === "addVariation") {
                                                                    updatedAttributes[0][key] = e.target.value; // Обновляем значение
                                                                } else {
                                                                    updatedAttributes[key] = e.target.value; // Обновляем значение
                                                                }
                                                                setFormData({ ...formData, attributes: updatedAttributes });
                                                            }}
                                                            placeholder="Значение атрибута"
                                                        />
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="danger"
                                                            onClick={() => handleRemoveAttribute(index)}
                                                            size="sm"
                                                        >
                                                            Удалить
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : null}
                                    </tbody>
                                </Table>
                                <Button
                                    variant="outline-primary"
                                    onClick={handleAddAttribute}
                                    size="sm"
                                >
                                    Добавить атрибут
                                </Button>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="primary"
                            onClick={modalType === "addVariation" ? handleSaveNewVariation : () => handleEditVariation(selectedProduct.variations[0]._id)}
                        >
                            Сохранить
                        </Button>
                    </Modal.Footer>
                </>
            );
        }
        if (modalType === "distribute") {
            return (
                <>
                    {/* Модальное окно для распределения товара */}
                    <Modal show={true} onHide={handleClose}>
                        <Modal.Header closeButton>
                            <Modal.Title>Распределение вариации товара</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <h5>Осталось распределить: {remainingQuantity} единиц</h5>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>Склад / Магазин</th>
                                        <th>Количество</th>
                                        <th>Действие</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {warehouses.map((warehouse) => (
                                        <tr key={warehouse._id}>
                                            <td>{warehouse.name}</td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    value={distributionData[warehouse._id] || ""}
                                                    placeholder="Количество"
                                                    onChange={(e) => {
                                                        const quantity = parseInt(e.target.value, 10) || 0;

                                                        setDistributionData((prev) => {
                                                            const updated = { ...prev };
                                                            updated[warehouse._id] = quantity;
                                                            return updated;
                                                        });

                                                        // Устанавливаем стиль для проверки превышения
                                                        const inputField = e.target;
                                                        if (quantity > remainingQuantity) {
                                                            inputField.style.color = 'red';
                                                        } else {
                                                            inputField.style.color = 'black';
                                                        }
                                                    }}
                                                    style={{
                                                        color:
                                                            (distributionData[warehouse._id] || 0) > remainingQuantity
                                                                ? 'red'
                                                                : 'black',
                                                    }}
                                                />
                                                {(distributionData[warehouse._id] || 0) > remainingQuantity && (
                                                    <small className="text-danger">
                                                        Введенное значение превышает доступное количество
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <Button
                                                    variant="primary"
                                                    onClick={() => {
                                                        handleDistribute(
                                                            warehouse._id,
                                                            distributionData[warehouse._id] || 0
                                                        );

                                                        // Сброс значения в distributionData и очистка поля
                                                        setDistributionData((prev) => {
                                                            const updated = { ...prev };
                                                            updated[warehouse._id] = "";
                                                            return updated;
                                                        });
                                                    }}
                                                    disabled={
                                                        (distributionData[warehouse._id] || 0) > remainingQuantity ||
                                                        (distributionData[warehouse._id] || 0) === 0
                                                    }
                                                >
                                                    Отправить
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Закрыть
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </>
            )
        }
        return null;
    };


    const refreshProductVariations = async () => {
        try {
            const [productsRes, warehousesRes, productVariations] = await Promise.all([
                axios.get("http://localhost:8081/products", { withCredentials: true }),
                axios.get("http://localhost:8081/warehouses", { withCredentials: true }),
                axios.get("http://localhost:8081/product-variations/active", { withCredentials: true }),
            ]);
            const response = await axios.get("http://localhost:8081/product-variations/archived", { withCredentials: true });
            setArchivedVariations(response.data);
            setProducts(productsRes.data);
            setWarehouses(warehousesRes.data);
            setProductVariations(productVariations.data);
        } catch (error) {
            console.error("Ошибка при обновлении списка вариаций:", error);
            showNotification("Не удалось обновить список вариаций", "danger");
        }
    };

    const handleSaveNewVariation = async () => {
        // Данные для отправки
        const { product_id, quantity, attributes, price, discount } = formData;

        const dataToSend = {
            product_id,
            quantity,
            attributes: JSON.stringify(attributes), // Преобразование в строку
            user_id: userId,
            price,
            discount
        };

        // Лог данных для проверки
        // console.log("Данные для отправки (JSON):", dataToSend);
        setRemainingQuantity(dataToSend.quantity);
        try {
            const response = await axios.post(
                "http://localhost:8081/product-variations",
                dataToSend,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                }
            );
            formData.product_id = response.data._id;
            console.log("response.data._id: ", response.data._id)
            showNotification("Вариация успешно добавлена");
            setModalType("distribute"); // Открыть модальное окно распределения
            refreshProductVariations();
        } catch (error) {
            console.error("Ошибка при добавлении вариации:", error);
            showNotification("Ошибка при добавлении вариации", "danger");
        }
    };


    const handleEditVariation = async (variationId) => {
        // Извлечение данных из состояния
        const { product_id, quantity, attributes, price, discount } = formData;

        // Создание объекта FormData
        const formDataToSend = new FormData();
        formDataToSend.append("product_id", product_id);
        formDataToSend.append("quantity", quantity);
        formDataToSend.append("attributes", JSON.stringify(attributes));
        formDataToSend.append("user_id", userId); // Здесь будет ID пользователя
        formDataToSend.append("price", price);
        formDataToSend.append("discount", discount);

        // Вывод данных в консоль для проверки
        console.log("Данные для отправки (formData):", {
            product_id,
            quantity,
            attributes: JSON.stringify(attributes),
            user_id: userId,
        });

        try {
            await axios.put(`http://localhost:8081/variations/${variationId}`, formDataToSend, { withCredentials: true });
            showNotification("Вариация успешно обновлена");
            setModalType("");
            refreshProductVariations();
        } catch (error) {
            console.error("Ошибка при редактировании вариации:", error);
            showNotification("Ошибка при редактировании вариации", "danger");
        }
    };

    const handleArchiveVariation = async (variationId) => {
        try {
            await axios.delete(`http://localhost:8081/product-variations/${variationId}`, { params: { userId } }, { withCredentials: true });

            // Уведомление об успешной операции
            showNotification("Вариация заархивирована", "success");

            // Обновление данных интерфейса
            refreshProductVariations();
        } catch (error) {
            console.error("Ошибка при архивации вариации:", error);
            showNotification("Ошибка при архивации вариации", "danger");
        }
    };


    const handleDeleteVaration = async (variationId) => {
        try {
            await axios.delete(`http://localhost:8081/product-variations/permanent/${variationId}`, { params: { userId } }, { withCredentials: true });

            // Уведомление об успешной операции
            showNotification("Вариация окончательно удалена", "success");

            // Обновление данных интерфейса
            refreshProductVariations();
        } catch (error) {
            console.error("Ошибка при окончательном удалении вариации:", error);
            showNotification("Ошибка при окончательном удалении вариации", "danger");
        }
    };

    const handleRestoreVariation = async (variationId) => {
        try {
            await axios.put(`http://localhost:8081/product-variations/restore/${variationId}`, { userId }, { withCredentials: true });

            // Уведомление об успешной операции
            showNotification("Вариация восстановлена", "success");

            // Обновление данных интерфейса
            refreshProductVariations();
        } catch (error) {
            console.error("Ошибка при восстановлении вариации:", error);
            showNotification("Ошибка при восстоновлении вариации", "danger");
        }
    };

    const handleShowArchivedProducts = async () => {
        setShowArchivedModal(true); // Открыть модальное окно
    };


    const handleAddAttribute = () => {
        setFormData({
            ...formData,
            attributes: [...formData.attributes, { "": "" }],  // Инициализируем пустым объектом
        });
    };

    const handleRemoveAttribute = (index) => {
        const updatedAttributes = formData.attributes.filter((_, i) => i !== index);
        setFormData({ ...formData, attributes: updatedAttributes });
    };

    const WarehousePanel = ({ warehouse, warehouseProducts, products, onClose, show }) => {
        const [selectedProductId, setSelectedProductId] = useState(null);

        // Сопоставляем warehouseProducts с данными из products
        const productsWithDetails = warehouseProducts.map((wp) => {
            const productDetails = products.find((p) => p._id === wp.product_id.product_id);
            return { ...wp, productDetails };
        });

        // Получаем уникальные продукты
        const uniqueProducts = Object.values(
            productsWithDetails.reduce((uniqueObj, product) => {
                const productId = product.product_id.product_id;
                if (!uniqueObj[productId]) {
                    uniqueObj[productId] = product.productDetails;
                }
                return uniqueObj;
            }, {})
        );

        // Фильтруем вариации для выбранного товара
        const variations = selectedProductId
            ? warehouseProducts.filter((wp) => wp.product_id.product_id === selectedProductId)
            : [];

        return (
            <CSSTransition
                in={show}  // show - это флаг для контроля видимости панели
                timeout={300}
                classNames="panel-fade"
                unmountOnExit
            >
                <div className="warehouse-panel">
                    <div className="warehouse-panel-header d-flex justify-content-between align-items-center">
                        <Breadcrumb>
                            <Breadcrumb.Item
                                active={!selectedProductId}
                                onClick={() => setSelectedProductId(null)}
                                style={{
                                    cursor: selectedProductId ? "pointer" : "default",
                                    textDecoration: "none",
                                    color: "#6c757d",
                                }}
                            >
                                {warehouse?.name || "Склад/Магазин"}
                            </Breadcrumb.Item>
                            {selectedProductId && (
                                <Breadcrumb.Item
                                    active
                                    style={{
                                        textDecoration: "none",
                                        color: "#6c757d",
                                    }}
                                >
                                    {products.find((p) => p._id === selectedProductId)?.name || "Товар"}
                                </Breadcrumb.Item>
                            )}
                        </Breadcrumb>
                        <Button variant="danger" onClick={onClose}>
                            Закрыть
                        </Button>
                    </div>

                    {/* Анимация списка продуктов */}
                    <CSSTransition
                        in={!selectedProductId}
                        timeout={300}
                        classNames="fade"
                        unmountOnExit
                    >
                        <ListGroup>
                            {uniqueProducts.length > 0 ? (uniqueProducts.map((product) => (
                                <ListGroup.Item
                                    key={product._id}
                                    onClick={() => setSelectedProductId(product._id)}
                                    className="d-flex justify-content-between align-items-center"
                                    style={{ cursor: "pointer" }}
                                >
                                    <strong>{product.name}</strong>
                                    <Button variant="link" style={{ textDecoration: "none" }}>
                                        ➤
                                    </Button>
                                </ListGroup.Item>
                            ))) : (
                                <ListGroup.Item>
                                    <strong>Нет продуктов</strong>
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </CSSTransition>

                    {/* Анимация вариаций для выбранного товара */}
                    <CSSTransition
                        in={!!selectedProductId}
                        timeout={300}
                        classNames="fade"
                        unmountOnExit
                    >
                        <ListGroup>
                            {variations.map((variation) => (
                                <ListGroup.Item key={variation._id}>
                                    <div>
                                        <p>
                                            {variation.product_id.attributes
                                                ? Object.keys(variation.product_id.attributes).map((key) => `${key}: ${variation.product_id.attributes[key]}`).join(", ")
                                                : "Нет атрибутов"}
                                        </p>
                                        <p>
                                            <strong>Количество:</strong> {variation.quantity}
                                        </p>
                                        {(variation.product_id.status === 'В Архиве' ? <p style={{
                                            color: "#e74747",
                                        }}>
                                            <strong>Статус:</strong> {variation.product_id.status}
                                        </p> : null)}
                                        <ul>
                                            {Object.entries(variation.attributes || {}).map(([key, value]) => (
                                                <li key={key}>
                                                    <strong>{key}:</strong> {value}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </CSSTransition>
                </div>
            </CSSTransition>
        );
    };

    // Распределения товара по складам/магазинам
    const handleDistribute = async (warehouseId, quantity) => {
        if (quantity > remainingQuantity) {
            showNotification("Вы не можете отправить больше товара, чем нужно!", "danger");
            return;
        }

        // Обновление оставшегося количества
        setRemainingQuantity(remainingQuantity - quantity);

        // Отправка данных на сервер
        try {
            console.log("formData.product_id: ", formData.product_id)
            const dataToSend = {
                product_id: formData.product_id,
                warehouse_id: warehouseId,
                quantity,
                user_id: userId,
            };

            await axios.post("http://localhost:8081/warehouse-inventory", dataToSend, {
                headers: {
                    "Content-Type": "application/json",
                },
                withCredentials: true,
            });
            showNotification(`Товар успешно отправлен на ${warehouses.find(w => w._id === warehouseId).name}`);
        } catch (error) {
            console.error("Ошибка при распределении товара:", error);
            showNotification("Ошибка при распределении товара", "danger");
        }
    };

    const handleClose = () => {
        setRemainingQuantity(formData.quantity); // Сбросить количество при закрытии
        setModalType(""); // Закрыть модальное окно, изменяя тип модального окна
    };

    if (loading) return <Loader />;

    return (
        <>
            <Header />
            <div className="container-fluid my-4 d-flex">
                <div className="col-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center">
                            <Button
                                variant="link"
                                onClick={() => navigate('/courier')}
                                className="me-2 p-0"
                            >
                                <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                            </Button>
                            <h4 className="mb-0 me-3">Список товаров</h4>
                        </div>
                        <Button
                            variant="outline-secondary"
                            onClick={handleShowArchivedProducts}
                        >
                            Архивированные товары
                        </Button>
                    </div>
                    <ListGroup>
                        {products.map((product) => {
                            // Фильтруем вариации для текущего продукта
                            const variationsForProduct = productVariations.filter(
                                (variation) => variation.product_id === product._id
                            );
                            // Суммируем количество всех вариаций
                            const totalQuantity = variationsForProduct.reduce(
                                (sum, variation) => sum + variation.quantity, 0
                            );

                            return (
                                <ListGroup.Item
                                    key={product.id}
                                    className="d-flex justify-content-between align-items-center"
                                >
                                    <div>
                                        <strong>{product.name}</strong>
                                        <br />
                                        <small>Количество: {totalQuantity}</small> {/* Отображаем сумму количества вариаций */}
                                    </div>
                                    <div>
                                        <Button
                                            variant="dark"
                                            size="sm"
                                            onClick={() => handleProductClick(product, "variations")}
                                        >
                                            Вариации
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleProductClick(product, "addVariation")}
                                            className="ms-2"
                                        >
                                            Добавить
                                        </Button>
                                    </div>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </div>

                <div className="col-8 position-relative">
                    {isMapLoading && (
                        <div className="position-absolute top-50 start-50 translate-middle">
                            <Loader />
                        </div>
                    )}
                    <YMaps>
                        <Map
                            state={{
                                center: mapCenter,
                                zoom: 10,
                            }}
                            onLoad={handleMapLoad}
                            width="100%"
                            height="400px"
                        >
                            {warehouses.map((warehouse) => (
                                <Placemark
                                    key={warehouse.id}
                                    geometry={[
                                        warehouse.location.latitude,
                                        warehouse.location.longitude,
                                    ]}
                                    properties={{
                                        balloonContentHeader: `<strong>${warehouse.name}</strong>`,
                                        balloonContentBody: `Тип: ${warehouse.type}<br>Адрес: ${warehouse.address || "Не указан"
                                            }`,
                                        hintContent: warehouse.name,
                                    }}
                                    options={{
                                        preset:
                                            warehouse.type === "Склад"
                                                ? "islands#blueDotIcon"
                                                : "islands#greenDotIcon",
                                    }}
                                    onClick={() => handleWarehouseClick(warehouse)}
                                />
                            ))}
                        </Map>
                    </YMaps>
                    {showWarehousePanel && (
                        <WarehousePanel
                            warehouse={selectedWarehouse}
                            warehouseProducts={warehouseProducts}
                            products={products}
                            onClose={() => setShowWarehousePanel(false)}
                            show={showWarehousePanel}  // Передаем флаг для анимации
                        />
                    )}
                </div>
            </div>
            <Modal
                show={modalType !== ""}
                onHide={() => setModalType("")}
                backdrop="static"
            >
                {renderModalContent()}
            </Modal>

            {notification.message && (
                <Notification message={notification.message} type={notification.type} />
            )}
            <Modal show={showArchivedModal} onHide={() => setShowArchivedModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Архивированные вариации</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loading ? (
                        <div className="text-center">Загрузка...</div>
                    ) : archivedVariations.length > 0 ? (
                        <ListGroup>
                            {archivedVariations.map((variation) => (
                                <ListGroup.Item key={variation._id}>
                                    <Card className="shadow-sm">
                                        <Card.Body>
                                            <Row className="align-items-center">
                                                <Col xs={8}>
                                                    <div>
                                                        {Object.keys(variation.attributes).map(key => (
                                                            <div key={key}>
                                                                <strong>{key}:</strong> {variation.attributes[key]}
                                                            </div>
                                                        ))}
                                                        <strong>Количество:</strong> {variation.quantity}
                                                    </div>
                                                </Col>
                                                <Col xs={4} className="text-right">
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => handleDeleteVaration(variation._id)}
                                                        className="mr-2">
                                                        <FaTrash />
                                                    </Button>
                                                    <Button
                                                        variant="success"
                                                        onClick={() => handleRestoreVariation(variation._id)}>
                                                        <FaUndo />
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    ) : (
                        <p>Нет архивированных вариаций.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowArchivedModal(false)}>
                        Закрыть
                    </Button>
                </Modal.Footer>
            </Modal>
            <Footer />
        </>
    );
}

export default CourierProductsPage;
