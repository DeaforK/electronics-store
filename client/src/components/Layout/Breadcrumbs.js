import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const Breadcrumbs = () => {
    const location = useLocation();
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    useEffect(() => {
        const pathnames = location.pathname.split('/').filter(Boolean);

        const fetchBreadcrumbs = async () => {
            try {
                if (pathnames[0] === 'products' && pathnames[1]) {
                    // Страница товара по пути /products/:id
                    const productId = pathnames[1];
                    const productRes = await axios.get(`http://localhost:8081/products/${productId}`);
                    const product = productRes.data;

                    const categoryPath = await buildCategoryPath(product.categories_id);
                    setBreadcrumbs([
                        { name: 'Главная', path: '/' },
                        { name: 'Каталог', path: '/catalog' },
                        ...categoryPath,
                        { name: product.name },
                    ]);
                } else if (pathnames[0] === 'catalog' && pathnames[1] === 'promotion' && pathnames[2]) {
                    const promotionId = pathnames[2];
                    const res = await axios.get(`http://localhost:8081/promotions/${promotionId}`);
                    const promotion = res.data;

                    setBreadcrumbs([
                        { name: 'Главная', path: '/' },
                        { name: 'Акции', path: '/promotions' },
                        { name: promotion?.promotion?.name }
                    ]);
                } else if (pathnames[0] === 'catalog') {
                    if (pathnames[1] === 'products' && pathnames[2]) {
                        // Страница товара по пути /catalog/products/:id
                        const productId = pathnames[2];
                        const productRes = await axios.get(`http://localhost:8081/products/${productId}`);
                        const product = productRes.data;

                        const categoryPath = await buildCategoryPath(product.categories_id);
                        setBreadcrumbs([
                            { name: 'Главная', path: '/' },
                            { name: 'Каталог', path: '/catalog' },
                            ...categoryPath,
                            { name: product.name },
                        ]);
                    } else if (pathnames[1]) {
                        // Страница категории
                        const categoryId = pathnames[1];
                        const categoryPath = await buildCategoryPath(categoryId);

                        setBreadcrumbs([
                            { name: 'Главная', path: '/' },
                            { name: 'Каталог', path: '/catalog' },
                            ...categoryPath,
                        ]);
                    } else {
                        // Просто каталог
                        setBreadcrumbs([
                            { name: 'Главная', path: '/' },
                            { name: 'Каталог', path: '/catalog' },
                        ]);
                    }
                } else {
                    // Другая страница — только Главная
                    setBreadcrumbs([{ name: 'Главная', path: '/' }]);
                }
            } catch (err) {
                console.error('Ошибка при построении хлебных крошек:', err);
                setBreadcrumbs([{ name: 'Главная', path: '/' }]);
            }
        };

        fetchBreadcrumbs();
    }, [location.pathname]);


    const buildCategoryPath = async (categoryId) => {
        const path = [];
        let currentId = categoryId;

        while (currentId) {
            const res = await axios.get(`http://localhost:8081/categories/${currentId}`);
            const category = res.data;
            path.unshift({ name: category.name, path: `/catalog/${category._id}` });

            // Пробуем получить parent_id из вложенного объекта, если нет напрямую
            currentId = category.parent_id || category.parent?._id || category.categories_id?._id || null;
        }

        return path;
    };

    return (
        <section style={styles.breadcrumbs}>
            <nav aria-label="breadcrumb">
                <ol style={styles.breadcrumb}>
                    {breadcrumbs.map((item, idx) => (
                        <React.Fragment key={idx}>
                            {idx > 0 && <li style={styles.breadcrumbSeparator}>›</li>}
                            <li style={{
                                ...styles.breadcrumbItem,
                                ...(idx === breadcrumbs.length - 1 ? styles.breadcrumbItemActive : {})
                            }}>
                                {item.path ? (
                                    <Link to={item.path} style={styles.breadcrumbLink}>{item.name}</Link>
                                ) : (
                                    item.name
                                )}
                            </li>
                        </React.Fragment>
                    ))}
                </ol>
            </nav>
        </section>
    );
};

const styles = {
    breadcrumbs: {
        padding: '50px 100px',
        fontWeight: 500,
        fontSize: '16px',
    },
    breadcrumb: {
        backgroundColor: 'transparent',
        padding: 0,
        margin: 0,
        listStyleType: 'none',
        display: 'flex',
        alignItems: 'center',
    },
    breadcrumbItem: {
        marginRight: '20px',
        position: 'relative',
    },
    breadcrumbItemActive: {
        color: '#000000',
    },
    breadcrumbLink: {
        color: '#A4A4A4',
        textDecoration: 'none',
    },
    breadcrumbSeparator: {
        marginRight: '20px',
        color: '#A4A4A4',
    },
};

export default Breadcrumbs;
