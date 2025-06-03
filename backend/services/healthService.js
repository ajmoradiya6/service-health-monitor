const path = require('path');
const fs = require('fs');
const { parseProperties } = require('../utils/fileHandler');

const dbPath = path.join(__dirname, '../../database');

async function getAllServices() {
    const files = fs.readdirSync(dbPath).filter(f => f.endsWith('.properties'));
    return files.map(file => parseProperties(path.join(dbPath, file)));
}

module.exports = { getAllServices };
