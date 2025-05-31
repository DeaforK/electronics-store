const express = require('express');
const cors = require('cors');
const mongoose  = require('./config/db');  // Подключаем конфигурацию базы данных
const path = require('path');
const cookieParser = require('cookie-parser'); // Импортируем cookie-parser
const { createAdminIfNotExists, createCourierIfNotExists, createSellerIfNotExists } = require('./models/user'); // Импорт функции для создания администратора
const authRoutes = require('./routes/authRoutes');  // Подключаем роуты один раз
const cartRoutes = require('./routes/cartRoutes');  // Подключаем роуты одного
const orderRoutes = require('./routes/orderRoutes'); 
const favoriteRoutes = require('./routes/favoriteRoutes'); 
const reviewsRoutes = require('./routes/reviewsRoutes'); 
const deliveryMethodRoutes = require('./routes/deliveryMethodRoutes'); 
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const productVariationRoutes = require('./routes/productVariationRoutes'); 
const courierRoutes = require('./routes/courierRoutes'); 
const warehouseRoutes = require('./routes/warehouseRoutes'); 
const loyaltyHistoryRoutes = require('./routes/loyaltyHistoryRoutes'); 
const promotionRoutes = require('./routes/promotionRoutes');
const promotionProductCategoryRoutes = require('./routes/promotionProductCategoryRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const activityLogRoutes = require('./routes/activityLogRoutes');
const warehouseInventoryRoutes = require('./routes/warehouseInventoryRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const warehouseTaskRoutes = require('./routes/warehouseTaskRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
require('./cronJobs');



// Подключение к базе данных
mongoose.connection.once('open', async () => {
    console.log('Успешное подключение к базе данных');
    // Автоматическое создание администратора
    await createAdminIfNotExists();
    await createCourierIfNotExists();
    await createSellerIfNotExists();
});



const app = express();
const port = 8081;

// Настройка CORS
app.use(cors({ origin: 'http://localhost:3000',
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true // Разрешите отправку куки
 }));

 app.use(cookieParser()); // Подключаем middleware cookie-parser
 
// Настройка POST-запроса — JSON
app.use(express.json());

// Статическая директория для файлов иконок
app.use('/assets/icon', express.static(path.join(__dirname, 'assets/icon')));
// Статическая директория для файлов товаров
app.use('/assets/products', express.static(path.join(__dirname, 'assets/products')));
// Статическая директория для файлов аватаров
app.use('/assets/avatar', express.static(path.join(__dirname, 'assets/avatar')));
// Статическая директория для файлов описания товара 
app.use('/assets/description', express.static(path.join(__dirname, 'assets/description')));
// Статическая директория для файлов баннеров 
app.use('/assets/banners', express.static(path.join(__dirname, 'assets/banners')));
// Статическая директория для файлов акций
app.use('/assets/promotions', express.static(path.join(__dirname, 'assets/promotions')));

// Роуты
app.use('/', authRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/delivery-methods', deliveryMethodRoutes);
app.use('/categories', categoryRoutes);
app.use('/products', productRoutes);
app.use('/product-variations', productVariationRoutes);
app.use('/couriers', courierRoutes);
app.use('/warehouses', warehouseRoutes);
app.use('/loyalty-history', loyaltyHistoryRoutes);
app.use('/promotions', promotionRoutes);
app.use('/promotion-product-category', promotionProductCategoryRoutes);
app.use('/users', userRoutes);
app.use('/activity-log', activityLogRoutes);
app.use('/warehouseInventory', warehouseInventoryRoutes);
app.use('/banners', bannerRoutes);
app.use('/warehouse-tasks', warehouseTaskRoutes);
app.use('/reports', reportsRoutes);


// Запуск сервера
app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});
