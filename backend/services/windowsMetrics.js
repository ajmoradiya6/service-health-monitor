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

async function getWindowsMetrics(identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return {};
  }

  const escaped = identifiers.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
  const command =
    `$names = @(${escaped}); $totalMem = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory; ` +
    '$result = @(); foreach ($name in $names) { ' +
    "$svc = Get-Service -Name $name -ErrorAction SilentlyContinue; " +
    'if ($svc) { ' +
    "$pid = (Get-WmiObject Win32_Service -Filter \"Name='$name'\").ProcessId; " +
    'if ($pid) { ' +
    '$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue; ' +
    "$cpu = (Get-Counter \"\\Process($($proc.ProcessName))\\% Processor Time\").CounterSamples.CookedValue / $env:NUMBER_OF_PROCESSORS; " +
    '$mem = [math]::Round(($proc.WorkingSet64 / $totalMem) * 100, 2); ' +
    '$conn = (Get-NetTCPConnection -OwningProcess $pid -ErrorAction SilentlyContinue | Measure-Object).Count; ' +
    '$result += [pscustomobject]@{ Name=$name; CpuUsage=[math]::Round($cpu,2); MemoryUsage=$mem; Connections=$conn }; ' +
    '} else { $result += [pscustomobject]@{ Name=$name; CpuUsage=$null; MemoryUsage=$null; Connections=$null }; } ' +
    '} else { $result += [pscustomobject]@{ Name=$name; CpuUsage=$null; MemoryUsage=$null; Connections=$null }; } } ' +
    '$result | ConvertTo-Json -Compress';

  const output = await runPowerShell(command);
  let parsed = [];
  try {
    parsed = JSON.parse(output);
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) parsed = [parsed];

  const result = {};
  identifiers.forEach(id => {
    const m = parsed.find(s => s.Name === id);
    result[id] = m
      ? { cpuUsage: m.CpuUsage || 0, memoryUsage: m.MemoryUsage || 0, connections: m.Connections || 0 }
      : { cpuUsage: 0, memoryUsage: 0, connections: 0 };
  });
  return result;
}

module.exports = { getWindowsMetrics };
