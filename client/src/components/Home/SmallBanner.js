import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../../style/SmallerBanner.module.css'; // CSS-модуль

const defaultProducts = [
    {
        // Баннер 21
        id: 'product-1',
        imgSrc: 'http://localhost:8081/assets/icon/PlayStation.png',
        imgAlt: 'Playstation 5',
        title: 'Playstation 5',
        description: 'Невероятно мощные центральные и графические процессоры, а также твердотельный накопитель со встроенным интерфейсом ввода-вывода позволяют по-новому взглянуть на работу с PlayStation.',
        imgRight: true,
        priority: 21,
    },
    {
        // Баннер 22
        id: 'product-2',
        imgSrc: 'http://localhost:8081/assets/icon/MacBook Pro 14.png',
        imgAlt: 'Macbook Air',
        title: 'Macbook Air',
        description: 'В новом 15-дюймовом MacBook Air с большим дисплеем Liquid Retina есть место для большего количества ваших любимых функций.',
        button: 'Купить',
        imgRight: false,
        reverseOrder: true,
        priority: 22,
    },
    {
        // Баннер 23
        id: 'product-3',
        imgSrc: 'http://localhost:8081/assets/icon/Apple AirPods Max.png',
        imgAlt: 'Apple AirPods Max',
        title: 'Apple AirPods Max',
        description: 'Компьютерный звук. Послушайте, это мощно',
        imgRight: true,
        priority: 23,
    },
    {
        // Баннер 24
        id: 'product-4',
        imgSrc: 'http://localhost:8081/assets/icon/Apple Vision Pro.png',
        imgAlt: 'Apple Vision Pro',
        title: 'Apple Vision Pro',
        description: 'Захватывающий способ насладиться',
        textColor: 'text-white',
        priority: 24,
    }
];

const parseBanner = (banner, fallback, isServer = false) => {
    return {
        id: banner._id,
        title: banner.title || fallback?.title,
        link: banner.link || fallback?.link || '',
        isActive: banner.is_active ?? fallback?.isActive ?? true,
        position: banner.position || fallback?.position || '',
        priority: banner.priority ?? fallback?.priority ?? 0,
        startDate: banner.start_date || fallback?.startDate,
        endDate: banner.end_date || fallback?.endDate,
        backgroundColor: banner.background_color || fallback?.backgroundColor || '#FFFFFF',
        isServer
    };
};


const Products = ({ preview }) => {
    const [banners, setBanners] = useState([]);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await axios.get(
                    'http://localhost:8081/banners/active?position=index&priority=21,22,23,24',
                    { withCredentials: true }
                );
                console.log("Res:", res.data)

                if (Array.isArray(res.data)) {
                    const parsed = res.data.map(serverBanner => {
                        const fallback = defaultProducts.find(dp => dp._id === `product-${serverBanner.priority - 20}`);
                        return parseBanner(serverBanner, fallback, true);
                    });
                    setBanners(parsed);
                }
            } catch (err) {
                console.error('Ошибка при загрузке баннеров:', err);
            }
        };

        fetchBanners();
    }, []);


    const totalCount = 4;
    const priorities = [21, 22, 23, 24];

    const bannersToShow = priorities.map((priority, i) => {
        const fallback = defaultProducts[i];

        // Сначала ищем баннер в состоянии
        const banner = banners.find(b => b.priority === priority);

        if (preview && preview.priority === priority) {
            // Если есть предпросмотр, возвращаем его
            return parseBanner({ ...fallback, ...preview }, null, true);
        }

        // Если баннер найден в состоянии, то возвращаем его
        return banner || fallback;
    });



    return (
        <section className={styles.smallerBanner}>
            <div className={styles.productGrid}>
                {bannersToShow.map((product, index) => (
                    <div
                        key={product.id || index}
                        className={`${styles.product} ${styles[`product-${product.priority - 20}`]}`}
                        style={{ backgroundColor: product.backgroundColor }}
                    >
                        {product.isServer ? (
                            // Если isServer true, создаём новую структуру с HTML в title
                            <>
                                {console.log('Product.title #', product.id, ' ', product.html)}
                                <div className={styles.productInfo}>
                                    <h2 className={product.textColor || ''} dangerouslySetInnerHTML={{ __html: product.title }}></h2>
                                    <p>{product.description}</p>
                                    {product.link && (product.priority === 22) && (
                                        <a href={product.link}>
                                            <button className="btn btn-outline-dark">Перейти</button>
                                        </a>
                                    )}
                                </div>
                                <div className={styles.productImgContainer}>
                                    <img
                                        src={product.imgSrc}
                                        className={`${styles.productImg} ${product.imgRight ? styles.productImgRight : ''}`}
                                        alt={product.imgAlt}
                                    />
                                </div>
                            </>
                        ) : (
                            // Если isServer false, отображаем старую сетку
                            <>
                                {product.reverseOrder ? (
                                    <>
                                        <div className={styles.productInfo}>
                                            <h2 className={product.textColor || ''}><b>{product.title}</b></h2>
                                            <p>{product.description}</p>
                                            {product.link && (
                                                <a href={product.link}>
                                                    <button className="btn btn-outline-dark">Перейти</button>
                                                </a>
                                            )}
                                        </div>
                                        <div className={styles.productImgContainer}>
                                            <img
                                                src={product.imgSrc}
                                                className={`${styles.productImg} ${product.imgRight ? styles.productImgRight : ''}`}
                                                alt={product.imgAlt}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.productImgContainer}>
                                            <img
                                                src={product.imgSrc}
                                                className={`${styles.productImg} ${product.imgRight ? styles.productImgRight : ''}`}
                                                alt={product.imgAlt}
                                            />
                                        </div>
                                        <div className={styles.productInfo}>
                                            <h2 className={product.textColor || ''}><b>{product.title}</b></h2>
                                            <p>{product.description}</p>
                                            {product.link && (
                                                <a href={product.link}>
                                                    <button className="btn btn-outline-dark">Перейти</button>
                                                </a>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Products;
