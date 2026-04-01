param(
  [switch]$LinkGlobal,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot\..

Write-Host '==> xccodex Windows setup' -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required. Install Node.js 18+ first.'
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm is required. Install Node.js/npm first.'
}

node --version
npm --version

if (-not $SkipInstall) {
  Write-Host '==> Installing dependencies' -ForegroundColor Yellow
  npm install
}

Write-Host '==> Building project' -ForegroundColor Yellow
npm run build

if ($LinkGlobal) {
  Write-Host '==> Linking xccodex globally with npm link' -ForegroundColor Yellow
  npm link
}

Write-Host ''
Write-Host 'Setup complete.' -ForegroundColor Green
Write-Host 'Recommended next steps:'
Write-Host '  1. Run: node .\dist\xccodex.js'
if ($LinkGlobal) {
  Write-Host '  2. Or run globally: xccodex'
}
Write-Host '  3. If you want to reconfigure provider settings, run: node .\dist\xccodex.js --reconfigure'
