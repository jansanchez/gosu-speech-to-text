# GOSU Speech to Text

Local dictation and transcription with a full editor and a minimal panel for voice typing into other applications. **MIT license · version in [brand.json](brand.json).**

[Privacy Policy](PRIVACY.md): local processing, storage, model downloads, permissions, and control over your data.

## Minimal dictation

With GOSU open and the engine ready, **Ctrl+Shift+M** switches between the editor and minimal panel, **Ctrl+Shift+H** hides or restores the current view, and **Ctrl+Shift+Space** starts or stops dictation (use Cmd on macOS). All three shortcuts are configurable independently. You can switch fields while recording: GOSU selects the destination when you stop dictation. The panel stays available for another session. The result is also copied to the clipboard even if insertion fails; use Ctrl+Shift+V to paste into a terminal. Hiding the panel does not stop recording. GOSU never automatically presses Enter. See [minimal mode](MINIMAL-MODE.md).

Shortcuts are available from first use when permitted by the operating system. Use the shortcut controls in Preferences or the minimal panel to change them. Settings persist across restarts; an unavailable combination restores the previous shortcut. See [permissions and desktop limitations](MINIMAL-MODE.md).

## Platforms and validation

| Build target | Packages | Minimal dictation integration |
|---|---|---|
| Windows x64, MSVC toolchain | NSIS `.exe` installer | Win32 window/process targeting and keyboard input |
| Linux x64, Ubuntu 22.04 build baseline | `.deb` and `.AppImage` | X11, Hyprland, compatible GNOME/KDE Wayland portals |
| macOS Apple Silicon, native ARM64 build | `.app` and `.dmg` | System automation with user-granted permissions |
| macOS Intel, native x64 build | `.app` and `.dmg` | Separate Intel application and engine |
| Chrome, independent of the desktop app | Extension ZIP | WASM recognition and insertion into compatible fields |

Minimal mode has been exercised on Linux/Hyprland. Other adapters are implemented and have CI jobs; functional validation on real devices remains pending. Linux capabilities depend on the session, compositor, portals, and permissions. A successful build does not establish installation or runtime compatibility. See [validation records](VALIDACION.md) and [features and remaining work](FEATURES.md). Some linked maintenance documents are currently in Spanish.

## Build from source

Run commands from the directory containing `package.json`. Common requirements: **an up-to-date Node 22.x with npm, Python 3.12, and stable Rust with rustfmt**, plus the native tools for your platform. Do not copy `.venv`, `node_modules`, or packaged engines between operating systems or architectures.

### Linux

Install the [Ubuntu/Debian or Arch/CachyOS dependencies](LINUX-MAKE.md) first.

```bash
make doctor
make setup
make check
make dev
```

After closing the development application, build the packages you need:

```bash
make appimage
# Or:
make deb
# Or both:
make bundle
```

`make install` installs the AppImage for your user and creates the `gosu-speech-to-text` command. Use `make help` for available tasks. Ubuntu 22.04 is the Linux distribution build baseline; building on a rolling distribution does not guarantee compatibility with older systems.

### Windows x64 — PowerShell

Install [MSVC/C++ Build Tools, the Windows SDK, and WebView2](INSTALAR-WINDOWS.md), along with the common requirements.

```powershell
py -3.12 scripts/configurar.py --dev
```

To build the installer after closing the development application:

```powershell
py -3.12 scripts/configurar.py --build
```

The setup helper prepares dependencies, runs checks, and produces `src-tauri\target\release\bundle\nsis\*.exe`. For subsequent development sessions, run `npm.cmd run desktop`.

### macOS — Apple Silicon or Intel

Install [Xcode Command Line Tools and the tools for your architecture](INSTALAR-MACOS.md).

```bash
python3.12 scripts/configurar.py --dev
```

To build `.app` and `.dmg` packages after closing the development application:

```bash
python3.12 scripts/configurar.py --build
```

Output is placed in `src-tauri/target/release/bundle/`. Build ARM64 on ARM64 and Intel on x64. Combining engines from both architectures does not produce a universal application.

### Chrome extension

```bash
npm ci
npm run extension:build
python3 scripts/package-extension.py
```

On Windows, use `py -3.12 scripts/package-extension.py` for the last command. Load `extension-dist/` through `chrome://extensions` in developer mode, or use the generated `gosu-speech-to-text-chrome.zip`. Compiled extension files are not tracked in Git; build them or download a CI artifact.

## Distribution and checks

[BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) describes setup, verification, packaging, and release artifacts. [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) defines acceptance for changes, installers, and platforms.

- `npm run check`: version consistency, documentation links, formatting, TypeScript tests, and web/extension builds.
- `make check`: the above plus Python suites and Rust formatting, checks, and tests, using a prepared environment.
- Windows/macOS: `scripts/configurar.py` runs the common checks before launching or packaging; individual commands are in the build guide.
- `.github/workflows/ci.yml`: checks on branch pushes and pull requests across the four desktop targets.
- `.github/workflows/release.yml`: installer and extension candidates from a manual run or a `v*` tag; automatic tagging and publication require explicit approval through the `publish` input. Signing is not currently configured.

Desktop packages must include the Python engine. End users do not need Node, Python, or Rust installed, but applicable system components are still required. Whisper model weights are downloaded when the model is prepared and reused afterward. Ollama is optional and is not included in the base installer.

## Project documentation

| Document | Purpose |
|---|---|
| [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md) | Saved progress, commit references, evidence, and next steps |
| [MINIMAL-MODE.md](MINIMAL-MODE.md) | Shortcuts, focus, clipboard, and desktop limitations |
| [VALIDACION.md](VALIDACION.md) | Test history and actual validation scope |
| [AGENTS.md](AGENTS.md) | Working instructions for coding agents |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development, checks, and maintenance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Responsibilities and data/audio invariants |
| [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) | Acceptance criteria and platform evidence |
| [GUIA-0.3.md](GUIA-0.3.md) | Editor, tools, and optional models |
| [ACTUALIZAR-GOSU.md](ACTUALIZAR-GOSU.md) | Updating an existing installation |
| [REPARAR-MOTOR.md](REPARAR-MOTOR.md) | Engine startup troubleshooting |
| [NOMBRES.md](NOMBRES.md) | Product identity and data compatibility |
| [PRIVACY.md](PRIVACY.md) / [THIRD-PARTY.md](THIRD-PARTY.md) | Privacy, dependencies, and licenses |

`brand.json` is the source of the product name and version. Run `npm run brand:sync` after changing it and `npm run brand:check` to verify generated metadata. The historical identifier `org.voz.prototype` and storage keys are retained to preserve existing data.

## Versions and releases

Versions follow SemVer and are maintained in `brand.json`. See the [changelog](CHANGELOG.md) and [release procedure](BUILD-AND-RELEASE.md). Tags such as `vX.Y.Z` identify source code; installer validation is recorded separately.

To publish an approved version, open **Actions → GOSU Speech to Text release candidates → Run workflow**, select `main`, enable `publish`, and enter the exact version from `brand.json`. After all checks and builds succeed, the workflow creates the annotated tag and publishes packages and hashes. Without `publish`, it only generates candidates. See [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) for acceptance requirements and recovery after a failed upload.
