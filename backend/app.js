const express = require('express');
const path = require('path');
const connectLivereload = require('connect-livereload'); // ✅ Add this

const app = express();
const apiRoutes = require('./routes/api');
const serviceControlRoutes = require('./routes/serviceControl');

app.use(express.json());

// ✅ Inject LiveReload script into HTML
app.use(connectLivereload());

// ✅ Serve frontend static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Mount API routes under /api
app.use('/api', apiRoutes);
//app.use('/api/service-control', serviceControlRoutes);

module.exports = app;
