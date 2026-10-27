> Guía vigente de uso/actualización: **GUIA-0.3.md**. Matriz real: **FEATURES.md**. Los comandos de herramientas y builds de este documento siguen aplicando. Los adaptadores X11/macOS y editor opcional se describen en la guía vigente.

# Código fuente, compilación y distribución · GOSU Speech to Text 0.3.2

Esta entrega contiene todo el código fuente del estado actual de GOSU Speech to Text, la extensión Chrome y un workflow de compilación. Es una versión de desarrollo: no implementa todavía todas las funciones del diseño de producto. No es un instalador universal ya probado.

## Qué contiene

- `src/`: interfaz React/TypeScript, captura por tramos, historial y reglas de edición.
- `src-tauri/`: aplicación nativa, atajos, portapapeles y arranque automático del motor.
- `server/`: motor local Faster Whisper y punto de entrada para empaquetarlo.
- `extension/`: extensión independiente Chrome Manifest V3, inferencia local con Transformers.js.
- `scripts/build-engine.py`: convierte el motor Python en una carpeta ejecutable autónoma.
- `scripts/build-extension.mjs`: compila la extensión y copia el runtime WASM local.
- `.github/workflows/release.yml`: compila candidatos Windows, Linux, macOS ARM64 e Intel y extensión.
- `tests/`, `server/test_app.py`: pruebas automatizadas.

El usuario que descarga un instalador de escritorio no necesita Python, Node ni Rust: el motor se incluye como recurso. En el primer inicio se descargan los pesos del modelo; la aplicación muestra que está preparándolo. No requiere clave de API ni una cuenta. Los modelos no están incluidos en este ZIP.

## Matriz real de esta versión

| Función | Windows x64 | Linux x64 | macOS ARM64 / Intel | Chrome |
|---|---|---|---|---|
| Dictado local e historial | Código incluido | Código incluido | Código incluido | Código incluido, historial propio |
| Motor inicia sin terminal ni clave | Código incluido | Código incluido | Código incluido | Motor dentro del navegador |
| Copiar | Implementado | Mantiene el dueño del portapapeles | Implementado | Implementado |
| Atajo global | Implementado | Depende de X11; Wayland pendiente | Requiere prueba y permisos | Solo controles de la extensión |
| Pegado externo automático | Adaptador Windows | Adaptador X11; Wayland manual | Adaptador macOS con permisos | Campos compatibles |
| Edición libre con LLM | Ollama local opcional | Ollama local opcional | Ollama local opcional | Pendiente |

La edición actual admite órdenes concretas y propuestas libres opcionales. Hay reemplazos personales por confirmación. Consulta FEATURES.md para diferencias reales entre plataformas y capacidades pendientes.

## Regla de compilación

Compila cada instalador en su propio sistema y arquitectura, porque el motor contiene bibliotecas nativas. Un motor compilado en Linux no sirve dentro del instalador Windows o Mac. El workflow ya separa esos trabajos.

## Windows x64

Requisitos de desarrollo: Node LTS (22 o posterior compatible), Python 3.12 x64, Rust estable MSVC, C++ Build Tools con Desktop development with C++, Windows SDK y WebView2. Para la instalación detallada de esas herramientas consulta INSTALAR-WINDOWS.md. La parte de arranque manual del motor en esa guía corresponde a versiones anteriores; desde 0.2 Tauri lo inicia.

Desde la raíz del proyecto, PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server\requirements-build.txt
npm.cmd ci
npm.cmd test
.\.venv\Scripts\python.exe -m unittest server.test_app -v
# Desarrollo nativo: motor y aplicación arrancan juntos.
npm.cmd run desktop
```

Cierra la aplicación antes de compilar el instalador:

```powershell
.\.venv\Scripts\python.exe scripts\build-engine.py
npm.cmd run desktop:build -- --bundles nsis
```

Resultado: `src-tauri\target\release\bundle\nsis\*.exe`.

Desde 0.3.2, desktop:build empaqueta el motor automáticamente antes de ejecutar Tauri; el comando manual anterior sigue disponible para probarlo por separado. No se necesita activar el venv si se utiliza su ruta explícita.

## Linux Arch / derivadas (x64)

Instala las dependencias de compilación y runtime de tu distribución:

```bash
sudo pacman -Syu
sudo pacman -S --needed base-devel curl openssl webkit2gtk-4.1 libappindicator-gtk3 librsvg patchelf nodejs npm
```

Instala Rust con el instalador oficial (descárgalo y revisa el script antes de ejecutarlo):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o rustup-init.sh
sh rustup-init.sh -y --profile minimal
. "$HOME/.cargo/env"
rustc --version
cargo --version
```

Instala Python 3.12 mediante tu gestor de entornos. Arch puede tener una versión Python más reciente que la probada; usar un entorno 3.12 ayuda a reproducir el build. Una opción es `uv`, disponible en Arch:

```bash
sudo pacman -S --needed uv
uv python install 3.12
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r server/requirements-build.txt
npm ci
npm test
.venv/bin/python -m unittest server.test_app -v
npm run desktop
```

Para empaquetar:

```bash
.venv/bin/python scripts/build-engine.py
npm run desktop:build -- --bundles appimage
```

Resultado: `src-tauri/target/release/bundle/appimage/*.AppImage`.

**Para distribuir ampliamente, genera el AppImage en Ubuntu 22.04 mediante CI**, además de probarlo en Arch. Compilar en una distribución rolling puede introducir dependencias glibc más nuevas que las disponibles en otros equipos. AppImage no garantiza compatibilidad con toda distribución. La compilación Linux necesita una sesión gráfica para pruebas de micrófono/portapapeles; CI solo compila.

Wayland: esta entrega permite usar la ventana y el portapapeles cuando el compositor soporta el backend correspondiente, pero no promete atajos globales ni inyección de texto en cualquier aplicación. Usa los botones y pegado manual. No se instala un daemon privilegiado de inyección.

## Linux Ubuntu / Debian para build reproducible

En Ubuntu 22.04 instala Node 22 desde nodejs.org, Rust con los comandos anteriores y Python 3.12 mediante uv (`uv python install 3.12`; `uv venv --python 3.12 .venv`). Instala uv según https://docs.astral.sh/uv/getting-started/installation/. Si usas uv, sustituye el comando `python3.12 -m venv .venv` por esos dos comandos y pip por `uv pip install --python .venv/bin/python`. Después:

```bash
sudo apt-get update
sudo apt-get install -y build-essential curl libssl-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf libfuse2
python3.12 -m venv .venv
.venv/bin/python -m pip install -r server/requirements-build.txt
npm ci
.venv/bin/python scripts/build-engine.py
npm run desktop:build -- --bundles deb,appimage
```

Resultados: `src-tauri/target/release/bundle/deb/` y `appimage/`. Los nombres de paquetes pueden variar en otras versiones; usa la documentación oficial de Tauri si tu distribución no los encuentra.

## macOS Apple Silicon

1. Instala Xcode Command Line Tools: `xcode-select --install`.
2. Instala Node LTS, Python 3.12 y Rust con los comandos rustup de la sección Linux (también funcionan en macOS). Si utilizas Homebrew: `brew install node python@3.12`.
3. Abre Terminal de forma nativa ARM64, no bajo Rosetta. `uname -m` debe devolver `arm64`.

```bash
rustup default stable-aarch64-apple-darwin
python3.12 -m venv .venv
.venv/bin/python -m pip install -r server/requirements-build.txt
npm ci
npm test
npm run desktop
```

Para crear la aplicación y DMG:

```bash
.venv/bin/python scripts/build-engine.py
npm run desktop:build -- --bundles app,dmg
```

Resultados: `src-tauri/target/release/bundle/macos/` y `dmg/`.

Para Intel repite la compilación en Mac Intel, con Rust `stable-x86_64-apple-darwin`, Python y dependencias x64. No se genera una app universal combinando carpetas Python de arquitecturas diferentes.

El permiso de micrófono se solicita al usarlo. Los atajos deben comprobarse en macOS real. El adaptador de pegado macOS se describe en GUIA-0.3.md y requiere pruebas y permisos. Copiar y Cmd+V siguen disponibles.

## Extensión Chrome independiente

No necesita la aplicación de escritorio ni el motor Python.

Desde cualquier sistema con Node:

```bash
npm ci
npm run extension:build
```

1. Abre `chrome://extensions`.
2. Activa Modo desarrollador.
3. Pulsa Cargar descomprimida y elige **extension-dist**.
4. Abre una página normal y coloca el cursor en un input o textarea.
5. Pulsa el icono de GOSU Speech to Text y Abrir dictado local.
6. En la pestaña de GOSU Speech to Text pulsa Descargar / cargar modelo local; concede el micrófono al grabar.
7. Dicta, revisa y pulsa Copiar o Insertar en campo elegido.

La extensión descarga pesos del modelo `onnx-community/whisper-tiny`. JavaScript y WASM se empaquetan localmente, no se ejecuta código remoto. Los pesos se guardan en la caché del navegador. Un borrado de caché o presión de almacenamiento puede requerir descargarlos de nuevo. El audio se procesa localmente y no se envía a Hugging Face.

La inserción directa está limitada a campos input/textarea compatibles. No modifica contraseñas. Google Docs y editores complejos requieren copiar/pegar. Si el campo cambió o se recargó la página, no sobrescribe texto. Para volver a seleccionar el destino, abre GOSU Speech to Text desde el icono en esa pestaña.

Para subir a Chrome Web Store, comprime **el contenido** de extension-dist: manifest.json debe estar en la raíz del ZIP. El repositorio también contiene el código original editable. Necesitarás tu cuenta de desarrollador, textos de la ficha, capturas, política de privacidad y completar la revisión de la tienda. Esta entrega no publica en la tienda.

## GitHub: fuente, CI y release

Crea un repositorio vacío en tu cuenta. Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Initial GOSU Speech to Text source and build pipelines"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gosu-speech-to-text.git
git push -u origin main
```

No subas node_modules, .venv, engine-dist o binarios generados al árbol de código; .gitignore ya los excluye. Tampoco subas certificados, contraseñas ni claves.

En GitHub: Actions > Build release candidates > Run workflow. Alternativamente:

```bash
git tag v0.3.2
git push origin v0.3.2
```

El workflow construye Windows, Linux, Mac ARM64, Mac Intel y extensión de forma independiente. Descarga los artefactos de la ejecución. Si un trabajo falla, corrige primero su error: no basta que hayan pasado los otros sistemas.

Para publicar:
1. Prueba cada paquete en un equipo limpio del sistema/arquitectura correspondiente.
2. Ve a Releases > Draft a new release y elige el tag.
3. Adjunta el EXE, DMG por arquitectura, AppImage/DEB y ZIP de la extensión.
4. Añade notas con requisitos, compatibilidad y limitaciones reales. Marca **Pre-release** mientras sigan pendientes las pruebas de plataforma.
5. Publica cuando las pruebas hayan pasado.

GitHub ofrece automáticamente los archivos de código fuente del tag. Conserva también los logs de CI y registra hashes SHA-256 de los instaladores finales.

## Firma y experiencia de instalación pública

La compilación genera paquetes, pero por sí sola no los firma como un editor reconocido. Para distribución pública sin advertencias evitables:
- macOS: Developer ID y notarización de Apple; también debes firmar correctamente el motor y sus bibliotecas antes de distribuir. Sigue la guía de firma Tauri.
- Windows: certificado/servicio de firma de código; la reputación de SmartScreen no está garantizada únicamente por firmar.
- Chrome: revisión y publicación en la tienda; instalar desde código requiere modo desarrollador.

No se incluyen certificados ni se solicitan tus contraseñas. Añádelos como secretos del sistema de build cuando configures la publicación. El workflow actual produce artefactos sin configurar firma ni publicar automáticamente.

## Referencias oficiales

- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/distribute/sign/macos/
- https://v2.tauri.app/distribute/sign/windows/
- https://github.com/tauri-apps/tauri-action
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://pyinstaller.org/en/stable/usage.html
- https://huggingface.co/docs/transformers.js/custom_usage

## Estado de verificación

Consulta VALIDACION.md. Las compilaciones nativas de Tauri y los instaladores en los tres sistemas deben verificarse mediante CI y equipos reales; no se presentan como binarios ya probados. La extensión compila, pero su micrófono, inferencia WASM y permisos necesitan una prueba real de Chrome antes de publicarla.

## Comprobación del motor antes de empaquetar Tauri

Después de `build-engine.py`, ejecuta con el Python de tu entorno:

```bash
.venv/bin/python scripts/smoke-engine.py
```

En Windows ejecuta `.\.venv\Scripts\python.exe scripts\smoke-engine.py`. La prueba descarga/carga `tiny`, espera que el servidor responda y comprueba que se cierra al desconectarse la aplicación. No sustituye una prueba de dictado. Puedes pasar una ruta local a un modelo Faster Whisper como argumento. El diagnóstico queda en `engine-smoke.log`.

Para usar un modelo ya descargado en desarrollo, establece `GOSU_MODEL` a su carpeta antes de lanzar la aplicación; así no depende de descargarlo en el primer arranque. El modelo predeterminado del producto es `base`.
