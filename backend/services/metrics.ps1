param(
  [Parameter(Mandatory = $true)]
  [string]$JsonBase64
)

# Decode the JSON array of service names
$names = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($JsonBase64)) | ConvertFrom-Json
if (-not ($names -is [System.Collections.IEnumerable])) { $names = @($names) }

$result = foreach ($raw in $names) {
  $name = [string]$raw
  try {
    # Resolve by Name or DisplayName
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if (-not $svc) { $svc = Get-Service | Where-Object { $_.DisplayName -eq $name } }

    if ($svc -and $svc.Status -eq 'Running') {
      # Use the actual service Name for CIM (more reliable than DisplayName)
      $svcName = $svc.Name
      $procId = (Get-CimInstance Win32_Service -Filter ("Name='" + $svcName + "'") -ErrorAction SilentlyContinue).ProcessId
      if ($procId) {
        $perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -Filter ("IDProcess=" + $procId) -ErrorAction SilentlyContinue
        if ($perf) {
          # CPU % (normalized by number of processors)
          $cpu = [math]::Round(($perf.PercentProcessorTime / $env:NUMBER_OF_PROCESSORS), 2)

          # Memory % of total physical RAM
          $totalMemMB = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1MB
          $procMemMB  = $perf.WorkingSet / 1MB
          $memPercent = if ($totalMemMB -gt 0) { [math]::Round((($procMemMB / $totalMemMB) * 100), 2) } else { $null }

          # External established connections only (ignore loopback & SQL 1433)
          $conn = (
            Get-NetTCPConnection -OwningProcess $procId -State Established -ErrorAction SilentlyContinue |
            Where-Object { $_.RemoteAddress -notin @('127.0.0.1','::1') -and $_.RemotePort -ne 1433 } |
            Measure-Object
          ).Count

          [pscustomobject]@{
            Name               = $name
            CpuUsagePercent    = $cpu
            MemoryUsagePercent = $memPercent
            Connections        = $conn
          }
        }
        else {
          [pscustomobject]@{ Name=$name; CpuUsagePercent=$null; MemoryUsagePercent=$null; Connections=$null }
        }
      }
      else {
        [pscustomobject]@{ Name=$name; CpuUsagePercent=$null; MemoryUsagePercent=$null; Connections=$null }
      }
    }
    else {
      [pscustomobject]@{ Name=$name; CpuUsagePercent=$null; MemoryUsagePercent=$null; Connections=$null }
    }
  }
  catch {
    [pscustomobject]@{
      Name               = $name
      CpuUsagePercent    = "Error"
      MemoryUsagePercent = "Error"
      Connections        = "Error"
      Error              = $_.Exception.Message
    }
  }
}

@($result) | ConvertTo-Json -Compress -Depth 3
