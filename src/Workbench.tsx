import { useState } from 'react';
import { State, defaults, encodeBackup, decodeBackup, dictionaryOf } from './product';
type Props = {
  state: State;
  disabled: boolean;
  privateMode: boolean;
  notify: (s: string) => void;
  change: (fn: (s: State) => State) => void;
  togglePrivate: () => Promise<void>;
  restore: (s: State) => void;
  importAudio: (f: File) => Promise<void>;
  insert: (text: string) => void;
  join: (id: string) => void;
  split: () => void;
  cleanup: () => void;
  erase: () => void;
  read: () => void;
  stopRead: () => void;
};
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export default function Workbench(p: Props) {
  const [open, setOpen] = useState(false),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [snippet, setSnippet] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [other, setOther] = useState(''),
    [working, setWorking] = useState(false);
  const s = p.state.settings,
    current = p.state.sessions.find((a) => a.id === p.state.active)!;
  function setting(patch: Partial<typeof s>) {
    p.change((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
  }
  async function action(fn: () => Promise<void>) {
    setWorking(true);
    try {
      await fn();
    } catch (e) {
      p.notify(String(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="workbench" aria-label="Dictation tools">
      <div className="utility-bar">
        <button disabled={p.disabled} onClick={() => void p.togglePrivate()}>
          {p.privateMode ? 'Exit private session' : 'Private session'}
        </button>
        <button onClick={p.read} disabled={!current.text}>
          Read aloud
        </button>
        <button onClick={p.stopRead}>Stop reading</button>
        <label className="file-button">
          Import recording
          <input
            disabled={p.disabled || working}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void action(() => p.importAudio(f));
            }}
          />
        </label>
      </div>
      {p.privateMode && (
        <p role="status">
          Private session: text and audio stay in memory until you exit. Exports you
          request still create files.
        </p>
      )}
      <details onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>Tools, settings, and backups</summary>
        {open && (
          <div className="tool-grid">
            <fieldset>
              <legend>Organize this dictation</legend>
              <label>
                Title
                <input
                  value={current.title || ''}
                  onChange={(e) =>
                    p.change((x) => ({
                      ...x,
                      sessions: x.sessions.map((a) =>
                        a.id === x.active ? { ...a, title: e.target.value } : a,
                      ),
                    }))
                  }
                />
              </label>
              <label>
                Tags (comma-separated)
                <input
                  value={current.tags || ''}
                  onChange={(e) =>
                    p.change((x) => ({
                      ...x,
                      sessions: x.sessions.map((a) =>
                        a.id === x.active ? { ...a, tags: e.target.value } : a,
                      ),
                    }))
                  }
                />
              </label>
              <button
                onClick={() =>
                  p.change((x) => ({
                    ...x,
                    sessions: x.sessions.map((a) =>
                      a.id === x.active ? { ...a, favorite: !a.favorite } : a,
                    ),
                  }))
                }
              >
                {current.favorite ? 'Remove favorite' : 'Mark favorite'}
              </button>
              <button
                disabled={p.disabled}
                onClick={() => {
                  if (
                    confirm(
                      'Delete the previous versions of this dictation? The current text will be preserved.',
                    )
                  )
                    p.change((x) => ({
                      ...x,
                      sessions: x.sessions.map((a) =>
                        a.id === x.active ? { ...a, versions: [], redo: [] } : a,
                      ),
                    }));
                }}
              >
                Clear history for this dictation
              </button>
              <label>
                Append to this dictation
                <select value={other} onChange={(e) => setOther(e.target.value)}>
                  <option value="">Choose another draft</option>
                  {p.state.sessions
                    .filter((a) => a.id !== current.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title || a.text.slice(0, 40) || 'Untitled'}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={p.disabled || !other}
                onClick={() => {
                  p.join(other);
                  setOther('');
                }}
              >
                Join and keep originals
              </button>
              <button disabled={p.disabled} onClick={p.split}>
                Split at cursor
              </button>
            </fieldset>
            <fieldset>
              <legend>Reusable snippets</legend>
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                Text
                <textarea
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  maxLength={100000}
                />
              </label>
              <button
                disabled={!name.trim() || !snippet.trim()}
                onClick={() => {
                  p.change((x) => ({
                    ...x,
                    snippets: [
                      ...(x.snippets || []),
                      {
                        id: crypto.randomUUID(),
                        name: name.trim(),
                        text: snippet,
                      },
                    ],
                  }));
                  setName('');
                  setSnippet('');
                }}
              >
                Save snippet
              </button>
              {(p.state.snippets || []).map((a) => (
                <div className="template-row" key={a.id}>
                  <button disabled={p.disabled} onClick={() => p.insert(a.text)}>
                    {a.name}
                  </button>
                  <button
                    aria-label={'Delete snippet ' + a.name}
                    onClick={() => {
                      if (confirm('Delete this snippet?'))
                        p.change((x) => ({
                          ...x,
                          snippets: x.snippets?.filter((b) => a.id !== b.id),
                        }));
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              <small>In Correct mode, say “insert snippet name”.</small>
            </fieldset>
            <fieldset>
              <legend>What you have taught GOSU Speech to Text</legend>
              <p>Only replacements you save are applied. You can remove them here.</p>
              <label>
                What is usually recognized
                <input value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                What you want to write
                <input value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <button
                disabled={!from.trim() || !to.trim()}
                onClick={() => {
                  setting({
                    dictionary: JSON.stringify({
                      ...dictionaryOf(s.dictionary),
                      [from.trim()]: to.trim(),
                    }),
                  });
                  setFrom('');
                  setTo('');
                }}
              >
                Save personal rule
              </button>
              {Object.entries(dictionaryOf(s.dictionary)).map(([a, b]) => (
                <div className="rule" key={a}>
                  <span>
                    {a} → {b}
                  </span>
                  <button
                    aria-label={'Forget ' + a}
                    onClick={() => {
                      const next = dictionaryOf(s.dictionary);
                      delete next[a];
                      setting({ dictionary: JSON.stringify(next) });
                    }}
                  >
                    Forget
                  </button>
                </div>
              ))}
            </fieldset>
            <fieldset>
              <legend>Local natural editing</legend>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.llm}
                  onChange={(e) => setting({ llm: e.target.checked })}
                />{' '}
                Enable suggestions with local Ollama
              </label>
              <label>
                Semantic search model
                <input
                  value={s.embeddingModel}
                  onChange={(e) => setting({ embeddingModel: e.target.value })}
                  maxLength={100}
                />
              </label>
              <label>
                Local model
                <input
                  value={s.llmModel}
                  onChange={(e) => setting({ llmModel: e.target.value })}
                  maxLength={100}
                />
              </label>
              <small>
                Install Ollama and download a model first. In Correct mode, request “make
                it shorter”, “translate into English”, or another edit. Always review and
                confirm the suggestion.
              </small>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.punctuation}
                  onChange={(e) => setting({ punctuation: e.target.checked })}
                />{' '}
                Interpret spoken punctuation
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.sounds}
                  onChange={(e) => setting({ sounds: e.target.checked })}
                />{' '}
                Play a sound when recording stops
              </label>
            </fieldset>
            <fieldset>
              <legend>Accessibility</legend>
              <label>
                Microphone threshold: {s.sensitivity.toFixed(3)}
                <input
                  type="range"
                  min={0.002}
                  max={0.03}
                  step={0.001}
                  value={s.sensitivity}
                  onChange={(e) => setting({ sensitivity: Number(e.target.value) })}
                />
              </label>
              <small>
                Lower it for quiet voices; raise it if background noise creates too many
                chunks.
              </small>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.contrast}
                  onChange={(e) => setting({ contrast: e.target.checked })}
                />{' '}
                High contrast
              </label>
              <label>
                Editor size: {s.fontSize}px
                <input
                  type="range"
                  min={16}
                  max={32}
                  value={s.fontSize}
                  onChange={(e) => setting({ fontSize: Number(e.target.value) })}
                />
              </label>
              <button
                onClick={() => setting({ fontSize: defaults.fontSize, contrast: false })}
              >
                Reset appearance
              </button>
              <small>
                Control commands in Correct mode: “undo”, “redo”, “copy text”, “paste
                text”, “read text”, “stop reading”, “confirm change”, and “cancel change”.
              </small>
            </fieldset>
            <fieldset>
              <legend>Full backup and privacy</legend>
              <p>
                Includes text, history, snippets, and settings. Excludes pending audio and
                engine tokens.
              </p>
              <label>
                Password to encrypt or open a backup
                <input
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button
                disabled={working || p.disabled}
                onClick={() =>
                  void action(async () => {
                    download(
                      'gosu-speech-to-text-backup-' +
                        new Date().toISOString().slice(0, 10) +
                        (password ? '.gosu' : '.json'),
                      await encodeBackup(p.state, password),
                    );
                    p.notify(
                      password
                        ? 'Encrypted backup downloaded. Keep the password safe.'
                        : 'Unencrypted backup downloaded.',
                    );
                  })
                }
              >
                Download backup {password ? 'cifrado' : 'unencrypted'}
              </button>
              <label className="file-button">
                Restore backup
                <input
                  disabled={p.disabled || working}
                  type="file"
                  accept=".json,.gosu,.voz"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file)
                      void action(async () => {
                        const restored = await decodeBackup(await file.text(), password);
                        if (
                          confirm(
                            'Replace the workspace and settings with this backup? Export anything you want to keep first.',
                          )
                        )
                          p.restore(restored);
                      });
                  }}
                />
              </label>
              <label>
                Cleanup age (days, 0 keeps everything)
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={s.retentionDays}
                  onChange={(e) =>
                    setting({
                      retentionDays: Math.max(0, Math.min(3650, Number(e.target.value))),
                    })
                  }
                />
              </label>
              <button disabled={p.disabled} onClick={p.cleanup}>
                Review and clean up old drafts
              </button>
              <button disabled={p.disabled} onClick={p.erase}>
                Delete all GOSU Speech to Text data
              </button>
              <small>
                Cleanup preserves favorites and drafts with pending audio. Private mode
                does not encrypt previous data. Encryption applies to the exported backup
                file.
              </small>
            </fieldset>
          </div>
        )}
      </details>
    </section>
  );
}
