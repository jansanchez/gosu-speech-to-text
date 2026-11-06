import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import 'fake-indexeddb/auto';
import { clear, get } from 'idb-keyval';
import { defaults } from '../src/product';

// Execute the shipped recorder, substituting only model inference and device access.
const bundled = await build({
  entryPoints: ['extension/recorder.js'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  plugins: [
    {
      name: 'test-devices',
      setup(api) {
        api.onResolve({ filter: /^@huggingface\/transformers$/ }, () => ({
          path: 'model',
          namespace: 'fake',
        }));
        api.onResolve({ filter: /src\/audio$/ }, () => ({
          path: 'capture',
          namespace: 'fake',
        }));
        api.onLoad({ filter: /.*/, namespace: 'fake' }, ({ path }) => ({
          contents:
            path === 'model'
              ? `export const env={backends:{onnx:{wasm:{}}}};export async function pipeline(){return globalThis.extensionDevice.recognize;}`
              : `export class Capture {async start(_device,_pause,onChunk){globalThis.extensionDevice.requests++;globalThis.extensionDevice.chunk=onChunk;await globalThis.extensionDevice.permission;}async stop(){}}`,
        }));
      },
    },
  ],
});

const html = await readFile('extension/recorder.html', 'utf8');
let sequence = 0;
async function setup(workspace: unknown) {
  await clear();
  const win = new Window({ url: 'http://localhost' });
  win.document.write(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ''));
  for (const key of ['window', 'document', 'navigator'])
    Object.defineProperty(globalThis, key, {
      value: key === 'window' ? win : (win as any)[key],
      configurable: true,
    });
  let stored: any = { workspace },
    failDeletion = false,
    inference = 0;
  const device = {
    requests: 0,
    permission: Promise.resolve(),
    chunk: (_blob: Blob) => {},
    recognize: async () => {
      inference++;
      return { text: 'Transcrito.' };
    },
  };
  (globalThis as any).extensionDevice = device;
  (globalThis as any).chrome = {
    runtime: { getURL: (path: string) => path },
    storage: {
      local: {
        get: async () => structuredClone(stored),
        set: async (value: unknown) => {
          stored = { ...stored, ...structuredClone(value) };
        },
      },
    },
  };
  (globalThis as any).confirm = () => true;
  (globalThis as any).AudioContext = class {
    async decodeAudioData() {
      return { duration: 1 };
    }
    async close() {}
  };
  (globalThis as any).OfflineAudioContext = class {
    destination = {};
    createBufferSource() {
      return { connect() {}, start() {}, buffer: null };
    }
    async startRendering() {
      return { getChannelData: () => new Float32Array(16000) };
    }
  };
  const prototype = (globalThis as any).IDBObjectStore.prototype;
  const put = prototype.put;
  prototype.put = function (value: any, key: string) {
    if (failDeletion && key === 'voz-extension-audio' && value.length === 0)
      throw Error('disk deletion failed');
    return put.call(this, value, key);
  };
  const source = bundled.outputFiles[0].text + `\n// instance ${sequence++}`;
  const load = () =>
    import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const element = (id: string) => win.document.getElementById(id)! as any;
  const click = (id: string) => element(id).onclick(new win.Event('click'));
  return {
    win,
    load,
    element,
    click,
    device,
    stored: () => stored.workspace,
    failDeletion: (value: boolean) => {
      failDeletion = value;
    },
    inference: () => inference,
    dispose: () => {
      prototype.put = put;
      win.happyDOM.abort();
    },
  };
}
async function settle(condition: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(condition(), 'Recorder did not reach the expected state');
}

test('Chrome recorder branches manual history, gates startup and recovers deletion without duplicate inference', async () => {
  const page = await setup({
    draft: 'A',
    versions: [],
    redo: ['Future'],
    done: [],
    settings: defaults,
    templates: [],
  });
  try {
    await page.load();
    for (const text of ['AB', 'ABC']) {
      page.element('draft').value = text;
      page.element('draft').oninput();
    }
    await settle(() => page.stored().draft === 'ABC');
    assert.deepEqual(page.stored().versions, ['A']);
    assert.deepEqual(page.stored().redo, []);
    page.click('undo');
    assert.equal(page.element('draft').value, 'A');
    page.element('draft').value = 'Branch';
    page.element('draft').oninput();
    await settle(() => page.stored().draft === 'Branch');
    assert.deepEqual(page.stored().redo, []);
    await page.click('load');
    let permit!: () => void;
    page.device.permission = new Promise((resolve) => {
      permit = resolve;
    });
    const starting = page.click('mic');
    await page.click('mic');
    assert.equal(page.device.requests, 1);
    permit();
    await starting;
    page.failDeletion(true);
    page.device.chunk(new Blob([new Uint8Array(44)]));
    await settle(() => page.element('status').textContent.includes('Queue paused'));
    assert.equal(page.inference(), 1);
    assert.equal(page.stored().done.length, 1);
    assert.equal((await get<any[]>('voz-extension-audio'))!.length, 1);
    await page.click('mic');
    page.failDeletion(false);
    await page.click('retry');
    assert.equal(page.inference(), 1);
    assert.equal(page.element('draft').value, 'Branch Transcrito.');
    assert.equal((await get<any[]>('voz-extension-audio'))!.length, 0);
  } finally {
    page.dispose();
  }
});

test('Chrome recorder preserves corrupt storage and disables editing', async () => {
  const corrupt = { draft: 42 };
  const page = await setup(corrupt);
  try {
    await assert.rejects(page.load(), /invalid/i);
    assert.equal(page.element('draft').disabled, true);
    assert.equal(page.element('load').disabled, true);
    assert.deepEqual(page.stored(), corrupt);
    assert.match(page.element('status').textContent, /original data has been preserved/);
  } finally {
    page.dispose();
  }
});
