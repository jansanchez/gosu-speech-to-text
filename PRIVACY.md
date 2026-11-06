# Privacy Policy — GOSU Speech to Text

Last updated: November 6, 2026.

Resumen en español: GOSU procesa el reconocimiento en tu dispositivo y guarda datos locales para edición y recuperación. Puede descargar modelos y utilizar Ollama local de forma opcional. Copiar, insertar o exportar entrega el contenido al destino elegido. El modo privado evita el guardado automático de esa sesión, pero no borra datos anteriores ni copias externas. Las secciones siguientes detallan el alcance de esta política.

This policy describes the desktop application and the companion Chrome extension maintained in the [GOSU Speech to Text repository](https://github.com/jansanchez/gosu-speech-to-text). It describes the project's current implementation; it does not cover independently modified versions or the privacy practices of other applications you use with GOSU.

## Local processing and information used

GOSU processes microphone recordings and audio files you choose to import to produce text. Speech recognition runs on your device: in the bundled local engine for the desktop application, or in the browser for the Chrome extension. GOSU does not send your recordings or transcripts to a transcription service operated by the project maintainers.

The application also uses the preferences you configure, such as language, microphone selection, shortcuts, vocabulary and editing settings. It may store drafts, original transcripts, editing history, titles, tags, favorites and reusable text snippets on your device to provide its editing and recovery features.

No GOSU account is required. The project does not operate a service that collects users' recordings, transcripts or usage profiles. The application code does not implement advertising, behavioral analytics or automatic submission of crash reports to the maintainers. This is not a guarantee that the operating system, browser or every third-party library has no diagnostic or network activity of its own.

## Local storage, audio recovery and retention

Outside private mode, the desktop interface stores its workspace and preferences in local application storage, including IndexedDB. The Chrome extension uses extension-local storage and IndexedDB. This is not a cloud backup or synchronization service provided by GOSU.

Audio fragments waiting for transcription may be saved locally together with the information needed to recover the work. Once the resulting text and processing receipt have been saved successfully, GOSU attempts to delete the processed audio. Failures can leave recoverable fragments on the device until you retry or remove them. Closing the application does not necessarily remove pending audio or saved drafts.

Saved content remains until you remove it through the available controls or clear the relevant application/browser storage. The desktop's old-draft cleanup is an action you invoke, using the configured age threshold; it preserves favorites and drafts with pending audio. It is not a guarantee that all content expires automatically after a fixed number of days.

Normal workspace storage is not encrypted by GOSU. Access also depends on your device, operating-system account, browser profile, disk protection and any backup or synchronization tools you use.

## Private mode

Private mode keeps the private session's content in memory instead of automatically saving it to the normal workspace or audio queue. It does not erase or encrypt previously saved data, and it does not provide a separate security boundary from the operating system or other software on the device.

Private mode does not prevent explicit actions such as copying, inserting text into another application or exporting a file. Clipboard history, destination applications, system memory management and backups are outside GOSU's private-mode storage controls.

## Network connections and third parties

- **Model downloads:** the desktop engine and Chrome recognizer may contact Hugging Face and its download infrastructure to obtain model files. Models are cached locally for reuse. Download providers receive ordinary connection information, such as your IP address and the requested model files. A model download is separate from local recognition and does not require uploading your dictation.
- **Optional Ollama features:** when you use local rewriting or semantic search, GOSU sends the relevant text, instructions, search query or selected document text to an Ollama service on `127.0.0.1`. GOSU rejects models identified by that service as remote/cloud models. Installing or downloading Ollama models and the behavior of a separately configured Ollama installation are outside the project's control.
- **Read aloud:** when you request speech playback, GOSU passes the text to a voice reported as local by the browser or embedded webview. Its availability and implementation depend on the platform.
- **Repository and downloads:** visiting the project's GitHub pages, downloading releases, or voluntarily opening an issue involves GitHub and its own privacy practices. Application stores, signing providers and operating-system security checks may also operate under their own policies.

GOSU does not sell your recordings or transcripts and does not use them to train a model operated by the project. An installation with downloaded models can perform recognition locally, but the project does not promise that every dependency, optional feature or platform operates entirely without network access.

## Clipboard, insertion and permissions

GOSU requests microphone access for recording. Desktop shortcuts, identifying a destination window and inserting text may also require operating-system accessibility, automation or portal permissions. The Chrome extension uses its permissions to store its workspace, access model downloads and insert text into a compatible field in a tab you select.

Copying places text on the system clipboard. Finishing a desktop minimal-mode dictation also copies its result before attempting insertion. GOSU may inspect destination window or process information to direct that insertion. Text inserted into a website or another application becomes subject to that destination's behavior and privacy policy, including any synchronization, logging or transmission it performs. GOSU does not automatically press Enter to submit the dictation.

You can stop recording and change or revoke permissions through the operating system or browser settings. Other applications and clipboard managers may retain copied or inserted text independently of GOSU.

## Exports, diagnostics and support

Backups and exported files are created when you request them and remain wherever you save them. Backups can contain workspace text, history and settings; they do not include pending audio or the engine's local authentication token. Password-protected backup encryption is available; unprotected exports should be treated as readable files. The project cannot recover a forgotten backup password. Removing a draft in GOSU does not delete exported files or copies held by other software.

The desktop engine writes a local diagnostic log (`engine.log`) containing startup information, model/loading status and error information; library diagnostics can also appear there. GOSU does not automatically upload this log to the maintainers. Review logs, screenshots, exports and recordings before sharing them, as diagnostic material can include device-specific information or content you provide.

If you voluntarily contact the maintainers through GitHub, they can see the information you submit. Public issues and attachments may be visible to anyone. Do not post private recordings, transcripts, passwords or signing credentials in an issue.

## Managing your information and contacting the project

You can delete saved drafts and pending jobs through the applicable interface, clear application/extension storage through your platform's controls, remove downloaded model caches, and separately delete exports and backups. Uninstalling may leave application data or external model caches behind; do not rely on uninstall alone to erase every copy. Deletion is not a secure-erasure guarantee.

Because the maintainers do not receive your local workspace, they cannot access, recover or delete it remotely. For privacy questions about the project, use the [GitHub issue tracker](https://github.com/jansanchez/gosu-speech-to-text/issues) without including sensitive information.

Changes to this policy will be published in this repository with an updated date. The repository history records earlier versions.
