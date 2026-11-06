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
    setMessage('Preparing shortcut capture…');
    try {
      await p.onCapture(true);
      if (!alive.current) return;
      setReady(true);
      setMessage('Press your combination. Esc cancels.');
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
          ? 'Show or hide GOSU'
          : p.panel
            ? 'Switch between editor and minimal panel'
            : 'Start or stop dictation'}
      </legend>
      <p>
        {p.visibility
          ? 'Hide or restore the application while keeping the selected view.'
          : p.panel
            ? 'Switch between the full editor and the minimal panel.'
            : 'Press to record, then again to stop and insert. The panel stays available.'}
      </p>
      <div className="shortcut-picker-controls">
        <input
          ref={input}
          aria-label={
            p.visibility
              ? 'Visibility shortcut combination'
              : p.panel
                ? 'Panel shortcut combination'
                : 'Dictation shortcut combination'
          }
          readOnly
          value={capturing && ready ? 'Press the keys…' : shortcutLabel(candidate)}
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
              setMessage('Change canceled.');
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
                  throw Error('Each action must have a different shortcut.');
                setCandidate(value);
                setMessage('Select Save shortcut to activate it.');
                void stop();
              }
            } catch (error) {
              setMessage(String(error));
            }
          }}
        />
        <button type="button" disabled={p.disabled} onClick={() => void capture()}>
          {capturing ? 'Cancel selection' : 'Choose combination'}
        </button>
        <button
          type="button"
          disabled={p.disabled || capturing || candidate === p.value}
          onClick={() => {
            p.onChange(candidate);
            setMessage('Checking and activating shortcut…');
          }}
        >
          Save shortcut
        </button>
        <button
          type="button"
          disabled={p.disabled || capturing || p.value === initial}
          onClick={() => {
            setCandidate(initial);
            p.onChange(initial);
            setMessage('Restoring the default shortcut…');
          }}
        >
          Use default
        </button>
      </div>
      <small role="status">
        {capturing
          ? message
          : (candidate !== p.value ? message : p.status) ||
            message ||
            `Active: ${shortcutLabel(p.value)}`}
      </small>
    </fieldset>
  );
}
