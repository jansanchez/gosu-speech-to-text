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
    throw Error('Incluye Ctrl, Alt o la tecla del sistema en la combinación.');
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
    throw Error('Elige una letra, un número, Espacio o una tecla de función.');
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
    throw Error('Esa combinación ya se usa en GOSU. Elige otra.');
  return shortcut;
}

export function shortcutLabel(value: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  return value
    .replace('CommandOrControl', mac ? 'Cmd' : 'Ctrl')
    .replace('Control', 'Ctrl')
    .replace('Super', mac ? 'Cmd' : 'Super')
    .replace('Space', 'Espacio')
    .replaceAll('+', ' + ');
}
