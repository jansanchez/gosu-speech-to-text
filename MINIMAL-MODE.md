# Minimal dictation

A small panel displays the real microphone level and provides three independent shortcuts for dictation, views, and visibility. The full editor remains available for settings, history, and recovery.

## Use

1. Keep GOSU open and wait for the engine.
2. Ctrl+Shift+M switches editor/panel. If hidden, it switches to the other view and shows it. Ctrl+Shift+H restores the same view.
3. Ctrl+Shift+Space starts recording in the selected editor/panel flow.
4. Speak and pause between ideas. You can switch fields or applications while recording.
5. Click the destination field (hovering may not focus it), then press Ctrl+Shift+Space to stop. GOSU captures the focused window, waits for final chunks, copies the complete dictation, and attempts insertion. Keep the field focused during processing.
6. Press the dictation shortcut again for another recording. The panel stays available. Ctrl+Shift+H hides/restores without stopping capture or transcription.

On macOS use Cmd for the three default shortcuts. They are available from first use when permitted and unoccupied.

Settings and Configure offer Start or stop dictation, Switch between editor and minimal panel, and Show or hide GOSU. Choose combination, enter keys, then Save shortcut. Combinations persist independently and cannot collide. Old preferences preserve existing shortcuts: visibility defaults to Ctrl/Cmd+Shift+H or a free internal alternative; the panel falls back to Ctrl/Cmd+Alt+M if the M default was already used for dictation.

Hiding during capture leaves the microphone active; use the dictation shortcut to finish. Opening Editor during capture/processing cancels automatic insertion and preserves work. GOSU temporarily suspends its shortcuts during capture of a new combination; failure restores the last valid shortcut and reports the error. It does not replace another application's shortcuts.

GOSU never presses Enter to send/execute text. Destination applications can change paste behavior; review before submitting.

## Platform integrations

| Platform | Mechanism | Requirements and scope |
|---|---|---|
| Windows | Win32 window/process and keyboard | Captures HWND/PID and verifies target; elevated targets may reject input |
| Linux X11, including Ubuntu Xorg | X11 window identification/paste | `xdotool`, `xprop`; Ctrl+Shift+V for detected terminals |
| Hyprland Wayland | Compositor integration | `hyprctl`, window/process verification, temporary unoccupied bindings |
| GNOME/KDE Wayland | XDG GlobalShortcuts and RemoteDesktop | Both portals must be implemented and authorized; keyboard requested, not screen capture |
| macOS | Active application and system automation | Accessibility/Automation permissions |

Generic Wayland has no universal active-window/focus API. The portal types into the focused field, displayed as Active field. Select it before stopping and retain focus during processing. Unicode input replaces control characters with spaces to avoid simulating Enter/Tab. Other integrations remember the chosen window but cannot guarantee the user has not switched fields/tabs inside it.

Ubuntu alone does not determine behavior: Xorg/Wayland session, desktop version, portals, and permission matter. Unsupported/denied integration reports failure and preserves text instead of claiming insertion.

## Registration and recovery

Native registrations can survive a development UI reload. GOSU renews its own registrations without deleting another application's. Choose another shortcut if a compositor/app owns the combination.

Hyprland bindings are temporary and removed on normal shutdown. Reloading compositor configuration may remove them: restart GOSU or change/restore the shortcut. Linux's same-user bridge also supports `gosu-speech-to-text --show-minimal`, `--toggle-minimal`, and `--toggle-visibility` for view switching, dictation, and visibility respectively. It does not edit persistent desktop configuration.

Each minimal dictation has an independent draft and follows the audio recovery protocol. Recognition failure never inserts a partial result. Target/insertion failure is not automatically retried: complete text remains copied, and the panel explains manual paste. Use Ctrl+V/Cmd+V, or Ctrl+Shift+V in WezTerm and similar terminals; Ctrl+Shift+B is not the usual paste shortcut. Clipboard failure preserves the editor draft. A transport failure after keys were sent may leave partial insertion: inspect the target before pasting again.

Tests cover lifecycle, draft isolation, final-recognition waiting, insertion cancellation, permissions, and registration ownership. Linux evidence does not certify Windows, GNOME/KDE, or macOS; build and test their real desktops before claiming validation.

Protocol references: [RemoteDesktop](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.RemoteDesktop.html), [GlobalShortcuts](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html), [Hyprland dispatchers](https://wiki.hypr.land/configuring/core/dispatchers/).

The application and model remain loaded after dictation for the next session; RAM/CPU have not been measured and no automatic model unloading exists. Return to the editor and close the app to exit. The panel leaves roughly 15% of screen height below it and is not repositioned for every recording while visible. Starting with GOSU focused is allowed; the destination is required at completion.
