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

En Linux, este coordinador añade las carpetas de bibliotecas del motor a `LD_LIBRARY_PATH` únicamente para el proceso de compilación. Esto permite que linuxdeploy encuentre las dependencias privadas de los wheels de Python, como `av.libs/libswresample-*.so.*`. Si aparece `Could not find dependency: libswresample-…`, utiliza `make appimage` o `npm run desktop:build` con el código actualizado; invocar `tauri build` directamente omite esta preparación. Conserva los nombres originales de esas bibliotecas.

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
| `GOSU Speech to Text release candidates` — `.github/workflows/release.yml` | Manual o etiqueta `v*` | Candidatos por etiqueta/manual; etiqueta y publicación automáticas tras aprobación manual explícita |

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

La publicación requiere la aprobación explícita descrita a continuación. Generar candidatos o editar documentación no publica ni firma el producto, y no convierte las plataformas pendientes en verificadas.

## Política de versiones y etiquetas

GOSU adopta [SemVer 2.0.0](https://semver.org/lang/es/), con `brand.json` como fuente de versión. El contrato de compatibilidad incluye preferencias y respaldos, recuperación de audio, comandos documentados e integración del motor. Mientras se mantenga `0.x`, el producto está en desarrollo inicial; una versión numerada no declara todas las plataformas validadas.

- Correcciones compatibles: incrementar PARCHE, por ejemplo `0.4.0` → `0.4.1`.
- Funcionalidades compatibles: incrementar MENOR y reiniciar PARCHE, por ejemplo `0.4.1` → `0.5.0`.
- Durante `0.x`, cambios incompatibles requieren una nueva MENOR, migración probada y nota explícita. La decisión de `1.0.0` requiere declarar estable el contrato y cumplir la aceptación para los destinos anunciados. A partir de 1.0, los cambios incompatibles incrementan MAYOR.
- Documentación o refactorización sin cambio de comportamiento pueden acumularse sin incrementar versión. Una versión agrupa commits; no se etiqueta cada funcionalidad individual.

La versión vigente se consulta en `brand.json`. Se emplea el subconjunto numérico `X.Y.Z` común a los manifiestos Tauri, Cargo, npm y Chrome; las etiquetas son `vX.Y.Z`. Los candidatos de CI conservan esa versión y se identifican por commit y ejecución, sin añadir sufijos que Chrome no admite en su campo `version`. No se sobrescribe una etiqueta, versión publicada ni artefacto entregado: cualquier cambio posterior necesita otra versión.

Procedimiento para la próxima versión:

1. Revisar los cambios desde la última etiqueta y elegir el incremento. Editar `brand.json` y añadir la entrada fechada en [CHANGELOG.md](CHANGELOG.md), incluyendo límites y migraciones.
2. Ejecutar `npm run brand:sync`, que sincroniza manifiestos, `package-lock.json` y la entrada de la aplicación en `Cargo.lock`, sin actualizar dependencias.
3. Ejecutar `make check` en Linux o las comprobaciones individuales de esta guía en el SO correspondiente. `npm run release:check` comprueba marca, entrada de changelog y coincidencia con la etiqueta si se ejecuta sobre una etiqueta en GitHub Actions.
4. Revisar `git diff`, guardar el commit de versión con árbol limpio y subirlo a main. No crear la etiqueta manualmente cuando se use la publicación automatizada.
5. Generar candidatos ejecutando el workflow manual sin marcar `publish`. Descargar y validar los artefactos del mismo commit, registrar hashes y resultados por plataforma. Si el código cambia después, volver a comprobarlo.
6. Aprobar la publicación desde Actions para ese commit/versión siguiendo el procedimiento siguiente. El workflow comprueba, reconstruye, crea la etiqueta y publica automáticamente; no requiere push manual de etiqueta.

Los commits pueden usar `feat:`, `fix:`, `docs:` y `chore:` para facilitar la revisión. Estos prefijos ayudan a decidir el incremento; no crean versiones automáticamente.


## Publicación automatizada con aprobación en Actions

Configuración del repositorio: permitir GitHub Actions y el permiso `contents: write` solicitado únicamente por el job `publish`. Se utiliza el `GITHUB_TOKEN` del propio workflow; no hace falta un PAT. Si la organización limita esos permisos, el job fallará y deberá revisarse la política del repositorio, sin sortearla.

1. Con la funcionalidad probada y aprobada, preparar la nueva versión SemVer en `brand.json`, sincronizar y guardar el changelog y la evidencia. Subir el commit a `main`.
2. En **Actions → GOSU Speech to Text release candidates → Run workflow**, elegir **main**. Para candidatos, dejar `publish` desmarcado. Para publicar, marcar **publish** e introducir la versión exacta, por ejemplo `0.5.0`. Esa marca es la aprobación explícita de los criterios de aceptación para esta entrega; no se infiere de que las pruebas simuladas pasen.
3. El workflow fija el commit al iniciarse; cambios posteriores en main no alteran la versión aprobada. Ejecuta todas las comprobaciones y construye Windows x64, Linux x64, macOS ARM64/Intel y Chrome. Si un job falla, no se ejecuta la publicación.
4. Verifica los hashes de los instaladores descargados de esta misma ejecución. Copia solo EXE, DEB, AppImage, DMG ARM64, DMG Intel y ZIP Chrome, con prefijos por plataforma, y genera un manifiesto SHA256 común. No sube carpetas AppDir, runtimes sueltos ni ZIP internos de Python.
5. Crea `vX.Y.Z` anotada en ese commit y un borrador de release, sube los seis paquetes y `SHA256SUMS.txt`, y hace pública la release al terminar la subida. Las notas proceden únicamente de la entrada de esa versión en `CHANGELOG.md`.

No se sobrescriben versiones: una etiqueta existente solo se acepta si es anotada y apunta al commit exacto aprobado. Cualquier release existente, incluso borrador, detiene la publicación. Si la subida se interrumpe, la etiqueta o un borrador pueden quedar creados: revisar ese estado y los archivos en GitHub antes de recuperar la entrega; nunca mover etiquetas ni reemplazar una release publicada. Se puede reintentar si solo quedó la etiqueta en el mismo commit y no existe release.

La etiqueta creada con `GITHUB_TOKEN` no dispara otro build: la publicación usa los paquetes ya construidos en la misma ejecución. No depende de que un push del bot active otro workflow. No se configuran firmas ni notarización; su ausencia debe constar en las notas y en la aceptación de la distribución.

Mientras los paquetes de todas las plataformas no estén aprobados para distribuir, utilizar candidatos sin `publish`. Activar el workflow no constituye evidencia de instalación ni aprobación de plataformas pendientes.
