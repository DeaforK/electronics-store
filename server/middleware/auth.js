const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { isTokenBlacklisted } = require('../config/blacklist');
const cookieParser = require('cookie-parser'); // Убедитесь, что cookie-parser подключен

require('dotenv').config(); // Загружаем переменные окружения

// Преобразуем относительные пути в абсолютные
const publicKeyPath = path.resolve(__dirname, '../keys/public.key');

// Чтение публичного ключа для проверки токенов
let publicKey;
try {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (err) {
    console.error(`Ошибка при чтении публичного ключа: ${err.message}`);
    process.exit(1); // Прекращаем выполнение, если ключ не был прочитан
}

// Middleware для проверки токена с учетом роли и черного списка
function authenticateRole(role) {
    return (req, res, next) => {
        const token = req.cookies.token; // Убедитесь, что токен берется из cookies

        if (!token) return res.status(401).send({ message: "Токен отсутствует." });

        // Проверка на то, находится ли токен в черном списке
        if (isTokenBlacklisted(token)) {
            return res.status(401).send({ message: "Токен отозван." });
        }

        // Проверяем и расшифровываем токен
        jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, decoded) => {
            if (err) return res.status(403).send({ message: "Неверный или истекший токен." });

            // Проверяем, что роль пользователя совпадает с требуемой
            if (decoded.role !== role) {
                return res.status(403).send({ message: "Доступ запрещен. Неправильная роль пользователя." });
            }

            req.user = decoded;
            next();
        });
    };
}


// Middleware для верификации токена без проверки роли
const verifyUser = (req, res, next) => {
    // Получаем токен из cookies
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    // Проверяем токен с помощью публичного ключа
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный или истекший токен' });
        }

        // Сохраняем информацию о пользователе в объекте запроса
        req.user = decoded;
        next();
    });
};


module.exports = { authenticateRole, verifyUser };
