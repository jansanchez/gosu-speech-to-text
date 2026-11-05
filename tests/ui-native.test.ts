import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import 'fake-indexeddb/auto';
import { get, clear } from 'idb-keyval';
// Native UI contract: capture + IndexedDB are real; Rust IPC and recognition are simulated.
(globalThis as any).isTauri = true;
const win = new Window({ url: 'http://127.0.0.1:1420' });
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLTextAreaElement',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
])
  Object.defineProperty(globalThis, key, {
    value: key === 'window' ? win : (win as any)[key],
    configurable: true,
  });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
class Context {
  sampleRate = 16000;
  destination = {};
  audioWorklet = { addModule: async () => {} };
  createGain() {
    return { gain: { value: 0 }, connect() {} };
  }
  createMediaStreamSource() {
    return { connect() {} };
  }
  async resume() {}
  async close() {}
}
let node: any;
class Node {
  port = { onmessage: null as any };
  constructor() {
    node = this;
  }
  connect() {}
  disconnect() {}
}
(globalThis as any).AudioContext = Context;
(globalThis as any).AudioWorkletNode = Node;
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: async () => ({ getTracks: () => [{ stop() {}, onended: null }] }),
    enumerateDevices: async () => [],
  },
});
let clipboard = '';
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: async (text: string) => {
      clipboard = text;
    },
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: App } = await import('../src/App.tsx');
let rewriteResult = 'No enviar 42 mensajes hoy.',
  nativeReady = false,
  fail = false,
  calls = 0,
  restartCalls = 0;
const replies = ['Mañana revisaré el documento.', 'cambia Mañana por Hoy', 'Otro tramo.'];
const events = new Map<number, (event: any) => void>();
let nextEvent = 1;
let dictationListener = 0;
let insertionFailure = false,
  targetFailure = false;
let recognitionGate: Promise<void> | null = null;
const nativeShortcuts = new Set<string>();
const removedShortcuts: string[] = [];
let foreignShortcut = false;
let rejectedShortcut = '';
const insertions: { targetId: string; text: string }[] = [];
const windowModes: string[] = [];
(win as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} };
(win as any).__TAURI_INTERNALS__ = {
  transformCallback: (fn: (event: any) => void) => {
    const id = nextEvent++;
    events.set(id, fn);
    return id;
  },
  unregisterCallback: () => {},
  invoke: async (cmd: string, args: any) => {
    if (cmd === 'plugin:event|listen') {
      if (args.event === 'dictation-toggle') dictationListener = args.handler;
      return args.handler;
    }
    if (cmd === 'plugin:global-shortcut|is_registered')
      return nativeShortcuts.has(args.shortcut);
    if (cmd === 'plugin:global-shortcut|unregister') {
      for (const key of args.shortcuts) {
        removedShortcuts.push(key);
        nativeShortcuts.delete(key);
      }
      return;
    }
    if (cmd === 'plugin:global-shortcut|register') {
      for (const key of args.shortcuts) {
        if (
          nativeShortcuts.has(key) ||
          (foreignShortcut && key === 'Control+Alt+C') ||
          key === rejectedShortcut
        )
          throw Error('HotKey already registered');
        nativeShortcuts.add(key);
      }
      return;
    }
    if (cmd === 'dictation_target' && targetFailure)
      throw Error('Permiso del sistema denegado');
    if (cmd === 'dictation_target')
      return {
        id: 'test-window',
        app: 'org.wezfurlong.wezterm',
        name: 'WezTerm',
        terminal: true,
        pid: 12345,
      };
    if (cmd === 'dictation_insert') {
      if (insertionFailure) throw Error('Destino cerrado');
      insertions.push(args);
      return;
    }
    if (cmd === 'minimal_window') {
      windowModes.push(args.mode);
      return;
    }

    if (cmd === 'engine_restart') {
      restartCalls++;
      return null;
    }
    if (cmd === 'engine_connection')
      return { base_url: 'http://127.0.0.1:43210', token: 'local-test' };
    if (cmd === 'engine_health') {
      if (!nativeReady) throw Error('motor no disponible');
      return { ready: true, model: 'native-fake' };
    }
    if (cmd === 'engine_transcribe') {
      assert.equal(args.language, 'es');
      assert.ok(args.audio.length > 44);
      assert.deepEqual(args.audio.slice(0, 4), [82, 73, 70, 70]);
      calls++;
      if (fail) throw Error('sin conexión nativa');
      if (recognitionGate) await recognitionGate;
      return { text: replies.shift() || 'Recuperado.', words: [], language: 'es' };
    }
    if (cmd === 'engine_rewrite') {
      assert.equal(args.model, 'qwen2.5:1.5b');
      return { text: rewriteResult };
    }
    if (cmd === 'copy_text') clipboard = args.text;
    return null;
  },
};
(globalThis as any).fetch = () => {
  throw Error('Native desktop must not use WebView fetch for the engine');
};
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
async function step(fn: () => any) {
  await React.act(async () => {
    await fn();
    await new Promise((r) => setTimeout(r, 35));
  });
}
function button(text: string) {
  const b = [...container.querySelectorAll('button')].find((x) =>
    x.textContent?.includes(text),
  );
  assert.ok(b, 'Missing button ' + text);
  return b!;
}
function click(text: string) {
  button(text).click();
}
async function input(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : (win as any).HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  el.dispatchEvent(new win.Event('input', { bubbles: true }) as any);
}
async function audio() {
  await step(() => {
    node.port.onmessage({ data: new Float32Array(16000).fill(0.1) });
    node.port.onmessage({ data: new Float32Array(24000) });
  });
  await step(() => {});
}
test('native IPC dictation, correction, clipboard and pending audio recovery without WebView fetch', async () => {
  await clear();
  await step(() => root.render(React.createElement(App)));
  assert.match(container.textContent || '', /Motor sin conexión/);
  await step(() => click('Empezar a dictar'));
  assert.equal(node, undefined, 'Must not capture before engine readiness');
  nativeReady = true;
  await step(() => click('Comprobar motor'));
  assert.match(container.textContent || '', /Motor listo/);
  await step(() => click('Empezar a dictar'));
  await audio();
  await step(() => click('Terminar'));
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Mañana revisaré el documento.',
  );
  await step(() => click('Corregir'));
  await step(() => click('Dictar corrección'));
  await audio();
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Hoy revisaré el documento.',
  );
  await step(() => {
    (container.querySelector('button.header-copy') as HTMLButtonElement).click();
  });
  assert.equal(clipboard, 'Hoy revisaré el documento.');
  assert.ok(button('Dictar corrección')); // one command automatically stops capture
  await step(() => click('Dictar'));
  fail = true;
  await step(() => click('Empezar a dictar'));
  await audio();
  await step(() => click('Terminar'));
  assert.equal((await get<any[]>('voz-jobs'))!.length, 1);
  const before = calls;
  fail = false;
  await step(() => click('Reintentar'));
  await step(() => {});
  assert.equal(calls, before + 1);
  assert.equal((await get<any[]>('voz-jobs'))!.length, 0);
  assert.match(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    /Otro tramo/,
  );
  await step(() => root.unmount());
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() => {});
  assert.match(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    /Hoy revisaré/,
  );
  await step(() => root.unmount());
});

test('natural proposals require confirmation; learned rules require consent; private content never persists', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() => input(container.querySelector('#draft')!, 'No enviar 42 mensajes.'));
  const details = container.querySelector('.workbench details') as HTMLDetailsElement;
  await step(() => {
    details.open = true;
    details.dispatchEvent(new win.Event('toggle') as any);
  });
  const llm = [...container.querySelectorAll('label')]
    .find((a) => a.textContent?.includes('Activar propuestas con Ollama'))!
    .querySelector('input')!;
  await step(() => llm.click());
  const prompt = container.querySelector('.natural-command input') as HTMLInputElement;
  await step(() => input(prompt, 'Hazlo más claro'));
  await step(() => click('Preparar propuesta local'));
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'No enviar 42 mensajes.',
  );
  assert.ok(container.querySelector('.proposal'));
  await step(() =>
    input(container.querySelector('#draft')!, 'No enviar 42 mensajes. Añadido manual.'),
  );
  await step(() => click('Confirmar cambio'));
  assert.match(container.textContent || '', /El borrador cambió/);
  await step(() => click('Cancelar cambio'));
  await step(() => click('Preparar propuesta local'));
  replies.push('confirmar cambio');
  await step(() => click('Corregir'));
  await step(() => click('Dictar corrección'));
  await audio();
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    rewriteResult,
  );
  replies.push('cambia hoy por mañana');
  await step(() => click('Dictar corrección'));
  await audio();
  assert.equal((await get<any>('voz-state')).settings.dictionary, '{}');
  await step(() => click('Recordar esta corrección'));
  assert.equal(
    JSON.parse((await get<any>('voz-state')).settings.dictionary).hoy,
    'mañana',
  );
  const normal = (container.querySelector('#draft') as HTMLTextAreaElement).value;
  await step(() => click('Sesión privada'));
  await step(() =>
    input(container.querySelector('#draft')!, 'Texto privado que no se guarda'),
  );
  const stored = await get<any>('voz-state');
  assert.equal(stored.sessions.find((x: any) => x.id === stored.active).text, normal);
  assert.ok(!JSON.stringify(stored).includes('Texto privado'));
  assert.equal((await get<any[]>('voz-jobs'))?.length || 0, 0);
  await step(() => click('Salir de sesión privada'));
  assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value, normal);
  await step(() => root.unmount());
});

test('retry after a failed transcript save persists the result before removing its audio', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const proto = (globalThis as any).IDBObjectStore.prototype,
    original = proto.put;
  try {
    proto.put = function (value: any, key: any) {
      if (key === 'voz-state') throw Error('QuotaExceededError simulated');
      return original.call(this, value, key);
    };
    replies.push('Resultado recuperable.');
    await step(() => click('Empezar a dictar'));
    await audio();
    await step(() => click('Terminar'));
    assert.equal((await get<any[]>('voz-jobs'))!.length, 1);
    proto.put = original;
    await step(() => click('Reintentar'));
    await step(() => {});
    const saved = await get<any>('voz-state');
    assert.equal(
      saved.sessions.find((a: any) => a.id === saved.active).text,
      'Resultado recuperable.',
    );
    assert.equal((await get<any[]>('voz-jobs'))!.length, 0);
  } finally {
    proto.put = original;
    await step(() => root.unmount());
  }
});

test('failed audio deletion preserves its receipt and retry never transcribes twice', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const proto = (globalThis as any).IDBObjectStore.prototype,
    original = proto.put;
  try {
    proto.put = function (value: any, key: any) {
      if (key === 'voz-jobs' && Array.isArray(value) && value.length === 0)
        throw Error('Audio deletion failed');
      return original.call(this, value, key);
    };
    replies.push('Una sola transcripción.');
    const before = calls;
    await step(() => click('Empezar a dictar'));
    await audio();
    await step(() => click('Terminar'));
    const stored = await get<any>('voz-state');
    assert.equal(stored.sessions[0].done.length, 1);
    assert.equal((await get<any[]>('voz-jobs'))!.length, 1);
    proto.put = original;
    await step(() => click('Reintentar'));
    await step(() => {});
    assert.equal(calls, before + 1);
    assert.equal(
      (container.querySelector('#draft') as HTMLTextAreaElement).value,
      'Una sola transcripción.',
    );
    assert.equal((await get<any[]>('voz-jobs'))!.length, 0);
    assert.equal((await get<any>('voz-state')).sessions[0].done.length, 0);
  } finally {
    proto.put = original;
    await step(() => root.unmount());
  }
});

test('corrupt local state cannot be overwritten by the empty fallback workspace', async () => {
  await clear();
  const { set } = await import('idb-keyval');
  const corrupt = { sessions: [null], active: 'broken', settings: {} };
  await set('voz-state', corrupt);
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() => {});
  assert.match(container.textContent || '', /Los datos originales se conservan/);
  assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).disabled, true);
  assert.equal(button('Empezar a dictar').disabled, true);
  assert.deepEqual(await get('voz-state'), corrupt);
  await step(() => root.unmount());
  assert.deepEqual(await get('voz-state'), corrupt);
});

test('simultaneous microphone clicks request permission once', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const media = navigator.mediaDevices,
    original = media.getUserMedia;
  let requests = 0,
    release!: (value: any) => void;
  media.getUserMedia = () => {
    requests++;
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  try {
    await step(() => {
      click('Empezar a dictar');
      click('Empezar a dictar');
    });
    assert.equal(requests, 1);
    await step(() => release({ getTracks: () => [{ stop() {}, onended: null }] }));
    await step(() => click('Terminar'));
  } finally {
    media.getUserMedia = original;
    await step(() => root.unmount());
  }
});

test('restarting the engine keeps the workspace and pending audio intact', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() => input(container.querySelector('#draft')!, 'Borrador conservado.'));
  fail = true;
  await step(() => click('Empezar a dictar'));
  await audio();
  await step(() => click('Terminar'));
  fail = false;
  const pending = await get<any[]>('voz-jobs'),
    before = restartCalls;
  await step(() => click('Reiniciar motor'));
  assert.equal(restartCalls, before + 1);
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Borrador conservado.',
  );
  assert.deepEqual(
    (await get<any[]>('voz-jobs'))!.map((job) => job.id),
    pending!.map((job) => job.id),
  );
  await step(() => root.unmount());
});

async function primaryShortcut() {
  const handler = events.get(dictationListener);
  assert.ok(handler, 'Primary shortcut listener missing');
  await step(() => handler!({ event: 'dictation-toggle', payload: null }));
}
test('one shortcut records a fresh draft, shows microphone feedback and inserts only that dictation', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() =>
    input(container.querySelector('#draft')!, 'Este borrador no debe pegarse.'),
  );
  const before = insertions.length;
  replies.push('Dictado para el agente.');
  await primaryShortcut();
  assert.ok(container.querySelector('.minimal-dictation'));
  assert.match(container.textContent || '', /Te estoy escuchando/);
  assert.match(container.textContent || '', /WezTerm/);
  assert.equal(windowModes.at(-1), 'overlay');
  await audio();
  assert.equal(insertions.length, before, 'No insertion while still listening');
  assert.ok(
    [...container.querySelectorAll('.minimal-wave i')].some(
      (el) => (el as HTMLElement).style.height,
    ),
  );
  await primaryShortcut();
  await step(() => {});
  assert.deepEqual(insertions.at(-1), {
    targetId: 'test-window',
    text: 'Dictado para el agente.',
  });
  assert.match(container.textContent || '', /Texto insertado/);
  await step(() => click('Editor'));
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Dictado para el agente.',
  );
  assert.equal((await get<any>('voz-state')).sessions.length, 2);
  await step(() => root.unmount());
});
test('minimal mode preserves text when the target rejects insertion and never retries automatically', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const before = insertions.length;
  insertionFailure = true;
  replies.push('Texto recuperable.');
  try {
    await primaryShortcut();
    await audio();
    await primaryShortcut();
    await step(() => {});
    assert.match(container.textContent || '', /Destino cerrado/);
    assert.equal(insertions.length, before);
    await step(() => click('Editor'));
    assert.equal(
      (container.querySelector('#draft') as HTMLTextAreaElement).value,
      'Texto recuperable.',
    );
    assert.equal(insertions.length, before);
  } finally {
    insertionFailure = false;
    await step(() => root.unmount());
  }
});
test('opening the editor during minimal capture stops automatic insertion', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const before = insertions.length;
  replies.push('Conservar sin insertar.');
  await primaryShortcut();
  await audio();
  await step(() => click('Editor'));
  await step(() => {});
  assert.equal(insertions.length, before);
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Conservar sin insertar.',
  );
  await step(() => root.unmount());
});

test('minimal insertion waits for the final in-flight transcript and ignores repeated stop shortcuts', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const before = insertions.length;
  let release!: () => void;
  recognitionGate = new Promise((resolve) => {
    release = resolve;
  });
  replies.push('Resultado completo.');
  try {
    await primaryShortcut();
    await audio();
    await primaryShortcut();
    assert.match(container.textContent || '', /Terminando transcripción/);
    assert.equal(insertions.length, before);
    await primaryShortcut();
    assert.equal(insertions.length, before);
    recognitionGate = null;
    await step(() => release());
    await step(() => {});
    assert.equal(insertions.length, before + 1);
    assert.equal(insertions.at(-1)!.text, 'Resultado completo.');
  } finally {
    recognitionGate = null;
    release();
    await step(() => root.unmount());
  }
});
test('denied system integration never opens a microphone or inserts text', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const previousNode = node,
    before = insertions.length;
  targetFailure = true;
  try {
    await primaryShortcut();
    assert.match(container.textContent || '', /Permiso del sistema denegado/);
    assert.equal(node, previousNode);
    assert.equal(insertions.length, before);
  } finally {
    targetFailure = false;
    await step(() => root.unmount());
  }
});
test('stale shortcuts owned by GOSU are renewed and foreign shortcuts are never unregistered', async () => {
  await clear();
  nativeShortcuts.add('CommandOrControl+Shift+Space');
  nativeShortcuts.add('Control+Alt+C');
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  assert.doesNotMatch(container.textContent || '', /No se pudieron registrar/);
  assert.equal(nativeShortcuts.size, 5);
  await step(() => root.unmount());
  assert.equal(nativeShortcuts.size, 0);
  foreignShortcut = true;
  const before = removedShortcuts.length;
  try {
    root = createRoot(container);
    await step(() => root.render(React.createElement(App)));
    assert.match(container.textContent || '', /HotKey already registered/);
    assert.ok(!removedShortcuts.slice(before).includes('Control+Alt+C'));
  } finally {
    foreignShortcut = false;
    await step(() => root.unmount());
  }
});

function shortcutControl(text: string) {
  const button = [...container.querySelectorAll('.settings button')].find(
    (button) => button.textContent === text,
  );
  assert.ok(button);
  return button as HTMLButtonElement;
}
async function chooseShortcut() {
  await step(() => click('Preferencias'));
  await step(() => shortcutControl('Elegir combinación').click());
  const field = container.querySelector(
    '.settings input[aria-label="Combinación del atajo de dictado"]',
  ) as HTMLInputElement;
  assert.equal(field.getAttribute('data-shortcut-capture'), 'true');
  assert.equal(
    nativeShortcuts.size,
    0,
    'Global grabs must be released while capturing a chord',
  );
  await step(() =>
    field.dispatchEvent(
      new win.KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      }) as any,
    ),
  );
  assert.match(field.value, /Ctrl.*Alt.*K/);
  await step(() => shortcutControl('Guardar atajo').click());
  await step(() => {});
}
test('the user can record a shortcut and it stays configured after restarting the interface', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await chooseShortcut();
  assert.equal((await get<any>('voz-state')).settings.shortcut, 'Control+Alt+K');
  assert.ok(nativeShortcuts.has('Control+Alt+K'));
  assert.ok(!nativeShortcuts.has('CommandOrControl+Shift+Space'));
  await step(() => root.unmount());
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  assert.ok(nativeShortcuts.has('Control+Alt+K'));
  assert.equal((await get<any>('voz-state')).settings.shortcut, 'Control+Alt+K');
  await step(() => root.unmount());
});
test('an unavailable new shortcut restores the previous usable shortcut', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  rejectedShortcut = 'Control+Alt+K';
  try {
    await chooseShortcut();
    await step(() => {});
    assert.equal(
      (await get<any>('voz-state')).settings.shortcut,
      'CommandOrControl+Shift+Space',
    );
    assert.ok(nativeShortcuts.has('CommandOrControl+Shift+Space'));
    assert.match(
      container.querySelector('.settings')!.textContent || '',
      /Se conservó el atajo anterior/,
    );
  } finally {
    rejectedShortcut = '';
    await step(() => root.unmount());
  }
});
