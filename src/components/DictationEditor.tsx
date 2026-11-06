import { countWords } from '../speech';
import { Command, Check, RotateCcw, Undo2, Download, Trash2 } from 'lucide-react';
import type { Session } from '../product';
import type { Recognition } from '../transport';
type Props = {
  current: Session;
  loaded: boolean;
  disabled: boolean;
  editing: boolean;
  saved: boolean;
  privateMode: boolean;
  fontSize: number;
  hasPending: boolean;
  proposal: { snapshot: string; text: string; instruction: string } | null;
  choices: { snapshot: string; ranges: [number, number][] } | null;
  learn: { from: string; to: string } | null;
  last: Recognition | null;
  onMode: (mode: boolean) => void;
  onSelection: (range: [number, number]) => void;
  onText: (text: string) => void;
  confirmProposal: () => void;
  cancelProposal: () => void;
  chooseOption: (number: number) => void;
  rememberRule: () => void;
  forgetRule: () => void;
  chooseRange: (range: [number, number]) => void;
  note: (message: string) => void;
  restoreOriginal: () => void;
  undo: () => void;
  redo: () => void;
  downloadText: () => void;
  deleteSession: () => void;
};
export default function DictationEditor({
  current,
  loaded,
  disabled,
  editing,
  saved,
  privateMode,
  fontSize,
  hasPending,
  proposal,
  choices,
  learn,
  last,
  onMode,
  onSelection,
  onText,
  confirmProposal,
  cancelProposal,
  chooseOption,
  rememberRule,
  forgetRule,
  chooseRange,
  note,
  restoreOriginal,
  undo,
  redo,
  downloadText,
  deleteSession,
}: Props) {
  return (
    <div className="editor-card">
      <div className="editor-toolbar">
        <div className="segmented">
          <button
            aria-pressed={!editing}
            className={!editing ? 'selected' : ''}
            disabled={disabled}
            onClick={() => onMode(false)}
          >
            Dictate
          </button>
          <button
            aria-pressed={editing}
            className={editing ? 'selected' : ''}
            disabled={disabled}
            onClick={() => onMode(true)}
          >
            <Command size={14} /> Correct
          </button>
        </div>
        <span className="save-state">
          {saved && <Check size={13} />}{' '}
          {privateMode ? 'In memory only' : saved ? 'Saved locally' : 'Saving…'}
        </span>
      </div>
      <label className="sr-only" htmlFor="draft">
        Your draft. Type or select text to correct it.
      </label>
      <textarea
        disabled={!loaded}
        id="draft"
        style={{ fontSize: fontSize }}
        dir="auto"
        spellCheck
        value={current.text}
        placeholder={
          editing
            ? 'Select text and dictate a correction command.'
            : 'Start speaking or type here.\n\nYour words will appear after each pause.'
        }
        onSelect={(e) =>
          onSelection([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])
        }
        onChange={(e) => onText(e.target.value)}
      />
      {proposal && (
        <section className="proposal" aria-label="Correction suggestion">
          <h2>Review the suggestion</h2>
          <p>{proposal.instruction}</p>
          <div className="proposal-grid">
            <div>
              <strong>Before</strong>
              <pre>{proposal.snapshot}</pre>
            </div>
            <div>
              <strong>Suggestion</strong>
              <pre>{proposal.text}</pre>
            </div>
          </div>
          <button disabled={disabled} onClick={confirmProposal}>
            Confirm change
          </button>
          <button disabled={disabled} onClick={cancelProposal}>
            Cancel change
          </button>
          <small>
            In Correct mode, you can also say “confirm change” or “cancel change”.
          </small>
        </section>
      )}
      {choices && (
        <div className="choices" role="status">
          Choose an occurrence:
          {choices.ranges.map((r, i) => (
            <button key={i} disabled={disabled} onClick={() => chooseOption(i + 1)}>
              Option {i + 1}: …
              {choices.snapshot.slice(
                Math.max(0, r[0] - 20),
                Math.min(choices.snapshot.length, r[1] + 20),
              )}
              …
            </button>
          ))}
        </div>
      )}
      {learn && (
        <div className="learn-rule">
          <span>
            {learn.from} → {learn.to}
          </span>
          <button onClick={rememberRule}>Remember this correction</button>
          <button onClick={forgetRule}>Not now</button>
        </div>
      )}
      {last?.words.some((w) => w.review) && (
        <div className="doubts">
          <span>Review in the last chunk:</span>
          {last.words
            .filter((w) => w.review)
            .map((w, i) => (
              <button
                className="uncertain"
                key={i}
                title="Select to review"
                onClick={() => {
                  const word = w.text.trim(),
                    at = current.text.lastIndexOf(word);
                  if (at >= 0) chooseRange([at, at + word.length]);
                  else note('The text has changed; find that word in the draft.');
                }}
              >
                {w.text.trim()}
              </button>
            ))}
          <small>Model signals, not accuracy percentages.</small>
        </div>
      )}
      <div className="editor-bottom">
        <span>
          {countWords(current.text)} words · {current.versions.length} versiones
        </span>
        <div>
          <button
            onClick={() => {
              if (confirm('Restore the original transcript? You can undo this.'))
                restoreOriginal();
            }}
            disabled={disabled || !current.original}
            aria-label="Restore original transcript"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => undo()}
            disabled={!current.versions.length}
            aria-label="Undo"
          >
            <Undo2 size={17} />
          </button>
          <button
            onClick={() => redo()}
            disabled={!current.redo?.length}
            aria-label="Redo"
          >
            ↻
          </button>
          <button
            onClick={downloadText}
            disabled={!current.text}
            aria-label="Download text"
          >
            <Download size={17} />
          </button>
          <button
            disabled={disabled || hasPending}
            aria-label="Delete draft"
            onClick={deleteSession}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
