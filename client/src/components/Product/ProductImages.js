import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../../style/ProductPage.css';

const ProductImages = () => {
    const { id } = useParams(); 
    const [selectedImage, setSelectedImage] = useState(null); // Убираем значение по умолчанию
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchProductImages = async () => {
            if (id) {
                try {
                    const response = await axios.get(`http://localhost:8081/products/${id}`);
                    const productData = response.data;
                    if (productData.images && Array.isArray(productData.images)) {
                        const fullImages = productData.images.map(image => `http://localhost:8081${image}`);
                        setImages(fullImages);
                        setSelectedImage(fullImages[0]); // Устанавливаем первое изображение
                    } else {
                        console.warn('Изображения не найдены или не являются массивом.');
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке изображений продукта:', error);
                }
            }
        };

        fetchProductImages();
    }, [id]);

    const handleImageClick = (imageUrl) => {
        const imageElement = document.querySelector('.selected-image');
        if (imageElement) {
            imageElement.classList.remove('show');
            setTimeout(() => {
                setSelectedImage(imageUrl);
                imageElement.classList.add('show');
            }, 300);
        } else {
            setSelectedImage(imageUrl);
        }
    };

    return (
        <div className="row">
            <div className="col-2 product-images">
                {images.length > 0 ? (
                    images.map((imageUrl, index) => (
                        <img
                            key={index}
                            src={imageUrl}
                            alt={`Thumbnail ${index + 1}`}
                            className="img-fluid thumbnail"
                            onClick={() => handleImageClick(imageUrl)}
                        />
                    ))
                ) : (
                    <p>Изображений нет.</p>
                )}
            </div>
            <div className="col-10">
                <div className="image-wrapper">
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Main Product Image"
                            className="img-fluid selected-image show"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductImages;
