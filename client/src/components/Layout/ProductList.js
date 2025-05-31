import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from '../Product/ProductCard';
import '../../style/ProductSection.css';
import { useNavigate } from 'react-router-dom';
import Notification from "../Layout/Notification";

export default function ProductList({ products, promotion }) {
  const [favorites, setFavorites] = useState([]);
  const [notification, setNotification] = useState({ message: "", type: "" });

  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState(false);

  const navigate = useNavigate();

  const fetchUser = async () => {
    try {
      const response = await axios.get('http://localhost:8081', { withCredentials: true });
      setUser(response.data.data);
      setAuth(true);
    } catch (error) {
      console.error('Ошибка при проверке аутентификации:', error);
      setAuth(false);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      try {
        const userId = user.userId;
        const response = await axios.get(`http://localhost:8081/favorites/${userId}`, { withCredentials: true });
        setFavorites(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке избранного:', error);
      }
    };
    fetchFavorites();
  }, [user]);

  if (!products.length) {
    return <div>Нет товаров</div>;
  }
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 3000);
  };

  // Группировка вариаций по product._id
  const groupedProducts = {};
  products.forEach(variation => {
    const product = variation.product;
    const productId = product._id;

    if (!groupedProducts[productId]) {
      groupedProducts[productId] = {
        ...product,
        variations: [],
        applicable_promotions: variation.applicable_promotions || [], // Явно добавляем
      };
    }

    groupedProducts[productId].variations.push(variation);
  });

  const groupedArray = Object.values(groupedProducts);

  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  const toggleFavorite = async (id) => {
    if (!auth) {
      showNotification("Пожалуйста, войдите в аккаунт для добавления в избранное.", "danger");
      return;
    }

    const userId = user.userId;
    try {
      const isFavorite = favorites.some(fav => fav.products_id._id === id); // Сравниваем с _id продукта
      if (isFavorite) {
        const favorite = favorites.find(fav => fav.products_id._id === id);
        await axios.delete(`http://localhost:8081/favorites/${favorite._id}`, { withCredentials: true });
        setFavorites(favorites.filter(fav => fav._id !== favorite._id));
      } else {
        await axios.post(`http://localhost:8081/favorites`, { users_id: userId, products_id: id }, { withCredentials: true });
        const response = await axios.get(`http://localhost:8081/favorites/${userId}`, { withCredentials: true });
        setFavorites(response.data);
      }
    } catch (error) {
      console.error('Ошибка при добавлении/удалении товара в избранное:', error);
    }
  };

  console.log(groupedArray)
  console.log(promotion)

  return (
    <section className="product-section">
      {notification.message && (
        <Notification message={notification.message} type={notification.type} />
      )}
      <div className="row g-3">
        {groupedArray.map((product) => {
          const { _id, images, name, variations = [] } = product;

          const prices = variations.map(v => parseFloat(v.price?.$numberDecimal || v.price || 0));
          const discounts = variations.map(v => parseFloat(v.discount?.$numberDecimal || v.discount || 0));

          const minPrice = Math.min(...prices);
          const maxDiscount = Math.max(...discounts, 0);
          const finalPrice = maxDiscount ? (minPrice * (1 - maxDiscount / 100)).toFixed(2) : minPrice.toFixed(2);

          // === Логика promo ===
          let promo = null;

          if (!promotion?.promotion) {
            if (product.applicable_promotions?.length) {
              promo = product.applicable_promotions[0];
            }
          } else {
            promo = promotion?.promotion
          }
          return (
            <ProductCard
              key={_id}
              image={`http://localhost:8081${images?.[0]}`}
              title={name}
              status={product.status}
              originalPrice={`${minPrice.toFixed(2)} руб.`}
              discountedPrice={`${finalPrice} руб.`}
              discount={maxDiscount || null}
              onClick={() => handleProductClick(_id)}
              is_on_sale={product.is_on_sale}
              promotion={product.is_on_sale ? promo : null}
              onFavoriteClick={() => toggleFavorite(_id)}
              isFavorite={favorites.some(fav => fav.products_id._id === _id)}
            />
          );
        })}
      </div>
    </section>
  );
}
