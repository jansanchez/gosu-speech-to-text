import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { State } from '../product';
import type { Job } from '../jobs';

export type DictationTarget = {
  id: string;
  name: string;
  app: string;
  terminal: boolean;
  pid: number;
};
export type MinimalPhase =
  'ready' | 'starting' | 'listening' | 'processing' | 'sent' | 'error';
type Options = {
  loaded: boolean;
  recording: MutableRefObject<boolean>;
  starting: MutableRefObject<boolean>;
  state: MutableRefObject<State>;
  jobs: MutableRefObject<Job[]>;
  queueActive: () => boolean;
  waitForIdle: () => Promise<boolean>;
  createSession: () => string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  persist: (state: State) => Promise<void>;
};

/** A shortcut session owns one draft and one target. Only its completed text is inserted. */
export function useMinimalDictation(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [visible, setVisible] = useState(false);
  const [phase, setPhaseState] = useState<MinimalPhase>('ready');
  const phaseRef = useRef<MinimalPhase>('ready');
  const [target, setTarget] = useState<DictationTarget | null>(null);
  const [error, setError] = useState('');
  const session = useRef('');
  const generation = useRef(0);
  const targetRef = useRef<DictationTarget | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function setPhase(value: MinimalPhase) {
    phaseRef.current = value;
    setPhaseState(value);
  }
  async function windowMode(mode: 'overlay' | 'editor' | 'hide') {
    await invoke('minimal_window', { mode });
  }
  function fail(error: unknown) {
    setError(String(error));
    setPhase('error');
  }
  async function show() {
    clearTimeout(hideTimer.current);
    setVisible(true);
    try {
      await windowMode('overlay');
    } catch (error) {
      fail(error);
    }
  }
  async function toggle() {
    const o = latest.current;
    if (
      !o.loaded ||
      o.starting.current ||
      ['starting', 'processing'].includes(phaseRef.current)
    )
      return;
    clearTimeout(hideTimer.current);
    // A capture started from the full editor keeps its existing behavior.
    if (o.recording.current && phaseRef.current !== 'listening') {
      await o.stop();
      return;
    }
    if (phaseRef.current === 'listening') {
      await finish();
      return;
    }
    if (o.queueActive() || o.jobs.current.length) {
      await show();
      fail('Resuelve el audio pendiente en el editor antes de iniciar otro dictado.');
      return;
    }
    const request = ++generation.current;
    setPhase('starting');
    setError('');
    targetRef.current = null;
    setTarget(null);
    session.current = '';
    try {
      // Capture before showing the overlay; no window title or document content is read.
      const destination = await invoke<DictationTarget>('dictation_target');
      if (request !== generation.current) return;
      targetRef.current = destination;
      setTarget(destination);
      session.current = o.createSession();
      setVisible(true);
      await windowMode('overlay');
      if (request !== generation.current) return;
      await o.start();
      if (!o.recording.current)
        throw Error(
          'No se pudo iniciar el micrófono. Revisa el motor y los permisos en el editor.',
        );
      setPhase('listening');
    } catch (error) {
      if (request !== generation.current) return;
      fail(error);
      await show();
    }
  }
  async function finish() {
    const request = generation.current;
    const o = latest.current;
    setPhase('processing');
    setError('');
    try {
      await o.stop();
      const complete = await o.waitForIdle();
      if (request !== generation.current) return;
      if (!complete || o.jobs.current.some((job) => job.session === session.current)) {
        throw Error(
          'Quedó audio pendiente. Abre el editor para recuperarlo; el texto aún no se insertó.',
        );
      }
      // A target receives this shortcut session only, never an older draft.
      const draft = o.state.current.sessions.find((s) => s.id === session.current);
      const destination = targetRef.current;
      if (!draft || !destination)
        throw Error('Se perdió el destino del dictado. El texto sigue en el editor.');
      await o.persist(o.state.current);
      if (request !== generation.current) return;
      if (!draft.text.trim()) {
        setPhase('ready');
        setError('No se detectó voz. Pulsa el atajo para intentarlo de nuevo.');
        return;
      }
      await invoke('dictation_insert', { targetId: destination.id, text: draft.text });
      if (request !== generation.current) return;
      setPhase('sent');
      hideTimer.current = setTimeout(() => {
        if (request === generation.current) void windowMode('hide').catch(fail);
      }, 1200);
    } catch (error) {
      if (request === generation.current) fail(error);
    }
  }
  async function close(mode: 'editor' | 'hide') {
    if (phaseRef.current === 'starting') return;
    generation.current++;
    clearTimeout(hideTimer.current);
    try {
      if (latest.current.recording.current) await latest.current.stop();
      setPhase('ready');
      setError('');
      await windowMode(mode);
      if (mode === 'editor') setVisible(false);
    } catch (error) {
      fail(error);
    }
  }
  useEffect(
    () => () => {
      generation.current++;
      clearTimeout(hideTimer.current);
    },
    [],
  );
  const text =
    options.state.current.sessions.find((s) => s.id === session.current)?.text || '';
  return {
    visible,
    phase,
    target,
    text,
    error,
    toggle,
    show,
    openEditor: () => close('editor'),
    hide: () => close('hide'),
  };
}
