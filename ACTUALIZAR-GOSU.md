# Updating GOSU Speech to Text

This guide retains the historical 0.3.2 source-update procedure. For current releases use [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) and the corresponding release source/package. Branding updates preserve historical application/storage identities.

## Existing Windows checkout

Close the app and stop its development terminal with Ctrl+C. For the historical 0.3.2 source ZIP:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\gosu-speech-to-text-v0.3.2-source.zip'
$update = Join-Path $env:TEMP ('gosu-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'Could not apply the update.' }
Set-Location 'D:\projects\voz'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
npm.cmd run desktop
```

For another source version adjust the ZIP filename/root. `D:\projects\voz` remains the existing project directory; it does not need renaming. The updater creates a source backup under `.voz-backups`. Branding does not change history keys or native identity.

## Existing Linux checkout

Extract new source into a separate directory. From that directory:

```bash
python3 scripts/actualizar.py /path/to/previous/project
cd /path/to/previous/project
make setup
make dev
# After closing development:
make appimage
make install
```

The current command/menu name is `gosu-speech-to-text` / GOSU Speech to Text. Previous Make-managed AppImages/links migrate only when their ownership marker matches. Dictations, models, unrelated files, and commands owned by others are preserved. See [Linux](LINUX-MAKE.md) for dependencies, PREFIX, removal, and Wayland limits.

## Chrome

Historical source deliveries included `ready/gosu-speech-to-text-chrome.zip`. Current builds generate `gosu-speech-to-text-chrome.zip`; obtain it from the matching workflow or build it. To retain an unpacked extension's data, rebuild into the same `extension-dist` directory and Reload through `chrome://extensions`. Branding does not require clearing data.

For a fresh installation, extract to a stable directory and choose Load unpacked. Export a backup before uninstalling or moving an existing extension, since its local identity may change.

## macOS and installed packages

Use the commands in [usage](GUIA-0.3.md) and [build contract](BUILD-AND-RELEASE.md). Installers include the complete `engine-dist/gosu-engine` runtime automatically. Updating source does not update an already installed executable; rebuild/reinstall its complete package. This updater does not configure signing or publish an external release. Explicit Actions publication is handled separately.
