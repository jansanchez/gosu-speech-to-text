# Development and maintenance

See [ARCHITECTURE.md](ARCHITECTURE.md) for responsibilities and recovery invariants. The README and platform guides cover Node 22, Python 3.12, Rust, and native dependencies. Product UI, errors, public documentation, and release notes are written in English; recognition content and command phrase data retain their original languages. Conversations with the maintainer may be in Spanish.

## Checks

```bash
npm run check
.venv/bin/python scripts/test-python.py
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --locked --manifest-path src-tauri/Cargo.toml
cargo test --locked --manifest-path src-tauri/Cargo.toml
# All of the above on a prepared Linux environment:
make check
```

On Windows use `.venv\Scripts\python.exe scripts\test-python.py`. Make installation tests run only on Linux. `npm run format` applies Prettier; `cargo fmt --manifest-path src-tauri/Cargo.toml` applies rustfmt. Generated brand metadata is excluded from Prettier: edit `brand.json` and run `npm run brand:sync` instead of editing `src/brand.ts`.

CI checks pushes and pull requests. Python and Rust cover Linux, Windows, and both macOS architectures. Native installers are built by the release workflow. Configuring a workflow is not evidence that it passed or that a platform works.

## Regression tests

Storage, queue, privacy, and concurrency changes must cover the failure they correct: quota exhaustion, interrupted writes, failed writes/deletions, retries, and reloads. Verify text, recoverable audio, and processed IDs. UI tests mock React/IndexedDB devices and recognition; extension tests run its compiled controller.

TypeScript tests have a 30-second deadline per file; the full UI suite exceeded 15 seconds on a macOS Intel runner. Python suites have a 60-second deadline. In restricted environments, FastAPI TestClient can hang even for an empty API: repeat outside the sandbox before diagnosing an application defect. Do not remove tests or disable checks to hide a timeout.

## Compatibility

- Preserve previous data and migrate missing fields without overwriting existing settings.
- Validate stored and external data before enabling writes.
- Preserve desktop, Chrome, and development-web consumers of shared modules.
- Preserve schemas, application identity, and storage keys unless an explicit, tested migration is included.
- Ollama remains optional and local. Suggestions and learned rules require explicit confirmation.
- Changing UI language must not translate users' drafts or change their saved recognition language.

## Dependency maintenance

The earlier npm audit reported two high-severity entries involving `sharp` and `@huggingface/transformers` 3.8.1. The proposed resolution involved Transformers 4. These affect native image libraries; the browser voice bundle does not remove the repository's dependency debt. Run a fresh audit to establish current status.

Before a major update, test model download/cache, quantization, packaged WASM files, and real Chrome transcription. Do not run `npm audit fix --force` without reviewing the migration.

## Platforms and releases

[BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) is the build contract. Platform guides: [Linux](LINUX-MAKE.md), [Windows](INSTALAR-WINDOWS.md), [macOS](INSTALAR-MACOS.md). `scripts/configurar.py` prepares dependencies and checks the project before `--dev` or `--build`. Build the complete application and engine natively on the same OS/architecture. Record the effective Rust version when validating a candidate.

Apply [acceptance criteria](CRITERIOS-DE-EXITO.md), including installation without development toolchains. `npm run docs:check` checks local links in root Markdown files; it does not validate external URLs, anchors, or instruction accuracy. Keep documentation, scripts, and CI coherent and append evidence without presenting historical results as current.

After preparing version/changelog, uploading the commit, and validating candidates, approve publication in Actions using `publish` and the exact version on `main`. The workflow creates the tag and release only after all checks and builds pass. Publication tests use mocked commands and fixture packages; they do not create real releases. See the build guide for permissions and recovery after a partial draft upload.
