import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from "axios";

const PromotionIdPage = () => {
  const { id } = useParams(); // Получаем ID акции из URL
  const [products, setProducts] = useState([]);
  const [campaign, setCampaign] = useState(null);

  // Функция для загрузки товаров по ID акции
  useEffect(() => {
    const fetchPromotion = async () => {
      try {
        const response = await axios.get(`http://localhost:8081/promotions/${id}`); // Получаем информацию о по ID
        const data = await response.json();
        setCampaign(data);
      } catch (error) {
        console.error('Ошибка получения данных акции:', error);
      }
    };

    const fetchProductsInPromotion= async () => {
      try {
        const response = await axios.get(`http://localhost:8081/promotions/${id}`); // Получаем все товары для этой акции
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Ошибка получения товаров подходящих под акцию:', error);
      }
    };
    fetchPromotion();
    fetchProductsInPromotion();
  }, [id]);

  if (!campaign) {
    return <p>Загрузка информации о кампании...</p>;
  }

  return (
    <div className="container">
      <h1>{campaign.name}</h1>
      <p>{campaign.description}</p>

      <div className="row">
        {products.length === 0 ? (
          <p>Товары для этой акции не найдены.</p>
        ) : (
          products.map(product => (
            <div key={product._id} className="col-md-4">
              <div className="card">
                <img src={product.imageUrl} alt={product.name} className="card-img-top" />
                <div className="card-body">
                  <h5 className="card-title">{product.name}</h5>
                  <p className="card-text">{product.description}</p>
                  <p className="card-text">{`Цена: ${product.price} ₽`}</p>
                  <a href={`/product/${product._id}`} className="btn btn-primary">
                    Посмотреть товар
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PromotionIdPage;
