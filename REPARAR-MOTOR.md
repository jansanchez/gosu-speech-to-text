# Historical engine startup fix — 0.3.2

For current setup/builds use [README.md](README.md), [Windows setup](INSTALAR-WINDOWS.md), and [build contract](BUILD-AND-RELEASE.md). This document preserves the original diagnostic scope.

Windows error `The system cannot find the path specified (os error 3)` occurs before inference. It can refer to project Python, the working directory, or the packaged executable. The earlier message did not show the failing path, so it did not establish which one was missing.

## Recover existing development

```powershell
cd D:\projects\voz
py -3.12 scripts\configurar.py --dev
```

Use your actual project path. This prepares dependencies before launching and does not delete models/dictations.

## Permanent startup preparation

1. `npm run desktop` checks Python before Tauri. Missing environments are created with Python 3.12; incomplete `.venv` directories are preserved with backup names.
2. Healthy environments are not reinstalled every startup. The probe imports packages without downloading models or starting the server.
3. `npm run desktop:build -- --bundles nsis` automatically packages the engine before the installer and forwards arguments to Tauri correctly.
4. The runtime is copied to `src-tauri/target/release/engine`. A raw release EXE requires that adjacent directory; distribution should use the complete installer from `bundle/`.
5. The launcher validates paths before starting, accepts an existing legacy engine name, and records concrete paths in diagnostics. Moved debug builds can find a valid source root from their working location.

A packaged application does not install Python silently; automatic environment setup belongs to source development, while final installers include their runtime.

## Historical source ZIP update

Close the application and stop development with Ctrl+C:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\gosu-speech-to-text-v0.3.2-source.zip'
$update = Join-Path $env:TEMP ('gosu-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'Update failed.' }
Set-Location 'D:\projects\voz'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
npm.cmd run desktop
```

Identity/history/models/settings remain unchanged and previous source is backed up. Rebuild/reinstall existing packages with `py -3.12 scripts\configurar.py --build`; changing source alone does not change an installed EXE.

## Evidence

Regression tests cover missing/healthy/incomplete environments, package installation, argument forwarding, and engine paths. A Windows GNU Rust check was performed; this was not execution of an MSVC installer on the user's machine. If startup still fails, diagnostics report the checked paths.
