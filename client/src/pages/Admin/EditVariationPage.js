// client/src/pages/EditVariationPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';

function EditVariationPage() {
    const { id } = useParams(); // ID редактируемой вариации из URL
    const [products, setProducts] = useState([]);  // Список товаров для выпадающего списка
    const [productId, setProductId] = useState(''); // Выбранный товар
    const [attributes, setAttributes] = useState([]); // Атрибуты как массив объектов
    const [quantity, setQuantity] = useState(''); // Количество
    const [error, setError] = useState(''); // Ошибки для валидации
    const navigate = useNavigate();

    // Получение списка товаров и вариации при загрузке страницы
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('http://localhost:8081/products', { withCredentials: true });
                setProducts(response.data.data || []);
            } catch (error) {
                console.error('Ошибка при загрузке товаров:', error);
            }
        };

        const fetchVariation = async () => {
            try {
                const response = await axios.get(`http://localhost:8081/variations/${id}`, { withCredentials: true });
                const { product_id, attributes, quantity } = response.data.data;

                setProductId(product_id); // Заполнение текущего товара
                
                // Проверка и преобразование attributes в массив, если это не массив
                const parsedAttributes = Array.isArray(attributes) ? attributes : JSON.parse(attributes || '[]');
                setAttributes(parsedAttributes); 
                
                setQuantity(quantity); // Заполнение количества
            } catch (error) {
                console.error('Ошибка при загрузке вариации товара:', error);
            }
        };

        fetchProducts();
        fetchVariation();
    }, [id]);

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

    // Обработка ввода количества
    const handleQuantityChange = (e) => {
        const value = e.target.value;
        if (Number.isInteger(+value) && +value >= 0) {
            setQuantity(value);
            setError('');
        } else {
            setError('Введите целое число больше 0.');
        }
    };

    // Обновление вариации товара
    const handleUpdateVariation = async () => {
        if (!productId || !quantity || attributes.some(attr => !attr.name || !attr.value)) {
            setError('Все поля должны быть заполнены.');
            return;
        }

        try {
            const updatedVariation = { product_id: productId, attributes, quantity };
            await axios.put(`http://localhost:8081/variations/${id}`, updatedVariation, { withCredentials: true });
            navigate('/admin/variations');
        } catch (error) {
            console.error('Ошибка при обновлении вариации товара:', error);
        }
    };

    return (
        <div className="container mt-5">
            <h2>Редактировать вариацию товара</h2>

            <Form.Group className="mb-3">
                <Form.Label>Товар</Form.Label>
                <Form.Select value={productId} readOnly disabled>
                    {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                </Form.Select>
            </Form.Group>

            <h5>Атрибуты товара</h5>
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

            <Form.Group className="mt-3 mb-3">
                <Form.Label>Количество</Form.Label>
                <Form.Control
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={handleQuantityChange}
                />
                {error && <p className="text-danger">{error}</p>}
            </Form.Group>

            <Button variant="success" onClick={handleUpdateVariation}>Обновить вариацию товара</Button>
        </div>
    );
}

export default EditVariationPage;
