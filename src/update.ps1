param([switch]$Quiet)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$currentPackage = Join-Path $root "package.json"
$updateRoot = Join-Path $root ".data\updates"
$metadataUrl = "https://raw.githubusercontent.com/Clonero1/priceparcing/main/package.json"
$archiveUrl = "https://codeload.github.com/Clonero1/priceparcing/zip/refs/heads/main"
$headers = @{ "User-Agent" = "PriceMonitor-Updater" }

function Write-UpdateMessage([string]$Message) {
  if (-not $Quiet) { Write-Host $Message }
}

try {
  if (-not (Test-Path $currentPackage)) { throw "package.json was not found." }
  $currentVersion = (Get-Content -LiteralPath $currentPackage -Raw | ConvertFrom-Json).version
  Write-UpdateMessage "Current version: $currentVersion"
  Write-UpdateMessage "Checking for updates..."

  $metadataRequest = "$metadataUrl`?ts=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
  $latestPackage = Invoke-RestMethod -Uri $metadataRequest -Headers $headers -TimeoutSec 20
  $latestVersion = [string]$latestPackage.version
  if ([version]$latestVersion -le [version]$currentVersion) {
    Write-UpdateMessage "The latest version is already installed."
    exit 0
  }

  New-Item -ItemType Directory -Path $updateRoot -Force | Out-Null
  $downloadPath = Join-Path $updateRoot "update.zip"
  $extractPath = Join-Path $updateRoot "extracted"
  if (Test-Path $downloadPath) { Remove-Item -LiteralPath $downloadPath -Force }
  if (Test-Path $extractPath) { Remove-Item -LiteralPath $extractPath -Recurse -Force }

  Write-UpdateMessage "Downloading version $latestVersion..."
  Invoke-WebRequest -Uri $archiveUrl -Headers $headers -OutFile $downloadPath -TimeoutSec 120
  Expand-Archive -LiteralPath $downloadPath -DestinationPath $extractPath -Force

  $source = Join-Path $extractPath "PriceMonitor"
  if (-not (Test-Path (Join-Path $source "package.json"))) {
    $package = Get-ChildItem -Path $extractPath -Filter package.json -Recurse | Select-Object -First 1
    if (-not $package) { throw "The downloaded archive is invalid." }
    $source = Split-Path -Parent $package.FullName
  }
  $downloadedVersion = (Get-Content -LiteralPath (Join-Path $source "package.json") -Raw | ConvertFrom-Json).version
  if ([version]$downloadedVersion -ne [version]$latestVersion) {
    throw "The archive version does not match the published version."
  }

  $currentDependencies = ((Get-Content -LiteralPath $currentPackage -Raw | ConvertFrom-Json).dependencies | ConvertTo-Json -Compress)
  $downloadedDependencies = ((Get-Content -LiteralPath (Join-Path $source "package.json") -Raw | ConvertFrom-Json).dependencies | ConvertTo-Json -Compress)
  $dependenciesChanged = $currentDependencies -ne $downloadedDependencies
  if ($dependenciesChanged) {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
    if (-not $npm -or -not $npx) { throw "Node.js package tools were not found." }
    Write-UpdateMessage "Preparing updated components..."
    Push-Location $source
    try {
      & $npm.Source install --omit=dev --no-audit --no-fund
      if ($LASTEXITCODE -ne 0) { throw "Could not prepare updated components." }
      & $npx.Source playwright install chromium
      if ($LASTEXITCODE -ne 0) { throw "Could not prepare the browser update." }
    } finally {
      Pop-Location
    }
  }

  Write-UpdateMessage "Installing the update..."
  $directories = @("src", "vendor", "test")
  if ($dependenciesChanged) { $directories += "node_modules" }
  foreach ($directory in $directories) {
    $from = Join-Path $source $directory
    if (-not (Test-Path $from)) { continue }
    $to = Join-Path $root $directory
    New-Item -ItemType Directory -Path $to -Force | Out-Null
    Copy-Item -Path (Join-Path $from "*") -Destination $to -Recurse -Force
  }

  Get-ChildItem -Path $source -File |
    Where-Object { $_.Extension -ne ".xlsx" } |
    Copy-Item -Destination $root -Force

  $installedVersion = (Get-Content -LiteralPath $currentPackage -Raw | ConvertFrom-Json).version
  if ([version]$installedVersion -ne [version]$latestVersion) {
    throw "The update could not be verified after installation."
  }
  Write-UpdateMessage "Update completed: $installedVersion"
  exit 0
} catch {
  Write-UpdateMessage "Update was skipped: $($_.Exception.Message)"
  exit 0
}
