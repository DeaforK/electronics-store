import React from 'react';
import '../../style/ProductPage.css';

const ProductSpecs = () => {
    const specs = [
        { icon: 'https://via.placeholder.com/20', text: 'Размер экрана 6.7"' },
        { icon: 'https://via.placeholder.com/20', text: 'CPU Apple A16 Bionic' },
        { icon: 'https://via.placeholder.com/20', text: 'Кол-во ядер 6' },
        { icon: 'https://via.placeholder.com/20', text: 'Main camera 48-12-12 MP' },
        { icon: 'https://via.placeholder.com/20', text: 'Front-camera 12 MP' },
        { icon: 'https://via.placeholder.com/20', text: 'Аккумулятор 4323 mAh' },
    ];

    return (
        <div className="product-specs">
            {specs.map((spec, index) => (
                <div key={index} className="spec-item">
                    <img src={spec.icon} alt={spec.text} />
                    <span>{spec.text}</span>
                </div>
            ))}
        </div>
    );
};

export default ProductSpecs;
