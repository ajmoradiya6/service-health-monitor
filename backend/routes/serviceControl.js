const express = require('express');
const os = require('os');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const servicesFilePath = path.join(__dirname, '..', '..', 'database', 'RegisteredServices.json');

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
        exec(`powershell.exe Stop-Service -Name '${service.name}'`, (err, stdout, stderr) => {
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
/*
router.get('/tomcat/metrics', async (req, res) => {
    try {
        const auth = { username: 'admin', password: 'admin' };

        // Fetch both XML and plain text list
        const [statusRes, listRes] = await Promise.all([
            axios.get('http://localhost:8080/manager/status/all?XML=true', { auth }),
            axios.get('http://localhost:8080/manager/text/list', { auth })
        ]);

        const statusParsed = await parseStringPromise(statusRes.data, {
            explicitArray: false,
            mergeAttrs: true
        });

        const status = statusParsed.status;

        // Parse plain text list
        const appLines = listRes.data.split('\n').filter(line => line.includes(':'));
        const applications = appLines.map(line => {
            const [contextPath, state, sessions, name] = line.split(':');
            return {
                name,
                contextPath,
                status: state,
                sessions: parseInt(sessions)
            };
        });

        res.json({
            jvm: status.jvm,
            connector: status.connector,
            applications // Always populated
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch Tomcat metrics',
            details: error.message
        });
    }
});
*/
router.get('/tomcat/metrics', async (req, res) => {
  try {
    const auth = { username: 'admin', password: 'admin' };

    // Fetch XML status data
    const { data: xml } = await axios.get('http://localhost:8080/manager/status/all?XML=true', { auth });
    const result = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
    const status = result.status;
    const jvm = status.jvm;
    const connector = status.connector;

    const memoryPools = Array.isArray(jvm.memorypool) ? jvm.memorypool : [jvm.memorypool];
    const heapPools = memoryPools.filter(pool => pool.type === 'Heap memory');
    const nonHeapPools = memoryPools.filter(pool => pool.type === 'Non-heap memory');

    // Fetch deployed applications from text endpoint
    const { data: appListText } = await axios.get('http://localhost:8080/manager/text/list', { auth });
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
          count: 1247, // replace with actual parsed GC info if available
          time: 2345   // replace with actual parsed GC info if available
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
    exec(`powershell -Command \"(Get-Process -Name Tomcat9_64bit* | Select-Object -First 1).StartTime.ToString('yyyy-MM-dd HH:mm:ss')\"`, async (err, stdout) => {
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

async function getTomcatVersion() {
  return new Promise((resolve) => {
    exec(
      `powershell -Command "(Get-Content -Path 'C:\\Program Files\\Apache Software Foundation\\Tomcat 9.0_Tomcat9_64bit\\RELEASE-NOTES' -Raw) | Select-String -Pattern 'Apache Tomcat'"`,
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




module.exports = router; 