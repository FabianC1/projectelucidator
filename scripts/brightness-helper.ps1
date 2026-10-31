param(
  [string]$TokenPath = (Join-Path $env:LOCALAPPDATA 'ProjectElucidator\brightness.token'),
  [int]$Port = 17384,
  [switch]$Validate,
  [string]$LivelyRoot = (Join-Path $env:LOCALAPPDATA 'Lively Wallpaper'),
  [switch]$SkipLivelyReload
)

$ErrorActionPreference = 'Stop'
$script:SkipLivelyReload = [bool]$SkipLivelyReload
$script:LivelyRoot = $LivelyRoot
$script:HelperVersion = '2.2.0'
$script:HelperCapabilities = @('brightness','lock','startup-config','credential-bootstrap','installation-update','display-geometry')

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

  public sealed class DisplayRect {
    public int Id { get; set; }
    public int Left { get; set; }
    public int Top { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public bool Primary { get; set; }
  }

  public static class MonitorControl {
    [StructLayout(LayoutKind.Sequential)]
    private struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct MONITORINFOEX {
      public int cbSize;
      public RECT rcMonitor;
      public RECT rcWork;
      public uint dwFlags;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szDevice;
    }

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
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfo(IntPtr monitor, ref MONITORINFOEX info);
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

    public static DisplayRect[] GetDisplays() {
      List<DisplayRect> result = new List<DisplayRect>();
      MonitorEnumProc callback = delegate(IntPtr monitor, IntPtr hdc, ref RECT rect, IntPtr data) {
        MONITORINFOEX info = new MONITORINFOEX();
        info.cbSize = Marshal.SizeOf(typeof(MONITORINFOEX));
        if (!GetMonitorInfo(monitor, ref info)) return true;
        result.Add(new DisplayRect {
          Id = result.Count + 1,
          Left = info.rcMonitor.Left,
          Top = info.rcMonitor.Top,
          Width = info.rcMonitor.Right - info.rcMonitor.Left,
          Height = info.rcMonitor.Bottom - info.rcMonitor.Top,
          Primary = (info.dwFlags & 1) != 0
        });
        return true;
      };
      EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, callback, IntPtr.Zero);
      GC.KeepAlive(callback);
      return result.ToArray();
    }

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
    $headers += "Access-Control-Allow-Origin: $Origin`r`nVary: Origin`r`nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`r`nAccess-Control-Allow-Headers: Authorization, Content-Type`r`nAccess-Control-Allow-Private-Network: true`r`n"
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
  if ($length -gt 157286400 -or $length -lt 0) { throw 'Request body too large.' }
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

$script:ConfigDirectory = Join-Path (Split-Path -Parent $TokenPath) 'startup'
$script:ConfigPath = Join-Path $script:ConfigDirectory 'config.json'
$script:WallpaperDirectory = Join-Path $script:ConfigDirectory 'wallpapers'
$script:LivelyRoot = $LivelyRoot
$script:LastReloadRequested = $false
$script:LastInstallUpdated = $false
$script:LastReloadMessage = $null

function Get-Sha256Hex {
  param([byte[]]$Bytes)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($algorithm.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
  finally { $algorithm.Dispose() }
}

function Get-StartupConfiguration {
  if (-not (Test-Path -LiteralPath $script:ConfigPath -PathType Leaf)) {
    return [PSCustomObject]@{ version = 1; theme = $null; wallpaperName = $null; wallpaperType = $null; wallpaperFile = $null; wallpaperHash = $null; settings = $null }
  }
  $config = Get-Content -LiteralPath $script:ConfigPath -Raw | ConvertFrom-Json
  if ($config.version -ne 1) { throw 'Unsupported startup configuration version.' }
  if ($config.wallpaperFile) {
    try {
      if ($config.wallpaperFile -notmatch '^[a-f0-9]{64}\.bin$') { throw 'Invalid saved wallpaper identifier.' }
      $imagePath = Join-Path $script:WallpaperDirectory $config.wallpaperFile
      if (-not (Test-Path -LiteralPath $imagePath -PathType Leaf)) { throw 'Saved wallpaper image is missing.' }
      $bytes = [IO.File]::ReadAllBytes($imagePath)
      $hash = Get-Sha256Hex $bytes
      if ($hash -ne $config.wallpaperHash) { throw 'Saved wallpaper image integrity check failed.' }
      $config | Add-Member -NotePropertyName wallpaperData -NotePropertyValue ([Convert]::ToBase64String($bytes)) -Force
      $config | Add-Member -NotePropertyName wallpaperError -NotePropertyValue $null -Force
    } catch {
      $config | Add-Member -NotePropertyName wallpaperData -NotePropertyValue $null -Force
      $config | Add-Member -NotePropertyName wallpaperError -NotePropertyValue $_.Exception.Message -Force
    }
  } else {
    $config | Add-Member -NotePropertyName wallpaperData -NotePropertyValue $null -Force
    $config | Add-Member -NotePropertyName wallpaperError -NotePropertyValue $null -Force
  }
  return $config
}

function Save-StartupConfiguration {
  param($Patch)
  if (-not (Test-Path -LiteralPath $script:ConfigDirectory)) { New-Item -ItemType Directory -Path $script:ConfigDirectory -Force | Out-Null }
  if (-not (Test-Path -LiteralPath $script:WallpaperDirectory)) { New-Item -ItemType Directory -Path $script:WallpaperDirectory -Force | Out-Null }
  $previousConfigBytes = if (Test-Path -LiteralPath $script:ConfigPath -PathType Leaf) { [IO.File]::ReadAllBytes($script:ConfigPath) } else { $null }
  $script:LastReloadRequested = $false
  $script:LastInstallUpdated = $false
  $script:LastReloadMessage = $null
  $current = Get-StartupConfiguration
  $next = [ordered]@{
    version = 1
    theme = $current.theme
    wallpaperName = $current.wallpaperName
    wallpaperType = $current.wallpaperType
    wallpaperFile = $current.wallpaperFile
    wallpaperHash = $current.wallpaperHash
    settings = $current.settings
  }
  if ($Patch.PSObject.Properties.Name -contains 'theme') {
    if ($null -ne $Patch.theme -and $Patch.theme -notin @('sao','arise','grimoire','limitless','breathing-sun','demon-mode','dragon','tokyo-ghoul')) { throw 'Unknown theme identifier.' }
    $next.theme = $Patch.theme
  }
  if ($Patch.PSObject.Properties.Name -contains 'settings') {
    if ($null -ne $Patch.settings) {
      $settingsJson = ConvertTo-Json -InputObject $Patch.settings -Depth 12 -Compress
      if ($settingsJson.Length -gt 262144) { throw 'Startup settings exceed the 256 KB limit.' }
      $next.settings = $Patch.settings
    }
  }
  if ($Patch.PSObject.Properties.Name -contains 'wallpaperData') {
    if ($null -eq $Patch.wallpaperData) {
      $next.wallpaperName = $null; $next.wallpaperType = $null; $next.wallpaperFile = $null; $next.wallpaperHash = $null
    } else {
      if (-not $Patch.wallpaperName -or $Patch.wallpaperName.Length -gt 512) { throw 'Invalid wallpaper name.' }
      if ($Patch.wallpaperData -isnot [string] -or $Patch.wallpaperData.Length -gt 139810132) { throw 'Wallpaper image exceeds the 100 MB limit.' }
      $bytes = [Convert]::FromBase64String($Patch.wallpaperData)
      if ($bytes.Length -eq 0 -or $bytes.Length -gt 104857600) { throw 'Wallpaper image exceeds the 100 MB limit or is empty.' }
      $hash = Get-Sha256Hex $bytes
      $fileName = "$hash.bin"
      $imagePath = Join-Path $script:WallpaperDirectory $fileName
      if (-not (Test-Path -LiteralPath $imagePath -PathType Leaf)) {
        $imageTemp = "$imagePath.$([guid]::NewGuid().ToString('N')).tmp"
        [IO.File]::WriteAllBytes($imageTemp, $bytes)
        try { [IO.File]::Move($imageTemp, $imagePath) } catch { if (Test-Path -LiteralPath $imageTemp) { Remove-Item -LiteralPath $imageTemp -Force }; if (-not (Test-Path -LiteralPath $imagePath)) { throw } }
      }
      $next.wallpaperName = [string]$Patch.wallpaperName
      $next.wallpaperType = if ($Patch.wallpaperType -is [string] -and $Patch.wallpaperType.Length -le 128) { [string]$Patch.wallpaperType } else { 'application/octet-stream' }
      $next.wallpaperFile = $fileName
      $next.wallpaperHash = $hash
    }
  }
  $tempPath = "$($script:ConfigPath).$([guid]::NewGuid().ToString('N')).tmp"
  $json = ConvertTo-Json -InputObject $next -Depth 12 -Compress
  [IO.File]::WriteAllText($tempPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  try {
    if (Test-Path -LiteralPath $script:ConfigPath -PathType Leaf) {
      $backupPath = "$($script:ConfigPath).bak"
      [IO.File]::Replace($tempPath, $script:ConfigPath, $backupPath, $true)
    } else { [IO.File]::Move($tempPath, $script:ConfigPath) }
  } finally { if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force } }
  try {
    if ($Patch.installIntoLively -eq $true) {
      $installResult = Install-StartupConfigurationIntoLively $next $script:BrightnessToken
      $script:LastInstallUpdated = [bool]$installResult.updated
      $script:LastReloadRequested = [bool]$installResult.reloadRequested
      $script:LastReloadMessage = $installResult.reloadMessage
    }
  } catch {
    if ($null -ne $previousConfigBytes) { Write-AtomicBytes $script:ConfigPath $previousConfigBytes }
    elseif (Test-Path -LiteralPath $script:ConfigPath) { Remove-Item -LiteralPath $script:ConfigPath -Force }
    throw
  }
  return $next
}

function Write-AtomicBytes {
  param([string]$Path, [byte[]]$Bytes)
  $directory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $directory)) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
  $temp = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  $backup = "$Path.$([guid]::NewGuid().ToString('N')).bak"
  [IO.File]::WriteAllBytes($temp, $Bytes)
  try {
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
      [IO.File]::Replace($temp, $Path, $backup, $true)
      if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
    }
    else { [IO.File]::Move($temp, $Path) }
  } finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
  }
}

function Write-AtomicJson {
  param([string]$Path, $Value)
  $json = ConvertTo-Json -InputObject $Value -Depth 12 -Compress
  Write-AtomicBytes $Path ([Text.Encoding]::UTF8.GetBytes($json))
}

function Get-ActiveElucidatorProject {
  $layoutPath = Join-Path $script:LivelyRoot 'WallpaperLayout.json'
  if (-not (Test-Path -LiteralPath $layoutPath -PathType Leaf)) { throw 'LIVELY WALLPAPERLAYOUT.JSON WAS NOT FOUND; ACTIVE ENTRY CANNOT BE VERIFIED' }
  $layout = @(Get-Content -LiteralPath $layoutPath -Raw | ConvertFrom-Json)
  $matches = @($layout | Where-Object {
    $_.LivelyInfoPath -and (Test-Path -LiteralPath (Join-Path $_.LivelyInfoPath 'LivelyInfo.json') -PathType Leaf)
  } | Where-Object {
    try { (Get-Content -LiteralPath (Join-Path $_.LivelyInfoPath 'LivelyInfo.json') -Raw | ConvertFrom-Json).Title -eq 'Project Elucidator' } catch { $false }
  })
  $projectPaths = @($matches | ForEach-Object { [IO.Path]::GetFullPath([string]$_.LivelyInfoPath) } | Sort-Object -Unique)
  if ($projectPaths.Count -ne 1) { throw "EXPECTED ONE ACTIVE PROJECT ELUCIDATOR INSTALLATION; FOUND $($projectPaths.Count)" }
  $project = $projectPaths[0]
  $wallpapersRoot = [IO.Path]::GetFullPath((Join-Path $script:LivelyRoot 'Library\wallpapers')).TrimEnd('\') + '\'
  if (-not $project.StartsWith($wallpapersRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'ACTIVE PROJECT PATH IS OUTSIDE THE LIVELY WALLPAPER LIBRARY' }
  $metadata = Get-Content -LiteralPath (Join-Path $project 'LivelyInfo.json') -Raw | ConvertFrom-Json
  if ($metadata.Title -ne 'Project Elucidator' -or $metadata.FileName -ne 'index.html' -or -not (Test-Path -LiteralPath (Join-Path $project 'index.html') -PathType Leaf)) { throw 'ACTIVE PROJECT ELUCIDATOR FILES FAILED VALIDATION' }
  return [PSCustomObject]@{ Directory = $project }
}

function Set-PrivateBootstrapAcl {
  param([string]$Path)
  $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $userAce = "*$($currentSid):(F)"
  $systemAce = '*S-1-5-18:(F)'
  $icaclsPath = Join-Path $env:SystemRoot 'System32\icacls.exe'
  if (-not (Test-Path -LiteralPath $icaclsPath -PathType Leaf)) { throw 'ICACLS.EXE IS REQUIRED TO RESTRICT THE PRIVATE BOOTSTRAP ACL' }
  $aclOutput = & $icaclsPath $Path '/inheritance:r' '/grant:r' $userAce $systemAce 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'PRIVATE BOOTSTRAP ACL COULD NOT BE RESTRICTED' }
}

function Write-CredentialBootstrap {
  param([string]$ProjectDirectory, [string]$Token)
  $credentialPath = Join-Path $ProjectDirectory 'elucidator-private-bootstrap.json'
  Write-AtomicJson $credentialPath @{ token = $Token; version = 1 }
  Set-PrivateBootstrapAcl $credentialPath
  [IO.File]::SetAttributes($credentialPath, [IO.FileAttributes]::Hidden)
  return $credentialPath
}

function Install-StartupConfigurationIntoLively {
  param($Configuration, [string]$Token)
  $activeProject = Get-ActiveElucidatorProject
  $projectDirectory = $activeProject.Directory
  $manifestPath = Join-Path $projectDirectory 'elucidator-startup.json'
  $manifestBackupRoot = Join-Path $script:ConfigDirectory 'installed-backups'
  if (-not (Test-Path -LiteralPath $manifestBackupRoot)) { New-Item -ItemType Directory -Path $manifestBackupRoot -Force | Out-Null }
  $priorManifest = if (Test-Path -LiteralPath $manifestPath -PathType Leaf) { [IO.File]::ReadAllBytes($manifestPath) } else { $null }
  $credentialPath = Join-Path $projectDirectory 'elucidator-private-bootstrap.json'
  $priorCredential = if (Test-Path -LiteralPath $credentialPath -PathType Leaf) { [IO.File]::ReadAllBytes($credentialPath) } else { $null }
  $changedManifest = $false
  $changedCredential = $false
  $reloadAttempted = $false
  try {
  if ($null -ne $priorManifest) {
    Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $manifestBackupRoot ("manifest-" + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.json'))
  }
  $manifest = [ordered]@{
    version = 1
    theme = $Configuration.theme
    wallpaperName = $Configuration.wallpaperName
    wallpaperType = $Configuration.wallpaperType
    wallpaperFile = $null
    wallpaperHash = $null
    settings = $Configuration.settings
  }
  if ($Configuration.wallpaperFile) {
    $storedWallpaper = Join-Path $script:WallpaperDirectory $Configuration.wallpaperFile
    if (-not (Test-Path -LiteralPath $storedWallpaper -PathType Leaf)) { throw 'DURABLE WALLPAPER BYTES ARE MISSING' }
    $bytes = [IO.File]::ReadAllBytes($storedWallpaper)
    if ((Get-Sha256Hex $bytes) -ne $Configuration.wallpaperHash) { throw 'DURABLE WALLPAPER INTEGRITY CHECK FAILED' }
    $extension = switch -Regex ([string]$Configuration.wallpaperType) {
      '^image/jpeg$' { '.jpg'; break }
      '^image/png$' { '.png'; break }
      '^image/webp$' { '.webp'; break }
      '^image/gif$' { '.gif'; break }
      '^image/bmp$' { '.bmp'; break }
      default { '.img' }
    }
    $projectImageName = "elucidator-wallpaper-$($Configuration.wallpaperHash)$extension"
    $projectImagePath = Join-Path $projectDirectory $projectImageName
    if (-not (Test-Path -LiteralPath $projectImagePath -PathType Leaf)) { Write-AtomicBytes $projectImagePath $bytes }
    $manifest.wallpaperFile = $projectImageName
    $manifest.wallpaperHash = $Configuration.wallpaperHash
  }
  $changedManifest = $true
  Write-AtomicJson $manifestPath $manifest
  $changedCredential = $true
  [void](Write-CredentialBootstrap $projectDirectory $Token)

  $reloadRequested = $false
  $reloadMessage = if ($script:SkipLivelyReload) { 'LIVELY RELOAD SKIPPED BY HELPER TEST MODE' } else { 'LIVELY RELOAD NOT REQUESTED' }
  if (-not $script:SkipLivelyReload) {
    try {
      $livelyExe = Join-Path (Join-Path $env:LOCALAPPDATA 'Programs\Lively Wallpaper') 'Lively.exe'
      if (-not (Test-Path -LiteralPath $livelyExe -PathType Leaf)) { throw 'OFFICIAL LIVELY DESKTOP EXECUTABLE WAS NOT FOUND' }
      $arguments = 'setwp --file "' + $projectDirectory.Replace('"', '\"') + '"'
      $reloadAttempted = $true
      $reload = Start-Process -FilePath $livelyExe -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
      if ($reload.ExitCode -ne 0) { throw "LIVELY RELOAD COMMAND FAILED WITH EXIT CODE $($reload.ExitCode)" }
      $reloadRequested = $true
      $reloadMessage = 'LIVELY RELOAD REQUEST ACCEPTED'
    } catch { $reloadMessage = $_.Exception.Message }
  }
  return [PSCustomObject]@{ updated = $true; reloadRequested = $reloadRequested; reloadMessage = $reloadMessage }
  } catch {
    if ($changedManifest) {
      if ($null -ne $priorManifest) { Write-AtomicBytes $manifestPath $priorManifest }
      elseif (Test-Path -LiteralPath $manifestPath) { Remove-Item -LiteralPath $manifestPath -Force }
    }
    if ($changedCredential) {
      if ($null -ne $priorCredential) {
        Write-AtomicBytes $credentialPath $priorCredential
        Set-PrivateBootstrapAcl $credentialPath
      } elseif (Test-Path -LiteralPath $credentialPath) { Remove-Item -LiteralPath $credentialPath -Force }
    }
    if ($reloadAttempted) {
      try {
        $livelyExe = Join-Path (Join-Path $env:LOCALAPPDATA 'Programs\Lively Wallpaper') 'Lively.exe'
        if (Test-Path -LiteralPath $livelyExe -PathType Leaf) {
          $rollbackArguments = 'setwp --file "' + $projectDirectory.Replace('"', '\"') + '"'
          [void](Start-Process -FilePath $livelyExe -ArgumentList $rollbackArguments -WindowStyle Hidden -PassThru -Wait)
        }
      } catch { }
    }
    throw
  }
}

function Write-PrivateBootstrapForActiveProject {
  $project = Get-ActiveElucidatorProject
  [void](Write-CredentialBootstrap $project.Directory $script:BrightnessToken)
}

function Restore-PrivateBootstrapOnStartup {
  try {
    $project = Get-ActiveElucidatorProject
    $path = Join-Path $project.Directory 'elucidator-private-bootstrap.json'

    $needsRepair = $true

    if (Test-Path -LiteralPath $path -PathType Leaf) {
      try {
        $saved = Get-Content -LiteralPath $path -Raw |
          ConvertFrom-Json

        $needsRepair = ($saved.token -cne $script:BrightnessToken)
      } catch {
        $needsRepair = $true
      }
    }

    if ($needsRepair) {
      Write-PrivateBootstrapForActiveProject
    }

    Write-Host '[ELUCIDATOR] Private bootstrap ready.'
  } catch {
    Write-Warning "Private bootstrap recovery: $($_.Exception.Message)"
  }
}

function Update-ActiveElucidatorPackage {
  param([byte[]]$ArchiveBytes)
  if ($ArchiveBytes.Length -lt 22 -or $ArchiveBytes.Length -gt 104857600) { throw 'WALLPAPER UPDATE ARCHIVE IS EMPTY OR EXCEEDS THE 100 MB LIMIT' }
  Add-Type -AssemblyName System.IO.Compression
  $activeProject = Get-ActiveElucidatorProject
  $projectDirectory = $activeProject.Directory
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $backupRoot = Join-Path $script:ConfigDirectory (Join-Path 'installed-backups' "project-$stamp")
  $stageRoot = Join-Path $script:ConfigDirectory ("package-stage-$([guid]::NewGuid().ToString('N'))")
  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
  $zipStream = New-Object IO.MemoryStream(, $ArchiveBytes)
  $archive = $null
  $changedPaths = New-Object 'System.Collections.Generic.List[string]'
  $reloadAttempted = $false
  $priorCredentialBytes = $null
  try {
    $archive = New-Object IO.Compression.ZipArchive($zipStream, [IO.Compression.ZipArchiveMode]::Read, $false)
    $expandedBytes = [int64]0
    foreach ($entry in $archive.Entries) {
      $expandedBytes += $entry.Length
      if ($entry.Length -gt 104857600 -or $expandedBytes -gt 524288000) { throw 'WALLPAPER UPDATE EXPANDS BEYOND ITS SAFE SIZE LIMIT' }
      $relative = $entry.FullName.Replace('/', '\')
      if ([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|\\)\.\.(\\|$)' -or $relative -match '(^|\\)elucidator-private-bootstrap\.json$') {
        throw 'WALLPAPER UPDATE ARCHIVE CONTAINS AN UNSAFE OR PRIVATE PATH'
      }
      if (-not $relative) { continue }
      $destination = [IO.Path]::GetFullPath((Join-Path $stageRoot $relative))
      $stagePrefix = [IO.Path]::GetFullPath($stageRoot).TrimEnd('\') + '\'
      if (-not $destination.StartsWith($stagePrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'WALLPAPER UPDATE ARCHIVE PATH ESCAPES ITS STAGING DIRECTORY' }
      if (-not $entry.Name) { New-Item -ItemType Directory -Path $destination -Force | Out-Null; continue }
      $parent = Split-Path -Parent $destination
      if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
      $inputStream = $entry.Open()
      $outputStream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
      try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose(); $inputStream.Dispose() }
    }
    $stagedMetadataPath = Join-Path $stageRoot 'LivelyInfo.json'
    if (-not (Test-Path -LiteralPath $stagedMetadataPath -PathType Leaf)) { throw 'WALLPAPER UPDATE ARCHIVE IS MISSING LIVELYINFO.JSON' }
    $stagedMetadata = Get-Content -LiteralPath $stagedMetadataPath -Raw | ConvertFrom-Json
    if ($stagedMetadata.Title -ne 'Project Elucidator' -or $stagedMetadata.Type -ne 1 -or $stagedMetadata.FileName -ne 'index.html' -or -not (Test-Path -LiteralPath (Join-Path $stageRoot 'index.html') -PathType Leaf)) {
      throw 'WALLPAPER UPDATE ARCHIVE FAILED PROJECT VALIDATION'
    }

    $priorCredentialPath = Join-Path $projectDirectory 'elucidator-private-bootstrap.json'
    if (Test-Path -LiteralPath $priorCredentialPath -PathType Leaf) { $priorCredentialBytes = [IO.File]::ReadAllBytes($priorCredentialPath) }
    Copy-Item -LiteralPath $projectDirectory -Destination $backupRoot -Recurse -Force
    $backupProject = Join-Path $backupRoot (Split-Path -Leaf $projectDirectory)
    $backupCredential = Join-Path $backupProject 'elucidator-private-bootstrap.json'
    if (Test-Path -LiteralPath $backupCredential -PathType Leaf) { Remove-Item -LiteralPath $backupCredential -Force }
    $oldFiles = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    Get-ChildItem -LiteralPath $projectDirectory -Recurse -File -Force | ForEach-Object {
      $relative = $_.FullName.Substring($projectDirectory.Length).TrimStart('\')
      [void]$oldFiles.Add($relative)
    }
    $newFiles = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    Get-ChildItem -LiteralPath $stageRoot -Recurse -File -Force | ForEach-Object {
      $relative = $_.FullName.Substring($stageRoot.Length).TrimStart('\')
      if ($relative -eq 'elucidator-startup.json' -or $relative -eq 'elucidator-private-bootstrap.json' -or $relative -match '^elucidator-wallpaper-') { return }
      $target = Join-Path $projectDirectory $relative
      $bytes = [IO.File]::ReadAllBytes($_.FullName)
      [void]$changedPaths.Add($target)
      Write-AtomicBytes $target $bytes
      [void]$newFiles.Add($relative)
    }
    $credentialTarget = Join-Path $projectDirectory 'elucidator-private-bootstrap.json'
    [void]$changedPaths.Add($credentialTarget)
    [void](Write-CredentialBootstrap $projectDirectory $script:BrightnessToken)
    $targetMetadata = Get-Content -LiteralPath (Join-Path $projectDirectory 'LivelyInfo.json') -Raw | ConvertFrom-Json
    if ($targetMetadata.Title -ne 'Project Elucidator' -or -not (Test-Path -LiteralPath (Join-Path $projectDirectory 'index.html') -PathType Leaf)) { throw 'UPDATED PROJECT FAILED POST-WRITE VALIDATION' }
    $reloadRequested = $false
    if (-not $script:SkipLivelyReload) {
      $livelyExe = Join-Path (Join-Path $env:LOCALAPPDATA 'Programs\Lively Wallpaper') 'Lively.exe'
      if (-not (Test-Path -LiteralPath $livelyExe -PathType Leaf)) { throw 'OFFICIAL LIVELY DESKTOP EXECUTABLE WAS NOT FOUND' }
      $arguments = 'setwp --file "' + $projectDirectory.Replace('"', '\"') + '"'
      $reloadAttempted = $true
      $reload = Start-Process -FilePath $livelyExe -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
      if ($reload.ExitCode -ne 0) { throw "LIVELY RELOAD COMMAND FAILED WITH EXIT CODE $($reload.ExitCode)" }
      $reloadRequested = $true
    }
    return [PSCustomObject]@{ ok = $true; updated = $true; credentialBootstrapSaved = $true; reloadRequested = $reloadRequested; backup = $backupRoot }
  } catch {
    $backupProject = Join-Path $backupRoot (Split-Path -Leaf $projectDirectory)
    foreach ($target in $changedPaths) {
      $relative = $target.Substring($projectDirectory.Length).TrimStart('\')
      $backupFile = Join-Path $backupProject $relative
      if ($relative -eq 'elucidator-private-bootstrap.json' -and $null -ne $priorCredentialBytes) {
        Write-AtomicBytes $target $priorCredentialBytes
        Set-PrivateBootstrapAcl $target
        [IO.File]::SetAttributes($target, [IO.FileAttributes]::Hidden)
      } elseif (Test-Path -LiteralPath $backupFile -PathType Leaf) {
        Write-AtomicBytes $target ([IO.File]::ReadAllBytes($backupFile))
      }
      elseif (Test-Path -LiteralPath $target -PathType Leaf) { Remove-Item -LiteralPath $target -Force }
    }
    try {
      $livelyExe = Join-Path (Join-Path $env:LOCALAPPDATA 'Programs\Lively Wallpaper') 'Lively.exe'
      if ($reloadAttempted -and -not $script:SkipLivelyReload -and (Test-Path -LiteralPath $livelyExe -PathType Leaf)) {
        $restoreArgs = 'setwp --file "' + $projectDirectory.Replace('"', '\"') + '"'
        [void](Start-Process -FilePath $livelyExe -ArgumentList $restoreArgs -WindowStyle Hidden -PassThru -Wait)
      }
    } catch { }
    throw
  } finally {
    if ($archive) { $archive.Dispose() }
    $zipStream.Dispose()
    if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
  }
}

function Handle-Client {
  param($Client)
  $origin = $null
  try {
    $Client.ReceiveTimeout = 300000
    $Client.SendTimeout = 300000
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
      $health = @{ available = $true; service = 'Elucidator Windows Bridge'; version = $script:HelperVersion; capabilities = $script:HelperCapabilities; startupConfig = $true }
      Write-HttpResponse $stream 200 (ConvertTo-Json -InputObject $health -Compress) $origin
      return
    }
    if ($request.Method -eq 'GET' -and $request.Path -eq '/api/startup-config') {
      try {
        $config = Get-StartupConfiguration
        $publicConfig = [PSCustomObject]@{ version = 1; theme = $config.theme; wallpaperName = $config.wallpaperName; wallpaperType = $config.wallpaperType; wallpaperData = $config.wallpaperData; settings = $config.settings; wallpaperError = $config.wallpaperError }
        $payload = ConvertTo-Json -InputObject @{ available = [bool]($config.theme -or $config.wallpaperName); configuration = $publicConfig } -Depth 12 -Compress
        Write-HttpResponse $stream 200 $payload $origin
      } catch {
        $message = ConvertTo-Json -InputObject ('STARTUP CONFIGURATION ERROR · ' + $_.Exception.Message) -Compress
        Write-HttpResponse $stream 500 "{`"available`":false,`"message`":$message}" $origin
      }
      return
    }
    $authorization = $request.Headers['Authorization']
    if ($authorization -cne "Bearer $script:BrightnessToken") {
      Write-HttpResponse $stream 401 '{"message":"NOT PAIRED · USE SYS BRIGHTNESS PAIR <TOKEN>"}' $origin
      return
    }
    if ($request.Method -eq 'POST' -and $request.Path -eq '/api/installation-update') {
      $update = Update-ActiveElucidatorPackage $request.Body
      Write-HttpResponse $stream 200 (ConvertTo-Json -InputObject $update -Compress) $origin
      return
    }
    if ($request.Method -eq 'POST' -and $request.Path -eq '/api/credential-bootstrap') {
      Write-PrivateBootstrapForActiveProject
      Write-HttpResponse $stream 200 '{"ok":true,"saved":true}' $origin
      return
    }
    if ($request.Method -eq 'DELETE' -and $request.Path -eq '/api/credential-bootstrap') {
      $project = Get-ActiveElucidatorProject
      $credentialPath = Join-Path $project.Directory 'elucidator-private-bootstrap.json'
      if (Test-Path -LiteralPath $credentialPath -PathType Leaf) { Remove-Item -LiteralPath $credentialPath -Force }
      Write-HttpResponse $stream 200 '{"ok":true,"removed":true}' $origin
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
    if ($request.Method -eq 'GET' -and $request.Path -eq '/api/displays') {
      $payload = ConvertTo-Json -InputObject @([ElucidatorBrightness.MonitorControl]::GetDisplays()) -Depth 4 -Compress
      Write-HttpResponse $stream 200 "{`"displays`":$payload}" $origin
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
    if ($request.Method -eq 'POST' -and $request.Path -eq '/api/startup-config') {
      $requestData = [Text.Encoding]::UTF8.GetString($request.Body) | ConvertFrom-Json
      $saved = Save-StartupConfiguration $requestData
      $response = ConvertTo-Json -InputObject @{ ok = $true; saved = $true; installedProjectUpdated = $script:LastInstallUpdated; reloadRequested = $script:LastReloadRequested; reloadMessage = $script:LastReloadMessage; message = 'STARTUP CONFIGURATION SAVED'; theme = $saved.theme; wallpaperName = $saved.wallpaperName } -Compress
      Write-HttpResponse $stream 200 $response $origin
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

$mutexName = if ($Port -eq 17384) { 'Local\ProjectElucidatorDdcServer' } else { "Local\ProjectElucidatorDdcServer_$Port" }
$serverMutex = [System.Threading.Mutex]::new($false, $mutexName)
$ownsServerMutex = $false
try { $ownsServerMutex = $serverMutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsServerMutex = $true }
if (-not $ownsServerMutex) { $serverMutex.Dispose(); exit 0 }
Restore-PrivateBootstrapOnStartup
$listener = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
  while ($true) {
    $client = $listener.AcceptTcpClient()
    Handle-Client $client
  }
} finally {
  $listener.Stop()
  try { $serverMutex.ReleaseMutex() } catch { }
  $serverMutex.Dispose()
}
