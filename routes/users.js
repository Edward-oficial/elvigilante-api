const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { generateKey } = require('../middlewares/auth');

// ============== MODELO ==============
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    role: { type: String, default: 'user' },
    plan: { type: String, default: 'free' },
    limit: { type: Number, default: 100 },
    requestToday: { type: Number, default: 0 },
    totalRequest: { type: Number, default: 0 },
    lastRequestDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    profile_img: { type: String, default: 'https://i.ibb.co/chJXMd0q/NAGI-REO-RIN-SAE-ISAGI.jpg' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    vipSince: { type: String, default: null },
    vipExpires: { type: String, default: null }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ============== ADMIN HARDCODEADO ==============
const ADMIN = {
    username: 'Edward',
    email: process.env.ADMIN_EMAIL || 'admin@elvigilante.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    key: process.env.ADMIN_KEY || 'elvigilante',
    role: 'admin',
    plan: 'ADMIN VIP',
    limit: 100000,
    requestToday: 0,
    totalRequest: 0,
    profile_img: 'https://i.ibb.co/jPzxnp6x/NAGI-REO-RIN-SAE-ISAGI.jpg'
};

// ============== HELPERS ==============
function isAdmin(apiKey) {
    return apiKey === ADMIN.key;
}

function verificarExpiracion(user) {
    if (user.vipExpires && new Date() > new Date(user.vipExpires)) {
        user.role = 'user';
        user.plan = 'free';
        user.limit = 100;
        user.vipSince = null;
        user.vipExpires = null;
        User.findByIdAndUpdate(user._id, { role: 'user', plan: 'free', limit: 100, vipSince: null, vipExpires: null }).exec();
        return true;
    }
    return false;
}

// ============== REGISTRO ==============
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos obligatorios' });
    }

    if (email === ADMIN.email) {
        return res.status(400).json({ status: false, message: 'Este email no puede ser registrado' });
    }

    try {
        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) {
            return res.status(400).json({ status: false, message: 'El correo o usuario ya existe' });
        }

        const newUser = await User.create({
            username,
            email,
            password,
            key: generateKey()
        });

        res.json({ status: true, creator: 'elvigilante', message: 'Registro exitoso', key: newUser.key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Error en el servidor durante el registro' });
    }
});

// ============== LOGIN ==============
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: false, message: 'Email y contraseña requeridos' });
    }

    try {
        if (email === ADMIN.email && password === ADMIN.password) {
            return res.json({
                status: true,
                creator: 'elvigilante',
                data: {
                    username: ADMIN.username,
                    email: ADMIN.email,
                    key: ADMIN.key,
                    role: 'admin',
                    plan: 'ADMIN VIP',
                    limit: ADMIN.limit,
                    profileImg: ADMIN.profile_img
                }
            });
        }

        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
        }

        verificarExpiracion(user);

        res.json({
            status: true,
            creator: 'elvigilante',
            data: {
                username: user.username,
                email: user.email,
                key: user.key,
                role: user.role,
                plan: user.plan,
                limit: user.limit,
                profileImg: user.profile_img
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Error interno en el servidor' });
    }
});

// ============== MI PERFIL ==============
router.get('/me', async (req, res) => {
    const { apiKey } = req.query;
    if (!apiKey) return res.status(400).json({ status: false, message: 'ApiKey requerida' });

    try {
        if (isAdmin(apiKey)) {
            return res.json({
                status: true,
                creator: 'elvigilante',
                data: {
                    username: ADMIN.username,
                    email: ADMIN.email,
                    key: ADMIN.key,
                    role: 'admin',
                    plan: 'ADMIN VIP',
                    profile_img: ADMIN.profile_img,
                    requests: {
                        today: 0,
                        total: 0,
                        limit: ADMIN.limit,
                        remaining: ADMIN.limit
                    }
                }
            });
        }

        const user = await User.findOne({ key: apiKey });
        if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

        verificarExpiracion(user);

        let daysLeft = 0;
        if (user.vipExpires) {
            daysLeft = Math.ceil((new Date(user.vipExpires) - new Date()) / (1000 * 60 * 60 * 24));
        }

        res.json({
            status: true,
            creator: 'elvigilante',
            data: {
                username: user.username,
                email: user.email,
                key: user.key,
                role: user.role,
                plan: user.plan,
                profile_img: user.profile_img,
                vipExpires: user.vipExpires,
                daysLeft,
                requests: {
                    today: user.requestToday,
                    total: user.totalRequest,
                    limit: user.limit,
                    remaining: user.limit - user.requestToday
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Error interno' });
    }
});

// ============== ACTUALIZAR PERFIL ==============
router.post('/update-profile', async (req, res) => {
    const { apiKey, type, value } = req.body;

    if (!apiKey || !type || value === undefined) {
        return res.status(400).json({ status: false, message: 'Faltan parámetros' });
    }

    const forbiddenFields = ['role', 'plan', 'limit', 'vipSince', 'vipExpires', 'totalRequest', 'requestToday', 'key'];
    if (forbiddenFields.includes(type)) {
        return res.status(403).json({ status: false, message: 'No puedes modificar este campo' });
    }

    if (isAdmin(apiKey)) {
        return res.status(403).json({ status: false, message: 'El admin se modifica manualmente' });
    }

    try {
        const user = await User.findOne({ key: apiKey });
        if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

        const allowedFields = ['username', 'email', 'password', 'profile_img'];
        if (!allowedFields.includes(type)) {
            return res.status(400).json({ status: false, message: 'Acción no permitida' });
        }

        user[type] = value;
        await user.save();

        res.json({ status: true, message: 'Perfil actualizado', field: type });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: 'Error interno' });
    }
});

// ============== ESTADÍSTICAS ==============
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        res.json({ status: true, users: totalUsers + 1, endpoints: 50 });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

// ============== DASHBOARD GLOBAL ==============
router.get('/dashboard-global', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments() + 1;
        const globalRequests = await User.aggregate([{ $group: { _id: null, total: { $sum: '$totalRequest' } } }]);

        const top5 = await User.find({ totalRequest: { $gt: 0 } })
            .sort({ totalRequest: -1 })
            .limit(5)
            .select('username totalRequest');

        res.json({
            status: true,
            totalUsers,
            globalRequests: globalRequests[0]?.total || 0,
            uptime: global.startTime || Date.now(),
            top5: top5.map(u => ({
                username: u.username,
                total: u.totalRequest,
                initial: u.username.charAt(0).toUpperCase()
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false });
    }
});

// ============== ADMIN: VER TODOS ==============
router.get('/admin/all', async (req, res) => {
    const { apiKey } = req.query;
    if (!isAdmin(apiKey)) return res.status(403).json({ status: false, message: 'No autorizado' });

    try {
        const users = await User.find().select('-password');
        res.json({ status: true, users: [ADMIN, ...users] });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

// ============== ADMIN: ACTUALIZAR ==============
router.post('/admin/update', async (req, res) => {
    const { adminKey, targetEmail, newData } = req.body;
    if (!isAdmin(adminKey)) return res.status(403).json({ status: false });

    try {
        const user = await User.findOneAndUpdate({ email: targetEmail }, newData, { new: true });
        if (!user) return res.status(404).json({ status: false });
        res.json({ status: true });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

// ============== ADMIN: ELIMINAR ==============
router.post('/admin/delete', async (req, res) => {
    const { adminKey, targetEmail } = req.body;
    if (!isAdmin(adminKey)) return res.status(403).json({ status: false });
    if (targetEmail === ADMIN.email) return res.status(403).json({ status: false, message: 'No se puede eliminar el admin' });

    try {
        const user = await User.findOneAndDelete({ email: targetEmail });
        if (!user) return res.status(404).json({ status: false });
        res.json({ status: true });
    } catch (err) {
        res.status(500).json({ status: false });
    }
});

module.exports = router;
