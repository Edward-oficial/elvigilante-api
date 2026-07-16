const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/search/github?query=whatsapp-bot
router.get('/', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ status: false, error: 'El parámetro query es requerido' });
    }

    try {
        const { data } = await axios.get('https://api.github.com/search/repositories', {
            params: { q: query, sort: 'stars', order: 'desc', per_page: 10 },
            headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'elvigilante-api' },
            timeout: 15000
        });

        const results = (data.items || []).map(repo => ({
            nombre: repo.full_name,
            descripcion: repo.description,
            estrellas: repo.stargazers_count,
            forks: repo.forks_count,
            lenguaje: repo.language,
            url: repo.html_url
        }));

        res.json({
            status: true,
            creator: 'edward',
            query,
            total_encontrados: data.total_count,
            data: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: false, error: 'No se pudo completar la búsqueda en GitHub' });
    }
});

module.exports = router;
