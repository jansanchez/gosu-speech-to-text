# Install GOSU on Linux

Official project downloads: [GitHub Releases](https://github.com/jansanchez/gosu-speech-to-text/releases). These are upstream GOSU packages, not packages endorsed by Ubuntu, Debian, or another distribution. Use **Linux x64 / amd64 / x86_64** packages; ARM64 is not currently provided.

## Compatibility status

DEB and AppImage candidates are built on Ubuntu 22.04 with the complete Python engine. You do not need Python, Node, Rust, or a source checkout to use them. Initial model preparation needs internet access and disk space; subsequent local recognition reuses the model. Ollama is optional.

The following is a validation plan, **not a list of certified systems**. No clean installation of the current candidate has yet been recorded. A CI build or package inspection does not establish desktop compatibility.

| Target family | Initial validation target | Package | Current acceptance |
|---|---|---|---|
| Ubuntu | 22.04 and 24.04 LTS, GNOME | DEB, then AppImage | Pending |
| Linux Mint | 22.x, Cinnamon | DEB, then AppImage | Pending |
| Debian | 13, GNOME | DEB, then AppImage | Pending dependency and runtime checks |
| Fedora | Current stable version, GNOME | AppImage | Pending; no RPM provided |
| Arch / CachyOS | Record exact rolling snapshot, KDE or Hyprland | AppImage | Pending current-package acceptance; historical Hyprland development tests only |

Test X11 and Wayland separately where available. Other distributions may work but are unverified. An AppImage still depends on compatible system libraries, graphics drivers, and desktop services. Do not bypass missing-library errors with arbitrary symlinks or libraries copied from another distribution.

## Verify a download

Download the installer and `SHA256SUMS.txt` from the **same release** into a new directory. The release manifest lists all platforms. To verify just your downloaded package, replace the filename below with its exact name:

```bash
sha256sum --ignore-missing --check SHA256SUMS.txt
sha256sum 'EXACT-DOWNLOADED-FILENAME'
```

Require `OK` for the file you intend to install, and compare its digest with its manifest entry. A checksum detects corruption; it does not independently authenticate the publisher. Detached signatures and an authenticated signing-key distribution are not configured yet. CI candidate artifacts contain a manifest with paths relative to the extracted artifact directory.

## DEB: Ubuntu, Mint, and Debian candidates

Open a terminal in the download directory and replace the example filename:

```bash
sudo apt install './EXACT-DOWNLOADED-FILENAME.deb'
```

APT resolves declared system dependencies. If dependencies cannot be satisfied, stop and report the distribution/version and error; do not force installation. Start **GOSU Speech to Text** from the application menu, or run:

```bash
gosu-speech-to-text
```

To update, close GOSU and install the newer DEB with the same command. Export a backup before updating. To remove the application:

```bash
sudo apt remove gosu-speech-to-text
```

Removal may leave personal settings, recoverable work, and model caches. It is not a secure data-erasure operation.

## AppImage

Keep the downloaded file in a permanent directory owned by your user:

```bash
chmod u+x './EXACT-DOWNLOADED-FILENAME.AppImage'
'./EXACT-DOWNLOADED-FILENAME.AppImage'
```

Do not run GOSU with `sudo`. AppImage may require FUSE 2. On Ubuntu 22.04 use `sudo apt install libfuse2`; on Ubuntu 24.04 use `sudo apt install libfuse2t64`. Other distributions require their equivalent package; keep FUSE 3 installed if already used by the system.

If FUSE is unavailable, an alternative for a trusted GOSU package is:

```bash
'./EXACT-DOWNLOADED-FILENAME.AppImage' --appimage-extract-and-run
```

This still requires compatible system libraries and executable temporary storage. Manual AppImage downloads do not automatically create a launcher or install updates. To update, close GOSU, verify the newer download, and replace the old AppImage. Removing the file does not remove personal data. Source-checkout users can use the separate managed installation described in [LINUX-MAKE.md](LINUX-MAKE.md).

## Microphone, shortcuts, and text insertion

Choose a microphone and recognition language, prepare a model, and test a short recording. The interface stays in English. Model preparation and actual recognition are separate from engine startup.

The three default shortcuts are Ctrl+Shift+M (editor/panel), Ctrl+Shift+H (hide/restore), and Ctrl+Shift+Space (dictation). Change conflicting combinations in Preferences; do not change desktop shortcuts merely to install the package.

- **X11:** focus/paste requires `xdotool`; `xprop` from the distribution's X11 utilities helps identify terminals. On Ubuntu/Mint/Debian: `sudo apt install xdotool x11-utils`.
- **Hyprland:** integration uses the active compositor's `hyprctl` and a same-user bridge.
- **GNOME/KDE Wayland:** global shortcuts and insertion depend on compatible desktop portals and user permission. Support varies by desktop/version. Installing a portal package alone does not establish compatibility.

See [MINIMAL-MODE.md](MINIMAL-MODE.md). If automatic insertion fails, retain the draft and paste from the clipboard; GOSU never automatically presses Enter. Do not disable session security to work around an unsupported integration.

## Report a problem

Use [GitHub Issues](https://github.com/jansanchez/gosu-speech-to-text/issues). Include package filename, SHA256, distribution/version, architecture (`uname -m`), desktop/version, session type (`echo "$XDG_SESSION_TYPE"`), exact steps, and relevant errors. Remove private dictation, audio, tokens, and personal paths from logs. See the [privacy policy](PRIVACY.md).

## Maintainer acceptance before publication

1. Generate candidates through Actions with `publish` unchecked. Record the exact commit and run URL. Use packages from that run rather than historical local output.
2. Download `gosu-speech-to-text-linux-x64`. Inspect `linux-package-report.json`: it checks both packages, version metadata, x64 application/engine, bundled Python/audio library, and desktop entry. It does not launch GOSU or prove runtime dependency resolution.
3. Test each proposed supported target in a clean VM or machine without development tools. Record installed system components. Test installation from a path containing spaces, startup, first model preparation, real microphone/recognition, all shortcuts, panel visibility, terminal/browser insertion without Enter, permission denial, recovery after failure, restart, update, and removal. Use [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) for the full gate.
4. Record evidence in [VALIDACION.md](VALIDACION.md), including commit, package SHA256, exact OS/architecture/desktop/session, commands, results, and unresolved limitations. Promote only tested targets to supported status.
5. Approve publication only after acceptance. The current workflow still requires all configured desktop builds; Linux preparation does not remove other platform gates or publish a release.

Future channels: RPM for Fedora/openSUSE, signed APT metadata for an upstream repository, and sandboxed Flatpak/Flathub. These need separate implementation and validation; no repository, store submission, signing, or automatic updates are currently promised.
