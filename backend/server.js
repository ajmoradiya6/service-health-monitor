const app = require('./app');
const livereload = require('livereload');

const PORT = 3003;

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
