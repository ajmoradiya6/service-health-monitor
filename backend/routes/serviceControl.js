require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const os = require('os');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const servicesFilePath = path.join(__dirname, '..', '..', 'database', 'RegisteredServices.json');

const BACKEND_HOST = process.env.BACKEND_HOST || 'http://localhost';
const PORT         = parseInt(process.env.TOMCAT_PORT, 10) || 8080;

// Add at the top
let TOMCAT_PROCESS_NAME = 'Tomcat*'; // default fallback

async function loadTomcatProcessName() {
  try {
    const servicesFilePath = process.env.SERVICES_FILE_PATH || path.join(__dirname, '..', '..', 'database', 'RegisteredServices.json');
    const fileContent = await fs.readFile(servicesFilePath, 'utf8');
    const data = JSON.parse(fileContent);

    if (data.tomcatService && data.tomcatService.name) {
      TOMCAT_PROCESS_NAME = data.tomcatService.name;
    } else if (Array.isArray(data.windowsServices)) {
      const found = data.windowsServices.find(s => s.name && s.name.toLowerCase().startsWith('tomcat'));
      if (found) TOMCAT_PROCESS_NAME = found.name;
    }
    // else keep default
  } catch (e) {
    // Leave the default if anything goes wrong
  }
}

// Immediately load it once at startup
loadTomcatProcessName();


// Helper to get service name by ID
async function getServiceById(serviceId) {
    const fileContent = await fs.readFile(servicesFilePath, 'utf8');
    const data = fileContent ? JSON.parse(fileContent) : {};
    // Check windowsServices array
    if (Array.isArray(data.windowsServices)) {
        const found = data.windowsServices.find(s => s.id === serviceId);
        if (found) return found;
    }
    // Check tomcatService object
    if (data.tomcatService && data.tomcatService.id === serviceId) {
        return data.tomcatService;
    }
    return null;
}

// Start service
router.post('/:id/start', async (req, res) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        exec(`powershell.exe Start-Service -Name '${service.name}'`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr || err.message });
            res.json({ status: 'started', stdout });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Stop service
router.post('/:id/stop', async (req, res) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        exec(`powershell.exe Stop-Service -Name '${service.name}' -Force`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr || err.message });
            res.json({ status: 'stopped', stdout });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get service status
router.get('/:id/status', async (req, res) => {
    try {
        const service = await getServiceById(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        exec(`powershell.exe (Get-Service -Name '${service.name}').Status`, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr || err.message });
            res.json({ status: stdout.trim() });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/tomcat/metrics', async (req, res) => {
  try {

    //const auth = { username: 'admin', password: 'admin' };
    const TOMCAT_USERNAME = process.env.TOMCAT_USERNAME || 'admin';
    const TOMCAT_PASSWORD = process.env.TOMCAT_PASSWORD || 'admin';
    const auth = { username: TOMCAT_USERNAME, password: TOMCAT_PASSWORD };

    //const tomcatBaseUrl = `${BACKEND_HOST}:${PORT}`;
    const tomcatBaseUrl = `http://127.0.0.1:8080`;
    
    // Fetch XML status data
    //const { data: xml } = await axios.get('http://localhost:8080/manager/status/all?XML=true', { auth });
    const { data: xml } = await axios.get(`${tomcatBaseUrl}/manager/status/all?XML=true`, { auth });
    const result = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
    const status = result.status;
    const jvm = status.jvm;
    const connector = status.connector;

    const memoryPools = Array.isArray(jvm.memorypool) ? jvm.memorypool : [jvm.memorypool];
    const heapPools = memoryPools.filter(pool => pool.type === 'Heap memory');
    const nonHeapPools = memoryPools.filter(pool => pool.type === 'Non-heap memory');

    // Fetch deployed applications from text endpoint
    //const { data: appListText } = await axios.get('http://localhost:8080/manager/text/list', { auth });
    const { data: appListText } = await axios.get(`${tomcatBaseUrl}/manager/text/list`, { auth });
    const appLines = appListText.split('\n').filter(line => line.startsWith('/'));
    const applications = appLines.map(line => {
      const [path, state, sessions, name] = line.trim().split(':');
      return {
        name: name || path.replace('/', '') || 'ROOT',
        contextPath: path,
        status: state.charAt(0).toUpperCase() + state.slice(1),
        sessions: parseInt(sessions)
      };
    });

    const server = await getServerInfo();

    // Final JSON response
    res.json({
      server,
      threads: {
        max: parseInt(connector.threadInfo.maxThreads),
        current: parseInt(connector.threadInfo.currentThreadCount),
        busy: parseInt(connector.threadInfo.currentThreadsBusy),
        utilization: (
          (parseInt(connector.threadInfo.currentThreadsBusy) /
            parseInt(connector.threadInfo.maxThreads)) *
          100
        ).toFixed(1)
      },
      requests: {
        count: parseInt(connector.requestInfo.requestCount),
        errors: parseInt(connector.requestInfo.errorCount),
        avgProcessingTime:
          parseInt(connector.requestInfo.processingTime / connector.requestInfo.requestCount) || 0,
        timeout: 20000
      },
      memory: {
        heap: calculateMemory(heapPools),
        nonHeap: calculateMemory(nonHeapPools),
        gc: {
          count: 1247, 
          time: 2345   
        }
      },
      applications
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Tomcat metrics',
      details: error.message
    });
  }
});

async function getServerInfo() {
  return new Promise((resolve) => {
    exec(`powershell -Command \"(Get-Process -Name '${TOMCAT_PROCESS_NAME}' | Select-Object -First 1).StartTime.ToString('yyyy-MM-dd HH:mm:ss')\"`, async (err, stdout) => {
      const startTime = stdout.trim() || 'Unknown';
      const uptime = startTime !== 'Unknown' ? calculateUptime(startTime) : 'Unknown';

      resolve({
        status: 'Running',
        uptime,
        startTime,
        jvmVersion: await getJvmVersion(),
        tomcatVersion: await getTomcatVersion(),
        os: `${os.type()} ${os.release()}`
      });
    });
  });
}

function calculateUptime(startTimeStr) {
  const startTime = new Date(startTimeStr);
  const now = new Date();
  const uptimeMs = now - startTime;
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  return `${days} days, ${hours} hours, ${minutes} minutes`;
}

async function getJvmVersion() {
  return new Promise((resolve) => {
    exec('java -version', (err, stdout, stderr) => {
      const match = stderr.match(/version \"(.*?)\"/);
      resolve(match ? `OpenJDK ${match[1]}` : 'Unknown');
    });
  });
}

/*async function getTomcatVersion() {
  return new Promise((resolve) => {
    exec(
      `powershell -Command "(Get-Content -Path 'C:\\Program Files\\Apache Software Foundation\\Tomcat 9.0_Tomcat9_64bit\\RELEASE-NOTES' -Raw) | Select-String -Pattern 'Apache Tomcat'"`,
      (err, stdout) => {
        const match = stdout.match(/Apache Tomcat.*?(\d+\.\d+\.\d+)/);
        resolve(match ? `Apache Tomcat/${match[1]}` : 'Apache Tomcat/Unknown');
      }
    );
  });
}*/

async function getTomcatVersion() {
  const TOMCAT_BASE = process.env.TOMCAT_BASE || 'C:\\Program Files\\Apache Software Foundation\\Tomcat 9.0_Tomcat9_64bit';
  const releaseNotesPath = path.join(TOMCAT_BASE, 'RELEASE-NOTES');
  return new Promise((resolve) => {
    exec(
      `powershell -Command "(Get-Content -Path '${releaseNotesPath}' -Raw) | Select-String -Pattern 'Apache Tomcat'"`,
      (err, stdout) => {
        const match = stdout.match(/Apache Tomcat.*?(\d+\.\d+\.\d+)/);
        resolve(match ? `Apache Tomcat/${match[1]}` : 'Apache Tomcat/Unknown');
      }
    );
  });
}


function calculateMemory(pools) {
  const used = pools.reduce((sum, pool) => sum + parseInt(pool.usageUsed || 0), 0);
  const max = pools.reduce((sum, pool) => {
    const val = parseInt(pool.usageMax);
    return val > 0 ? sum + val : sum;
  }, 0);

  return {
    usedMB: Math.round(used / 1024 / 1024),
    maxMB: Math.round(max / 1024 / 1024),
    usagePercent: max > 0 ? ((used / max) * 100).toFixed(1) : '--'
  };
}

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