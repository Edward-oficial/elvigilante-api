const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// GET /api/status
// Endpoint público (sin apiKey) pensado para monitores de uptime / balanceadores.
router.get('/', (req, res) => {
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const uptimeMs = global.startTime ? Date.now() - global.startTime : 0;

    res.json({
        status: true,
        creator: 'edward',
        service: 'elvigilante-api',
        database: dbStates[mongoose.connection.readyState] || 'unknown',
        uptime_seconds: Math.floor(uptimeMs / 1000),
        memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
