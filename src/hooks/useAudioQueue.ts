import { appendTranscript } from '../speech';
import { useRef, useState, type MutableRefObject } from 'react';
import { set } from 'idb-keyval';
import type { Job } from '../jobs';
import { retainReceipts } from '../jobs';
import type { Session, State } from '../product';
import { dictionaryOf, punctuation } from '../product';
import { clean } from '../core';
import { pushHistory } from '../history';
import { SerialWriter } from '../persistence';
import { transcribeAudio, type Recognition } from '../transport';

type Options = {
  state: MutableRefObject<State>;
  privateMode: MutableRefObject<boolean>;
  baseUrl: MutableRefObject<string>;
  token: MutableRefObject<string>;
  persistState: (state: State) => Promise<void>;
  patchSession: (id: string, fn: (session: Session) => Session) => void;
  applyCommand: (text: string, job: Job) => Promise<void>;
  onTranscript: (result: Recognition) => void;
  onDictation: (session: string) => void;
  onBusy: (busy: boolean) => void;
  notify: (message: string) => void;
  onError: (message: string) => void;
};

/** Save audio before processing; save the receipt before deleting its audio. */
export function useAudioQueue(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [jobs, setJobs] = useState<Job[]>([]);
  const allJobs = useRef<Job[]>([]);
  const queue = useRef<Job[]>([]);
  const working = useRef(false);
  const stalled = useRef(false);
  const writer = useRef(new SerialWriter<Job[]>((list) => set('voz-jobs', list)));
  const mutations = useRef(Promise.resolve());
  const intake = useRef(0);
  const idleListeners = useRef(new Set<() => void>());

  function active() {
    return working.current || intake.current > 0;
  }
  function notifyIdle() {
    if (active()) return;
    for (const listener of idleListeners.current) listener();
    idleListeners.current.clear();
  }
  async function waitForIdle() {
    if (active())
      await new Promise<void>((resolve) => idleListeners.current.add(resolve));
    await mutations.current;
    return !stalled.current;
  }

  function mutate(fn: () => Promise<void>) {
    const result = mutations.current.catch(() => {}).then(fn);
    mutations.current = result;
    return result;
  }
  function persistJobs(list: Job[]) {
    setJobs(list);
    return latest.current.privateMode.current
      ? Promise.resolve()
      : writer.current.save(list);
  }
  function restore(pending: Job[]) {
    allJobs.current = pending;
    stalled.current = pending.length > 0;
    setJobs(pending);
  }
  async function removeJob(id: string) {
    await mutate(async () => {
      const next = allJobs.current.filter((job) => job.id !== id);
      try {
        await persistJobs(next);
      } catch (error) {
        setJobs(allJobs.current);
        throw error;
      }
      allJobs.current = next;
    });
    pruneReceipts();
  }
  function pruneReceipts() {
    // Receipts survive failed deletion and are pruned only after durable removal.
    const pending = new Set(allJobs.current.map((job) => job.id));
    const { state, patchSession } = latest.current;
    for (const session of state.current.sessions) {
      const done = retainReceipts(session.done, pending);
      if (done.length !== session.done.length)
        patchSession(session.id, (value) => ({ ...value, done }));
    }
  }
  async function enqueue(job: Job) {
    intake.current++;
    latest.current.onBusy(true);
    try {
      await mutate(async () => {
        const list = [...allJobs.current, job];
        allJobs.current = list; // Preserve in memory even if storage is full.
        await persistJobs(list);
      });
      if (!stalled.current) {
        queue.current.push(job);
        void drain();
      }
    } catch (error) {
      stalled.current = true;
      queue.current = [];
      latest.current.onError(
        'Could not save audio. Stop recording. Unsaved audio remains in memory.',
      );
      throw error;
    } finally {
      intake.current--;
      if (!active()) latest.current.onBusy(false);
      notifyIdle();
    }
  }
  async function drain() {
    if (working.current) return;
    working.current = true;
    latest.current.onBusy(true);
    try {
      while (queue.current.length && !stalled.current) {
        const job = queue.current.shift()!;
        try {
          const o = latest.current;
          if (
            !o.state.current.sessions
              .find((s) => s.id === job.session)
              ?.done.includes(job.id)
          ) {
            const dictionary = dictionaryOf(job.settings.dictionary);
            const result = await transcribeAudio(
              job.blob,
              job.settings.language,
              Object.values(dictionary).join(', ').slice(0, 2000),
              o.baseUrl.current,
              o.token.current,
            );
            o.onTranscript(result);
            const session = o.state.current.sessions.find((s) => s.id === job.session);
            if (!session) throw Error('The destination draft no longer exists.');
            if (job.editing) {
              if (session.text !== job.snapshot)
                throw Error(
                  'The draft changed during the command. Audio has been preserved.',
                );
              await o.applyCommand(result.text, job);
            } else if (result.text) {
              const raw = job.settings.punctuation
                ? punctuation(result.text, job.settings.language)
                : result.text;
              const text =
                job.settings.mode === 'clean'
                  ? clean(
                      raw,
                      job.settings.fillers.split(',').filter(Boolean),
                      dictionary,
                    )
                  : raw;
              o.patchSession(job.session, (s) => ({
                ...s,
                text: appendTranscript(s.text, text, job.settings.language),
                original: appendTranscript(
                  s.original,
                  result.text,
                  job.settings.language,
                ),
                versions: pushHistory(s.versions, s.text),
                redo: [],
              }));
              o.onDictation(job.session);
              o.notify('Chunk added. You can keep speaking.');
            } else o.notify('No speech detected in this chunk.');
            o.patchSession(job.session, (s) => ({
              ...s,
              done: [...s.done, job.id],
            }));
          }
          await latest.current.persistState(latest.current.state.current);
          await removeJob(job.id);
        } catch (error) {
          stalled.current = true;
          queue.current = [];
          latest.current.onError(
            String(error) +
              ' · Queue paused. Audio remains recoverable in Pending audio.',
          );
          break;
        }
      }
    } finally {
      working.current = false;
      latest.current.onBusy(intake.current > 0);
      notifyIdle();
    }
  }
  async function retry() {
    if (active()) return;
    // An earlier enqueue may only have survived in memory. Save it before retrying.
    try {
      await mutate(() => persistJobs([...allJobs.current]));
    } catch (error) {
      latest.current.onError('Could not save pending audio: ' + String(error));
      return;
    }
    stalled.current = false;
    queue.current = [...allJobs.current];
    await drain();
  }
  async function discard() {
    if (active()) throw Error('Wait for audio to finish saving and processing.');
    try {
      await mutate(async () => {
        await persistJobs([]);
        allJobs.current = [];
        queue.current = [];
        stalled.current = false;
      });
      pruneReceipts();
    } catch (error) {
      setJobs(allJobs.current);
      latest.current.onError('Could not delete audio: ' + String(error));
      throw error;
    }
  }
  function flush() {
    return mutations.current;
  }
  return {
    jobs,
    allJobs,
    working,
    active,
    stalled,
    restore,
    enqueue,
    retry,
    discard,
    flush,
    waitForIdle,
  };
}
