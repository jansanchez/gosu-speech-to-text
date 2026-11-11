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
| Arch / CachyOS | Record exact rolling snapshot, KDE or Hyprland | Native pacman candidate (`make arch`) | Clean installation pending; older AppImage cannot open a profile migrated by newer system WebKit |

Test X11 and Wayland separately where available. Other distributions may work but are unverified. An AppImage still depends on compatible system libraries, graphics drivers, and desktop services. Do not bypass missing-library errors with arbitrary symlinks or libraries copied from another distribution.

## Existing data and development

Installing or updating a production package reuses production preferences/history if present. AppImage and the native release binary share `org.voz.prototype`; changing executable paths does not create a fresh profile. Current debug development uses `org.voz.prototype.dev` and a window title marked `(Development)`. Older development used a separate web origin inside the production directory; those legacy files are preserved without automatic copying. See [profile architecture](ARCHITECTURE.md).

If startup reports `Could not open local storage`, dictation stays disabled to protect recoverable work. Preserve a backup with every GOSU instance closed before investigating; do not delete IndexedDB files or bypass the load gate. A fresh temporary XDG profile can help diagnose the failure, but is not a permanent installation or proof that existing data are corrupt. Production profile compatibility must be tested before release acceptance.

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

## Native Arch / CachyOS candidate

For CachyOS prefer a **native package**, built on the target Arch/CachyOS x86_64 system, so the application uses the system WebKitGTK. This avoids downgrading the browser storage runtime to the older WebKit bundled in the Ubuntu-built AppImage. It retains the normal production identity and includes the complete Python engine. It does not require a temporary profile or reset your history.

Maintainers with the prepared source environment can run:

```bash
make arch
```

This runs checks, builds the native application/engine without an AppImage, and uses `makepkg` to produce a candidate under `src-tauri/target/release/bundle/archlinux/<candidate>/`. Build as your ordinary user with Arch `base-devel`, `pacman`, and `bsdtar` available. It does not install system packages or GOSU. Source commit, dirty-tree status, host and minimum WebKit version are recorded in `candidate.json`. Candidate package versions include a Git revision and `.dirty` if applicable; do not present these as published stable SemVer releases. Existing candidate output is never overwritten.

To install a reviewed candidate, open a terminal in its output directory:

```bash
sha256sum --check SHA256SUMS.txt
sudo pacman -U './EXACT-PACKAGE-FILENAME.pkg.tar.zst'
/usr/bin/gosu-speech-to-text
```

Close other GOSU instances and back up production data first. Review dependency prompts; do not bypass package signature policy or force installation. This locally generated candidate is unsigned. The explicit `/usr/bin` path avoids an older user-installed AppImage launcher taking precedence. Files are managed by pacman, with the application and engine under `/opt/gosu-speech-to-text`; to remove: `sudo pacman -R gosu-speech-to-text`. Removal does not delete personal data. End users do not need development tools once the package has been built.

The current GitHub release workflow does **not** build/upload this Arch package. Its Ubuntu-generated DEB/AppImage outputs remain separate. A native Arch build is not a portability claim for Ubuntu or other distributions. Real installation, microphone, permissions, shortcuts, and insertion still need acceptance.

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

## IndexedDB compatibility between native builds and AppImage

A real isolated WebKit test on CachyOS reproduced this behavior: the downloaded 0.6.0 AppImage's WebKitGTK 2.50.4 opens a fresh database, but reports `UnknownError: Unable to establish IDB database file` on a database created with system WebKitGTK 2.54.2. The newer WebKit opens an older database successfully. Reproduction used disposable databases and no user content. This establishes a runtime downgrade incompatibility, not general database corruption.

Do not alternate the older AppImage with a newer native WebKit on the same production profile. Use the native CachyOS package with system WebKit, or a separately validated compatible runtime. Do not delete SQLite/WAL files, edit WebKit metadata, replace individual bundled libraries, or enable dictation after a failed storage load. A fresh XDG profile is a diagnostic test only. Existing AppImage profile compatibility remains an acceptance failure; new candidates alone do not fix it.

## Report a problem

Use [GitHub Issues](https://github.com/jansanchez/gosu-speech-to-text/issues). Include package filename, SHA256, distribution/version, architecture (`uname -m`), desktop/version, session type (`echo "$XDG_SESSION_TYPE"`), exact steps, and relevant errors. Remove private dictation, audio, tokens, and personal paths from logs. See the [privacy policy](PRIVACY.md).

## Maintainer acceptance before publication

1. Generate candidates through Actions with `publish` unchecked. Record the exact commit and run URL. Use packages from that run rather than historical local output.
2. Download `gosu-speech-to-text-linux-x64`. Inspect `linux-package-report.json`: it checks both packages, version metadata, x64 application/engine, bundled Python/audio library, and desktop entry. It does not launch GOSU or prove runtime dependency resolution.
3. Test each proposed supported target in a clean VM or machine without development tools. Record installed system components. Test installation from a path containing spaces, startup, first model preparation, real microphone/recognition, all shortcuts, panel visibility, terminal/browser insertion without Enter, permission denial, recovery after failure, restart, update, and removal. Use [CRITERIOS-DE-EXITO.md](CRITERIOS-DE-EXITO.md) for the full gate.
4. Record evidence in [VALIDACION.md](VALIDACION.md), including commit, package SHA256, exact OS/architecture/desktop/session, commands, results, and unresolved limitations. Promote only tested targets to supported status.
5. Approve publication only after acceptance. The current workflow still requires all configured desktop builds; Linux preparation does not remove other platform gates or publish a release.

Future channels: RPM for Fedora/openSUSE, signed APT metadata for an upstream repository, and sandboxed Flatpak/Flathub. These need separate implementation and validation; no repository, store submission, signing, or automatic updates are currently promised.
