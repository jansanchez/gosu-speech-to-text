# GOSU Speech to Text architecture

## Dictation flow

1. `Capture` in `src/audio.ts` uses an AudioWorklet and emits WAV chunks at pauses or after 18 seconds.
2. `useAudioQueue` saves each chunk to IndexedDB before sending it to the engine.
3. `transport.ts` uses IPC on desktop and HTTP in web development; Rust talks to FastAPI over loopback.
4. Python validates WAV input and runs Faster Whisper under an inference lock.
5. The UI commits text with the processed chunk ID, then deletes the corresponding audio.

Preserve `org.voz.prototype`, `voz-state`, and `voz-jobs`. Renaming product text must not rename persistent identities or protocols.

## Responsibilities

| Module | Responsibility |
|---|---|
| `src/App.tsx` | Editor coordination and screen composition |
| `src/components/` | Editor, workspace, and settings dialog |
| `src/hooks/useWorkspace.ts` | Validated loading, local state, and autosave |
| `src/hooks/useAudioQueue.ts` | Audio ordering, persistence, and recovery |
| `src/hooks/useEngine.ts` | Connection, diagnostics, and restart |
| `src/hooks/useGlobalShortcuts.ts` | Ordered shortcut registration and removal |
| `src/hooks/useMinimalDictation.ts` | Independent minimal sessions, target capture, completion, and insertion |
| `src-tauri/src/minimal.rs` | Minimal window and platform adapter selection |
| `src-tauri/src/hyprland.rs` | Hyprland targets and shortcuts |
| `src-tauri/src/portal.rs` | Authorized Wayland shortcuts and keyboard input |
| `src/validation.ts` | Shared workspace, preference, and backup validation |
| `src/persistence.ts` | Serialized immutable writes and saved status |
| `src/history.ts` | History limits and grouped manual typing |
| `src/jobs.ts` | Recoverable audio contracts and validation |
| `src/product.ts` | Shared settings, language selection, and backups |
| `src/speech.ts` | Multilingual speech phrases, control aliases, and punctuation |
| `src/core.ts` | Deterministic editing, cleanup, and WAV encoding |
| `src/extension-state.ts` | Chrome draft validation and migration |
| `src-tauri/src/engine.rs` | Python process, handshake, monitoring, and restart |
| `server/` | Recognition and optional local Ollama functions |

Chrome shares capture, deterministic editing, preferences, history, and backups but runs its own WASM recognizer without Python. Its controller is `extension/recorder.js`; runtime tests replace only devices and recognition. Interface language is English independently of recognition language. Existing saved recognition languages and user text are retained.

## Development and production profiles

Production retains `org.voz.prototype`, its existing storage directories, IndexedDB keys, and backup formats. The supported `npm run desktop` development command applies `tauri.dev.conf.json` with `org.voz.prototype.dev`; debug builds also select that identity in Rust before Tauri creates windows or resolves paths. The development window title includes `(Development)`. The CLI overlay supplies the development identifier to build-time platform metadata as well as runtime configuration.

On Linux, default application data/log roots are `~/.local/share/org.voz.prototype` for production and `~/.local/share/org.voz.prototype.dev` for development (subject to XDG overrides). Tauri resolves corresponding app-specific paths on Windows/macOS. The Linux shortcut control bridge also uses a separate development directory; real system shortcut combinations can still conflict and must remain recoverable. Hyprland recognizes both identities as GOSU windows and rejects them as external insertion targets.

Earlier development used a different web origin (`http://127.0.0.1:1420`) inside the production base directory, while packaged builds use `tauri://localhost`. Origins already separated records, but WebKit metadata and logs shared a base profile. No old profile is copied, renamed, reset, or automatically imported. Existing development data remain in the legacy directory; use explicit application backup/export/import when appropriate. New development starts in its own profile. Production reinstalls/updates keep production data; native release and AppImage builds are both production, not independent installations. Recognition model downloads may still share dependency-managed caches; those are not workspace history.

A fresh diagnostic XDG profile working does not prove original-profile corruption or a bundled-WebKit incompatibility. Desktop/runtime acceptance must be recorded separately from configuration tests.

## Storage invariants

- Invalid loaded data blocks autosave; never silently replace corrupted history with empty state.
- Writes use immutable snapshots and retain ordering. An old write cannot mark a newer pending change as saved.
- Autosave groups changes over 20 ms; queue commits and privacy transitions save immediately and await completion.
- Save audio before recognition. Save text with the processed ID before deleting audio.
- If audio deletion fails, retain the processed ID so retries do not duplicate text.
- Remove processed IDs only when their audio is no longer recoverable; never arbitrarily truncate receipts.
- Failed audio writes retain the chunk in memory and stop desktop capture. Unsaved memory-only chunks are lost if the process exits.
- Private session content avoids automatic persistence; private mode does not encrypt previous history.
- Undo/redo history keeps up to 50 entries and about two million characters per stack. Always retain the latest entry, even when oversized.

The complete workspace remains under one key; audio jobs use another. A future per-draft/per-chunk schema requires a versioned migration and renewed recovery tests.

## Engine lifecycle

Rust starts Python with piped input/output. Python returns a JSON connection with a dynamic port and token. Rust accepts a bounded response using HTTP on `127.0.0.1`; startup has a 90-second deadline, independent of the later model download.

On exit, invalid protocol, or timeout, Rust cleans up and exposes the error. Restart engine preserves text and audio; retries are explicit. Each process has a generation, so an old supervisor cannot mutate its replacement's state.

## Integration and evidence limits

Three independently configurable shortcuts switch editor/panel, hide/restore, and start/stop dictation. The selected view is remembered in memory while hidden; startup opens the editor. Showing/hiding does not change capture or cancel insertion. Opening the editor cancels automatic insertion and preserves recoverable work. Stopping leaves the panel available for another recording.

Each minimal dictation has an independent draft. It captures the focused target when stopping, before waiting for final capture/queue completion. It does not poll focus. Confirmed text is saved and copied before insertion. Target-capture failure does not prevent queue completion or copying. Starting while GOSU is focused is supported; a destination is needed only at completion. Opening the editor invalidates pending automatic completion through a session generation. Insertion errors are not automatically retried.

Shortcut registration ownership and the registration chain survive UI reloads in the global WebView context. Hyprland uses a same-user Unix control bridge and waits for window mapping, accepting the historical application identity when WebKit reports another PID. GNOME/KDE use system portals. Generic portals type into the focused field without identifying its application; see [MINIMAL-MODE.md](MINIMAL-MODE.md).

Automated tests substitute inference and devices. Language phrase tests establish deterministic text behavior, not recognition accuracy or fluency. Compiling adapters does not establish permissions, focus, or successful insertion on a real desktop. Repeat manual validation in [VALIDACION.md](VALIDACION.md) before distributing a platform as validated.
