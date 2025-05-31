import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function AddAddressPage() {
    const [city, setCity] = useState('');
    const [street, setStreet] = useState('');
    const [house, setHouse] = useState('');
    const [apartment, setApartment] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                'http://localhost:8081/user/add',
                {
                    addresses: [{ city, street, house, apartment }],
                },
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 200) {
                setSuccess('Адрес успешно добавлен');
                setCity('');
                setStreet('');
                setHouse('');
                setApartment('');
            }
        } catch (error) {
            setError('Ошибка при добавлении адреса. Попробуйте еще раз.');
            console.error('Ошибка:', error);
        }
    };

    return (
        <Container className="p-4" style={{ backgroundColor: '#f0f0f0', borderRadius: '8px', maxWidth: '500px' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="city" className="mb-3">
                    <Form.Label>Город</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Введите город"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        style={{ backgroundColor: '#e0e0e0', borderColor: '#ccc' }}
                    />
                </Form.Group>

                <Form.Group controlId="street" className="mb-3">
                    <Form.Label>Улица</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Введите улицу"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        required
                        style={{ backgroundColor: '#e0e0e0', borderColor: '#ccc' }}
                    />
                </Form.Group>

                <Form.Group controlId="house" className="mb-3">
                    <Form.Label>Дом</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Введите номер дома"
                        value={house}
                        onChange={(e) => setHouse(e.target.value)}
                        required
                        style={{ backgroundColor: '#e0e0e0', borderColor: '#ccc' }}
                    />
                </Form.Group>

                <Form.Group controlId="apartment" className="mb-3">
                    <Form.Label>Квартира</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Введите номер квартиры"
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        style={{ backgroundColor: '#e0e0e0', borderColor: '#ccc' }}
                    />
                </Form.Group>

                <Button type="submit" style={{ backgroundColor: '#333', borderColor: '#333', color: '#fff' }}>
                    Добавить адрес
                </Button>
            </Form>
        </Container>
    );
}

export default AddAddressPage;
