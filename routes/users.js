const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    key: { type: String, unique: true },
    role: { type: String, default: 'user' },
    plan: { type: String, default: 'free' },
    limit: { type: Number, default: 100 },
    requestToday: { type: Number, default: 0 },
    totalRequest: { type: Number, default: 0 },
    lastRequestDate: String,
    profile_img: String,
    createdAt: { type: Date, default: Date.now },
    vipSince: Date,
    vipExpires: Date
});

module.exports = mongoose.model('User', userSchema);