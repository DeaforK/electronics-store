import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import styles from '../style/CategorySection.module.css'; // Импорт CSS модуля

const CategorySection = () => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('http://localhost:8081/categories', { withCredentials: true });
                // Фильтрация категорий по parent_id и преобразование данных категорий
                const filteredCategories = res.data
                    .filter(category => category.categories_id === null) // Оставляем только те категории, у которых parent_id равно null
                    .map(category => ({
                        ...category,
                        icon: `http://localhost:8081${category.icon_black}`
                    }));
                setCategories(filteredCategories);
            } catch (error) {
                console.error('Ошибка при загрузке категорий:', error);
            }
        };

        fetchCategories();
    }, []);

    return (
        <section className={styles.categorySection}>
            <div className={styles.categoryTitle}>
                <h2 className="text-start mb-4">Просмотр по категориям</h2>
            </div>
            <div className="container">
                <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
                    {categories.map(category => (
                        <div key={category._id} className="col">
                            <Link to={`/catalog/${category._id}`} >
                            <div className={styles.categoryCard}>
                                <img 
                                    src={category.icon} 
                                    alt={category.name} 
                                    className={styles.categoryIcon}
                                />
                                <p className={styles.categoryName}>{category.name}</p>
                            </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategorySection;
