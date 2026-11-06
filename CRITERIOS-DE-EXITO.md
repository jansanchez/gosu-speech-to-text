# Acceptance criteria

These criteria gate every change and release candidate. CI configuration expresses what should run; [VALIDACION.md](VALIDACION.md) records what actually ran. Linux results do not certify Windows or macOS.

## Reproducible builds

- **B1 — Environment:** record commit, OS/architecture, Node 22, Python 3.12, and Rust/Cargo versions. Use `npm ci`, `Cargo.lock` with `--locked`, and repository Python requirements. Record actual versions as stable toolchains and runners evolve.
- **B2 — Checks:** approve formatting, documentation links, TypeScript tests, web/extension builds, both Python suites, `cargo fmt`, `cargo check`, and `cargo test`. Never remove tests to obtain a green result.
- **B3 — Native package:** generate documented packages natively on the target OS/architecture, including the complete engine. Retain logs, artifacts, and final installer SHA256 hashes.
- **B4 — Clean installation:** install without Python/Node/Rust development tools, launch from the menu and a path with spaces, verify engine startup and termination when the app closes. Initial model loading may need network/storage.

## Dictation and accessibility

- **M1 — First use:** Ctrl/Cmd+Shift+M switches editor/panel, Ctrl/Cmd+Shift+H hides/restores the selected view, and Ctrl/Cmd+Shift+Space starts/stops dictation and inserts without hiding. Verify two consecutive sessions and hide/show during capture. Conflicts and permission denials must explain recovery and permit another shortcut.
- **M2 — Settings:** configure, save, use, and persist all three shortcuts independently. Reject equivalent combinations; conflicts restore/preserve previous settings. Reloads must not duplicate registrations or remove another application's shortcuts.
- **M3 — Audio:** display real microphone activity and capture/processing/error states. Recover after denied permission or disconnection. Do not report completion with pending audio.
- **M4 — Destination:** switch applications/fields while recording; select the target on stop. Insert only the new session once, preserving Unicode and line breaks. Copy the whole dictation even if target identification/insertion fails. Clipboard failure preserves the draft without claiming success. Starting while GOSU is focused must not require a prior target. Never simulate Enter or automatically submit/execute text.
- **M5 — Applications:** test an agent terminal, WhatsApp field, and Google Docs, recording application/version/result. Unsupported insertion preserves text and offers Copy.
- **M6 — Desktops:** repeat focus/capture/insertion on Windows, macOS, Linux X11, Hyprland, and supported Wayland portals. A generic portal uses the focused field without identifying its application: record that limitation and granted permissions.
- **M7 — Languages:** maintain an English interface independently of recognition language. For English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, and Urdu, test language forwarding, Unicode preservation, documented command phrases, punctuation, backups, and RTL display. Mocked text tests do not prove recognition quality. Record real-speaker recordings, model/device, errors, and limitations before claiming a language validated.

## Integrity and maintenance

- **D1 — Recovery:** disk, recognition, and deletion failures permit retry/reload without losing recoverable audio or duplicating committed text. Preserve audio → recognition → text plus ID → audio deletion → ID cleanup.
- **D2 — Privacy:** private sessions remain in memory; invalid data cannot be overwritten automatically. Do not publish logs containing audio, text, tokens, or unnecessary personal paths.
- **D3 — Compatibility:** preserve storage identities and existing backups or provide tested migration. Keep documentation and criteria coherent with contract changes.
- **D4 — Shutdown and errors:** close/cancel without orphaned processes, preserve recovery, and report permissions, engine, model, and destination failures.

## Evidence by artifact and platform

Record one row per concrete artifact/desktop. Status is **pending**, **passed**, **failed**, or **not applicable with reason**. Omitted criteria remain pending.

| Commit / artifact / SHA256 | OS / architecture / desktop | B1–B4 | M1–M7 | D1–D4 | Evidence and remaining work |
|---|---|---|---|---|---|
| Fill when validating | Exact versions | Status by criterion | Status by criterion | Status by criterion | CI logs, manual tests, and limitations |

A change needs relevant acceptance and common checks. A release additionally needs clean installation and real validation of its exact artifact. Mocked tests do not replace microphone, permissions, target focus, insertion, or language accuracy tests.
