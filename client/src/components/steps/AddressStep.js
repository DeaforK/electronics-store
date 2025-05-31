import React, { useState, useEffect } from "react";
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { useNavigate } from 'react-router-dom';
import { FaCirclePlus } from "react-icons/fa6";
import { Modal, Button, Form } from "react-bootstrap"; // Используем React-Bootstrap
import axios from "axios";
import "../../style/OrderPage.css";
import Notification from "../Layout/Notification";
import Loader from '../Layout/Loader';
import { AddressSuggestions } from 'react-dadata';
import 'react-dadata/dist/react-dadata.css';

const AddressStep = ({ onNext }) => {
    const [cartItems, setCartItems] = useState([]);
    const [shopInventory, setShopInventory] = useState({});
    const [notification, setNotification] = useState({ message: "", type: "" });
    const [shop, setShop] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showModal, setShowModal] = useState(false); // Состояние модального окна
    const [viewMode, setViewMode] = useState("list");

    const navigate = useNavigate();

    const [auth, setAuth] = useState(false);
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState(null);
    const [userAddress, setUserAddress] = useState(null);

    const [isMapLoading, setIsMapLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([52.2858, 104.3007]); // Центр по умолчанию

    const [addressForm, setAddressForm] = useState({
        label: '',
        address: '',
        latitude: '',
        longitude: '',
        is_default: false,
    });

    // Проверка аутентификации пользователя
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081/', { withCredentials: true });
                if (res.data.message === 'Успех') {
                    setAuth(true);
                    setUserId(res.data.data.userId);
                } else {
                    navigate('/');
                    setAuth(false);
                    setMessage('Пожалуйста, войдите или зарегистрируйтесь для просмотра корзины.');
                }
            } catch (error) {
                setAuth(false);
                setMessage('Произошла ошибка при проверке аутентификации.');
            }
        };

        checkAuth();
    }, []);

    // Загрузка данных
    useEffect(() => {
        if (auth && userId) {
            const fetchCartItems = async () => {
                try {
                    const response = await axios.get(`http://localhost:8081/cart/${userId}`, { withCredentials: true });
                    const cartData = response.data;

                    // Убедитесь, что cartData - массив
                    if (!Array.isArray(cartData)) {
                        throw new Error("cartData должен быть массивом");
                    }

                    setCartItems(cartData);

                    // Данные о магазинах
                    const shopInventoryResponse = await axios.get(`http://localhost:8081/warehouseInventory/shop`, { withCredentials: true });
                    const shopInventoryData = shopInventoryResponse.data;

                    setShopInventory(shopInventoryData);

                    // Сравнение данных
                    const matchingShops = shopInventoryData.filter((inventoryItem) =>
                        cartData.some((cartItem) =>
                            cartItem.product_variations_id._id === inventoryItem.product_id._id
                        )
                    );

                    // Извлечение уникальных warehouse_id с использованием _id для проверки уникальности
                    const uniqueMatchingShops = matchingShops.reduce((unique, item) => {
                        if (!unique.some(shop => shop.warehouse_id._id === item.warehouse_id._id)) {
                            unique.push(item);
                        }
                        return unique;
                    }, []);

                    const addressesRes = uniqueMatchingShops.map(item => item.warehouse_id);
                    // console.log(uniqueMatchingShops.map(item => item.warehouse_id))
                    setAddresses(addressesRes);

                    // Дополнительный запрос для получения данных по складам
                    const shopResponse = await axios.get(`http://localhost:8081/warehouses/shop`, { withCredentials: true });
                    const shopData = shopResponse.data;
                    setShop(shopData);

                } catch (error) {
                    console.error("Ошибка при загрузке данных:", error);
                } finally {
                    setLoading(false);
                }
            };
            const fetchUserData = async () => {
                try {
                    const response = await axios.get(`http://localhost:8081/users/${userId}/addresses`, { withCredentials: true });
                    const userData = response.data;
                    setUserAddress(userData)
                    const defaultDeliveryAddress = userData.find(addr => addr.is_default);
                    if (defaultDeliveryAddress) {
                        setSelectedAddress(defaultDeliveryAddress);
                    }
                } catch (error) {
                    console.error("Ошибка при загрузке данных:", error);
                } finally {
                    setLoading(false);
                }
            }
            fetchUserData();
            fetchCartItems();
        }
    }, [auth, userId]);

    const handleNext = () => {
        if (selectedAddress) {
            // console.log("selectedAddress: ", selectedAddress)
            if (selectedAddress.type === 'Магазин'){
                selectedAddress.warehouse_id = selectedAddress._id
            }
            onNext({ address: selectedAddress }); // Передаем весь объект
        } else {
            showNotification("Выберите адрес", "danger");
        }
    };
    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    };

    const handlePlacemarkClick = (shopItem) => {
        if (shopItem && shopItem._id) {
            setSelectedAddress(shopItem);
        } else {
            console.error("Некорректные данные для установки selectedAddress", shopItem);
        }
    };


    const handleMapLoad = () => setIsMapLoading(false);

    const clickList = () => {
        setViewMode("list");
        setIsMapLoading(true);
    }

    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressForm(prev => ({ ...prev, [name]: value }));
    };
    const handleAddressSuggestionSelect = async (suggestion) => {
        // console.log(suggestion)
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
            await axios.post(`http://localhost:8081/users/${userId}/addresses`, addressPayload);

            const response = await axios.get(`http://localhost:8081/users/${userId}/addresses`, { withCredentials: true });
            const userData = response.data;
            setUserAddress(userData)
        } catch (error) {
            console.error('Ошибка при сохранении адреса:', error);
        }

        setShowModal(false);
    };

    return (
        <div className="container mt-5">
            {/* Step Indicator */}
            <div className="step-indicator d-flex justify-content-between align-items-center mb-4">
                <div className="step text-center">
                    <img className="step-icon" src="http://localhost:8081/assets/icon/Location.png" />
                    <span style={{ color: "black" }}>
                        <strong>Шаг 1</strong>
                        <br />
                        Адрес
                    </span>
                </div>
                <div className="line-blur mx-2">
                    <div className="line"></div>
                </div>
                <div className="step text-center">
                    <img className="step-icon opacity-25" src="http://localhost:8081/assets/icon/Shipping.png" />
                    <span className="opacity-25">
                        <strong>Шаг 2</strong>
                        <br />
                        Доставка
                    </span>
                </div>
                <div className="line-blur mx-2">
                    <div className="line"></div>
                </div>
                <div className="step text-center">
                    <img className="step-icon opacity-25" src="http://localhost:8081/assets/icon/Payment.png" />
                    <span className="opacity-25">
                        <strong>Шаг 3</strong>
                        <br />
                        Оплата
                    </span>
                </div>
            </div>
            {/* Address Selection */}
            <h5 className="mb-4">Выбор адреса для доставки:</h5>
            <form>
                {/* {console.log(userAddress)} */}
                {userAddress?.map((address) => (
                    <div
                        key={address._id}
                        className={`address-card p-3 mb-3 d-flex justify-content-between align-items-center ${selectedAddress === address ? "bg-light border" : ""}`}
                        onClick={() => setSelectedAddress(address)}
                    >
                        <div>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="user-address"
                                    id={address._id}
                                    checked={selectedAddress === address}
                                    onChange={() => setSelectedAddress(address)}
                                />
                                <label className="form-check-label ms-2" htmlFor={address._id}>
                                    <strong>{address.label || 'Адрес'}</strong>
                                    {address.is_default && (
                                        <span className="address-type ms-2 badge bg-dark text-white">Основной</span>
                                    )}
                                    <br />
                                    {address.address}
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </form>
            {/* Address Selection */}
            <h5 className="mb-4">Выбор адреса для самовывоза</h5>
            <form>
                {shop.map((address) => (
                        <div
                            key={address._id}
                            className={`address-card p-3 mb-3 d-flex justify-content-between align-items-center ${selectedAddress === address._id ? "bg-light border" : ""}`}
                            onClick={() => setSelectedAddress(address)}  // Сохраняем только _id
                        >
                            <div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="address"
                                        id={address._id}
                                        checked={selectedAddress === address}  // Сравниваем только _id
                                        onChange={() => setSelectedAddress(address)}  // Обновляем только _id
                                    />
                                    <label className="form-check-label ms-2" htmlFor={address._id}>
                                        <strong>{address.name}</strong>
                                        <span
                                            className={`address-type ms-2 ${address.type === "Магазин" ? "bg-dark text-white" : "bg-secondary text-white"}`}
                                        >
                                            {address.type}
                                        </span>
                                        <br />
                                        {address.address}
                                        <br />
                                        {/* <small>Контакт - {address.contact}</small> */}
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}

            </form>

            {/* Add New Address Button */}
            <div
                className="add-new-address d-flex flex-column align-items-center text-dark mt-4"
                onClick={() => setShowModal(true)} // Открыть модальное окно
            >
                <div className="line-blur w-100 mb-2">
                    <div className="line"></div>
                </div>
                <FaCirclePlus className="icon" />
                <span>Выбрать другой адрес</span>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Добавить адрес</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex justify-content-between mb-3">
                        <Button
                            variant={viewMode === "list" ? "primary" : "outline-primary"}
                            onClick={clickList}
                        >
                            Вручную
                        </Button>
                        <Button
                            variant={viewMode === "map" ? "primary" : "outline-primary"}
                            onClick={() => setViewMode("map")}
                        >
                            Карта
                        </Button>
                    </div>
                    {viewMode === "list" && (
                        <form>
                            {/* Ввод адреса вручную */}
                            <Form.Group className="mb-3" controlId="address">
                                <Form.Label>Адрес</Form.Label>
                                <AddressSuggestions
                                    name="address"
                                    token="8fee3792ac912871a7b7121dd275a5341f83d930"
                                    value={addressForm.address}
                                    onChange={handleAddressSuggestionSelect}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Название адреса (Дом, Работа и т.п.)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="label"
                                    value={addressForm.label}
                                    onChange={handleAddressFormChange}
                                />
                            </Form.Group>

                        </form>
                    )}
                    {viewMode === "map" && (
                        <>
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
                            {addressForm.address && (
                                <div className="mb-3">
                                    <strong>Выбранный адрес:</strong><br />
                                    <div className="text-muted">{addressForm.address}</div>
                                </div>
                            )}
                            {isMapLoading &&
                                <div
                                    style={{
                                        width: '100%',
                                        height: '300px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        position: 'absolute',
                                        zIndex: 1000,
                                    }}
                                >
                                    <Loader />
                                </div>}
                            <YMaps>
                                <Map
                                    state={{ center: mapCenter, zoom: 10 }}
                                    onLoad={handleMapLoad}
                                    width="100%"
                                    height="300px"
                                    onClick={handleMapClick}
                                    modules={["geocode", "geoObject.addon.balloon"]}
                                >
                                </Map>
                            </YMaps>
                        </>
                    )}
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
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Закрыть
                    </Button>
                    <Button variant="primary" onClick={handleSaveAddress}>
                        Сохранить
                    </Button>
                </Modal.Footer>
            </Modal>

            {notification.message && (
                <Notification message={notification.message} type={notification.type} />
            )}

            <div className="action-buttons d-flex justify-content-end mt-4">
                <button type="button" className="btn btn-outline-dark" onClick={() => { navigate("/cart") }}>
                    Назад
                </button>
                <button type="button" className="btn btn-dark" onClick={handleNext}>
                    Далее
                </button>
            </div>
        </div>
    );
};

export default AddressStep;
