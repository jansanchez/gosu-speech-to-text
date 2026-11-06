import { appendTranscript } from '../src/speech';
import { pipeline, env } from '@huggingface/transformers';
import { get, set } from 'idb-keyval';
import { Capture } from '../src/audio';
import { edit, clean } from '../src/core';
import {
  control,
  languages,
  punctuation,
  dictionaryOf,
  defaults,
  encodeBackup,
  decodeBackup,
} from '../src/product';
import { importRecording } from '../src/import-audio';
import { ManualHistory, pushHistory } from '../src/history';
import { SerialWriter } from '../src/persistence';
import {
  validateExtensionWorkspace,
  validateExtensionJobs,
} from '../src/extension-state';
env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('ort/');
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
const $ = (id) => document.getElementById(id),
  status = (text) => {
    $('status').textContent = text;
  };
let recognizer,
  capture,
  recording = false,
  starting = false,
  working = false,
  importing = false,
  paused = false,
  privateMode = false,
  normalState,
  selection = [0, 0],
  save = Promise.resolve(),
  queueSave = Promise.resolve(),
  saved = true,
  queueSaved = true;
let state, pending;
try {
  const stored = await chrome.storage.local.get(['workspace', 'draft', 'versions']);
  state = validateExtensionWorkspace(
    stored.workspace ?? {
      draft: stored.draft || '',
      versions: stored.versions || [],
    },
  );
  pending = validateExtensionJobs(await get('voz-extension-audio'));
  const pendingIds = new Set(pending.map((job) => job.id));
  state.done = state.done.filter((id) => pendingIds.has(id));
  paused = !!pending.length;
} catch (error) {
  status(
    'Could not open local storage. The original data has been preserved. ' +
      String(error),
  );
  for (const control of document.querySelectorAll('button,input,textarea,select'))
    control.disabled = true;
  throw error;
}
const manual = new ManualHistory();
const stateWriter = new SerialWriter(
  (workspace) => chrome.storage.local.set({ workspace }),
  (ok, error) => {
    saved = ok;
    if (error) status('Could not save the draft: ' + String(error));
  },
);
const audioWriter = new SerialWriter(
  (jobs) => set('voz-extension-audio', jobs),
  (ok, error) => {
    queueSaved = ok;
    if (error) status('Could not save audio: ' + String(error));
  },
);
let mutations = Promise.resolve();
function mutate(fn) {
  const result = mutations.catch(() => {}).then(fn);
  mutations = result;
  return result;
}
for (const [code, name] of languages) {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  $('language').append(option);
}
function render() {
  $('draft').value = state.draft;
  $('language').value = state.settings.language;
  $('fillers').value = state.settings.fillers;
  $('dictionary').value = state.settings.dictionary;
  $('contrast').checked = state.settings.contrast;
  $('punctuation').checked = state.settings.punctuation;
  $('treatment').value = state.settings.mode;
  document.body.classList.toggle('high-contrast', state.settings.contrast);
  $('pending').textContent =
    `${pending.length} pending chunks${privateMode ? ' · private session in memory' : ''}`;
  $('templates').replaceChildren();
  for (const t of state.templates) {
    const row = document.createElement('div'),
      insert = document.createElement('button'),
      remove = document.createElement('button');
    insert.textContent = t.name;
    insert.onclick = () => {
      if (starting || working || recording || importing) return;
      const [a, b] = selection;
      change(state.draft.slice(0, a) + t.text + state.draft.slice(b));
    };
    remove.textContent = 'Delete';
    remove.onclick = () => {
      state.templates = state.templates.filter((x) => x.id !== t.id);
      void persist();
      render();
    };
    row.append(insert, remove);
    $('templates').append(row);
  }
}
function persist() {
  if (privateMode) return Promise.resolve();
  const workspace = structuredClone(state);
  save = stateWriter.save(workspace);
  return save;
}
function savePending() {
  render();
  if (privateMode) return Promise.resolve();
  const jobs = [...pending];
  queueSave = audioWriter.save(jobs);
  return queueSave;
}
function change(text) {
  manual.reset();
  state.versions = pushHistory(state.versions, state.draft);
  state.redo = [];
  state.draft = text;
  render();
  void persist().catch((e) => status('Could not save: ' + e));
}
function undo() {
  manual.reset();
  if (state.versions.length) {
    state.redo = pushHistory(state.redo, state.draft);
    state.draft = state.versions.pop();
    render();
    void persist();
  }
}
function redo() {
  manual.reset();
  if (state.redo.length) {
    state.versions = pushHistory(state.versions, state.draft);
    state.draft = state.redo.pop();
    render();
    void persist();
  }
}
$('draft').oninput = () => {
  state.versions = manual.record('extension', state.versions, state.draft);
  state.redo = [];
  state.draft = $('draft').value;
  void persist().catch((e) => status('Could not save: ' + e));
};
$('draft').onselect = () => {
  selection = [$('draft').selectionStart, $('draft').selectionEnd];
};
$('punctuation').onchange = () => {
  state.settings.punctuation = $('punctuation').checked;
  void persist();
};
$('treatment').onchange = () => {
  state.settings.mode = $('treatment').value;
  void persist();
};
$('language').onchange = () => {
  state.settings.language = $('language').value;
  void persist();
};
$('rules').onclick = () => {
  try {
    const dictionary = JSON.parse($('dictionary').value);
    if (
      !dictionary ||
      Array.isArray(dictionary) ||
      typeof dictionary !== 'object' ||
      Object.values(dictionary).some((v) => typeof v !== 'string')
    )
      throw Error('The dictionary must map text strings to text strings.');
    state.settings.dictionary = $('dictionary').value;
    state.settings.fillers = $('fillers').value;
    void persist();
    status('Rules saved. They will apply to new chunks.');
  } catch (e) {
    status(String(e));
  }
};
$('contrast').onchange = () => {
  state.settings.contrast = $('contrast').checked;
  render();
  void persist();
};
$('load').onclick = async () => {
  try {
    $('load').disabled = true;
    status('Preparing the local model…');
    recognizer = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny',
      {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (p) => {
          if (p.status === 'progress')
            status(`Downloading ${p.file}: ${Math.round(p.progress || 0)} %`);
        },
      },
    );
    $('mic').disabled = false;
    status(
      pending.length
        ? 'Model ready. Select Retry pending audio.'
        : 'Model ready. You can start dictating.',
    );
  } catch (e) {
    status('Could not load: ' + e);
    $('load').disabled = false;
  }
};
async function accept(blob, options) {
  try {
    await mutate(async () => {
      pending = [...pending, { id: crypto.randomUUID(), blob, ...options }];
      await savePending();
    });
    if (!paused) void drain();
  } catch (e) {
    paused = true;
    status('Could not save audio: ' + e);
    throw e;
  }
}
async function drain() {
  if (working || !recognizer) return;
  working = true;
  try {
    while (pending.length && !paused) {
      const job = pending[0];
      try {
        if (!state.done.includes(job.id)) {
          const decoder = new AudioContext();
          let decoded;
          try {
            decoded = await decoder.decodeAudioData(await job.blob.arrayBuffer());
          } finally {
            await decoder.close();
          }
          const offline = new OfflineAudioContext(
              1,
              Math.ceil(decoded.duration * 16000),
              16000,
            ),
            source = offline.createBufferSource();
          source.buffer = decoded;
          source.connect(offline.destination);
          source.start();
          const audio = await offline.startRendering();
          const result = await recognizer(audio.getChannelData(0), {
            ...(job.settings.language === 'auto'
              ? {}
              : { language: job.settings.language }),
            task: 'transcribe',
          });
          if (job.mode === 'edit') {
            if (state.draft !== job.snapshot)
              throw Error(
                'The text changed. Audio remains pending; try correcting the current text again.',
              );
            const action = control(result.text);
            if (action === 'undo') undo();
            else if (action === 'redo') redo();
            else if (action === 'copy') await copy();
            else if (action === 'read') read();
            else if (action === 'stopRead') speechSynthesis.cancel();
            else {
              const r = edit(job.snapshot, result.text, job.selection);
              if (r.changed) change(r.text);
              status(r.message);
            }
          } else {
            const raw = job.settings.punctuation
              ? punctuation(result.text, job.settings.language)
              : result.text;
            const text =
              job.settings.mode === 'literal'
                ? raw
                : clean(
                    raw,
                    job.settings.fillers.split(',').filter(Boolean),
                    dictionaryOf(job.settings.dictionary),
                  );
            if (text) change(appendTranscript(state.draft, text, job.settings.language));
            status(text ? 'Chunk transcribed and saved.' : 'No speech detected.');
          }
          state.done = [...state.done, job.id];
        }
        await persist();
        await mutate(async () => {
          const previous = pending;
          pending = pending.filter((x) => x.id !== job.id);
          try {
            await savePending();
          } catch (error) {
            pending = previous;
            render();
            throw error;
          }
        });
        const ids = new Set(pending.map((job) => job.id));
        state.done = state.done.filter((id) => ids.has(id));
      } catch (e) {
        paused = true;
        status('Queue paused: ' + e);
        break;
      }
    }
  } finally {
    working = false;
  }
}
let onChunk;
$('mic').onclick = async () => {
  if (starting) return;
  starting = true;
  try {
    if (recording) {
      recording = false;
      $('mic').textContent = 'Start dictation';
      await capture.stop(onChunk);
      return;
    }
    if (importing) return;
    const options = {
      mode: $('mode').value,
      settings: { ...state.settings, punctuation: $('punctuation').checked },
      snapshot: state.draft,
      selection: [...selection],
    };
    let submitted = false;
    onChunk = (blob) => {
      if (options.mode === 'edit' && submitted) return;
      submitted = true;
      void accept(blob, options).catch(() => {});
      if (options.mode === 'edit' && recording) {
        recording = false;
        $('mic').textContent = 'Start dictation';
        void capture.stop(() => {});
      }
    };
    capture = new Capture();
    await capture.start(
      '',
      options.settings.pause,
      onChunk,
      () => {},
      () => {
        recording = false;
        $('mic').textContent = 'Start dictation';
        void capture.stop(onChunk);
        status('Microphone disconnected.');
      },
      options.settings.sensitivity,
    );
    recording = true;
    $('mic').textContent = 'Stop';
    status('Listening. Pause between ideas.');
  } catch (e) {
    status('Could not access the microphone: ' + e);
  } finally {
    starting = false;
  }
};
async function copy() {
  await navigator.clipboard.writeText(state.draft);
  status('Copied. Use Ctrl+V / Cmd+V.');
}
$('copy').onclick = () => void copy().catch((e) => status(String(e)));
$('undo').onclick = undo;
$('redo').onclick = redo;
$('retry').onclick = async () => {
  if (starting || recording || working || importing) return;
  if (!recognizer) {
    status('Load the model first.');
    return;
  }
  try {
    await mutate(() => savePending());
    paused = false;
    await drain();
  } catch (error) {
    status('Could not save pending audio: ' + String(error));
  }
};
$('discard').onclick = async () => {
  if (starting || working || recording || importing) return;
  if (confirm('Delete pending audio?')) {
    await mutate(async () => {
      const previous = pending;
      pending = [];
      try {
        await savePending();
        paused = false;
      } catch (error) {
        pending = previous;
        render();
        throw error;
      }
    });
  }
};
$('insert').onclick = async () => {
  if (starting || recording || working || importing) {
    status('Stop dictation before inserting text.');
    return;
  }
  try {
    const r = await chrome.runtime.sendMessage({
      type: 'insert',
      text: state.draft,
    });
    status(r.error || 'Text inserted. Review the result.');
  } catch (e) {
    status(String(e));
  }
};
$('private').onclick = async () => {
  if (starting || recording || working || importing || pending.length) {
    status('Stop dictation and resolve pending audio first.');
    return;
  }
  starting = true;
  try {
    await Promise.all([save, queueSave, mutations]);
    manual.reset();
    if (privateMode) {
      state = normalState;
      privateMode = false;
      normalState = null;
    } else {
      normalState = structuredClone(state);
      privateMode = true;
      state = {
        ...structuredClone(state),
        draft: '',
        versions: [],
        redo: [],
        done: [],
      };
    }
    render();
    $('private').textContent = privateMode ? 'Exit private session' : 'Private session';
    status(
      privateMode
        ? 'Private session: content is not saved automatically.'
        : 'Private session closed.',
    );
  } finally {
    starting = false;
  }
};
$('save-template').onclick = () => {
  const name = $('template-name').value.trim();
  if (!name || !state.draft) return;
  state.templates.push({ id: crypto.randomUUID(), name, text: state.draft });
  $('template-name').value = '';
  render();
  void persist();
};
function download(name, text) {
  const u = URL.createObjectURL(new Blob([text], { type: 'application/json' })),
    a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}
$('backup').onclick = async () => {
  try {
    const id = crypto.randomUUID(),
      session = {
        id,
        text: state.draft,
        original: state.draft,
        created: Date.now(),
        versions: state.versions,
        done: [],
      };
    download(
      'gosu-speech-to-text-extension-backup.gosu',
      await encodeBackup(
        {
          sessions: [session],
          active: id,
          settings: state.settings,
          snippets: state.templates,
        },
        $('password').value,
      ),
    );
    status('Backup downloaded. Without a password, it is exported unencrypted.');
  } catch (e) {
    status(String(e));
  }
};
$('restore').onchange = async (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (!f || starting || working || recording || importing || pending.length) return;
  try {
    const backup = await decodeBackup(await f.text(), $('password').value);
    if (!confirm('Replace the draft and settings with this backup?')) return;
    if (starting || recording || working || importing || pending.length)
      throw Error('Stop dictation before restoring.');
    manual.reset();
    const active = backup.sessions.find((x) => x.id === backup.active);
    state = {
      draft: active.text,
      versions: active.versions,
      redo: [],
      done: [],
      settings: backup.settings,
      templates: backup.snippets || [],
    };
    render();
    await persist();
    status('Active draft and settings restored. Other drafts remain in the backup file.');
  } catch (e) {
    status(String(e));
  }
};
$('import-audio').onchange = async (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (!f) return;
  if (!recognizer || starting || recording || working || importing || pending.length) {
    status('Load the model and resolve pending audio first.');
    return;
  }
  importing = true;
  paused = true;
  try {
    await importRecording(
      f,
      (blob) =>
        accept(blob, {
          mode: 'dictate',
          settings: { ...state.settings },
          snapshot: state.draft,
          selection: [0, 0],
        }),
      status,
    );
    paused = false;
    void drain();
  } catch (e) {
    if (!pending.length) paused = false;
    status(String(e));
  } finally {
    importing = false;
  }
};
function read() {
  if (!('speechSynthesis' in window)) {
    status('Read aloud is unavailable.');
    return;
  }
  speechSynthesis.cancel();
  const voices = speechSynthesis.getVoices().filter((v) => v.localService);
  if (!voices.length) {
    status('No local voices are available on this system.');
    return;
  }
  const voice = new SpeechSynthesisUtterance(state.draft);
  voice.lang = state.settings.language === 'auto' ? '' : state.settings.language;
  voice.voice =
    voices.find((v) => v.lang.startsWith(state.settings.language)) || voices[0];
  speechSynthesis.speak(voice);
}
$('read').onclick = read;
$('stop-read').onclick = () => speechSynthesis.cancel();
$('clear').onclick = async () => {
  if (starting || recording || working || importing) return;
  if (!confirm('Delete text, history, and pending audio?')) return;
  starting = true;
  try {
    await mutate(async () => {
      const previous = pending;
      pending = [];
      try {
        await savePending();
      } catch (error) {
        pending = previous;
        render();
        throw error;
      }
    });
    const previous = structuredClone(state);
    state = { ...state, draft: '', versions: [], redo: [], done: [] };
    paused = false;
    manual.reset();
    render();
    try {
      await persist();
    } catch (error) {
      state = previous;
      render();
      throw error;
    }
  } finally {
    starting = false;
  }
};
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && e.code === 'KeyC') {
    e.preventDefault();
    void copy().catch((err) => status(String(err)));
  }
});
window.addEventListener('pagehide', () => {
  recording = false;
  void capture?.stop(onChunk || (() => {}));
  globalThis.speechSynthesis?.cancel();
});
window.addEventListener('beforeunload', (e) => {
  if (
    starting ||
    recording ||
    working ||
    importing ||
    privateMode ||
    !saved ||
    !queueSaved
  ) {
    e.preventDefault();
    e.returnValue = '';
  }
});
render();
if (pending.length) status('Pending audio recovered. Load the model and select Retry.');

// DOM event dispatch does not observe promises returned by event handlers.
for (const element of document.querySelectorAll('button,input,textarea,select')) {
  for (const name of ['onclick', 'onchange', 'oninput']) {
    const handler = element[name];
    if (!handler) continue;
    element[name] = function (event) {
      try {
        const result = handler.call(this, event);
        if (result && typeof result.catch === 'function')
          return result.catch((error) => status(String(error)));
        return result;
      } catch (error) {
        status(String(error));
      }
    };
  }
}
