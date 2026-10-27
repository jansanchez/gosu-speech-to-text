$ErrorActionPreference = 'Continue'
Write-Host 'GOSU Speech to Text 0.3.1 - Diagnostico Windows (solo lectura)' -ForegroundColor Cyan
Write-Host "Sistema: $([System.Runtime.InteropServices.RuntimeInformation]::OSDescription)"
Write-Host "Arquitectura: $([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture)"
foreach ($tool in @('node','npm.cmd','py','rustup','rustc','cargo')) {
    $command = Get-Command $tool -ErrorAction SilentlyContinue
    if ($command) {
        Write-Host "OK $tool : $($command.Source)" -ForegroundColor Green
        & $tool --version
    } else { Write-Host "FALTA $tool" -ForegroundColor Yellow }
}
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (Test-Path $vswhere) {
    $cpp = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($cpp) { Write-Host "OK herramientas C++: $cpp" -ForegroundColor Green }
    else { Write-Host 'FALTA carga C++ x86/x64. Abre Visual Studio Installer > Modificar.' -ForegroundColor Yellow }
} else { Write-Host 'No se encontro Visual Studio Installer / vswhere.' -ForegroundColor Yellow }
$webview = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe",
    "$env:LocalAppData\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe"
) | ForEach-Object { Get-Item $_ -ErrorAction SilentlyContinue }
if ($webview) { Write-Host 'OK WebView2 encontrado.' -ForegroundColor Green }
else { Write-Host 'WebView2 no encontrado en rutas habituales. Revisa su instalacion.' -ForegroundColor Yellow }
Write-Host 'Si Rust acaba de instalarse y no se reconoce, cierra todas las terminales y abre una nueva.'
