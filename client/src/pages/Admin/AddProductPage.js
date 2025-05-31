import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function AddProductPage() {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [discount, setDiscount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState([]);
    const [images, setImages] = useState([]);
    const [attributes, setAttributes] = useState([]); // Новое поле для атрибутов
    const [error, setError] = useState(null);
    const [imageError, setImageError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get('http://localhost:8081/categories', { withCredentials: true });
                if (Array.isArray(response.data)) {
                    setCategories(response.data);
                }
            } catch (error) {
                console.error('Ошибка при загрузке категорий:', error);
            }
        };

        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (images.length > 5) {
            setImageError('Вы можете загрузить не более 5 изображений.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', parseFloat(price));
        formData.append('description', description);
        formData.append('discount', parseFloat(discount));
        formData.append('category_id', categoryId);
        formData.append('attributes', JSON.stringify(attributes)); // Добавляем атрибуты как JSON строку

        // Добавляем все выбранные изображения в formData
        for (let i = 0; i < images.length; i++) {
            formData.append('images', images[i]);
        }

        try {
            const response = await axios.post('http://localhost:8081/products', formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.status === 201) {
                navigate('/admin/products');
            }
        } catch (error) {
            setError('Ошибка при добавлении товара. Попробуйте еще раз.');
            console.error('Ошибка:', error);
        }
    };

    const handleImageChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 5) {
            setImageError('Вы можете загрузить не более 5 изображений.');
        } else {
            setImages(selectedFiles);
            setImageError(null);
        }
    };

    // Добавление новой строки для атрибута
    const handleAddAttribute = () => {
        setAttributes([...attributes, { name: '', value: '' }]);
    };

    // Удаление строки атрибута по индексу
    const handleDeleteAttribute = (index) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    // Обновление атрибута по индексу
    const handleAttributeChange = (index, field, value) => {
        const updatedAttributes = [...attributes];
        updatedAttributes[index][field] = value;
        setAttributes(updatedAttributes);
    };

    return (
        <div>
            <h1>Добавить новый товар</h1>
            {error && <Alert variant="danger">{error}</Alert>}
            {imageError && <Alert variant="warning">{imageError}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="name">
                    <Form.Label>Название товара</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Введите название"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="price" className="mt-3">
                    <Form.Label>Цена</Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="Введите цену"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group controlId="description" className="mt-3">
                    <Form.Label>Описание</Form.Label>
                    <Form.Control
                        as="textarea"
                        placeholder="Введите описание"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Form.Group>

                <Form.Group controlId="discount" className="mt-3">
                    <Form.Label>Скидка (%)</Form.Label>
                    <Form.Control
                        type="number"
                        placeholder="Введите скидку"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                    />
                </Form.Group>

                <Form.Group controlId="category" className="mt-3">
                    <Form.Label>Категория</Form.Label>
                    <Form.Control
                        as="select"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                    >
                        <option value="">Выберите категорию</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </Form.Control>
                </Form.Group>

                <Form.Group controlId="images" className="mt-3">
                    <Form.Label>Изображения</Form.Label>
                    <Form.Control type="file" name='images' multiple onChange={handleImageChange} />
                </Form.Group>

                <h5 className="mt-4">Атрибуты товара</h5>
                <Table bordered>
                    <thead>
                        <tr>
                            <th>Название атрибута</th>
                            <th>Значение атрибута</th>
                            <th>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attributes.map((attribute, index) => (
                            <tr key={index}>
                                <td>
                                    <Form.Control
                                        type="text"
                                        value={attribute.name}
                                        onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="text"
                                        value={attribute.value}
                                        onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Button variant="danger" onClick={() => handleDeleteAttribute(index)}>Удалить</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                <Button variant="secondary" onClick={handleAddAttribute}>Добавить атрибут</Button>

                <Button variant="primary" type="submit" className="mt-3">
                    Добавить товар
                </Button>
            </Form>
        </div>
    );
}

export default AddProductPage;
