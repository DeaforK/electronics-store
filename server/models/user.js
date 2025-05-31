const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Courier = require('./courier'); // путь укажи правильно

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: '../assets/avatar/avatar_default.png' // Дефолтный путь
    },
    role: {
        type: String,
        enum: ['admin', 'client', 'courier', 'seller'], // Роли пользователя
        default: 'client'
    },
    discount: {
        type: mongoose.Types.Decimal128,
        default: 0.00
    },
    bonus_points: {
        type: Number,
        default: 0
    },
    total_orders_sum: {
        type: mongoose.Types.Decimal128,
        default: 0.00 // Общая сумма всех заказов пользователя
    },
    addresses: [
        {
            label: { type: String, default: 'Другой' }, // Название адреса (Дом, Работа)
            address: { type: String, required: true }, // Сам адрес
            location: { // Координаты (широта, долгота)
                latitude: { type: Number, required: false },
                longitude: { type: Number, required: false }
            },
            is_default: { type: Boolean, default: false } // Основной адрес
        }
    ]
}, { timestamps: true });

// Метод для обновления персональной скидки в зависимости от общей суммы заказов
userSchema.methods.updateDiscount = function () {
    const totalSum = parseFloat(this.total_orders_sum.toString());
    if (totalSum >= 500000 && totalSum < 1000000) {
        this.discount = 3.00;
    } else if (totalSum >= 1000000 && totalSum < 2000000) {
        this.discount = 5.00;
    } else if (totalSum >= 2000000) {
        this.discount = 10.00;
    } else {
        this.discount = 0.00;
    }
    return this.save();
};

const User = mongoose.model('User', userSchema);

// Функция для создания администратора
async function createAdminIfNotExists() {
    try {
        const admin = await User.findOne({ role: 'admin' });

        if (!admin) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('adminpassword', salt);

            const newAdmin = new User({
                name: 'Admin',
                email: 'admin@gmail.com',
                phone: '0000000000',
                password: passwordHash,
                role: 'admin'
            });

            await newAdmin.save();
            console.log('Администратор создан успешно.');
        } else {
            console.log('Администратор уже существует.');
        }
    } catch (error) {
        console.error('Ошибка при создании администратора:', error);
    }
}

// Функция для создания учетной записи курьера
async function createCourierIfNotExists() {
    try {
        const courierUser = await User.findOne({ role: 'courier', email: 'Courier@mail.com' });

        if (!courierUser) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('courierpassword', salt);

            const newCourierUser = new User({
                name: 'Courier',
                email: 'Courier@mail.com',
                phone: '1111111111',
                password: passwordHash,
                role: 'courier'
            });

            const savedUser = await newCourierUser.save();

            // ✅ Создание записи в модели Courier
            const courierProfile = new Courier({
                user_id: savedUser._id,
                status: 'недоступен',
                delivery_area: {
                    city: 'Иркутск', // можешь адаптировать
                    radius_km: 10
                },
                location: {
                    latitude: 52.287,
                    longitude: 104.278
                },
                vehicle_type: 'пешком' // можно заменить на 'велосипед', 'машина' и т.п.
            });

            await courierProfile.save();

            console.log('Курьер и профиль курьера созданы успешно.');
        } else {
            console.log('Курьер уже существует.');
        }
    } catch (error) {
        console.error('Ошибка при создании курьера:', error);
    }
}

// Функция для создания учетной записи продавца-приёмщика
async function createSellerIfNotExists() {
    try {
        const seller = await User.findOne({ role: 'seller', email: 'seller@mail.com' });
        if (!seller) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('sellerpassword', salt);

            const newSeller = new User({
                name: 'Seller',
                email: 'seller@mail.com',
                phone: '2222222222',
                password: passwordHash,
                role: 'seller'
            });

            await newSeller.save();
            console.log('Продавец-приёмщик создан успешно.');
        } else {
            console.log('Продавец-приёмщик уже существует.');
        }
    } catch (error) {
        console.error('Ошибка при создании продавца-приёмщика:', error);
    }
}

module.exports = { User, createAdminIfNotExists, createCourierIfNotExists, createSellerIfNotExists };
