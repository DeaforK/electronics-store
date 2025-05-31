import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash } from 'react-icons/fa';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';

const DeliveryMethodsPage = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingMethod, setEditingMethod] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        base_cost: '',
        delivery_time_days: { min: '', max: '' },
        distance_limit_km: null,
        type: 'Курьерская',
        zone: 'Локальная',
        free_from: null,
        conditions: [],
        active: true
    });
    const [adminId, setAdminId] = useState([]);

    const navigate = useNavigate();

    const fetchMethods = async () => {
        try {
            const res = await axios.get('http://localhost:8081/delivery-methods');
            console.log(res.data)
            setMethods(res.data);
        } catch (err) {
            setError('Ошибка при загрузке методов доставки');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/admin', { withCredentials: true });
                if (userResponse.data.user.role === 'admin') {
                    setAdminId(userResponse.data.user.userId);
                } else {
                    navigate('/login');
                }
            } catch (error) {
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'min_days' || name === 'max_days') {
            setFormData(prev => ({
                ...prev,
                delivery_time_days: {
                    ...prev.delivery_time_days,
                    [name === 'min_days' ? 'min' : 'max']: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleConditionChange = (index, e) => {
        const { name, value } = e.target;
        const updatedConditions = [...formData.conditions];
        updatedConditions[index][name] = value;
        setFormData(prev => ({ ...prev, conditions: updatedConditions }));
    };

    const addCondition = () => {
        setFormData(prev => ({
            ...prev,
            conditions: [...prev.conditions, { condition_type: '', min: '', max: '', cost_modifier: '' }]
        }));
    };

    const removeCondition = (index) => {
        const updatedConditions = formData.conditions.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, conditions: updatedConditions }));
    };

    const handleSubmit = async () => {
        try {
            formData.user_id = adminId;
            if (formData.distance_limit_km === '') {
                formData.distance_limit_km = null;
            }
            if (formData.free_from === '') {
                formData.free_from = null;
            }
            console.log(formData)
            if (editingMethod) {
                await axios.put(`http://localhost:8081/delivery-methods/${editingMethod._id}`, formData);
            } else {
                await axios.post('http://localhost:8081/delivery-methods', formData);
            }
            setShowModal(false);
            setEditingMethod(null);
            setFormData({ name: '', base_cost: '', delivery_time_days: { min: '', max: '' }, distance_limit_km: null, type: 'Курьерская', zone: 'Локальная', free_from: null, conditions: [], active: true });
            fetchMethods();
        } catch (err) {
            setError('Ошибка при сохранении метода доставки');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить этот метод доставки?')) {
            try {
                await axios.delete(`http://localhost:8081/delivery-methods/${id}`, { params: { user_id: adminId } });
                fetchMethods();
            } catch (err) {
                setError('Ошибка при удалении метода доставки');
            }
        }
    };

    const handleEdit = (method) => {
        setEditingMethod(method);
        setFormData({
            name: method.name,
            base_cost: method.base_cost?.$numberDecimal || '',
            delivery_time_days: {
                min: method.delivery_time_days.min,
                max: method.delivery_time_days.max
            },
            distance_limit_km: method.distance_limit_km?.$numberDecimal || null,
            type: method.type,
            zone: method.zone,
            free_from: method.free_from?.$numberDecimal || null,
            conditions: method.conditions || [],
            active: method.active
        });
        setShowModal(true);
    };

    return (
        <>
            <Header />
            <Container className="mt-4">
                <Row className="align-items-center mb-4">
                    <Col xs="auto">
                        <Button variant="link" onClick={() => navigate('/admin')}>
                            <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                        </Button>
                    </Col>
                    <Col className="text-center">
                        <h2>Управление методами доставки</h2>
                    </Col>
                    <Col xs="auto" className="text-end">
                        <Button variant="success" onClick={() => {
                            setEditingMethod(null);
                            setFormData({ name: '', base_cost: '', delivery_time_days: { min: '', max: '' }, distance_limit_km: '', type: 'Курьерская', zone: 'Локальная', free_from: '', conditions: [], active: true });
                            setShowModal(true);
                        }}>
                            Добавить метод
                        </Button>
                    </Col>
                </Row>

                {error && <Alert variant="danger">{error}</Alert>}

                <Table bordered hover>
                    <thead>
                        <tr>
                            <th>Название</th>
                            <th>Тип</th>
                            <th>Зона</th>
                            <th>Базовая цена</th>
                            <th>Время доставки</th>
                            <th>Бесплатно от</th>
                            <th>Ограничение (км)</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {methods.map(method => (
                            <tr key={method._id}>
                                <td>{method.name}</td>
                                <td>{method.type}</td>
                                <td>{method.zone}</td>
                                <td>{method.base_cost?.$numberDecimal} ₽</td>
                                <td>{method.delivery_time_days.min}-{method.delivery_time_days.max} дн.</td>
                                <td>{method.free_from?.$numberDecimal || '-'}</td>
                                <td>{method.distance_limit_km?.$numberDecimal || '-'}</td>
                                <td>
                                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(method)}>
                                        <FaEdit />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(method._id)}>
                                        <FaTrash />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>{editingMethod ? 'Редактировать метод' : 'Добавить метод'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Название</Form.Label>
                                <Form.Control name="name" value={formData.name} onChange={handleChange} required />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Тип</Form.Label>
                                <Form.Select name="type" value={formData.type} onChange={handleChange}>
                                    <option value="Курьерская">Курьер</option>
                                    <option value="Самовывоз">Самовывоз</option>
                                    <option value="Почтовая">Почта</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Зона</Form.Label>
                                <Form.Select name="zone" value={formData.zone} onChange={handleChange}>
                                    <option value="Локальная">Локальная</option>
                                    <option value="Региональная">Региональная</option>
                                    <option value="Межрегиональная">Межрегиональная</option>
                                </Form.Select>
                            </Form.Group>
                            <Row className="mb-3">
                                <Col>
                                    <Form.Label>Мин. дней</Form.Label>
                                    <Form.Control name="min_days" type="number" value={formData.delivery_time_days.min} onChange={handleChange} required />
                                </Col>
                                <Col>
                                    <Form.Label>Макс. дней</Form.Label>
                                    <Form.Control name="max_days" type="number" value={formData.delivery_time_days.max} onChange={handleChange} required />
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Базовая стоимость (₽)</Form.Label>
                                <Form.Control name="base_cost" type="number" value={formData.base_cost} onChange={handleChange} required />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Бесплатно от (₽)</Form.Label>
                                <Form.Control name="free_from" type="number" value={formData.free_from} onChange={handleChange} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Ограничение по расстоянию (км)</Form.Label>
                                <Form.Control name="distance_limit_km" type="number" value={formData.distance_limit_km} onChange={handleChange} />
                            </Form.Group>
                            <hr />
                            <h5>Условия</h5>
                            {formData.conditions.map((cond, index) => (
                                <Row key={index} className="align-items-end g-2 mb-2">
                                    <Col md={3}>
                                        <Form.Select name="condition_type" value={cond.condition_type} onChange={e => handleConditionChange(index, e)}>
                                            <option value="">Тип</option>
                                            <option value="Вес">Вес</option>
                                            <option value="Объём">Объём</option>
                                            <option value="Сумма заказа">Сумма заказа</option>
                                            <option value="Расстояние">Расстояние</option>
                                        </Form.Select>
                                    </Col>
                                    <Col><Form.Control name="min" placeholder="Мин." value={cond.min?.$numberDecimal} onChange={e => handleConditionChange(index, e)} /></Col>
                                    <Col><Form.Control name="max" placeholder="Макс." value={cond.max?.$numberDecimal} onChange={e => handleConditionChange(index, e)} /></Col>
                                    <Col><Form.Control name="cost_modifier" placeholder="Доп. стоимость" value={cond.cost_modifier?.$numberDecimal} onChange={e => handleConditionChange(index, e)} /></Col>
                                    <Col xs="auto">
                                        <Button variant="danger" size="sm" onClick={() => removeCondition(index)}>-</Button>
                                    </Col>
                                </Row>
                            ))}
                            <Button variant="outline-secondary" onClick={addCondition}>Добавить условие</Button>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Отмена</Button>
                        <Button variant="primary" onClick={handleSubmit}>Сохранить</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
            <Footer />
        </>
    );
};

export default DeliveryMethodsPage;
