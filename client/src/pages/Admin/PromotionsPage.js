import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Card, Form, Modal, InputGroup, Table, Badge } from "react-bootstrap";
import { PlusCircle, Edit, Trash2, Archive, Search } from "lucide-react";
import axios from "axios";
import Footer from "../../components/Layout/Footer";
import Header from "../../components/Layout/Header";
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import Select from "react-select";
import { Editor } from "@tinymce/tinymce-react";

function AdminPromotionsPage() {
    const [promotions, setPromotions] = useState([]);
    const [promotionTargets, setPromotionTargets] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("Все");
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [form, setForm] = useState({
        name: "",
        description: "",
        discount_type: "Процент",
        discount_value: 0,
        gift_product_id: null,
        start_date: "",
        end_date: "",
        min_order_amount: "",
        max_discount: "",
        is_active: true,
        is_combinable: false,
        targets: [],
        background_color: '',
        banner: ''
    });
    const [userId, setUserId] = useState(null);
    const [products, setProducts] = useState([]);

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    const [showTargetsModal, setShowTargetsModal] = useState(false);
    const [selectedPromoTargets, setSelectedPromoTargets] = useState([]);
    const [matchedProducts, setMatchedProducts] = useState([]);

    const navigate = useNavigate();

    const location = useLocation();
    const returnToEdit = location.state?.returnToEdit;

    useEffect(() => {
        if (returnToEdit) {
            setForm(returnToEdit); // state в модалке
            setShowModal(true); // открыть модалку сразу
        }
    }, [returnToEdit]);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/admin', { withCredentials: true });

                if (userResponse.data.user.role === 'admin') {
                    setUserId(userResponse.data.user.userId)
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Ошибка при проверке роли админитстратора:', error);
                navigate('/login');
            }
        };
        const fetchProducts = async () => {
            try {
                const res = await axios.get("http://localhost:8081/products", { withCredentials: true });
                setProducts(res.data);
            } catch (err) {
                console.error("Ошибка при загрузке товаров:", err);
            }
        };
        const fetchBrandsAndCategories = async () => {
            try {
                const [catRes, prodRes] = await Promise.all([
                    axios.get("http://localhost:8081/categories"),
                    axios.get("http://localhost:8081/products"),
                ]);

                setCategories(catRes.data);

                const brandSet = new Set();

                // Рекурсивный обход вложенных объектов
                const extractBrand = (obj) => {
                    if (typeof obj !== "object" || obj === null) return;

                    for (const key in obj) {
                        if (key.toLowerCase().includes("производитель") || key.toLowerCase().includes("brand")) {
                            brandSet.add(obj[key]);
                        } else if (typeof obj[key] === "object") {
                            extractBrand(obj[key]);
                        }
                    }
                };

                prodRes.data.forEach((p) => {
                    if (p.attributes) extractBrand(p.attributes);
                });

                // console.log("prodRes.data:", prodRes.data);
                // console.log("brandSet:", brandSet);

                setBrands([...brandSet]);
            } catch (err) {
                console.error("Ошибка при загрузке брендов и категорий:", err);
            }
        };
        fetchBrandsAndCategories();
        fetchProducts();
        checkAccess();
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            // Получаем акции и цели
            const [resPromotions, resPromotionTargets] = await Promise.all([
                axios.get("http://localhost:8081/promotions"),
                axios.get("http://localhost:8081/promotion-product-category"),
            ]);

            // Парсим числа
            const parsedPromotions = resPromotions.data.map((p) => ({
                ...p,
                discount_value: parseFloat(p.discount_value?.$numberDecimal || p.discount_value),
                max_discount: parseFloat(p.max_discount?.$numberDecimal || p.max_discount || 0),
                min_order_amount: parseFloat(p.min_order_amount?.$numberDecimal || p.min_order_amount || 0),
            }));

            // Группируем цели по promotion_id
            const targetsByPromoId = {};
            for (const target of resPromotionTargets.data) {
                const promoId = target.promotion_id?._id || target.promotion_id;
                if (!targetsByPromoId[promoId]) targetsByPromoId[promoId] = [];
                targetsByPromoId[promoId].push({
                    product: target.product_id || null,
                    category: target.category_id || null,
                    brand_name: target.brand_name || null,
                });
            }

            // Добавляем поле targets к каждой акции
            const promotionsWithTargets = parsedPromotions.map((promo) => ({
                ...promo,
                targets: targetsByPromoId[promo._id] || [],
            }));

            // Установка состояния
            setPromotions(promotionsWithTargets);
            setPromotionTargets(resPromotionTargets.data);

            console.log("promotionsWithTargets:", promotionsWithTargets);
        } catch (err) {
            console.error("Ошибка загрузки акций:", err);
        }
    };

    const handleSearch = () => {
        return promotions.filter((promo) => {
            const matchSearch = promo.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === "Все" || (filterStatus === "Активные" && promo.is_active) || (filterStatus === "Архивные" && !promo.is_active);
            return matchSearch && matchStatus;
        });
    };

    const handleEdit = (promo) => {
        setEditingPromo(promo);
        setForm({
            ...promo,
            targets: promo.targets?.map((t) => ({
                product_id: t.product?._id || t.product_id || null,
                category_id: t.category?._id || t.category_id || null,
                brand_name: t.brand_name || null,
            })) || [],
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Удалить акцию?")) {
            await axios.delete(`http://localhost:8081/promotions/${id}`);
            fetchPromotions();
        }
    };

    const handleArchive = async (id) => {
        await axios.put(`http://localhost:8081/promotions/archive/${id}`, { user_id: userId });
        fetchPromotions();
    };

    const handleRestore = async (id) => {
        await axios.put(`http://localhost:8081/promotions/restore/${id}`, { user_id: userId });
        fetchPromotions();
    }

    const handleSave = async () => {
        const dataToSend = {
            ...form,
            user_id: userId,
            targets: form.targets,
        };
        console.log(dataToSend)
        if (editingPromo) {
            await axios.put(`http://localhost:8081/promotions/${editingPromo._id}`, dataToSend);
        } else {
            await axios.post("http://localhost:8081/promotions", dataToSend);
        }

        setShowModal(false);
        setEditingPromo(null);
        setForm({
            name: "",
            description: "",
            discount_type: "Процент",
            discount_value: 0,
            gift_product_id: null,
            start_date: "",
            end_date: "",
            min_order_amount: "",
            max_discount: "",
            is_active: true,
            is_combinable: false,
            background_color: '',
            banner: '',
        });
        fetchPromotions();
    };

    const handleViewTargets = (targets) => {
        setSelectedPromoTargets(targets);

        // фильтрация подходящих товаров
        const filtered = products.filter((product) => {
            return targets.some((target) => {
                if (target.product?._id) {
                    return product._id === target.product._id;
                }
                if (target.category?._id) {
                    return product.categories_id === target.category._id;
                }
                if (target.brand_name) {
                    // Проверяем вложенные атрибуты на наличие бренда
                    const hasBrand = (obj) => {
                        if (typeof obj !== 'object' || obj === null) return false;
                        for (const key in obj) {
                            const value = obj[key];
                            if (
                                (key.toLowerCase().includes("производитель") || key.toLowerCase().includes("brand")) &&
                                typeof value === "string" &&
                                value === target.brand_name
                            ) {
                                return true;
                            }
                            if (typeof value === "object" && hasBrand(value)) return true;
                        }
                        return false;
                    };
                    return hasBrand(product.attributes);
                }
                return false;
            });
        });

        setMatchedProducts(filtered);
        setShowTargetsModal(true);
    };

    useEffect(() => {
        const editor = window.tinymce?.activeEditor;
        if (editor && editor.getBody()) {
            editor.getBody().style.backgroundColor = form?.background_color || "#ffffff";
        }

    }, [form?.background_color]);

    const editorInit = {
        content_style: `body { background-color: ${form?.background_color || "#ffffff"};}`,
        menubar: true,
        plugins: [
            "advlist", "autolink", "lists", "link", "image", "charmap", "preview", "anchor",
            "searchreplace", "visualblocks", "code", "fullscreen",
            "insertdatetime", "media", "table", "paste", "code", "help", "wordcount",
            "imagetools",
            "hr",
            "emoticons",
        ],
        toolbar:
            "undo redo | formatselect | bold italic backcolor | \
            alignleft aligncenter alignright alignjustify | \
            bullist numlist outdent indent | removeformat | image media | \
            preview fullscreen code",
        file_picker_types: "image",
        automatic_uploads: true,
        images_upload_handler: async (blobInfo, success, failure) => {
            try {
                const formData = new FormData();
                formData.append("image", blobInfo.blob(), blobInfo.filename());

                const response = await axios.post(
                    "http://localhost:8081/promotions/upload",
                    formData,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                        withCredentials: true,
                    }
                );

                if (response.data.url) {
                    success(response.data.url);
                    const editor = window.tinymce?.activeEditor;
                    const images = editor?.getBody()?.querySelectorAll('img[src^="blob:"]');
                    if (images && images.length > 0) {
                        images[images.length - 1].setAttribute("src", response.data.url);
                    }
                } else {
                    failure("Ошибка при загрузке изображения.");
                }
            } catch (error) {
                failure("Ошибка сети: " + (error.response?.data?.message || error.message));
            }
        },
        file_picker_callback: (callback, value, meta) => {
            if (meta.filetype === "image") {
                const input = document.createElement("input");
                input.setAttribute("type", "file");
                input.setAttribute("accept", "image/*");
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append("image", file);

                    try {
                        const response = await axios.post(
                            "http://localhost:8081/promotions/upload",
                            formData,
                            {
                                headers: { "Content-Type": "multipart/form-data" },
                                withCredentials: true,
                            }
                        );

                        if (response.data.url) {
                            callback(response.data.url);
                        } else {
                            alert("Ошибка загрузки изображения.");
                        }
                    } catch (error) {
                        alert("Ошибка сети: " + (error.response?.data?.message || error.message));
                    }
                };
                input.click();
            }
        },
    };

    const handlePreview = () => {
        navigate('/promotions', { state: { previewPromotion: { ...form, isPreview: true } } });
    };


    return (
        <>
            <Header />
            <Container className="mt-4">
                <Row className="align-items-center mb-3">
                    <Col>
                        <Button variant="link" onClick={() => navigate('/admin')} className="me-3">
                            <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                        </Button>
                    </Col>
                    <Col><h2>Управление акциями</h2></Col>
                    <Col className="text-end">
                        <Button onClick={() => setShowModal(true)}>
                            <PlusCircle className="me-2" size={18} /> Добавить
                        </Button>
                    </Col>
                </Row>

                <Row className="mb-3">
                    <Col md={6}>
                        <InputGroup>
                            <Form.Control
                                placeholder="Поиск по названию..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <InputGroup.Text><Search size={16} /></InputGroup.Text>
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option>Все</option>
                            <option>Активные</option>
                            <option>Архивные</option>
                        </Form.Select>
                    </Col>
                </Row>

                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>Цели</th>
                            <th>Скидка</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {handleSearch().map((promo) => (
                            <tr key={promo._id}>
                                <td>{promo.name}</td>
                                <td>{promo.description || "—"}</td>
                                <td>
                                    {promo.targets?.length > 0 ? (
                                        <Button variant="link" size="sm" onClick={() => handleViewTargets(promo.targets)}>
                                            {promo.targets.length} целей
                                        </Button>
                                    ) : "—"}
                                </td>
                                <td>
                                    {promo.discount_type === "Процент" ? (
                                        `${promo.discount_value}%`
                                    ) : promo.discount_type === "Фиксированная сумма" ? (
                                        `${promo.discount_value}₽`
                                    ) : promo.discount_type === "Подарок" ? (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => navigate(`/products/${promo.gift_product_id}`)}
                                        >
                                            Подарок
                                        </Button>
                                    ) : (
                                        "—"
                                    )}
                                </td>

                                <td>
                                    {promo.is_active ? <Badge bg="success">Активна</Badge> : <Badge bg="secondary">Архив</Badge>}
                                </td>
                                <td>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleEdit(promo)}
                                    >
                                        <Edit size={16} />
                                    </Button>{" "}
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDelete(promo._id)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>{" "}
                                    <Button
                                        variant={promo.is_active ? "outline-secondary" : "outline-success"}
                                        size="sm"
                                        onClick={promo.is_active ? () => handleArchive(promo._id) : () => handleRestore(promo._id)}
                                        title={promo.is_active ? "Архивировать" : "Восстановить"}
                                    >
                                        {promo.is_active ? <Archive size={16} /> : "↩️"}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {/* Модальное окно для создания/редактирования */}
                <Modal show={showModal} onHide={() => setShowModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>{editingPromo ? "Редактировать акцию" : "Новая акция"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Название</Form.Label>
                                <Form.Control
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Описание</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Цвет фона</Form.Label>
                                <Form.Control
                                    type="color"
                                    value={form?.background_color}
                                    onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                                    className="w-16 h-10 border rounded"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Баннер акции</Form.Label>
                                <Editor
                                    apiKey="vpsd2vjqb6ui9zdzf47cra1ldlwr2xfpdljq467n10os4zvr"
                                    value={form.banner || ""}
                                    onEditorChange={(content) => setForm({ ...form, banner: content })}
                                    init={editorInit}
                                />
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => handlePreview()}>
                                    Предпросмотр
                                </Button>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Тип скидки</Form.Label>
                                <Form.Select
                                    value={form.discount_type}
                                    onChange={(e) => setForm({ ...form, discount_type: e.target.value, gift_product_id: null })}
                                >
                                    <option value="Процент">Процент</option>
                                    <option value="Фиксированная сумма">Фиксированная сумма</option>
                                    <option value="Подарок">Подарок</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Целевые товары</Form.Label>
                                <Select
                                    isMulti
                                    placeholder="Введите..."
                                    options={products.map(p => ({ value: { product_id: p._id }, label: p.name }))}
                                    value={(form.targets || []).filter(t => t.product_id).map(t => ({
                                        value: t,
                                        label: products.find(p => p._id === t.product_id)?.name || "Не найдено"
                                    }))}
                                    onChange={(selected) => {
                                        const newTargets = selected.map(s => s.value);
                                        const otherTargets = form.targets.filter(t => !t.product_id);
                                        setForm({ ...form, targets: [...newTargets, ...otherTargets] });
                                    }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Целевые категории</Form.Label>
                                <Select
                                    isMulti
                                    placeholder="Введите..."
                                    options={categories.map(c => ({ value: { category_id: c._id }, label: c.name }))}
                                    value={(form.targets || []).filter(t => t.category_id).map(t => ({
                                        value: t,
                                        label: categories.find(c => c._id === t.category_id)?.name || "Не найдено"
                                    }))}
                                    onChange={(selected) => {
                                        const newTargets = selected.map(s => s.value);
                                        const otherTargets = form.targets.filter(t => !t.category_id);
                                        setForm({ ...form, targets: [...newTargets, ...otherTargets] });
                                    }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Целевые бренды</Form.Label>
                                <Select
                                    isMulti
                                    placeholder="Введите..."
                                    options={brands.map(b => ({ value: { brand_name: b }, label: b }))}
                                    value={(form.targets || []).filter(t => t.brand_name).map(t => ({
                                        value: t,
                                        label: t.brand_name
                                    }))}
                                    onChange={(selected) => {
                                        const newTargets = selected.map(s => s.value);
                                        const otherTargets = form.targets.filter(t => !t.brand_name);
                                        setForm({ ...form, targets: [...newTargets, ...otherTargets] });
                                    }}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Значение скидки</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.discount_value}
                                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                                />
                            </Form.Group>
                            {form.discount_type === "Подарок" && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Подарочный товар</Form.Label>
                                    <Select
                                        isClearable
                                        options={products.map((p) => ({ value: p._id, label: p.name }))}
                                        value={products.find((p) => p._id === form.gift_product_id)
                                            ? { value: form.gift_product_id, label: products.find((p) => p._id === form.gift_product_id).name }
                                            : null}
                                        onChange={(selected) => setForm({ ...form, gift_product_id: selected ? selected.value : null })}
                                    />
                                </Form.Group>
                            )}
                            <Form.Group className="mb-3">
                                <Form.Label>Дата начала</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={form.start_date?.substring(0, 10)}
                                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Дата окончания</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={form.end_date?.substring(0, 10)}
                                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Минимальная сумма заказа</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.min_order_amount}
                                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Максимальная сумма скидки</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.max_discount}
                                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                                />
                            </Form.Group>
                            <Form.Check
                                type="checkbox"
                                label="Активна"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                className="mb-2"
                            />
                            <Form.Check
                                type="checkbox"
                                label="Комбинируется с другими акциями"
                                checked={form.is_combinable}
                                onChange={(e) => setForm({ ...form, is_combinable: e.target.checked })}
                            />
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Отмена</Button>
                        <Button onClick={handleSave}>Сохранить</Button>
                    </Modal.Footer>
                </Modal>
                {/* Модальное окно для просмотро товаров подходящих под акцию */}
                <Modal show={showTargetsModal} onHide={() => setShowTargetsModal(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Товары, подходящие под акцию</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {matchedProducts.length === 0 ? (
                            <p>Нет подходящих товаров</p>
                        ) : (
                            <ul className="list-group">
                                {matchedProducts.map((product) => (
                                    <li key={product._id} className="list-group-item">
                                        {product.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowTargetsModal(false)}>Закрыть</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
            <Footer />
        </>
    );
}

export default AdminPromotionsPage;
