const express = require('express');
const path = require('path');
require('dotenv').config();
const helmet = require('helmet');
const morgan = require('morgan');
const { authHandler } = require('./middlewares/auth');
const { apiNotFound, errorHandler } = require('./middlewares/errorHandler');
const { globalLimiter, authLimiter } = require('./middlewares/rateLimiter');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3032;

const MONGODB_URI=mongodb+srv://DvWilkerOFC:dvwilker15@dvwilker15.xndilqb.mongod.net
const MONGODB_DB=wilker_api

if (!MONGODB_URI) {
    console.error('❌ Falta MONGODB_URI en tu archivo .env. Copia .env.example a .env y complétalo.');
    process.exit(1);
}

mongoose.connect(`${MONGODB_URI}/${MONGODB_DB}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Conectado a MongoDB Atlas');
    global.startTime = Date.now();
}).catch(err => console.error('❌ Error MongoDB:', err));

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use('/api', globalLimiter);

const aiGemini = require('./routes/ai/gemini');
const toolQr = require('./routes/tools/qrcode');
const toolSsweb = require('./routes/tools/ssweb');
const gacha = require('./routes/tools/gacha');
const toolTts = require('./routes/tools/tts');              
const searchPin = require('./routes/search/pinterest');
const searchTt = require('./routes/search/tiktok');
const searchYt = require('./routes/search/youtube');            
const searchMemes = require('./routes/search/meme');           
const dlFb = require('./routes/download/facebookvid');
const dlIg = require('./routes/download/instagramvid');
const dlTw = require('./routes/download/twitter');
const dlPin = require('./routes/download/pinterest');
const dlTt = require('./routes/download/tiktok');
const dlYtAudio = require('./routes/download/ytaudio');
const dlYtVideo = require('./routes/download/ytvideo');
const dlMega = require('./routes/download/mega');
const dlApkMod = require('./routes/download/apkmod');
const animeKiss = require('./routes/anime/kiss');
const animeSad = require('./routes/anime/sad');
const animeSolo = require('./routes/anime/solo');
const userAuth = require('./routes/users');
const redeem = require('./routes/redeem');
const toolCatbox = require('./routes/tools/catbox');
const toolBase64 = require('./routes/tools/base64');
const toolShorturl = require('./routes/tools/shorturl');
const toolTranslate = require('./routes/tools/translate');
const animeHug = require('./routes/anime/hug');
const animePat = require('./routes/anime/pat');
const animeSlap = require('./routes/anime/slap');
const status = require('./routes/status');
const searchWikipedia = require('./routes/search/wikipedia');
const searchAnime = require('./routes/search/anime');
const searchLyrics = require('./routes/search/lyrics');
const searchGithub = require('./routes/search/github');
const dlMediafire = require('./routes/download/mediafire');
const dlReddit = require('./routes/download/reddit');

app.use('/api/status', status);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', userAuth);

app.use('/api/ai/gemini', authHandler, aiGemini);
app.use('/api/tools/qr', authHandler, toolQr);
app.use('/api/tools/ssweb', authHandler, toolSsweb);
app.use('/api/tools/gacha', authHandler, gacha);
app.use('/api/tools/tts', authHandler, toolTts);              
app.use('/api/search/pinterest', authHandler, searchPin);
app.use('/api/search/tiktok', authHandler, searchTt);
app.use('/api/search/youtube', authHandler, searchYt);   
app.use('/api/search/meme', authHandler, searchMemes);
app.use('/api/search/wikipedia', authHandler, searchWikipedia);
app.use('/api/search/anime', authHandler, searchAnime);
app.use('/api/search/lyrics', authHandler, searchLyrics);
app.use('/api/search/github', authHandler, searchGithub);
app.use('/api/download/facebook', authHandler, dlFb);
app.use('/api/download/instagram', authHandler, dlIg);
app.use('/api/download/twitter', authHandler, dlTw);
app.use('/api/download/pinterest', authHandler, dlPin);
app.use('/api/download/tiktok', authHandler, dlTt);
app.use('/api/download/ytaudio', authHandler, dlYtAudio);
app.use('/api/download/ytvideo', authHandler, dlYtVideo);
app.use('/api/download/mega', authHandler, dlMega);
app.use('/api/download/apkmod', authHandler, dlApkMod);
app.use('/api/download/mediafire', authHandler, dlMediafire);
app.use('/api/download/reddit', authHandler, dlReddit);
app.use('/api/anime/kiss', authHandler, animeKiss); 
app.use('/api/anime/solo', authHandler, animeSolo);
app.use('/api/anime/sad', authHandler, animeSad);
app.use('/api/tools/catbox', authHandler, toolCatbox);
app.use('/api/tools/base64', authHandler, toolBase64);
app.use('/api/tools/shorturl', authHandler, toolShorturl);
app.use('/api/tools/translate', authHandler, toolTranslate);
app.use('/api/anime/hug', authHandler, animeHug);
app.use('/api/anime/pat', authHandler, animePat);
app.use('/api/anime/slap', authHandler, animeSlap);
app.use('/api/auth', redeem);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) return next();
    });
});

app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html']
}));

app.use(apiNotFound);

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 DvWilkerOFC API escuchando en el puerto ${PORT}`);
    if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_KEY) {
        console.warn('⚠️  ADMIN_PASSWORD / ADMIN_KEY no están definidos en .env — se están usando valores por defecto inseguros. Configúralos antes de exponer la API en producción.');
    }
});