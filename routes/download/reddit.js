const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET /api/download/reddit?url=https://www.reddit.com/r/xxx/comments/xxxxx/titulo/
router.get('/', async (req, res) => {
    let { url } = req.query;

    if (!url || !url.includes('reddit.com')) {
        return res.status(400).json({ status: false, error: 'Debes proporcionar un link válido de Reddit' });
    }

    try {
        const jsonUrl = url.split('?')[0].replace(/\/$/, '') + '.json';
        const { data } = await axios.get(jsonUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });

        const post = data[0]?.data?.children?.[0]?.data;
        if (!post) {
            return res.status(404).json({ status: false, error: 'No se encontró el post' });
        }

        let mediaUrl = null;
        let tipo = 'imagen';

        if (post.is_video && post.media?.reddit_video?.fallback_url) {
            mediaUrl = post.media.reddit_video.fallback_url;
            tipo = 'video';
        } else if (post.url && /\.(jpg|jpeg|png|gif)$/i.test(post.url)) {
            mediaUrl = post.url;
        } else if (post.url_overridden_by_dest) {
            mediaUrl = post.url_overridden_by_dest;
        }

        if (!mediaUrl) {
            return res.status(404).json({ status: false, error: 'Este post no contiene un video o imagen descargable' });
        }

        res.json({
            status: true,
            creator: 'edward',
            data: {
                titulo: post.title,
                tipo,
                autor: post.author,
                url: mediaUrl,
                nsfw: !!post.over_18
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: false, error: 'No se pudo procesar el link de Reddit' });
    }
});

module.exports = router;
