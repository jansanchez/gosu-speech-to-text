import { priorityLanguages, speechControl, spokenPunctuation } from './speech';
import { validateWorkspace } from './validation';
/** Pure product operations shared by the desktop UI and tests. */
export type Snippet = { id: string; name: string; text: string };
export type Session = {
  id: string;
  text: string;
  original: string;
  created: number;
  versions: string[];
  done: string[];
  redo?: string[];
  favorite?: boolean;
  title?: string;
  tags?: string;
};
export type Settings = {
  language: string;
  mode: 'literal' | 'clean';
  pause: number;
  device: string;
  shortcut: string;
  minimalShortcut: string;
  visibilityShortcut: string;
  fillers: string;
  dictionary: string;
  punctuation: boolean;
  contrast: boolean;
  fontSize: number;
  retentionDays: number;
  llm: boolean;
  llmModel: string;
  sounds: boolean;
  sensitivity: number;
  embeddingModel: string;
};
export type State = {
  sessions: Session[];
  active: string;
  settings: Settings;
  snippets?: Snippet[];
};
export const defaults: Settings = {
  language: 'en',
  mode: 'clean',
  pause: 1.2,
  device: '',
  shortcut: 'CommandOrControl+Shift+Space',
  minimalShortcut: 'CommandOrControl+Shift+M',
  visibilityShortcut: 'CommandOrControl+Shift+H',
  fillers: '',
  dictionary: '{}',
  punctuation: false,
  contrast: false,
  fontSize: 20,
  retentionDays: 30,
  llm: false,
  llmModel: 'qwen2.5:1.5b',
  sounds: false,
  sensitivity: 0.008,
  embeddingModel: 'bge-m3',
};
export const languages = [
  ['auto', 'Detect automatically'],
  ...priorityLanguages,
  ['de', 'German'],
  ['it', 'Italian'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['id', 'Indonesian'],
  ['tr', 'Turkish'],
  ['vi', 'Vietnamese'],
  ['ta', 'Tamil'],
  ['te', 'Telugu'],
  ['mr', 'Marathi'],
  ['fa', 'Persian'],
  ['sw', 'Swahili'],
  ['pl', 'Polish'],
  ['uk', 'Ukrainian'],
  ['nl', 'Dutch'],
  ['th', 'Thai'],
  ['tl', 'Filipino'],
  ['gu', 'Gujarati'],
  ['pa', 'Punjabi'],
  ['ro', 'Romanian'],
  ['sv', 'Swedish'],
];
export const punctuation = spokenPunctuation;
export const control = speechControl;
export function dictionaryOf(value: string): Record<string, string> {
  try {
    const x = JSON.parse(value);
    return x &&
      typeof x === 'object' &&
      !Array.isArray(x) &&
      Object.values(x).every((v) => typeof v === 'string')
      ? x
      : {};
  } catch {
    return {};
  }
}
export function validateBackup(input: unknown): State {
  if (
    !input ||
    typeof input !== 'object' ||
    !('schema' in input) ||
    input.schema !== 2 ||
    !('state' in input)
  )
    throw Error('Invalid backup.');
  return validateWorkspace(input.state, true);
}

function b64(bytes: Uint8Array) {
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text);
}
function un64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function key(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function encodeBackup(state: State, password: string) {
  const plain = JSON.stringify({
    schema: 2,
    created: new Date().toISOString(),
    state,
  });
  if (new TextEncoder().encode(plain).byteLength > 20_000_000)
    throw Error('The backup exceeds 20 MB. Export or clear history before backing up.');
  if (!password) return plain;
  if (password.length < 10) throw Error('Use a password with at least 10 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12)),
    iterations = 600000;
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(password, salt, iterations),
    new TextEncoder().encode(plain),
  );
  return JSON.stringify({
    format: 'voz-aes-gcm-v1',
    iterations,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(new Uint8Array(data)),
  });
}
export async function decodeBackup(text: string, password: string) {
  if (text.length > 30_000_000) throw Error('Backup too large (maximum 30 MB).');
  let x = JSON.parse(text);
  if (x?.format === 'voz-aes-gcm-v1') {
    if (
      !Number.isInteger(x.iterations) ||
      x.iterations < 100000 ||
      x.iterations > 2000000 ||
      typeof x.data !== 'string'
    )
      throw Error('Invalid encrypted format.');
    try {
      const salt = un64(x.salt),
        iv = un64(x.iv);
      if (salt.length !== 16 || iv.length !== 12) throw Error();
      const raw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        await key(password, salt, x.iterations),
        un64(x.data) as BufferSource,
      );
      x = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      throw Error('Incorrect password or damaged backup.');
    }
  }
  return validateBackup(x);
}
