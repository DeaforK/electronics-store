import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../style/CategoryTree.css';
import { CSSTransition } from 'react-transition-group';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

const CategoryTree = () => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('http://localhost:8081/categories');
                const categoryTree = buildCategoryTree(res.data);
                console.log("Получаемые данные с сервера: ", res.data)
                setCategories(categoryTree);
            } catch (error) {
                console.error('Ошибка при загрузке категорий:', error);
            }
        };

        fetchCategories();
    }, []);

    const buildCategoryTree = (categories) => {
        const map = {}; // Хранилище для категорий по их _id
        const roots = []; // Корневые категории
    
        // Создаем карту всех категорий
        categories.forEach(category => {
            map[category._id] = { ...category, children: [] };
        });
    
        // Формируем дерево категорий
        categories.forEach(category => {
            const parentId = category.categories_id?._id; // Проверяем, есть ли родительская категория
            if (parentId) {
                if (map[parentId]) {
                    map[parentId].children.push(map[category._id]);
                } else {
                    console.warn(`Родительская категория с ID ${parentId} не найдена`);
                }
            } else {
                roots.push(map[category._id]);
            }
        });
    
        return roots;
    };
    

    return (
        <div className="container my-4"> {/* Используем Bootstrap контейнер и отступы */}
            <h2 className="text-start mb-4">Древо категорий</h2>
            <CategoryTreeNode categories={categories} />
        </div>
    );
};

const CategoryTreeNode = ({ categories }) => {
    return (
        <ul className="category-tree">
            {categories.map((category, index) => (
                <CategoryItem 
                    key={category._id} 
                    category={category} 
                    isLast={index === categories.length - 1} 
                />
            ))}
        </ul>
    );
};

const CategoryItem = ({ category, isLast }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <li className={`category-item ${isLast ? 'last-item' : ''}`}>
            <div className="category-header">
                {category.children.length > 0 && (
                    <button className="toggle-button" onClick={toggleExpand}>
                        {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                    </button>
                )}
                <Link to={`/catalog/${category._id}`} className="category-link">
                    <span className="category-name">{category.name}</span>
                </Link>
            </div>
            {category.children.length > 0 && (
                <CSSTransition in={isExpanded} timeout={300} classNames="subcategory" unmountOnExit>
                    <ul className="subcategory-tree">
                        <CategoryTreeNode categories={category.children} />
                    </ul>
                </CSSTransition>
            )}
        </li>
    );
};

export default CategoryTree;
