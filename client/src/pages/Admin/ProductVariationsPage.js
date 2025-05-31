import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Container,
    Row,
    Col,
    Form,
    Button,
    ListGroup,
    Spinner,
    Card,
} from "react-bootstrap";
import { Pencil, Trash } from "lucide-react";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import Barcode from "react-barcode"; // Импорт компонента Barcode

const ProductVariationsPage = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [activeVariations, setActiveVariations] = useState([]);
    const [archivedVariations, setArchivedVariations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newVariation, setNewVariation] = useState({
        price: "",
        discount: "0",
        attributes: [{ key: "", value: "" }], // изменено на массив объектов
        quantity: 0
    });
    const [userId, setUserId] = useState(null);
    const [editingVariation, setEditingVariation] = useState(null); // Для редактирования вариации
    const [editingVariationId, setEditingVariationId] = useState(null);

    const [attributeNames, setAttributeNames] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: productData } = await axios.get(`http://localhost:8081/products/${id}`);
                const { data: variationData } = await axios.get(`http://localhost:8081/product-variations/product/${id}`);
                setProduct(productData);

                const parsedVariations = variationData.map((v) => ({
                    ...v,
                    price: parseFloat(v.price?.$numberDecimal || v.price),
                    discount: parseFloat(v.discount?.$numberDecimal || v.discount || 0),
                }));

                setActiveVariations(parsedVariations.filter(v => v.status !== 'В Архиве'));
                setArchivedVariations(parsedVariations.filter(v => v.status === 'В Архиве'));

                // Собираем уникальные названия атрибутов из активных вариаций
                const uniqueAttributes = new Set();
                parsedVariations.forEach((variation) => {
                    const attrs = variation.attributes || {};
                    Object.keys(attrs).forEach((key) => {
                        uniqueAttributes.add(key);
                    });
                });

                const attrNamesArray = Array.from(uniqueAttributes);
                console.log(uniqueAttributes)
                setAttributeNames(attrNamesArray);

                // Инициализируем newVariation.attributes с ключами
                setNewVariation({
                    ...newVariation, // если есть другие поля
                    attributes: attrNamesArray.map((name) => ({
                        key: name,
                        value: ""
                    }))
                });

            } catch (error) {
                console.error("Ошибка при загрузке данных", error);
            } finally {
                setLoading(false);
            }
        };
        const checkAdminAccess = async () => {
            try {
                const res = await axios.get('http://localhost:8081/admin', { withCredentials: true });
                setUserId(res.data.user.userId)
            } catch (err) {
                console.error('Доступ запрещен:', err);
                navigate('/login'); // Перенаправляем на страницу входа
            }
        };
        checkAdminAccess();
        fetchData();
    }, [id]);

    console.log(newVariation)

    const refreshVariations = async () => {
        try {
            const { data: variationData } = await axios.get(`http://localhost:8081/product-variations/product/${id}`);
            const parsed = variationData.map(v => ({
                ...v,
                price: parseFloat(v.price?.$numberDecimal || v.price),
                discount: parseFloat(v.discount?.$numberDecimal || v.discount || 0)
            }));
            setActiveVariations(parsed.filter(v => v.status !== 'В Архиве'));
            setArchivedVariations(parsed.filter(v => v.status === 'В Архиве'));
        } catch (error) {
            console.error("Ошибка при обновлении списка вариаций", error);
        }
    };


    const handleAddVariation = async () => {
        try {
            const attributeObj = {};
            newVariation.attributes.forEach(({ key, value }) => {
                if (key.trim()) attributeObj[key] = value;
            });

            const payload = {
                ...newVariation,
                product_id: id,
                price: newVariation.price.toString(),
                discount: newVariation.discount.toString(),
                attributes: attributeObj, // отправляем как объект
                user_id: userId,
            };
            console.log(payload)

            const { data } = await axios.post(`http://localhost:8081/product-variations`, payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                }
            );
            refreshVariations();
            setNewVariation({
                price: "",
                discount: "0.00",
                attributes: [{ key: "", value: "" }],
                quantity: 0
            });
        } catch (error) {
            console.error("Ошибка при добавлении вариации", error);
        }
    };

    const handleEditSubmit = async () => {
        try {
            const attributeObj = {};
            newVariation.attributes.forEach(({ key, value }) => {
                if (key.trim()) attributeObj[key] = value;
            });

            const payload = {
                ...newVariation,
                price: newVariation.price.toString(),
                discount: newVariation.discount.toString(),
                attributes: attributeObj,
                user_id: userId,
            };

            const { data } = await axios.put(
                `http://localhost:8081/product-variations/${editingVariationId}`,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                }
            );
            refreshVariations();
            // Очистка формы
            setNewVariation({
                price: "",
                discount: "0.00",
                attributes: [{ key: "", value: "" }],
                quantity: 0,
            });
            setEditingVariationId(null);
        } catch (error) {
            console.error("Ошибка при редактировании вариации", error);
        }
    };


    const handleDeleteVariation = async (variationId) => {
        try {
            await axios.delete(`http://localhost:8081/product-variations/${variationId}`, { params: { userId } }, { withCredentials: true });
            refreshVariations();
        } catch (error) {
            console.error("Ошибка при удалении вариации", error);
        }
    };

    const handleRestoreVariation = async (id) => {
        try {
            console.log(userId)
            await axios.put(`http://localhost:8081/product-variations/restore/${id}`, { userId }, { withCredentials: true });
            refreshVariations();
        } catch (error) {
            console.error("Ошибка при восстановлении вариации", error);
        }
    };


    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Загрузка...</p>
            </Container>
        );
    }

    if (!product) {
        return (
            <Container className="py-5">
                <h4>Товар не найден</h4>
            </Container>
        );
    }

    return (
        <>
            <Header />
            <Container className="py-4">
                <Row className="mb-4">
                    <Col>
                        <h2>Вариации товара: {product.name}</h2>
                    </Col>
                    <Col className="text-end">
                        <Button variant="secondary" onClick={() => navigate("/admin/products")}>
                            Назад к товарам
                        </Button>
                    </Col>
                </Row>

                <Card className="p-4 mb-4">
                    <h5 className="mb-3">
                        {editingVariationId ? "Редактировать вариацию" : "Добавить вариацию"}
                    </h5>
                    <Form>
                        <Row className="g-3 align-items-end">
                            <Col md={4}>
                                <Form.Group controlId="variationPrice">
                                    <Form.Label>Цена (₽)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="Цена"
                                        value={newVariation.price}
                                        onChange={(e) => {
                                            const value = Math.max(0, parseFloat(e.target.value) || 0); // не меньше 0
                                            setNewVariation({ ...newVariation, price: value });
                                        }}
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group controlId="variationDiscount">
                                    <Form.Label>Скидка (%)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="Скидка"
                                        value={newVariation.discount}
                                        onChange={(e) => {
                                            let value = parseFloat(e.target.value) || 0;
                                            if (value < 0) value = 0;
                                            if (value > 98) value = 98; // максимум 98%
                                            setNewVariation({ ...newVariation, discount: value });
                                        }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Атрибуты</Form.Label>
                                    {newVariation.attributes.map((attr, index) => {
                                        const isPredefined = attributeNames.includes(attr.key);
                                        return (
                                            <Row key={index} className="mb-2">
                                                <Col>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Название"
                                                        value={attr.key}
                                                        readOnly={isPredefined} // Запрещаем редактирование
                                                        onChange={(e) => {
                                                            if (isPredefined) return; // Дополнительно защищаем
                                                            const updated = [...newVariation.attributes];
                                                            updated[index].key = e.target.value;
                                                            setNewVariation({ ...newVariation, attributes: updated });
                                                        }}
                                                    />
                                                </Col>
                                                <Col>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Значение"
                                                        value={attr.value}
                                                        onChange={(e) => {
                                                            const updated = [...newVariation.attributes];
                                                            updated[index].value = e.target.value;
                                                            setNewVariation({ ...newVariation, attributes: updated });
                                                        }}
                                                    />
                                                </Col>
                                                <Col xs="auto">
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => {
                                                            const updated = [...newVariation.attributes];
                                                            updated.splice(index, 1);
                                                            setNewVariation({ ...newVariation, attributes: updated });
                                                        }}
                                                        disabled={isPredefined} // Запрещаем удаление предопределённых атрибутов
                                                    >
                                                        Удалить
                                                    </Button>
                                                </Col>
                                            </Row>
                                        );
                                    })}
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() =>
                                            setNewVariation({
                                                ...newVariation,
                                                attributes: [...newVariation.attributes, { key: "", value: "" }]
                                            })
                                        }
                                    >
                                        Добавить атрибут
                                    </Button>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Button variant="primary" className="w-100" onClick={() => {
                                    if (editingVariationId) {
                                        handleEditSubmit();
                                    } else {
                                        handleAddVariation();
                                    }
                                }}>
                                    Добавить
                                </Button>
                            </Col>
                            {editingVariationId && (
                                <Col md={3}>
                                    <Button
                                        variant="outline-secondary"
                                        className="w-100"
                                        onClick={() => {
                                            setEditingVariationId(null);
                                            setNewVariation({
                                                price: "",
                                                discount: "0.00",
                                                attributes: [{ key: "", value: "" }],
                                                quantity: 0,
                                            });
                                        }}
                                    >
                                        Отмена
                                    </Button>
                                </Col>
                            )}
                        </Row>
                    </Form>
                </Card>

                <h5 className="mt-4">Активные вариации</h5>
                <ListGroup className="mb-4">
                    {activeVariations.map((variation) => (
                        <ListGroup.Item key={variation._id}>
                            <div className="d-flex justify-content-between align-items-center">
                                {variation.attributes && Object.keys(variation.attributes).length > 0 && (
                                    <div className="mt-1">
                                        <strong>Атрибуты:</strong>{" "}
                                        {Object.entries(variation.attributes).map(([key, value]) => (
                                            <span key={key} className="me-3">
                                                {key}: {value}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => {
                                            const attributesArray = Object.entries(variation.attributes || {}).map(
                                                ([key, value]) => ({ key, value })
                                            );
                                            setNewVariation({
                                                price: variation.price,
                                                discount: variation.discount,
                                                attributes: attributesArray,
                                            });
                                            setEditingVariationId(variation._id);
                                        }}
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDeleteVariation(variation._id)}
                                    >
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            </div>
                            <div className="text-muted small">
                                Цена: {variation.price} ₽ | Скидка: {variation.discount} % | Статус: {variation.status} | Остаток: {variation.quantity}
                            </div>
                            <div className="mt-2">
                                <strong>Штрихкод:</strong>
                                {/* Генерация штрихкода с использованием react-barcode */}
                                <Barcode value={variation.barcode} />
                            </div>
                        </ListGroup.Item>
                    ))}
                    {activeVariations.length === 0 && (
                        <ListGroup.Item className="text-muted">Нет активных вариаций</ListGroup.Item>
                    )}
                </ListGroup>

                <h5>Архивные вариации</h5>
                <ListGroup>
                    {archivedVariations.map((variation) => (
                        <ListGroup.Item key={variation._id}>
                            <div className="d-flex justify-content-between align-items-center">
                                {variation.attributes && Object.keys(variation.attributes).length > 0 && (
                                    <div className="mt-1">
                                        <strong>Атрибуты:</strong>{" "}
                                        {Object.entries(variation.attributes).map(([key, value]) => (
                                            <span key={key} className="me-3">
                                                {key}: {value}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => {
                                            const attributesArray = Object.entries(variation.attributes || {}).map(
                                                ([key, value]) => ({ key, value })
                                            );
                                            setNewVariation({
                                                price: variation.price,
                                                discount: variation.discount,
                                                attributes: attributesArray,
                                            });
                                            setEditingVariationId(variation._id);
                                        }}
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    <Button
                                        variant="outline-success"
                                        size="sm"
                                        onClick={() => handleRestoreVariation(variation._id)}
                                    >
                                        Восстановить
                                    </Button>
                                </div>
                            </div>
                            <div className="text-muted small">
                                Цена: {variation.price} ₽ | Скидка: {variation.discount} % | Статус: {variation.status} | Остаток: {variation.quantity}
                            </div>
                            <div className="mt-2">
                                <strong>Штрихкод:</strong>
                                {/* Генерация штрихкода для архивных вариаций */}
                                <Barcode value={variation.barcode} />
                            </div>
                        </ListGroup.Item>
                    ))}
                    {archivedVariations.length === 0 && (
                        <ListGroup.Item className="text-muted">Нет архивных вариаций</ListGroup.Item>
                    )}
                </ListGroup>
            </Container>
            <Footer />
        </>
    );
};

export default ProductVariationsPage;
