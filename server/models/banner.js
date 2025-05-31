const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        required: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    position: {
        type: String, // Теперь можно записывать любые названия страниц
        required: true
    },
    priority: {
        type: Number,
        required: true,
        default: 0
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    background_color: {
        type: String,
        default: '#FFFFFF' // Можно задать дефолтный цвет, например белый
    }
}, { timestamps: true });

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
