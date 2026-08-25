const express = require('express');
const router = express.Router();
const axios = require('axios');

// CORS: sin esto, las requests desde un WebView cargado con file:// (origen null)
// o desde cualquier dominio distinto al del server son bloqueadas por el navegador
// con "Failed to fetch", aunque el server sí reciba y procese el request.
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

async function ytsearch(query) {
    try {
        const response = await axios({
            method: "GET",
            url: "https://www.youtube.com/results",
            params: {
                search_query: query
            },
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
            },
            timeout: 8000,
        });

        const html = response.data;

        const initialDataMatch = html.match(/var ytInitialData = ({.+?});/);
        if (!initialDataMatch) {
            throw new Error("No se pudieron extraer los videos.");
        }

        const initialData = JSON.parse(initialDataMatch[1]);

        const contents = initialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        const videos = [];

        outer:
        for (const content of contents) {
            const itemSection = content?.itemSectionRenderer?.contents || [];

            for (const item of itemSection) {
                const videoRenderer = item?.videoRenderer;
                if (videoRenderer) {
                    const videoId = videoRenderer?.videoId;
                    const title = videoRenderer?.title?.runs?.[0]?.text || "Sin título";
                    const description = videoRenderer?.descriptionSnippet?.runs?.map(r => r.text).join('') || "";
                    const duration = videoRenderer?.lengthText?.simpleText || "0:00";
                    const views = videoRenderer?.viewCountText?.simpleText || "0 vistas";
                    const publishedAt = videoRenderer?.publishedTimeText?.simpleText || "";
                    const thumbnail = videoRenderer?.thumbnail?.thumbnails?.[0]?.url || "";
                    const author = videoRenderer?.ownerText?.runs?.[0]?.text || "Desconocido";
                    const authorId = videoRenderer?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";

                    if (videoId && title) {
                        videos.push({
                            title: title,
                            videoId: videoId,
                            url: `https://www.youtube.com/watch?v=${videoId}`,
                            duration: duration,
                            views: views,
                            thumbnail: thumbnail,
                            author: author,
                            authorId: authorId,
                            publishedAt: publishedAt,
                            description: description.substring(0, 200)
                        });
                    }

                    if (videos.length >= 10) break outer;
                }
            }
        }

        if (videos.length === 0) {
            throw new Error("No se encontraron videos.");
        }

        return videos;
    } catch (error) {
        throw new Error(error.message);
    }
}

router.get('/', async (req, res) => {
    const query = req.query.query;

    if (!query || query.trim().length === 0) {
        return res.status(400).json({
            status: false,
            creator: "Edward",
            error: "El parámetro query es requerido"
        });
    }

    if (query.length > 100) {
        return res.status(400).json({
            status: false,
            creator: "Edward",
            error: "La búsqueda es demasiado larga"
        });
    }

    try {
        const result = await ytsearch(query.trim());
        res.json({
            status: true,
            creator: "Edward",
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            creator: "Edward",
            error: error.message || "Internal Server Error"
        });
    }
});

module.exports = router;
