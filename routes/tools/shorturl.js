const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/tools/shorturl?url=https://example.com/una-url-muy-larga
router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar el parámetro ?url=' });
    }

    try {
        new URL(url); // valida formato
    } catch {
        return res.status(400).json({ status: false, message: 'La URL proporcionada no es válida' });
    }

    try {
        const { data } = await axios.get('https://tinyurl.com/api-create.php', {
            params: { url },
            timeout: 15000
        });

        res.json({
            status: true,
            creator: 'edward',
            original: url,
            short: data,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: false, message: 'No se pudo acortar la URL', detail: err.message });
    }
});

module.exports = router;
