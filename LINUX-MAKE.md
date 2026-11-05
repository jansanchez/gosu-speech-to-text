# Compilar y probar en Linux

Referencia de paquetes: Linux x64, Ubuntu 22.04. Arch y otros escritorios requieren sus dependencias equivalentes y validación propia. Consulta [compilación y distribución](BUILD-AND-RELEASE.md).

## Dependencias

Instala Node.js **22**, Python **3.12** con pip/venv y Rust estable mediante rustup. No reemplaces el Python del sistema: si tu distribución utiliza otra versión, instala 3.12 en paralelo. Con [uv](https://docs.astral.sh/uv/guides/install-python/) puedes preparar el entorno con `uv python install 3.12` y `uv venv --python 3.12 --seed .venv`.

Ubuntu 22.04:

```bash
sudo apt update
sudo apt install build-essential pkg-config curl wget file make libwebkit2gtk-4.1-dev libssl-dev libdbus-1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev xdotool x11-utils patchelf libfuse2
rustup component add rustfmt
```

Arch:

```bash
sudo pacman -S --needed base-devel pkgconf curl wget file make webkit2gtk-4.1 openssl dbus libappindicator-gtk3 librsvg xdotool xorg-xprop patchelf fuse2
rustup component add rustfmt
```

La base sigue los [requisitos oficiales de Tauri](https://v2.tauri.app/start/prerequisites/). Python 3.12 y Node 22 se preparan por separado. En Ubuntu 24.04 el paquete FUSE 2 puede llamarse `libfuse2t64`; usa el disponible para tu distribución. No sustituye FUSE 3 ni exige eliminarlo.

## Desarrollo y comprobaciones

```bash
make doctor
make setup
make check
make dev
```

`make setup` instala requisitos Python y ejecuta `npm ci`. `make check` comprueba formato, documentación, TypeScript, web/extensión, Python y Rust (formato, compilación y pruebas con lockfile). `make dev` abre la aplicación y mantiene la terminal ocupada. `make help` enumera las tareas.

## Paquetes e instalación local

```bash
make appimage
make deb
# O ambos:
make bundle
```

Cada build ejecuta las comprobaciones y empaqueta motor e interfaz. Resultados: `src-tauri/target/release/bundle/`, con `SHA256SUMS.txt`. `make engine` genera solo el motor; no hace falta antes de `make bundle`. `make smoke` puede descargar el modelo tiny.

Después de crear la AppImage, `make install` instala para tu usuario; `make uninstall` retira esa instalación administrada. `make clean` elimina salidas de compilación: revisa `make help` antes de usar tareas de limpieza. No se requiere ejecutar GOSU con sudo.

## Escritorios y permisos

- **X11:** `xdotool` permite foco y pegado; `xprop` identifica el proceso para distinguir terminales.
- **Hyprland:** integración con `hyprctl` y puente local de GOSU; requiere una sesión Hyprland disponible. Soporta los formatos de configuración detectados por la implementación.
- **Otros Wayland:** portales GlobalShortcuts y RemoteDesktop cuando el compositor los implementa. GNOME/KDE pueden solicitar autorización; disponer de Wayland no garantiza esos portales. El portal genérico escribe en el campo enfocado y no identifica la aplicación.

No existe un mecanismo idéntico garantizado para todos los compositores. Los conflictos y permisos deben quedar visibles; conserva el texto si la inserción falla. Prueba el atajo configurable **Ctrl+Shift+Espacio**, micrófono y destino siguiendo [MINIMAL-MODE.md](MINIMAL-MODE.md) y [criterios de éxito](CRITERIOS-DE-EXITO.md). La validación real obtenida en Hyprland no acredita automáticamente X11, GNOME o KDE.
