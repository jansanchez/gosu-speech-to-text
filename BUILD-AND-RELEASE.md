# Compilación y distribución

Esta es la guía central del código actual de GOSU Speech to Text. [README.md](README.md) ofrece el inicio rápido; [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) define las condiciones de aceptación. Los informes anteriores de [VALIDACION.md](VALIDACION.md) no certifican un binario nuevo.

## Regla de plataforma y arquitectura

**El ejecutable Tauri, el intérprete que empaqueta PyInstaller y sus bibliotecas nativas deben pertenecer al mismo SO y arquitectura.** Genera Windows en Windows x64/MSVC, Linux x64 en Linux x64, macOS ARM64 en ARM64 y macOS Intel en x64. No copies `engine-dist/`, `.venv/` ni `node_modules/` desde otro equipo.

Cambiar solo `--target` en Tauri no convierte el motor Python de la máquina de compilación al destino. El flujo documentado no produce Windows ARM64, Linux ARM64 ni un paquete macOS universal. Añadir esos destinos requiere su propio entorno, dependencias y evidencia; una comprobación cruzada de tipos no equivale a un instalador funcional.

## Herramientas comunes

| Herramienta | Referencia del proyecto | Comprobación |
|---|---|---|
| Node/npm | Node 22.x actualizado, como CI | `node --version`, `npm --version` |
| Python | CPython 3.12, arquitectura nativa | `python3.12 --version` o `py -3.12 --version` |
| Rust | Toolchain estable del host | `rustc -Vv`, `cargo --version` |
| Formato Rust | Componente rustfmt | `rustup component add rustfmt` |
| Fuente y dependencias | Checkout completo, `package-lock.json` y `src-tauri/Cargo.lock` | `npm ci`, Cargo con `--locked` |

Las dependencias nativas y los comandos para instalarlas están en [Linux](LINUX-MAKE.md), [Windows](INSTALAR-WINDOWS.md) y [macOS](INSTALAR-MACOS.md). Las bibliotecas base siguen los [requisitos oficiales de Tauri](https://v2.tauri.app/start/prerequisites/); este proyecto añade Python, D-Bus de desarrollo en Linux y las herramientas de empaquetado indicadas en esas guías.

La primera preparación necesita red para dependencias. El primer uso del reconocedor puede descargar el modelo. Preparar `.venv` no debe descargar pesos ni grabar audio.

## Preparación y desarrollo

Desde la raíz del repositorio, con las herramientas de sistema instaladas:

| Sistema | Preparar y comprobar | Preparar, comprobar y abrir |
|---|---|---|
| Linux con Make | `make setup` y `make check` | `make dev` después de la preparación |
| Windows PowerShell | `py -3.12 scripts/configurar.py` | `py -3.12 scripts/configurar.py --dev` |
| macOS | `python3.12 scripts/configurar.py` | `python3.12 scripts/configurar.py --dev` |

El asistente Python crea `.venv` si falta, comprueba su versión, instala `server/requirements-build.txt`, ejecuta `npm ci` y las comprobaciones comunes. Si algo falla, termina antes de abrir la aplicación o empaquetarla. No instala herramientas de sistema ni elimina un entorno existente de otra versión.

Para abrir de nuevo un entorno preparado:

```bash
npm run desktop
```

En PowerShell usa `npm.cmd run desktop`. El motor se conecta automáticamente; no se necesita iniciar otro servidor ni copiar una clave. `npm run dev` es solo el frontend web y no proporciona los atajos globales del escritorio.

## Comprobaciones individuales

Si instalas las dependencias sin el asistente:

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r server/requirements-build.txt
npm ci
npm run check
.venv/bin/python scripts/test-python.py
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path src-tauri/Cargo.toml
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

En Windows:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server/requirements-build.txt
npm.cmd ci
npm.cmd run check
.\.venv\Scripts\python.exe scripts/test-python.py
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path src-tauri/Cargo.toml
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

Detén la secuencia si un comando devuelve un código distinto de cero. PowerShell no detiene por sí solo toda una lista de programas externos: usa el asistente para ejecutar y propagar los fallos de la secuencia completa.

`npm run check` valida enlaces locales de Markdown, formato, pruebas TypeScript y builds de web y extensión. El runner Python ejecuta las suites de API y herramientas con un plazo por suite. Algunas pruebas son específicas de Linux y la prueba gráfica requiere activación explícita en un campo aislado; esos saltos previstos se documentan en los criterios de éxito.

## Generar instaladores

Cierra la aplicación de desarrollo antes de empaquetar. Cada comando del asistente prepara y verifica el proyecto antes del build:

| Destino | Comando | Salida relativa a `src-tauri/target/release/bundle/` |
|---|---|---|
| Windows x64/MSVC | `py -3.12 scripts/configurar.py --build` | `nsis/*.exe` |
| Linux x64 AppImage | `make appimage` | `appimage/*.AppImage` |
| Linux x64 DEB | `make deb` | `deb/*.deb` |
| Linux x64 ambos | `make bundle` | `appimage/` y `deb/` |
| macOS ARM64, host ARM64 | `python3.12 scripts/configurar.py --build` | `macos/*.app` y `dmg/*.dmg` |
| macOS Intel, host x64 | `python3.12 scripts/configurar.py --build` | `macos/*.app` y `dmg/*.dmg` |

En un entorno ya comprobado, la ruta de bajo nivel es:

```bash
# Escoge SOLO el comando de tu sistema:
npm run desktop:build -- --bundles nsis -- --locked
npm run desktop:build -- --bundles deb,appimage -- --locked
npm run desktop:build -- --bundles app,dmg -- --locked
```

Usa `npm.cmd` en PowerShell. `-- --locked` después de los argumentos de Tauri se transmite a Cargo; no es una opción de PyInstaller. Las recetas anteriores y el asistente conservan los lockfiles; las actualizaciones de dependencias son cambios separados y revisables.

`desktop:build` prepara y empaqueta automáticamente el motor, ejecuta Tauri con `tauri.release.conf.json` y coloca además el runtime junto al binario de release. No hace falta ejecutar `build-engine.py` antes del build completo. Para desarrollo aislado del motor sí puedes ejecutar `.venv/bin/python scripts/build-engine.py`.

El recurso incluido es la carpeta completa `engine-dist/gosu-engine/`, no solo su ejecutable. No distribuyas únicamente `target/release/gosu-speech-to-text` o `.exe`. El instalador debe funcionar en un equipo sin Python/Node/Rust, con los componentes de sistema aplicables.

## Motor empaquetado y hashes

Después del build, comprueba el runtime empaquetado:

```bash
.venv/bin/python scripts/smoke-engine.py
python3 scripts/checksums.py
```

Windows:

```powershell
.\.venv\Scripts\python.exe scripts/smoke-engine.py
py -3.12 scripts/checksums.py
```

La prueba del motor utiliza `tiny` por defecto; puede descargarlo. Puedes pasar una ruta de modelo Faster Whisper ya disponible como argumento. Comprueba `/health` y, en Unix, la desconexión de la entrada del padre; no prueba precisión de voz. En Windows realiza un cierre explícito del motor: la vigilancia de la terminación del padre se debe validar cerrando la aplicación instalada. Registra ambos resultados por separado.

`SHA256SUMS.txt` queda en la raíz de `bundle/` e incluye los instaladores encontrados. El asistente y las tareas Make generan los hashes; la ruta npm de bajo nivel requiere invocar `checksums.py`. Si se usa un directorio de salida de Cargo distinto, pásale la ruta de `bundle/` al script. Una firma posterior cambia los bytes: calcula los hashes del artefacto final después de firmar.

## Extensión

```bash
npm ci
npm run check
python3 scripts/package-extension.py
```

En Windows utiliza `npm.cmd` y `py -3.12` para comprimir. El resultado es `gosu-speech-to-text-chrome.zip`, con `manifest.json` en la raíz y runtime WASM en el paquete. [La guía de uso](GUIA-0.3.md) describe la instalación descomprimida. Una build correcta no prueba por sí sola micrófono, caché o editores de Chrome.

## GitHub Actions

| Workflow | Disparador | Destinos y resultado |
|---|---|---|
| `Checks` — `.github/workflows/ci.yml` | Push de rama, pull request o manual | Comprobaciones en Windows x64, Ubuntu x64, macOS ARM64 y macOS Intel |
| `GOSU Speech to Text release candidates` — `.github/workflows/release.yml` | Manual o etiqueta `v*` | Instaladores por destino, hashes y ZIP Chrome; sin publicación automática |

La matriz usa `windows-2022`, `ubuntu-22.04`, `macos-15` ARM64 y `macos-15-intel`. Son las imágenes configuradas, no una lista de todos los sistemas finales compatibles. Los [runners oficiales de GitHub](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) pueden cambiar: comprueba su disponibilidad al actualizar la matriz y conserva el SO/arquitectura explícitos.

Para generar candidatos, sube el código mediante el flujo de revisión del repositorio y ejecuta el workflow manual. Una etiqueta de versión también lo dispara; no recrees ni sobrescribas una etiqueta publicada. `brand.json`, los metadatos sincronizados y la etiqueta deben representar la misma versión.

Artefactos esperados: `gosu-speech-to-text-windows-x64`, `gosu-speech-to-text-linux-x64`, `gosu-speech-to-text-macos-arm64`, `gosu-speech-to-text-macos-x64` y `gosu-speech-to-text-chrome`. Revisa todos los trabajos y descarga los paquetes del mismo commit. No combines un instalador de una ejecución con el motor de otra.

## Aprobar una entrega

Antes de marcar una plataforma como validada o un paquete como estable:

1. Cumple los [criterios de compilación, funcionamiento y datos](CRITERIOS-DE-EXITO.md) para el artefacto concreto.
2. Instala y prueba desde el instalador en un entorno de destino sin toolchains, además de probar desde fuente.
3. Verifica micrófono, atajo inicial y configurable, modo mínimo, foco, terminal y navegador, errores y conservación de datos.
4. Conserva commit, herramientas, arquitectura, logs, artefactos y hashes. Registra pendientes o fallos en `VALIDACION.md`.
5. Revisa licencias y dependencias. Para distribución firmada, configura y verifica [firma Windows](https://v2.tauri.app/distribute/sign/windows/) o [firma/notarización macOS](https://v2.tauri.app/distribute/sign/macos/), incluido el motor y sus bibliotecas. El workflow actual no las configura.

Publicar una release es una acción separada. Generar artefactos o editar esta documentación no los publica, no firma el producto y no convierte las plataformas pendientes en verificadas.
