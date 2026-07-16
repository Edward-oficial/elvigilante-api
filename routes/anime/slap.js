const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/anime/slap
router.get('/', async (req, res) => {
    try {
        const { data } = await axios.get('https://nekos.best/api/v2/slap', { timeout: 15000 });
        const item = data.results[0];

        res.json({
            status: true,
            creator: 'edward',
            tipo: 'anime-slap',
            url: item.url,
            anime_name: item.anime_name || null,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: false, message: 'No se pudo obtener el gif', detail: err.message });
    }
});

module.exports = router;
