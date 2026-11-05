import test from 'node:test';
import assert from 'node:assert/strict';
import { Capture } from '../src/audio';

let node: FakeNode;
let stops = 0,
  closes = 0;
class FakeContext {
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
  async close() {
    closes++;
  }
}
class FakeNode {
  port = { onmessage: null as null | ((event: { data: Float32Array }) => void) };
  constructor() {
    node = this;
  }
  connect() {}
  disconnect() {}
}
Object.assign(globalThis, { AudioContext: FakeContext, AudioWorkletNode: FakeNode });
const media = {
  getUserMedia: async () => ({
    getTracks: () => [
      {
        stop() {
          stops++;
        },
        onended: null,
      },
    ],
  }),
};
Object.defineProperty(globalThis, 'navigator', {
  value: { mediaDevices: media },
  configurable: true,
});

test('a chunk callback may stop capture without recursive flush or duplicate audio', async () => {
  const capture = new Capture();
  let chunks = 0;
  await capture.start(
    '',
    1.2,
    () => {
      chunks++;
      void capture.stop(() => {
        chunks++;
      });
    },
    () => {},
    () => {},
  );
  node.port.onmessage!({ data: new Float32Array(16000).fill(0.1) });
  node.port.onmessage!({ data: new Float32Array(24000) });
  await capture.stop(() => {
    chunks++;
  });
  assert.equal(chunks, 1);
  assert.equal(stops, 1);
  assert.equal(closes, 1);
});

test('stopping while microphone permission is pending releases the eventual stream', async () => {
  const original = media.getUserMedia;
  let release!: (stream: Awaited<ReturnType<typeof original>>) => void;
  media.getUserMedia = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  try {
    const capture = new Capture();
    const starting = capture.start(
      '',
      1.2,
      () => {},
      () => {},
      () => {},
    );
    await capture.stop(() => {});
    const before = stops;
    release(await original());
    await assert.rejects(starting, /cancelada/);
    assert.equal(stops, before + 1);
  } finally {
    media.getUserMedia = original;
  }
});
