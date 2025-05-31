// tokenBlacklist.js

// Черный список токенов
const tokenBlacklist = new Set(); // Используем Set для уникальности токенов

// Функция для добавления токена в черный список
function addToken(token) {
    tokenBlacklist.add(token);
}

// Функция для проверки токена
function isTokenBlacklisted(token) {
    return tokenBlacklist.has(token);
}

// Экспортируем функции
module.exports = {
    addToken,
    isTokenBlacklisted
};
