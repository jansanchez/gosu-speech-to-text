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
    ready: 'Ready to dictate',
    starting: 'Preparing microphone…',
    listening: 'Listening to you',
    processing: 'Finishing transcription…',
    sent: 'Text inserted and copied',
    copied: 'Text on clipboard',
    error: 'Your dictation is safe',
  }[p.phase];
  const targetName = p.target?.app.includes('wezterm') ? 'WezTerm' : p.target?.name;
  return (
    <main
      className={'minimal-dictation minimal-' + p.phase}
      aria-label="Minimal dictation"
    >
      <header className="minimal-header">
        <span className="minimal-brand">
          <AudioLines size={17} /> GOSU <small>DICTATION</small>
        </span>
        <button
          className="minimal-shortcut"
          onClick={() => void p.configureShortcut()}
          aria-label="Configure shortcut"
          title="Configure shortcut"
          disabled={listening || waiting}
        >
          <kbd>{shortcutLabel(p.shortcut)}</kbd>
        </button>
        <button
          title={'Hide · ' + shortcutLabel(p.panelShortcut)}
          aria-label="Hide minimal dictation"
          disabled={p.phase === 'starting'}
          onClick={() => void p.hide()}
        >
          <X size={15} />
        </button>
      </header>
      <div className="minimal-capture">
        <button
          className="minimal-mic"
          aria-label={listening ? 'Stop and insert dictation' : 'Start minimal dictation'}
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
        {waiting && <span className="minimal-spinner" aria-label="Processing" />}
      </div>
      <p
        className={'minimal-preview ' + (p.error ? 'minimal-error' : '')}
        role={p.error ? 'alert' : undefined}
      >
        {p.error ||
          p.text.slice(-170) ||
          (listening
            ? 'You can switch fields. When you stop, the text goes to the focused destination.'
            : p.phase === 'sent'
              ? 'Press the dictation shortcut to continue recording.'
              : 'Press the shortcut to record. Choose the destination before stopping.')}
      </p>
      <footer className="minimal-footer">
        <span title={'Show/hide: ' + shortcutLabel(p.panelShortcut)}>
          {targetName
            ? `${listening ? 'Destination on stop' : p.target?.terminal ? 'Terminal' : 'Destination'} · ${listening ? 'focused field' : targetName}`
            : listening
              ? 'Destination on stop · focused field'
              : 'Your voice, wherever you write'}
        </span>
        <div>
          {p.text && (
            <button
              disabled={waiting}
              onClick={() => void p.copy()}
              title="Copy this dictation"
              aria-label="Copy minimal dictation"
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
