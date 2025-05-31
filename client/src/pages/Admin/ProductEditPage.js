import React, { useState, useEffect } from "react";
import axios from 'axios';
import { Button, Form, Container, Card, Row, Col, Image, Table, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import Notification from '../../components/Layout/Notification';
import { FaArrowLeft } from 'react-icons/fa';
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import { Editor } from "@tinymce/tinymce-react";

const ProductEditPage = () => {
    const [previewImages, setPreviewImages] = useState([]);
    const { id } = useParams();
    const isEditing = !!id;

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategories, setActiveCategories] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState({
        name: '',
        description: '',
        category: '',
        images: [],
        imagesToDelete: [],
        attributes: [],
        bonus_points: 0,
        is_on_sale: false
    });

    const [message, setMessage] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/products/${id}`, { withCredentials: true });
                setSelectedProduct(response.data);
                console.log("Данные товара", response.data)
            } catch (error) {
                setError('Ошибка при загрузке товаров. Попробуйте позже.');
            } finally {
                setLoading(false);
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
        if (id) {
            fetchProducts(id);
        }
        fetchActiveCategories();
    }, [id]);

    useEffect(() => {
        return () => {
            // Освобождаем все URL для избежания утечек памяти
            previewImages.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [products, previewImages]);

    // Функция для сброса уведомления
    const resetMessage = () => {
        setMessage('');
        setError(null);
    };


    useEffect(() => {
        if (selectedProduct?.images && Array.isArray(selectedProduct.images)) {
            const existingImages = selectedProduct.images
                .filter(img => typeof img === "string")
                .map(img => `http://localhost:8081${img}`);

            // Сохраняем старые previewImages (включая blob) + добавляем новые
            setPreviewImages(prev => {
                const blobUrls = prev.filter(img => img.startsWith("blob:")); // Сохраняем blob-ссылки
                return [...existingImages, ...blobUrls];
            });
        }
    }, [selectedProduct]);

    const updateProductField = (field, value) => {
        setSelectedProduct((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddSection = () => {
        const newAttributes = { ...selectedProduct.attributes, "Новый раздел": {} };
        updateProductField("attributes", newAttributes);
    };

    const handleRemoveSection = (section) => {
        const newAttributes = { ...selectedProduct.attributes };
        delete newAttributes[section];
        updateProductField("attributes", newAttributes);
    };

    const handleAddAttribute = (section) => {
        const newAttributes = { ...selectedProduct.attributes };
        newAttributes[section] = { ...newAttributes[section], "Новый атрибут": "" };
        updateProductField("attributes", newAttributes);
    };


    const handleSaveProduct = async () => {
        try {
            const formData = new FormData();
            formData.append("name", selectedProduct.name);
            formData.append("description", selectedProduct.description); // Уже содержит ссылки на загруженные изображения
            console.log(selectedProduct.description)
            formData.append("categories_id", selectedProduct.categories_id);
            formData.append("attributes", JSON.stringify(selectedProduct.attributes));

            formData.append("bonus_points", selectedProduct.bonus_points || 0);

            if (isEditing) {
                formData.append("is_on_sale", selectedProduct.is_on_sale);
            }

            if (selectedProduct.images && Array.isArray(selectedProduct.images)) {
                selectedProduct.images.forEach((image) => {
                    if (image instanceof File) {
                        formData.append("images", image);
                    }
                });
            }

            if (selectedProduct.imagesToDelete?.length) {
                formData.append("imagesToDelete", JSON.stringify(selectedProduct.imagesToDelete));
            }
            console.log(formData.description)

            if (selectedProduct._id) {
                await axios.put(`http://localhost:8081/products/${selectedProduct._id}`, formData, { withCredentials: true });
            } else {
                const response = await axios.post("http://localhost:8081/products", formData, { withCredentials: true });
                setProducts([...products, response.data]);
            }

            navigate("/admin/products");
        } catch (error) {
            console.log(error);
            setError("Ошибка при сохранении товара. Попробуйте позже.");
        }
    };



    const handleRemoveImage = (src) => {
        if (typeof src !== "string") {
            console.error("Ошибка: src должен быть строкой, но получено:", src);
            return;
        }

        console.log("Удаление изображения:", src);

        setPreviewImages(prev => {
            const updatedPreviews = prev.filter(img => img !== src);
            console.log("Обновленный previewImages:", updatedPreviews);
            return updatedPreviews;
        });

        setSelectedProduct(prev => {
            console.log("Текущее selectedProduct.images:", prev.images);
            console.log("Текущее selectedProduct.imagesToDelete:", prev.imagesToDelete);

            if (src.startsWith("http://localhost:8081")) {
                const imagePath = src.replace("http://localhost:8081", "");
                console.log("Удаляем серверное изображение:", imagePath);

                const updatedImages = prev.images.filter(img => img !== imagePath);
                const updatedImagesToDelete = [...(prev.imagesToDelete || []), imagePath];

                console.log("Обновленный selectedProduct.images:", updatedImages);
                console.log("Обновленный selectedProduct.imagesToDelete:", updatedImagesToDelete);

                return {
                    ...prev,
                    images: updatedImages,
                    imagesToDelete: updatedImagesToDelete,
                };
            } else {
                console.log("Удаляем локальное изображение (blob):", src);

                const updatedImages = prev.images.filter(img =>
                    !(img instanceof File && URL.createObjectURL(img) === src)
                );

                console.log("Обновленный selectedProduct.images:", updatedImages);

                return {
                    ...prev,
                    images: updatedImages,
                };
            }
        });
    };

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);

        // Создаём временные ссылки для предпросмотра
        const newImageUrls = files.map(file => URL.createObjectURL(file));
        console.log("newImageUrls:", newImageUrls);

        // Обновляем previewImages и ждем, пока React обновит состояние
        setPreviewImages(prev => {
            const updatedPreviews = [...prev, ...newImageUrls];
            console.log("Обновленный previewImages:", updatedPreviews); // Теперь правильный лог!
            return updatedPreviews;
        });

        // Обновляем изображения в selectedProduct
        updateProductField("images", [...(selectedProduct.images || []), ...files]);
    };


    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex align-items-center px-4 mt-3 mb-2">
                    <Button
                        variant="link"
                        onClick={() => navigate('/admin/products')}
                        className="me-2 p-0"
                    >
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h1 className="m-0">{isEditing ? "Редактировать товар" : "Добавить товар"}</h1>
                </div>
                {error && <Alert variant="danger">{error}</Alert>}
                {message && (
                    <Notification message={message} onDismiss={resetMessage} />
                )}
                <Container>
                    <Card className="mt-4 p-4">
                        <Form>
                            <Row>
                                <Form.Group controlId="formProductName">
                                    <Form.Label>Название товара</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={selectedProduct?.name || ""}
                                        onChange={(e) => updateProductField("name", e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group controlId="formProductDescription" className="mt-3 mb-3">
                                    <Form.Label>Описание товара</Form.Label>
                                    <Editor
                                        apiKey="vpsd2vjqb6ui9zdzf47cra1ldlwr2xfpdljq467n10os4zvr"
                                        value={selectedProduct.description || ""}
                                        onEditorChange={(content) => updateProductField("description", content)}
                                        init={{
                                            height: 400,
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
                                            image_advtab: true,
                                            file_picker_types: "image",
                                            automatic_uploads: true,

                                            // 🔹 Обработчик загрузки изображений
                                            automatic_uploads: true,
                                            images_upload_handler: async (blobInfo, success, failure) => {
                                                try {
                                                    const formData = new FormData();
                                                    formData.append("image", blobInfo.blob(), blobInfo.filename());

                                                    const response = await axios.post(
                                                        "http://localhost:8081/products/upload",
                                                        formData,
                                                        {
                                                            headers: { "Content-Type": "multipart/form-data" },
                                                            withCredentials: true
                                                        }
                                                    );

                                                    if (response.data.url) {
                                                        success(response.data.url); // TinyMCE вставит в редактор
                                                        // 💡 Дополнительно вручную заменим blob: ссылку в редакторе
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
                                                                "http://localhost:8081/products/upload",
                                                                formData,
                                                                {
                                                                    headers: { "Content-Type": "multipart/form-data" },
                                                                    withCredentials: true
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
                                            }
                                        }}
                                    />
                                </Form.Group>
                                <Col md={6}>
                                    <Form.Group controlId="formProductCategory">
                                        <Form.Label>Категория</Form.Label>
                                        <Form.Select
                                            value={selectedProduct?.categories_id || ""}
                                            onChange={(e) => updateProductField("categories_id", e.target.value)}
                                            required
                                        >
                                            <option value="">Выберите категорию</option>
                                            {activeCategories?.map((category) => (
                                                <option key={category._id} value={category._id}>{category.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>

                                    <Form.Group controlId="formProductBonusPoints">
                                        <Form.Label>Бонусные баллы</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={selectedProduct?.bonus_points || 0}
                                            onChange={(e) => updateProductField("bonus_points", Number(e.target.value))}
                                        />
                                    </Form.Group>
                                    {isEditing && selectedProduct?.is_on_sale ? (
                                        <Form.Group controlId="formProductIsOnSale" className="mb-3">
                                            <Form.Check
                                                type="checkbox"
                                                label="Участвует в акции"
                                                checked={selectedProduct?.is_on_sale || false}
                                                onChange={(e) => updateProductField("is_on_sale", e.target.checked)}
                                            />
                                        </Form.Group>
                                    ) : (<></>)}
                                </Col>

                                <Col md={6}>
                                    <Form.Group controlId="formProductImages">
                                        <Form.Label>Изображения</Form.Label>
                                        <Form.Control type="file" multiple onChange={handleImageUpload} />
                                        <div className="d-flex flex-wrap mt-2">
                                            {previewImages.length > 0 ? (
                                                previewImages.map((src, index) => (
                                                    <div key={index} className="position-relative m-2">
                                                        <Image src={src} alt={`Предпросмотр ${index + 1}`} thumbnail style={{ width: "100px", height: "100px" }} />
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            className="position-absolute top-0 end-0"
                                                            onClick={() => handleRemoveImage(src)}
                                                        >
                                                            &times;
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p>Изображения отсутствуют</p>
                                            )}
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group controlId="formProductAttributes" className="mt-4">
                                <Form.Label>Характеристики</Form.Label>
                                {selectedProduct?.attributes &&
                                    Object.entries(selectedProduct.attributes).map(([section, attributes], sectionIndex) => (
                                        <div key={sectionIndex} className="mb-3">
                                            <div className="d-flex align-items-center">
                                                <Form.Control
                                                    type="text"
                                                    value={section}
                                                    onFocus={(e) => {
                                                        if (e.target.value === "Новый раздел") {
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const newSectionName = e.target.value.trim();
                                                        if (!newSectionName) return; // Если строка пустая, ничего не делаем
                                                        if (newSectionName === section) return; // Если имя не изменилось, ничего не делаем

                                                        const newAttributes = { ...selectedProduct.attributes };
                                                        delete newAttributes[section]; // Удаляем старое название
                                                        newAttributes[newSectionName] = attributes; // Создаём с новым названием
                                                        const newSection = e.target.value;
                                                        if (newSection) {
                                                            delete newAttributes[section];
                                                            newAttributes[newSection] = attributes;
                                                            updateProductField("attributes", newAttributes);
                                                        }
                                                    }}
                                                    className="me-2"
                                                />
                                                <Button variant="danger" onClick={() => handleRemoveSection(section)}>Удалить раздел</Button>
                                            </div>
                                            <Table bordered>
                                                <thead>
                                                    <tr>
                                                        <th>Атрибут</th>
                                                        <th>Значение</th>
                                                        <th>Действие</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attributes &&
                                                        Object.entries(attributes).map(([key, value], index) => (
                                                            <tr key={index}>
                                                                <td>
                                                                    <Form.Control
                                                                        type="text"
                                                                        value={key}
                                                                        onChange={(e) => {
                                                                            const newAttributes = { ...selectedProduct.attributes };
                                                                            const newKey = e.target.value;
                                                                            if (newKey) {
                                                                                delete newAttributes[section][key];
                                                                                newAttributes[section][newKey] = value;
                                                                                updateProductField("attributes", newAttributes);
                                                                            }
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Form.Control
                                                                        type="text"
                                                                        value={value}
                                                                        onChange={(e) => {
                                                                            const newAttributes = { ...selectedProduct.attributes };
                                                                            newAttributes[section][key] = e.target.value;
                                                                            updateProductField("attributes", newAttributes);
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Button
                                                                        variant="danger"
                                                                        onClick={() => {
                                                                            const newAttributes = { ...selectedProduct.attributes };
                                                                            delete newAttributes[section][key];
                                                                            updateProductField("attributes", newAttributes);
                                                                        }}
                                                                    >Удалить</Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </Table>
                                            <Button variant="primary" onClick={() => handleAddAttribute(section)}>Добавить атрибут</Button>
                                        </div>
                                    ))}
                                <Button variant="success" onClick={handleAddSection}>Добавить раздел</Button>
                            </Form.Group>
                            <Button variant="primary" className="mt-3" onClick={handleSaveProduct}>Сохранить изменения</Button>
                        </Form>
                    </Card>
                </Container >
            </div>
            <Footer />
        </>
    );
};

export default ProductEditPage;
