const express = require('express');
const { execFile } = require('child_process');

const router = express.Router();

function runPS(command) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) return reject(error);
        if (stderr) {
          // Some PS commands write warnings to stderr even on success.
          // Prefer stdout when available.
        }
        resolve((stdout || '').toString().trim());
      }
    );
  });
}

function escapePSString(input = '') {
  return String(input).replace(/'/g, "''");
}

async function resolveServiceName({ name, displayName }) {
  if (name) return name;
  if (!displayName) return null;
  const dn = escapePSString(displayName);
  const cmd = `($svc = Get-Service -DisplayName '${dn}' -ErrorAction SilentlyContinue) | ForEach-Object { $_.Name }`;
  const resolved = await runPS(cmd);
  return resolved || null;
}

async function getStatus(name) {
  const nn = escapePSString(name);
  const cmd = `($s = Get-Service -Name '${nn}' -ErrorAction SilentlyContinue) | Select-Object -ExpandProperty Status`;
  const out = await runPS(cmd);
  return out || 'Unknown';
}

async function startServiceByName(name) {
  const nn = escapePSString(name);
  const cmd = `try { Start-Service -Name '${nn}' -ErrorAction Stop; $null = (Get-Service -Name '${nn}').WaitForStatus('Running','00:00:30'); 'OK' } catch { "ERR: $($_.Exception.Message)" }`;
  const out = await runPS(cmd);
  return out.startsWith('OK');
}

async function stopServiceByName(name) {
  const nn = escapePSString(name);
  const cmd = `try { Stop-Service -Name '${nn}' -Force -ErrorAction Stop; $null = (Get-Service -Name '${nn}').WaitForStatus('Stopped','00:00:30'); 'OK' } catch { "ERR: $($_.Exception.Message)" }`;
  const out = await runPS(cmd);
  return out.startsWith('OK');
}

router.post('/start', async (req, res) => {
  try {
    const { name, displayName } = req.body || {};
    const resolved = await resolveServiceName({ name, displayName });
    if (!resolved) return res.status(400).json({ error: 'Service name not found.' });
    const ok = await startServiceByName(resolved);
    const status = await getStatus(resolved);
    res.json({ success: ok, name: resolved, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start service', details: err.message });
  }
});

router.post('/stop', async (req, res) => {
  try {
    const { name, displayName } = req.body || {};
    const resolved = await resolveServiceName({ name, displayName });
    if (!resolved) return res.status(400).json({ error: 'Service name not found.' });
    const ok = await stopServiceByName(resolved);
    const status = await getStatus(resolved);
    res.json({ success: ok, name: resolved, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop service', details: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const name = req.query.name || null;
    const displayName = req.query.displayName || null;
    const resolved = await resolveServiceName({ name, displayName });
    if (!resolved) return res.status(400).json({ error: 'Service name not found.' });
    const status = await getStatus(resolved);
    res.json({ name: resolved, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get service status', details: err.message });
  }
});

module.exports = router;

