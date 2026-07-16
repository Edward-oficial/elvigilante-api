const express = require('express');
const router = express.Router();

// GET /api/tools/base64?text=hola&action=encode
// GET /api/tools/base64?text=aG9sYQ==&action=decode
router.get('/', (req, res) => {
    const { text, action = 'encode' } = req.query;

    if (!text) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar el parámetro ?text=' });
    }

    try {
        let result;
        if (action === 'decode') {
            result = Buffer.from(text, 'base64').toString('utf-8');
        } else if (action === 'encode') {
            result = Buffer.from(text, 'utf-8').toString('base64');
        } else {
            return res.status(400).json({ status: false, message: "El parámetro 'action' debe ser 'encode' o 'decode'" });
        }

        res.json({
            status: true,
            creator: 'edward',
            action,
            input: text,
            result,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: false, message: 'No se pudo procesar el texto', detail: err.message });
    }
});

module.exports = router;
