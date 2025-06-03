const fs = require('fs');

function parseProperties(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const data = {};
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) data[key.trim()] = value.trim();
    });
    return data;
}

module.exports = { parseProperties };
