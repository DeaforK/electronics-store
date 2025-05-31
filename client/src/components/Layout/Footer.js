import React from 'react';
import '../../style/Footer.css'; // Импортируйте CSS файл

const Footer = () => {
    return (
        <footer className="footer">
            <FooterContent />
            <SocialIcons />
        </footer>
    );
};

const FooterContent = () => (
    <div className="footer-content container">
        <div className="row gap-3 justify-content-between">
            {/* Логотип и описание */}
            <div className="col-md-5">
                <img src="http://localhost:8081/assets/icon/Logo_white.png" alt="Cyber Logo" className="footer-logo" />
                <p>
                    cyber — вашим источником современных технологий и инноваций! Мы предлагаем широкий выбор устройств, которые сделают вашу жизнь проще и удобнее. Доверьтесь нам, чтобы оставаться на передовой технологического прогресса!
                </p>
            </div>
            {/* Услуги */}
            <div className="col-md-3">
                <h5>Услуги</h5>
                <ul className="list-unstyled">
                    <li><a href="#">Бонусная программа</a></li>
                    <li><a href="#">Подарочные карты</a></li>
                    <li><a href="#">Рассрочка</a></li>
                    <li><a href="#">Сервисный центр</a></li>
                    <li><a href="#">Безналичный счет</a></li>
                    <li><a href="#">Оплата</a></li>
                </ul>
            </div>
            {/* Поддержка клиентов */}
            <div className="col-md-3">
                <h5>Помощь покупателю</h5>
                <ul className="list-unstyled">
                    <li><a href="#">Найти заказ</a></li>
                    <li><a href="#">Условия доставки</a></li>
                    <li><a href="#">Обмен и возврат товара</a></li>
                    <li><a href="#">Гарантия</a></li>
                    <li><a href="#">Часто задаваемые вопросы</a></li>
                    <li><a href="#">Условия использования сайта</a></li>
                </ul>
            </div>
        </div>
    </div>
);

const SocialIcons = () => (
    <div className="social-icons container">
        <div className="row justify-content-center">
            <div className="col-12">
                <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
                <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                <a href="#" aria-label="TikTok"><i className="fab fa-tiktok"></i></a>
                <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            </div>
        </div>
    </div>
);

export default Footer;
