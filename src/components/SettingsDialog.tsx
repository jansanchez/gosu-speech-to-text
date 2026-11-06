import ShortcutPicker from './ShortcutPicker';
import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { languages, type Settings, type State } from '../product';
type Props = {
  config: Settings;
  shortcutStatus: string;
  setShortcut: (value: string) => void;
  setMinimalShortcut: (value: string) => void;
  setVisibilityShortcut: (value: string) => void;
  captureShortcut: (active: boolean) => Promise<void>;
  disabled: boolean;
  token: string;
  setToken: (token: string) => void;
  devices: MediaDeviceInfo[];
  change: (fn: (state: State) => State) => State;
  check: () => Promise<boolean>;
  microphones: () => Promise<void>;
  download: (name: string, data: string, type?: string) => void;
  importProfile: (file: File) => Promise<void>;
  close: () => void;
};
export default function SettingsDialog({
  config,
  shortcutStatus,
  setShortcut,
  setMinimalShortcut,
  setVisibilityShortcut,
  captureShortcut,
  disabled,
  token,
  setToken,
  devices,
  change,
  check,
  microphones,
  download,
  importProfile,
  close,
}: Props) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('.settings') as HTMLElement;
    const elements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      );
    elements()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = elements();
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section className="settings" role="dialog" aria-modal="true" aria-label="Settings">
        <h2>Make it yours.</h2>
        <p>
          You choose the rules. The application does not learn preferences automatically.
        </p>
        <ShortcutPicker
          value={config.shortcut}
          otherShortcuts={[config.minimalShortcut, config.visibilityShortcut]}
          disabled={disabled}
          status={shortcutStatus}
          onCapture={captureShortcut}
          onChange={setShortcut}
        />
        <ShortcutPicker
          panel
          value={config.minimalShortcut}
          otherShortcuts={[config.shortcut, config.visibilityShortcut]}
          disabled={disabled}
          status={shortcutStatus}
          onCapture={captureShortcut}
          onChange={setMinimalShortcut}
        />
        <ShortcutPicker
          visibility
          value={config.visibilityShortcut}
          otherShortcuts={[config.shortcut, config.minimalShortcut]}
          disabled={disabled}
          status={shortcutStatus}
          onCapture={captureShortcut}
          onChange={setVisibilityShortcut}
        />
        {!isTauri() ? (
          <>
            <label>
              Local engine token
              <input
                type="password"
                value={token}
                autoComplete="off"
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token from the terminal"
              />
            </label>
            <small>In memory only. Cleared when you close this window.</small>
            <button onClick={check}>Check connection</button>
          </>
        ) : (
          <p>
            The engine connects automatically. Diagnostics are available in the main
            window.
          </p>
        )}
        <label>
          Language
          <select
            value={config.language}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, language: e.target.value },
              }))
            }
          >
            {languages.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Text processing
          <select
            value={config.mode}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: {
                  ...x.settings,
                  mode: e.target.value as Settings['mode'],
                },
              }))
            }
          >
            <option value="literal">Verbatim · recognizer output</option>
            <option value="clean">Cleaned · your manual rules</option>
          </select>
        </label>
        <label>
          Pause to close a chunk: {config.pause.toFixed(1)} s
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.1"
            value={config.pause}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, pause: Number(e.target.value) },
              }))
            }
          />
        </label>
        <label>
          Microphone
          <select
            value={config.device}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, device: e.target.value },
              }))
            }
          >
            <option value="">System default</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || d.deviceId.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={microphones}>Detect microphones</button>
        <label>
          Filler words to remove, comma-separated
          <input
            value={config.fillers}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, fillers: e.target.value },
              }))
            }
            placeholder="um, uh"
          />
        </label>
        <small>Removed literally in cleaned mode. Start without rules.</small>
        <label>
          Dictionary: recognized → corrected (JSON)
          <textarea
            value={config.dictionary}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, dictionary: e.target.value },
              }))
            }
            placeholder={'{"go sue":"GOSU"}'}
          />
        </label>
        <div className="profile-actions">
          <button
            onClick={() =>
              download(
                'gosu-speech-to-text-settings.json',
                JSON.stringify({ schema: 1, settings: config }, null, 2),
              )
            }
          >
            Export profile
          </button>
          <label className="import">
            Import profile
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                if (e.target.files?.[0]) void importProfile(e.target.files[0]);
              }}
            />
          </label>
        </div>
        <p className="privacy">
          Text and history are stored in IndexedDB on this device. Pending audio is
          deleted after successful transcription or when you remove it. GOSU does not
          provide cloud storage or encrypt the normal history.
        </p>
        <button className="done" onClick={() => close()}>
          Done
        </button>
      </section>
    </div>
  );
}
