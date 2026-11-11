# Build and test on Linux

For downloaded packages without development tools, see [Install on Linux](INSTALL-LINUX.md).

Package baseline: Linux x64 on Ubuntu 22.04. Arch and other desktops need equivalent dependencies and their own validation. See [building and distribution](BUILD-AND-RELEASE.md).

## Dependencies

Install Node **22**, Python **3.12** with pip/venv, and stable Rust through rustup. Do not replace system Python; install 3.12 alongside it. With [uv](https://docs.astral.sh/uv/guides/install-python/), use `uv python install 3.12` and `uv venv --python 3.12 --seed .venv`.

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

These follow [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Prepare Node/Python separately. Ubuntu 24.04 may name FUSE 2 `libfuse2t64`; use the package for your distribution. It does not require removing FUSE 3.

## Development and checks

```bash
make doctor
make setup
make check
make dev
```

Setup installs Python requirements and runs `npm ci`. Checks cover docs, formatting, TypeScript, web/extension, Python, and locked Rust checks/tests. Development keeps the terminal occupied. `make help` lists tasks.

## Packages and local installation

```bash
make appimage
make deb
# Or both:
make bundle
```

Each build checks and packages engine/UI. Output is `src-tauri/target/release/bundle/`, with `SHA256SUMS.txt`. `make engine` builds only the engine and is unnecessary before a full bundle. `make smoke` may download tiny.

`make install` installs an AppImage for your user; `make uninstall` removes that managed installation. A custom prefix is supported: `make install PREFIX=/another/path`. Uninstall with the same prefix. `make clean` removes generated output; read `make help` first. Do not run GOSU with sudo.

## Native package for Arch / CachyOS

```bash
make arch
```

Build on native Arch/CachyOS x86_64 with `base-devel`, `pacman`, and `bsdtar` available. This runs checks, builds the complete application and engine without an AppImage, and creates a pacman candidate using system WebKit. Output and SHA256 manifest: `src-tauri/target/release/bundle/archlinux/<candidate>/`. It does not install the result or change desktop settings. See [native installation and IndexedDB compatibility](INSTALL-LINUX.md).

## Desktops and permissions

- **X11:** `xdotool` handles focus/paste; `xprop` helps identify terminal applications.
- **Hyprland:** uses `hyprctl` and GOSU's local bridge; requires an active Hyprland session and a configuration format detected by the implementation.
- **Other Wayland:** needs compatible GlobalShortcuts/RemoteDesktop portals and permission. Wayland alone does not guarantee availability. Generic portals type into the focused field without identifying its application.

Conflicts/denials remain visible and text is retained on insertion failure. Test Ctrl+Shift+M (editor/panel), Ctrl+Shift+H (hide/restore view), and Ctrl+Shift+Space (dictation) with microphone and targets using [minimal mode](MINIMAL-MODE.md) and [acceptance criteria](CRITERIOS-DE-EXITO.md). Hyprland validation does not automatically validate X11, GNOME, or KDE.
