# Installation, updates, and usage

This guide retains its historical filename for existing links. Use [README.md](README.md) and [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md) for current build requirements, [MINIMAL-MODE.md](MINIMAL-MODE.md) for current shortcuts/permissions, and [VALIDACION.md](VALIDACION.md) for the scope of real evidence. Historical 0.3 test counts do not certify current releases.

The source includes Windows/Linux/macOS desktop clients, an independent Chrome extension, local recognition, and native build workflows. The earlier Windows startup fix is included. [FEATURES.md](FEATURES.md) separates implemented behavior from optional models and unfinished capabilities.

## Updating an existing checkout

Export important drafts/backups first. Close GOSU and stop its development terminal with Ctrl+C. For historical 0.3.2 source ZIPs on Windows:

```powershell
$zip = Join-Path $env:USERPROFILE 'Downloads\gosu-speech-to-text-v0.3.2-source.zip'
$update = Join-Path $env:TEMP ('gosu-update-' + [guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $zip -DestinationPath $update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$update\gosu-speech-to-text\scripts\actualizar-windows.ps1" -ProjectPath 'D:\projects\voz'
if ($LASTEXITCODE -ne 0) { throw 'Update failed. Review the output above.' }
Set-Location 'D:\projects\voz'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm installation failed.' }
npm.cmd run desktop
```

For newer ZIPs adjust the filename and extracted root. The updater backs up replaced source files under `.voz-backups`, preserving `.venv`, `target`, model caches, application data, `org.voz.prototype`, and storage keys. To revert source, restore its code backup and run `npm ci`; code backups are not transcript backups.

On Linux/macOS, run the updater from the new extracted source:

```bash
python3 scripts/actualizar.py /path/to/previous/project
cd /path/to/previous/project
npm ci
npm run desktop
```

Add `--dry-run` to inspect affected files first. Updating source does not replace an already installed binary; rebuild/reinstall its full package.

## First setup and packaging

Install Python 3.12, Node 22, stable Rust, and native dependencies from the [build guide](BUILD-AND-RELEASE.md). Windows requires C++ Build Tools/SDK/WebView2. No environment activation or manual engine token is needed on desktop.

```powershell
py -3.12 scripts/configurar.py --dev
# After closing development:
py -3.12 scripts/configurar.py --build
```

```bash
python3.12 scripts/configurar.py --dev
# After closing development:
python3.12 scripts/configurar.py --build
```

On Arch, `uv python install 3.12` and `uv run --python 3.12 --no-project python scripts/configurar.py --dev` can provide the required interpreter without replacing system Python. The helper prepares dependencies and checks the project; it does not elevate privileges or change global system configuration.

Build natively on each OS/architecture. Output under `src-tauri/target/release/bundle/`: Windows `nsis/*.exe`, Linux `appimage/*.AppImage`/`deb/*.deb`, macOS `macos/*.app`/`dmg/*.dmg` separately for ARM64 and Intel. `make bundle` builds Linux packages; the low-level route is `npm run desktop:build -- --bundles deb,appimage -- --locked`.

Public Linux builds use Ubuntu 22.04; Arch builds may require newer glibc. Installers include Python; users need applicable system components but no Rust/Node/Python development tools. Initial Whisper weights are downloaded and cached. Signing/notarization require separate setup and are not established by packaging alone.

## First dictation

Wait for Engine ready. Resolve recovered chunks with Retry; desktop can play pending audio. Select your recognition language, dictate, and pause. Review marked words; signals are heuristic, not calibrated probabilities. Copy/paste after review. GOSU never automatically submits text or presses Enter.

| Shortcut | Action |
|---|---|
| Ctrl+Shift+Space | Configurable start/stop; minimal mode copies and attempts insertion on stop |
| Ctrl+Shift+M | Configurable editor/panel switch |
| Ctrl+Shift+H | Configurable hide/restore with view preserved |
| Ctrl+Alt+D | Start dictation or stop active capture |
| Ctrl+Alt+E | Start correction or stop active capture |
| Ctrl+Alt+C | Copy draft |
| Ctrl+Alt+V | Request paste in the active window |

On macOS the configurable defaults use Cmd; fixed shortcuts use Control+Option. Conflicts are reported and buttons remain available. See [minimal mode](MINIMAL-MODE.md) for focus, target selection, and permissions.

## Languages and corrections

The interface is English; recognition is independent. English is the default for new installations. Existing saved language settings are preserved. The ten priority languages are English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese, Russian, and Urdu. Other existing recognition options remain available. [Language guide](LANGUAGES.md) lists explicit supported phrases and validation limits.

Select Correct or press Ctrl+Alt+E. One command is captured as one chunk, then that capture stops. English commands include:

- “replace tomorrow with Thursday”, “delete last sentence”, “delete selection”, “new paragraph”, “make it a list”.
- “select tomorrow” selects a unique occurrence; “option one”, “option two” resolve ambiguous replacements. Buttons/manual selection remain available.
- “undo”, “redo”, “copy text”, “paste text”, “read text”, “stop reading”.
- “insert snippet greeting”; “confirm change”, “cancel change”; “remember correction”.
- “mark favorite”, “remove favorite”, “new draft”, “dictation mode”, “correction mode”.

Spanish commands remain compatible. Basic controls and editing phrases are available for all ten priority languages; grammars are deliberately limited and not arbitrary natural language. Desktop selection, snippet insertion, and numbered ambiguity use the documented priority-language phrase grammars. Commands are interpreted in Correct mode: normal dictated text containing “copy” is not automatically executed.

Ambiguous corrections present choices or request selection. Undo/redo also have buttons. Manual typing is grouped to avoid storing one history entry per keystroke.

## Optional local editing and semantic search

Dictation and deterministic commands do not need Ollama. For free-form requests such as “make it shorter” or “translate into English”:

1. Install Ollama from https://ollama.com/download. It is separate from GOSU's base installer. On Linux see https://docs.ollama.com/linux or your distribution package. Start its app/service or keep `ollama serve` running.
2. Download compatible local models:

```bash
ollama pull qwen2.5:1.5b
ollama pull bge-m3
ollama list
```

3. In Tools, settings, and backups → Local natural editing, enable local suggestions and choose the model; `qwen2.5:1.5b` is an entry-level default, not a claim of equal quality in all languages. `bge-m3` is the default search model.
4. Select text to limit the edit. Dictate a request in Correct mode or type it in Enter an editing request.
5. Review Before/Suggestion. Confirm by button or “confirm change”; edits made while the suggestion was pending cannot be silently overwritten.

GOSU connects only to `127.0.0.1:11434` and rejects models reported as remote/cloud. Models need downloading before offline use. Quality/speed vary by machine, model, and language; review names, numbers, and negations. Choose another compatible local model when needed.

Semantic search uses up to 300 drafts and their first 4000 characters, returning 20 results. Embeddings are cached in engine memory, without a permanent index or cloud upload. Initial requests may take longer. Similarity scores are not accuracy percentages.

## Personal rules, snippets, and workspace

After an explicit replacement, Remember this correction saves a personal rule only on confirmation. Manage rules in Tools; fillers are removed only when explicitly configured in Cleaned mode. The application does not infer permanent preferences from a conversation. Named snippets support buttons and the documented voice grammar. Draft titles/tags/favorites participate in normal search. Joining preserves the source draft; splitting uses the cursor and creates another draft. Age cleanup requires confirmation and preserves favorites and pending audio; it is not an automatic deletion task.

## Privacy, backups, and accessibility

Private session opens a temporary in-memory workspace and restores the previous one on exit. New private content avoids normal IndexedDB persistence. Switching is blocked during active capture/import/pending audio. This does not guarantee forensic erasure of memory/swap/system logs or files explicitly exported.

Full backups include text, history, settings, and snippets, excluding pending audio and engine tokens. Without a password they are readable JSON. Passwords of at least 10 characters enable AES-GCM/PBKDF2-SHA256; forgotten passwords cannot be recovered. Maximum plaintext content: 20 MB. Normal internal history has no application encryption. You can transfer an encrypted backup using Drive/Dropbox, but this does not implement OAuth, automatic synchronization, or conflict resolution.

Read aloud uses voices reported as local by the platform; install a system voice if unavailable. Import recording accepts formats the WebView can decode, limited to 40 MB/30 minutes; conversion produces mono 16 kHz WAV chunks of up to 18 seconds in the recoverable queue. Session switching is blocked during import. Compressed audio can require substantial decoded memory. Convert unsupported formats to WAV or split large recordings.

Tools includes high contrast, editor size, microphone threshold, and optional stop sound. Buttons, visible focus, and labels remain available. Real NVDA/VoiceOver and ten-language speaker audits remain pending. See [PRIVACY.md](PRIVACY.md).

## External insertion and Chrome

Earlier Windows 0.2.1 plus hotfix was user-confirmed; repeat acceptance for current releases. X11 needs `xdotool`/`xprop`, verifies focus, and uses Ctrl+Shift+V for detected terminals. Wayland needs Hyprland or authorized compatible portals; generic portals cannot identify the application. macOS uses System Events/osascript and may require Accessibility/Automation permission. Failed insertion preserves copied text. See [MINIMAL-MODE.md](MINIMAL-MODE.md) for all limits.

```bash
npm ci
npm run extension:build
python3 scripts/package-extension.py
```

On Windows use `py -3.12 scripts/package-extension.py`. Load `extension-dist/` via `chrome://extensions` → Developer mode → Load unpacked. The generated ZIP has a root manifest suitable for store submission, which separately requires a developer account, listing, privacy policy, and review. Compiled files are not kept in Git.

Focus the destination, open GOSU's extension icon, load the model in its recorder tab, dictate, review, and insert. The extension supports recoverable audio, manual rules/snippets, private sessions, and encrypted backups. Desktop restoration imports only the active draft/settings/snippets, not the full multi-draft workspace. Simple input/textarea/contenteditable are supported; changed/password/structured destinations are rejected. Use Copy for Google Docs or unsupported editors. Free-form Ollama editing and semantic search are desktop-only. Real Chrome model/device/permission validation is still required.

Preserve the extension identity and directory when updating, or export before reinstalling. Chrome Web Store assigns the store identity.

## Release handling

Do not upload `.venv`, `node_modules`, generated engines, `target`, or historical `ready` output to Git. Retain licenses/notices. The workflow builds native installers and Chrome ZIP; publication requires explicit `publish` approval and the exact version from main. Review [BUILD-AND-RELEASE.md](BUILD-AND-RELEASE.md), hashes, and clean-install acceptance before distributing. No signing/store credentials are bundled in the source.
