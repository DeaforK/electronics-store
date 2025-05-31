const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Product = require('./product'); // Проверьте путь к модели Product

// Определение схемы категории
const categorySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    icon_white: {
        type: String, // Путь к белой иконке
        default: null
    },
    icon_black: {
        type: String, // Путь к черной иконке
        default: null
    },
    categories_id: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    status: {
        type: String,
        enum: ['Активна', 'В Архиве'],
        default: 'Активна'
    },
    archivedAt: {
        type: Date, // Дата добавления в архив
        default: null
    }
}, { timestamps: true });

// Метод для проверки наличия товаров в категории и её подкатегориях
categorySchema.methods.hasProducts = async function() {
    // Проверяем, есть ли товары в самой категории
    const productsInCategory = await Product.countDocuments({ categories_id: this._id });
    if (productsInCategory > 0) {
        return true;
    }

    // Проверяем подкатегории
    const subcategories = await this.model('Category').find({ categories_id: this._id });
    for (const subcategory of subcategories) {
        if (await subcategory.hasProducts()) {
            return true;
        }
    }
    return false;
};

// Метод для автоматического удаления категорий через 65 дней после архивирования
categorySchema.statics.autoDeleteArchived = async function() {
    const thresholdDays = 65;
    const currentDate = new Date();

    const categoriesToDelete = await this.find({
        status: 'В Архиве',
        archivedAt: { $lte: new Date(currentDate.getTime() - thresholdDays * 24 * 60 * 60 * 1000) }
    });
    for (const category of categoriesToDelete) {
        const hasProducts = await category.hasProducts();
        
        if (!hasProducts) {
            // Удаляем все подкатегории (если они тоже пустые)
            const subcategories = await this.find({ categories_id: category._id });

            for (const subcategory of subcategories) {
                const subHasProducts = await subcategory.hasProducts();
                if (!subHasProducts) {
                    await this.deleteOne({ _id: subcategory._id });
                }
            }

            // Удаляем саму категорию
            await this.deleteOne({ _id: category._id });
            console.log(`Категория "${category.name}" удалена.`);
        }
    }
};

// Экспорт модели категории
const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
