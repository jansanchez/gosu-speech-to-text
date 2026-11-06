import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-ignore Executable release guard.
import { validateRelease } from '../scripts/check-release.mjs';

test('release guard requires changelog, canonical version and matching tag', () => {
  const notes = '## [0.4.0] — 2026-11-05\n';
  assert.doesNotThrow(() => validateRelease('0.4.0', notes, 'refs/tags/v0.4.0'));
  assert.doesNotThrow(() => validateRelease('0.4.0', notes, 'refs/heads/main'));
  assert.throws(() => validateRelease('0.4.0', notes, 'refs/tags/v0.3.2'));
  assert.throws(() => validateRelease('0.4.0', '', undefined));
  for (const version of ['00.4.0', '0.04.0', '0.4.00', '0.4', '0.4.0-rc.1'])
    assert.throws(() => validateRelease(version, notes, undefined));
});

// @ts-ignore Executable publication coordinator.
import { approval, releaseNotes, uploadRelease } from '../scripts/approve-release.mjs';
test('publication requires explicit approval, main and the exact version', () => {
  assert.doesNotThrow(() =>
    approval('0.5.0', '0.5.0', 'true', 'workflow_dispatch', 'refs/heads/main'),
  );
  assert.throws(() =>
    approval('0.5.0', '0.4.1', 'true', 'workflow_dispatch', 'refs/heads/main'),
  );
  assert.throws(() => approval('0.5.0', '0.5.0', 'true', 'push', 'refs/heads/main'));
  assert.throws(() =>
    approval('0.5.0', '0.5.0', 'true', 'workflow_dispatch', 'refs/tags/v0.5.0'),
  );
  assert.doesNotThrow(() => approval('0.5.0', '', 'false', 'push', 'refs/tags/v0.5.0'));
});
test('release notes contain only the approved version', () => {
  const changelog =
    '# Changes\n## [0.5.0] — 2026-11-05\n\nNew functionality\n\n## [0.4.1] — 2026-11-05\nOld changes';
  assert.equal(releaseNotes('0.5.0', changelog), 'New functionality\n');
  assert.equal(releaseNotes('0.4.1', changelog), 'Old changes\n');
  assert.throws(() => releaseNotes('0.6.0', changelog));
});

test('release becomes public only after every asset uploads; failure leaves the draft', () => {
  const assets = Array.from({ length: 7 }, (_, i) => `asset-${i}`);
  const calls: string[][] = [];
  uploadRelease(
    (_file: string, args: string[]) => calls.push(args),
    'v0.5.0',
    '0.5.0',
    assets,
  );
  assert.ok(calls[0].includes('--draft'));
  assert.deepEqual(calls[1], ['release', 'upload', 'v0.5.0', ...assets]);
  assert.deepEqual(calls[2], ['release', 'edit', 'v0.5.0', '--draft=false']);
  const failed: string[][] = [];
  assert.throws(
    () =>
      uploadRelease(
        (_file: string, args: string[]) => {
          failed.push(args);
          if (args[1] === 'upload') throw Error('network failure');
        },
        'v0.5.0',
        '0.5.0',
        assets,
      ),
    /network failure/,
  );
  assert.equal(failed.length, 2);
  assert.throws(() =>
    uploadRelease(() => assert.fail('must not mutate'), 'v0.5.0', '0.5.0', []),
  );
});
