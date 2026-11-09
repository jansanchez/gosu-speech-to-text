# Changelog

Versions follow [SemVer 2.0.0](https://semver.org/). A Git tag identifies exact source; it does not certify installation or compatibility on untested platforms.

## Unreleased

- Restrict Linux package permission/content tests to Linux hosts; retain portable invalid-ELF and package-selection checks on Windows/macOS.

- Updated GitHub Actions to Node 24 action runtimes in checks and release workflows; the application build remains on Node 22.

- Added an English Linux installation guide, explicit candidate compatibility matrix, and clean-install acceptance procedure for DEB/AppImage distribution.
- Added CI inspection of Linux candidate package structure, version/architecture, bundled engine/runtime/audio library, desktop entry, and hashes. This does not certify installation or desktop integration.

## [0.6.0] — 2026-11-06

### English product and multilingual speech

- Migrated desktop/Chrome interface, diagnostics, permission descriptions, tools, documentation, and release notes to English.
- English is the default recognition language for new installations. Existing saved recognition languages, user content, storage identities, and backup formats are retained.
- Prioritized English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, and Urdu without removing other recognition options.
- Added shared basic control/editing phrases and spoken punctuation for the ten priority languages, Unicode-aware matching, and non-Latin sentence boundaries. Retained Spanish command compatibility.
- Added deterministic language/API/backup regressions. These do not establish real recognition accuracy, native-speaker phrase review, or platform installation; see [LANGUAGES.md](LANGUAGES.md).

## [0.5.0] — 2026-11-05

### Release automation

- Approval in Actions followed by annotated tagging and release publication after all checks/builds, with six packages and SHA256 manifest.
- Installer checksum verification, platform/architecture filenames, and exclusion of internal runtime files.
- Reject mismatched versions, tags on another commit, existing releases, and incomplete artifacts. Upload through a draft before publication.
- Tag pushes and runs without approval remain candidate-only. Automation does not establish installation, microphone, permission, or signing validation.

## [0.4.1] — 2026-11-05

### Cross-platform validation fixes

- Explicit Linux/macOS shortcut migration tests: CommandOrControl maps to Control on Linux and Cmd/Super on macOS, where Control remains distinct.
- TypeScript file deadline raised to 30 seconds after the full UI file reached 15 seconds on macOS Intel, retaining every test and a finite deadline.
- No application logic change. `v0.4.0` remains immutable; 0.4.1 candidates require their own build/validation.

## [0.4.0] — 2026-11-05

### Features

- Minimal dictation with microphone level, independent drafts, and copying before attempted insertion.
- Three configurable view/visibility/dictation shortcuts, preference migration, and conflict recovery.
- Native insertion/permission adapters, Hyprland and Wayland portals, text preservation on errors, and no automatic Enter.
- Native Python/Tauri packaging and cross-platform release candidates.

### Fixes and maintenance

- Resolve private PyAV/wheel dependencies during AppImage packaging.
- Normalize Linux/Windows line endings; improve minimal window and focus handling.
- Centralize version metadata in brand.json, synchronize manifests/lockfiles, and check tags/changelog in CI.
- Local checks passed and a diagnostic 0.3.2 AppImage was built before the version increment. It is not a 0.4.0 installer; rebuild from the version tag.
- Clean installation and microphone/recognition/permission/insertion acceptance remain platform-specific; see [VALIDACION.md](VALIDACION.md).

## Earlier versions

Earlier source declared 0.3.2, but no local/remote tags were found during consolidation. No retrospective tags or assumed public release for every historic commit are introduced.
