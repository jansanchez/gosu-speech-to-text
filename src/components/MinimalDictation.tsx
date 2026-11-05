import { shortcutLabel } from '../shortcuts';
import { AudioLines, Check, ChevronUp, Copy, Mic, Square, X } from 'lucide-react';
import type { DictationTarget, MinimalPhase } from '../hooks/useMinimalDictation';

type Props = {
  phase: MinimalPhase;
  target: DictationTarget | null;
  level: number;
  text: string;
  error: string;
  shortcut: string;
  panelShortcut: string;
  viewShortcut: string;
  toggle: () => Promise<void>;
  openEditor: () => Promise<void>;
  hide: () => Promise<void>;
  configureShortcut: () => Promise<void>;
  copy: () => Promise<void>;
};
export default function MinimalDictation(p: Props) {
  const listening = p.phase === 'listening';
  const waiting = p.phase === 'starting' || p.phase === 'processing';
  const status = {
    ready: 'Listo para dictar',
    starting: 'Preparando micrófono…',
    listening: 'Te estoy escuchando',
    processing: 'Terminando transcripción…',
    sent: 'Texto insertado y copiado',
    copied: 'Texto en el portapapeles',
    error: 'Tu dictado está a salvo',
  }[p.phase];
  const targetName = p.target?.app.includes('wezterm') ? 'WezTerm' : p.target?.name;
  return (
    <main className={'minimal-dictation minimal-' + p.phase} aria-label="Dictado mínimo">
      <header className="minimal-header">
        <span className="minimal-brand">
          <AudioLines size={17} /> GOSU <small>DICTADO</small>
        </span>
        <button
          className="minimal-shortcut"
          onClick={() => void p.configureShortcut()}
          aria-label="Configurar atajo"
          title="Configurar atajo"
          disabled={listening || waiting}
        >
          <kbd>{shortcutLabel(p.shortcut)}</kbd>
        </button>
        <button
          title={'Ocultar · ' + shortcutLabel(p.panelShortcut)}
          aria-label="Ocultar dictado mínimo"
          disabled={p.phase === 'starting'}
          onClick={() => void p.hide()}
        >
          <X size={15} />
        </button>
      </header>
      <div className="minimal-capture">
        <button
          className="minimal-mic"
          aria-label={
            listening ? 'Terminar e insertar dictado' : 'Empezar dictado mínimo'
          }
          disabled={waiting}
          onClick={() => void p.toggle()}
        >
          {p.phase === 'sent' ? (
            <Check size={20} />
          ) : listening ? (
            <Square size={18} />
          ) : (
            <Mic size={21} />
          )}
        </button>
        <div className="minimal-feedback">
          <strong role="status">{status}</strong>
          <div className="minimal-wave" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: Math.max(
                    3,
                    listening ? p.level * 38 * (0.35 + Math.abs(Math.sin(i * 1.7))) : 3,
                  ),
                }}
              />
            ))}
          </div>
        </div>
        {waiting && <span className="minimal-spinner" aria-label="Procesando" />}
      </div>
      <p
        className={'minimal-preview ' + (p.error ? 'minimal-error' : '')}
        role={p.error ? 'alert' : undefined}
      >
        {p.error ||
          p.text.slice(-170) ||
          (listening
            ? 'Puedes cambiar de campo. Al terminar, el texto irá al destino enfocado.'
            : p.phase === 'sent'
              ? 'Pulsa el atajo de dictado para seguir grabando.'
              : 'Pulsa el atajo para grabar. Elige el destino antes de terminar.')}
      </p>
      <footer className="minimal-footer">
        <span title={'Mostrar/ocultar: ' + shortcutLabel(p.panelShortcut)}>
          {targetName
            ? `${listening ? 'Destino al terminar' : p.target?.terminal ? 'Terminal' : 'Destino'} · ${listening ? 'campo enfocado' : targetName}`
            : listening
              ? 'Destino al terminar · campo enfocado'
              : 'Tu voz, donde escribes'}
        </span>
        <div>
          {p.text && (
            <button
              disabled={waiting}
              onClick={() => void p.copy()}
              title="Copiar este dictado"
              aria-label="Copiar dictado mínimo"
            >
              <Copy size={14} />
            </button>
          )}
          <button
            title={'Editor · ' + shortcutLabel(p.viewShortcut)}
            disabled={p.phase === 'starting'}
            onClick={() => void p.openEditor()}
          >
            <ChevronUp size={14} /> Editor
          </button>
        </div>
      </footer>
    </main>
  );
}
