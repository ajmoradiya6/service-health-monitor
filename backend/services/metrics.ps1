param(
  [Parameter(Mandatory = $true)]
  [string]$JsonBase64
)

# Decode and normalize the JSON array of service names
$names = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($JsonBase64)) | ConvertFrom-Json
if (-not ($names -is [System.Collections.IEnumerable])) { $names = @($names) }

# Resolve services and capture process IDs
$svcInfo = foreach ($raw in $names) {
  $name = [string]$raw
  $entry = [pscustomobject]@{ Name = $name; ProcId = $null }
  try {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if (-not $svc) { $svc = Get-Service | Where-Object { $_.DisplayName -eq $name } }
    if ($svc -and $svc.Status -eq 'Running') {
      $svcName = $svc.Name
      $entry.ProcId = (Get-CimInstance Win32_Service -Filter ("Name='" + $svcName + "'") -ErrorAction SilentlyContinue).ProcessId
    }
  } catch {}
  $entry
}

$procIds = $svcInfo | Where-Object { $_.ProcId } | Select-Object -ExpandProperty ProcId

# Fetch performance data for all processes in a single WMI call
$perfLookup = @{}
if ($procIds.Count -gt 0) {
  $filter = ($procIds | ForEach-Object { "IDProcess=$_" }) -join ' OR '
  $perfItems = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -Filter $filter -ErrorAction SilentlyContinue
  foreach ($p in @($perfItems)) { $perfLookup[$p.IDProcess] = $p }
}

# Fetch all established connections once and group by owning process
$connLookup = @{}
if ($procIds.Count -gt 0) {
  $groups = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue |
            Where-Object { $_.RemoteAddress -notin @('127.0.0.1','::1') -and $_.RemotePort -ne 1433 } |
            Group-Object -Property OwningProcess
  foreach ($g in $groups) { $connLookup[[int]$g.Name] = $g.Count }
}

# Retrieve total physical memory once
$totalMemMB = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1MB

# Build the result for each requested service
$result = foreach ($info in $svcInfo) {
  if ($info.ProcId) {
    $perf = $perfLookup[$info.ProcId]
    $cpu = if ($perf) { [math]::Round(($perf.PercentProcessorTime / $env:NUMBER_OF_PROCESSORS), 2) } else { $null }
    $memPercent = if ($perf -and $totalMemMB -gt 0) {
      $procMemMB = $perf.WorkingSet / 1MB
      [math]::Round((($procMemMB / $totalMemMB) * 100), 2)
    } else { $null }
    $conn = $connLookup[$info.ProcId] ?? 0
    [pscustomobject]@{
      Name               = $info.Name
      CpuUsagePercent    = $cpu
      MemoryUsagePercent = $memPercent
      Connections        = $conn
    }
  } else {
    [pscustomobject]@{ Name=$info.Name; CpuUsagePercent=$null; MemoryUsagePercent=$null; Connections=$null }
  }
}

@($result) | ConvertTo-Json -Compress -Depth 3
