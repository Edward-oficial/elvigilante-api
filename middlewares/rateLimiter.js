const rateLimit = require('express-rate-limit');

// Límite general para toda la API (además del límite diario por apiKey)
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX || '300'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiadas solicitudes, intenta de nuevo en un minuto.' }
});

// Límite estricto para login/register (evita fuerza bruta / spam de cuentas)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.' }
});

module.exports = { globalLimiter, authLimiter };
