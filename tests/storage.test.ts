import test from 'node:test';
import assert from 'node:assert/strict';
import { SerialWriter } from '../src/persistence';
import { validateWorkspace, validateSettings } from '../src/validation';
import { validateJobs, retainReceipts } from '../src/jobs';
import {
  validateExtensionWorkspace,
  validateExtensionJobs,
} from '../src/extension-state';
import { defaults } from '../src/product';
import { ManualHistory, pushHistory, HISTORY_CHARACTERS } from '../src/history';

function workspace() {
  return {
    active: 'a',
    settings: { ...defaults, device: 'local-microphone' },
    sessions: [
      {
        id: 'a',
        text: 'Texto',
        original: 'Original',
        created: 1,
        versions: [],
        done: [],
      },
    ],
  };
}

test('serialized writes stay ordered and saved status waits for the newest write', async () => {
  const release: (() => void)[] = [];
  const writes: number[] = [];
  const statuses: boolean[] = [];
  const writer = new SerialWriter<number>(
    async (value) => {
      writes.push(value);
      await new Promise<void>((resolve) => release.push(resolve));
    },
    (saved) => statuses.push(saved),
  );
  const first = writer.save(1),
    second = writer.save(2);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, [1]);
  release.shift()!();
  await first;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, [1, 2]);
  assert.equal(statuses.includes(true), false);
  release.shift()!();
  await second;
  assert.equal(statuses.at(-1), true);
});

test('a failed write is reported and does not poison later saves', async () => {
  const errors: unknown[] = [];
  let stored = '';
  const writer = new SerialWriter<string>(
    async (value) => {
      if (value === 'fail') throw Error('disk full');
      stored = value;
    },
    (_, error) => {
      if (error) errors.push(error);
    },
  );
  await assert.rejects(writer.save('fail'), /disk full/);
  await writer.save('recovered');
  await writer.flush();
  assert.equal(stored, 'recovered');
  assert.equal(errors.length, 1);
});

test('local data and backups share validation while microphone identity only resets on import', () => {
  const state = workspace();
  assert.equal(validateWorkspace(state).settings.device, 'local-microphone');
  assert.equal(validateWorkspace(state, true).settings.device, '');
  assert.equal(validateSettings({ mode: 'literal' }).fontSize, defaults.fontSize);
  assert.equal(validateSettings({ dictionary: '{unfinished' }).dictionary, '{unfinished');
  for (const invalid of [
    null,
    [],
    { ...state, active: 'missing' },
    { ...state, sessions: [null] },
    { ...state, sessions: [...state.sessions, ...state.sessions] },
    { ...state, settings: { sensitivity: 'loud' } },
    { ...state, snippets: [null] },
  ]) {
    assert.throws(() => validateWorkspace(invalid));
  }
  assert.deepEqual(state.sessions[0].versions, []);
});

test('recovered audio is validated and receipts protect every still-pending job', () => {
  const job = {
    id: 'job',
    session: 'a',
    blob: new Blob([new Uint8Array(44)]),
    editing: false,
    snapshot: '',
    settings: defaults,
    selection: [0, 0],
  };
  assert.equal(validateJobs([job])[0].id, 'job');
  for (const invalid of [
    [null],
    [job, job],
    [{ ...job, blob: {} }],
    [{ ...job, selection: [2, 1] }],
    [{ ...job, settings: { pause: 100 } }],
  ]) {
    assert.throws(() => validateJobs(invalid));
  }
  const ids = Array.from({ length: 2500 }, (_, i) => `job-${i}`);
  assert.deepEqual(retainReceipts(ids, new Set(ids)), ids);
  assert.deepEqual(retainReceipts(['old', 'pending'], new Set(['pending'])), ['pending']);
});

test('history has a memory budget and manual typing branches correctly after undo', () => {
  const large = 'x'.repeat(HISTORY_CHARACTERS / 2);
  assert.deepEqual(pushHistory([large, large], large), [large, large]);
  assert.equal(pushHistory(Array(60).fill('a'), 'last').length, 50);
  const manual = new ManualHistory();
  let versions = manual.record('a', [], '', 0);
  versions = manual.record('a', versions, 'H', 100);
  assert.deepEqual(versions, ['']);
  manual.reset();
  assert.deepEqual(manual.record('a', versions, 'Hello', 200), ['', 'Hello']);
});

test('extension legacy workspaces migrate and corrupt state or audio fails closed', () => {
  const migrated = validateExtensionWorkspace({ draft: 'Legacy', versions: ['Before'] });
  assert.equal(migrated.draft, 'Legacy');
  assert.deepEqual(migrated.redo, []);
  assert.deepEqual(migrated.settings, defaults);
  assert.throws(() => validateExtensionWorkspace({ draft: 42 }));
  assert.throws(() => validateExtensionJobs([{ mode: 'execute' }]));
});

test('old settings migrate a distinct panel shortcut without replacing recording preferences', () => {
  const { minimalShortcut: _, ...old } = defaults;
  assert.equal(validateSettings(old).minimalShortcut, defaults.minimalShortcut);
  const migrated = validateSettings({ ...old, shortcut: 'Control+Shift+M' });
  assert.equal(migrated.shortcut, 'Control+Shift+M');
  assert.notEqual(migrated.minimalShortcut, defaults.minimalShortcut);
  assert.throws(
    () => validateSettings({ ...defaults, minimalShortcut: 'Control+Shift+Space' }),
    /Preferencias/,
  );
  assert.throws(
    () => validateSettings({ ...defaults, minimalShortcut: 42 }),
    /Preferencias/,
  );
});

test('visibility shortcut migrates without colliding with existing shortcuts', () => {
  const { visibilityShortcut: _, ...old } = defaults;
  assert.equal(validateSettings(old).visibilityShortcut, 'CommandOrControl+Shift+H');
  assert.equal(
    validateSettings({ ...old, shortcut: 'Control+Shift+H' }).visibilityShortcut,
    'CommandOrControl+Alt+H',
  );
  assert.throws(
    () => validateSettings({ ...defaults, visibilityShortcut: 'Control+Shift+M' }),
    /Preferencias/,
  );
});
