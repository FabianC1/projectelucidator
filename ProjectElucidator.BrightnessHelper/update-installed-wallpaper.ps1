param(
  [string]$ArchivePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'ProjectElucidator.Lively.zip')
)

$ErrorActionPreference = 'Stop'
$helperInstaller = Join-Path $PSScriptRoot 'install-brightness-helper.ps1'
$tokenPath = Join-Path $env:LOCALAPPDATA 'ProjectElucidator\brightness.token'

if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw "Lively package archive not found: $ArchivePath" }
if (-not (Test-Path -LiteralPath $helperInstaller -PathType Leaf)) { throw 'Updated helper installer is missing.' }
Add-Type -AssemblyName System.IO.Compression
$archiveStream = [IO.File]::OpenRead($ArchivePath)
try {
  $archive = New-Object IO.Compression.ZipArchive($archiveStream, [IO.Compression.ZipArchiveMode]::Read, $false)
  try {
    $metadataEntry = $archive.GetEntry('LivelyInfo.json')
    if (-not $metadataEntry) { throw 'Lively package is missing root LivelyInfo.json.' }
    $reader = New-Object IO.StreamReader($metadataEntry.Open())
    try { $metadata = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    if ($metadata.Title -ne 'Project Elucidator' -or $metadata.Type -ne 1 -or $metadata.FileName -ne 'index.html') { throw 'Lively package metadata did not match Project Elucidator.' }
  } finally { $archive.Dispose() }
} finally { $archiveStream.Dispose() }

# This is the one-time code update. The installer preserves an existing pairing token.
& $helperInstaller
if (-not (Test-Path -LiteralPath $tokenPath -PathType Leaf)) { throw 'The existing helper pairing credential is missing; update stopped before the wallpaper files changed.' }
$token = [IO.File]::ReadAllText($tokenPath).Trim()
if ($token.Length -lt 32) { throw 'The helper pairing credential is invalid; update stopped before the wallpaper files changed.' }

$response = Invoke-RestMethod -Uri 'http://127.0.0.1:17384/api/installation-update' `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType 'application/zip' `
  -InFile $ArchivePath `
  -TimeoutSec 180
$token = $null
if (-not $response.updated -or -not $response.credentialBootstrapSaved -or -not $response.reloadRequested) { throw 'The helper did not confirm the project update, private pairing bootstrap, and reload request.' }

Write-Host 'PROJECT ELUCIDATOR ACTIVE WALLPAPER UPDATED' -ForegroundColor Cyan
Write-Host 'The helper validated and backed up the extracted active project.'
Write-Host 'The existing pairing credential was written to its private local bootstrap.'
Write-Host 'Lively accepted a reload request for that same project folder.'
Write-Host "Backup: $($response.backup)"
