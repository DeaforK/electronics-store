import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../style/SummerSale.css';

const defaultBanner = {
    title: 'Big Summer <b>Sale</b>',
    description: 'Commodo fames vitae vitae leo mauris in. Eu consequat.',
    buttonText: 'Подробнее',
    link: '#',
    backgroundColor: '#FFFFFF',
    textColor: '#FFFFFF',
    image: 'http://localhost:8081/assets/icon/Summer-sale.png',
    isServer: false,
};

const SummerSale = ({ preview }) => {
    const [serverBanner, setServerBanner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const fetchBanner = async () => {
            try {
                const res = await axios.get('http://localhost:8081/banners/active?position=index&priority=41', {
                    withCredentials: true
                });
                console.log(res.data)

                if (Array.isArray(res.data) && res.data.length > 0) {
                    setServerBanner({ ...res.data[0], isServer: true });
                } else {
                    setServerBanner(null);
                }
            } catch (error) {
                console.error('Ошибка загрузки баннера summer-sale:', error);
                setServerBanner(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBanner();
    }, []);

    if (loading) return <div>Загрузка баннера...</div>;

    const finalBanner = preview
        ? { ...preview, isServer: true }
        : serverBanner
            ? { ...serverBanner, isServer: true }
            : defaultBanner;

    console.log("finalBanner:", finalBanner)

   
    const textStyle = {
        color: finalBanner.textColor,
        fontSize: windowWidth < 600 ? '6vw' : windowWidth < 1000 ? '5vw' : '4vw',
    };

    const titleStyle = {
        fontSize: windowWidth < 600 ? '8vw' : windowWidth < 1000 ? '7vw' : '6vw',
    };

    const buttonStyle = {
        fontSize: windowWidth < 600 ? '5vw' : windowWidth < 1000 ? '4vw' : '3vw',
    };

    return (
        finalBanner.isServer ? (
            <section
                className={`summer-sale ${finalBanner.image ? '' : 'summer-sale-no-img'}`}
                style={{ padding: 0 }}
            >
                <div className="summer-sale-text" style={textStyle}>
                    <div
                        className="summer-sale-title-with-button"
                        style={{ ...textStyle, ...titleStyle, backgroundColor: finalBanner.background_color, }}
                        dangerouslySetInnerHTML={{
                            __html: `${finalBanner.title} <a href="${finalBanner.link || '#'}"><button class="btn btn-outline-light" style={buttonStyle}>Подробнее</button></a>`
                        }}
                    />
                </div>
            </section>
        ) : (
            <section className="summer-sale" style={{ backgroundColor: finalBanner.backgroundColor }}>
                {!finalBanner.isServer && finalBanner.image && (
                    <img
                        src={finalBanner.image}
                        alt="Баннер"
                        className="summer-sale-img-full"
                    />
                )}
                <div className="summer-sale-text" style={textStyle}>
                    <h1 dangerouslySetInnerHTML={{ __html: finalBanner.title }} />
                    <p style={{ color: '#787878' }}>{finalBanner.description}</p>
                    <a href={finalBanner.link || '#'}>
                        <button className="btn btn-outline-light" style={buttonStyle}>
                            Подробнее
                        </button>
                    </a>
                </div>
            </section>
        )
    );
};

export default SummerSale;
