import {
  defaults,
  type Settings,
  type State,
  type Session,
  type Snippet,
} from './product';
import { trimHistory } from './history';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function validateSettings(input: unknown, resetDevice = false): Settings {
  if (!object(input)) throw Error('Preferencias inválidas.');
  // Copy known fields only. Missing fields migrate from older versions.
  const cfg = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (Object.hasOwn(input, key)) Object.assign(cfg, { [key]: input[key] });
  }
  if (
    !['literal', 'clean'].includes(cfg.mode) ||
    typeof cfg.language !== 'string' ||
    !cfg.language ||
    cfg.language.length > 32 ||
    typeof cfg.device !== 'string' ||
    typeof cfg.shortcut !== 'string' ||
    typeof cfg.dictionary !== 'string' ||
    typeof cfg.fillers !== 'string' ||
    !Number.isFinite(cfg.pause) ||
    cfg.pause < 0.5 ||
    cfg.pause > 4 ||
    !Number.isFinite(cfg.fontSize) ||
    cfg.fontSize < 16 ||
    cfg.fontSize > 32 ||
    !Number.isFinite(cfg.retentionDays) ||
    cfg.retentionDays < 0 ||
    cfg.retentionDays > 3650 ||
    !Number.isFinite(cfg.sensitivity) ||
    cfg.sensitivity < 0.002 ||
    cfg.sensitivity > 0.03 ||
    typeof cfg.embeddingModel !== 'string' ||
    cfg.embeddingModel.length > 100 ||
    typeof cfg.llmModel !== 'string' ||
    cfg.llmModel.length > 100 ||
    ['punctuation', 'contrast', 'llm', 'sounds'].some(
      (key) => typeof cfg[key as keyof Settings] !== 'boolean',
    )
  ) {
    throw Error('Preferencias inválidas.');
  }
  // Dictionary may be an unfinished JSON edit; it is interpreted safely by dictionaryOf.
  if (resetDevice) cfg.device = '';
  return cfg;
}

export function validateWorkspace(input: unknown, resetDevice = false): State {
  if (
    !object(input) ||
    !Array.isArray(input.sessions) ||
    !input.sessions.length ||
    input.sessions.length > 5000
  )
    throw Error('Historial local inválido.');
  const ids = new Set<string>();
  const sessions: Session[] = input.sessions.map((value) => {
    if (
      !object(value) ||
      typeof value.id !== 'string' ||
      !value.id ||
      ids.has(value.id) ||
      typeof value.text !== 'string' ||
      value.text.length > 1_000_000 ||
      typeof value.original !== 'string' ||
      !Number.isFinite(value.created) ||
      !strings(value.versions) ||
      !strings(value.done) ||
      (value.redo !== undefined && !strings(value.redo)) ||
      (value.title !== undefined && typeof value.title !== 'string') ||
      (value.tags !== undefined && typeof value.tags !== 'string') ||
      (value.favorite !== undefined && typeof value.favorite !== 'boolean')
    ) {
      throw Error('El historial contiene un borrador inválido.');
    }
    ids.add(value.id);
    const session = value as Session;
    return {
      ...session,
      versions: trimHistory(session.versions),
      ...(session.redo === undefined ? {} : { redo: trimHistory(session.redo) }),
    };
  });
  if (typeof input.active !== 'string' || !ids.has(input.active))
    throw Error('El borrador activo no existe.');
  if (
    input.snippets !== undefined &&
    (!Array.isArray(input.snippets) ||
      input.snippets.length > 1000 ||
      input.snippets.some(
        (value) =>
          !object(value) ||
          typeof value.id !== 'string' ||
          typeof value.name !== 'string' ||
          typeof value.text !== 'string' ||
          value.text.length > 100000,
      ))
  ) {
    throw Error('Plantillas inválidas.');
  }
  return {
    sessions,
    active: input.active,
    settings: validateSettings(input.settings, resetDevice),
    snippets: (input.snippets || []) as Snippet[],
  };
}
