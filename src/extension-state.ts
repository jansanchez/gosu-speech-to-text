import { defaults, type Settings, type Snippet } from './product';
import { validateWorkspace } from './validation';
import { validateJobs } from './jobs';

export type ExtensionWorkspace = {
  draft: string;
  versions: string[];
  redo: string[];
  done: string[];
  settings: Settings;
  templates: Snippet[];
};

export function validateExtensionWorkspace(input: unknown): ExtensionWorkspace {
  if (!input || typeof input !== 'object') throw Error('Borrador de extensión inválido.');
  const value = input as Partial<ExtensionWorkspace>;
  const checked = validateWorkspace({
    active: 'extension',
    sessions: [
      {
        id: 'extension',
        text: value.draft,
        original: value.draft,
        created: 0,
        versions: value.versions ?? [],
        redo: value.redo ?? [],
        done: value.done ?? [],
      },
    ],
    settings: value.settings ?? defaults,
    snippets: value.templates ?? [],
  });
  const session = checked.sessions[0];
  return {
    draft: session.text,
    versions: session.versions,
    redo: session.redo || [],
    done: session.done,
    settings: checked.settings,
    templates: checked.snippets || [],
  };
}

export function validateExtensionJobs(input: unknown) {
  if (input === undefined) return [];
  if (
    !Array.isArray(input) ||
    input.some((job) => !job || !['dictate', 'edit'].includes(job.mode))
  ) {
    throw Error('Cola de extensión inválida.');
  }
  return validateJobs(
    input.map((job) => ({
      ...job,
      session: 'extension',
      editing: job.mode === 'edit',
    })),
  ).map(({ session, editing, ...job }) => ({
    ...job,
    mode: editing ? 'edit' : 'dictate',
  }));
}
