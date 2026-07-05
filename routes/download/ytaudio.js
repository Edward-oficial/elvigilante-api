const axios = require('axios');
const crypto = require('crypto');

class SaveTube {
    constructor() {
        this.ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        this.fmt = ['144', '240', '360', '480', '720', '1080', 'mp3'];
        this.m = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/;

        this.is = axios.create({
            headers: {
                'content-type': 'application/json',
                'origin': 'https://yt.savetube.me',
                'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0'
            }
        });

        // Cache simple en memoria para el CDN (no cambia en cada request,
        // así evitamos 1 round-trip completo por cada descarga).
        this._cdnCache = null;
        this._cdnCacheExpiry = 0;
    }

    async decrypt(enc) {
        try {
            const [sr, ky] = [Buffer.from(enc, 'base64'), Buffer.from(this.ky, 'hex')];
            const [iv, dt] = [sr.slice(0, 16), sr.slice(16)];
            const dc = crypto.createDecipheriv('aes-128-cbc', ky, iv);
            return JSON.parse(Buffer.concat([dc.update(dt), dc.final()]).toString());
        } catch (e) {
            throw new Error(`Error while decrypting data: ${e.message}`);
        }
    }

    async getCdn() {
        // Reutiliza el CDN por 5 minutos en vez de pedirlo en cada request.
        const now = Date.now();
        if (this._cdnCache && now < this._cdnCacheExpiry) {
            return { status: true, data: this._cdnCache };
        }

        const response = await this.is.get("https://media.savetube.vip/api/random-cdn");
        if (!response.status) return response;

        this._cdnCache = response.data.cdn;
        this._cdnCacheExpiry = now + 5 * 60 * 1000;

        return { status: true, data: response.data.cdn };
    }

    async download(url, format = 'mp3') {
        const id = url.match(this.m)?.[3];
        if (!id) return { status: false, msg: "ID cannot be extracted from url" };
        if (!format || !this.fmt.includes(format)) return { status: false, msg: "Formats not found", list: this.fmt };

        // Reintento único si el CDN cacheado falla (puede haber caído).
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const u = await this.getCdn();
                if (!u.status) return u;

                const res = await this.is.post(`https://${u.data}/v2/info`, { url: `https://www.youtube.com/watch?v=${id}` });
                const dec = await this.decrypt(res.data.data);

                const dl = await this.is.post(`https://${u.data}/download`, {
                    id: id,
                    downloadType: 'audio',
                    quality: '128',
                    key: dec.key
                });

                return {
                    status: true,
                    title: dec.title,
                    format: 'mp3',
                    thumb: dec.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                    duration: dec.duration,
                    cached: dec.fromCache,
                    dl: dl.data.data.downloadUrl
                };
            } catch (error) {
                // Si falló por CDN caído, invalidamos cache y reintentamos una vez.
                this._cdnCache = null;
                if (attempt === 1) {
                    return { status: false, error: error.message };
                }
            }
        }
    }
}

// Instancia única reutilizada entre requests (evita recrear axios/cache cada vez)
const st = new SaveTube();

// Endpoint para descargar audio
const ytaudio = async (req, res) => {
    const { url } = req.query;
    const endpointPrefix = req.baseUrl || '';

    if (!url) {
        return res.status(400).json({
            status: false,
            creator: "Edward",
            error: "URL parameter is required",
            message: "Please provide a YouTube URL: ?url=YOUTUBE_URL"
        });
    }

    try {
        const audio = await st.download(url, 'mp3');

        if (!audio.status) {
            return res.status(500).json({
                status: false,
                creator: "Edward",
                error: audio.error || audio.msg
            });
        }

        if (req.query.download === 'true') {
            return res.redirect(audio.dl);
        }

        return res.json({
            status: true,
            creator: "Edward",
            result: {
                title: audio.title,
                duration: audio.duration,
                thumbnail: audio.thumb,
                download_url: audio.dl,
                api_download: `${endpointPrefix}/download/ytaudio?url=${encodeURIComponent(url)}&download=true`
            }
        });
    } catch (e) {
        return res.status(500).json({
            status: false,
            creator: "Edward",
            error: e.message
        });
    }
};

module.exports = ytaudio;
