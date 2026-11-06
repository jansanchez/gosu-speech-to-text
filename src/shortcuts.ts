type KeyStroke = Pick<
  KeyboardEvent,
  'code' | 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
>;
const reserved = new Set([
  'Control+Alt+C',
  'Control+Alt+V',
  'Control+Alt+D',
  'Control+Alt+E',
]);

export function shortcutFromKey(event: KeyStroke): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta', 'OS', 'AltGraph'].includes(event.key))
    return null;
  if (!event.ctrlKey && !event.altKey && !event.metaKey)
    throw Error('Include Ctrl, Alt, or the system key in the combination.');
  const code = event.code;
  let key = /^Key[A-Z]$/.test(code)
    ? code.slice(3)
    : /^Digit[0-9]$/.test(code)
      ? code.slice(5)
      : code;
  if (
    !/^(Space|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|F(?:[1-9]|1[0-9]|2[0-4])|[A-Z0-9])$/.test(
      key,
    )
  ) {
    throw Error('Choose a letter, number, Space, or function key.');
  }
  key = key.replace(/^Arrow/, '');
  const shortcut = [
    event.ctrlKey ? 'Control' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Super' : '',
    key,
  ]
    .filter(Boolean)
    .join('+');
  if (reserved.has(shortcut))
    throw Error('That combination is already used in GOSU. Choose another one.');
  return shortcut;
}

export function shortcutLabel(value: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  return value
    .replace('CommandOrControl', mac ? 'Cmd' : 'Ctrl')
    .replace('Control', 'Ctrl')
    .replace('Super', mac ? 'Cmd' : 'Super')
    .replaceAll('+', ' + ');
}
