import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import Loader from '../../components/Layout/Loader';
import Notification from '../../components/Layout/Notification';
import { FaArrowLeft } from 'react-icons/fa';
import Pagination from '../../components/Layout/Pagination';

function ActivityLogSellerPage() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filterDate, setFilterDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const navigate = useNavigate();

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await axios.get('http://localhost:8081/activity-log/seller', { withCredentials: true });
                const sortedLogs = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setLogs(sortedLogs);
                setFilteredLogs(sortedLogs);
            } catch (err) {
                setError('Не удалось загрузить журнал действий.');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const handleFilterDateChange = (e) => {
        const date = e.target.value;
        setFilterDate(date);
        if (date) {
            const filtered = logs.filter(log =>
                new Date(log.createdAt).toISOString().startsWith(date)
            );
            setFilteredLogs(filtered);
            setCurrentPage(1);
        } else {
            setFilteredLogs(logs);
        }
    };

    const handleOpenModal = (log) => {
        setSelectedLog(log);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedLog(null);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) return <Loader />;
    if (error) return <div className="text-danger">{error}</div>;

    return (
        <>
            <Header />
            <div className="container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <Button
                        variant="link"
                        onClick={() => navigate(-1)}
                        className="me-2 p-0"
                    >
                        <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                    </Button>
                    <h2>Журнал действий</h2>
                    <Form.Control
                        type="date"
                        value={filterDate}
                        onChange={handleFilterDateChange}
                        style={{ maxWidth: '200px' }}
                    />
                </div>

                {notification.message && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onDismiss={() => setNotification({ message: '', type: '' })}
                    />
                )}

                <ListGroup>
                    {currentItems.length > 0 ? (
                        currentItems.map(log => (
                            <ListGroup.Item
                                key={log._id}
                                className="d-flex justify-content-between align-items-center"
                                onClick={() => handleOpenModal(log)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span>
                                    <strong>Действие:</strong> {log.action_type}
                                    <br />
                                    <small>Дата и время: {new Date(log.createdAt).toLocaleString()}</small>
                                </span>
                                <span>
                                    <small>Пользователь: {log.user_id?.name || 'Неизвестно'}</small>
                                </span>
                            </ListGroup.Item>
                        ))
                    ) : (
                        <ListGroup.Item>Нет записей в журнале.</ListGroup.Item>
                    )}
                </ListGroup>
                <Pagination 
                    currentPage={currentPage}
                    totalPages={Math.ceil(logs.length / itemsPerPage)}
                    onPageChange={handlePageChange}
                />
            </div>

            {selectedLog && (
                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Детали действия</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p><strong>ID записи:</strong> {selectedLog._id}</p>
                        <p><strong>Тип действия:</strong> {selectedLog.action_type}</p>
                        <p><strong>Описание:</strong> {selectedLog.description}</p>
                        <p><strong>ID объекта:</strong> {selectedLog.item_id}</p>
                        <p><strong>Пользователь:</strong> {selectedLog.user_id?.name || 'Неизвестно'}</p>
                        <p><strong>Email пользователя:</strong> {selectedLog.user_id?.email || 'Неизвестно'}</p>
                        <p><strong>Дата:</strong> {new Date(selectedLog.createdAt).toLocaleString()}</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>Закрыть</Button>
                    </Modal.Footer>
                </Modal>
            )}
            <Footer />
        </>
    );
}

export default ActivityLogSellerPage;
