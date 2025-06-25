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
