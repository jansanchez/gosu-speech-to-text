# GOSU Speech to Text

- When resuming, read [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md) and compare it with Git and current evidence.
- Read `ARCHITECTURE.md` and `CONTRIBUTING.md` before changing storage, audio, or engine lifecycle.
- The project includes React/TypeScript, Tauri/Rust, FastAPI/Python, and an independent Chrome extension. Check shared consumers when changing `src/`.
- Preserve `org.voz.prototype`, `voz-state`, `voz-jobs`, and existing backup formats unless an explicit tested migration is included.
- Keep audio commits in this order: save audio, transcribe, save text and processed ID, delete audio, clear ID. Failures must preserve recoverable work.
- Do not write after loading invalid data or persist private-session content.
- Run `npm run format` and `cargo fmt --manifest-path src-tauri/Cargo.toml`. Generate brand metadata with `npm run brand:sync`; never edit `src/brand.ts` manually.
- Run `npm run check`, `.venv/bin/python scripts/test-python.py`, and the Rust checks in `CONTRIBUTING.md`, or `make check` in a prepared environment. Add regression coverage for data integrity and concurrency changes.
- Distinguish mocked tests from real microphone, recognition, permission, and insertion validation. Do not claim platforms or languages validated without testing them.
- Communicate with the maintainer in Spanish. Product UI, messages, tooling, documentation, and release notes must be English for a worldwide audience. This preference also applies to the maintainer's future digital products. Preserve multilingual user content and speech phrase data; recognition language is independent of interface language.

## Portability and acceptance

- Use `BUILD-AND-RELEASE.md` as the build contract and `CRITERIOS-DE-EXITO.md` as the acceptance gate. Keep the README, platform guides, scripts, and CI consistent when requirements or commands change.
- Package Tauri and Python on the same target OS and architecture. Cross-checking Rust does not establish compatibility. Preserve lockfiles and separate Intel/ARM artifacts.
- Keep shortcuts configurable from first use and preserve text after insertion failures. Never add automatic Enter. Treat permissions and conflicts as recoverable states.
- Record commit, OS/architecture, command, result, and remaining work. Mock tests and configured CI matrices are not evidence of real installation.
- Do not publish/sign releases or change desktop shortcuts merely because documentation or packages are being updated.

## Versioning

- Follow SemVer and [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md). Record features/fixes in [CHANGELOG.md](CHANGELOG.md).
- Group features into minor versions and fixes into patches; do not tag every commit. Edit `brand.json`, run `npm run brand:sync`, and retain coherent lockfiles.
- Before tagging, run checks and `npm run release:check`; use annotated `vX.Y.Z` tags on the version commit with a clean tree. Never move/overwrite tags. Distinguish local tags, pushed tags, candidates, and published releases.
- Publish approved versions through Actions with `publish` and the exact version from main. This creates the tag and release only after all checks and builds pass. Without explicit approval, generate candidates only. CI passing does not replace real installer acceptance.
