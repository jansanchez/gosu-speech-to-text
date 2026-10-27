$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Instala Node.js LTS y vuelve a abrir PowerShell.' }
if (!(Test-Path '.venv\Scripts\python.exe')) {
  & py -3.12 -m venv .venv
  if ($LASTEXITCODE -ne 0) { throw 'Instala Python 3.12 de 64 bits con el lanzador py.' }
}
& '.\.venv\Scripts\python.exe' -m pip install -r server/requirements-build.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias Python.' }
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias Node.' }
Write-Host 'Preparado. Ejecuta scripts\iniciar-escritorio.ps1. El motor se inicia automaticamente. Consulta GUIA-0.3.md.' -ForegroundColor Green
