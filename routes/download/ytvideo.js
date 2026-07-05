const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { spawn } = require('child_process');

const VALID_QUALITIES = ['144', '240', '360', '480', '720', '1080', '1440', '2160'];
const YT_REGEX = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/;

const TMP_DIR = path.join(__dirname, '..', 'tmp', 'youtube');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
const FILE_TTL_MS = 15 * 60 * 1000;

const http = axios.create({
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9'
    },
    timeout: 10000
});

// --------------------------------------------------------------------------
// Extracción de JSON embebido en HTML (balance de llaves, no regex ciego,
// porque el objeto tiene llaves anidadas y un regex simple corta mal).
// --------------------------------------------------------------------------
function extractBalancedJson(str, startIndex) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = startIndex; i < str.length; i++) {
        const ch = str[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') inString = !inString;
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return str.slice(startIndex, i + 1);
        }
    }
    return null;
}

async function getPlayerResponse(id) {
    const { data: html } = await http.get(`https://www.youtube.com/watch?v=${id}&hl=en`);

    const marker = 'ytInitialPlayerResponse = ';
    const idx = html.indexOf(marker);
    if (idx === -1) throw new Error('No se encontró ytInitialPlayerResponse (YouTube pudo haber cambiado el HTML)');

    const jsonStr = extractBalancedJson(html, idx + marker.length);
    if (!jsonStr) throw new Error('No se pudo extraer el JSON del player response');

    const playerResponse = JSON.parse(jsonStr);

    const jsUrlMatch = html.match(/"jsUrl":"([^"]+)"/) || html.match(/src="(\/s\/player\/[^"]+base\.js)"/);
    if (!jsUrlMatch) throw new Error('No se encontró la URL del player JS');
    const playerJsUrl = jsUrlMatch[1].startsWith('http') ? jsUrlMatch[1] : `https://www.youtube.com${jsUrlMatch[1]}`;

    return { playerResponse, playerJsUrl };
}

// --------------------------------------------------------------------------
// Descifrado de firma + parámetro "n". Esta es la parte que YouTube reofusca
// cada pocas semanas: si deja de funcionar, hay que revisar los regex de acá
// contra la versión actual de base.js.
// --------------------------------------------------------------------------
const cipherCache = new Map(); // playerJsUrl -> { decipher, nTransform }

async function getCipherFunctions(playerJsUrl) {
    if (cipherCache.has(playerJsUrl)) return cipherCache.get(playerJsUrl);

    const { data: playerJs } = await http.get(playerJsUrl);

    // --- función principal de descifrado de la firma ---
    const mainFnMatch = playerJs.match(/([a-zA-Z0-9$]{2,4})=function\(a\)\{a=a\.split\(""\);[^}]+return a\.join\(""\)\};/);
    if (!mainFnMatch) throw new Error('No se pudo localizar la función de descifrado en el player JS');
    const mainFnBody = mainFnMatch[0];
    const mainFnName = mainFnMatch[1];

    const helperObjMatch = mainFnBody.match(/([a-zA-Z0-9$]{2,4})\.[a-zA-Z0-9$]{2}\(a,\d+\)/);
    if (!helperObjMatch) throw new Error('No se pudo localizar el objeto helper del descifrado');
    const helperName = helperObjMatch[1];

    const helperDefRegex = new RegExp(`var ${helperName}=\\{[\\s\\S]+?\\};`);
    const helperDefMatch = playerJs.match(helperDefRegex);
    if (!helperDefMatch) throw new Error('No se pudo extraer la definición del objeto helper');

    // --- función de transformación del parámetro "n" (antithrottling) ---
    let nFnSrc = null;
    const nFnNameMatch = playerJs.match(/[&,;(]([a-zA-Z0-9$]{2,4})=function\(a\)\{var b=a\.split\(""\)/);
    if (nFnNameMatch) {
        const nFnName = nFnNameMatch[1];
        const nFnRegex = new RegExp(`${nFnName}=function\\(a\\)\\{[\\s\\S]+?\\n\\};`);
        const nFnMatch = playerJs.match(nFnRegex);
        if (nFnMatch) nFnSrc = `(${nFnMatch[0].replace(/^[a-zA-Z0-9$]{2,4}=/, '')})`;
    }

    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(`${helperDefMatch[0]}\n${mainFnName}=function(a){a=a.split("");${mainFnBody.slice(mainFnBody.indexOf('{a=a.split("");') + 15)}`, sandbox);
    // La línea de arriba reconstruye la función principal en el sandbox junto a su helper.

    const decipher = (sig) => vm.runInContext(`${mainFnName}(${JSON.stringify(sig)})`, sandbox);
    const nTransform = nFnSrc
        ? (n) => vm.runInContext(`(${nFnSrc})(${JSON.stringify(n)})`, sandbox)
        : (n) => n; // si no se encontró, se manda el n original (puede venir con throttling)

    const result = { decipher, nTransform };
    cipherCache.set(playerJsUrl, result);
    return result;
}

// --------------------------------------------------------------------------
// Resolución de formatos: aplica cipher/n a cada format de streamingData.
// --------------------------------------------------------------------------
async function resolveFormats(playerResponse, playerJsUrl) {
    const streamingData = playerResponse.streamingData;
    if (!streamingData) throw new Error('El video no tiene streamingData (puede ser privado, restringido o requerir login)');

    const allFormats = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];
    const needsCipher = allFormats.some(f => f.signatureCipher || f.cipher);

    let decipher = null, nTransform = null;
    if (needsCipher || allFormats.some(f => f.url && f.url.includes('&n='))) {
        ({ decipher, nTransform } = await getCipherFunctions(playerJsUrl));
    }

    return allFormats.map(f => {
        let url = f.url;

        if (!url && (f.signatureCipher || f.cipher)) {
            const params = new URLSearchParams(f.signatureCipher || f.cipher);
            const sig = decipher(params.get('s'));
            url = `${params.get('url')}&${params.get('sp') || 'sig'}=${encodeURIComponent(sig)}`;
        }

        if (url && nTransform) {
            const u = new URL(url);
            const n = u.searchParams.get('n');
            if (n) {
                u.searchParams.set('n', nTransform(n));
                url = u.toString();
            }
        }

        return {
            itag: f.itag,
            url,
            mimeType: f.mimeType,
            qualityLabel: f.qualityLabel || null,
            height: f.height || null,
            hasAudio: !!f.audioQuality || (f.mimeType || '').includes('audio'),
            hasVideo: !!f.qualityLabel,
            bitrate: f.bitrate
        };
    }).filter(f => !!f.url);
}

function pickFormats(formats, quality) {
    const q = parseInt(quality, 10);
    const progressive = formats
        .filter(f => f.hasAudio && f.hasVideo && f.height <= q)
        .sort((a, b) => b.height - a.height)[0];

    if (progressive) return { mode: 'progressive', video: progressive };

    const video = formats
        .filter(f => f.hasVideo && !f.hasAudio && f.height <= q)
        .sort((a, b) => b.height - a.height)[0];
    const audio = formats
        .filter(f => f.hasAudio && !f.hasVideo)
        .sort((a, b) => b.bitrate - a.bitrate)[0];

    if (!video || !audio) throw new Error('No se encontró una combinación de formatos válida para esa calidad');
    return { mode: 'merge', video, audio };
}

function ffmpegMerge(videoUrl, audioUrl, outputPath) {
    return new Promise((resolve, reject) => {
        const ff = spawn('ffmpeg', [
            '-i', videoUrl,
            '-i', audioUrl,
            '-c', 'copy',
            '-map', '0:v:0',
            '-map', '1:a:0',
            outputPath
        ]);
        let stderr = '';
        ff.stderr.on('data', d => { stderr += d.toString(); });
        ff.on('close', code => code === 0 ? resolve() : reject(new Error(stderr.slice(-500))));
    });
}

function scheduleCleanup(filePath) {
    setTimeout(() => { fs.promises.unlink(filePath).catch(() => {}); }, FILE_TTL_MS);
}

router.get('/', async (req, res) => {
    const { url, quality = '360' } = req.query;

    if (!url) return res.status(400).json({ status: false, creator: 'Edward', error: 'El parámetro url es requerido' });
    if (!VALID_QUALITIES.includes(quality)) {
        return res.status(400).json({ status: false, creator: 'Edward', error: `Calidad no válida. Usa: ${VALID_QUALITIES.join(', ')}` });
    }
    const id = url.match(YT_REGEX)?.[3];
    if (!id) return res.status(400).json({ status: false, creator: 'Edward', error: 'URL de YouTube no válida' });

    try {
        const { playerResponse, playerJsUrl } = await getPlayerResponse(id);
        const details = playerResponse.videoDetails || {};
        const formats = await resolveFormats(playerResponse, playerJsUrl);
        const picked = pickFormats(formats, quality);

        let downloadUrl;
        if (picked.mode === 'progressive') {
            downloadUrl = picked.video.url; // link directo a googlevideo, sin pasar por tu servidor
        } else {
            const jobId = crypto.randomBytes(8).toString('hex');
            const outputPath = path.join(TMP_DIR, `${jobId}.mp4`);
            await ffmpegMerge(picked.video.url, picked.audio.url, outputPath);
            scheduleCleanup(outputPath);
            downloadUrl = `${req.protocol}://${req.get('host')}/tmp/youtube/${jobId}.mp4`;
        }

        return res.json({
            status: true,
            creator: 'Edward',
            result: {
                title: details.title,
                duration: details.lengthSeconds,
                thumbnail: details.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                quality: quality + 'p',
                format: 'MP4',
                mode: picked.mode,
                download_url: downloadUrl
            },
            timestamp: new Date().toISOString()
        });

    } catch (e) {
        return res.status(500).json({ status: false, creator: 'Edward', error: e.message });
    }
});

module.exports = router;
