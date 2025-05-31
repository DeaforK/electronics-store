import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Layout/Footer';
import Header from '../../components/Layout/Header';
import { FaArrowLeft } from 'react-icons/fa';

function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:8081/users', { withCredentials: true });
            setUsers(res.data);
        } catch (err) {
            setError('Ошибка при загрузке пользователей.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            console.log(selectedUser)
            await axios.put(`http://localhost:8081/users/${selectedUser._id}`, selectedUser, { withCredentials: true });
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            alert('Ошибка при обновлении пользователя');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
        try {
            await axios.delete(`http://localhost:8081/users/${id}`, { withCredentials: true });
            fetchUsers();
        } catch (err) {
            alert('Ошибка при удалении пользователя');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Header />
            <div className="container mt-4">
                <Row className="align-items-center mb-4">
                    <Col xs="auto">
                        <Button variant="link" onClick={() => navigate('/admin')} className="me-3">
                            <FaArrowLeft style={{ color: '#333', fontSize: '24px' }} />
                        </Button>
                    </Col>
                    <Col className="text-center">
                        <h2 className="mb-0">Управление пользователями</h2>
                    </Col>
                    <Col xs="auto" /> {/* Пустой столбец для выравнивания */}
                </Row>
                <Form.Control
                    type="text"
                    placeholder="Поиск по имени или email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="my-3"
                />

                {loading ? (
                    <Spinner animation="border" />
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : (
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Имя</th>
                                <th>Email</th>
                                <th>Роль</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, idx) => (
                                <tr key={user._id}>
                                    <td>{idx + 1}</td>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        <Button size="sm" variant="outline-primary" onClick={() => handleEdit(user)} className="me-2">
                                            Редактировать
                                        </Button>
                                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(user._id)}>
                                            Удалить
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}

                <Modal show={showModal} onHide={() => setShowModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Редактировать пользователя</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Имя</Form.Label>
                            <Form.Control
                                type="text"
                                value={selectedUser?.name || ''}
                                onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={selectedUser?.email || ''}
                                onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Роль</Form.Label>
                            <Form.Select
                                value={selectedUser?.role || 'user'}
                                onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value })}
                            >
                                <option value="client">Пользователь</option>
                                <option value="admin">Администратор</option>
                                <option value="seller">Продавец-приёмщик</option>
                                <option value="courier">Курьер</option>
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>
                            Отмена
                        </Button>
                        <Button variant="primary" onClick={handleSave}>
                            Сохранить изменения
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
            <Footer />
        </>
    );
}

export default AdminUsersPage;
