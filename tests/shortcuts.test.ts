import test from 'node:test';
import assert from 'node:assert/strict';
import { shortcutFromKey, shortcutLabel } from '../src/shortcuts';

function stroke(values: Partial<KeyboardEvent>) {
  return {
    code: 'KeyK',
    key: 'k',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...values,
  };
}
test('shortcut capture uses physical keys consistently across keyboard layouts', () => {
  assert.equal(shortcutFromKey(stroke({ key: 'л', altKey: true })), 'Control+Alt+K');
  assert.equal(
    shortcutFromKey(stroke({ code: 'Space', key: ' ', shiftKey: true })),
    'Control+Shift+Space',
  );
  assert.equal(
    shortcutFromKey(stroke({ code: 'KeyD', ctrlKey: false, metaKey: true })),
    'Super+D',
  );
});
test('modifier-only strokes wait and unsafe or reserved combinations are rejected', () => {
  assert.equal(shortcutFromKey(stroke({ code: 'ControlLeft', key: 'Control' })), null);
  assert.throws(() => shortcutFromKey(stroke({ ctrlKey: false })), /Include/);
  assert.throws(
    () => shortcutFromKey(stroke({ code: 'KeyC', key: 'c', altKey: true })),
    /already used/,
  );
  assert.throws(() => shortcutFromKey(stroke({ code: 'Unidentified' })), /Choose/);
});
test('the configured chord has a readable label without changing its stored representation', () => {
  assert.match(shortcutLabel('Control+Alt+K'), /Ctrl \+ Alt \+ K/);
});
