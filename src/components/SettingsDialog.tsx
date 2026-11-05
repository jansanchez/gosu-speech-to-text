import ShortcutPicker from './ShortcutPicker';
import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { languages, type Settings, type State } from '../product';
type Props = {
  config: Settings;
  shortcutStatus: string;
  setShortcut: (value: string) => void;
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
      <section
        className="settings"
        role="dialog"
        aria-modal="true"
        aria-label="Preferencias"
      >
        <h2>Hazlo tuyo.</h2>
        <p>
          Las reglas las decides tú. El prototipo no aprende preferencias automáticamente.
        </p>
        <ShortcutPicker
          value={config.shortcut}
          disabled={disabled}
          status={shortcutStatus}
          onCapture={captureShortcut}
          onChange={setShortcut}
        />
        {!isTauri() ? (
          <>
            <label>
              Clave del motor local
              <input
                type="password"
                value={token}
                autoComplete="off"
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega la clave de la terminal"
              />
            </label>
            <small>Solo en memoria. Se borra al cerrar esta ventana.</small>
            <button onClick={check}>Comprobar conexión</button>
          </>
        ) : (
          <p>
            El motor se conecta automáticamente. El diagnóstico está disponible en la
            ventana principal.
          </p>
        )}
        <label>
          Idioma
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
          Tratamiento del texto
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
            <option value="literal">Literal · salida del reconocedor</option>
            <option value="clean">Depurado · tus reglas manuales</option>
          </select>
        </label>
        <label>
          Pausa para cerrar un tramo: {config.pause.toFixed(1)} s
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
          Micrófono
          <select
            value={config.device}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, device: e.target.value },
              }))
            }
          >
            <option value="">Predeterminado del sistema</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || d.deviceId.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={microphones}>Detectar micrófonos</button>
        <label>
          Muletillas a quitar, separadas por coma
          <input
            value={config.fillers}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, fillers: e.target.value },
              }))
            }
            placeholder="eh, em"
          />
        </label>
        <small>Se eliminan literalmente en modo depurado. Empieza sin reglas.</small>
        <label>
          Diccionario: lo reconocido → lo correcto (JSON)
          <textarea
            value={config.dictionary}
            onChange={(e) =>
              change((x) => ({
                ...x,
                settings: { ...x.settings, dictionary: e.target.value },
              }))
            }
            placeholder={'{"ne cso":"Nexo"}'}
          />
        </label>
        <div className="profile-actions">
          <button
            onClick={() =>
              download(
                'gosu-speech-to-text-preferencias.json',
                JSON.stringify({ schema: 1, settings: config }, null, 2),
              )
            }
          >
            Exportar perfil
          </button>
          <label className="import">
            Importar perfil
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
          Texto y versiones se guardan en IndexedDB de este equipo. Audio pendiente: se
          elimina al transcribirlo o al pedirlo. Sin nube, telemetría ni cifrado propio
          del historial.
        </p>
        <button className="done" onClick={() => close()}>
          Listo
        </button>
      </section>
    </div>
  );
}
