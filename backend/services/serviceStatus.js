const { exec } = require('child_process');

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command}"`,
      { maxBuffer: 1024 * 500 },
      (error, stdout, stderr) => {
        if (error) return reject(error);
        if (stderr) return reject(new Error(stderr));
        resolve(stdout.trim());
      }
    );
  });
}

async function getServicesStatus(identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return {};
  }

  const escaped = identifiers.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
  const command =
    `$names = @(${escaped}); ` +
    "Get-Service | Where-Object { $names -contains $_.Name -or $names -contains $_.DisplayName } | " +
    'Select-Object Name, DisplayName, Status | ConvertTo-Json -Compress';

  const output = await runPowerShell(command);
  let parsed = [];
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) parsed = [parsed];

  const result = {};
  parsed.forEach(svc => {
    if (svc.Name) result[svc.Name] = svc.Status;
    if (svc.DisplayName) result[svc.DisplayName] = svc.Status;
  });

  identifiers.forEach(id => {
    if (!result[id]) result[id] = 'Unknown';
  });

  return result;
}

module.exports = { getServicesStatus };
