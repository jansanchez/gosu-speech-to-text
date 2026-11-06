# Historical Windows engine communication fix — 0.2.1

This is historical diagnostic evidence. Current instructions are in [README.md](README.md), [Windows setup](INSTALAR-WINDOWS.md), and [build contract](BUILD-AND-RELEASE.md). Its counts and findings describe that original investigation, not current installer acceptance. The later startup fix is included in current code.

A user screenshot showed pending audio and Preparing engine. A separate test confirmed Faster Whisper and the base model loaded on that Windows machine. This placed the failure after capture but before completed transcription; it did not alone identify the failed connection's exact cause.

The fix moved health/transcription into Rust commands using loopback without system proxies. The WebView no longer needed HTTP access to Python, and Rust added the token. Development web mode retained HTTP transport. Engine state, copyable diagnostics, early startup logs, readiness gating, and automatic health monitoring were added. Stopping capture stopped erasing queue errors.

## Historical update procedure

Close GOSU and stop `npm run desktop` with Ctrl+C. Download the original `voz-source-v0.2.1.zip` into Downloads, then run:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\voz-source-v0.2.1.zip'
$update = Join-Path $env:TEMP ('voz-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'Update failed; review the output above.' }
Set-Location 'D:\projects\voz'
npm.cmd run desktop
```

The updater saves replaced source under `.voz-backups`, preserving app identity, schemas, `.venv`, and installed dependencies. Cargo downloaded the new HTTP dependency and rebuilt the bridge. For current packaging, use [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md); the full build prepares the engine automatically.

## Historical verification

1. The original badge identified 0.2.1.
2. Wait for Engine ready · base. If offline, open Engine diagnostics, Refresh diagnostics, and Copy diagnostics to identify the startup phase.
3. Retry previous pending chunks before recording more; do not delete audio you want to recover.
4. Dictate and pause, then check the completed transcript chunk.

That investigation environment had neither Cargo nor Windows, so the new native build was not executed there. Nine Node tests (including mocked native IPC and rejection of WebView fetch to the engine), six API tests, TypeScript/Vite builds, and real Python startup, `/health`, and process cleanup on Linux passed. These tested logic/service behavior; resolution on the affected Windows machine required a user test.
