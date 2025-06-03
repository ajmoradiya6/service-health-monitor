const express = require('express');
const path = require('path');
const app = express();
const apiRoutes = require('./routes/api');

app.use(express.json());

// Serve frontend static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount API routes under /api
app.use('/api', apiRoutes);

module.exports = app;
