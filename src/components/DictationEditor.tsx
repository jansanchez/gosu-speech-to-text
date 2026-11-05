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
            Dictar
          </button>
          <button
            aria-pressed={editing}
            className={editing ? 'selected' : ''}
            disabled={disabled}
            onClick={() => onMode(true)}
          >
            <Command size={14} /> Corregir
          </button>
        </div>
        <span className="save-state">
          {saved && <Check size={13} />}{' '}
          {privateMode ? 'Solo en memoria' : saved ? 'Guardado local' : 'Guardando…'}
        </span>
      </div>
      <label className="sr-only" htmlFor="draft">
        Tu borrador. Puedes escribir y seleccionar texto para corregirlo.
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
            ? 'Selecciona texto y dicta una orden de corrección.'
            : 'Empieza a hablar o escribe aquí.\n\nTus palabras aparecerán después de cada pausa.'
        }
        onSelect={(e) =>
          onSelection([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])
        }
        onChange={(e) => onText(e.target.value)}
      />
      {proposal && (
        <section className="proposal" aria-label="Propuesta de corrección">
          <h2>Revisa la propuesta</h2>
          <p>{proposal.instruction}</p>
          <div className="proposal-grid">
            <div>
              <strong>Antes</strong>
              <pre>{proposal.snapshot}</pre>
            </div>
            <div>
              <strong>Propuesta</strong>
              <pre>{proposal.text}</pre>
            </div>
          </div>
          <button disabled={disabled} onClick={confirmProposal}>
            Confirmar cambio
          </button>
          <button disabled={disabled} onClick={cancelProposal}>
            Cancelar cambio
          </button>
          <small>
            En Corregir también puedes decir «confirmar cambio» o «cancelar cambio».
          </small>
        </section>
      )}
      {choices && (
        <div className="choices" role="status">
          Elige la aparición:
          {choices.ranges.map((r, i) => (
            <button key={i} disabled={disabled} onClick={() => chooseOption(i + 1)}>
              Opción {i + 1}: …
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
          <button onClick={rememberRule}>Recordar esta corrección</button>
          <button onClick={forgetRule}>Ahora no</button>
        </div>
      )}
      {last?.words.some((w) => w.review) && (
        <div className="doubts">
          <span>Revisa en el último tramo:</span>
          {last.words
            .filter((w) => w.review)
            .map((w, i) => (
              <button
                className="uncertain"
                key={i}
                title="Seleccionar para revisar"
                onClick={() => {
                  const word = w.text.trim(),
                    at = current.text.lastIndexOf(word);
                  if (at >= 0) chooseRange([at, at + word.length]);
                  else note('El texto ya cambió; busca esa palabra en el borrador.');
                }}
              >
                {w.text.trim()}
              </button>
            ))}
          <small>Señales del modelo; no son porcentajes de acierto.</small>
        </div>
      )}
      <div className="editor-bottom">
        <span>
          {current.text.trim() ? current.text.trim().split(/\s+/).length : 0} palabras ·{' '}
          {current.versions.length} versiones
        </span>
        <div>
          <button
            onClick={() => {
              if (confirm('¿Restaurar la transcripción original? Podrás deshacerlo.'))
                restoreOriginal();
            }}
            disabled={disabled || !current.original}
            aria-label="Restaurar transcripción original"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => undo()}
            disabled={!current.versions.length}
            aria-label="Deshacer"
          >
            <Undo2 size={17} />
          </button>
          <button
            onClick={() => redo()}
            disabled={!current.redo?.length}
            aria-label="Rehacer"
          >
            ↻
          </button>
          <button
            onClick={downloadText}
            disabled={!current.text}
            aria-label="Descargar texto"
          >
            <Download size={17} />
          </button>
          <button
            disabled={disabled || hasPending}
            aria-label="Eliminar borrador"
            onClick={deleteSession}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
