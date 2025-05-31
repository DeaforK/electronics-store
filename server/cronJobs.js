const cron = require('node-cron');
const Category = require('./models/category');

// Запуск автоудаления в 21:25 каждый день
cron.schedule('25 16 * * *', async () => {
    console.log('Запуск автоудаления архивных категорий в 21:25...');
    await Category.autoDeleteArchived();
    console.log('Автоудаление завершено.');
}, {
    timezone: 'Europe/Moscow' // Убедись, что установлена нужная тайм-зона
});
