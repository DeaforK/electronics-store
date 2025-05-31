import React from 'react';
import '../../style/ProductPage.css';

const AdditionalInfo = () => {
    const infoItems = [
        { icon: 'https://via.placeholder.com/50', text: 'Доставка 1-2 дня' },
        { icon: 'https://via.placeholder.com/50', text: 'В наличии Сегодня' },
        { icon: 'https://via.placeholder.com/50', text: 'Гарантия 1 год' },
    ];

    return (
        <div className="additional-info">
            {infoItems.map((item, index) => (
                <div key={index} className="info-item">
                    <img src={item.icon} alt={item.text} />
                    <span>{item.text}</span>
                </div>
            ))}
        </div>
    );
};

export default AdditionalInfo;
