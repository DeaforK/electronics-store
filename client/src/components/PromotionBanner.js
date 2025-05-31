import React, { useState, useRef, useEffect } from 'react';

function PromotionBanner({ promotion }) {
    const [showDescription, setShowDescription] = useState(false);
    const descriptionRef = useRef(null);
    const [descriptionHeight, setDescriptionHeight] = useState(0);

    useEffect(() => {
        if (descriptionRef.current) {
            setDescriptionHeight(descriptionRef.current.scrollHeight);
        }
    }, [promotion?.description, showDescription]);

    if (!promotion) return null;

    return (
        <section
            style={{
                ...styles.banner,
                backgroundColor: promotion.background_color || styles.banner.backgroundColor,
            }}
        >
            <div
                dangerouslySetInnerHTML={{ __html: promotion.banner }}
                style={styles.content}
            />

            {promotion.description && (
                <>
                    <button
                        onClick={() => setShowDescription((prev) => !prev)}
                        style={styles.toggleButton}
                    >
                        {showDescription ? 'Скрыть описание' : 'Показать описание'}
                    </button>

                    <div
                        ref={descriptionRef}
                        style={{
                            ...styles.descriptionWrapper,
                            maxHeight: showDescription ? `${descriptionHeight}px` : '0px',
                        }}
                    >
                        <p style={styles.descriptionText}>{promotion.description}</p>
                    </div>
                </>
            )}
        </section>
    );
}

const styles = {
    banner: {
        backgroundColor: '#f0f8ff',
        padding: '30px 0',
        marginBottom: '30px',
        borderRadius: '0px', // без скругления, если на всю ширину
        boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
        width: '100%',
        overflow: 'hidden',
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        textAlign: 'center',
        fontSize: '18px',
        lineHeight: '1.6',
    },
    toggleButton: {
        display: 'block',
        margin: '20px auto 10px',
        backgroundColor: '#000',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '10px 20px',
        cursor: 'pointer',
        fontSize: '16px',
    },
    descriptionWrapper: {
        overflow: 'hidden',
        transition: 'max-height 0.4s ease',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 20px',
    },
    descriptionText: {
        whiteSpace: 'pre-wrap',
        fontSize: '15px',
        color: '#333',
        paddingBottom: '20px',
    },
};

export default PromotionBanner;
