import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Form, Button, Alert, Spinner, Image, Modal, Accordion } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaSignOutAlt } from 'react-icons/fa'; // Для иконок
import { YMaps, Map } from '@pbe/react-yandex-maps';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';

function ProfilePage() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [orders, setOrders] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showOrders, setShowOrders] = useState(false); // Новое состояние для отображения заказов

    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddressIndex, setEditingAddressIndex] = useState(null);
    const [addressForm, setAddressForm] = useState({
        label: '',
        address: '',
        latitude: '',
        longitude: '',
        is_default: false,
    });
    const [bonusHistory, setBonusHistory] = useState([]);
    const [addressViewMode, setAddressViewMode] = useState('manual');
    const [showAddresses, setShowAddresses] = useState(false);
    const [showBonusHistory, setShowBonusHistory] = useState(false);

    const navigate = useNavigate();

    axios.defaults.withCredentials = true;

    const fetchAndEnrichDeliveryItems = async (orders) => {
        const variationIdsSet = new Set();

        // Сбор всех variationId
        orders.forEach(order => {
            order.delivery_data?.delivery_parts?.forEach(part => {
                part.items?.forEach(item => {
                    variationIdsSet.add(item.variationId);
                });
            });
        });

        const variationIds = Array.from(variationIdsSet);

        // Запрашиваем данные вариаций
        const variationResponses = await Promise.all(
            variationIds.map(id => axios.get(`http://localhost:8081/product-variations/${id}`, { withCredentials: true }))
        );

        // Создаём карту для быстрого доступа
        const variationMap = {};
        variationResponses.forEach(response => {
            const variation = response.data;
            variationMap[variation._id] = variation;
        });

        // Встраиваем данные в orders
        const enrichedOrders = orders.map(order => {
            if (order.delivery_data?.delivery_parts) {
                order.delivery_data.delivery_parts = order.delivery_data.delivery_parts.map(part => {
                    const enrichedItems = part.items.map(item => ({
                        ...item,
                        variation: variationMap[item.variationId] || null
                    }));
                    return { ...part, items: enrichedItems };
                });
            }
            return order;
        });

        return enrichedOrders;
    };


    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                // Получаем данные пользователя
                const response = await axios.get('http://localhost:8081', { withCredentials: true });
                const userId = response.data.data.userId;
                const user = await axios.get(`http://localhost:8081/users/${userId}`, { withCredentials: true });
                const userData = user.data;
                // console.log(userData)
                setUser(userData);
                setName(userData.name);
                setEmail(userData.email);
                setPhone(userData.phone);
                setAvatar(userData.avatar);
                // console.log(userData._id)

                // Получаем заказы пользователя
                if (userData._id) {
                    const ordersResponse = await axios.get(`http://localhost:8081/order/user/${userData._id}`, { withCredentials: true });
                    const enrichedOrders = await fetchAndEnrichDeliveryItems(ordersResponse.data);
                    setOrders(enrichedOrders);
                    console.log(enrichedOrders)
                }
                // Загрузка истории баллов
                const bonusResponse = await axios.get(`http://localhost:8081/loyalty-history/${userData._id}`, { withCredentials: true });
                // console.log(bonusResponse.data)
                setBonusHistory(bonusResponse.data || []);

            } catch (error) {
                setError('Ошибка при загрузке данных пользователя.');
                console.error('Ошибка при загрузке данных пользователя:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);
    useEffect(() => {
        const fetchProductsForOrders = async () => {
            try {
                const productIds = orders.flatMap(order =>
                    order.order_items.map(item => item?.product_variation_id)
                );
                const uniqueProductIds = [...new Set(productIds)];

                const productResponses = await Promise.all(
                    uniqueProductIds.map(id =>
                        axios.get(`http://localhost:8081/product-variations/${id}`, { withCredentials: true })
                    )
                );

                const productMap = productResponses.reduce((acc, response) => {
                    acc[response.data._id] = response.data.product_id;
                    return acc;
                }, {});

                setOrders(prevOrders => prevOrders.map(order => ({
                    ...order,
                    order_items: order.order_items.map(item => ({
                        ...item,
                        product: productMap[item.product_variations_id],
                    })),
                })));
            } catch (error) {
                console.error('Ошибка при загрузке данных о товарах:', error);
            }
        };

        if (orders.length > 0) {
            fetchProductsForOrders();
        }
    }, [orders]);

    const handleUpdate = async (event) => {
        event.preventDefault();
        setUploading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone);
        if (avatar) {
            formData.append('avatar', avatar);
        }

        try {
            await axios.put('http://localhost:8081/users', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage('Информация о пользователе обновлена.');
        } catch (error) {
            setError('Ошибка при обновлении данных пользователя.');
            console.error('Ошибка при обновлении данных пользователя:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (event) => {
        setAvatar(event.target.files[0]);
    };

    const handleAddAddress = () => {
        setAddressForm({ label: '', address: '', latitude: '', longitude: '', is_default: false });
        setEditingAddressIndex(null);
        setShowAddressModal(true);
    };

    const handleEditAddress = (index) => {
        const addr = user.addresses[index];
        setAddressForm({
            label: addr.label,
            address: addr.address,
            latitude: addr.location?.latitude || '',
            longitude: addr.location?.longitude || '',
            is_default: addr.is_default || false,
        });
        setEditingAddressIndex(index);
        setShowAddressModal(true);
    };

    const handleDeleteAddress = async (id, index) => {
        try {
            console.log(id)
            await axios.delete(`http://localhost:8081/users/${user._id}/addresses/${id}`);
            setMessage('Адрес удален.');
            const updated = user.addresses.filter((_, i) => i !== index);
            setUser(prev => ({ ...prev, addresses: updated }));
        } catch (error) {
            setError('Ошибка при удалении адреса.');
        }

    };

    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressForm(prev => ({ ...prev, [name]: value }));
    };
    const handleAddressSuggestionSelect = async (suggestion) => {
        console.log(suggestion)
        const selectedAddress = suggestion.value;
        setAddressForm(prev => ({ ...prev, address: selectedAddress }));

        // Получаем координаты через геокодер Yandex
        try {
            const result = await window.ymaps.geocode(selectedAddress);
            const coords = result.geoObjects.get(0).geometry.getCoordinates();
            setAddressForm(prev => ({
                ...prev,
                address: selectedAddress,
                latitude: coords[0],
                longitude: coords[1]
            }));
        } catch (error) {
            console.error('Ошибка при геокодировании:', error);
        }
    };

    const handleMapClick = async (e) => {
        const coords = e.get('coords');

        try {
            const geocodeResult = await window.ymaps.geocode(coords);
            const firstGeoObject = geocodeResult.geoObjects.get(0);
            const detectedAddress = firstGeoObject ? firstGeoObject.getAddressLine() : 'Адрес не определён';

            setAddressForm({
                label: 'Другой',
                address: detectedAddress,
                latitude: coords[0],
                longitude: coords[1],
                is_default: false
            });

            setEditingAddressIndex(null);
            setAddressViewMode('map');
            setShowAddressModal(true);
        } catch (error) {
            console.error('Ошибка при получении адреса:', error);
            alert('Не удалось определить адрес.');
        }
    };

    const handleSaveAddress = async () => {
        const addressPayload = {
            label: addressForm.label,
            address: addressForm.address,
            location: {
                latitude: parseFloat(addressForm.latitude),
                longitude: parseFloat(addressForm.longitude),
            },
            is_default: addressForm.is_default,
        };

        try {
            if (editingAddressIndex !== null) {
                const addressId = user.addresses[editingAddressIndex]._id;
                await axios.put(`http://localhost:8081/users/${user._id}/addresses/${addressId}`, addressPayload);
            } else {
                await axios.post(`http://localhost:8081/users/${user._id}/addresses`, addressPayload);
            }

            const updatedUser = await axios.get(`http://localhost:8081/users/${user._id}`);
            setUser(updatedUser.data);
        } catch (error) {
            console.error('Ошибка при сохранении адреса:', error);
        }

        setShowAddressModal(false);
    };

    const handleLogout = async () => {
        try {
            // Очистка данных о пользователе при выходе
            await axios.post('http://localhost:8081/logout', {}, { withCredentials: true });
            navigate('/');
        } catch (error) {
            setError('Ошибка при выходе из аккаунта.');
            console.error('Ошибка при выходе из аккаунта:', error);
        }
    };

    if (loading) {
        return <Spinner animation="border" role="status"><span className="visually-hidden">Загрузка...</span></Spinner>;
    }

    return (
        <>
            <Header />
            <Container className="mt-5" style={{ maxWidth: '600px', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '20px', border: '1px solid #ddd' }}>
                <div className="d-flex align-items-center mb-4" style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px' }}>
                    <Image
                        src={`http://localhost:8081/${user?.avatar}`}
                        alt="Avatar"
                        roundedCircle
                        width={80}
                        height={80}
                        className="me-3"
                    />
                    <div>
                        <h3 className="mb-1">{user?.name}</h3>
                        <div className="text-muted">{user?.email}</div>
                    </div>
                    <Button variant="link" onClick={() => setShowModal(true)} className="ms-auto" style={{ color: '#333' }}>
                        <FaEdit />
                    </Button>
                </div>

                <div className="bg-white rounded shadow-sm p-3 mb-4" style={{ border: '1px solid #ddd' }}>
                    <div className="row text-center">
                        <div className="col">
                            <div className="fw-semibold text-muted small">Персональная скидка</div>
                            <div className="fs-5">{parseFloat(user?.discount?.$numberDecimal || 0)}%</div>
                        </div>
                        <div className="col">
                            <div className="fw-semibold text-muted small">Бонусные баллы</div>
                            <div className="fs-5">{user?.bonus_points || 0}</div>
                        </div>
                        <div className="col">
                            <div className="fw-semibold text-muted small">Сумма заказов</div>
                            <div className="fs-5">{parseFloat(user?.total_orders_sum?.$numberDecimal || 0).toLocaleString('ru-RU')} ₽</div>
                        </div>
                    </div>
                </div>
                {/* Блок с адресами пользователя */}
                {/* Адреса пользователя */}
                <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-3">Мои адреса</h5>
                        <Button
                            variant="link"
                            className="p-0 text-decoration-none"
                            onClick={() => setShowAddresses(prev => !prev)}
                        >
                            {showAddresses ? 'Скрыть' : 'Показать'}
                        </Button>
                    </div>

                    {showAddresses && (
                        <>
                            {user?.addresses?.length > 0 ? (
                                user.addresses.map((addr, idx) => (
                                    <div key={idx} className="mb-3 p-3 border rounded bg-white">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{addr.label || 'Адрес'}:</strong> {addr.address}<br />
                                                {addr.is_default && <span className="badge bg-primary mt-1">Основной</span>}
                                            </div>
                                            <div>
                                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEditAddress(idx)}>Редактировать</Button>
                                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAddress(addr._id, idx)}>Удалить</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted">Адреса не добавлены.</p>
                            )}

                            <Button variant="outline-dark" className="mt-2" onClick={handleAddAddress}>Добавить адрес</Button>
                        </>
                    )}
                </div>

                {/* История бонусов */}
                <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-3">История бонусов</h5>
                        <Button
                            variant="link"
                            className="p-0 text-decoration-none"
                            onClick={() => setShowBonusHistory(prev => !prev)}
                        >
                            {showBonusHistory ? 'Скрыть' : 'Показать'}
                        </Button>
                    </div>

                    {showBonusHistory && (
                        bonusHistory.length > 0 ? (
                            <div className="border rounded bg-white p-3">
                                {bonusHistory.map((entry, idx) => (
                                    <div key={idx} className="border-bottom py-2 d-flex justify-content-between">
                                        <div>
                                            <div><strong>{entry.description}</strong></div>
                                            <small className="text-muted">{new Date(entry.createdAt).toLocaleString()}</small>
                                        </div>
                                        <div className={entry.points > 0 ? 'text-success' : 'text-danger'}>
                                            {entry.points > 0 ? `+${entry.points}` : entry.points}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">История отсутствует.</p>
                        )
                    )}
                </div>

                {message && <Alert variant="success">{message}</Alert>}
                {error && <Alert variant="danger">{error}</Alert>}

                <Button variant="dark" onClick={() => setShowOrders(!showOrders)} className="mt-3" style={{ width: '100%', borderRadius: '4px' }}>
                    {showOrders ? 'Скрыть заказы' : 'Показать заказы'}
                </Button>

                {showOrders && (
                    <Accordion className="mt-3">
                        {orders.length ? (
                            orders.map((order, index) => (
                                <Accordion.Item
                                    key={order._id}
                                    eventKey={order._id}
                                    style={{ backgroundColor: '#f8f9fa', border: '1px solid #ddd' }}
                                >
                                    <Accordion.Header>Заказ #{index + 1}</Accordion.Header>
                                    <Accordion.Body>
                                        <p><strong>Статус:</strong> {order.status}</p>
                                        <p>
                                            <strong>Дата доставки: </strong>
                                            {order.estimated_delivery_datetime ? (
                                                (() => {
                                                    const estimatedDeliveryDate = new Date(order.estimated_delivery_datetime);
                                                    const daysUntilDelivery = Math.ceil((estimatedDeliveryDate - Date.now()) / (1000 * 60 * 60 * 24));
                                                    return `Через ${daysUntilDelivery} дней (${estimatedDeliveryDate.toLocaleDateString()})`;
                                                })()
                                            ) : (
                                                'Не указано'
                                            )}
                                        </p>
                                        <p>
                                            <strong>Способ доставки: </strong>
                                            {order?.delivery_data?.delivery_method || ''}
                                        </p>
                                        <p>
                                            <strong>Адрес: </strong>
                                            {order.delivery_data?.address || ''}
                                        </p>
                                        <p>
                                            <strong>Способ оплаты: </strong> {order.payment_method || 'Не указан'}
                                        </p>
                                        <p>
                                            <strong>Налог: </strong> {order.tax?.$numberDecimal || '0'} руб.
                                        </p>
                                        <p>
                                            <strong>Стоимость доставки: </strong> {order.delivery_methods_id?.base_cost?.$numberDecimal || '0'} руб.
                                        </p>
                                        <p>
                                            <strong>Итоговая сумма: </strong>
                                            {order.total_amount?.$numberDecimal || '0'} руб.
                                        </p>

                                        {/* Блок частей доставки */}
                                        {order.delivery_data?.delivery_parts?.length > 0 && (
                                            <div className="mt-3">
                                                <strong>Доставка по частям:</strong>
                                                {order.delivery_data.delivery_parts.map((part, idx) => (
                                                    <div key={idx} className="border rounded p-2 my-3">
                                                        <p><strong>Причина:</strong> {part.reason || '—'}</p>
                                                        <p><strong>Дата доставки:</strong> {new Date(part.estimated_delivery_date).toLocaleDateString()}</p>
                                                        <p><strong>Стоимость:</strong> {part.cost?.toLocaleString('ru-RU')} ₽</p>
                                                        <p><strong>Товары:</strong></p>
                                                        <div className="d-flex flex-wrap">
                                                            {part.items.map((item, i) => {
                                                                const variation = item.variation;
                                                                const product = variation?.product_id; // предполагаем, что в variation есть product_id (populate с сервера)

                                                                return variation && product ? (
                                                                    <div key={i} style={{ margin: '10px', maxWidth: '150px' }}>
                                                                        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }}>
                                                                            <img
                                                                                src={`http://localhost:8081${product.images?.[0]}`}
                                                                                alt={product.name}
                                                                                style={{ width: '100%', borderRadius: '4px' }}
                                                                            />
                                                                            <h6 style={{ marginTop: '10px' }}>{product.name || 'Название недоступно'}</h6>
                                                                            <p>{Object.entries(variation.attributes || {}).map(([key, val]) => `${key}: ${val}`).join(', ')}</p>
                                                                            <p><strong>Количество:</strong> {item.quantity}</p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div key={i} className="text-muted">
                                                                        Неизвестный товар (ID вариации: {item.variationId})
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Accordion.Body>
                                </Accordion.Item>
                            ))
                        ) : (
                            <Accordion.Item>
                                <Accordion.Body>Нет заказов</Accordion.Body>
                            </Accordion.Item>
                        )}
                    </Accordion>
                )}
                <Button variant="outline-dark" onClick={handleLogout} className="mt-3" style={{ width: '100%', borderRadius: '4px' }}>
                    <FaSignOutAlt /> Выйти
                </Button>
                <Button
                    variant="outline-secondary"
                    className="mt-2"
                    style={{ width: '100%', borderRadius: '4px' }}
                    onClick={() => navigate('/profile/info')}
                >
                    Справочная информация
                </Button>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Редактировать профиль</Modal.Title>
                    </Modal.Header>
                    <Modal.Body style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                        <Form onSubmit={handleUpdate}>
                            {/* Имя */}
                            <Form.Group controlId="name" className="mb-3">
                                <Form.Label style={{ fontWeight: 'bold', color: '#555' }}>Имя</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Введите имя"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </Form.Group>

                            {/* Email */}
                            <Form.Group controlId="email" className="mb-3">
                                <Form.Label style={{ fontWeight: 'bold', color: '#555' }}>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Введите email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </Form.Group>

                            {/* Телефон */}
                            <Form.Group controlId="phone" className="mb-3">
                                <Form.Label style={{ fontWeight: 'bold', color: '#555' }}>Телефон</Form.Label>
                                <Form.Control
                                    type="tel"
                                    placeholder="Введите телефон"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </Form.Group>

                            {/* Аватар */}
                            <Form.Group controlId="avatar" className="mb-3">
                                <Form.Label style={{ fontWeight: 'bold', color: '#555' }}>Аватар</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        padding: '10px',
                                    }}
                                />
                            </Form.Group>

                            {/* Предпросмотр аватара */}
                            {avatar && typeof avatar === 'object' && (
                                <div className="mb-3 text-center">
                                    <Image
                                        src={URL.createObjectURL(avatar)}
                                        alt="Avatar Preview"
                                        roundedCircle
                                        width={100}
                                        height={100}
                                        style={{
                                            border: '2px solid #ddd',
                                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Кнопка обновления */}
                            <Button
                                type="submit"
                                variant="dark"
                                disabled={uploading}
                                style={{
                                    width: '100%',
                                    borderRadius: '6px',
                                    background: uploading ? '#666' : '#333',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    padding: '12px',
                                    transition: 'background 0.3s',
                                }}
                            >
                                {uploading ? 'Обновление...' : 'Обновить'}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
                {/* Модальное окно для добавления/редактирования адреса */}
                <Modal show={showAddressModal} onHide={() => setShowAddressModal(false)} centered size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>{editingAddressIndex !== null ? 'Редактировать адрес' : 'Добавить адрес'}</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        {/* Переключение между режимами */}
                        <div className="d-flex justify-content-end mb-3">
                            <Button
                                variant={addressViewMode === 'manual' ? 'primary' : 'outline-primary'}
                                className="me-2"
                                onClick={() => setAddressViewMode('manual')}
                            >
                                Ввод вручную
                            </Button>
                            <Button
                                variant={addressViewMode === 'map' ? 'primary' : 'outline-primary'}
                                onClick={() => setAddressViewMode('map')}
                            >
                                Выбрать на карте
                            </Button>
                        </div>

                        {/* Название адреса */}
                        <Form.Group className="mb-3">
                            <Form.Label>Название адреса (Дом, Работа и т.п.)</Form.Label>
                            <Form.Control
                                type="text"
                                name="label"
                                value={addressForm.label}
                                onChange={handleAddressFormChange}
                            />
                        </Form.Group>

                        {/* Отображение адреса после выбора на карте */}
                        {addressViewMode === 'map' && addressForm.address && (
                            <div className="mb-3">
                                <strong>Выбранный адрес:</strong><br />
                                <div className="text-muted">{addressForm.address}</div>
                            </div>
                        )}

                        {/* Ввод адреса вручную */}
                        {addressViewMode === 'manual' && addressForm.address && (
                            <p>{addressForm.address}</p>
                        )}
                        {addressViewMode === 'manual' && (
                            <Form.Group className="mb-3" controlId="address">
                                <Form.Label>Адрес</Form.Label>
                                <AddressSuggestions
                                    name="address"
                                    token="8fee3792ac912871a7b7121dd275a5341f83d930"
                                    value={addressForm.address}
                                    onChange={handleAddressSuggestionSelect}
                                />
                            </Form.Group>
                        )}

                        {/* Карта */}
                        {addressViewMode === 'map' && (
                            <div className="mb-3" style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                                <YMaps>
                                    <Map
                                        defaultState={{ center: [52.286974, 104.305018], zoom: 12 }} // Иркутск
                                        width="100%"
                                        height="300px"
                                        onClick={handleMapClick}
                                        modules={["geocode", "geoObject.addon.balloon"]}
                                    />
                                </YMaps>
                                <div className="text-muted small mt-2">Кликните по карте, чтобы выбрать адрес</div>
                            </div>
                        )}

                        {/* Чекбокс "сделать основным" */}
                        <Form.Check
                            className="mt-3"
                            type="checkbox"
                            label="Сделать основным"
                            name="is_default"
                            checked={addressForm.is_default || false}
                            onChange={e => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                        />
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddressModal(false)}>Отмена</Button>
                        <Button variant="primary" onClick={handleSaveAddress}>Сохранить</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
            <Footer />
        </>
    );
}

export default ProfilePage;
