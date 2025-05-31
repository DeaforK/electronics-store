import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FilterSection = ({ onFilterChange, categoryId, promotion }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(categoryId);
    const [minPrice, setMinPrice] = useState(null);
    const [maxPrice, setMaxPrice] = useState(null);
    const [selectedRatingRange, setSelectedRatingRange] = useState('');
    const [discountRange, setDiscountRange] = useState([0, 100]);

    const [dynamicFilters, setDynamicFilters] = useState([]); // Дополнительные фильтры с сервера
    const [selectedDynamicFilters, setSelectedDynamicFilters] = useState({});
    const [openSections, setOpenSections] = useState({});
    const [openSubSections, setOpenSubSections] = useState({});
    const [showAllValues, setShowAllValues] = useState({});

    // Получение фильтров и категорий
    useEffect(() => {
        const fetchData = async () => {
            try {
                const categoryRes = await axios.get('http://localhost:8081/categories/active', { withCredentials: true });
                setCategories(categoryRes.data);
                const initialCategory = categoryRes.data.find(cat => cat._id === categoryId) || categoryRes.data[0];
                if (initialCategory) setSelectedCategory(initialCategory._id);
                const filtersRes = promotion
                    ? await axios.get(`http://localhost:8081/promotions/${promotion.promotion._id}/filters`, { withCredentials: true })
                    : await axios.get('http://localhost:8081/products/filters', { withCredentials: true });
                const transformedFilters = Object.entries(filtersRes.data).flatMap(([sectionName, attributes]) =>
                    Object.entries(attributes).map(([name, values]) => ({
                        name,
                        values,
                    }))
                );
                setDynamicFilters(transformedFilters);
            } catch (err) {
                console.error('Ошибка при загрузке фильтров или категорий:', err);
            }
        };
        fetchData();
    }, [categoryId, promotion]);

    // Рекурсивный поиск всех подкатегорий
    const getAllSubcategories = (id, all) => {
        const sub = all.filter(c => c.categories_id?._id === id);
        const nested = sub.flatMap(c => getAllSubcategories(c._id, all));
        return [id, ...sub.map(c => c._id), ...nested];
    };

    const applyFilters = () => {
        const categoryIds = getAllSubcategories(selectedCategory, categories);
        const filters = {
            minPrice,
            maxPrice,
            ratingRange: selectedRatingRange,
            discountRange,
            category: categoryIds,
            ...selectedDynamicFilters,
        };
        console.log("Filters section: ", filters)
        onFilterChange(filters);
    };

    const handleDynamicFilterChange = (name, value) => {
        setSelectedDynamicFilters(prev => ({ ...prev, [name]: value }));
    };

    // Для динамических фильтров
    const handleCheckboxChange = (attributeName, value) => {
        setSelectedDynamicFilters(prev => {
            const existing = prev[attributeName] || [];
            return {
                ...prev,
                [attributeName]: existing.includes(value)
                    ? existing.filter(v => v !== value)
                    : [...existing, value],
            };
        });
    };

    // Тоггл основной секции
    const toggleSection = (sectionName) => {
        setOpenSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
    };

    // Тоггл вложенной секции
    const toggleSubSection = (attributeName) => {
        setOpenSubSections(prev => ({ ...prev, [attributeName]: !prev[attributeName] }));
    };


    const toggleShowAll = (attributeName) => {
        setShowAllValues(prev => ({ ...prev, [attributeName]: !prev[attributeName] }));
    };

    return (
        <div className="filter-section">
            {/* Категория */}
            <div>
                <div className="filter-label" data-toggle="collapse" data-target="#category-filter" aria-expanded="true">
                    Категория
                </div>
                <div id="category-filter" className="collapse">
                    <select
                        className="form-control"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(category => (
                            <option key={category._id} value={category._id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <hr />

            {/* Цена */}
            <div>
                <div className="filter-label" data-toggle="collapse" data-target="#price-filter" aria-expanded="true">
                    Цена
                </div>
                <div id="price-filter" className="collapse">
                    <div className="range-values d-flex gap-2">
                        <input
                            type="number"
                            className="form-control"
                            placeholder="От"
                            value={minPrice}
                            onChange={(e) => setMinPrice(Number(e.target.value))}
                        />
                        <input
                            type="number"
                            className="form-control"
                            placeholder="До"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>
            <hr />

            {/* Рейтинг */}
            <div>
                <div className="filter-label" data-toggle="collapse" data-target="#rating-filter" aria-expanded="true">
                    Рейтинг
                </div>
                <div id="rating-filter" className="collapse">
                    <select
                        className="form-control"
                        value={selectedRatingRange}
                        onChange={(e) => setSelectedRatingRange(e.target.value)}
                    >
                        <option value="">Любой</option>
                        <option value="4-5">4-5</option>
                        <option value="3-4">3-4</option>
                        <option value="2-3">2-3</option>
                        <option value="1-2">1-2</option>
                    </select>
                </div>
            </div>
            <hr />

            {/* Скидка */}
            <div>
                <div className="filter-label" data-toggle="collapse" data-target="#discount-filter" aria-expanded="false">
                    Скидка
                </div>
                <div id="discount-filter" className="collapse">
                    <select
                        className="form-control"
                        onChange={(e) => {
                            const [min, max] = e.target.value.split('-').map(Number);
                            setDiscountRange([min, max]);
                        }}
                    >
                        <option value="0-100">Любая</option>
                        <option value="0-10">До 10%</option>
                        <option value="10-20">10% - 20%</option>
                        <option value="20-50">20% - 50%</option>
                        <option value="50-100">Более 50%</option>
                    </select>
                </div>
            </div>
            <hr />

            {/* Динамические фильтры (из attributes) */}
            {dynamicFilters.map(section => (
                <div key={section.name}>
                    <div
                        className="filter-label cursor-pointer fw-bold"
                        onClick={() => toggleSection(section.name)}
                    >
                        {section.name}
                    </div>

                    <div
                        id={`section-${section.name}`}
                        className={`collapsible-content ${openSections[section.name] ? 'show' : ''} ms-2 mt-1`}
                    >
                        {Object.entries(section.values).map(([attributeName, values]) => {
                            const isOpen = openSubSections[attributeName];
                            const shouldShowAll = showAllValues[attributeName];
                            const visibleValues = shouldShowAll ? values : values.slice(0, 10);

                            return (
                                <div key={attributeName} className="mb-2">
                                    <div
                                        className="filter-label cursor-pointer"
                                        onClick={() => toggleSubSection(attributeName)}
                                    >
                                        {attributeName}
                                    </div>

                                    <div
                                        id={`attribute-${attributeName}`}
                                        className={`collapsible-content ${isOpen ? 'show' : ''} ms-3 mt-1`}
                                    >
                                        {visibleValues.map(value => (
                                            <div key={value} className="form-check">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id={`${attributeName}-${value}`}
                                                    checked={(selectedDynamicFilters[attributeName] || []).includes(value)}
                                                    onChange={() => handleCheckboxChange(attributeName, value)}
                                                />
                                                <label
                                                    className="form-check-label"
                                                    htmlFor={`${attributeName}-${value}`}
                                                >
                                                    {value}
                                                </label>
                                            </div>
                                        ))}

                                        {values.length > 10 && (
                                            <div className="mt-1">
                                                <button
                                                    className="btn btn-link btn-sm p-0"
                                                    onClick={() => toggleShowAll(attributeName)}
                                                >
                                                    {shouldShowAll ? 'Скрыть' : 'Показать ещё'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <hr />
                </div>
            ))}

            <button onClick={applyFilters} className="btn btn-primary mt-3">
                Применить фильтры
            </button>
        </div>
    );
};

export default FilterSection;
