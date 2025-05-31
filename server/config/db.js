const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/cyber-shop', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Подключение к базе данных');
}).catch((err) => {
    console.log('Ошибка подключения к базе данных:', err);
});

module.exports = mongoose;
