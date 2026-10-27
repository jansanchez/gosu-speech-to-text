$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path '.venv\Scripts\python.exe')) { throw 'Primero ejecuta scripts\preparar.ps1.' }
if (!$env:GOSU_MODEL -and !$env:VOZ_MODEL) { $env:GOSU_MODEL = 'base' }
& '.\.venv\Scripts\python.exe' -m uvicorn server.app:app --host 127.0.0.1 --port 8765
