// Middleware centralizado de manejo de errores.
// Cualquier ruta puede hacer next(err) y termina aquí, evitando
// bloques try/catch repetidos y respuestas inconsistentes.

function apiNotFound(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();
    res.status(404).json({
        status: false,
        creator: 'edward',
        message: `Endpoint no encontrado: ${req.method} ${req.path}`
    });
}

function errorHandler(err, req, res, next) {
    console.error('❌ Error no controlado:', err);

    if (res.headersSent) return next(err);

    const status = err.status || 500;
    res.status(status).json({
        status: false,
        message: status === 500 ? 'Error interno del servidor' : err.message,
        ...(process.env.NODE_ENV !== 'production' ? { detail: err.message } : {})
    });
}

module.exports = { apiNotFound, errorHandler };
