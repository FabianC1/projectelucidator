param(
  [string]$TokenPath = (Join-Path $env:LOCALAPPDATA 'ProjectElucidator\brightness.token'),
  [int]$Port = 17384,
  [switch]$Validate
)

$ErrorActionPreference = 'Stop'

$nativeSource = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace ElucidatorBrightness {
  public sealed class MonitorReading {
    public int Id { get; set; }
    public string Name { get; set; }
    public bool Supported { get; set; }
    public int? Brightness { get; set; }
    public string Error { get; set; }
  }

  public sealed class BrightnessChange {
    public bool Success { get; set; }
    public string Message { get; set; }
  }

  public static class MonitorControl {
    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct PHYSICAL_MONITOR {
      public IntPtr Handle;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Description;
    }

    private sealed class Entry {
      public IntPtr Handle;
      public string Name;
      public int Id;
    }

    private delegate bool MonitorEnumProc(IntPtr monitor, IntPtr hdc, ref RECT rect, IntPtr data);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr clip, MonitorEnumProc callback, IntPtr data);
    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr monitor, out uint count);
    [DllImport("dxva2.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr monitor, uint count, [Out] PHYSICAL_MONITOR[] physicalMonitors);
    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool GetMonitorBrightness(IntPtr monitor, out uint minimum, out uint current, out uint maximum);
    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool SetMonitorBrightness(IntPtr monitor, uint brightness);
    [DllImport("dxva2.dll", SetLastError = true)]
    private static extern bool DestroyPhysicalMonitor(IntPtr monitor);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool LockWorkStation();

    public static bool LockWindowsSession() { return LockWorkStation(); }

    private static List<Entry> OpenMonitors() {
      List<Entry> entries = new List<Entry>();
      MonitorEnumProc callback = delegate(IntPtr monitor, IntPtr hdc, ref RECT rect, IntPtr data) {
        uint count = 0;
        if (!GetNumberOfPhysicalMonitorsFromHMONITOR(monitor, out count) || count == 0 || count > 16) return true;
        PHYSICAL_MONITOR[] physical = new PHYSICAL_MONITOR[count];
        if (!GetPhysicalMonitorsFromHMONITOR(monitor, count, physical)) return true;
        for (int i = 0; i < physical.Length; i++) {
          entries.Add(new Entry { Handle = physical[i].Handle, Name = (physical[i].Description ?? "DISPLAY").Trim(), Id = entries.Count + 1 });
        }
        return true;
      };
      EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, callback, IntPtr.Zero);
      GC.KeepAlive(callback);
      return entries;
    }

    private static int ToPercent(uint minimum, uint current, uint maximum) {
      if (maximum <= minimum) return 0;
      return (int)Math.Round((current - minimum) * 100.0 / (maximum - minimum));
    }

    private static uint ToDeviceLevel(uint minimum, uint maximum, int percent) {
      return minimum + (uint)Math.Round((maximum - minimum) * percent / 100.0);
    }

    private static void CloseMonitors(List<Entry> entries) {
      for (int i = 0; i < entries.Count; i++) {
        if (entries[i].Handle != IntPtr.Zero) DestroyPhysicalMonitor(entries[i].Handle);
      }
    }

    public static MonitorReading[] Read() {
      List<Entry> entries = OpenMonitors();
      List<MonitorReading> result = new List<MonitorReading>();
      try {
        for (int i = 0; i < entries.Count; i++) {
          uint minimum, current, maximum;
          bool supported = GetMonitorBrightness(entries[i].Handle, out minimum, out current, out maximum);
          result.Add(new MonitorReading {
            Id = entries[i].Id,
            Name = entries[i].Name,
            Supported = supported,
            Brightness = supported ? (int?)ToPercent(minimum, current, maximum) : null,
            Error = supported ? null : "DDC/CI brightness unavailable; check monitor OSD and cable"
          });
        }
      } finally { CloseMonitors(entries); }
      return result.ToArray();
    }

    public static BrightnessChange Set(int percent, int? monitorId) {
      List<Entry> entries = OpenMonitors();
      int changed = 0;
      int eligible = 0;
      bool found = !monitorId.HasValue;
      try {
        for (int i = 0; i < entries.Count; i++) {
          if (monitorId.HasValue && entries[i].Id != monitorId.Value) continue;
          found = true;
          uint minimum, current, maximum;
          if (!GetMonitorBrightness(entries[i].Handle, out minimum, out current, out maximum)) continue;
          eligible++;
          if (SetMonitorBrightness(entries[i].Handle, ToDeviceLevel(minimum, maximum, percent))) changed++;
        }
      } finally { CloseMonitors(entries); }

      if (!found) return new BrightnessChange { Success = false, Message = "MONITOR ID NOT FOUND · RUN SYS BRIGHTNESS LIST" };
      if (changed > 0) return new BrightnessChange { Success = true, Message = "REQUESTED LEVEL " + percent + "% · DDC/CI ACKNOWLEDGED BY " + changed + " MONITOR(S)" };
      if (eligible == 0) return new BrightnessChange { Success = false, Message = "NO DDC/CI BRIGHTNESS CONTROL · ENABLE DDC/CI IN THE MONITOR OSD" };
      return new BrightnessChange { Success = false, Message = "MONITOR REJECTED THE BRIGHTNESS CHANGE · CHECK DDC/CI" };
    }
  }
}
'@

try {
  if (-not ('ElucidatorBrightness.MonitorControl' -as [type])) {
    Add-Type -TypeDefinition $nativeSource -Language CSharp
  }
} catch {
  Write-Error "Could not load the Windows DDC/CI bridge: $($_.Exception.Message)"
  exit 1
}

if ($Validate) {
  Write-Output 'BRIGHTNESS HELPER CODE COMPILED SUCCESSFULLY'
  exit 0
}

if (-not (Test-Path -LiteralPath $TokenPath)) {
  $tokenDirectory = Split-Path -Parent $TokenPath
  if (-not (Test-Path -LiteralPath $tokenDirectory)) { New-Item -ItemType Directory -Path $tokenDirectory -Force | Out-Null }
  $randomBytes = New-Object byte[] 32
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
  $newToken = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  [IO.File]::WriteAllText($TokenPath, $newToken, [Text.Encoding]::ASCII)
}
$script:BrightnessToken = [IO.File]::ReadAllText($TokenPath).Trim()
if ($script:BrightnessToken.Length -lt 32) { throw 'The pairing token file is invalid.' }
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'The port must be between 1024 and 65535.' }

function Write-HttpResponse {
  param($Stream, [int]$Status, [string]$Payload, [string]$Origin)
  $reason = switch ($Status) {
    200 { 'OK' } 204 { 'No Content' } 400 { 'Bad Request' } 401 { 'Unauthorized' }
    403 { 'Forbidden' } 404 { 'Not Found' } 405 { 'Method Not Allowed' }
    413 { 'Payload Too Large' } 500 { 'Internal Server Error' } 503 { 'Service Unavailable' }
    default { 'Error' }
  }
  $body = if ($Payload) { [Text.Encoding]::UTF8.GetBytes($Payload) } else { [byte[]]@() }
  $headers = "HTTP/1.1 $Status $reason`r`nConnection: close`r`nCache-Control: no-store`r`nContent-Length: $($body.Length)`r`n"
  if ($Origin) {
    $headers += "Access-Control-Allow-Origin: $Origin`r`nVary: Origin`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Authorization, Content-Type`r`nAccess-Control-Allow-Private-Network: true`r`n"
  }
  if ($body.Length -gt 0) { $headers += "Content-Type: application/json; charset=utf-8`r`n" }
  $headers += "`r`n"
  $headerBytes = [Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) { $Stream.Write($body, 0, $body.Length) }
  $Stream.Flush()
}

function Read-HttpRequest {
  param($Stream)
  $headerBytes = New-Object 'System.Collections.Generic.List[byte]'
  while ($headerBytes.Count -lt 16384) {
    $byte = $Stream.ReadByte()
    if ($byte -lt 0) { throw 'Request ended before headers.' }
    $headerBytes.Add([byte]$byte)
    $count = $headerBytes.Count
    if ($count -ge 4 -and $headerBytes[$count - 4] -eq 13 -and $headerBytes[$count - 3] -eq 10 -and $headerBytes[$count - 2] -eq 13 -and $headerBytes[$count - 1] -eq 10) { break }
  }
  if ($headerBytes.Count -ge 16384) { throw 'Headers too large.' }
  $text = [Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
  $lines = $text -split "`r`n"
  $start = $lines[0] -split ' ', 3
  if ($start.Length -lt 2) { throw 'Invalid request line.' }
  $headers = @{}
  foreach ($line in $lines | Select-Object -Skip 1) {
    if (-not $line) { continue }
    $separator = $line.IndexOf(':')
    if ($separator -gt 0) { $headers[$line.Substring(0, $separator).Trim()] = $line.Substring($separator + 1).Trim() }
  }
  $length = 0
  if ($headers.ContainsKey('Content-Length')) { $length = [int]$headers['Content-Length'] }
  if ($length -gt 8192 -or $length -lt 0) { throw 'Request body too large.' }
  $body = New-Object byte[] $length
  $offset = 0
  while ($offset -lt $length) {
    $read = $Stream.Read($body, $offset, $length - $offset)
    if ($read -le 0) { throw 'Request body ended early.' }
    $offset += $read
  }
  return [PSCustomObject]@{ Method = $start[0].ToUpperInvariant(); Path = ($start[1] -split '\?', 2)[0]; Headers = $headers; Body = $body }
}

function Get-MonitorPayload {
  $readings = [ElucidatorBrightness.MonitorControl]::Read()
  $monitors = @($readings | ForEach-Object {
    [PSCustomObject]@{ id = $_.Id; name = $_.Name; supported = $_.Supported; brightness = $_.Brightness; error = $_.Error }
  })
  return $monitors
}

function Handle-Client {
  param($Client)
  $origin = $null
  try {
    $Client.ReceiveTimeout = 4000
    $Client.SendTimeout = 4000
    $stream = $Client.GetStream()
    try { $request = Read-HttpRequest $stream } catch {
      $code = if ($_.Exception.Message -like '*too large*') { 413 } else { 400 }
      Write-HttpResponse $stream $code '{"message":"INVALID LOCAL REQUEST"}' $null
      return
    }
    $hostHeader = $request.Headers['Host']
    if ($hostHeader -notin @("127.0.0.1:$Port", "localhost:$Port")) {
      Write-HttpResponse $stream 403 '{"message":"LOCALHOST ONLY"}' $null
      return
    }
    $requestedOrigin = $request.Headers['Origin']
    # Lively can use a file or app-specific origin. Reflect the requesting origin
    # for CORS; monitor endpoints still require this user's pairing token.
    if ($requestedOrigin) { $origin = $requestedOrigin }

    if ($request.Method -eq 'OPTIONS') {
      Write-HttpResponse $stream 204 '' $origin
      return
    }
    if ($request.Method -eq 'GET' -and $request.Path -eq '/health') {
      Write-HttpResponse $stream 200 '{"available":true,"service":"Elucidator DDC/CI"}' $origin
      return
    }
    $authorization = $request.Headers['Authorization']
    if ($authorization -cne "Bearer $script:BrightnessToken") {
      Write-HttpResponse $stream 401 '{"message":"NOT PAIRED · USE SYS BRIGHTNESS PAIR <TOKEN>"}' $origin
      return
    }
    if ($request.Method -eq 'POST' -and $request.Path -eq '/api/lock') {
      Write-HttpResponse $stream 200 '{"ok":true,"message":"WINDOWS WORKSTATION LOCK REQUEST ACCEPTED"}' $origin
      Start-Sleep -Milliseconds 500
      [void][ElucidatorBrightness.MonitorControl]::LockWindowsSession()
      return
    }
    if ($request.Method -eq 'GET' -and $request.Path -eq '/api/monitors') {
      $payload = ConvertTo-Json -InputObject @(Get-MonitorPayload) -Depth 4 -Compress
      Write-HttpResponse $stream 200 "{`"monitors`":$payload}" $origin
      return
    }
    if ($request.Method -eq 'POST' -and $request.Path -eq '/api/brightness') {
      $requestData = [Text.Encoding]::UTF8.GetString($request.Body) | ConvertFrom-Json
      $percent = [int]$requestData.brightness
      if ($percent -lt 0 -or $percent -gt 100) { throw 'Brightness must be between 0 and 100.' }
      $monitorId = $null
      if ($null -ne $requestData.monitorId) { $monitorId = [int]$requestData.monitorId }
      $change = [ElucidatorBrightness.MonitorControl]::Set($percent, $monitorId)
      $monitorPayload = ConvertTo-Json -InputObject @(Get-MonitorPayload) -Depth 4 -Compress
      $safeMessage = ConvertTo-Json -InputObject $change.Message -Compress
      $response = "{`"ok`":$($change.Success.ToString().ToLowerInvariant()),`"message`":$safeMessage,`"monitors`":$monitorPayload}"
      Write-HttpResponse $stream $(if ($change.Success) { 200 } else { 400 }) $response $origin
      return
    }
    if ($request.Method -notin @('GET', 'POST')) {
      Write-HttpResponse $stream 405 '{"message":"METHOD NOT ALLOWED"}' $origin
      return
    }
    Write-HttpResponse $stream 404 '{"message":"ENDPOINT NOT FOUND"}' $origin
  } catch {
    $message = ConvertTo-Json -InputObject ('LOCAL HELPER ERROR · ' + $_.Exception.Message) -Compress
    try { Write-HttpResponse $Client.GetStream() 500 "{`"message`":$message}" $origin } catch { }
  } finally { $Client.Close() }
}

$listener = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
  while ($true) {
    $client = $listener.AcceptTcpClient()
    Handle-Client $client
  }
} finally {
  $listener.Stop()
}
