import type { Settings } from './product';
import { validateSettings } from './validation';

export type Job = {
  id: string;
  session: string;
  blob: Blob;
  editing: boolean;
  selection?: [number, number];
  snapshot: string;
  settings: Settings;
};

export function validateJobs(input: unknown): Job[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw Error('Cola de audio inválida.');
  const ids = new Set<string>();
  return input.map((value) => {
    if (!value || typeof value !== 'object') throw Error('Fragmento de audio inválido.');
    const job = value as Job;
    if (
      typeof job.id !== 'string' ||
      !job.id ||
      ids.has(job.id) ||
      typeof job.session !== 'string' ||
      !job.session ||
      !job.blob ||
      typeof job.blob.arrayBuffer !== 'function' ||
      !Number.isFinite(job.blob.size) ||
      job.blob.size < 44 ||
      job.blob.size > 5_000_000 ||
      typeof job.editing !== 'boolean' ||
      typeof job.snapshot !== 'string' ||
      (job.selection !== undefined &&
        (!Array.isArray(job.selection) ||
          job.selection.length !== 2 ||
          job.selection.some((n) => !Number.isInteger(n) || n < 0) ||
          job.selection[1] < job.selection[0]))
    )
      throw Error('Fragmento de audio inválido.');
    ids.add(job.id);
    return { ...job, settings: validateSettings(job.settings) };
  });
}

/** Keep receipts only for audio that could still be recovered from disk. */
export function retainReceipts(done: string[], pendingIds: Set<string>): string[] {
  return done.filter((id) => pendingIds.has(id));
}
