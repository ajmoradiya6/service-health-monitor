/*
require('dotenv').config({ path: __dirname + '/.env' });

const app = require('./app');
const livereload = require('livereload');
const BACKEND_HOST = process.env.BACKEND_HOST || 'http://localhost';
const PORT = process.env.BACKEND_PORT || 3003;
console.log('Backend server will run on:', `${BACKEND_HOST}:${PORT}`);

// ✅ Watch frontend folder for changes
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(__dirname + "/../frontend");

// ✅ Force refresh on first connection
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
*/
require('dotenv').config({ path: __dirname + '/.env' });

const fs = require('fs');
const http = require('http');
const https = require('https');
const livereload = require('livereload');
const app = require('./app');

// ----- env vars -----
const BACKEND_HOST = process.env.BACKEND_HOST || 'http://localhost';
const PORT         = parseInt(process.env.BACKEND_PORT, 10) || 3003;
const USE_SSL      = process.env.USE_SSL === 'true';
const PFX_PATH     = process.env.SSL_PFX_PATH || '';
const PFX_PASS     = process.env.SSL_PFX_PASS || '';

// ----- live-reload (dev only) -----
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(__dirname + '/../frontend');
liveReloadServer.server.once('connection', () => {
  setTimeout(() => liveReloadServer.refresh('/'), 100);
});

// ----- start server -----
if (USE_SSL && PFX_PATH) {
  const options = {
    pfx: fs.readFileSync(PFX_PATH),
    passphrase: PFX_PASS
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running at ${BACKEND_HOST}:${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`HTTP server running at ${BACKEND_HOST}:${PORT}`);
  });
}

