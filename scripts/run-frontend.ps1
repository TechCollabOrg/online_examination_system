$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$FrontendDir = Join-Path $Root 'online-exam-system-frontend'

Set-Location $FrontendDir
$Host.UI.RawUI.WindowTitle = 'Online Exam Frontend :9527'
Write-Host ('Frontend: ' + $FrontendDir) -ForegroundColor Cyan
Write-Host 'npm run dev' -ForegroundColor Cyan
Write-Host 'Ctrl+C to stop' -ForegroundColor DarkGray
Write-Host ''

npm run dev
