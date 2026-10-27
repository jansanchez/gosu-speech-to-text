# GNU Make para Linux · GOSU Speech to Text 0.3.2

Esta revisión añade el Makefile que faltaba. La versión 0.3.2 adopta la marca aprobada y conserva los comandos de preparación, compilación e instalación desde Linux. Los dictados, preferencias y modelos de la versión anterior se conservan al actualizar el código.

## Arch Linux (tu sistema principal)

Instala las herramientas y bibliotecas nativas. `xdotool` se utiliza solo para pegado X11; en Wayland sigue disponible copiar/pegar manual.

```bash
sudo pacman -Syu --needed base-devel pkgconf curl openssl webkit2gtk-4.1 libappindicator-gtk3 librsvg patchelf nodejs npm uv fuse2 xdotool
```

Node 22 es la versión de referencia de esta entrega. Si la versión de Node de tu distribución da incompatibilidades, usa Node 22 mediante tu gestor de versiones. El Makefile no reemplaza globalmente Node ni el Python del sistema.

Si no tienes Rust/Cargo, instala Rust con el instalador oficial:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/gosu-rustup.sh
sh /tmp/gosu-rustup.sh -y --profile minimal
. "$HOME/.cargo/env"
```

Estos comandos de terminal están escritos para Bash/Zsh. En Fish, carga `source "$HOME/.cargo/env.fish"` al terminar la instalación.

Desde la carpeta `gosu-speech-to-text` del ZIP:

```bash
make doctor
make setup
make dev
```

En Arch, `make setup` usa Python 3.12 si ya existe. Si no existe y tienes uv, lo descarga y crea .venv con ese intérprete. El Python 3.14 u otra versión de tu sistema no se reemplaza. Si la .venv anterior usa otra versión, el script pide que la renombres como respaldo antes de crear otra; no la borra.

`make doctor` termina con error si falta una dependencia necesaria para el escritorio. Ejecutarlo antes de `make setup` puede señalar Python 3.12 como instalable mediante uv; una vez disponibles las herramientas, repite la comprobación.

## Actualizar el proyecto existente

Descomprime el nuevo ZIP en una carpeta aparte y ejecuta desde su carpeta `gosu-speech-to-text`:

```bash
python3 scripts/actualizar.py /ruta/al/proyecto/voz
cd /ruta/al/proyecto/voz
make setup
make dev
```

El actualizador copia también el Makefile y respalda el código anterior. No copies .venv ni node_modules de otro sistema. Para probar la nueva entrega aparte, puedes ejecutar make setup en la carpeta nueva sin actualizar el proyecto anterior.

## Compilar e instalar en tu usuario

```bash
make appimage
make install
```

`make appimage` ejecuta pruebas, empaqueta el motor y genera el AppImage de tu arquitectura. `make install` copia el paquete a `~/.local/lib/gosu-speech-to-text/GOSU-Speech-to-Text.AppImage`, crea `~/.local/bin/gosu-speech-to-text`, instala el icono y añade GOSU Speech to Text al menú de aplicaciones. Si aún no existe AppImage, inicia su compilación.

No ejecutes `sudo make install` para instalar en tu usuario. Puedes abrir la aplicación desde el menú o con:

```bash
~/.local/bin/gosu-speech-to-text
```

Si ~/.local/bin ya está en PATH, basta `gosu-speech-to-text`. Para instalar en otro prefijo:

```bash
make install PREFIX="$HOME/Apps/gosu-speech-to-text"
make uninstall PREFIX="$HOME/Apps/gosu-speech-to-text"
```

Desinstalación del prefijo predeterminado:

```bash
make uninstall
```

Solo retira los archivos administrados por esta instalación. Conserva dictados, modelos, respaldos y el entorno de desarrollo. Si `~/.local/bin/gosu-speech-to-text` pertenece a otro programa, no lo reemplaza.

Si el sistema no permite montar AppImage con FUSE, puedes probar el mecanismo de extracción del runtime:

```bash
APPIMAGE_EXTRACT_AND_RUN=1 ~/.local/bin/gosu-speech-to-text
```

En distribuciones que no lo soporten, utiliza el paquete DEB cuando corresponda o revisa las dependencias de AppImage de tu distribución.

## Ubuntu 22.04 / Debian compatibles

Instala las dependencias nativas de la versión de referencia Ubuntu 22.04:

```bash
sudo apt-get update
sudo apt-get install -y make build-essential pkg-config curl libssl-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf libfuse2 xdotool
```

Instala además Node 22, Rust estable y Python 3.12 o uv según GUIA-0.3.md y https://docs.astral.sh/uv/getting-started/installation/ . Ubuntu 22.04 no incluye Python 3.12 como intérprete predeterminado; no se asume que `apt install python3.12` esté disponible en su repositorio base.

```bash
make setup
make deb
```

El DEB se genera en `src-tauri/target/release/bundle/deb/`. Para instalar ese paquete utiliza el gestor de paquetes de tu sistema. `make install` instala el AppImage en tu usuario; no instala el DEB.

Los nombres de paquetes pueden cambiar en otras versiones de Ubuntu/Debian. La guía de requisitos oficial de Tauri es https://v2.tauri.app/start/prerequisites/ .

## Comandos disponibles

| Comando | Resultado |
|---|---|
| make / make help | Ayuda sin instalar dependencias |
| make doctor | Diagnóstico de herramientas, WebKitGTK y sesión gráfica |
| make setup | Entorno Python 3.12, dependencias Python y npm ci |
| make dev / make run | Aplicación nativa de desarrollo |
| make test | Pruebas Node y Python, incluidos los comandos de instalación |
| make check | Pruebas + frontend + cargo check --locked nativo |
| make frontend | dist/ de React/TypeScript |
| make engine | engine-dist/gosu-engine/ |
| make appimage / make build | bundle/appimage/ + hashes |
| make deb | bundle/deb/ + hashes |
| make bundle | AppImage y DEB en una compilación |
| make extension | extension-dist/ y gosu-speech-to-text-chrome.zip |
| make smoke | Prueba del motor empaquetado, con tiny |
| make install | AppImage y acceso de menú en ~/.local |
| make uninstall | Retira los archivos instalados por make install |
| make clean | Limpia salidas de compilación; conserva .venv y datos |

`make extension` solo necesita Node/npm y Python del sistema para comprimir; no necesita Rust ni el motor Python de dictado. `make smoke` necesita haber ejecutado `make engine` o un empaquetado de escritorio antes.

Los comandos se ejecutan de forma secuencial incluso si usas make -j. Para cambiar el intérprete que ejecuta el asistente puedes usar `make PYTHON=/ruta/a/python3 help`; el entorno del motor sigue requiriendo Python 3.12.

## Distribución pública

Genera los paquetes Linux públicos en Ubuntu 22.04 mediante GitHub Actions y pruébalos también en Arch. Un AppImage compilado en Arch puede exigir una glibc demasiado reciente para otras distribuciones. El Makefile no convierte un build de Arch en un binario universal.

Los paquetes de escritorio incluyen el motor; los usuarios finales no instalan Rust, Node o Python. Las herramientas de desarrollo solo se necesitan para compilar desde código fuente.

Wayland sigue teniendo las limitaciones de atajos globales e inyección descritas en FEATURES.md. `make install` no altera permisos del compositor ni instala un inyector privilegiado.

La instalación anterior hecha por el Makefile de Voz se migra al nuevo nombre únicamente si su marcador indica propiedad del instalador. Consulta ACTUALIZAR-GOSU.md.
