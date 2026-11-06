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
let panelListener = 0;
let visibilityListener = 0;
let focusedTarget = 'test-window';
let insertionFailure = false,
  targetFailure = false;
let preparationFailure = false;
let clipboardFailure = false;
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
      if (args.event === 'dictation-show') panelListener = args.handler;
      if (args.event === 'app-toggle-visibility') visibilityListener = args.handler;
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
    if (cmd === 'dictation_prepare' && preparationFailure)
      throw Error('Permiso del sistema denegado');
    if (cmd === 'dictation_target' && targetFailure)
      throw Error('Permiso del sistema denegado');
    if (cmd === 'dictation_target')
      return {
        id: focusedTarget,
        app: 'org.wezfurlong.wezterm',
        name: 'WezTerm',
        terminal: true,
        pid: 12345,
      };
    if (cmd === 'dictation_insert') {
      assert.equal(
        clipboard,
        args.text,
        'Copy the complete session before attempting paste',
      );
      if (insertionFailure) throw Error('Destination cerrado');
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
      assert.equal(args.language, 'en');
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
    if (cmd === 'copy_text') {
      if (clipboardFailure) throw Error('Portapapeles no disponible');
      clipboard = args.text;
    }
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
  assert.match(container.textContent || '', /Engine offline/);
  await step(() => click('Start dictation'));
  assert.equal(node, undefined, 'Must not capture before engine readiness');
  nativeReady = true;
  await step(() => click('Check engine'));
  assert.match(container.textContent || '', /Engine ready/);
  await step(() => click('Start dictation'));
  await audio();
  await step(() => click('Stop'));
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Mañana revisaré el documento.',
  );
  await step(() => click('Correct'));
  await step(() => click('Dictate correction'));
  await audio();
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Hoy revisaré el documento.',
  );
  await step(() => {
    (container.querySelector('button.header-copy') as HTMLButtonElement).click();
  });
  assert.equal(clipboard, 'Hoy revisaré el documento.');
  assert.ok(button('Dictate correction')); // one command automatically stops capture
  await step(() => click('Dictate'));
  fail = true;
  await step(() => click('Start dictation'));
  await audio();
  await step(() => click('Stop'));
  assert.equal((await get<any[]>('voz-jobs'))!.length, 1);
  const before = calls;
  fail = false;
  await step(() => click('Retry'));
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
    .find((a) => a.textContent?.includes('Enable suggestions with local Ollama'))!
    .querySelector('input')!;
  await step(() => llm.click());
  const prompt = container.querySelector('.natural-command input') as HTMLInputElement;
  await step(() => input(prompt, 'Hazlo más claro'));
  await step(() => click('Prepare local suggestion'));
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'No enviar 42 mensajes.',
  );
  assert.ok(container.querySelector('.proposal'));
  await step(() =>
    input(container.querySelector('#draft')!, 'No enviar 42 mensajes. Añadido manual.'),
  );
  await step(() => click('Confirm change'));
  assert.match(container.textContent || '', /The draft changed/);
  await step(() => click('Cancel change'));
  await step(() => click('Prepare local suggestion'));
  replies.push('confirmar cambio');
  await step(() => click('Correct'));
  await step(() => click('Dictate correction'));
  await audio();
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    rewriteResult,
  );
  replies.push('cambia hoy por mañana');
  await step(() => click('Dictate correction'));
  await audio();
  assert.equal((await get<any>('voz-state')).settings.dictionary, '{}');
  await step(() => click('Remember this correction'));
  assert.equal(
    JSON.parse((await get<any>('voz-state')).settings.dictionary).hoy,
    'mañana',
  );
  const normal = (container.querySelector('#draft') as HTMLTextAreaElement).value;
  await step(() => click('Private session'));
  await step(() =>
    input(container.querySelector('#draft')!, 'Text privado que no se guarda'),
  );
  const stored = await get<any>('voz-state');
  assert.equal(stored.sessions.find((x: any) => x.id === stored.active).text, normal);
  assert.ok(!JSON.stringify(stored).includes('Text privado'));
  assert.equal((await get<any[]>('voz-jobs'))?.length || 0, 0);
  await step(() => click('Exit private session'));
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
    await step(() => click('Start dictation'));
    await audio();
    await step(() => click('Stop'));
    assert.equal((await get<any[]>('voz-jobs'))!.length, 1);
    proto.put = original;
    await step(() => click('Retry'));
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
    await step(() => click('Start dictation'));
    await audio();
    await step(() => click('Stop'));
    const stored = await get<any>('voz-state');
    assert.equal(stored.sessions[0].done.length, 1);
    assert.equal((await get<any[]>('voz-jobs'))!.length, 1);
    proto.put = original;
    await step(() => click('Retry'));
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
  assert.match(container.textContent || '', /original data has been preserved/);
  assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).disabled, true);
  assert.equal(button('Start dictation').disabled, true);
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
      click('Start dictation');
      click('Start dictation');
    });
    assert.equal(requests, 1);
    await step(() => release({ getTracks: () => [{ stop() {}, onended: null }] }));
    await step(() => click('Stop'));
  } finally {
    media.getUserMedia = original;
    await step(() => root.unmount());
  }
});

test('restarting the engine keeps the workspace and pending audio intact', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() => input(container.querySelector('#draft')!, 'Draft conservado.'));
  fail = true;
  await step(() => click('Start dictation'));
  await audio();
  await step(() => click('Stop'));
  fail = false;
  const pending = await get<any[]>('voz-jobs'),
    before = restartCalls;
  await step(() => click('Restart engine'));
  assert.equal(restartCalls, before + 1);
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Draft conservado.',
  );
  assert.deepEqual(
    (await get<any[]>('voz-jobs'))!.map((job) => job.id),
    pending!.map((job) => job.id),
  );
  await step(() => root.unmount());
});

async function visibilityShortcut() {
  const handler = events.get(visibilityListener);
  assert.ok(handler);
  await step(() => handler!({ event: 'app-toggle-visibility', payload: null }));
}
async function primaryShortcut() {
  if (!container.querySelector('.minimal-dictation')) await panelShortcut();
  const handler = events.get(dictationListener);
  assert.ok(handler, 'Primary shortcut listener missing');
  await step(() => handler!({ event: 'dictation-toggle', payload: null }));
}
async function panelShortcut() {
  const handler = events.get(panelListener);
  assert.ok(handler);
  await step(() => handler!({ event: 'dictation-show', payload: null }));
}
test('independent shortcuts record a fresh draft, shows microphone feedback and inserts only that dictation', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await step(() =>
    input(container.querySelector('#draft')!, 'Este borrador no debe pegarse.'),
  );
  const before = insertions.length;
  replies.push('Dictation para el agente.');
  await panelShortcut();
  assert.ok(container.querySelector('.minimal-dictation'));
  assert.match(container.textContent || '', /Ready to dictate/);
  await primaryShortcut();
  assert.match(container.textContent || '', /Listening to you/);
  assert.match(container.textContent || '', /Destination on stop/);
  assert.equal(windowModes.at(-1), 'overlay');
  focusedTarget = 'last-focused-window';
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
    targetId: 'last-focused-window',
    text: 'Dictation para el agente.',
  });
  assert.match(container.textContent || '', /Text inserted/);
  assert.equal(clipboard, 'Dictation para el agente.');
  assert.equal(windowModes.at(-1), 'overlay');
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'hide');
  const previousNode = node;
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'overlay');
  assert.equal(node, previousNode, 'Showing the panel never opens the microphone');
  assert.match(container.textContent || '', /Text inserted/);
  replies.push('Segundo dictado.');
  await primaryShortcut();
  assert.match(container.textContent || '', /Listening to you/);
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'hide');
  await visibilityShortcut();
  assert.match(container.textContent || '', /Listening to you/);
  await audio();
  await primaryShortcut();
  assert.equal(insertions.at(-1)!.text, 'Segundo dictado.');
  focusedTarget = 'test-window';
  await step(() => click('Editor'));
  assert.equal(
    (container.querySelector('#draft') as HTMLTextAreaElement).value,
    'Segundo dictado.',
  );
  assert.equal((await get<any>('voz-state')).sessions.length, 3);
  await step(() => root.unmount());
});
test('minimal mode preserves text when the target rejects insertion and never retries automatically', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const before = insertions.length;
  insertionFailure = true;
  replies.push('Text recuperable.');
  try {
    await primaryShortcut();
    await audio();
    await primaryShortcut();
    await step(() => {});
    assert.match(container.textContent || '', /Destination cerrado/);
    assert.equal(clipboard, 'Text recuperable.');
    assert.equal(insertions.length, before);
    await step(() => click('Editor'));
    assert.equal(
      (container.querySelector('#draft') as HTMLTextAreaElement).value,
      'Text recuperable.',
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
    assert.match(container.textContent || '', /Finishing transcription/);
    focusedTarget = 'changed-during-processing';
    assert.equal(insertions.length, before);
    await primaryShortcut();
    assert.equal(insertions.length, before);
    recognitionGate = null;
    await step(() => release());
    await step(() => {});
    assert.equal(insertions.length, before + 1);
    assert.equal(insertions.at(-1)!.text, 'Resultado completo.');
    assert.equal(insertions.at(-1)!.targetId, 'test-window');
  } finally {
    recognitionGate = null;
    focusedTarget = 'test-window';
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
  preparationFailure = true;
  try {
    await primaryShortcut();
    assert.match(container.textContent || '', /Permiso del sistema denegado/);
    assert.equal(node, previousNode);
    assert.equal(insertions.length, before);
  } finally {
    preparationFailure = false;
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
  assert.equal(nativeShortcuts.size, 7);
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

function shortcutControl(text: string, panel: boolean | number = false) {
  const button = [
    ...container
      .querySelectorAll('.settings .shortcut-picker')
      [typeof panel === 'number' ? panel : panel ? 1 : 0].querySelectorAll('button'),
  ].find((button) => button.textContent === text);
  assert.ok(button);
  return button as HTMLButtonElement;
}
async function chooseShortcut(panel: boolean | number = false) {
  await step(() => click('Settings'));
  await step(() => shortcutControl('Choose combination', panel).click());
  const field = container.querySelector(
    panel === 2
      ? '.settings input[aria-label="Visibility shortcut combination"]'
      : panel
        ? '.settings input[aria-label="Panel shortcut combination"]'
        : '.settings input[aria-label="Dictation shortcut combination"]',
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
  await step(() => shortcutControl('Save shortcut', panel).click());
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
      /previous shortcut was preserved/,
    );
  } finally {
    rejectedShortcut = '';
    await step(() => root.unmount());
  }
});

test('panel shortcut is configurable and persists independently of recording', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await chooseShortcut(true);
  assert.equal((await get<any>('voz-state')).settings.minimalShortcut, 'Control+Alt+K');
  assert.equal(
    (await get<any>('voz-state')).settings.shortcut,
    'CommandOrControl+Shift+Space',
  );
  await step(() => root.unmount());
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  assert.ok(nativeShortcuts.has('Control+Alt+K'));
  assert.ok(nativeShortcuts.has('CommandOrControl+Shift+Space'));
  await step(() => root.unmount());
});
test('an unavailable panel shortcut restores the previous panel shortcut', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  rejectedShortcut = 'Control+Alt+K';
  try {
    await chooseShortcut(true);
    assert.equal(
      (await get<any>('voz-state')).settings.minimalShortcut,
      'CommandOrControl+Shift+M',
    );
    assert.ok(nativeShortcuts.has('CommandOrControl+Shift+Space'));
    assert.ok(nativeShortcuts.has('CommandOrControl+Shift+M'));
  } finally {
    rejectedShortcut = '';
    await step(() => root.unmount());
  }
});

test('recording starts while GOSU is focused and final text is copied even without a destination', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const before = insertions.length;
  targetFailure = true;
  replies.push('Text para pegar en WezTerm.');
  try {
    await panelShortcut();
    await primaryShortcut();
    assert.match(container.textContent || '', /Listening to you/);
    await audio();
    await primaryShortcut();
    await step(() => {});
    assert.equal(clipboard, 'Text para pegar en WezTerm.');
    assert.equal(insertions.length, before);
    assert.match(container.textContent || '', /Text on clipboard/);
    assert.equal(windowModes.at(-1), 'overlay');
    await visibilityShortcut();
    assert.equal(windowModes.at(-1), 'hide');
    await visibilityShortcut();
    assert.equal(windowModes.at(-1), 'overlay');
  } finally {
    targetFailure = false;
    await step(() => root.unmount());
  }
});

test('clipboard failure preserves the draft without claiming a copy or sending keys', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const before = insertions.length;
  replies.push('Conservar ante fallo del portapapeles.');
  try {
    await primaryShortcut();
    await audio();
    clipboardFailure = true;
    await primaryShortcut();
    await step(() => {});
    assert.equal(insertions.length, before);
    assert.match(container.textContent || '', /Portapapeles no disponible/);
    assert.doesNotMatch(
      container.textContent || '',
      /Text on clipboard|Text inserted and copied/,
    );
    await step(() => click('Editor'));
    assert.equal(
      (container.querySelector('#draft') as HTMLTextAreaElement).value,
      'Conservar ante fallo del portapapeles.',
    );
  } finally {
    clipboardFailure = false;
    await step(() => root.unmount());
  }
});

test('visibility restores the selected editor or minimal view without recording', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  const previousNode = node;
  assert.ok(container.querySelector('#draft'));
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'hide');
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'editor');
  assert.ok(container.querySelector('#draft'));
  await panelShortcut();
  assert.equal(windowModes.at(-1), 'overlay');
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'hide');
  await visibilityShortcut();
  assert.equal(windowModes.at(-1), 'overlay');
  assert.ok(container.querySelector('.minimal-dictation'));
  await panelShortcut();
  assert.equal(windowModes.at(-1), 'editor');
  assert.ok(container.querySelector('#draft'));
  assert.equal(node, previousNode);
  await step(() => {
    const handler = events.get(visibilityListener)!;
    handler({ event: 'app-toggle-visibility', payload: null });
    handler({ event: 'app-toggle-visibility', payload: null });
  });
  assert.equal(windowModes.at(-1), 'editor', 'Rapid visibility toggles are serialized');
  await step(() => root.unmount());
});
test('visibility shortcut persists and recovers independently on conflict', async () => {
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  await chooseShortcut(2);
  assert.equal(
    (await get<any>('voz-state')).settings.visibilityShortcut,
    'Control+Alt+K',
  );
  await step(() => root.unmount());
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  assert.ok(nativeShortcuts.has('Control+Alt+K'));
  assert.ok(nativeShortcuts.has('CommandOrControl+Shift+M'));
  await step(() => root.unmount());
  await clear();
  root = createRoot(container);
  await step(() => root.render(React.createElement(App)));
  rejectedShortcut = 'Control+Alt+K';
  try {
    await chooseShortcut(2);
    assert.equal(
      (await get<any>('voz-state')).settings.visibilityShortcut,
      'CommandOrControl+Shift+H',
    );
    assert.ok(nativeShortcuts.has('CommandOrControl+Shift+H'));
  } finally {
    rejectedShortcut = '';
    await step(() => root.unmount());
  }
});
