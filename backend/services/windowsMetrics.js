const { execFile } = require('child_process');
const path = require('path');

function runPowerShellFile(services = []) {
  return new Promise((resolve, reject) => {
    const psPath = path.join(__dirname, 'metrics.ps1');

    // Encode the array of service names as Base64 JSON
    const jsonBase64 = Buffer.from(JSON.stringify(services), 'utf8').toString('base64');

    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', psPath,
      '-JsonBase64', jsonBase64
    ];

    execFile('powershell', args, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(new Error(stderr));
      resolve(stdout.trim());
    });
  });
}

// Simple in-memory cache to avoid invoking PowerShell repeatedly for the same
// identifiers within a short period.
const CACHE_TTL_MS = 2000;
let cache = { key: '', timestamp: 0, data: null };

async function getWindowsMetrics(identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return {};
  }

  const key = identifiers.slice().sort().join('|');
  const now = Date.now();
  if (cache.data && cache.key === key && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const output = await runPowerShellFile(identifiers);

  let parsed = [];
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) parsed = [parsed];

  const result = {};
  for (const id of identifiers) {
    const m = parsed.find(s => s.Name === id) || {};
    result[id] = {
      cpuUsagePercent: m.CpuUsagePercent ?? 0,
      memoryUsagePercent: m.MemoryUsagePercent ?? 0,
      connections: m.Connections ?? 0,
    };
  }

  cache = { key, timestamp: now, data: result };
  return result;
}

module.exports = { getWindowsMetrics };
