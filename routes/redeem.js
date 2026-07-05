const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ============== MODELO ==============
const codeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    requests: { type: Number, required: true }, // solicitudes que da
    maxUses: { type: Number, required: true },   // máximo de personas que lo pueden canjear
    uses: { type: Number, default: 0 },          // cuántas veces se ha canjeado
    usedBy: [{ type: String }],                  // emails que lo canjearon
    createdBy: { type: String, default: 'admin' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    active: { type: Boolean, default: true }
});

const Code = mongoose.models.RedeemCode || mongoose.model('RedeemCode', codeSchema);

// Modelo de usuario (reutilizamos)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const ADMIN_KEY = process.env.ADMIN_KEY || 'edward';

// ============== CANJEAR CÓDIGO (usuario) ==============
// POST /api/auth/redeem
router.post('/redeem', async (req, res) => {
    const { apiKey, code } = req.body;

    if (!apiKey || !code) {
        return res.status(400).json({ status: false, error: 'Faltan parámetros' });
    }

    try {
        const user = await User.findOne({ key: apiKey });
        if (!user) return res.status(404).json({ status: false, error: 'Usuario no encontrado' });

        const redeemCode = await Code.findOne({ code: code.trim().toUpperCase() });

        if (!redeemCode) return res.status(404).json({ status: false, error: 'Código no válido' });
        if (!redeemCode.active) return res.status(400).json({ status: false, error: 'Este código ya no está activo' });
        if (redeemCode.uses >= redeemCode.maxUses) return res.status(400).json({ status: false, error: 'Este código ya alcanzó su límite de usos' });
        if (redeemCode.usedBy.includes(user.email)) return res.status(400).json({ status: false, error: 'Ya canjeaste este código anteriormente' });

        // Sumar solicitudes al usuario
        user.limit = (user.limit || 100) + redeemCode.requests;
        await user.save();

        // Registrar el canje
        redeemCode.uses += 1;
        redeemCode.usedBy.push(user.email);
        if (redeemCode.uses >= redeemCode.maxUses) redeemCode.active = false;
        await redeemCode.save();

        return res.json({
            status: true,
            creator: 'elvigilante',
            message: `¡Código canjeado! +${redeemCode.requests} solicitudes agregadas`,
            requests_added: redeemCode.requests,
            new_limit: user.limit
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, error: 'Error interno del servidor' });
    }
});

// ============== CREAR CÓDIGO (admin) ==============
// POST /api/auth/admin/create-code
router.post('/admin/create-code', async (req, res) => {
    const { adminKey, code, requests, maxUses } = req.body;

    if (adminKey !== ADMIN_KEY) return res.status(403).json({ status: false, error: 'No autorizado' });
    if (!code || !requests || !maxUses) return res.status(400).json({ status: false, error: 'Faltan parámetros' });

    try {
        const exists = await Code.findOne({ code: code.trim().toUpperCase() });
        if (exists) return res.status(400).json({ status: false, error: 'Este código ya existe' });

        const newCode = await Code.create({
            code: code.trim().toUpperCase(),
            requests: parseInt(requests),
            maxUses: parseInt(maxUses)
        });

        res.json({
            status: true,
            creator: 'elvigilante',
            message: 'Código creado exitosamente',
            data: {
                code: newCode.code,
                requests: newCode.requests,
                maxUses: newCode.maxUses
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, error: 'Error interno' });
    }
});

// ============== VER CÓDIGOS (admin) ==============
// GET /api/auth/admin/codes
router.get('/admin/codes', async (req, res) => {
    const { apiKey } = req.query;
    if (apiKey !== ADMIN_KEY) return res.status(403).json({ status: false, error: 'No autorizado' });

    try {
        const codes = await Code.find().sort({ createdAt: -1 });
        res.json({ status: true, total: codes.length, data: codes });
    } catch (err) {
        res.status(500).json({ status: false, error: 'Error interno' });
    }
});

// ============== ELIMINAR CÓDIGO (admin) ==============
// POST /api/auth/admin/delete-code
router.post('/admin/delete-code', async (req, res) => {
    const { adminKey, code } = req.body;
    if (adminKey !== ADMIN_KEY) return res.status(403).json({ status: false, error: 'No autorizado' });

    try {
        await Code.findOneAndDelete({ code: code.trim().toUpperCase() });
        res.json({ status: true, message: 'Código eliminado' });
    } catch (err) {
        res.status(500).json({ status: false, error: 'Error interno' });
    }
});

module.exports = router;
