import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../style/Banner.css';

const Banner = ({ preview }) => {
    const [banner, setBanner] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBanner = async () => {
            try {
                if (preview) {
                    setBanner(preview);
                } else {
                    const response = await axios.get('http://localhost:8081/banners/active?position=index&priority=11', {
                        withCredentials: true,
                    });
                    console.log("Banners: ", response.data)
                    if (response.data.length > 0) {
                        setBanner(response.data[0]); // берём первый баннер
                    }
                }
            } catch (err) {
                console.error('Ошибка при загрузке баннера:', err);
                setError('Не удалось загрузить баннер');
            }
        };

        fetchBanner();
    }, [preview]);

    // 🔧 Вспомогательная функция для извлечения <img> из HTML
    const extractImageFromHTML = (html) => {
        const match = html.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
        return match ? match[1] : null;
    };

    // 🔧 Вспомогательная функция для извлечения текста без тега <img>
    const extractTextOnly = (html) => {
        return html.replace(/<img[^>]*>/gi, '').trim();
    };

    if (banner) {
        const imageUrl = extractImageFromHTML(banner.title || '');
        const textOnly = extractTextOnly(banner.title || '');
        const link = `http://localhost:3000${banner.link || ''}`;

        return (
            <a href={link} className="banner-link">
                <section className="banner" style={{backgroundColor: banner.background_color}}>
                    <div className="bannerText">
                        <div
                            className="bannerTitle"
                            dangerouslySetInnerHTML={{ __html: textOnly }}
                        />
                        <button className="buttonBanner">Узнать больше</button>
                    </div>
                    {imageUrl && (
                        <div className="bannerImage">
                            <img src={imageUrl} alt="Баннер" />
                        </div>
                    )}
                </section>
            </a>
        );
    }

    // 🔙 Фоллбэк: если нет баннера
    return (
        <section className="banner">
            <div className="bannerText">
                <h6>Pro.Beyond.</h6>
                <h1 style={{ color: "white" }}>IPhone 14 <b>Pro</b></h1>
                <p>Создан, чтобы изменять все к лучшему. Для всех.</p>
                <button className="buttonBanner">Купить сейчас</button>
                {console.log("НЕТ")}
            </div>
            <div className="bannerImage">
                <img src="http://localhost:8081/assets/icon/Iphone Image.png" alt="IPhone 14 Pro" />
            </div>
        </section>
    );
};

export default Banner;
