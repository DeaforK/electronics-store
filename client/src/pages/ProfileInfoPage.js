import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';

function ProfileInfoPage() {
    const navigate = useNavigate();

    return (
        <>
            <Header />
            <Container className="mt-5" style={{ maxWidth: '800px' }}>
                <h2 className="mb-4 text-center">Справочная информация</h2>

                <Card className="mb-3">
                    <Card.Body>
                        <Card.Title>Персональная скидка</Card.Title>
                        <Card.Text>
                            Персональная скидка предоставляется на основании общей суммы заказов.
                            При достижении определённого порога — скидка увеличивается.
                        </Card.Text>
                    </Card.Body>
                </Card>

                <Card className="mb-3">
                    <Card.Body>
                        <Card.Title>Бонусные баллы</Card.Title>
                        <Card.Text>
                            За каждый заказ вы получаете бонусные баллы. Их можно использовать для оплаты до 20% от следующего заказа.
                        </Card.Text>
                    </Card.Body>
                </Card>

                <Card className="mb-3">
                    <Card.Body>
                        <Card.Title>Условия доставки</Card.Title>
                        <Card.Text>
                            Стоимость доставки зависит от расстояния и условий. Некоторые методы доставки предоставляются бесплатно при достижении суммы заказа.
                        </Card.Text>
                    </Card.Body>
                </Card>

                <Button variant="outline-dark" onClick={() => navigate('/profile')}>
                    Назад в профиль
                </Button>
            </Container>
            <Footer />
        </>
    );
}

export default ProfileInfoPage;
