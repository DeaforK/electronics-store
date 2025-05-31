import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Spinner, Alert, Toast, Button } from 'react-bootstrap';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';
import Banner from '../components/Home/Banner';
import Products from '../components/Home/SmallBanner';
import CategorySection from '../components/CategorySection';
import ProductSection from '../components/Home/ProductSection';
import BannersSection from '../components/Home/BannersSection';
import ProductSaleSection from '../components/Home/ProductSaleSection';
import SummerSale from '../components/Home/SummerSale';
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Home() {
    const [auth, setAuth] = useState(null);
    const [role, setRole] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const location = useLocation();
    const previewBanner = location?.state?.previewBanner || null;
    const previewPosition = location?.state?.previewPosition || null;
    
    const [showPreviewNotice, setShowPreviewNotice] = useState(!!previewBanner);
    
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:8081', { withCredentials: true });
                if (res.data.message === "Успех") {
                    setAuth(true);
                    setRole(res.data.role);
                } else {
                    setAuth(false);
                }
            } catch (error) {
                console.error('Ошибка при проверке аутентификации:', error);
                setAuth(false);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axios.get('http://localhost:8081/products/active', { withCredentials: true });
                console.log(response.data)
                setProducts(response.data);
            } catch (error) {
                setError('Ошибка при загрузке товаров.');
                console.error('Ошибка при загрузке товаров:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const handleConfirmSave = async () => {
        // Пример отправки на сервер
        try {
            if (previewBanner._id) {
                await axios.put(`http://localhost:8081/banners/${previewBanner._id}`, previewBanner, { withCredentials: true });
            } else {
                await axios.post('http://localhost:8081/banners', previewBanner, { withCredentials: true });
            }
            setShowPreviewNotice(false);
            navigate('/admin/banner', { replace: true }); // убираем preview из history
        } catch (error) {
            console.error("Ошибка при сохранении баннера:", error);
        }
    };

    const handleReturnToEdit = () => {
        navigate('/admin/banner', {
            state: { returnToEdit: previewBanner }
        });
    };

    if (loading) {
        return <Spinner animation="border" role="status"><span className="visually-hidden">Загрузка...</span></Spinner>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <>
            <Header />
            <Banner preview={previewPosition === 11 ? previewBanner : null} />{/* Баннер */}
            {showPreviewNotice && (
                <Toast style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
                    <Toast.Header closeButton={false}>
                        <strong className="me-auto">Предпросмотр</strong>
                    </Toast.Header>
                    <Toast.Body>
                        <p>Вы просматриваете баннер перед сохранением.</p>
                        <div className="d-flex justify-content-between mt-2">
                            <Button size="sm" onClick={handleConfirmSave} variant="success">Сохранить</Button>
                            <Button size="sm" onClick={handleReturnToEdit} variant="secondary">Редактировать</Button>
                        </div>
                    </Toast.Body>
                </Toast>
            )}
            {products.length === 0 ? (
                <Alert variant="info">Активные товары не найдены.</Alert>
            ) : (
                <>
                    <Products preview={[21, 22, 23, 24].includes(previewPosition) ? previewBanner : null} /> {/* Баннер */}
                    <CategorySection />
                    <ProductSection />
                    <BannersSection preview={[31, 32, 33, 34].includes(previewPosition) ? previewBanner : null} /> {/* Баннер */}
                    <ProductSaleSection />
                    <SummerSale preview={previewPosition === 41 ? previewBanner : null} /> {/* Баннер */}
                </>
            )}
            <Footer />
        </>
    );
}

export default Home;
