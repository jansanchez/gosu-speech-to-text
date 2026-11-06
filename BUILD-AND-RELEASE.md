# Building and distributing GOSU

This is the build contract for the current source. See [README.md](README.md) for a quick start and [acceptance criteria](CRITERIOS-DE-EXITO.md) before approving any delivery. Historical records in [VALIDACION.md](VALIDACION.md) do not certify a new binary.

## OS and architecture

**Tauri, the Python interpreter used by PyInstaller, and all native engine libraries must be built on the same OS and architecture as the target.** Build Windows x64 with MSVC on Windows, Linux x64 on Linux x64, Apple Silicon on ARM64 macOS, and Intel macOS on x64 macOS. Do not copy `engine-dist/`, `.venv/`, or `node_modules/` from another platform.

Changing only Tauri's `--target` does not convert the Python runtime. Windows ARM64, Linux ARM64, and universal macOS packages are not provided by this workflow. Each new target needs its own environment, dependencies, and evidence; a Rust cross-check is not an installer test.

## Common tools

| Tool | Project baseline | Check |
|---|---|---|
| Node/npm | Up-to-date Node 22.x, as used in CI | `node --version`, `npm --version` |
| Python | Native CPython 3.12 | `python3.12 --version` or `py -3.12 --version` |
| Rust | Stable host toolchain | `rustc -Vv`, `cargo --version` |
| Rust formatting | rustfmt | `rustup component add rustfmt` |
| Dependencies | Complete checkout and committed lockfiles | `npm ci`, Cargo with `--locked` |

Platform dependencies: [Linux](LINUX-MAKE.md), [Windows](INSTALAR-WINDOWS.md), [macOS](INSTALAR-MACOS.md). These extend [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) with Python, Linux D-Bus development files, and packaging tools. Initial dependency setup needs network access. Recognition may download a model on first use. Preparing `.venv` must not download model weights or record audio.

## Setup and development

| Platform | Prepare and check | Prepare, check, and launch |
|---|---|---|
| Linux with Make | `make setup`, then `make check` | `make dev` after setup |
| Windows PowerShell | `py -3.12 scripts/configurar.py` | `py -3.12 scripts/configurar.py --dev` |
| macOS | `python3.12 scripts/configurar.py` | `python3.12 scripts/configurar.py --dev` |

The helper creates `.venv` if absent, checks Python version, installs `server/requirements-build.txt`, runs `npm ci`, and performs common checks. Failures stop before launching or packaging. It does not install system tools or delete an existing environment with the wrong Python version.

For subsequent development sessions, run `npm run desktop` (`npm.cmd run desktop` in PowerShell). The desktop automatically connects to its engine without manually starting a server or copying a token. `npm run dev` runs only the web frontend and does not provide desktop global shortcuts.

## Individual checks

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

Stop when a command returns nonzero. PowerShell does not automatically stop a sequence of external programs: use the Python helper for reliable failure propagation. `npm run check` covers version metadata, local documentation links, formatting, TypeScript tests, and web/extension builds. Python suites have a finite deadline; Linux-specific and explicitly enabled graphical tests are distinguished in the acceptance criteria.

## Build installers

Close the development application first. Helpers run setup and checks before building.

| Target | Command | Output under `src-tauri/target/release/bundle/` |
|---|---|---|
| Windows x64/MSVC | `py -3.12 scripts/configurar.py --build` | `nsis/*.exe` |
| Linux x64 AppImage | `make appimage` | `appimage/*.AppImage` |
| Linux x64 DEB | `make deb` | `deb/*.deb` |
| Linux x64 both | `make bundle` | `appimage/` and `deb/` |
| macOS ARM64, native host | `python3.12 scripts/configurar.py --build` | `macos/*.app`, `dmg/*.dmg` |
| macOS Intel, native x64 host | `python3.12 scripts/configurar.py --build` | `macos/*.app`, `dmg/*.dmg` |

On an already verified environment, choose only the command for the host:

```bash
npm run desktop:build -- --bundles nsis -- --locked
npm run desktop:build -- --bundles deb,appimage -- --locked
npm run desktop:build -- --bundles app,dmg -- --locked
```

Use `npm.cmd` in PowerShell. `-- --locked` after Tauri arguments is forwarded to Cargo, not PyInstaller. Dependency updates are separate changes.

`desktop:build` packages the engine, invokes Tauri with `tauri.release.conf.json`, and stages a runtime next to the raw release binary. It automatically runs `build-engine.py`; for isolated engine work use `.venv/bin/python scripts/build-engine.py`.

On Linux the coordinator adds bundled library directories to `LD_LIBRARY_PATH` only for its build subprocess. This lets linuxdeploy resolve private wheel dependencies such as `av.libs/libswresample-*.so.*`. If `Could not find dependency: libswresample-…` appears, use updated `make appimage` or `npm run desktop:build`; invoking `tauri build` directly bypasses preparation. Preserve original library names.

The resource is the complete `engine-dist/gosu-engine/` directory, not only its executable. Do not distribute the bare Tauri executable alone. Installers should run without Python/Node/Rust development tools, with applicable system components installed.

## Engine smoke test and checksums

```bash
.venv/bin/python scripts/smoke-engine.py
python3 scripts/checksums.py
```

On Windows use `.\.venv\Scripts\python.exe scripts/smoke-engine.py` and `py -3.12 scripts/checksums.py`. The smoke test defaults to `tiny` and may download it; pass an existing Faster Whisper model directory as an argument to reuse it. It checks `/health` and Unix parent-stdin disconnection. On Windows it explicitly shuts down the process; parent-exit monitoring must also be validated by closing an installed application. It does not assess voice recognition accuracy.

`SHA256SUMS.txt` is created under `bundle/`. Make/helpers generate it automatically; the low-level npm route requires `checksums.py`. Supply a custom bundle path if Cargo output is redirected. Signing changes bytes: compute hashes only after signing the final artifacts.

## Chrome extension

```bash
npm ci
npm run check
python3 scripts/package-extension.py
```

On Windows use `npm.cmd` and `py -3.12`. Output: `gosu-speech-to-text-chrome.zip`, with root `manifest.json` and packaged WASM runtime. See [usage](GUIA-0.3.md). Building does not validate microphone access, model cache, or insertion in Chrome.

## GitHub Actions

| Workflow | Trigger | Result |
|---|---|---|
| `Checks`, `.github/workflows/ci.yml` | Branch push, PR, manual | Windows x64, Ubuntu x64, macOS ARM64 and Intel checks |
| `GOSU Speech to Text release candidates`, `.github/workflows/release.yml` | Manual or `v*` tag | Native installers, hashes, Chrome ZIP; explicit approval enables automatic tagging/publication |

The matrix uses `windows-2022`, `ubuntu-22.04`, `macos-15` ARM64, and `macos-15-intel`. These are configured builders, not a claim of all supported end-user systems. Check [GitHub runner availability](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) when updating the matrix.

Expected artifacts: `gosu-speech-to-text-windows-x64`, `gosu-speech-to-text-linux-x64`, `gosu-speech-to-text-macos-arm64`, `gosu-speech-to-text-macos-x64`, `gosu-speech-to-text-chrome`. Review all jobs and use artifacts from the same source commit. Never combine an installer and engine from different builds. Manual runs without `publish` and tag pushes generate candidates only.

## Acceptance before distribution

Meet [acceptance criteria](CRITERIOS-DE-EXITO.md) for the concrete artifact. Install on a clean target without development toolchains, including from a path with spaces. Validate microphone, initial/custom shortcuts, minimal mode, focus, terminal/browser insertion, recovery, and data retention. Record commit, tools, architecture, logs, artifacts, and hashes in [VALIDACION.md](VALIDACION.md).

Review bundled licenses. [Windows signing](https://v2.tauri.app/distribute/sign/windows/) and [macOS signing/notarization](https://v2.tauri.app/distribute/sign/macos/) must include the engine and native libraries. They are not configured by the current workflow. Publication approval does not sign packages or establish untested platform compatibility.

## SemVer and tags

`brand.json` is the version source. The compatibility contract includes settings/backups, audio recovery, documented commands, and engine integration. Under `0.x` the product is in initial development; a version number does not certify every platform.

- Compatible fixes: PATCH (`0.6.0` → `0.6.1`).
- Compatible features: MINOR and reset PATCH (`0.6.1` → `0.7.0`).
- During `0.x`, incompatible changes require a new MINOR, tested migration, and explicit notes. `1.0.0` requires a declared stable contract and accepted target platforms. From 1.0 onward, incompatible changes increment MAJOR.
- Documentation/refactoring without behavioral changes may accumulate without a version increment. A release groups commits; do not tag every individual feature.

Use numeric `X.Y.Z`, the shared subset supported by Tauri, Cargo, npm, and Chrome. Tags are annotated `vX.Y.Z`. CI candidates retain that version and are distinguished by commit/run, avoiding unsupported Chrome version suffixes. Never overwrite a tag, published version, or delivered artifact; later code requires a new version.

1. Review changes since the previous tag; choose the increment, edit `brand.json`, and add a dated [changelog](CHANGELOG.md) entry with limitations and migrations.
2. Run `npm run brand:sync` to synchronize manifests and the application's entries in npm/Cargo lockfiles without updating dependencies.
3. Run common checks and `npm run release:check`. The latter verifies generated metadata, changelog, and tag/version agreement when running on a tag.
4. Review and commit with a clean tree, then upload to main. Do not create the tag manually for automated publication.
5. Generate candidates without `publish`, download and validate the same commit's packages, and record evidence. Repeat validation if code changes.
6. Approve publication through Actions as described below.

Commit prefixes such as `feat:`, `fix:`, `docs:`, and `chore:` aid review and version selection; they do not automatically choose a version.

## Approved automatic publication

Enable Actions and permit `contents: write` for the `publish` job. The workflow uses its own `GITHUB_TOKEN`, with no PAT. Organization restrictions can still reject those permissions and must be reviewed rather than bypassed.

In **Actions → GOSU Speech to Text release candidates → Run workflow**, choose **main**. Leave `publish` unchecked for candidates. Once the version is tested and approved, enable `publish` and enter the exact version in `brand.json`. This is explicit acceptance for that delivery; passing mocked tests alone does not provide acceptance.

The workflow fixes the source commit at startup, runs all checks, and builds all targets. A failed matrix job prevents publication. The publishing job downloads artifacts from the same run, verifies installer hashes, and selects exactly six packages: EXE, DEB, AppImage, ARM64 DMG, Intel DMG, and Chrome ZIP. Platform prefixes prevent name collisions. AppDir directories, loose runtimes, and internal Python ZIPs are excluded. It generates a common SHA256 manifest, creates an annotated tag on the approved commit, creates a release draft, uploads packages/hashes, and publishes after upload completes. Notes contain only the selected version's changelog entry plus source/signing information.

An existing tag is accepted only when annotated and on the exact approved commit. Any existing release, including a draft, stops publication. An interruption may leave a tag or draft: inspect it and its assets before recovery; never move tags or replace a published release. A retry is possible when only the same-commit tag exists and there is no release.

Tags created with `GITHUB_TOKEN` do not need to trigger another workflow: publication uses this run's already built artifacts. No signing/notarization is configured; record that limitation. Until platform packages are accepted for distribution, generate candidates without `publish`.
