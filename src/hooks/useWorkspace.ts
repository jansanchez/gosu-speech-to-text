import { useEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import { defaults, type State, type Session } from '../product';
import { validateWorkspace } from '../validation';
import { validateJobs, retainReceipts, type Job } from '../jobs';
import { SerialWriter } from '../persistence';

export function freshSession(): Session {
  return {
    id: crypto.randomUUID(),
    text: '',
    original: '',
    created: Date.now(),
    versions: [],
    done: [],
  };
}

/** Owns hydration and writes; failed validation never enables automatic saving. */
export function useWorkspace(onError: (message: string) => void) {
  const [state, setState] = useState<State>(() => {
    const initial = freshSession();
    return { sessions: [initial], active: initial.id, settings: defaults };
  });
  const ref = useRef(state);
  ref.current = state;
  const privateRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const [recoveredJobs, setRecoveredJobs] = useState<Job[]>([]);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writer = useRef(
    new SerialWriter<State>(
      (value) => set('voz-state', value),
      (ok, error) => {
        setSaved(ok);
        if (error)
          errorHandler.current('Could not save. Export the text before closing.');
      },
    ),
  );

  function change(fn: (state: State) => State) {
    const next = fn(ref.current);
    ref.current = next;
    setState(next);
    return next;
  }
  function patchSession(id: string, fn: (session: Session) => Session) {
    change((s) => ({
      ...s,
      sessions: s.sessions.map((session) => (session.id === id ? fn(session) : session)),
    }));
  }
  function persistState(value: State) {
    clearTimeout(timer.current);
    timer.current = undefined;
    return privateRef.current ? Promise.resolve() : writer.current.save(value);
  }
  function flushState() {
    // A privacy transition must include the latest keystroke, even before autosave.
    return persistState(ref.current);
  }
  useEffect(() => {
    let cancelled = false;
    void Promise.all([get<unknown>('voz-state'), get<unknown>('voz-jobs')])
      .then(([data, pending]) => {
        if (cancelled) return;
        const restored = data === undefined ? ref.current : validateWorkspace(data);
        const jobs = validateJobs(pending);
        const ids = new Set(jobs.map((job) => job.id));
        const next = {
          ...restored,
          sessions: restored.sessions.map((s) => ({
            ...s,
            done: retainReceipts(s.done, ids),
          })),
        };
        ref.current = next;
        setState(next);
        setRecoveredJobs(jobs);
        setLoaded(true);
      })
      .catch((error) => {
        if (!cancelled)
          errorHandler.current(
            'Could not open local storage. The original data has been preserved. ' +
              String(error),
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!loaded || privateRef.current) return;
    setSaved(false);
    // Batch rapid editor changes; queue commits bypass this delay explicitly.
    timer.current = setTimeout(() => {
      void persistState(ref.current);
    }, 20);
    return () => {
      clearTimeout(timer.current);
    };
  }, [state, loaded]);
  useEffect(
    () => () => {
      if (timer.current !== undefined) void persistState(ref.current);
    },
    [],
  );
  return {
    state,
    ref,
    privateRef,
    loaded,
    saved,
    recoveredJobs,
    change,
    patchSession,
    persistState,
    flushState,
  };
}
