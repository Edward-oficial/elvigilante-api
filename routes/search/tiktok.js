const express = require('express');
const router = express.Router();
const axios = require('axios');

const is = axios.create({
    headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
        "Referer": "https://www.tiktok.com/",
        "Accept": "application/json, text/plain, */*",
    },
    timeout: 8000,
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildDeviceParams() {
    return {
        aid: 1988,
        app_name: "tiktok_web",
        device_platform: "web_pc",
        region: "US",
        priority_region: "",
        os: "ios",
        referer: "",
        cookie_enabled: "true",
        screen_width: 375,
        screen_height: 812,
        browser_language: "en-US",
        browser_platform: "iPhone",
        browser_name: "Mozilla",
        browser_version: "5.0",
        browser_online: "true",
        app_language: "en",
        timezone_name: "America/Tegucigalpa",
        webcast_language: "en",
    };
}

async function searchOnce(query, cursor = 0) {
    const params = {
        ...buildDeviceParams(),
        keyword: query,
        cursor,
        from_page: "search",
        web_search_code: JSON.stringify({
            tiktok: { client_params_x: { search_engine: { ies_mt_user_live_video_card_use_libra: 1 } }, search_server: {} }
        }),
    };

    const response = await is.get("https://www.tiktok.com/api/search/general/full/", { params });

    const items = response.data?.data;
    if (!items || items.length === 0) {
        throw new Error("No se encontraron videos.");
    }

    return items
        .filter(item => item.type === 1 && item.item)
        .map(item => {
            const v = item.item;
            return {
                id: v.id,
                desc: v.desc,
                author: v.author?.uniqueId,
                nickname: v.author?.nickname,
                cover: v.video?.cover,
                playAddr: v.video?.playAddr,
                downloadAddr: v.video?.downloadAddr,
                duration: v.video?.duration,
                stats: v.stats,
                createTime: v.createTime,
            };
        });
}

async function tiktoks(query, retries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await searchOnce(query);
        } catch (error) {
            lastError = error;

            if (error.message === "No se encontraron videos.") {
                throw error;
            }

            if (attempt < retries) {
                await sleep(500 * (attempt + 1));
            }
        }
    }

    throw lastError;
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
        const result = await tiktoks(query.trim());
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
