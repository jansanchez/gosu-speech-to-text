# Build and test on macOS

Read [README.md](README.md) and [acceptance criteria](CRITERIOS-DE-EXITO.md). Apple Silicon ARM64 and Intel x64 are independent targets. Use a native terminal, Node, and Python; do not mix Rosetta tools with ARM64 libraries.

## Setup

Install Node.js 22/npm, Python 3.12, stable Rust, and Xcode tools:

```bash
xcode-select --install
rustup component add rustfmt
node --version
python3.12 --version
rustc --version
uname -m
```

Follow [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Install Python 3.12 separately if needed; preserve system Python. From the project root:

```bash
python3.12 scripts/configurar.py
python3.12 scripts/configurar.py --dev
```

The helper prepares `.venv`, installs dependencies, and runs checks before launching/packaging. Preserve a wrong-version `.venv` under another name before creating a new one. Do not reuse another machine's environment.

## Package

```bash
python3.12 scripts/configurar.py --build
```

Output: `src-tauri/target/release/bundle/macos/*.app`, `dmg/*.dmg`, and `SHA256SUMS.txt`. This is not universal: rebuild natively for the other architecture.

## Permissions and insertion

Grant microphone and requested Accessibility/Automation permissions. Development launched from Terminal and the installed application can have different permission identities: test both.

Cmd+Shift+M switches views; Cmd+Shift+H hides/restores; Cmd+Shift+Space starts/stops dictation. Each is configurable in Settings. Check saved custom shortcuts after restarting, and test terminals/browsers according to [minimal mode](MINIMAL-MODE.md).

Signing/notarization is not configured. Before public distribution, configure and verify [macOS signing](https://v2.tauri.app/distribute/sign/macos/) for the app and engine; generating a DMG is not proof of signature/notarization. Record real results in [VALIDACION.md](VALIDACION.md).
