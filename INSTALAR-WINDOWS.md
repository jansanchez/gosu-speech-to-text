# Compilar y probar en Windows

Destino documentado: Windows x64 con Rust **MSVC**, instalador NSIS. Consulta [compilación y distribución](BUILD-AND-RELEASE.md) y [criterios de éxito](CRITERIOS-DE-EXITO.md).

## Requisitos

1. Node.js **22** con npm y Python **3.12** con el lanzador `py`.
2. Visual Studio Build Tools: carga **Desarrollo para el escritorio con C++**, compilador MSVC x64 y Windows SDK.
3. Rust estable instalado mediante rustup, toolchain `stable-x86_64-pc-windows-msvc`, y componente rustfmt.
4. Runtime Microsoft Edge WebView2. Consulta los [requisitos oficiales de Tauri](https://v2.tauri.app/start/prerequisites/).

Abre una nueva PowerShell después de instalar. Desde la raíz del proyecto, en una carpeta escribible:

```powershell
node --version
npm.cmd --version
py -3.12 --version
rustup show active-toolchain
rustup component add rustfmt
py -3.12 scripts/configurar.py
```

El asistente crea `.venv`, instala dependencias y ejecuta las comprobaciones web, Python y Rust. No necesita activar el entorno. Un entorno existente con otro Python se rechaza sin borrarlo: renómbralo y vuelve a preparar. No copies `.venv`, `node_modules`, `target` o `engine-dist` de Linux/macOS.

## Ejecutar y generar instalador

```powershell
py -3.12 scripts/configurar.py --dev
py -3.12 scripts/configurar.py --build
```

Ejecuta los comandos por separado; el modo desarrollo permanece abierto. El instalador queda en `src-tauri\target\release\bundle\nsis\`; los hashes, en `bundle\SHA256SUMS.txt`. El paquete incluye el motor Python completo. La primera descarga del modelo necesita red y espacio; comprueba su estado en la interfaz.

**Ctrl+Shift+M** alterna editor/minimalista y **Ctrl+Shift+H** oculta/restaura conservando la vista. Los tres atajos son configurables por separado en Preferencias. Con el motor listo, enfoca el campo de destino y usa **Ctrl+Shift+Espacio** para iniciar y detener. El panel muestra la actividad del micrófono y permite cambiar el atajo. Verifica terminal, WhatsApp y Google Docs, permisos de micrófono y cierre del motor tras salir. El texto no debe enviarse automáticamente con Enter. [Funcionamiento y límites](MINIMAL-MODE.md).

## Diagnóstico

- Si falta `link.exe` o un SDK, revisa la carga C++ y abre una terminal nueva. Una comprobación GNU desde Linux no valida esta compilación MSVC.
- Si PowerShell bloquea `npm.ps1`, utiliza `npm.cmd`; no es necesario cambiar la política global.
- Si falta micrófono, revisa los permisos de Windows para aplicaciones de escritorio y el dispositivo seleccionado.
- Si un atajo está ocupado, elige otro en Preferencias; no desregistres combinaciones de otras aplicaciones.
- `scripts/diagnostico-windows.ps1` ayuda a inspeccionar el entorno. Las guías [CORREGIR-WINDOWS.md](CORREGIR-WINDOWS.md) y [REPARAR-MOTOR.md](REPARAR-MOTOR.md) conservan diagnósticos históricos.

El workflow genera candidatos sin configurar firma de Windows. La instalación en un usuario limpio y la validación de dictado siguen siendo necesarias. Registra evidencia en [VALIDACION.md](VALIDACION.md).
