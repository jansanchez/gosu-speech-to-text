import { useEffect, useRef, useState } from 'react';
import { defaults } from '../product';
import { shortcutFromKey, shortcutLabel } from '../shortcuts';

type Props = {
  value: string;
  disabled: boolean;
  status?: string;
  onChange: (value: string) => void;
  onCapture: (active: boolean) => Promise<void>;
};
export default function ShortcutPicker(p: Props) {
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
      <legend>Atajo de dictado mínimo</legend>
      <p>
        Disponible desde el primer inicio. Pulsa una vez para dictar y otra para terminar
        e insertar.
      </p>
      <div className="shortcut-picker-controls">
        <input
          ref={input}
          aria-label="Combinación del atajo de dictado"
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
          disabled={p.disabled || capturing || p.value === defaults.shortcut}
          onClick={() => {
            setCandidate(defaults.shortcut);
            p.onChange(defaults.shortcut);
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
