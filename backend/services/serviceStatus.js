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

async function getServiceStatus(identifier) {
  const cmd = `Get-Service | Where-Object { $_.Name -eq '${identifier}' -or $_.DisplayName -eq '${identifier}' } | Select-Object -ExpandProperty Status`;
  const status = await runPowerShell(cmd);
  return status || 'Unknown';
}

module.exports = { getServiceStatus };
