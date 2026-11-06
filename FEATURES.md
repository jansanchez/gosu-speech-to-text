# Feature matrix

These statuses describe implemented code, not cross-platform certification. [VALIDACION.md](VALIDACION.md) records executed checks.

| Feature | Desktop | Independent Chrome extension |
|---|---|---|
| Local chunked dictation | Bundled Faster Whisper engine | Whisper tiny WASM |
| Interface | English | English |
| Recognition languages | 32 named languages plus automatic detection; API supports additional Whisper codes | Same visible language options |
| Priority speech languages | English, Mandarin, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, Urdu | Same shared phrase sets |
| Explicit correction | Documented replacement/deletion/paragraph/list phrases, selection-aware | Shared deterministic editing with manual selection |
| Undo/redo | Versions and grouped manual typing | Dictation/editing history |
| Voice selection and numbered ambiguous replacements | Selection and choice normalization for priority languages; buttons | Requests manual selection |
| Free-form editing/translation | Optional local Ollama, reviewable suggestions | Not implemented |
| Voice confirmation/cancel | Shared control aliases | Controls supported by the recorder |
| Confirmed learning | Save/forget explicit replacements | Manual rules |
| Fillers/dictionary | Manual, undoable | Manual |
| Spoken punctuation | Optional phrase sets for the ten priority languages | Same shared implementation |
| Recognition review signals | Last-chunk markers, click to select | No invented confidence values |
| Workspace, titles, tags, favorites | Yes | One active draft with history |
| Join/split drafts | Yes | Not implemented |
| Snippets | Buttons and priority-language voice insertion | Buttons |
| Plain search | Draft text, titles, tags | No multi-draft workspace |
| Semantic search | Optional Ollama, up to 300 drafts | Not implemented |
| Recoverable audio | IndexedDB with processed-ID deduplication | Same protocol |
| Play pending audio | Yes | Not implemented |
| Import audio | Decodable formats, 40 MB/30 minutes | Same limits |
| Private session | Memory only, no autosave | Memory only |
| Backups | Plain or password-encrypted AES-GCM | Desktop-compatible active-draft backup |
| Restore | Workspace, history, settings, snippets | Active draft, history, settings, snippets |
| Old-draft cleanup | Explicit confirmation; preserves favorites/pending audio | Manual clearing |
| Read aloud | System voices reported as local | Same |
| Accessibility | Contrast, editor size, adjustable threshold, optional sound | Contrast and browser controls |
| Minimal views/visibility | Three independently configurable shortcuts | Recorder's own flow |
| Clipboard/insertion | Copy before attempted insertion; no Enter; recoverable failures | Compatible browser fields |
| Windows insertion | Adapter included; repeat acceptance for current release | Compatible browser fields |
| X11/macOS insertion | Adapters included; tools/permissions/real validation required | Compatible browser fields |
| Wayland | Hyprland or compatible authorized portals; manual paste fallback | Inside browser |
| Releases | Native build matrix; approval enables tag/publication | Generated extension ZIP |

[MINIMAL-MODE.md](MINIMAL-MODE.md) describes integration limits. Real Windows, X11, GNOME/KDE, and macOS validation remains necessary.

## Still outside the implemented scope

- Provisional word streaming and stable review anchors across arbitrary edits; the UI presents completed chunks and last-chunk signals.
- Full external-editor cursor tracking and synchronized editing. Minimal mode inserts at completion; it does not track external manual edits.
- Per-language confidence calibration, real-speaker evaluation of all ten priority languages, and NVDA/VoiceOver audits. Deterministic phrase tests do not establish natural-language fluency or recognition accuracy.
- Every possible command translated into every recognition language: phrase grammars are explicit and limited; only the documented phrase grammar is supported.
- Google Drive OAuth, automatic synchronization/conflict merging, cross-device keys. Encrypted backups support manual file transfer.
- Phone-as-microphone pairing and secure transport.
- Encrypted internal history with application locking; current encryption protects exported backups.
- Bundled Ollama/text-model installation; this remains optional and separate.
- Signed updater, consent-based quality telemetry, and a universal Wayland adapter.
- Contextual per-application permissions, independent project dictionaries, and external task automation.

Do not present the full product vision as delivered. See the acceptance criteria before broadening claims.
