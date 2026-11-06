# Resume state — 2026-11-06

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
- Publication does not sign packages. The user has neither Apple Developer credentials nor a Windows signing provider yet, and chose to focus on Windows. SignPath Foundation was suggested as an application-based free OSS option; it has not been approved/configured. The user was filling its form. Public privacy URL: https://github.com/jansanchez/gosu-speech-to-text/blob/main/PRIVACY.md . Do not claim signed packages or SignPath sponsorship before approval. No service accounts/certificates were purchased or submitted by the agent.
- Prepare a new version rather than replacing previously published releases. Do not create/push `v0.6.0` merely for migration work; the approved Actions flow creates it when explicitly requested.

## Next steps

1. Local migration review and full checks passed: npm checks/builds, 24 Python tests, 11 Rust tests (one graphical exclusion). See VALIDACION for exact scope. Review the new commit on Actions and generate candidates without publish.
2. Review current Checks/candidate runs for the concrete commit on [Actions](https://github.com/jansanchez/gosu-speech-to-text/actions). Historical 0.4.0 macOS logs in Downloads are not evidence about newer versions.
3. Generate unsigned candidates without publish, inspect the English UI including narrow minimal windows and RTL drafts, and validate the ten-language recordings with real speakers. Mocks establish contracts/Unicode behavior only.
4. Clean-install each native package without development toolchains. Validate startup/parent exit, permissions, customizable shortcuts/conflicts, microphone, target focus, clipboard, and insertion without Enter. Preserve text/audio after errors.
5. Complete SignPath application and obtain service details before integrating Windows signing. Sign inner application/engine and final installer as appropriate, verify signatures, then hash final bytes. Signing does not guarantee immediate SmartScreen reputation. macOS signing/notarization remains a separate credential-dependent task.
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
