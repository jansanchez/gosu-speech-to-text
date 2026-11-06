# GOSU Speech to Text

Dictado y transcripción local con editor completo y un modo mínimo para escribir con tu voz en otra aplicación. **Versión del código: 0.3.2 · licencia MIT.**

## Dictado mínimo

Con GOSU abierto y el motor listo, **Ctrl+Shift+M** alterna editor/minimalista, **Ctrl+Shift+H** oculta o restaura la vista actual y **Ctrl+Shift+Espacio** inicia o termina el dictado (usa Cmd en macOS). Los tres son configurables por separado en Preferencias. Puedes cambiar de campo mientras hablas: el destino se selecciona al terminar. El panel permanece disponible para seguir dictando y deja libre un margen inferior. Al terminar, el dictado también queda en el portapapeles aunque falle el destino o el pegado; puedes pegar con Ctrl+Shift+V en la terminal. Ocultarlo no detiene la grabación. No se añaden pulsaciones de Enter. Consulta [el modo mínimo](MINIMAL-MODE.md).

El atajo está disponible desde el primer inicio si el sistema permite registrarlo. Se cambia pulsando la combinación mostrada en la ventana mínima o en **Preferencias → Atajo de dictado mínimo → Elegir combinación → Guardar atajo**. Se conserva al reiniciar; si una nueva combinación no está disponible, se recupera la anterior. [Uso, permisos y límites por escritorio](MINIMAL-MODE.md).

## Estado y plataformas

| Destino de compilación | Paquetes | Integración de dictado mínimo |
|---|---|---|
| Windows x64, toolchain MSVC | Instalador NSIS `.exe` | Ventana/proceso y teclado Win32 |
| Linux x64, base Ubuntu 22.04 | `.deb` y `.AppImage` | X11; Hyprland; portales compatibles en GNOME/KDE Wayland |
| macOS Apple Silicon, compilación nativa ARM64 | `.app` y `.dmg` | Automatización del sistema con sus permisos |
| macOS Intel, compilación nativa x64 | `.app` y `.dmg` | Misma interfaz, binario y motor propios de Intel |
| Chrome, independiente del escritorio | ZIP de extensión | Inferencia WASM e inserción en campos compatibles |

El modo mínimo se ha comprobado en Linux/Hyprland. Los adaptadores de los demás sistemas están implementados y tienen trabajos de CI; su validación funcional en equipos reales sigue pendiente. Ubuntu puede usar Xorg o Wayland: las capacidades dependen de la sesión, los portales y los permisos. [Evidencia actual e histórica](VALIDACION.md) · [Funciones y pendientes](FEATURES.md).

## Compilar desde código

Ejecuta los comandos desde la carpeta que contiene `package.json`. Requisitos comunes: **Node 22.x actualizado con npm, Python 3.12 y Rust estable con rustfmt**, además de las herramientas nativas de tu sistema. No copies `.venv`, `node_modules` ni motores compilados entre sistemas o arquitecturas.

### Linux

Instala primero las [dependencias de Ubuntu/Debian o Arch/CachyOS](LINUX-MAKE.md).

```bash
make doctor
make setup
make check
make dev
```

Después de cerrar el desarrollo, genera el paquete que necesites:

```bash
make appimage
# O bien:
make deb
# O ambos:
make bundle
```

`make install` instala el AppImage en tu usuario y crea el comando `gosu-speech-to-text`. `make help` muestra las opciones. Para distribución, la referencia de build Linux es Ubuntu 22.04; un paquete generado en una rolling release no garantiza compatibilidad con sistemas más antiguos.

### Windows x64 — PowerShell

Instala [MSVC/C++ Build Tools, Windows SDK y WebView2](INSTALAR-WINDOWS.md), además de las herramientas comunes.

```powershell
py -3.12 scripts/configurar.py --dev
```

Para generar el instalador, tras cerrar la aplicación de desarrollo:

```powershell
py -3.12 scripts/configurar.py --build
```

El asistente prepara las dependencias, ejecuta las comprobaciones y genera `src-tauri\target\release\bundle\nsis\*.exe`. En arranques posteriores basta `npm.cmd run desktop`.

### macOS — Apple Silicon o Intel

Prepara [Xcode Command Line Tools y las herramientas de tu arquitectura](INSTALAR-MACOS.md).

```bash
python3.12 scripts/configurar.py --dev
```

Para generar `.app` y `.dmg`, tras cerrar el desarrollo:

```bash
python3.12 scripts/configurar.py --build
```

Los resultados quedan en `src-tauri/target/release/bundle/`. Compila ARM64 en un entorno ARM64 e Intel en un entorno x64. No se genera una aplicación universal mezclando motores de ambas arquitecturas.

### Extensión Chrome

```bash
npm ci
npm run extension:build
python3 scripts/package-extension.py
```

En Windows, sustituye el último comando por `py -3.12 scripts/package-extension.py`. Carga `extension-dist/` desde `chrome://extensions` en modo desarrollador o utiliza el ZIP generado `gosu-speech-to-text-chrome.zip`. La copia compilada no se mantiene en Git; debe generarse o descargarse de una ejecución de CI.

## Distribución y pruebas

[BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) es la guía central de preparación, comprobación, empaquetado y artefactos. [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) define cuándo un cambio, un instalador y una plataforma pueden darse por aprobados.

- `npm run check`: enlaces locales de documentación, formato, pruebas TypeScript, build web y extensión.
- `make check`: lo anterior, suites Python, formato y comprobaciones/pruebas Rust, con el entorno preparado.
- Windows/macOS: el asistente `scripts/configurar.py` ejecuta el mismo conjunto de comprobaciones antes de abrir o empaquetar; la guía central incluye los comandos individuales.
- `.github/workflows/ci.yml`: comprobaciones de cada push/PR en los cuatro destinos de escritorio.
- `.github/workflows/release.yml`: candidatos de instalador y extensión por ejecución manual o etiqueta `v*`. Genera artefactos; no publica ni firma automáticamente.

Los paquetes de escritorio deben incluir el motor Python. Sus usuarios no instalan Node, Python ni Rust, pero sí necesitan los componentes de sistema aplicables. Los pesos de Whisper se descargan al preparar el modelo y se reutilizan después. Ollama es opcional y no se incluye en el instalador básico.

## Documentación del proyecto

| Documento | Uso |
|---|---|
| [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md) | Avance guardado, commit publicado, evidencia y pendientes para retomar |
| [MINIMAL-MODE.md](MINIMAL-MODE.md) | Tres atajos, foco, portapapeles y límites por sistema |
| [VALIDACION.md](VALIDACION.md) | Historial de pruebas y alcance real por plataforma |
| [AGENTS.md](AGENTS.md) | Reglas de trabajo para Codex y otros agentes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Desarrollo, comprobaciones y mantenimiento |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Responsabilidades e invariantes de datos/audio |
| [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) | Aceptación y registro de evidencia por plataforma |
| [GUIA-0.3.md](GUIA-0.3.md) | Uso del editor, herramientas y modelos opcionales |
| [ACTUALIZAR-GOSU.md](ACTUALIZAR-GOSU.md) | Actualización de una instalación anterior |
| [REPARAR-MOTOR.md](REPARAR-MOTOR.md) | Diagnóstico de arranque |
| [NOMBRES.md](NOMBRES.md) | Identidad y compatibilidad de datos |
| [PRIVACY.md](PRIVACY.md) / [THIRD-PARTY.md](THIRD-PARTY.md) | Datos, dependencias y licencias |

`brand.json` es la fuente del nombre y versión. Usa `npm run brand:sync` al cambiarla y `npm run brand:check` para verificar sus metadatos. Se conserva el identificador `org.voz.prototype` y las claves heredadas de almacenamiento para mantener los datos existentes.

## Versiones

La versión se mantiene en `brand.json` siguiendo SemVer. Consulta el [historial de cambios](CHANGELOG.md) y el [procedimiento de versiones y releases](BUILD-AND-RELEASE.md). Las etiquetas `vX.Y.Z` identifican código; la validación de instaladores se registra por separado.

Para publicar una versión aprobada: en **Actions → GOSU Speech to Text release candidates → Run workflow**, elige `main`, marca `publish` e introduce la versión exacta de `brand.json`. El workflow comprueba y compila todos los destinos, crea la etiqueta anotada y publica paquetes y hashes automáticamente. Sin marcar `publish`, solo genera candidatos. Consulta los requisitos y la recuperación de fallos en [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md).
