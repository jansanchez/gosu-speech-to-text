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
  'ready' | 'starting' | 'listening' | 'processing' | 'sent' | 'copied' | 'error';
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

/** A shortcut session owns one draft. Its destination is selected when capture stops. */
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
  const shown = useRef(true);
  const view = useRef<'overlay' | 'editor'>('editor');
  const windowChain = useRef(Promise.resolve());
  function enqueueWindowAction(action: () => Promise<void>) {
    windowChain.current = windowChain.current.catch(() => {}).then(action);
    return windowChain.current;
  }
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
    view.current = 'overlay';
    shown.current = true;
    setVisible(true);
    try {
      await windowMode('overlay');
    } catch (error) {
      fail(error);
    }
  }
  async function hidePanel() {
    await windowMode('hide');
    shown.current = false;
  }
  async function toggle() {
    const o = latest.current;
    if (
      !o.loaded ||
      o.starting.current ||
      ['starting', 'processing'].includes(phaseRef.current)
    )
      return;
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
      fail('Resolve pending audio in the editor before starting another dictation.');
      return;
    }
    const request = ++generation.current;
    setPhase('starting');
    setError('');
    setTarget(null);
    session.current = '';
    try {
      // Permissions may be needed, but a destination is not required to record.
      await invoke('dictation_prepare');
      if (request !== generation.current) return;
      session.current = o.createSession();
      if (view.current === 'editor' || !shown.current) await show();
      if (request !== generation.current) return;
      await o.start();
      if (!o.recording.current)
        throw Error(
          'Could not start the microphone. Check the engine and permissions in the editor.',
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
      // Request the focused destination now, but close the microphone immediately.
      // A slow or rejected destination lookup must not extend the recording.
      const destinationRequest = invoke<DictationTarget>('dictation_target').then(
        (destination) => ({ destination, error: '' }),
        (error: unknown) => ({ destination: null, error: String(error) }),
      );
      await o.stop();
      const { destination, error: destinationError } = await destinationRequest;
      if (request !== generation.current) return;
      setTarget(destination);
      const complete = await o.waitForIdle();
      if (request !== generation.current) return;
      if (!complete || o.jobs.current.some((job) => job.session === session.current)) {
        throw Error(
          'Audio is still pending. Open the editor to recover it; text has not been inserted yet.',
        );
      }
      // A target receives this shortcut session only, never an older draft.
      const draft = o.state.current.sessions.find((s) => s.id === session.current);
      if (!draft) throw Error('The dictation draft was not found. Check the editor.');
      await o.persist(o.state.current);
      if (request !== generation.current) return;
      if (!draft.text.trim()) {
        setPhase('ready');
        setError('No speech detected. Press the shortcut to try again.');
        return;
      }
      await invoke('copy_text', { text: draft.text });
      if (request !== generation.current) return;
      try {
        if (!destination)
          throw Error(destinationError || 'No destination field was found.');
        await invoke('dictation_insert', { targetId: destination.id, text: draft.text });
      } catch (error) {
        if (request !== generation.current) return;
        setPhase('copied');
        setError(
          'Text copied. Focus the field and paste with Ctrl+V or Ctrl+Shift+V in a terminal. ' +
            String(error),
        );
        return;
      }
      if (request !== generation.current) return;
      setPhase('sent');
    } catch (error) {
      if (request === generation.current) fail(error);
    }
  }
  async function close(mode: 'editor' | 'hide') {
    if (phaseRef.current === 'starting') return;
    generation.current++;

    try {
      if (latest.current.recording.current) await latest.current.stop();
      setPhase('ready');
      setError('');
      await windowMode(mode);
      shown.current = mode !== 'hide';
      if (mode === 'editor') view.current = 'editor';
      if (mode === 'editor') setVisible(false);
    } catch (error) {
      fail(error);
    }
  }
  useEffect(
    () => () => {
      generation.current++;
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
    toggleVisibility: () =>
      enqueueWindowAction(async () => {
        if (shown.current) {
          await hidePanel();
        } else {
          await windowMode(view.current);
          shown.current = true;
        }
      }),
    toggleMode: () =>
      enqueueWindowAction(async () => {
        if (view.current === 'overlay') await close('editor');
        else await show();
      }),
    openEditor: () => close('editor'),
    hide: hidePanel,
  };
}
