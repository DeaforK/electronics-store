import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Button, ListGroup, Modal, Form } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Loader from '../../components/Layout/Loader';
import '../../style/Warehouse.css';
import Notification from '../../components/Layout/Notification'; // Импортируйте компонент Notification
import ConfirmationModal from '../../components/Layout/ConfirmationModal';

function WarehousePage() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [isMapLocationLoading, setIsMapLocationLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentWarehouse, setCurrentWarehouse] = useState(null);
    const [mapCenter, setMapCenter] = useState([52.2858, 104.3007]); // Центр по умолчанию
    const [formData, setFormData] = useState({
        name: '',
        type: 'Склад',
        latitude: '',
        longitude: '',
    });
    const [newLocation, setNewLocation] = useState({ latitude: '', longitude: '' });
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [address, setAddress] = useState('');

    const [showConfirm, setShowConfirm] = useState(false);
    const [currentWarehouseId, setCurrentWarehouseId] = useState(null);

    const [userId, setUserId] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const checkCourierAccess = async () => {
            try {
                const res = await axios.get('http://localhost:8081/admin', { withCredentials: true });
                setUserId(res.data.user.userId)
            } catch (err) {
                console.error('Доступ запрещен:', err);
                navigate('/login'); // Перенаправляем на страницу входа
            }
        };
        checkCourierAccess();
        fetchWarehouses();
    }, []);
    
    const fetchWarehouses = async () => {
        try {
            const response = await axios.get('http://localhost:8081/warehouses', { withCredentials: true });
            setWarehouses(response.data);
        } catch (err) {
            console.error('Ошибка загрузки складов:', err);
            setError('Не удалось загрузить данные о складах.');
        } finally {
            setLoading(false);
        }
    };

    const handleMapLoad = () => setIsMapLoading(false);


    const handleOpenModal = (warehouse = null, coordinates = null) => {
        setCurrentWarehouse(warehouse);

        setFormData({
            name: warehouse?.name || '',
            type: warehouse?.type || 'Склад',
            latitude: coordinates ? coordinates[0] : warehouse?.location?.latitude || '',
            longitude: coordinates ? coordinates[1] : warehouse?.location?.longitude || '',
        });

        setAddress(warehouse?.address || 'Адрес не указан'); // Адрес из текущего объекта склада/магазина
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentWarehouse(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const { name, type, latitude, longitude } = formData;

        if (!name || !latitude || !longitude) {
            showNotification('Пожалуйста заполните все поля', 'danger')
            return;
        }

        try {
            if (currentWarehouse) {
                await axios.put(`http://localhost:8081/warehouses/${currentWarehouse._id}`, {
                    name,
                    type,
                    location: { latitude, longitude },
                    userId
                });
                showNotification('Склад успешно изменен!', 'success');
            } else {
                await axios.post('http://localhost:8081/warehouses', {
                    name,
                    type,
                    location: { latitude, longitude },
                    userId
                });
                showNotification('Склад успешно добавлен!', 'success');
            }
            fetchWarehouses();
            handleCloseModal();
        } catch (err) {
            console.error('Ошибка сохранения:', err);
            showNotification('Произошла ошибка при добавлении / редактировании склада.', 'danger')
        }
    };

    const handleDelete = async () => {
        if (!currentWarehouseId) return;
        try {
            await axios.delete(`http://localhost:8081/warehouses/${currentWarehouseId}`, {
                params: { userId },  // userId передаем как параметр запроса
            });
            fetchWarehouses();
            showNotification('Склад/магазин успешно удален.', 'success');
        } catch (err) {
            console.error('Ошибка удаления:', err);
            showNotification('Произошла ошибка при удалении склада.', 'danger');
        } finally {
            setShowConfirm(false); // Закрываем модальное окно
        }
    };

    const openConfirmModal = (warehouseId) => {
        setCurrentWarehouseId(warehouseId);
        setShowConfirm(true);
    };

    const closeConfirmModal = () => {
        setCurrentWarehouseId(null);
        setShowConfirm(false);
    };

    const handleMapClick = async (e) => {
        const coordinates = e.get('coords');
        handleOpenModal(null, coordinates);

        try {
            const geocodeResult = await window.ymaps.geocode(coordinates);
            const firstGeoObject = geocodeResult.geoObjects.get(0);
            setAddress(firstGeoObject ? firstGeoObject.getAddressLine() : 'Адрес не определен');
        } catch (error) {
            console.error('Ошибка при получении адреса:', error);
            setAddress('Ошибка при определении адреса');
        }
    };

    const handleListClick = (latitude, longitude) => {
        setMapCenter([latitude, longitude]);
    };
    const handleOpenLocationModal = () => {
        setNewLocation({
            latitude: formData.latitude || mapCenter[0],
            longitude: formData.longitude || mapCenter[1],
        });
        setShowLocationModal(true);
    };

    const handleCloseLocationModal = () => {
        setShowLocationModal(false);
    };

    const handleLocationMapClick = async (e) => {
        const coordinates = e.get('coords'); // Получаем координаты клика
        setNewLocation({
            latitude: coordinates[0],
            longitude: coordinates[1],
        });

        try {
            const geocodeResult = await window.ymaps.geocode(coordinates);
            const firstGeoObject = geocodeResult.geoObjects.get(0);
            const newAddress = firstGeoObject ? firstGeoObject.getAddressLine() : 'Адрес не определен';
            setAddress(newAddress); // Обновляем адрес
        } catch (error) {
            console.error('Ошибка при получении адреса:', error);
            setAddress('Ошибка при определении адреса');
        }
    };


    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 3000); // Уведомление исчезает через 3 сек
    };


    if (loading) return <Loader />;

    return (
        <>
            <Header />
            <div className="warehouse-page d-flex">
                <div className="warehouse-list p-3">
                    <div className="d-flex align-items-center mb-3">
                        <Button variant="link" onClick={() => navigate('/admin')} className="me-2">
                            <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                        </Button>
                        <h3 className="m-0">Склады и магазины</h3>
                    </div>
                    {notification.message && (
                        <Notification
                            message={notification.message}
                            type={notification.type}
                            onDismiss={() => setNotification({ message: '', type: '' })}
                        />
                    )}
                    {error && <div className="text-danger">{error}</div>}
                    <ListGroup>
                        {warehouses.map((warehouse) => (
                            <ListGroup.Item
                                key={warehouse._id}
                                className="d-flex justify-content-between align-items-center"
                                onClick={() => handleListClick(warehouse.location.latitude, warehouse.location.longitude)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span>
                                    {warehouse.name} ({warehouse.type})
                                    <br />
                                    <small className="text-muted">Адрес: {warehouse.address || 'Не указан'}</small>
                                </span>
                                <div>
                                    <Button
                                        variant="dark"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => handleOpenModal(warehouse)}
                                    >
                                        Редактировать
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => openConfirmModal(warehouse._id)}
                                    >
                                        Удалить
                                    </Button>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </div>
                <div id="map-container" className="map-container">
                    {isMapLoading && <Loader />}
                    <YMaps>
                        <Map
                            state={{
                                center: mapCenter,
                                zoom: 10,
                            }}
                            onLoad={handleMapLoad}
                            onClick={handleMapClick}
                            width="100%"
                            height="100%"
                        >
                            {warehouses.map((warehouse) => (
                                <Placemark
                                    key={warehouse._id}
                                    geometry={[warehouse.location.latitude, warehouse.location.longitude]}
                                    properties={{
                                        balloonContentHeader: `<strong>${warehouse.name}</strong>`,
                                        balloonContentBody: `Тип: ${warehouse.type}<br>Адрес: ${warehouse.address || 'Не указан'}`,
                                        hintContent: `${warehouse.name}`,
                                    }}
                                    options={{
                                        preset: warehouse.type === 'Склад' ? 'islands#blueCircleDotIcon' : 'islands#greenCircleDotIcon',
                                        iconColor: warehouse.type === 'Склад' ? '#1E90FF' : '#32CD32',
                                    }}
                                    modules={['geoObject.addon.balloon', 'geoObject.addon.hint']}
                                    onMouseEnter={(e) => e.get('target').balloon.open()}
                                    onMouseLeave={(e) => e.get('target').balloon.close()}
                                />
                            ))}
                        </Map>
                    </YMaps>
                </div>
            </div>

            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{currentWarehouse ? 'Редактировать' : 'Добавить'} склад/магазин</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="name">
                            <Form.Label>Название</Form.Label>
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleFormChange}
                            />
                        </Form.Group>
                        <Form.Group controlId="type" className="mt-3">
                            <Form.Label>Тип</Form.Label>
                            <Form.Select name="type" value={formData.type} onChange={handleFormChange}>
                                <option value="Склад">Склад</option>
                                <option value="Магазин">Магазин</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group controlId="address" className="mt-3">
                            <Form.Label>Адрес (определен автоматически)</Form.Label>
                            <Form.Control type="text" value={address} readOnly />
                        </Form.Group>
                    </Form>
                    {currentWarehouse && (
                        <Button
                            variant="dark"
                            className="mt-3"
                            onClick={handleOpenLocationModal}
                        >
                            Изменить местоположение
                        </Button>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Закрыть
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Сохранить
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Модальное окно для редактирования местоположения */}
            <Modal show={showLocationModal} onHide={handleCloseLocationModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Изменение местоположения</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {isMapLocationLoading && <Loader />} {/* Индикатор загрузки */}
                    <YMaps>
                        <Map
                            state={{
                                center: [newLocation.latitude, newLocation.longitude],
                                zoom: 12,
                            }}
                            width="100%"
                            height="400px"
                            onClick={handleLocationMapClick} // Указываем корректный обработчик
                            onLoad={() => setIsMapLocationLoading(false)} // Отключаем загрузку после рендеринга карты
                        >
                            {/* Старая метка */}
                            <Placemark
                                geometry={[formData.latitude, formData.longitude]}
                                options={{
                                    preset: 'islands#redDotIcon',
                                }}
                                properties={{
                                    hintContent: 'Текущее местоположение',
                                }}
                            />
                            {/* Новая метка */}
                            <Placemark
                                geometry={[newLocation.latitude, newLocation.longitude]}
                                options={{
                                    preset: 'islands#greenDotIcon',
                                }}
                                properties={{
                                    hintContent: 'Новое местоположение',
                                }}
                            />
                        </Map>
                    </YMaps>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseLocationModal}>
                        Отмена
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setFormData((prev) => ({
                                ...prev,
                                latitude: newLocation.latitude,
                                longitude: newLocation.longitude,
                            }));
                            setAddress(address); // Передаем новый адрес в форму
                            handleCloseLocationModal();
                        }}
                    >
                        Подтвердить
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Модальное окно подтверждения */}
            <ConfirmationModal
                show={showConfirm}
                message="Вы уверены, что хотите удалить этот склад/магазин?"
                onConfirm={handleDelete}
                onCancel={closeConfirmModal}
            />
            <Footer />
        </>
    );
}

export default WarehousePage;