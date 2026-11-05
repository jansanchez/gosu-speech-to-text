import { useEffect, useRef, useState } from 'react';
import { defaults } from '../product';
import { shortcutFromKey, shortcutLabel } from '../shortcuts';

type Props = {
  value: string;
  panel?: boolean;
  visibility?: boolean;
  otherShortcuts?: string[];
  otherShortcut?: string;
  disabled: boolean;
  status?: string;
  onChange: (value: string) => void;
  onCapture: (active: boolean) => Promise<void>;
};
export default function ShortcutPicker(p: Props) {
  const initial = p.visibility
    ? defaults.visibilityShortcut
    : p.panel
      ? defaults.minimalShortcut
      : defaults.shortcut;
  const [candidate, setCandidate] = useState(p.value);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    setCandidate(p.value);
  }, [p.value]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void p.onCapture(false);
    };
  }, []);
  async function capture() {
    if (capturing) {
      await stop();
      return;
    }
    setCapturing(true);
    setReady(false);
    setMessage('Preparando el selector…');
    try {
      await p.onCapture(true);
      if (!alive.current) return;
      setReady(true);
      setMessage('Pulsa tu combinación. Esc cancela.');
      input.current?.focus();
    } catch (error) {
      setMessage(String(error));
      await stop();
    }
  }
  async function stop() {
    setCapturing(false);
    setReady(false);
    await p.onCapture(false);
  }
  return (
    <fieldset className="shortcut-picker">
      <legend>
        {p.visibility
          ? 'Mostrar u ocultar GOSU'
          : p.panel
            ? 'Alternar editor y modo minimalista'
            : 'Iniciar o detener dictado'}
      </legend>
      <p>
        {p.visibility
          ? 'Oculta o restaura la aplicación conservando la vista elegida.'
          : p.panel
            ? 'Alterna entre la ventana grande y el panel minimalista.'
            : 'Pulsa para grabar y otra vez para terminar e insertar. El panel permanece disponible.'}
      </p>
      <div className="shortcut-picker-controls">
        <input
          ref={input}
          aria-label={
            p.visibility
              ? 'Combinación del atajo de visibilidad'
              : p.panel
                ? 'Combinación del atajo del panel'
                : 'Combinación del atajo de dictado'
          }
          readOnly
          value={capturing && ready ? 'Pulsa las teclas…' : shortcutLabel(candidate)}
          disabled={p.disabled}
          data-shortcut-capture={capturing}
          onBlur={() => {
            if (capturing) void stop();
          }}
          onKeyDown={(e) => {
            if (!capturing || !ready) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
              setCandidate(p.value);
              setMessage('Cambio cancelado.');
              void stop();
              return;
            }
            if (e.repeat) return;
            try {
              const value = shortcutFromKey(e.nativeEvent);
              if (value) {
                if (
                  [p.otherShortcut || '', ...(p.otherShortcuts || [])].some(
                    (other) => shortcutLabel(value) === shortcutLabel(other),
                  )
                )
                  throw Error('Cada acción debe tener un atajo diferente.');
                setCandidate(value);
                setMessage('Pulsa Guardar atajo para activarlo.');
                void stop();
              }
            } catch (error) {
              setMessage(String(error));
            }
          }}
        />
        <button type="button" disabled={p.disabled} onClick={() => void capture()}>
          {capturing ? 'Cancelar selección' : 'Elegir combinación'}
        </button>
        <button
          type="button"
          disabled={p.disabled || capturing || candidate === p.value}
          onClick={() => {
            p.onChange(candidate);
            setMessage('Comprobando y activando el atajo…');
          }}
        >
          Guardar atajo
        </button>
        <button
          type="button"
          disabled={p.disabled || capturing || p.value === initial}
          onClick={() => {
            setCandidate(initial);
            p.onChange(initial);
            setMessage('Restaurando el atajo inicial…');
          }}
        >
          Usar predeterminado
        </button>
      </div>
      <small role="status">
        {capturing
          ? message
          : (candidate !== p.value ? message : p.status) ||
            message ||
            `Activo: ${shortcutLabel(p.value)}`}
      </small>
    </fieldset>
  );
}
