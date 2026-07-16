const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/search/wikipedia?query=node.js&lang=es
router.get('/', async (req, res) => {
    const { query, lang = 'es' } = req.query;

    if (!query) {
        return res.status(400).json({ status: false, error: 'El parámetro query es requerido' });
    }

    try {
        const { data } = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
            params: {
                action: 'query',
                list: 'search',
                srsearch: query,
                format: 'json',
                srlimit: 10
            },
            timeout: 15000
        });

        const results = (data.query?.search || []).map(item => ({
            titulo: item.title,
            resumen: item.snippet.replace(/<\/?span[^>]*>/g, ''),
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
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
        res.status(500).json({ status: false, error: 'No se pudo completar la búsqueda en Wikipedia' });
    }
});

module.exports = router;
