require('dotenv').config({ path: __dirname + '/.env' });

const app = require('./app');
const livereload = require('livereload');
const PORT = 3003;

//console.log('Current directory:', __dirname);
//console.log('OpenRouter API Key:', process.env.OPENROUTER_API_KEY);
//console.log('Test Var:', process.env.TEST_VAR);

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
