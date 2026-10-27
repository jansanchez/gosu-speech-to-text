> Documento histórico de la actualización 0.2.1. La guía vigente es GUIA-0.3.md; el parche posterior de arranque está incorporado en 0.3.

# Actualización 0.2.1: comunicación del motor en Windows

La captura recibida muestra audio pendiente y el mensaje Preparando motor. La prueba independiente confirma que Faster Whisper y el modelo base cargan en el equipo del usuario. Eso sitúa el problema después de la captura y antes de completar la transcripción; todavía no identifica por sí solo la causa exacta de la conexión fallida.

Esta actualización pasa salud y transcripción a comandos Rust que se conectan a loopback sin usar proxies del sistema. El WebView ya no necesita acceder por HTTP al servicio Python. La clave se añade a la petición desde Rust. El modo web de desarrollo conserva su transporte HTTP.

También añade estado persistente del motor, diagnóstico visible y copiable, registro de las primeras etapas de arranque y comprobación del motor antes de grabar. Detener la grabación ya no borra el error de la cola. La comprobación automática sigue activa para detectar caídas.

## Aplicar al proyecto existente

Cierra la ventana de GOSU Speech to Text y detén `npm run desktop` con Ctrl+C. Descarga voz-source-v0.2.1.zip en Downloads. Después, PowerShell:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\voz-source-v0.2.1.zip'
$update = Join-Path $env:TEMP ('voz-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'La actualizacion fallo; revisa el mensaje anterior.' }
Set-Location 'D:\projects\voz'
npm.cmd run desktop
```

El actualizador respalda los archivos que reemplaza dentro de .voz-backups. Conserva el identificador de aplicación, esquema de datos, .venv y bibliotecas instaladas. Cargo descargará la nueva dependencia HTTP y recompilará el puente Rust; no necesitas reinstalar las herramientas. Para generar un instalador después, vuelve a ejecutar build-engine.py y desktop:build según BUILD-AND-RELEASE.md.

## Comprobar el resultado

1. La insignia debe indicar 0.2.1.
2. Espera a Motor listo · base. Si dice Motor sin conexión, abre Diagnóstico del motor y pulsa Actualizar diagnóstico y Copiar diagnóstico. Ese texto sí permite revisar en qué fase se detuvo el proceso.
3. Si hay fragmentos anteriores, pulsa Reintentar para intentar transcribirlos antes de grabar más. No pulses Eliminar audios si quieres conservarlos.
4. Dicta una frase y haz una pausa. El texto debe aparecer después de la transcripción del tramo.

No se ha ejecutado la nueva compilación Rust en este entorno, que no dispone de Cargo ni Windows. Se aprobaron 9 pruebas Node (incluye UI nativa con IPC simulado y prohibición de fetch hacia el motor), 6 pruebas API, compilación TypeScript/Vite y comprobación real del arranque Python, /health y cierre del proceso en Linux. Esto verifica la lógica y el servicio, pero la corrección del fallo en el equipo Windows requiere probar esta actualización.
