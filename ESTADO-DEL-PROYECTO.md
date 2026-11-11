# Resume state — 2026-11-11

## CachyOS native package and confirmed WebKit downgrade failure

Baseline `640b727`. Confirmed with the downloaded CI AppImage: bundled WebKitGTK 2.50.4 versus CachyOS system 2.54.2. A reproducible real GTK/WebKit test on a virtual X11 display using disposable databases yields: native fresh opens (MetadataVersion 2); bundled fresh opens (1); bundled opening native-created database fails with the user's exact UnknownError; native opening bundled database succeeds and upgrades metadata to 2. This explains why even an empty profile previously opened natively can fail in the older AppImage. No user records/profiles were used or edited in the reproduction.

Added `make arch`: checks, native app/engine build with --no-bundle, and makepkg packaging for Arch/CachyOS x86_64. Ships /opt/gosu-speech-to-text app plus adjacent complete engine, /usr/bin symlink, menu/icon, licenses/notices, source/host/WebKit provenance and SHA256. Uses system WebKit with a minimum builder-version dependency; no bundled WebKit replacement or data reset. Git-based candidate package versions, dirty builds explicitly marked, output never overwritten. Does not install/sign/publish. Current Actions still builds Ubuntu DEB/AppImage, not Arch packages.

Local make arch passed (85 TypeScript, 29 Python, 16 Rust, one graphical exclusion) and built a dirty diagnostic native candidate. Final clean candidate generated from commit `12323629f3dc724da80ef118b17b049178531d08`: `src-tauri/target/release/bundle/archlinux/0.6.0.r23.g12323629/gosu-speech-to-text-0.6.0.r23.g12323629-1-x86_64.pkg.tar.zst`, dirty=false, SHA256 `46e4edec1b0fa2cbce611e96f3c40c9bd18ab4ebc690040ee46d956f6cfe28aa`. Repeated make arch passed; checksum verified. Maintainer should close other instances, review/install with sudo pacman -U and launch /usr/bin/gosu-speech-to-text. Installation has not been performed. `pacman -Qip` and archive contents validated; native binary links system /usr/lib WebKit. Real pacman installation, reopening/persistence, mic/shortcuts/insertion still require maintainer acceptance. The older AppImage remains incompatible with a newer-migrated profile; do not switch back to it on the same profile.

Repro source: scripts/test-webkit-storage.py and tests/native/indexeddb-probe.c. Command in BUILD-AND-RELEASE.md; exit 1 currently means the diagnosed old-runtime compatibility failure. Results: /tmp/gosu-webkit-compatibility.json; make/build log /tmp/gosu-arch-build.log. This diagnosis supersedes earlier unconfirmed hypotheses below.

## Development profile isolation

The maintainer clarified that the native release opened without history; it must NOT be recorded as recovery of the old profile. Fresh installations and development history were expected to be separate. Evidence supports fresh-profile operation only, and the cause of the original IndexedDB error is still unresolved.

Implemented: production remains `org.voz.prototype`; debug builds select `org.voz.prototype.dev` before Tauri resolves paths/creates windows. npm run desktop applies a development config overlay for platform build metadata. Debug titles show (Development). Linux shortcut bridge uses a separate development directory, and Hyprland recognizes/rejects both application identities as insertion targets. Existing legacy directories/IndexedDB keys/backups are untouched; no migration/reset/copy occurs. Native release and AppImage are both production and intentionally keep the production profile across upgrades.

Local verification passed: npm checks/builds (85 TypeScript), 27 Python tests, 16 final Rust tests (one graphical exclusion), locked debug/release Rust checks, formatting and brand sync. Lockfiles unchanged. Regression scope: production config preservation, development-only config changes, Tauri's actual path resolver via MockRuntime for distinct data/local-data/config/cache/log paths without windows, and Hyprland development identity handling. Native GUI, persistence and macOS/Windows isolation need real acceptance. Previously generated binaries do not include this source change. Run npm run desktop to test current development; rebuild candidates to test changed release source. The isolation fix does not itself repair the existing-profile AppImage failure.

## CachyOS AppImage storage investigation

Current source `7b7483a`. The maintainer reports all candidate jobs successful. Downloaded `/home/jan/Applications/gosu-0.6.0/linux-package-report.json` identifies commit `7b7483a700e00be2c208215d5f660927f33b2017`, Ubuntu/glibc 2.35 builder, version 0.6.0. Actual AppImage launch on CachyOS fails with IndexedDB UnknownError: Unable to establish IDB database file. Start dictation remains disabled because useWorkspace never sets loaded after a storage-open failure; preserve this recovery gate.

Engine logs supplied by the maintainer show the process/server started and model base loading. The maintainer then confirms the same AppImage works correctly with isolated XDG_DATA_HOME and XDG_CACHE_HOME under a mktemp directory. This establishes fresh-profile operation, not existing-profile compatibility or full platform acceptance. Do not delete/reset the original profile or use a temporary profile as the final installation.

Read-only metadata investigation: system WebKitGTK 2.54.2; original production and dev IndexedDB metadata versions both 2. Data directory owner is jan and free space is sufficient. Metadata queried only from disposable copies; no original database edits. Bundled WebKit version could not be resolved in isolation because its Ubuntu dependencies were not fully extracted; missing-library errors from these metadata probes do not mean those libraries are missing from the complete AppImage. Compatibility with the older bundled WebKit is a hypothesis, not a confirmed root cause. No source/storage migration has been implemented.

Next: close AppImage, preserve a filesystem backup of the original profile, and test the existing native CachyOS build with system WebKit to recover/export a supported application backup if it opens. The binary and staged engine exist at src-tauri/target/release/gosu-speech-to-text and src-tauri/target/release/engine/gosu-engine. A permanent profile/recovery workflow still needs validation. Avoid simultaneous instances sharing a profile. Pending: repeated persistence, real audio/insertion acceptance, exact bundled WebKit version and original-profile diagnosis.

## Linux distribution preparation

Source baseline: `ca74a71` (0.6.0), Linux x86_64. The maintainer approved preparing DEB/AppImage distribution while Windows signing is unresolved. SignPath Foundation rejected the free application because public adoption/visibility is insufficient; paid signing remains an option, not configured. No sponsorship may be claimed.

Added INSTALL-LINUX.md with download verification, end-user installation/update/removal, desktop dependencies and explicit pending acceptance for Ubuntu, Mint, Debian, Fedora, and Arch/CachyOS. Added package inspection to release CI before Linux artifact upload. This is packaging/tooling work recorded under Unreleased; brand version remains unchanged and no tag/publication/signing is authorized by this preparation.

Initial local output was historical 0.3.2. New 0.6.0 DEB and AppImage packages were built on CachyOS; content inspection passed for both, but these are not Ubuntu-baseline delivery candidates. The AppImage sandbox build failed in linuxdeploy; an external verbose build succeeded. The full dpkg-based CLI report remains to be exercised on Ubuntu CI because dpkg-deb is absent locally. Generate candidates from the new committed source with publish unchecked; inspect the report and validate exact packages on clean systems. GNOME/KDE Wayland and real microphone/recognition remain pending. No store submission, APT repository, RPM, Flatpak or signature was created.

Checks for this preparation: `make check` passed outside the sandbox (85 TypeScript, 26 Python, 11 Rust tests; one graphical Rust test ignored). The sandbox run reached the known FastAPI timeout. Package inspection tests use fixtures; current artifact and clean-install evidence remain separate.

## GitHub Actions runtime maintenance

After `e6e042a` was pushed, the maintainer reported Node 20 deprecation annotations in approval and extension jobs. Both workflows now use checkout v6, setup-node v6, setup-python v6, upload-artifact v6, and download-artifact v7, verified against their upstream action.yml Node 24 declarations. Node 22 remains the project build version; Python 3.12, native runners, artifact layout and publication approval are preserved. GitHub-hosted runners must provide the modern action runner required by these actions. A fresh workflow run from the new commit is required; rerunning an old run uses its old workflow revision. Local make check passed (85 TypeScript, 26 Python, 11 Rust; one graphical exclusion) and both workflow YAML files parsed. See VALIDACION.md. No release/tag is created by this maintenance.

## Windows Python test correction

The maintainer supplied Windows CI logs: all 15 server tests passed, but the new Linux package fixture failed because Windows chmod/stat does not provide POSIX executable bits. Restrict the Linux content/permission test to Linux (explicit skip on Windows/macOS), keeping malformed/wrong-architecture ELF headers and missing/ambiguous package tests portable. The production Linux permission gate is unchanged. FastAPI's httpx deprecation warning was not the failing assertion; dependency migration is separate work. Local make check passed (85 TypeScript, 27 Python, 11 Rust; one graphical exclusion), with all three package tests passing on Linux. A fresh Windows CI run remains necessary; Linux validation does not establish a Windows pass.

## macOS engine-path test race correction

After `ebec02c`, the maintainer supplied macOS logs: two parallel engine-path tests failed while resolving and removing temporary fixtures. The test helper used PID plus wall-clock nanoseconds with create_dir_all, so equal clock readings could silently share a directory. Replaced it with an atomic counter and exclusive create_dir, retrying AlreadyExists. Added regressions for pre-existing paths and 16 concurrent fixture reservations. Production path resolution and engine lifecycle are unchanged. Standalone tests passed, including 50 parallel suite runs; local make check passed (85 TypeScript, 27 Python, 13 Rust; one graphical exclusion). A native macOS Actions run is still required to confirm the reported platform failure is resolved.

## Current work

The maintainer requires English for all digital products: UI, errors, tools, documentation, and release notes. Conversation with the maintainer remains Spanish. English migration is ready for candidate validation as **0.6.0** on base `97cb754`. Persistent identities, legacy filenames/entry points, backups, and multilingual user content are preserved. English becomes the new-install recognition default; existing saved language choices remain intact.

The maintainer approved ten priority speech languages: English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, Urdu. Shared deterministic phrase/punctuation support and API/Unicode/backup tests cover them; additional existing recognition options are retained. See [LANGUAGES.md](LANGUAGES.md) for exact grammar and limitations. Real microphone/recognition quality and native-speaker phrase review remain pending; do not claim all ten languages or platforms validated from mocks.

The migration is saved in its version commit after local checks. Compare this record with `git status`, HEAD, tags, and Actions when resuming. Historical evidence is translated and retained in [VALIDACION.md](VALIDACION.md); documentation edits do not revalidate old artifacts.

## Recent release and signing context

- `0741fc6461d89cd336336a07804f27ddf23efc00` / `v0.4.1` fixed macOS shortcut tests and a 15-second UI timeout. `v0.4.0` remains on `0b32242`.
- Some Codex and external terminal pushes failed with server-side `fatal error in commit_refs_rules`, even without `--atomic`. The user had no repository rules. Later external pushes succeeded; no definitive cause was established and no rules or tags were bypassed/moved.
- `fedf95e` saved resume context. `e9ca724` introduced **0.5.0** release automation and was pushed to main. `f374492` added the public privacy policy; `97cb754` standardized README/policy language and recorded the maintainer's preference.
- The user reported candidate builds passed with publish correctly skipped, then confirmed releases were available. This session has not independently audited those artifacts or installation behavior.
- Publication approval is **Actions → GOSU Speech to Text release candidates → Run workflow → main**, enable `publish`, exact version. Without that input, candidates only. All native builds must succeed before the same-run assets are checked, annotated tag created, draft uploaded, and release published. No PAT is required; only the publishing job requests `contents: write`.
- Publication does not sign packages. The user has neither Apple Developer credentials nor a Windows signing provider yet, and chose to focus on Windows. SignPath Foundation declined the application for insufficient public trust/visibility; no signing service is configured. Public privacy URL: https://github.com/jansanchez/gosu-speech-to-text/blob/main/PRIVACY.md . Do not claim signed packages or SignPath sponsorship before approval. No service accounts/certificates were purchased or submitted by the agent.
- Prepare a new version rather than replacing previously published releases. Do not create/push `v0.6.0` merely for migration work; the approved Actions flow creates it when explicitly requested.

## Next steps

1. Local migration review and full checks passed: npm checks/builds, 24 Python tests, 11 Rust tests (one graphical exclusion). See VALIDACION for exact scope. Review the new commit on Actions and generate candidates without publish.
2. Review current Checks/candidate runs for the concrete commit on [Actions](https://github.com/jansanchez/gosu-speech-to-text/actions). Historical 0.4.0 macOS logs in Downloads are not evidence about newer versions.
3. Generate unsigned candidates without publish, inspect the English UI including narrow minimal windows and RTL drafts, and validate the ten-language recordings with real speakers. Mocks establish contracts/Unicode behavior only.
4. Clean-install each native package without development toolchains. Validate startup/parent exit, permissions, customizable shortcuts/conflicts, microphone, target focus, clipboard, and insertion without Enter. Preserve text/audio after errors.
5. SignPath Foundation declined the application for insufficient public visibility. Obtain paid service/certificate details or reapply after adoption grows before integrating Windows signing. Sign inner application/engine and final installer as appropriate, verify signatures, then hash final bytes. Signing does not guarantee immediate SmartScreen reputation. macOS signing/notarization remains a separate credential-dependent task.
6. Retain pending X11/GNOME/KDE portal validation, application-specific tests (terminal/Codex, WhatsApp, Google Docs/ChatGPT), RAM/CPU measurements, screen-reader audits, and dependency review. Earlier audit had two high npm advisories; do not apply a forced Transformers major upgrade without WASM/cache/model/extension review.

## Current functional contract

| Default shortcut (Cmd on macOS) | Action |
|---|---|
| Ctrl+Shift+M | Switch editor/minimal panel |
| Ctrl+Shift+H | Hide/restore current view |
| Ctrl+Shift+Space | Start/stop dictation |

All three are configurable independently from first use, persisted, checked for collisions, and restored on conflict. Startup opens the editor. Hiding retains view and does not stop recording/model processing. Returning to the editor stops minimal capture and cancels automatic insertion while preserving work.

Each minimal session has an independent draft. It can start with GOSU focused; target capture happens at stop before awaiting final chunks. Completed text is saved/copied before attempted insertion. Failure to identify/paste does not prevent copying; clipboard failure preserves the draft and reports failure. Never automatically press Enter. The panel remains available for consecutive sessions and is positioned roughly 15% above the bottom of the screen without repositioning on every recording. RAM/CPU and automatic unloading remain unimplemented/unmeasured.

Hyprland waits for window mapping and recognizes `gosu-speech-to-text` / `org.voz.prototype`, rejecting ambiguity/self-targets and resizing explicitly on return to the editor. Its shortcuts are temporary; no permanent compositor settings are changed. Linux bridge flags: `--show-minimal`, `--toggle-visibility`, `--toggle-minimal`. Generic Wayland portals use the focused field without identifying the application.

Historical real evidence: isolated GTK/WezTerm Unicode insertion without Enter and editor → panel → hide → restore → editor on Linux/Hyprland 0.57.0. WezTerm used `--skip-config`; these do not validate the personal terminal configuration or every target application. User satisfaction after `make dev` does not replace a detailed microphone/recognition acceptance record. Temporary `/tmp/gosu-validate-paste.py` and `/tmp/gosu-validate-window.py` may disappear and must not be assumed available.

## Resume commands

```bash
git status
make doctor
# Prepared development environment:
make dev
# Full checks:
make check
```

Read [AGENTS.md](AGENTS.md), this file, [ARCHITECTURE.md](ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [acceptance criteria](CRITERIOS-DE-EXITO.md). Do not repeat setup unnecessarily or reuse engines across OS/architectures. Preserve audio → recognition → text plus ID → audio deletion → ID cleanup. Invalid data blocks writes; private content stays in memory. These records contain technical context, not exported dictation.

Codex CLI: `codex resume --last` resumes the most recent session; `codex resume` selects one. A new conversation can read AGENTS and this state, compare Git, and continue. A shutdown ends development processes; do not assume a previous instance is running. FastAPI TestClient may hang in the sandbox; repeat authorized checks outside before diagnosing a product failure.
