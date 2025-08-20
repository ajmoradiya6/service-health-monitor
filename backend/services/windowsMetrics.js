// const { exec } = require('child_process');

// function runPowerShell(command) {
//   return new Promise((resolve, reject) => {
//     const escaped = command.replace(/"/g, '\\"');
//     exec(
//       `powershell -NoProfile -ExecutionPolicy Bypass -Command "${escaped}"`,
//       { maxBuffer: 1024 * 500 },
//       (error, stdout, stderr) => {
//         if (error) return reject(error);
//         if (stderr) return reject(new Error(stderr));
//         resolve(stdout.trim());
//       }
//     );
//   });
// }

// async function getWindowsMetrics(identifiers = []) {
//   if (!Array.isArray(identifiers) || identifiers.length === 0) {
//     return {};
//   }

//   const escaped = identifiers.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
//   const command = `
//     $names = @(${escaped})
//     $result = @()
//     foreach ($name in $names) {
//       $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
//       if ($svc -and $svc.Status -eq 'Running') {
//         $pid = (Get-CimInstance Win32_Service -Filter "Name='$name'").ProcessId
//         if ($pid) {
//           $perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -Filter "IDProcess=$pid"
//           if ($perf) {
//             $cpu = [math]::Round($perf.PercentProcessorTime / $env:NUMBER_OF_PROCESSORS, 2)
//             $mem = [math]::Round($perf.WorkingSet / 1MB, 2)
//             $conn = (Get-NetTCPConnection -OwningProcess $pid -ErrorAction SilentlyContinue | Measure-Object).Count
//             $result += [pscustomobject]@{ Name=$name; CpuUsage=$cpu; MemoryUsage=$mem; Connections=$conn }
//           } else {
//             $result += [pscustomobject]@{ Name=$name; CpuUsage=$null; MemoryUsage=$null; Connections=$null }
//           }
//         } else {
//           $result += [pscustomobject]@{ Name=$name; CpuUsage=$null; MemoryUsage=$null; Connections=$null }
//         }
//       } else {
//         $result += [pscustomobject]@{ Name=$name; CpuUsage=$null; MemoryUsage=$null; Connections=$null }
//       }
//     }
//     $result | ConvertTo-Json -Compress
//   `;

//   const output = await runPowerShell(command);
//   let parsed = [];
//   try {
//     parsed = JSON.parse(output);
//   } catch {
//     parsed = [];
//   }
//   if (!Array.isArray(parsed)) parsed = [parsed];

//   const result = {};
//   identifiers.forEach(id => {
//     const m = parsed.find(s => s.Name === id);
//     result[id] = m
//       ? {
//           cpuUsage: m.CpuUsage || 0,
//           memoryUsage: m.MemoryUsage || 0,
//           connections: m.Connections || 0,
//         }
//       : { cpuUsage: 0, memoryUsage: 0, connections: 0 };
//   });
//   return result;
// }

// module.exports = { getWindowsMetrics };
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

async function getWindowsMetrics(identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return {};
  }

  const output = await runPowerShellFile(identifiers);
  //console.log("RAW PowerShell output:", output);

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
  return result;
}

module.exports = { getWindowsMetrics };
