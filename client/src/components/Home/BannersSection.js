import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../style/BannersSection.css'; // Подключение CSS файла

// Дефолтные данные для баннеров
const defaultBanners = [
    {
        _id: 'banner-1',
        imgSrc: 'http://localhost:8081/assets/icon/banners-popular goods.png',
        imgAlt: 'Product Image',
        title: 'Популярные товары',
        description: 'iPad сочетает в себе великолепный 10,2-дюймовый дисплей Retina, невероятную производительность, многозадачность и простоту использования.',
        buttonText: 'Купить',
        backgroundColor: '',
        priority: 31,
        isServer: false,
    },
    {
        _id: 'banner-2',
        imgSrc: 'http://localhost:8081/assets/icon/Ipad Pro.png',
        imgAlt: 'Product Image',
        title: 'Популярные товары',
        description: 'iPad сочетает в себе великолепный 10,2-дюймовый дисплей Retina, невероятную производительность, многозадачность и простоту использования.',
        buttonText: 'Купить',
        backgroundColor: '#F9F9F9',
        priority: 32,
        isServer: false,
    },
    {
        _id: 'banner-3',
        imgSrc: 'http://localhost:8081/assets/icon/Samsung Galaxy.png',
        imgAlt: 'Product Image',
        title: 'Популярные товары',
        description: 'iPad сочетает в себе великолепный 10,2-дюймовый дисплей Retina, невероятную производительность, многозадачность и простоту использования.',
        buttonText: 'Купить',
        backgroundColor: '#EAEAEA',
        priority: 33,
        isServer: false,
    },
    {
        _id: 'banner-4',
        imgSrc: 'http://localhost:8081/assets/icon/Macbook banners.png',
        imgAlt: 'Product Image',
        title: 'Популярные товары',
        description: 'iPad сочетает в себе великолепный 10,2-дюймовый дисплей Retina, невероятную производительность, многозадачность и простоту использования.',
        buttonText: 'Купить',
        backgroundColor: '#2C2C2C',
        textColor: 'text-white',
        priority: 34,
        isServer: false,
    }
];

const BannersSection = ({ preview }) => {
    const [banners, setBanners] = useState(defaultBanners);
    const [loading, setLoading] = useState(true); // Стейт для загрузки
    const [error, setError] = useState(null); // Стейт для ошибки

    const extractColorFromText = (htmlString) => {
        // Преобразуем HTML-строку в DOM-элемент
        const div = document.createElement('div');
        div.innerHTML = htmlString;
    
        // Ищем все <span>, так как цвет может быть не в первом
        const spans = div.querySelectorAll('span');
    
        for (let span of spans) {
            const inlineColor = span.style.color;
            if (inlineColor) {
                console.log("Найден цвет:", inlineColor);
                return inlineColor;
            }
        }
    
        // Если цвет не найден, вернуть чёрный по умолчанию
        return '#000000';
    };
    
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await axios.get('http://localhost:8081/banners/active?position=index&priority=31,32,33,34', { withCredentials: true });
                console.log(res.data);

                // Если сервер прислал корректные данные
                if (Array.isArray(res.data)) {
                    // Извлекаем приоритеты баннеров с сервера
                    const serverPriorities = res.data.map(banner => banner.priority);

                    // Обновляем баннеры, сливая данные с сервера и дефолтные
                    const updatedBanners = defaultBanners.filter(banner => serverPriorities.includes(banner.priority))
                        .map(banner => {
                            const serverBanner = res.data.find(b => b.priority === banner.priority);
                            return { ...banner, ...serverBanner, isServer: true }; // Добавляем isServer: true к данным с сервера
                        });

                    // Добавляем дефолтные баннеры для тех приоритетов, которые не были возвращены с сервера
                    const missingBanners = defaultBanners.filter(banner => !serverPriorities.includes(banner.priority));

                    // Обновляем баннеры и сортируем их по приоритету
                    setBanners([...updatedBanners, ...missingBanners].sort((a, b) => a.priority - b.priority));

                }
            } catch (err) {
                setError('Ошибка при загрузке баннеров');
                console.error('Ошибка при загрузке баннеров:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    // Применяем предпросмотр и сортируем баннеры по приоритету
    const bannersToShow = [...banners].map(banner => {
        if (preview && preview.priority === banner.priority) {
            const extractedColor = extractColorFromText(preview.title);
            return {
                ...banner,
                ...preview,
                isServer: true,
                buttonColor: extractedColor
            };
        }
        
        // Если баннер с сервера, извлекаем цвет
        if (banner.isServer) {
            const extractedColor = extractColorFromText(banner.title); // Получаем цвет из title
            return { ...banner, buttonColor: extractedColor }; // Добавляем цвет к баннеру
        }

        return banner;
    }).sort((a, b) => a.priority - b.priority);


    // Сортировка баннеров по приоритету
    const sortedBanners = [...bannersToShow].sort((a, b) => a.priority - b.priority)

    // Функция для установки одинаковой высоты изображений
    const setEqualHeight = () => {
        const images = document.querySelectorAll('.banner-card img');
        let maxImageHeight = 0;

        images.forEach((image) => {
            image.style.height = 'auto';
            const imageHeight = image.offsetHeight;
            if (imageHeight > maxImageHeight) {
                maxImageHeight = imageHeight;
            }
        });

        images.forEach((image) => {
            image.style.height = maxImageHeight + 'px';
        });
    };

    useEffect(() => {
        setEqualHeight();

        window.addEventListener('resize', setEqualHeight);

        return () => {
            window.removeEventListener('resize', setEqualHeight);
        };
    }, []);

    if (loading) {
        return <div>Загрузка...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <section className="banners-section">
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 justify-content-center">
                {sortedBanners.map(banner => (
                    <div key={banner._id || banner.id} className="col-md-3">
                        {/* Условие для серверных баннеров */}
                        {banner.isServer ? (
                            <div className="product-card banner-card" style={{ backgroundColor: banner.background_color }}>
                                {/* Извлекаем изображение и текст из HTML */}
                                <div className="banner-title" dangerouslySetInnerHTML={{ __html: banner.title }} />
                                <a href={banner.link}>
                                    <button className="btn btn-outline-dark" style={{ color: banner.buttonColor || 'inherit', 
                                        borderColor: banner.buttonColor || 'inherit' }}>
                                        Купить
                                    </button>
                                </a>
                            </div>
                        ) : (
                            <div className="product-card banner-card" style={{ backgroundColor: banner.backgroundColor }}>
                                <img src={banner.imgSrc} alt={banner.imgAlt} />
                                <div className={banner.priority === 34 ? 'banner-text-white' : ''}>
                                    <h5>{banner.title}</h5>
                                    <p>{banner.description}</p>
                                    <button className={banner.priority === 34 ? 'btn btn-outline-light' : 'btn btn-outline-dark'}>
                                        {banner.buttonText}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>


    );
};

export default BannersSection;
