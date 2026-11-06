param([string]$ProjectPath = 'D:\projects\voz')
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'src-tauri\Cargo.toml'))) { throw 'The selected directory does not contain the GOSU Speech to Text project.' }
if ($sourceRoot -eq $projectRoot) { throw 'Run this updater from the new ZIP as described in GUIA-0.3.md.' }
$backup = Join-Path $projectRoot ('.voz-backups\0.3-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$files = @('AGENTS.md','ARCHITECTURE.md','CONTRIBUTING.md','CRITERIOS-DE-EXITO.md','MINIMAL-MODE.md','INSTALAR-MACOS.md','.editorconfig','.prettierignore','.prettierrc.json','brand.json','REPARAR-MOTOR.md','ACTUALIZAR-GOSU.md','INSTALAR-WINDOWS.md','CORREGIR-WINDOWS.md','Makefile','LINUX-MAKE.md','NOMBRES.md','package.json','package-lock.json','tsconfig.json','index.html','README.md','BUILD-AND-RELEASE.md','GUIA-0.3.md','FEATURES.md','VALIDACION.md','ROADMAP.md','PRIVACY.md','THIRD-PARTY.md','LICENSE')
foreach ($folder in @('src','server','src-tauri','scripts','extension','public','tests','.github','vendor-notices')) {
    $base = Join-Path $sourceRoot $folder
    if (Test-Path -LiteralPath $base) {
        Get-ChildItem -LiteralPath $base -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($sourceRoot.Length + 1)
            if ($relative -notmatch '(^|[\\/])(target|gen|__pycache__|node_modules)([\\/]|$)' -and $_.Extension -notin @('.log','.pyc')) { $files += $relative }
        }
    }
}
foreach ($relative in $files) { if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $relative))) { throw "File missing from the update: $relative" } }
foreach ($relative in $files) {
    $target = Join-Path $projectRoot $relative
    if (Test-Path -LiteralPath $target) {
        $saved = Join-Path $backup $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $saved) -Force | Out-Null
        Copy-Item -LiteralPath $target -Destination $saved -Force
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $sourceRoot $relative) -Destination $target -Force
}
$ignore = Join-Path $projectRoot '.gitignore'
if (-not (Test-Path -LiteralPath $ignore) -or -not (Select-String -LiteralPath $ignore -SimpleMatch '.voz-backups/' -Quiet)) { Add-Content -LiteralPath $ignore -Value "`n.voz-backups/" }
Write-Host 'GOSU Speech to Text source update applied. The Windows startup fix is included.' -ForegroundColor Green
Write-Host "Previous source backup: $backup"
Write-Host '.venv, node_modules, target, and application data are preserved.'
Write-Host "Now run from $projectRoot : npm.cmd ci; npm.cmd run desktop"
