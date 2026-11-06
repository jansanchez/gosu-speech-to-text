# Maintenance priorities

See [architecture](ARCHITECTURE.md), [agent instructions](AGENTS.md), and [contributing](CONTRIBUTING.md).

1. Review native CI and clean-install each artifact. A configured matrix is not a passed run.
2. Validate real dictation on Windows, ARM64/Intel macOS, X11, and GNOME/KDE portals. Hyprland evidence has its own limited scope.
3. Test initial/custom shortcuts, conflicts, permissions, focus, Unicode, and recovery in a terminal, WhatsApp, and Google Docs.
4. Evaluate the ten priority recognition languages with real speakers and recordings, including RTL and CJK behavior. Keep interface English and retain saved recognition languages.
5. Configure signing/notarization, including engine dependencies, before claiming verified publisher distribution. Windows SignPath Foundation enrollment is pending; do not claim its approval or signed binaries prematurely.
6. Review vulnerable dependencies and test WASM/extension major-version migrations.

Apply [acceptance criteria](CRITERIOS-DE-EXITO.md) and record evidence/failures/pending work in [VALIDACION.md](VALIDACION.md).
