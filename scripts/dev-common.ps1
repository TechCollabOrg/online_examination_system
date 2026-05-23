# Shared helpers for start-all.ps1 / stop-all.ps1

function Import-EnvLocal {
    param([Parameter(Mandatory)][string]$EnvFilePath)

    if (-not (Test-Path $EnvFilePath)) {
        throw ('env.local not found: ' + $EnvFilePath + [Environment]::NewLine +
            'Copy online-exam-system-backend/env.local.example to env.local')
    }

    $bytes = [System.IO.File]::ReadAllBytes($EnvFilePath)
    $offset = 0
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $offset = 3
    }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes, $offset, $bytes.Length - $offset)

    foreach ($rawLine in ($text -split "`r?`n")) {
        $line = $rawLine.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith('#')) { continue }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { continue }
        $name = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

function Test-PortListening {
    param([int]$Port)
    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Stop-PortListener {
    param([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Test-HttpOk {
    param([string]$Url, [int]$TimeoutSec = 3)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        return $r.StatusCode -ge 200 -and $r.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Test-BackendNeedsBuild {
    param([string]$BackendDir, [string]$JarPath)

    if (-not (Test-Path $JarPath)) { return $true }

    $jarTime = (Get-Item $JarPath).LastWriteTimeUtc
    $watchDirs = @(
        (Join-Path $BackendDir 'src\main\java'),
        (Join-Path $BackendDir 'src\main\resources'),
        (Join-Path $BackendDir 'pom.xml')
    )
    foreach ($dir in $watchDirs) {
        if (-not (Test-Path $dir)) { continue }
        $items = if ((Get-Item $dir).PSIsContainer) {
            Get-ChildItem -Path $dir -Recurse -File -ErrorAction SilentlyContinue
        } else {
            @(Get-Item $dir)
        }
        foreach ($f in $items) {
            if ($f.LastWriteTimeUtc -gt $jarTime) { return $true }
        }
    }
    return $false
}

function Build-Backend {
    param([string]$BackendDir)
    Push-Location $BackendDir
    try {
        Write-Host '(backend) Maven package (only when sources changed)...' -ForegroundColor Cyan
        & mvn -q -DskipTests package
        if ($LASTEXITCODE -ne 0) {
            throw ('Maven package failed, exit code ' + $LASTEXITCODE)
        }
        Write-Host '(backend) Build done' -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Open-DevBrowser {
    param(
        [string]$Url = 'http://localhost:9527'
    )
    if (-not (Test-HttpOk -Url $Url)) {
        Write-Host ('(browser) Frontend not ready, skip open: ' + $Url) -ForegroundColor Yellow
        return
    }
    Write-Host ('(browser) Opening ' + $Url) -ForegroundColor Cyan
    Start-Process $Url
}

function Wait-Service {
    param(
        [string]$Name,
        [string]$Url,
        [int]$MaxWaitSec = 90
    )
    $deadline = (Get-Date).AddSeconds($MaxWaitSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpOk -Url $Url) {
            Write-Host ($Name + ' ready: ' + $Url) -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    Write-Host ($Name + ' timeout after ' + $MaxWaitSec + 's: ' + $Url) -ForegroundColor Yellow
    return $false
}
