const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// GET /api/download/mediafire?url=https://www.mediafire.com/file/xxxx/archivo.zip/file
router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.includes('mediafire.com')) {
        return res.status(400).json({ status: false, error: 'Debes proporcionar un link válido de MediaFire' });
    }

    try {
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 20000
        });

        const $ = cheerio.load(html);
        const downloadUrl = $('#downloadButton').attr('href');

        if (!downloadUrl) {
            return res.status(404).json({ status: false, error: 'No se encontró el enlace de descarga. El archivo pudo haber sido eliminado.' });
        }

        const fileName = $('.dl-btn-label').attr('title') || $('.filename').first().text().trim() || null;
        const fileSize = $('.details li').first().text().replace('File size:', '').trim() || null;

        res.json({
            status: true,
            creator: 'edward',
            data: {
                nombre: fileName,
                tamaño: fileSize,
                url_descarga: downloadUrl
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: false, error: 'No se pudo procesar el link de MediaFire' });
    }
});

module.exports = router;
