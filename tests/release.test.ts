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
