import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Footer from '../components/Layout/Footer';
import Header from '../components/Layout/Header';
import axios from 'axios';

const CampaignsPage = () => {
    const [promotions, setPromotions] = useState([]);
    const [promotionTargets, setPromotionTargets] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();

    const previewPromotion = location.state?.previewPromotion;

    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                const [resPromotions, resPromotionTargets] = await Promise.all([
                    axios.get("http://localhost:8081/promotions/active"),
                    axios.get("http://localhost:8081/promotion-product-category"),
                ]);

                const parsedPromotions = resPromotions.data.map((p) => ({
                    ...p,
                    discount_value: parseFloat(p.discount_value?.$numberDecimal || p.discount_value),
                    max_discount: parseFloat(p.max_discount?.$numberDecimal || p.max_discount || 0),
                    min_order_amount: parseFloat(p.min_order_amount?.$numberDecimal || p.min_order_amount || 0),
                }));

                const targetsByPromoId = {};
                for (const target of resPromotionTargets.data) {
                    const promoId = target.promotion_id?._id || target.promotion_id;
                    if (!targetsByPromoId[promoId]) targetsByPromoId[promoId] = [];
                    targetsByPromoId[promoId].push({
                        product: target.product_id || null,
                        category: target.category_id || null,
                        brand_name: target.brand_name || null,
                    });
                }

                const promotionsWithTargets = parsedPromotions.map((promo) => ({
                    ...promo,
                    promotion_id: promo._id,
                    targets: targetsByPromoId[promo._id] || [],
                }));

                setPromotions(promotionsWithTargets);
                setPromotionTargets(resPromotionTargets.data);
            } catch (err) {
                console.error("Ошибка загрузки акций:", err);
            }
        };

        fetchPromotions();
    }, []);

    const handleReturnToEdit = () => {
        navigate('/admin/promotion', {
            state: { returnToEdit: previewPromotion }
        });
    };


    const renderCard = (promo, isPreview = false) => (
        <div className="col-md-6 col-lg-4 mb-4" key={promo._id || 'preview'}>
            <div className={`card shadow rounded-4 h-100 border-0 ${isPreview ? 'border border-2 border-primary' : ''}`}>
                <div
                    className="position-relative"
                    style={{
                        backgroundColor: promo.background_color || '#fff',
                        borderTopLeftRadius: '1rem',
                        borderTopRightRadius: '1rem',
                        overflow: 'hidden',
                        minHeight: '200px',
                    }}
                >
                    <div
                        dangerouslySetInnerHTML={{ __html: promo.banner }}
                        className="w-100 h-100"
                    />
                    {!isPreview && (
                        <Link
                            to={`/catalog/promotion/${promo.promotion_id}`}
                            className="btn btn-dark position-absolute"
                            style={{
                                bottom: '1rem',
                                right: '1rem',
                                padding: '0.5rem 1rem',
                                fontWeight: '500',
                                borderRadius: '0.5rem',
                            }}
                        >
                            Смотреть товары
                        </Link>
                    )}
                    {isPreview && (
                        <button
                            onClick={handleReturnToEdit}
                            className="btn btn-outline-secondary position-absolute"
                            style={{
                                bottom: '1rem',
                                right: '1rem',
                                padding: '0.5rem 1rem',
                                fontWeight: '500',
                                borderRadius: '0.5rem',
                            }}
                        >
                            Редактировать
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
    
    return (
        <>
            <Header />
            <div className="container py-4">
                <h2 className="mb-4 text-center">Актуальные акции</h2>

                {previewPromotion && (
                    <div className="alert alert-primary shadow-sm rounded-3 d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Предпросмотр новой акции:</strong> Проверьте баннер и описание перед сохранением.
                        </div>
                        <div>
                            <button className="btn btn-sm btn-outline-secondary me-2" onClick={handleReturnToEdit}>
                                Назад к редактированию
                            </button>
                        </div>
                    </div>
                )}

                <div className="row">
                    {previewPromotion && renderCard(previewPromotion, true)}
                    {promotions.map(p => renderCard(p))}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default CampaignsPage;
