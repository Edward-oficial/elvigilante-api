const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB máx
});

// POST /api/tools/catbox
// Body: form-data con campo "file"
router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: false,
            error: 'Debes enviar un archivo en el campo "file"'
        });
    }

    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response = await axios.post('https://catbox.moe/user.php', form, {
            headers: form.getHeaders(),
            timeout: 60000
        });

        const url = response.data.trim();

        if (!url.startsWith('https://')) {
            throw new Error('Catbox no devolvió una URL válida');
        }

        return res.json({
            status: true,
            creator: 'edward',
            data: {
                nombre: req.file.originalname,
                tamaño: `${(req.file.size / 1024).toFixed(2)} KB`,
                tipo: req.file.mimetype,
                url
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            error: error.message || 'Error al subir el archivo'
        });
    }
});

module.exports = router;
