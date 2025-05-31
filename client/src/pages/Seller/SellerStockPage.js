import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { Button, Form, ListGroup, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Loader from '../../components/Layout/Loader';
import BarcodeScanner from '../../components/Seller/BarcodeScanner';

function SellerStockPage() {
    const [isSeller, setIsSeller] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [mapCenter, setMapCenter] = useState([52.2858, 104.3007]);
    const [barcode, setBarcode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notification, setNotification] = useState({ message: '', type: '' });

    useEffect(() => {
        if (notification.message) {
            const timeout = setTimeout(() => {
                setNotification({ message: '', type: '' });
            }, 4000); // 4 секунды

            return () => clearTimeout(timeout); // очистка таймера при размонтировании или обновлении
        }
    }, [notification]);

    const [productInfo, setProductInfo] = useState(null);

    const [userId, setUserId] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const userResponse = await axios.get('http://localhost:8081/seller', { withCredentials: true });

                if (userResponse.data.user.role === 'seller') {
                    setIsSeller(true);
                    setUserId(userResponse.data.user.userId)
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Ошибка при проверке роли продавца-приёмщика:', error);
                navigate('/login');
            }
        };
        checkAccess();
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await axios.get('http://localhost:8081/warehouses', { withCredentials: true });
            setWarehouses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMapClick = (coords) => {
        const clicked = warehouses.find(w =>
            Math.abs(w.location.latitude - coords[0]) < 0.0005 &&
            Math.abs(w.location.longitude - coords[1]) < 0.0005
        );
        if (clicked) setSelectedWarehouse(clicked);
    };

    const handleSubmit = async () => {
        if (!selectedWarehouse || !productInfo || !quantity) {
            return setNotification({ message: 'Заполните все поля', type: 'danger' });
        }

        try {
            await axios.post('http://localhost:8081/warehouseInventory', {
                warehouse_id: selectedWarehouse._id,
                product_id: productInfo._id, // передаём _id вариации товара
                quantity: Number(quantity),
                user_id: userId,
            }, { withCredentials: true });

            setNotification({ message: 'Товар успешно добавлен на склад', type: 'success' });
            setBarcode('');
            setQuantity('');
            setProductInfo(null);
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Ошибка при добавлении товара', type: 'danger' });
        }
    };


    const handleDetected = async (scannedBarcode) => {
        setBarcode(scannedBarcode);
        try {
            const res = await axios.get(`http://localhost:8081/product-variations/scan/barcode/${scannedBarcode}`, {
                withCredentials: true
            });

            if (res.data) {
                setProductInfo(res.data);
                console.log(res.data)
                setNotification({ message: 'Товар найден: ' + res.data.product_id.name, type: 'success' });
            } else {
                setProductInfo(null);
                setNotification({ message: 'Товар с таким штрихкодом не найден', type: 'danger' });
            }
        } catch (err) {
            console.error(err);
            setProductInfo(null);
            setNotification({ message: 'Ошибка при получении информации о товаре', type: 'danger' });
        }
    };

    return (
        <>
            <Header />
            <div className="d-flex">
                <div className="p-3" style={{ width: '30%', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                    <Button variant="link" onClick={() => navigate('/seller')} className="me-2">
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h4>Склады и магазины</h4>
                    <ListGroup>
                        {warehouses.map(w => (
                            <ListGroup.Item
                                key={w._id}
                                active={selectedWarehouse?._id === w._id}
                                action
                                onClick={() => {
                                    setSelectedWarehouse(w);
                                    setMapCenter([w.location.latitude, w.location.longitude]);
                                }}
                            >
                                {w.name} ({w.type})
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </div>
                <div className="p-3" style={{ width: '70%' }}>
                    <YMaps>
                        <Map
                            state={{ center: mapCenter, zoom: 11 }}
                            width="100%"
                            height="300px"
                            onClick={(e) => handleMapClick(e.get('coords'))}
                        >
                            {warehouses.map(w => (
                                <Placemark
                                    key={w._id}
                                    geometry={[w.location.latitude, w.location.longitude]}
                                    options={{
                                        preset: selectedWarehouse?._id === w._id
                                            ? 'islands#redIcon'
                                            : 'islands#blueIcon',
                                    }}
                                />
                            ))}
                        </Map>
                    </YMaps>

                    <hr />
                    <h5>Добавление товара</h5>
                    {notification.message && (
                        <Alert variant={notification.type}>{notification.message}</Alert>
                    )}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Штрихкод товара</Form.Label>
                            <Form.Control
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault(); // предотвращаем отправку формы
                                        await handleDetected(barcode); // вызываем ту же функцию, что и при сканировании
                                    }
                                }}
                                placeholder="Отсканируйте или введите штрихкод"
                            />
                            <BarcodeScanner onDetected={handleDetected} />

                            {barcode && (
                                <div className="mt-4 p-2 border rounded bg-green-100">
                                    📦 Найден штрихкод: <strong>{barcode}</strong>
                                </div>
                            )}


                            {productInfo && (
                                <div className="mt-3 p-3 border rounded bg-light">
                                    <h6>Информация о товаре</h6>
                                    <p><strong>Название:</strong> {productInfo.product_id.name}</p>
                                    <p><strong>Цена:</strong> {productInfo?.price?.$numberDecimal} ₽</p>
                                    <p><strong>Атрибуты:</strong> {
                                        productInfo.attributes && typeof productInfo.attributes === 'object' && Object.keys(productInfo.attributes).length > 0 ? (
                                            Object.entries(productInfo.attributes).map(([key, value]) => (
                                                <span key={key} className="me-3">
                                                    {key}: {value}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-muted">Стандартная комплектация</span>
                                        )
                                    }</p>
                                </div>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Количество</Form.Label>
                            <Form.Control
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                            />
                        </Form.Group>
                        <Button onClick={handleSubmit} disabled={!selectedWarehouse}>Добавить на склад</Button>
                    </Form>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default SellerStockPage;
