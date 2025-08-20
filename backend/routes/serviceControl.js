require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { getTomcatMetrics } = require('../services/tomcatMetrics');



let TOMCAT_PROCESS_NAME = 'Tomcat*'; // default fallback


router.get('/tomcat/metrics', async (req, res) => {
  try {
    const metrics = await getTomcatMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Tomcat metrics',
      details: error.message
    });
  }
});


const logPositions = {};

function getTodayDateStr() {
    const now = new Date();
    return now.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function readRecentLogLines(file, lastNBytes = 4096) {
    try {
        const stats = await fs.stat(file);
        const start = Math.max(0, stats.size - lastNBytes);
        const fileHandle = await fs.open(file, 'r');
        const buffer = Buffer.alloc(stats.size - start);
        await fileHandle.read(buffer, 0, buffer.length, start);
        await fileHandle.close();
        return buffer.toString();
    } catch (e) {
        return '';
    }
}

async function fetchLogsAsJson(file) {
    let logs = [];
    if (logPositions[file] && logPositions[file] > 0) {
        try {
            const stats = await fs.stat(file);
            if (stats.size > logPositions[file]) {
                const fileHandle = await fs.open(file, 'r');
                const buffer = Buffer.alloc(stats.size - logPositions[file]);
                await fileHandle.read(buffer, 0, buffer.length, logPositions[file]);
                await fileHandle.close();
                logs = buffer.toString().split(/\r?\n/).filter(Boolean);
                logPositions[file] = stats.size;
            }
        } catch (e) {
            logPositions[file] = 0;
        }
    } else {
        // Read last 4KB if offset is 0
        const data = await readRecentLogLines(file, 4096);
        logs = data.split(/\r?\n/).filter(Boolean);
        try {
            const stats = await fs.stat(file);
            logPositions[file] = stats.size;
        } catch (e) {
            logPositions[file] = 0;
        }
    }
    // Convert array of lines to an object { log1: { line: ... }, ... }
    const logsObj = {};
    logs.forEach((line, idx) => {
        logsObj[`log${idx + 1}`] = { line };
    });
    return logsObj;
}

router.get('/tomcat/logs', async (req, res) => {
    try {
        //const logDir = 'C:\\Program Files\\Apache Software Foundation\\Tomcat 9.0_Tomcat9_64bit\\logs';
        const TOMCAT_BASE = process.env.TOMCAT_BASE || 'C:/Program Files/Apache Software Foundation/Tomcat 9.0_Tomcat9_64bit';
        const logDir = path.join(TOMCAT_BASE, 'logs');
        
        
        const todayStr = getTodayDateStr();

        const file1 = path.join(logDir, `localhost_access_log.${todayStr}.txt`);
        const file2 = path.join(logDir, `${TOMCAT_PROCESS_NAME}-stderr.${todayStr}.log`);

        const [accessLogs, stderrLogs] = await Promise.all([
            fetchLogsAsJson(file1),
            fetchLogsAsJson(file2)
        ]);

        res.json({
            logs: {
                localhostAccess: accessLogs,
                stdError: stderrLogs
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read Tomcat logs', details: error.message });
    }
});


module.exports = router; 
