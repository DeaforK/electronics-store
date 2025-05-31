import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListGroup, Button, Modal, Form, Alert, Container, Pagination, Image } from 'react-bootstrap';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Notification from '../../components/Layout/Notification'; // Импортируйте компонент Notification

function AdminCategories() {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [archivedCategories, setArchivedCategories] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [parentCategoryId, setParentCategoryId] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [iconWhite, setIconWhite] = useState(null);
    const [iconBlack, setIconBlack] = useState(null);
    const [iconWhitePreview, setIconWhitePreview] = useState(null);
    const [iconBlackPreview, setIconBlackPreview] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);
    const [categoryToActOn, setCategoryToActOn] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get('http://localhost:8081/categories/active', { withCredentials: true });
                setCategories(response.data);
            } catch (error) {
                setError('Ошибка при загрузке категорий');
            } finally {
                setLoading(false);
            }
        };

        const fetchArchivedCategories = async () => {
            try {
                const response = await axios.get('http://localhost:8081/categories/archived', { withCredentials: true });
                setArchivedCategories(response.data);
            } catch (error) {
                setError('Ошибка при загрузке архивированных категорий');
                navigate('/login')
            }
        };

        fetchCategories();
        fetchArchivedCategories();
    }, []);

    const handleFileChange = (e, setter, previewSetter) => {
        const file = e.target.files[0];
        setter(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                previewSetter(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const checkCategoryNameUnique = async (name) => {
        try {
            const response = await axios.get('http://localhost:8081/categories', { withCredentials: true });
            const existingCategories = response.data;

            // Проверка, существует ли категория с таким же названием
            const categoryExists = existingCategories.some(category => category.name.toLowerCase() === name.toLowerCase());

            return !categoryExists;  // Возвращаем true, если категория уникальна, иначе false
        } catch (error) {
            console.error('Ошибка при проверке уникальности категории:', error);
            return true;  // В случае ошибки возвращаем true (чтобы не блокировать добавление)
        }
    };


    const handleAddOrEditCategory = async () => {
        // Проверка на уникальность названия категории
        const isUnique = await checkCategoryNameUnique(newCategoryName);
        if (!isUnique) {
            setError('Категория с таким названием уже существует.');
            // Очистить сообщение через 3 секунды
            setTimeout(() => {
                setMessage('');
                setError(null);
            }, 3000);
            return;  // Прерываем выполнение функции, если название не уникально
        }

        const formData = new FormData();
        formData.append('name', newCategoryName);

        if (parentCategoryId) {
            formData.append('categories_id', parentCategoryId);
        }

        if (iconWhite) formData.append('icon_white', iconWhite);
        if (iconBlack) formData.append('icon_black', iconBlack);

        try {
            if (editingCategory) {
                await axios.put(`http://localhost:8081/categories/${editingCategory._id}`, formData, { withCredentials: true });
                setMessage('Категория успешно изменена.');
            } else {
                await axios.post('http://localhost:8081/categories', formData, { withCredentials: true });
                setMessage('Категория добавлена успешно.');
            }
            resetForm();
            await refreshCategories();
        } catch (error) {
            console.error('Ошибка при сохранении категории:', error);
            setError('Ошибка при сохранении категории.');
        } finally {
            setTimeout(() => {
                setMessage('');
                setError(null);
            }, 3000);
        }
    };



    const refreshCategories = async () => {
        try {
            const activeResponse = await axios.get('http://localhost:8081/categories/active', { withCredentials: true });
            const archivedResponse = await axios.get('http://localhost:8081/categories/archived', { withCredentials: true });
            setCategories(activeResponse.data);
            setArchivedCategories(archivedResponse.data);
        } catch (error) {
            setError('Ошибка при обновлении категорий.');
        }
    };

    const handleConfirmAction = (action, category) => {
        setActionToConfirm(action);
        setCategoryToActOn(category);
        setShowConfirmModal(true);
    };

    const handleConfirmedAction = async () => {
        if (!categoryToActOn || !actionToConfirm) return;

        try {
            if (actionToConfirm === 'archive') {
                await axios.delete(`http://localhost:8081/categories/${categoryToActOn._id}`, { withCredentials: true });
                setMessage('Категория архивирована.');
            } else if (actionToConfirm === 'restore') {
                await axios.put(`http://localhost:8081/categories/restore/${categoryToActOn._id}`, {}, { withCredentials: true });
                setMessage('Категория восстановлена.');
            }
            await refreshCategories();
        } catch (error) {
            setError('Ошибка при выполнении действия.');
        } finally {
            setShowConfirmModal(false);
            setCategoryToActOn(null);
            setActionToConfirm(null);
            // Очистить сообщение через 3 секунды
            setTimeout(() => {
                setMessage('');
                setError(null);
            }, 3000);
        }
    };

    // Функция для сброса уведомления
    const resetMessage = () => {
        setMessage('');
        setError(null);
    };

    const resetForm = () => {
        setNewCategoryName('');
        setParentCategoryId(null);
        setIconWhite(null);
        setIconBlack(null);
        setIconWhitePreview(null);
        setIconBlackPreview(null);
        setEditingCategory(null);
        setShowModal(false);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setNewCategoryName(category.name); // Устанавливаем название категории
        setParentCategoryId(category.categories_id ? category.categories_id._id : null); // Устанавливаем родительскую категорию
        setIconWhitePreview(`http://localhost:8081${category.icon_white}`); // Устанавливаем иконку белого цвета
        setIconBlackPreview(`http://localhost:8081${category.icon_black}`); // Устанавливаем иконку черного цвета
        setShowModal(true); // Показываем модальное окно
    };

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    const paginatedCategories = (categories) => {
        const indexOfLastCategory = currentPage * itemsPerPage;
        const indexOfFirstCategory = indexOfLastCategory - itemsPerPage;
        return categories.slice(indexOfFirstCategory, indexOfLastCategory);
    };

    const toggleSubcategories = (categoryId) => {
        setExpandedCategories((prevExpandedCategories) => ({
            ...prevExpandedCategories,
            [categoryId]: !prevExpandedCategories[categoryId],
        }));
    };

    // Рекурсивная функция для рендеринга категорий и подкатегорий
    const renderCategoryItem = (category, level = 0) => {
        const currentCategories = showArchived ? archivedCategories : categories;
        // Получаем подкатегории для текущей категории
        const subcategories = currentCategories.filter(subcategory =>
            subcategory.categories_id && subcategory.categories_id._id === category._id
        );

        const hasChildren = subcategories.length > 0;

        // Вычисление оставшихся дней
        const remainingDays = category.archivedAt ? Math.max(0, 65 - Math.floor((new Date() - new Date(category.archivedAt)) / (1000 * 60 * 60 * 24))) : null;

        return (
            <div key={category._id} style={{ marginLeft: `${level * 20}px` }}>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                    <div>
                        {hasChildren && (
                            <Button variant="link" onClick={() => toggleSubcategories(category._id)}>
                                {expandedCategories[category._id] ? <FaChevronUp /> : <FaChevronDown />}
                            </Button>
                        )}
                        {category.name}
                    </div>

                    <div>
                        {showArchived ? (
                            <>
                                {remainingDays !== null && (
                                    <span
                                        className="ml-2"
                                        style={{ margin: `10px`, color: remainingDays < 10 ? 'red' : 'inherit' }} // Меняем цвет на красный, если оставшиеся дни меньше 10
                                    >
                                        {remainingDays} {remainingDays === 1 ? 'день' : 'дня'} до удаления
                                    </span>
                                )}
                                <Button variant="success" style={{ margin: `10px` }} size="sm" className="mt-2" onClick={() => handleConfirmAction('restore', category)}>Восстановить</Button>
                                <Button variant="primary" style={{ margin: `10px` }} size="sm" className="mt-2 ml-2" onClick={() => handleEditCategory(category)}>Изменить</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="danger" style={{ margin: `10px` }} size="sm" className="mt-2" onClick={() => handleConfirmAction('archive', category)}>Архивировать</Button>
                                <Button variant="primary" style={{ margin: `10px` }} size="sm" className="mt-2 ml-2" onClick={() => handleEditCategory(category)}>Изменить</Button>
                            </>
                        )}
                    </div>

                </ListGroup.Item>

                {/* Рекурсивно рендерим подкатегории, если они существуют */}
                {hasChildren && expandedCategories[category._id] && (
                    <ListGroup className="ml-4 mt-2">
                        {subcategories.map(subcategory => (
                            <div key={subcategory._id}>
                                {renderCategoryItem(subcategory, level + 1)}
                            </div>
                        ))}
                    </ListGroup>
                )}
            </div>
        );
    };


    const renderCategories = () => {
        const currentCategories = showArchived ? archivedCategories : categories;
        console.log(currentCategories);

        if (!currentCategories || currentCategories.length === 0) {
            return (
                <ListGroup.Item className="text-center">
                    {showArchived ? 'Архивные категории отсутствуют' : 'Активные категории отсутствуют'}
                </ListGroup.Item>
            );
        }

        // Фильтруем только если есть хотя бы одна главная категория
        let filteredCategories = currentCategories.filter(category => category.categories_id === null);

        // Если нет главных категорий, показываем все
        if (filteredCategories.length === 0) {
            filteredCategories = currentCategories;
        }

        console.log(filteredCategories);

        return (
            <>
                {paginatedCategories(filteredCategories).map(category => renderCategoryItem(category))}
                <Pagination>
                    {Array.from({ length: Math.ceil(filteredCategories.length / itemsPerPage) }, (_, index) => (
                        <Pagination.Item
                            key={index + 1}
                            active={index + 1 === currentPage}
                            onClick={() => handlePageChange(index + 1)}
                        >
                            {index + 1}
                        </Pagination.Item>
                    ))}
                </Pagination>
            </>
        );
    };


    if (loading) {
        return <div>Загрузка...</div>;
    }

    return (
        <>
            <Header />
            <Container>
                <h2 className="mt-4">Управление категориями</h2>
                {error && <Alert variant="danger">{error}</Alert>}
                {message && (
                    <Notification message={message} onDismiss={resetMessage} />
                )}


                <Button variant="link" onClick={() => navigate('/admin')} className="me-3">
                    <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                </Button>
                <Button
                    variant="primary"
                    className="my-4"
                    onClick={() => setShowModal(true)}
                    data-testid="add-category-button" // Добавьте этот атрибут
                >
                    Добавить категорию
                </Button>

                <Button variant="link" onClick={() => setShowArchived(!showArchived)}>
                    {showArchived ? 'Показать активные категории' : 'Показать архивные категории'}
                </Button>

                <ListGroup>{renderCategories()}</ListGroup>
            </Container>

            {/* Модальное окно для добавления/редактирования категории */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title data-testid="modal-title">
                        {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* Название категории */}
                        <Form.Group controlId="formCategoryName">
                            <Form.Label>Название категории</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Введите название категории"
                                value={newCategoryName || ''}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                        </Form.Group>

                        {/* Выбор родительской категории */}
                        <Form.Group controlId="formParentCategory">
                            <Form.Label>Родительская категория (если есть)</Form.Label>
                            <Form.Control
                                as="select"
                                value={parentCategoryId || ""}
                                onChange={(e) => setParentCategoryId(e.target.value)}
                            >
                                <option value="">Нет</option>
                                {categories.map(category => (
                                    <option key={category._id} value={category._id}>
                                        {category.name}
                                    </option>
                                ))}
                            </Form.Control>
                        </Form.Group>

                        {/* Поля загрузки иконок (только для категорий без родителя) */}
                        {(!parentCategoryId || parentCategoryId === "") && (
                            <>
                                <Form.Group controlId="formIconWhite">
                                    <Form.Label>Иконка белая</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={(e) => handleFileChange(e, setIconWhite, setIconWhitePreview)}
                                    />
                                    {iconWhitePreview && (
                                        <Image
                                            style={{ backgroundColor: 'black' }}
                                            src={iconWhitePreview}
                                            thumbnail
                                            className="mt-2"
                                        />
                                    )}
                                </Form.Group>

                                <Form.Group controlId="formIconBlack">
                                    <Form.Label>Иконка чёрная</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={(e) => handleFileChange(e, setIconBlack, setIconBlackPreview)}
                                    />
                                    {iconBlackPreview && (
                                        <Image
                                            src={iconBlackPreview}
                                            thumbnail
                                            className="mt-2"
                                        />
                                    )}
                                </Form.Group>
                            </>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" data-testid="cancel-button" onClick={resetForm}>Отмена</Button>
                    <Button variant="primary" data-testid="save-button" onClick={handleAddOrEditCategory}>
                        {editingCategory ? 'Сохранить изменения' : 'Добавить категорию'}
                    </Button>
                </Modal.Footer>
            </Modal>


            {/* Модальное окно подтверждения действий */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Подтверждение действия</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Вы уверены, что хотите {actionToConfirm === 'archive' ? 'архивировать' : 'восстановить'} категорию {categoryToActOn?.name}?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Отмена</Button>
                    <Button variant="primary" onClick={handleConfirmedAction}>Подтвердить</Button>
                </Modal.Footer>
            </Modal>

            <Footer />
        </>
    );
}

export default AdminCategories;
