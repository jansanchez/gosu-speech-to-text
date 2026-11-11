# Validation records

Records are historical evidence, not current platform certification. Translations preserve their original scope. For current acceptance use [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md); source versions, CI results, clean installation, microphone inference, and insertion must be distinguished.

## Cross-platform instructions — 2026-11-04

README, platform guides, contributing rules, and criteria were aligned with native setup/builds. CI was configured for Windows x64/MSVC, Ubuntu x64, macOS ARM64 and Intel; this documentation work did not execute Actions or validate installers.

Linux `make check` outside the sandbox passed: documentation (20 files), formatting, 52 TypeScript tests, web/extension builds, 21 Python tests, and 10 Rust tests; one isolated-window graphical Rust test remained ignored. TestClient hung inside the sandbox but passed outside. Setup regressions preserved a wrong-version Python environment and prevented packaging after failed checks. Windows/macOS clean installation remained pending.

## Minimal mode — 2026-11-04

- `make check`: 52 TypeScript, 19 Python, and 10 Rust tests; formatting/builds passed, graphical Rust test excluded from automatic runs.
- Real isolated Hyprland 0.57 insertion: native adapter identified a GTK test window and inserted exactly `GOSU: inserción áéíóú ñ 你好`, requiring its identity before writing and avoiding user documents/terminals.
- Visual inspection: floating 460×220 logical-unit window with microphone off; shortcut registered directly in Hyprland.
- Shortcut capture temporarily suspended registrations, persisted after UI restart, and restored the previous binding after conflict.
- UI cases covered independent drafts, insertion on stop, waiting for final chunks, cancellation on returning to the editor, denied permission, failed targets, and renewal of owned shortcuts.

Windows, X11, Hyprland, GNOME/KDE portals, and macOS adapters were implemented. Only Linux/Hyprland was exercised on a real desktop in that session. The user confirmed Linux minimal mode generally; isolated insertion does not measure recognition accuracy or certify other platforms.

## Maintainability preparation — 2026-11-04

Linux `make check` passed: 41 TypeScript tests (including Chrome controller with substituted recognizer/device), 14 Python API/edit/search tests plus five Make-tool tests, and six Rust tests for paths, microphone policy, handshake, and process-generation isolation. Formatting, strict TypeScript, web/extension builds, and locked Cargo checks/tests passed.

Regressions included corrupt-storage preservation, failed audio writes/deletions, duplicate-free retries, simultaneous capture startup, cancellation during permissions, and workspace preservation across engine restart. Python ran outside the sandbox because TestClient could hang even with an empty API inside it.

This did not cover real microphone/inference, installed packages, or insertion into other applications. Remote CI execution was not checked. Two high npm dependency advisories and a pending Transformers major upgrade were documented in CONTRIBUTING; a Starlette/httpx deprecation warning did not fail tests.

## Original 0.3.0 validation — 2026-10-26

### Prior user confirmation

On Windows 0.2.1 plus startup hotfix, local dictation and Ctrl+Alt+C/Ctrl+Alt+V worked. That fix was incorporated into `server/engine.py`. The later 0.3 expansion still required renewed acceptance on that machine.

### Passed in that delivery

- 21 Node/TypeScript plus 14 Python tests: **35 automated tests**.
- Strict TypeScript and Vite production build; esbuild extension and root-manifest ZIP integrity.
- DOM insertion into selections; rejection of changed, removed, and password fields.
- Mocked native IPC dictation/editing/clipboard/pending-audio recovery.
- Natural suggestions required confirmation and refused overwriting intervening manual edits.
- Personal rules required confirmation; private text did not reach IndexedDB.
- Failed-save recovery committed the result before audio deletion without re-transcription.
- Encrypted backup Unicode round trips, wrong passwords, tampering, format/parameter checks.
- Audio import downmixing, sample preservation, WAV chunking, and size limits.
- API authentication, validation, languages, readiness, reviewable suggestions, and rejection of declared remote models; mocked semantic vectors/cache.
- `cargo check --target x86_64-pc-windows-gnu`: full Rust type check including Windows resources and IPC commands.
- X11 adapter compiled as a Rust library on Linux; macOS metadata checked for aarch64-apple-darwin, without executing AppleScript/permissions.
- Real Linux PyInstaller engine build/startup, `/health`, parent-disconnect cleanup, and transcription of a synthesized WAV using a local tiny model.
- Python updater tested in a temporary directory, preserving `.venv`, backing up source, and excluding generated engines/output.
- HTTP readiness states loading/ready/error; requests rejected before readiness while the client retained its queue.

### Limits and remaining work at that time

React tests replaced devices/IPC; API models were fake except for the stated WAV. Ollama editing/embeddings were mocked without downloading/evaluating those text models. Windows GNU checking did not create or execute an MSVC installer; X11/macOS adapters were not tested against real external windows. No real-browser visual or screen-reader audit was performed.

The synthetic transcript returned “Tomorrow I will review the document and send replay to Carlos.” The source said “send a reply”, demonstrating execution with a recognition error, not perfect accuracy or language-specific quality.

Pending: execute the full native workflow and clean-install each EXE/AppImage/DEB/DMG; repeat the user's Windows dictation/correction/restart/copy/paste/audio recovery; test X11/Wayland/macOS focus/permissions; validate real Chrome microphone/WASM/cache/insertion/tab-recovery; run real Ollama quality/latency checks; audit NVDA/VoiceOver/scaling/contrast/keyboard access; review licenses and signing/notarization. Unfinished vision features were not claimed complete; see FEATURES.

## Linux Make review

Added setup/dev/test/Rust/frontend/engine/AppImage/DEB/extension/local-install tasks. Four install/uninstall/cleanup regressions covered preserving user content, rejecting an occupied command, ownership markers, and not following symlinks while cleaning. Total: 21 Node + 14 Python API + 4 Linux-tool tests = **39**.

`make test`, `make frontend`, `make extension`, and `make -n` expansion ran on Linux. Installation tests used fixture AppImages and temporary prefixes, not a GUI. Full WebKitGTK AppImage/DEB generation/execution was not claimed by this record.

## Approved branding — 0.3.1

Public identity became GOSU Speech to Text — Dictation & Voice Typing; short app/menu name GOSU Speech to Text; project/command `gosu-speech-to-text`. `brand.json` became canonical and builds checked `brand:check`. Historical data, auth headers, and native identity were retained.

An additional Linux installer migration test preserved unrelated files: 21 Node + 14 API + 5 Linux-tool tests = **40**. Web/extension builds and Windows GNU Cargo checking passed with new metadata. Final installers and their native presentation still required device validation.

## Runtime paths — 0.3.2

Automatic Python preparation before Tauri and engine packaging before installers. Tests covered missing/healthy environments, missing base Python, preservation of incomplete environments, package installation, argument forwarding, and three Rust path scenarios (missing Python, moved source, adjacent release runtime). Total: 27 Node + 14 API + 5 Linux-tool + 3 Rust path checks = **49**.

Web/extension builds and Windows GNU checking passed, with identities/data protocol preserved. Setup command execution was simulated; Linux's existing environment also had a real startup import probe. Acceptance on the affected Windows machine remained pending. Runtime staged under `target/release/engine` was executed on Linux: `/health` ready and parent-disconnect cleanup passed, with execute permissions preserved.

## Shortcut lifecycle and target selection on stop — 2026-11-04

Base `8fba04b`, uncommitted local changes, Linux x86_64. `make check` passed: 52 TypeScript, 21 Python, 10 Rust, with one graphical test ignored. Regression scenarios mocked showing without recording, capture, target change before stopping, retaining the stop-time destination while final recognition arrived, and hide/show with the same shortcut. Pending: real microphone/permissions/paste, RAM/CPU measurement, and other platforms. No packages built/installed.

## Separate panel/dictation shortcuts — 2026-11-04

Same base `8fba04b` and local uncommitted changes, Linux x86_64. Outside-sandbox `make check`: 55 TypeScript, 21 Python, 10 Rust, one graphical exclusion. Sandbox TestClient hit 60 seconds; the authorized outside repeat passed. Mocked consecutive sessions without hiding, independent visibility during capture, panel shortcut persistence/conflict recovery, settings migration, and collision rejection. Real microphone/permissions/paste, RAM/CPU, and other platforms remained pending. No persistent desktop shortcut configuration or publication changed.

## Starting while GOSU is focused, independent copy, real terminal paste — 2026-11-04

Base `8fba04b` plus local changes; Linux x86_64, Hyprland 0.57.0. Outside-sandbox `make check`: 57 TypeScript, 21 Python, 10 Rust, one graphical exclusion. Regressions covered capture without an initial target, copying before insertion, copying after target/paste failure, and preserving the draft after clipboard failure. The native UI suite passed again after immediate capture-stop behavior was adjusted during a pending target query.

Real test: `python3 /tmp/gosu-validate-paste.py` ran `cargo test --locked --manifest-path src-tauri/Cargo.toml paste_into_isolated_test_window -- --ignored --nocapture` against GTK class `org.gosu.IntegrationTest` and WezTerm class `org.gosu.IntegrationTest.wezterm`, launched with `--skip-config`. Both received exact Unicode text without Enter, then test windows/processes closed. This established isolated adapter copy/insertion, not microphone, recognition, physical panel shortcuts, personal WezTerm configuration, Codex, WhatsApp, or ChatGPT. Panel bottom margin was raised to 15%; visual review with user chats remained pending. The script was temporary; no installers/publication.

## Independent view/visibility and real Hyprland restoration — 2026-11-04

Base `8fba04b` plus local changes; Linux x86_64, Hyprland 0.57.0. Outside-sandbox `make check`: 60 TypeScript, 21 Python, 11 Rust, one graphical exclusion. New coverage: restore editor/panel without recording, rapid visibility toggles, third-shortcut persistence/conflict recovery, collision-free migration, and WebKit window identity. After broadening recognized window classes and rejecting GOSU as a target, `cargo test --locked --manifest-path src-tauri/Cargo.toml hyprland::tests` passed.

`python3 /tmp/gosu-validate-window.py` started `make dev` and used `--show-minimal`/`--toggle-visibility`. Final real path passed: editor → panel (460×220, floating, observed position 1050,1004) → hide → restore panel → editor → hide/restore editor. Observed class: `gosu-speech-to-text`. Initial return-to-editor retained the small size; explicit compositor resizing fixed it and the repeat passed without the window-identification error. The test instance closed without recording. Physical shortcuts, microphone, recognition, and other platforms were not validated. Earlier GTK/WezTerm insertion evidence retains its limited scope.

## Publication and user confirmation — 2026-11-04

The three-action implementation was committed and pushed as `d970f81bc7f662662050dec40cffdc9e78fc1f7c` on main. Earlier `8fba04b` records describe intermediate stages, not later Git state. Final scope: three actions and 60 TypeScript, 21 Python, 11 Rust checks passed.

The user tried `make dev` on Linux/Hyprland, expressed satisfaction, and requested commit/push. General satisfaction did not establish detailed microphone/recognition/application-specific acceptance. CI outcomes and other platforms remained pending then. Resume context is in [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md).

## PyAV dependencies in AppImage — 2026-11-05

Base `26fe01a` with local coordinator/test changes. CachyOS Linux x86_64, kernel 7.3.0-5-cachyos, glibc 2.44; Node v26.12.1 (different from CI's Node 22 baseline), Python 3.12.15, Rust 1.99.1, PyInstaller 6.22.3.

- `libswresample-14658403.so.6.1.100` existed in the runtime, but `ldd` on `av.libs/libavcodec-*.so.*` could not resolve it. Passing bundled library directories through the build subprocess's `LD_LIBRARY_PATH` resolved all dependencies while preserving the caller environment.
- `make check` passed, including Linux environment and Windows/macOS preservation regressions; graphical Rust test remained excluded.
- Sandbox `npm run desktop:build -- --bundles appimage -- --locked` failed generically with `failed to run linuxdeploy`.
- Authorized outside repeat `npm run desktop:build -- --bundles appimage --verbose -- --locked` passed, producing `src-tauri/target/release/bundle/appimage/GOSU Speech to Text_0.3.2_amd64.AppImage` (334.48 MiB). `python3 scripts/checksums.py` generated the manifest.
- AppImage SHA256: `b16fff7f9e9270d7ba745b36b9cd21513e0ac912eed7c280782f830c087f47b7`.
- Clean install, engine launch from AppImage, microphone, recognition, permissions, and paste remained pending. This build did not certify older glibc or other architectures/OSes. No install/signing/publication occurred in that task.

## SemVer consolidation — 0.4.0, 2026-11-05

Base `26fe01a`, consolidated as `0b32242` / annotated `v0.4.0`. Same environment as above; no local/remote tags existed before consolidation (`git ls-remote --tags origin` returned empty outside the sandbox).

`brand:sync` synchronized npm/Tauri/Chrome/Cargo and lockfiles without dependency updates. Sandbox frontend checks passed but TestClient timed out; authorized outside `make check` passed, including packaging/tag regressions, web/Chrome, 21 Python, and 11 Rust (one graphical exclusion). Candidate CI checked tag/version/changelog consistency; tests rejected mismatched tags and invalid versions. At the time of this record it had not run, the tag had not yet been pushed, and no 0.4.0 installers were rebuilt. The diagnostic 0.3.2 AppImage was not a 0.4.0 artifact. Later push history is recorded below.

## macOS check fixes — 0.4.1, 2026-11-05

Base `0b32242` / `v0.4.0` was pushed. Candidate run: https://github.com/jansanchez/gosu-speech-to-text/actions/runs/42127492551. Chrome passed; both macOS targets failed before packaging; Linux/Windows were still running when diagnosed.

User-supplied `job-logs.txt` (ARM64) and `job-logs-2.txt` (Intel) showed shortcut migration tests incorrectly equating Control with CommandOrControl on macOS, where it means Cmd/Super. Intel additionally reached the 15000 ms deadline for the complete `ui-native.test.ts` file after sequential progress.

0.4.1 introduced explicit Linux/MacIntel scenarios with navigator restoration and distinct Control/Cmd checks, retaining every test and extending the per-file deadline to 30 seconds. No application/storage logic changed. Brand/lockfiles were synchronized and old tags retained. Outside-sandbox `make check` passed on CachyOS Linux x86_64: frontend/extension, platform simulations, 21 Python, 11 Rust (one graphical exclusion). This did not certify real macOS. The user later confirmed successful pushes outside Codex after repeated server-side `commit_refs_rules` errors; no root cause was established.

## Approved release automation — 0.5.0, 2026-11-05

Base `fedf95e`, implementation `e9ca724`; same Linux x86_64 environment/tools. User chose manual approval in Actions followed by automatic tagging/publication. `make check` passed outside sandbox: web/extension, 23 Python, 11 Rust (one graphical exclusion), formatting, and metadata.

Tests covered explicit approval, main/exact version, version-specific notes, platform packages, altered hashes, incomplete/unexpected artifacts, internal ZIP exclusion, and draft → upload → publish sequencing. Failed mocked upload left the draft unpublished. YAML was parsed with PyYAML and job dependencies reviewed; this was not actionlint or actual Actions execution.

The initial record had no tag/publication. Later user reports stated candidates succeeded with publish skipped, then releases became available; these reports were not independently audited for installed behavior. Signing remained unconfigured. A public privacy policy was added in `f374492`, then English public-language instructions and README in `97cb754`.

## English migration and ten priority languages — 0.6.0, 2026-11-06

Base `97cb754`, local migration changes. CachyOS Linux x86_64; Node v26.12.1, Python 3.12.15, Rust 1.99.1. Public UI, errors, OS permission descriptions, CLI scripts, guides, release notes, and agent instructions were migrated to English. Historical evidence and its limitations were translated; quoted multilingual test data and historical filenames/protocol identities remain unchanged where required for compatibility.

New-install recognition defaults to English. Regression tests retain every explicitly saved recognition language. Added shared phrase/control/punctuation coverage for `en`, `zh`, `hi`, `es`, `fr`, `ar`, `bn`, `pt`, `ru`, `ur`; Unicode-aware boundaries include combining marks, and CJK replacement works without spaces while preserving ambiguous-match selection. Sentence deletion covers CJK/Arabic/Urdu/Devanagari punctuation, word counting uses ICU segmentation when available, CJK chunk joins avoid artificial spaces, and spoken paragraph breaks survive cleanup/append in both desktop and Chrome. No storage schema, backup format, application identifier, audio commit ordering, or private-mode protocol changed.

- `npm run format` and `cargo fmt --manifest-path src-tauri/Cargo.toml`: applied.
- `npm run check`: passed, including local links, version metadata, formatting, 85 TypeScript/DOM/device-mocked tests, strict TypeScript, and web/Chrome builds. The final navigation integration was checked again with the full npm suite after the Python/Rust run.
- Authorized outside-sandbox `make check`: passed, including the same frontend checks, 15 Python server tests plus nine tool tests (24 total), and 11 Rust tests. One graphical Rust test remains ignored because it requires an isolated test window.
- New language tests cover exact language forwarding to a fake model, Unicode API output, saved settings/backup round trips, documented control/correction/punctuation phrases, CJK ambiguity, combining-mark preservation, and segmentation. Existing recovery/privacy/concurrency tests still pass with English labels.
- A source scan found no remaining Spanish public UI/error prose in tracked product files; non-English text remains intentionally in recognition phrase data, historical evidence quotes, and multilingual fixtures. Legacy Spanish-named documentation/script entry points remain to preserve links and commands.

No real ten-language microphone/accuracy benchmark, native-speaker grammar review, screen-reader audit, signed installer, or Windows/macOS runtime validation was performed in this migration. No release/tag was created or published. Generate candidates from the new commit and follow LANGUAGES.md and the acceptance criteria before claiming real platform/language acceptance.

## Linux distribution preparation — 2026-11-09

- Source baseline: `ca74a71`, 0.6.0 plus the distribution preparation in this commit (tested before committing); host Linux x86_64 (CachyOS). No target distribution has been promoted to supported status.
- `npm run format` and `cargo fmt --manifest-path src-tauri/Cargo.toml`: applied. `git diff --check`: passed.
- `make check`: passed outside the sandbox, 85 TypeScript tests, 15 server plus 11 tooling Python tests, 11 Rust tests passed and one isolated-window graphical test ignored. Web/extension builds and locked Rust check passed. Log: `/tmp/gosu-linux-check-external.log` (local, not a published artifact).
- Sandbox `make check` timed out in the first FastAPI test after 60 seconds; the external run passed. This does not establish a product defect.
- Added two fixture tests for incomplete engine/runtime/audio library, wrong architecture, missing executable permissions, and ambiguous/missing package sets. These do not exercise real installation or recognition.
- CI now inspects both Linux packages before uploading candidates. This session has not executed the changed GitHub workflow. Ubuntu/Mint/Debian/Fedora/Arch acceptance, real GNOME/KDE permissions/insertion and microphone recognition remain pending. See INSTALL-LINUX.md.

- Local tools: Rust 1.99.1, Python 3.12.15, Node 26.13.0. CI remains on the documented Node 22 / Ubuntu 22.04 baseline; local success does not replace that run.
- `npm run desktop:build -- --bundles deb,appimage --ci -- --locked`: produced DEB, then failed running linuxdeploy inside the sandbox. `npm run desktop:build -- --bundles appimage --verbose --ci -- --locked` outside the sandbox succeeded; log `/tmp/gosu-linux-build-external.log`. No source workaround or system installation was needed.
- Extracted both real local 0.6.0 packages in temporary directories and ran `inspect_tree`: application/engine x86_64, bundled Python 3.12, libswresample and desktop entry passed. DEB control inspected with `ar` and Python tarfile: package `gosu-speech-to-text`, version `0.6.0`, architecture `amd64`, dependencies `libwebkit2gtk-4.1-0, libgtk-3-0`. This host lacks dpkg-deb, so the full CLI report remains pending on Ubuntu CI. No application launch/installation/microphone test was performed.
- `python3 scripts/checksums.py`: passed for local outputs. DEB SHA256 `d9c4c4d3098999a8eaa3917c693bc792e49313f9b8acbd938e20ce9b58ec7a2a`; AppImage SHA256 `b037cddb81cc75552f6eeaaa237085a82843487b6ce050d8057f6495e655495a`. Files are under `src-tauri/target/release/bundle/`; built on CachyOS, not certified as portable Ubuntu artifacts. Do not mix these with CI candidates.
- No tag, release, signature, store submission, or desktop shortcut change was made.


## GitHub Actions Node 24 runtimes — 2026-11-09

- Baseline `e6e042a`, Linux x86_64/CachyOS, Node 26.13.0, Python 3.12.15, Rust 1.99.1. Updated both workflows' GitHub-maintained JavaScript actions to Node 24 runtimes; build Node remains 22 in CI. Upstream action.yml verified: checkout/setup-node/setup-python/upload-artifact v6 and download-artifact v7. Download v6 still declares node20, so v7 is required here.
- `npm run format`, `cargo fmt --manifest-path src-tauri/Cargo.toml`, YAML parsing of both workflows, and `git diff --check`: passed.
- `make check` outside sandbox: passed (85 TypeScript, 26 Python, 11 Rust tests; one graphical Rust test ignored); local log `/tmp/gosu-actions-check.log`. These checks do not execute GitHub actions or validate remote credential cleanup/artifact transfer.
- Run a fresh Checks/candidate workflow from the new commit to verify annotations and actual hosted-runner behavior. An old run's rerun retains its original workflow revision. No tag, release or package rebuild was performed for this maintenance.


## Linux package tests on Windows CI — 2026-11-09

- Baseline `10ee0f0`. Maintainer-provided Windows Python 3.12.10 log: 15 server tests passed; Linux package test failed at the POSIX executable permission assertion because chmod/stat on Windows cannot establish those bits. This was a test-platform assumption, not evidence of a broken Windows installer.
- Limited the content/permission test to Linux with an explicit unittest skip. Added portable malformed/empty/AArch64 ELF-header rejection coverage; ambiguous/missing package selection remains portable. Production package inspection and its POSIX permission validation were preserved.
- Host Linux x86_64/CachyOS, Node 26.13.0, Python 3.12.15, Rust 1.99.1: three targeted Linux-package tests passed; `make check` outside sandbox passed (85 TypeScript, 27 Python, 11 Rust tests; one graphical Rust test ignored). Formatting and diff checks passed. Local log `/tmp/gosu-windows-test-check.log`.
- Real Windows/macOS CI reruns remain pending. No Windows runtime, installer, microphone, or signing validation is claimed. The FastAPI httpx deprecation warning is separate from the failure and remains unchanged. No version/tag/release created.


## macOS parallel engine-path fixture isolation — 2026-11-09

- Baseline `ebec02c`. Maintainer-supplied macOS log from `python scripts/test-engine-paths.py`: release lookup passed, source-root lookup and fixture removal failed concurrently (missing fixture files and DirectoryNotEmpty). The helper named directories using PID and wall-clock nanoseconds and called create_dir_all, allowing an existing path to be silently reused if clock readings collided. The logs are consistent with this race; no native macOS reproduction was available locally.
- Test-only fix: atomic sequence plus exclusive create_dir; retry AlreadyExists, never adopt an existing fixture. Added deterministic pre-existing-path collision coverage and 16 concurrent fixture reservations. Production engine/path functions are unchanged.
- Linux x86_64/CachyOS, Rust 1.99.1, Python 3.12.15, Node 26.13.0: `python3 scripts/test-engine-paths.py` passed all five tests. Compiled the standalone suite once and ran it 50 times with `--test-threads=32`: 250 test executions passed. This stress run supplements the deterministic collision test and does not establish macOS acceptance.
- Formatting, `git diff --check`, and external `make check` passed: 85 TypeScript, 27 Python, 13 Rust tests, one graphical Rust test ignored. Local log `/tmp/gosu-mac-path-check.log`.
- Fresh macOS Intel/ARM64 Actions verification remains pending. No installer rebuild, tag, release, signing, engine lifecycle or user-data change was performed.


## CachyOS AppImage existing-profile failure — 2026-11-11

- Maintainer reports successful candidate workflow, then real AppImage launch from the downloaded Linux artifact. Report identifies commit `7b7483a700e00be2c208215d5f660927f33b2017`, 0.6.0, Ubuntu/glibc 2.35 build. Existing-profile acceptance failed: IndexedDB UnknownError, Unable to establish IDB database file. The dictation button correctly remains disabled after unsuccessful workspace loading.
- Maintainer-supplied engine log shows process/server startup and base model loading; this does not prove recognition is ready or successful. Same AppImage with fresh temporary XDG data/cache roots works correctly according to maintainer. Scope of audio/shortcut/insertion testing was not specified; no full installer acceptance claimed.
- Read-only local inspection: data directories owned by jan, sufficient disk space, system WebKitGTK 2.54.2, IndexedDB MetadataVersion 2 in both production and dev origins (queried from disposable temporary copies, without user record contents). Ordinary SQLite integrity checks cannot assess WebKit's custom IDBKEY collation; no corruption conclusion was drawn. Isolated library version queries lacked bundled dependencies, so their load failures are not application package failure evidence.
- No original profile reset, database edit, storage identity change or automatic migration. Permanent storage, existing-data recovery, bundled-runtime compatibility and real functional acceptance remain pending. Temporary profile is diagnostic only.


## Development/production profile separation — 2026-11-11

- Baseline `7b7483a`, Linux x86_64/CachyOS. Maintainer clarified that the native release opened without any history. This is not evidence of recovering an existing profile or of WebKit incompatibility; the previous conditional hypothesis remains unconfirmed. Native/AppImage production binaries use the same identity; older development had a separate URL origin within the same base directory.
- Added a development CLI config overlay and Rust debug context configuration before Tauri builds the app. Development identity is `org.voz.prototype.dev`, with `(Development)` title; production config is preserved exactly, including `org.voz.prototype`. The Linux development bridge is separate. Hyprland recognizes/rejects both GOSU classes. No user files, storage keys, backup formats, production defaults, audio commit sequence, or failed-load write protections were changed. No legacy profile is copied/deleted/imported.
- Added three Rust regressions: exact production configuration preservation; development identity/title/config isolation and overlay agreement; real Tauri path resolver under MockRuntime verifies distinct application data/local-data/config/cache/log directories without creating windows. Enabled Tauri's test feature only for dev-dependencies; lockfiles unchanged. Extended existing Hyprland identity regressions. These are automated configuration/path tests, not actual WebView persistence or platform installation tests.
- `npm run format`, `cargo fmt --manifest-path src-tauri/Cargo.toml`, `npm run brand:sync`, documentation/link checks and `git diff --check` passed. External `make check` passed (85 TypeScript, 27 Python, initially 15 Rust tests before adding the MockRuntime regression; one graphical test ignored). After that regression, locked Rust check/full tests passed with 16 tests and one graphical exclusion, and locked `cargo check --release` passed. Sandbox Python had the known first-FastAPI-test timeout; external Python passed. Log `/tmp/gosu-profile-check-external.log`.
- No native GUI/profile persistence, macOS/Windows installation, or current AppImage storage fix is claimed. No tag, package release, signature or desktop shortcut settings change. Rebuild and validate candidates before publication. Existing release binaries do not contain this development-isolation change.
