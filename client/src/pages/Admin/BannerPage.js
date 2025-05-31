import React, { useState, useEffect } from "react";
import { Container, Card, Button, Table, Modal, Form, Image, ListGroup } from "react-bootstrap";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react"; // Убедись, что импорт добавлен


const BannerPage = () => {
    const [banners, setBanners] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [productSuggestions, setProductSuggestions] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allPromotions, setAllPromotions] = useState([]);
    const searchTimeoutRef = useRef(null);

    const navigate = useNavigate();

    const location = useLocation();
    const returnToEdit = location.state?.returnToEdit;

    useEffect(() => {
        if (returnToEdit) {
            setSelectedBanner(returnToEdit); // state в модалке
            setShowModal(true); // открыть модалку сразу
        }
    }, [returnToEdit]);

    useEffect(() => {
        fetchBanners();
        fetchProducts();
        fetchPromotions();
    }, []);

    useEffect(() => {
        const editor = window.tinymce?.activeEditor;
        if (editor && editor.getBody()) {
            editor.getBody().style.backgroundColor = selectedBanner?.background_color || "#ffffff";
        }

    }, [selectedBanner?.background_color]);


    const fetchBanners = async () => {
        try {
            const response = await axios.get("http://localhost:8081/banners");
            setBanners(response.data);
        } catch (error) {
            console.error("Ошибка загрузки баннеров:", error);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get("http://localhost:8081/products");
            setAllProducts(res.data || []);
        } catch (error) {
            console.error("Ошибка загрузки товаров:", error);
        }
    };

    const fetchPromotions = async () => {
        try {
            const res = await axios.get("http://localhost:8081/promotions");
            setAllPromotions(res.data || []);
        } catch (error) {
            console.error("Ошибка загрузки акций:", error);
        }
    };

    // Обработка поиска по вводу
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSelectedBanner({ ...selectedBanner, link: "" });

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            const productResults = allProducts.filter(p =>
                p.name.toLowerCase().includes(value.toLowerCase())
            );

            const promotionResults = allPromotions.filter(promo =>
                promo.name.toLowerCase().includes(value.toLowerCase())
            );

            const combinedResults = [
                ...productResults.slice(0, 5).map(item => ({ ...item, type: "product" })),
                ...promotionResults.slice(0, 5).map(item => ({ ...item, type: "promotion" })),
            ];

            setProductSuggestions(combinedResults.slice(0, 5)); // показываем только 5 первых
        }, 300);
    };

    // Обработка выбора
    const handleProductSelect = (item) => {
        setSearchTerm(item.name);
        setProductSuggestions([]);

        const link =
            item.type === "promotion"
                ? `/catalog/promotion/${item._id}`
                : `/products/${item._id}`;

        setSelectedBanner({
            ...selectedBanner,
            link,
        });
    };

    // BannerBox компонент:
    const BannerBox = ({ value, full = false, fullHeight = false }) => (
        <div
            onClick={() => setSelectedBanner({ ...selectedBanner, priority: value })}
            className={`p-3 text-center border rounded cursor-pointer ${selectedBanner?.priority === value ? "bg-dark text-white" : "bg-light"}`}
            style={{
                width: full ? "100%" : "100%",  // Grid сам регулирует ширину
                height: fullHeight ? "100%" : "auto"
            }}
        >
            Баннер {value}
        </div>
    );

    const handleEdit = (banner) => {
        setSelectedBanner(banner);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Удалить этот баннер?")) {
            try {
                await axios.delete(`http://localhost:8081/banners/${id}`);
                fetchBanners();
            } catch (error) {
                console.error("Ошибка удаления:", error);
            }
        }
    };

    const handleCreateNew = () => {
        setSelectedBanner(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        // Пример отправки на сервер
        try {
            console.log("selectedBanner:", selectedBanner)
            // Переход на главную с передачей временного баннера
            navigate('/', {
                state: {
                    previewBanner: selectedBanner, // ещё не сохранён
                    previewPosition: selectedBanner.priority
                }
            });
        } catch (error) {
            console.error("Ошибка при сохранении баннера:", error);
        }
    };

    const editorInit = {
        content_style: `body { background-color: ${selectedBanner?.background_color || "#ffffff"};}`,
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
                    "http://localhost:8081/banners/upload",
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
                            "http://localhost:8081/banners/upload",
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

    // Функция для удаления HTML-тегов
    const stripHtml = (html) => {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent || div.innerText || "";
    };

    // Функция для извлечения первой картинки из HTML-содержимого
    const extractImageFromHtml = (html) => {
        const div = document.createElement("div");
        div.innerHTML = html;
        const img = div.querySelector("img");
        return img ? img.src : null;
    };

    return (
        <>
            <Header />
            <Container className="mt-4">
                <Card className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Button variant="link" onClick={() => navigate("/admin")} className="me-3">
                            <FaArrowLeft style={{ color: "#333", fontSize: "24px" }} />
                        </Button>
                        <h4 className="mb-0">Управление баннерами</h4>
                        <Button variant="dark" onClick={handleCreateNew}>
                            Создать новый баннер
                        </Button>
                    </div>
                    <Table bordered hover responsive size="sm" className="text-center align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Превью</th>
                                <th>Заголовок</th>
                                <th>Ссылка</th>
                                <th>Страница</th>
                                <th>Приоритет</th>
                                <th>Даты</th>
                                <th>Активен</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {banners.length > 0 ? (
                                banners.map((banner, index) => {
                                    const previewImage = extractImageFromHtml(banner.title);
                                    const plainTitle = stripHtml(banner.title);
                                    return (
                                        <tr key={banner._id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                {previewImage && (
                                                    <Image
                                                        src={previewImage}
                                                        alt="Баннер"
                                                        width={100}
                                                        height="auto"
                                                        thumbnail
                                                    />
                                                )}
                                            </td>
                                            <td>{plainTitle}</td>
                                            <td>
                                                <Button
                                                    size="m"
                                                    variant="outline-dark"
                                                    className="me-2"
                                                    onClick={() => navigate(banner.link)}
                                                >
                                                    {banner.link.includes('/products/') ? 'Товар' : 'Акция'}
                                                </Button>
                                            </td>
                                            <td>{banner.position === 'index' ? "Главная страница" : (banner.position === 'header' ? 'Шапка сайта' : '')}</td>
                                            <td>{banner.priority}</td>
                                            <td>
                                                {new Date(banner.start_date).toLocaleDateString()} —{" "}
                                                {new Date(banner.end_date).toLocaleDateString()}
                                            </td>
                                            <td>{banner.is_active ? "Да" : "Нет"}</td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    variant="outline-dark"
                                                    className="me-2"
                                                    onClick={() => handleEdit(banner)}
                                                >
                                                    Изменить
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => handleDelete(banner._id)}
                                                >
                                                    Удалить
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="9">Баннеры не найдены</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card>
                {/* Модальное окно для создания/редактирования баннера */}
                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>{selectedBanner ? "Редактировать баннер" : "Создать баннер"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group controlId="bannerLink" className="mb-3 position-relative">
                                <Form.Label>Товар или акция (для ссылки)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Введите название товара"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    autoComplete="off"
                                />
                                {productSuggestions.length > 0 && (
                                    <ListGroup className="position-absolute w-100 z-3 shadow-sm" style={{ top: "100%", maxHeight: 200, overflowY: "auto" }}>
                                        {productSuggestions.map(item => (
                                            <ListGroup.Item
                                                key={item._id}
                                                action
                                                onClick={() => handleProductSelect(item)}
                                            >
                                                [{item.type === "promotion" ? "Акция" : "Товар"}] {item.name}
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                )}
                            </Form.Group>
                            <Form.Group controlId="bannerPosition" className="mb-3">
                                <Form.Label>Позиция отображения</Form.Label>
                                <Form.Select
                                    value={selectedBanner?.position || ""}
                                    onChange={(e) =>
                                        setSelectedBanner({ ...selectedBanner, position: e.target.value })
                                    }
                                    required
                                >
                                    <option value="">Выберите позицию</option>
                                    <option value="index">Главная страница</option>
                                    <option value="header">Шапка</option>
                                </Form.Select>
                            </Form.Group>
                            {selectedBanner?.position && (
                                <Form.Group controlId="bannerPriority" className="mb-3">
                                    <Form.Label>Приоритет</Form.Label>

                                    {selectedBanner?.position === "header" ? (
                                        <Form.Control
                                            type="number"
                                            value={0}
                                            readOnly
                                            plaintext
                                            className="bg-light"
                                        />
                                    ) : (
                                        <>
                                            <div className="mb-2 text-muted">Выберите баннер на макете главной страницы</div>

                                            {/* Баннер 1 */}
                                            <div className="mb-3">
                                                <BannerBox value={11} full />
                                            </div>

                                            {/* Секция 2 */}
                                            <div
                                                className="mb-3"
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "2fr 1fr", // Левая и правая часть
                                                    gridTemplateRows: "1fr 1fr",    // Верх и низ
                                                    gap: "12px",
                                                    alignItems: "stretch"
                                                }}
                                            >
                                                {/* Баннер 21 - верхняя левая часть (2/3 ширины) */}
                                                <div style={{ gridColumn: "1", gridRow: "1" }}>
                                                    <BannerBox value={21} fullHeight />
                                                </div>

                                                {/* Баннер 22 - правая колонка на 2 строки (1/3 ширины, высота = 21 + 23/24 + gap) */}
                                                <div style={{ gridColumn: "2", gridRow: "1 / span 2" }}>
                                                    <BannerBox value={22} fullHeight />
                                                </div>

                                                {/* Баннеры 23 и 24 - нижний левый ряд (по 1/2 ширины от левой части) */}
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", gridColumn: "1", gridRow: "2" }}>
                                                    <BannerBox value={23} />
                                                    <BannerBox value={24} />
                                                </div>
                                            </div>

                                            {/* Секция 3: баннеры в одну строку */}
                                            <div className="d-flex gap-3 mb-3 flex-nowrap">
                                                {[31, 32, 33, 34].map((v) => (
                                                    <BannerBox key={v} value={v} />
                                                ))}
                                            </div>

                                            {/* Баннер 41 */}
                                            <div>
                                                <BannerBox value={41} full />
                                            </div>
                                        </>
                                    )}
                                </Form.Group>
                            )}
                            <Form.Group controlId="bannerBackgroundColor" className="mb-3">
                                <Form.Label>Цвет фона</Form.Label>
                                <Form.Control
                                    type="color"
                                    value={selectedBanner?.background_color}
                                    onChange={(e) => setSelectedBanner({ ...selectedBanner, background_color: e.target.value })}
                                    className="w-16 h-10 border rounded"
                                />
                            </Form.Group>
                            <Form.Group controlId="bannerTitle" className="mb-3">
                                <Form.Label>Баннер</Form.Label>
                                <Editor
                                    apiKey="vpsd2vjqb6ui9zdzf47cra1ldlwr2xfpdljq467n10os4zvr"
                                    value={selectedBanner?.title || ""}
                                    onEditorChange={(content) =>
                                        setSelectedBanner({ ...selectedBanner, title: content })
                                    }
                                    init={editorInit}
                                />
                            </Form.Group>
                            <Form.Group controlId="bannerStartDate" className="mb-3">
                                <Form.Label>Дата начала</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={selectedBanner?.start_date?.slice(0, 10) || ""}
                                    onChange={(e) => setSelectedBanner({ ...selectedBanner, start_date: e.target.value })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId="bannerEndDate" className="mb-3">
                                <Form.Label>Дата окончания</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={selectedBanner?.end_date?.slice(0, 10) || ""}
                                    onChange={(e) => setSelectedBanner({ ...selectedBanner, end_date: e.target.value })}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId="bannerActive" className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Активен"
                                    checked={selectedBanner?.is_active || false}
                                    onChange={(e) => setSelectedBanner({ ...selectedBanner, is_active: e.target.checked })}
                                />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Отмена
                        </Button>
                        <Button variant="dark" onClick={handleSave}>
                            Предпросмотр
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
            <Footer />
        </>
    );
};

export default BannerPage;
