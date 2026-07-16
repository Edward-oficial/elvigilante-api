const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/search/anime?query=naruto
router.get('/', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ status: false, error: 'El parámetro query es requerido' });
    }

    try {
        const { data } = await axios.get('https://api.jikan.moe/v4/anime', {
            params: { q: query, limit: 10 },
            timeout: 15000
        });

        const results = (data.data || []).map(item => ({
            titulo: item.title,
            titulo_jp: item.title_japanese,
            tipo: item.type,
            episodios: item.episodes,
            estado: item.status,
            score: item.score,
            sinopsis: item.synopsis,
            imagen: item.images?.jpg?.image_url,
            url: item.url
        }));

        res.json({
            status: true,
            creator: 'edward',
            query,
            total: results.length,
            data: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: false, error: 'No se pudo completar la búsqueda de anime' });
    }
});

module.exports = router;
