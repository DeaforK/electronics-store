import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import FilterSection from './Layout/FilterSection';
import ProductList from './Layout/ProductList';
import Pagination from './Layout/Pagination';
import '../style/CatalogMain.css';

function CatalogMain({ promotion }) {
    const { id } = useParams();

    const [filters, setFilters] = useState({
        category: [],
        minPrice: null,
        maxPrice: null,
        discountRange: '',
        ratingRange: ''
    });
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [sortOption, setSortOption] = useState('rating');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;
    const [isLoading, setIsLoading] = useState(false);

    const getAllSubcategories = (id, all) => {
        const sub = all.filter(c => c.categories_id?._id === id);
        const nested = sub.flatMap(c => getAllSubcategories(c._id, all));
        return [id, ...sub.map(c => c._id), ...nested];
    };

    // Загрузка всех категорий при инициализации и при изменении id
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`http://localhost:8081/categories/active`);
                setCategories(res.data);

                const allIds = getAllSubcategories(id, res.data);
                setFilters(prev => ({
                    ...prev,
                    category: allIds
                }));
                setCurrentPage(1);
            } catch (error) {
                console.error('Ошибка загрузки подкатегорий:', error);
            }
        };

        fetchCategories();
    }, [id]);

    // Обновить категорию при переходе
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            category: id
        }));
        setCurrentPage(1);
    }, [id]);

    const getSortParams = (sortOption) => {
        switch (sortOption) {
            case 'price_asc':
                return { sortBy: 'variations.price', order: 'asc' };
            case 'price_desc':
                return { sortBy: 'variations.price', order: 'desc' };
            case 'discount':
                return { sortBy: 'variations.discount', order: 'desc' };
            case 'rating':
            default:
                return { sortBy: 'rating', order: 'desc' };
        }
    };

    // Загрузка товаров
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const url = promotion
                    ? `http://localhost:8081/promotions/${promotion.promotion._id}/products`
                    : `http://localhost:8081/products/active/search`;

                const { sortBy, order } = getSortParams(sortOption);
                // console.log("CatalogMain: ", filters)
                const response = await axios.get(url, {
                    params: {
                        ...filters,
                        sortBy,
                        order,
                        page: currentPage,
                        limit: itemsPerPage
                    }
                });
                // console.log(response.data)
                setProducts(response.data.variations || []);
                setTotalProducts(response.data.total || 0);
            } catch (error) {
                console.error('Ошибка загрузки товаров:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, [filters, sortOption, currentPage, promotion]);

    const handleFiltersChange = (newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters,
            // category: newFilters.categories?.[0] || prev.category
        }));
        setCurrentPage(1);
    };

    const handleSortChange = (e) => {
        setSortOption(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Группировка вариаций по product._id
    const groupedProducts = {};
    products.forEach(variation => {
        const product = variation.product;
        const productId = product._id;

        if (!groupedProducts[productId]) {
            groupedProducts[productId] = {
                ...product,
                variations: []
            };
        }

        groupedProducts[productId].variations.push(variation);
    });

    const groupedArray = Object.values(groupedProducts);

    // console.log(promotion)


    return (
        <section className="catalog-main d-flex gap-3">
            <div className="col-md-3">
                <FilterSection
                    promotion={promotion}
                    onFilterChange={handleFiltersChange}
                    categoryId={id}
                />
            </div>
            <div className="col-md-9">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Товары: {groupedArray.length}</h5>
                    <select className="custom-select" onChange={handleSortChange} value={sortOption}>
                        <option value="rating">По рейтингу</option>
                        <option value="price_asc">По возрастанию цены</option>
                        <option value="price_desc">По убыванию цены</option>
                        <option value="discount">По величине скидки</option>
                    </select>
                </div>

                {isLoading ? (
                    <p>Загрузка...</p>
                ) : (
                    <>
                        <ProductList products={products} promotion={promotion}/>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(totalProducts / itemsPerPage)}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </div>
        </section>
    );
}

export default CatalogMain;
