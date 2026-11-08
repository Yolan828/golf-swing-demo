# Tell this script where nginx is installed, using any one of:
#   .\scripts\deploy.ps1 -NginxDir "D:\path\to\nginx"
#   the GOLF_NGINX_DIR environment variable
#   scripts\deploy.local.ps1 (git-ignored) containing: $NginxDir = "D:\path\to\nginx"
param(
    [string]$NginxDir = $env:GOLF_NGINX_DIR
)

$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$ProjectDir = Split-Path -Parent $PSScriptRoot

$LocalConfig = Join-Path $PSScriptRoot "deploy.local.ps1"
if (-not $NginxDir -and (Test-Path -Path $LocalConfig)) {
    . $LocalConfig
}

$NginxHtmlDir = "$NginxDir\html"
$NginxExe = "$NginxDir\nginx.exe"

# Step 2 empties the html folder, so refuse to continue unless this is really nginx.
if (-not $NginxDir -or -not (Test-Path -Path $NginxExe)) {
    Write-Host "nginx.exe not found. Set -NginxDir, GOLF_NGINX_DIR, or scripts\deploy.local.ps1." -ForegroundColor Red
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting Golf Swing Compare Automated Deployment..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Next.js static export
Write-Host "[1/4] Building Next.js static export (npm run build)..." -ForegroundColor Yellow
Set-Location -Path $ProjectDir
& "C:\Program Files\nodejs\npm.cmd" run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build Failed!" -ForegroundColor Red
    exit 1
}

$OutDir = "$ProjectDir\out"
if (-not (Test-Path -Path $OutDir)) {
    Write-Host "Out directory missing!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Clean and Copy output to Nginx html directory
Write-Host "[2/4] Syncing static files to Nginx html folder..." -ForegroundColor Yellow
if (Test-Path -Path $NginxHtmlDir) {
    Remove-Item -Path "$NginxHtmlDir\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $NginxHtmlDir -Force | Out-Null
}

Copy-Item -Path "$OutDir\*" -Destination $NginxHtmlDir -Recurse -Force
Write-Host "Static files synced to Nginx!" -ForegroundColor Green
Write-Host ""

# Step 3: Nginx status check and reload
Write-Host "[3/4] Checking Nginx service status..." -ForegroundColor Yellow
$NginxProcess = Get-Process nginx -ErrorAction SilentlyContinue

if ($NginxProcess) {
    Write-Host "Nginx running, reloading configuration..." -ForegroundColor Cyan
    & $NginxExe -p $NginxDir -s reload
} else {
    Write-Host "Starting Nginx..." -ForegroundColor Cyan
    Start-Process -FilePath $NginxExe -WorkingDirectory $NginxDir
}

Write-Host "Nginx reload finished successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Display local IP and completion message
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Golf Swing Compare Deployment Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "Local URL:  http://localhost" -ForegroundColor Cyan
if ($LocalIP) {
    Write-Host "Intranet URL:  http://$LocalIP" -ForegroundColor Green
}
Write-Host "==================================================" -ForegroundColor Cyan
