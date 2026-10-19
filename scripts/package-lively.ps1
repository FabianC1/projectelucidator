$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot 'dist'
$metadataPath = Join-Path $distPath 'LivelyInfo.json'
$archivePath = Join-Path $projectRoot 'ProjectElucidator.Lively.zip'

if (-not (Test-Path -LiteralPath $metadataPath -PathType Leaf)) {
  throw 'dist/LivelyInfo.json is missing. Run npm run build first.'
}

$metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
if ($metadata.FileName -ne 'index.html' -or $metadata.Type -ne 1 -or $metadata.Arguments -notmatch '--system-information') {
  throw 'dist/LivelyInfo.json is not configured as the Project Elucidator web wallpaper.'
}

Compress-Archive -Path (Join-Path $distPath '*') -DestinationPath $archivePath -Force
Write-Output "Created $archivePath with LivelyInfo.json at the archive root."
