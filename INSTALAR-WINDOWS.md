# Build and test on Windows

Documented target: Windows x64, Rust **MSVC**, NSIS installer. See [build contract](BUILD-AND-RELEASE.md) and [acceptance criteria](CRITERIOS-DE-EXITO.md).

## Requirements

1. Node.js **22** with npm and Python **3.12** with the `py` launcher.
2. Visual Studio Build Tools: **Desktop development with C++**, MSVC x64 compiler, and Windows SDK.
3. Stable Rust through rustup, `stable-x86_64-pc-windows-msvc`, and rustfmt.
4. Microsoft Edge WebView2 Runtime. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

Open a new PowerShell in the writable project directory after installation:

```powershell
node --version
npm.cmd --version
py -3.12 --version
rustup show active-toolchain
rustup component add rustfmt
py -3.12 scripts/configurar.py
```

The helper prepares `.venv`, dependencies, and web/Python/Rust checks without requiring environment activation. Wrong-version environments are rejected without deletion: rename them before preparing a new one. Do not copy `.venv`, `node_modules`, `target`, or `engine-dist` from Linux/macOS.

## Run and build

```powershell
py -3.12 scripts/configurar.py --dev
# After closing development:
py -3.12 scripts/configurar.py --build
```

Run separately; development remains open. Output: `src-tauri\target\release\bundle\nsis\`, with hashes in `bundle\SHA256SUMS.txt`. The full Python engine is included. Initial model download needs network/storage; monitor status in the UI.

Ctrl+Shift+M switches editor/panel; Ctrl+Shift+H hides/restores; Ctrl+Shift+Space starts/stops dictation. Configure each independently in Settings. With the engine ready, select the destination before stopping. Test terminal, WhatsApp, Google Docs, microphone permissions, and engine shutdown. Never automatically submit text with Enter. See [minimal mode](MINIMAL-MODE.md).

## Troubleshooting

- Missing `link.exe` or SDK: check the C++ workload and open a new terminal. A GNU cross-check on Linux does not validate MSVC packaging.
- PowerShell blocking `npm.ps1`: use `npm.cmd`; no global policy change is required.
- Missing microphone: check Windows desktop microphone permissions and the selected device.
- Occupied shortcut: choose another in Settings; do not unregister other applications' combinations.
- Use `scripts/diagnostico-windows.ps1` for environment inspection. [Historical communication](CORREGIR-WINDOWS.md) and [startup](REPARAR-MOTOR.md) guides retain earlier diagnostics.

Windows signing is not yet configured. Clean installation and dictation acceptance remain necessary; record evidence in [VALIDACION.md](VALIDACION.md).
