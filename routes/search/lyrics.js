const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/search/lyrics?artist=Coldplay&title=Yellow
router.get('/', async (req, res) => {
    const { artist, title } = req.query;

    if (!artist || !title) {
        return res.status(400).json({ status: false, error: 'Debes proporcionar los parámetros artist y title' });
    }

    try {
        const { data } = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
            { timeout: 15000 }
        );

        if (!data.lyrics) {
            return res.status(404).json({ status: false, error: 'No se encontró la letra de esa canción' });
        }

        res.json({
            status: true,
            creator: 'edward',
            artist,
            title,
            lyrics: data.lyrics.trim(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(404).json({ status: false, error: 'No se encontró la letra de esa canción' });
    }
});

module.exports = router;
