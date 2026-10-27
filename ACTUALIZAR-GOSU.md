# GOSU Speech to Text — Dictation & Voice Typing · 0.3.2

Esta entrega aplica el nombre aprobado al escritorio, la extensión, los metadatos de instaladores, la documentación, los archivos de respaldo y las herramientas de Linux. El código conserva el parche de arranque y la compatibilidad de datos de la versión anterior.

## Tu Windows existente

Cierra la aplicación y detén su terminal con Ctrl+C. Guarda gosu-speech-to-text-v0.3.2-source.zip en Downloads. En PowerShell:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\gosu-speech-to-text-v0.3.2-source.zip'
$update = Join-Path $env:TEMP ('gosu-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo aplicar la actualización.' }
Set-Location 'D:\projects\voz'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci.' }
npm.cmd run desktop
```

D:\projects\voz sigue siendo tu carpeta de trabajo anterior; no se necesita renombrarla. El actualizador crea un respaldo del código en .voz-backups. Cambiar la marca no modifica el identificador ni las claves del historial.

## Linux existente

Descomprime el ZIP nuevo en otra carpeta. Desde la carpeta gosu-speech-to-text del nuevo ZIP:

```bash
python3 scripts/actualizar.py /ruta/a/tu/proyecto/anterior
cd /ruta/a/tu/proyecto/anterior
make setup
make dev
```

Para crear e instalar el AppImage:

```bash
make appimage
make install
```

El nuevo comando es `gosu-speech-to-text` y el acceso del menú se llama GOSU Speech to Text. Si existía una instalación hecha por el Makefile anterior, se migra su AppImage y enlace administrados. No se borran dictados, modelos ni otros archivos del usuario. La migración necesita el marcador de propiedad del instalador anterior y no reemplaza comandos ajenos.

Consulta LINUX-MAKE.md para Arch, Ubuntu, PREFIX, desinstalación y límites Wayland.

## Chrome

El ZIP incluye **ready/gosu-speech-to-text-chrome.zip**. Para conservar una instalación descomprimida existente, reconstruye la extensión en la misma carpeta extension-dist y pulsa Recargar en chrome://extensions. El nombre nuevo no exige borrar sus datos.

Si la instalas por primera vez, descomprime ese ZIP en una carpeta estable y selecciónala mediante Cargar descomprimida. Exporta tu respaldo antes de desinstalar o mover la instalación existente a otra carpeta, porque eso puede cambiar su identidad local.

## macOS y compilación de paquetes

Los comandos y requisitos de GUIA-0.3.md y BUILD-AND-RELEASE.md siguen aplicando. La aplicación empaquetada y los instaladores llevan el nombre GOSU Speech to Text; el motor interno se genera ahora en engine-dist/gosu-engine y se incorpora automáticamente.

La actualización no configura firma de código ni publicación externa. El workflow genera candidatos con el nombre nuevo para los tres sistemas.
