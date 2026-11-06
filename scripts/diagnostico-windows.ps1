$ErrorActionPreference = 'Continue'
Write-Host 'GOSU Speech to Text - Windows diagnostics (read only)' -ForegroundColor Cyan
Write-Host "System: $([System.Runtime.InteropServices.RuntimeInformation]::OSDescription)"
Write-Host "Architecture: $([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture)"
foreach ($tool in @('node','npm.cmd','py','rustup','rustc','cargo')) {
    $command = Get-Command $tool -ErrorAction SilentlyContinue
    if ($command) {
        Write-Host "OK $tool : $($command.Source)" -ForegroundColor Green
        & $tool --version
    } else { Write-Host "MISSING $tool" -ForegroundColor Yellow }
}
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (Test-Path $vswhere) {
    $cpp = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($cpp) { Write-Host "OK C++ tools: $cpp" -ForegroundColor Green }
    else { Write-Host 'MISSING C++ x86/x64 workload. Open Visual Studio Installer > Modify.' -ForegroundColor Yellow }
} else { Write-Host 'Visual Studio Installer / vswhere was not found.' -ForegroundColor Yellow }
$webview = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe",
    "$env:LocalAppData\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe"
) | ForEach-Object { Get-Item $_ -ErrorAction SilentlyContinue }
if ($webview) { Write-Host 'OK WebView2 found.' -ForegroundColor Green }
else { Write-Host 'WebView2 not found in standard locations. Check its installation.' -ForegroundColor Yellow }
Write-Host 'If Rust was just installed and is not recognized, close all terminals and open a new one.'
