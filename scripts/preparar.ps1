$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Node.js LTS and reopen PowerShell.' }
if (!(Test-Path '.venv\Scripts\python.exe')) {
  & py -3.12 -m venv .venv
  if ($LASTEXITCODE -ne 0) { throw 'Install 64-bit Python 3.12 with the py launcher.' }
}
& '.\.venv\Scripts\python.exe' -m pip install -r server/requirements-build.txt
if ($LASTEXITCODE -ne 0) { throw 'Could not install Python dependencies.' }
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Could not install Node dependencies.' }
Write-Host 'Ready. Run scripts\iniciar-escritorio.ps1. The engine starts automatically. See GUIA-0.3.md.' -ForegroundColor Green
