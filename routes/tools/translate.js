const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/tools/translate?text=hello&to=es&from=auto
router.get('/', async (req, res) => {
    const { text, to = 'es', from = 'auto' } = req.query;

    if (!text) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar el parámetro ?text=' });
    }

    try {
        const { data } = await axios.get('https://translate.googleapis.com/translate_a/single', {
            params: {
                client: 'gtx',
                sl: from,
                tl: to,
                dt: 't',
                q: text
            },
            timeout: 15000
        });

        const translated = data[0].map(chunk => chunk[0]).join('');
        const detectedLang = data[2];

        res.json({
            status: true,
            creator: 'edward',
            original: text,
            translated,
            from: detectedLang || from,
            to,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: false, message: 'No se pudo traducir el texto', detail: err.message });
    }
});

module.exports = router;
