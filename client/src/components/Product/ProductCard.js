import React from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import '../../style/ProductCard.css';

const ProductCard = ({
    image,
    title,
    originalPrice,
    discountedPrice,
    discount,
    status,
    onFavoriteClick,
    isFavorite,
    onClick,
    is_on_sale,
    promotion
}) => {
    const isDiscounted = Boolean(discount);
    console.log(typeof discount)
    const isOutOfStock = status === "Закончился";

    // Получаем надпись акции
    const getPromotionLabel = () => {
        if (!promotion) return null;
        if (promotion.discount_type === 'Процент') return 'Акция: ' + promotion.discount_value.$numberDecimal + '% *';
        if (promotion.discount_type === 'Фиксированная сумма') return 'Акция: ' + promotion.discount_value.$numberDecimal + ' руб.';
        if (promotion.gift_product_id) return 'Акция: Подарок при покупке';
        return 'Акция';
    };

    return (
        <div className="col-md-4">
            <div
                className="product-card position-relative"
                onClick={onClick}
                style={{ cursor: 'pointer' }}
            >
                {is_on_sale && promotion && (
                    <span className="promotion-badge">{getPromotionLabel()}</span>
                )}

                <span
                    className="wishlist-icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        onFavoriteClick();
                    }}
                >
                    {isFavorite ? <FaHeart color="red" /> : <FaRegHeart />}
                </span>

                <img src={image} alt={title} className="products-image" />
                <p className="product-title">{title}</p>

                <div className="price-container">
                    {isOutOfStock ? (
                        <p className="out-of-stock-text">Закончился</p>
                    ) : (
                        <>
                            {isDiscounted && (
                                <div className="original-price-container">
                                    <p className="original-price strike-through">{originalPrice}</p>
                                    <span className="discount-info">
                                        {typeof discount === 'number' || typeof discount === 'string' 
                                            ? `−${discount}%`
                                            : `−${discount?.$numberDecimal || ''}%`}
                                    </span>
                                </div>
                            )}
                            <p className="discounted-price">{discountedPrice}</p>
                        </>
                    )}
                </div>

                <button
                    className={`btn product-btn ${isOutOfStock ? 'out-of-stock-btn' : ''}`}
                    disabled={isOutOfStock}
                >
                    {isOutOfStock ? 'Товар недоступен' : 'Купить'}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
