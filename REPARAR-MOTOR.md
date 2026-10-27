# Arranque del motor · GOSU Speech to Text 0.3.2

El error Windows `The system cannot find the path specified (os error 3)` aparece antes de que el reconocedor procese audio. Puede corresponder al Python del proyecto, al directorio de trabajo o al ejecutable empaquetado. El mensaje anterior no mostraba la ruta concreta, por lo que no permite atribuir con certeza el fallo a uno de esos casos.

## Recuperar el desarrollo existente

Desde tu carpeta del proyecto en Windows:

```powershell
cd D:\projects\voz
py -3.12 scripts\configurar.py --dev
```

Este comando ya existe en la entrega anterior: prepara .venv y dependencias antes de abrir el escritorio. No borra modelos ni dictados. Si tu proyecto está en otra carpeta, utiliza esa ruta.

## Corrección permanente 0.3.2

1. `npm run desktop` comprueba el Python local antes de abrir Tauri. Si falta .venv, busca Python 3.12, crea el entorno e instala los paquetes necesarios. Si encuentra una carpeta .venv incompleta, la conserva con un nombre de respaldo antes de crear otra.
2. Un entorno sano no se reinstala en cada arranque. La comprobación importa paquetes sin descargar modelos ni iniciar el servidor.
3. `npm run desktop:build -- --bundles nsis` prepara y empaqueta el motor automáticamente antes de generar el instalador. Los argumentos se envían al comando Tauri correcto.
4. Después de compilar, se copia el runtime a `src-tauri/target/release/engine`. Para abrir el EXE de release directamente, debe conservarse esa carpeta a su lado. Para distribuir, usa preferentemente el instalador completo de bundle/.
5. El lanzador comprueba las rutas antes de iniciar, acepta el nombre de motor heredado si existe y registra la ruta concreta en Diagnóstico del motor. Un binario de desarrollo cuyo proyecto se movió puede detectar un directorio de proyecto válido desde la ubicación de trabajo.

No se instala Python en segundo plano desde una aplicación pública empaquetada. La preparación automática corresponde al código de desarrollo; el instalador final debe incluir su runtime.

## Actualizar desde el ZIP

Cierra la aplicación, detén su terminal con Ctrl+C y descarga gosu-speech-to-text-v0.3.2-source.zip en Downloads:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\gosu-speech-to-text-v0.3.2-source.zip'
$update = Join-Path $env:TEMP ('gosu-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'La actualización falló.' }
Set-Location 'D:\projects\voz'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci.' }
npm.cmd run desktop
```

Se conservan el identificador de aplicación, el historial, los modelos y las preferencias. El actualizador respalda el código anterior.

Si usabas un instalador o un EXE de release, genera de nuevo su paquete completo con `py -3.12 scripts\configurar.py --build`; actualizar los fuentes no modifica por sí solo un ejecutable ya instalado. Evita copiar únicamente el EXE de target/release sin su carpeta engine.

## Verificación

Pruebas de preparación de .venv, conservación de entorno incompleto, instalación de paquetes, paso de argumentos al empaquetador y rutas del motor. Comprobación Rust para Windows GNU; no equivale a ejecutar un instalador MSVC en el equipo del usuario. Si persiste el fallo, el nuevo diagnóstico indicará las rutas comprobadas.
