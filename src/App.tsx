import { normalizeEditCommand, normalizeNavigationCommand } from './speech';
import { shortcutLabel } from './shortcuts';
import ShortcutPicker from './components/ShortcutPicker';
import { useMinimalDictation } from './hooks/useMinimalDictation';
import MinimalDictation from './components/MinimalDictation';
import DictationEditor from './components/DictationEditor';
import {
  useGlobalShortcuts,
  waitForShortcutRegistration,
} from './hooks/useGlobalShortcuts';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Copy, Settings2, Pin, ArrowUpRight, RotateCcw } from 'lucide-react';
import { set } from 'idb-keyval';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { rewriteText, searchMeaning } from './transport';
import { Capture } from './audio';
import { edit } from './core';
import SettingsDialog from './components/SettingsDialog';
import SessionSidebar from './components/SessionSidebar';
import Workbench from './Workbench';
import { BRAND } from './brand';
import { Session, State, defaults, control, dictionaryOf } from './product';
import { importRecording } from './import-audio';
import type { Job } from './jobs';
import { validateSettings } from './validation';
import { pushHistory, ManualHistory } from './history';
import { useWorkspace, freshSession as fresh } from './hooks/useWorkspace';
import { useAudioQueue } from './hooks/useAudioQueue';
import { useEngine } from './hooks/useEngine';
type Transcript = {
  text: string;
  words: { text: string; review: boolean }[];
  language: string;
};
export default function App() {
  const [error, setError] = useState('');
  const [shortcutCapturing, setShortcutCapturing] = useState(false);
  const [shortcutError, setShortcutError] = useState('');
  const {
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
  } = useWorkspace(setError);
  const [listening, setListening] = useState(false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [level, setLevel] = useState(0),
    [message, setMessage] = useState('Your voice, with room to think.'),
    [settingsOpen, setSettingsOpen] = useState(false),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [query, setQuery] = useState(''),
    [last, setLast] = useState<Transcript | null>(null),
    [compact, setCompact] = useState(false);
  const capture = useRef<Capture | null>(null),
    recording = useRef(false),
    starting = useRef(false),
    selection = useRef<[number, number]>([0, 0]);
  const chunkCallback = useRef<(b: Blob) => void>(() => {});
  function updateText(id: string, text: string) {
    manual.current.reset();
    patchSession(id, (s) => ({
      ...s,
      text,
      versions: pushHistory(s.versions, s.text),
      redo: [],
    }));
  }
  type Proposal = {
    session: string;
    snapshot: string;
    text: string;
    instruction: string;
  };
  const [proposal, setProposal] = useState<Proposal | null>(null),
    [choices, setChoices] = useState<{
      session: string;
      snapshot: string;
      command: string;
      ranges: [number, number][];
    } | null>(null),
    [learn, setLearn] = useState<{ from: string; to: string } | null>(null),
    [instruction, setInstruction] = useState(''),
    [privateMode, setPrivateMode] = useState(false),
    [isImporting, setImporting] = useState(false),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [semanticResults, setSemanticResults] = useState<string[] | null>(null),
    [searching, setSearching] = useState(false);
  const proposalRef = useRef(proposal),
    learnRef = useRef(learn),
    normalState = useRef<State | null>(null),
    manual = useRef(new ManualHistory()),
    importing = useRef(false),
    pendingAudio = useRef<HTMLAudioElement | null>(null),
    pendingUrl = useRef('');
  proposalRef.current = proposal;
  learnRef.current = learn;
  const {
    baseUrl,
    token,
    setToken,
    tokenRef,
    ready,
    model,
    engineIssue,
    diagnostics,
    restarting,
    check,
    restart,
    showDiagnostics,
  } = useEngine(note, setError);
  const {
    jobs,
    allJobs,
    active: queueActive,
    stalled,
    restore: restoreJobs,
    enqueue,
    retry,
    discard,
    flush: flushJobs,
    waitForIdle,
  } = useAudioQueue({
    state: ref,
    privateMode: privateRef,
    baseUrl,
    token: tokenRef,
    persistState,
    patchSession,
    applyCommand,
    onTranscript: setLast,
    onBusy: setBusy,
    notify: note,
    onError: setError,
    onDictation: (id) => {
      manual.current.reset();
      if (document.activeElement?.id !== 'draft') {
        const end = ref.current.sessions.find((s) => s.id === id)!.text.length;
        selection.current = [end, end];
      }
    },
  });
  const current = state.sessions.find((s) => s.id === state.active)!;
  const config = state.settings;
  function note(s: string) {
    setMessage(s);
    setError('');
  }
  useEffect(() => {
    if (loaded) {
      restoreJobs(recoveredJobs);
      if (recoveredJobs.length)
        setMessage('There are pending audio chunks. Retry or delete them.');
    }
  }, [loaded, recoveredJobs]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (
        starting.current ||
        recording.current ||
        queueActive() ||
        importing.current ||
        privateRef.current ||
        !saved
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saved]);
  const minimal = useMinimalDictation({
    loaded,
    recording,
    starting,
    state: ref,
    jobs: allJobs,
    queueActive,
    waitForIdle,
    persist: persistState,
    createSession: () => {
      const session = fresh();
      session.title = 'Quick dictation';
      manual.current.reset();
      change((s) => ({ ...s, sessions: [session, ...s.sessions], active: session.id }));
      selection.current = [0, 0];
      return session.id;
    },
    start: () => toggle(false),
    stop: () => toggle(),
  });
  async function captureShortcut(active: boolean) {
    setShortcutCapturing(active);
    if (active) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await waitForShortcutRegistration();
    }
  }
  function setActionShortcut(
    key: 'shortcut' | 'minimalShortcut' | 'visibilityShortcut',
    value: string,
  ) {
    setShortcutError('');
    if (
      (['shortcut', 'minimalShortcut', 'visibilityShortcut'] as const).some(
        (other) =>
          other !== key &&
          shortcutLabel(ref.current.settings[other]) === shortcutLabel(value),
      )
    ) {
      setShortcutError('Each action must have a different shortcut.');
      return;
    }
    change((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }
  const setShortcut = (value: string) => setActionShortcut('shortcut', value);
  const setMinimalShortcut = (value: string) =>
    setActionShortcut('minimalShortcut', value);
  const setVisibilityShortcut = (value: string) =>
    setActionShortcut('visibilityShortcut', value);
  const shortcutStatus = useGlobalShortcuts({
    capturing: shortcutCapturing,
    onPrimaryFailure: (requested, previous) => {
      if (ref.current.settings.shortcut === requested) {
        setShortcut(previous);
        setShortcutError(
          'Could not activate that combination. The previous shortcut was preserved.',
        );
      }
    },
    visibilityShortcut: config.visibilityShortcut,
    toggleVisibility: minimal.toggleVisibility,
    onVisibilityFailure: (requested, previous) => {
      if (ref.current.settings.visibilityShortcut === requested) {
        setVisibilityShortcut(previous);
        setShortcutError(
          'Could not activate the visibility shortcut. The previous shortcut was preserved.',
        );
      }
    },
    minimalShortcut: config.minimalShortcut,
    onPanelFailure: (requested, previous) => {
      if (ref.current.settings.minimalShortcut === requested) {
        setMinimalShortcut(previous);
        setShortcutError(
          'Could not activate the panel shortcut. The previous shortcut was preserved.',
        );
      }
    },
    shortcut: config.shortcut,
    loaded,
    recording,
    starting,
    toggle,
    primary: () => (minimal.visible ? minimal.toggle() : toggle()),
    showMinimal: minimal.toggleMode,
    copy,
    paste: pasteHere,
    onError: setError,
  });
  async function microphones() {
    try {
      const p = await navigator.mediaDevices.getUserMedia({ audio: true });
      p.getTracks().forEach((t) => t.stop());
      setDevices(
        (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === 'audioinput',
        ),
      );
    } catch (e) {
      setError('Could not access the microphone: ' + String(e));
    }
  }
  async function toggle(requestedMode?: boolean) {
    if (starting.current || shortcutCapturing) return;
    if (recording.current) {
      recording.current = false;
      setListening(false);
      await capture.current?.stop(chunkCallback.current);
      setLevel(0);
      if (config.sounds) {
        try {
          const ctx = new AudioContext(),
            osc = ctx.createOscillator(),
            gain = ctx.createGain();
          osc.frequency.value = 560;
          gain.gain.value = 0.04;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
          osc.onended = () => void ctx.close();
        } catch {}
      }
      if (stalled.current)
        setMessage(
          'Microphone stopped. Audio is pending: check the engine and select Retry.',
        );
      else setMessage('Microphone stopped. Pending chunks are still being processed.');
      return;
    }
    if (!loaded || importing.current || restarting) return;
    starting.current = true;
    try {
      if (isTauri() && !ready) {
        if (!(await check())) return;
      }
      if (!isTauri() && !tokenRef.current.trim()) {
        setSettingsOpen(true);
        setError(
          'Wait for the engine to connect; in web development, enter the token from the terminal.',
        );
        return;
      }
      const session = ref.current.sessions.find((s) => s.id === ref.current.active)!;
      const id = session.id,
        mode = requestedMode ?? editing,
        settings = { ...ref.current.settings },
        range: [number, number] = [...selection.current],
        snapshot = session.text;
      if (requestedMode !== undefined) setEditing(requestedMode);
      let submitted = false;
      chunkCallback.current = (blob) => {
        if (mode && submitted) return;
        submitted = true;
        void enqueue({
          id: crypto.randomUUID(),
          session: id,
          blob,
          editing: mode,
          selection: range,
          snapshot,
          settings,
        }).catch(() => {
          if (recording.current) {
            recording.current = false;
            setListening(false);
            setLevel(0);
            void capture.current
              ?.stop(chunkCallback.current)
              .catch((e) => setError(String(e)));
          }
        });
        if (mode && recording.current) {
          recording.current = false;
          setListening(false);
          setLevel(0);
          void capture.current?.stop(() => {});
        }
      };
      capture.current = new Capture();
      await capture.current.start(
        config.device,
        config.pause,
        chunkCallback.current,
        setLevel,
        () => {
          if (recording.current) void toggle();
          setError('Microphone disconnected. The draft has been preserved.');
        },
        config.sensitivity,
      );
      recording.current = true;
      setListening(true);
      note(
        mode
          ? 'Listening for a correction command.'
          : 'Listening. Pause to see the next chunk.',
      );
    } catch (e) {
      setError('Could not start the microphone: ' + String(e));
    } finally {
      starting.current = false;
    }
  }
  async function semanticSearch() {
    setSearching(true);
    try {
      const documents = ref.current.sessions.slice(0, 300).map((a) => ({
        id: a.id,
        text: [a.title, a.tags, a.text].join(' ').slice(0, 4000),
      }));
      const result = await searchMeaning(
        query,
        documents,
        config.embeddingModel,
        baseUrl.current,
        tokenRef.current,
      );
      setSemanticResults(result.results.map((a) => a.id));
      note(
        'Semantic results from up to 300 drafts. Scores measure similarity, not accuracy percentages.',
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setSearching(false);
    }
  }
  function chooseRange(range: [number, number]) {
    selection.current = range;
    const textarea = document.getElementById('draft') as HTMLTextAreaElement | null;
    textarea?.focus();
    textarea?.setSelectionRange(...range);
  }
  function redo(id = ref.current.active) {
    manual.current.reset();
    const s = ref.current.sessions.find((x) => x.id === id)!;
    if (!s.redo?.length) {
      note('There are no changes to redo.');
      return;
    }
    patchSession(id, (x) => ({
      ...x,
      text: x.redo![x.redo!.length - 1],
      versions: pushHistory(x.versions, x.text),
      redo: x.redo!.slice(0, -1),
    }));
    note('Change redone.');
  }
  function manualText(id: string, text: string) {
    patchSession(id, (x) => ({
      ...x,
      text,
      redo: [],
      versions: manual.current.record(id, x.versions, x.text),
    }));
  }

  function insertText(text: string) {
    const s = ref.current.sessions.find((a) => a.id === ref.current.active)!,
      range = selection.current;
    const start = Math.min(range[0], s.text.length),
      end = Math.min(range[1], s.text.length);
    updateText(s.id, s.text.slice(0, start) + text + s.text.slice(end));
    chooseRange([start + text.length, start + text.length]);
  }
  function readText() {
    if (!('speechSynthesis' in window)) {
      setError('Read aloud is unavailable in this embedded browser.');
      return;
    }
    speechSynthesis.cancel();
    const local = speechSynthesis.getVoices().filter((v) => v.localService);
    if (!local.length) {
      setError('No local voice is available. Install a system voice and try again.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      ref.current.sessions.find((a) => a.id === ref.current.active)!.text,
    );
    utterance.lang = config.language === 'auto' ? '' : config.language;
    utterance.voice = local.find((v) => v.lang.startsWith(config.language)) || local[0];
    speechSynthesis.speak(utterance);
  }
  function stopRead() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function confirmProposal() {
    const p = proposalRef.current;
    if (!p) return;
    const s = ref.current.sessions.find((a) => a.id === p.session);
    if (!s || s.text !== p.snapshot) {
      setError(
        'The draft changed. Cancel the suggestion and request it again for the current text.',
      );
      return;
    }
    updateText(s.id, p.text);
    setProposal(null);
    proposalRef.current = null;
    note('Suggestion applied. You can undo it.');
  }
  function rememberRule() {
    const rule = learnRef.current;
    if (!rule) {
      note('Apply a “replace X with Y” command first.');
      return;
    }
    const dictionary = dictionaryOf(ref.current.settings.dictionary);
    dictionary[rule.from] = rule.to;
    change((x) => ({
      ...x,
      settings: { ...x.settings, dictionary: JSON.stringify(dictionary) },
    }));
    setLearn(null);
    learnRef.current = null;
    note('Personal rule saved. You can remove it in Tools.');
  }
  async function propose(
    instruction: string,
    id = ref.current.active,
    range = selection.current,
  ) {
    const s = ref.current.sessions.find((x) => x.id === id)!;
    const selected = range[1] > range[0],
      start = selected ? range[0] : 0,
      end = selected ? range[1] : s.text.length;
    if (!ref.current.settings.llm) {
      note(
        'Enable Local natural editing in Tools for this request. Explicit commands are still available.',
      );
      return;
    }
    const result = await rewriteText(
      s.text.slice(start, end),
      instruction,
      ref.current.settings.llmModel,
      baseUrl.current,
      tokenRef.current,
    );
    const p = {
      session: id,
      snapshot: s.text,
      text: s.text.slice(0, start) + result.text + s.text.slice(end),
      instruction,
    };
    proposalRef.current = p;
    setProposal(p);
    note(
      'Suggestion ready. Review it and say “confirm change” or “cancel change” in Correct mode.',
    );
  }
  async function applyCommand(command: string, job: Job) {
    const c = normalizeEditCommand(normalizeNavigationCommand(command));
    const action = control(c);
    if (action === 'dictate') {
      setEditing(false);
      note('Dictation mode enabled.');
      return;
    }
    if (action === 'edit') {
      setEditing(true);
      note('Correction mode enabled.');
      return;
    }
    if (action === 'favorite' || action === 'unfavorite') {
      patchSession(job.session, (s) => ({
        ...s,
        favorite: action === 'favorite',
      }));
      note('Favorite updated.');
      return;
    }
    if (action === 'undo') {
      undo(job.session);
      return;
    }
    if (action === 'redo') {
      redo(job.session);
      return;
    }
    if (action === 'copy') {
      await copy();
      return;
    }
    if (action === 'paste') {
      if (isTauri()) await paste();
      else await copy();
      return;
    }
    if (action === 'confirm') {
      confirmProposal();
      return;
    }
    if (action === 'cancel') {
      setProposal(null);
      proposalRef.current = null;
      setChoices(null);
      note('Suggestion canceled.');
      return;
    }
    if (action === 'learn') {
      rememberRule();
      return;
    }
    if (action === 'read') {
      readText();
      return;
    }
    if (action === 'stopRead') {
      stopRead();
      return;
    }
    if (action === 'new') {
      const n = fresh();
      change((x) => ({ ...x, sessions: [n, ...x.sessions], active: n.id }));
      note('New dictation created.');
      return;
    }
    const option = c.match(
      /^(?:opci[oó]n|option)\s+(\d+|uno|una|dos|tres|cuatro|cinco|one|two|three)$/i,
    );
    if (option) {
      const names: Record<string, number> = {
        uno: 1,
        una: 1,
        dos: 2,
        tres: 3,
        cuatro: 4,
        cinco: 5,
        one: 1,
        two: 2,
        three: 3,
      };
      chooseOption(names[option[1]] || Number(option[1]));
      return;
    }
    const selecting = c.match(/^(?:selecciona|select)\s+(.+)$/i);
    if (selecting) {
      const s = ref.current.sessions.find((x) => x.id === job.session)!;
      const needle = selecting[1].toLocaleLowerCase(),
        hay = s.text.toLocaleLowerCase();
      let i = hay.indexOf(needle);
      if (i < 0) {
        note('That text was not found.');
        return;
      }
      if (hay.indexOf(needle, i + 1) >= 0) {
        note('That text appears more than once. Select an occurrence with the cursor.');
        return;
      }
      chooseRange([i, i + needle.length]);
      note('Text selected. You can dictate a correction.');
      return;
    }
    const template = c.match(
      /^(?:insertar plantilla|inserta plantilla|insert template|insert snippet)\s+(.+)$/i,
    );
    if (template) {
      const matches =
        ref.current.snippets?.filter(
          (a) => a.name.toLocaleLowerCase() === template[1].toLocaleLowerCase(),
        ) || [];
      if (matches.length !== 1) {
        note('There is no unique snippet with that name. Check Tools.');
        return;
      }
      insertText(matches[0].text);
      note('Snippet inserted.');
      return;
    }
    const result = edit(job.snapshot, c, job.selection);
    if (result.choices) {
      setChoices({
        session: job.session,
        snapshot: job.snapshot,
        command: c,
        ranges: result.choices,
      });
      note(
        'Multiple occurrences found. Say “option one”, “option two”, or use the buttons.',
      );
      return;
    }
    if (result.changed) {
      updateText(job.session, result.text);
      const rule = c
        .replace(/^replace (.+?) with (.+)$/i, 'cambia $1 por $2')
        .match(/^(?:cambia|reemplaza)\s+(.+?)\s+por\s+(.+)$/i);
      if (rule) {
        const next = { from: rule[1], to: rule[2] };
        setLearn(next);
        learnRef.current = next;
      }
      note(result.message);
      return;
    }
    // Never send an ambiguous deterministic command to a model to guess a target.
    if (/^(cambia|reemplaza|replace|borra|elimina|delete)\b/i.test(c)) {
      note(result.message);
      return;
    }
    await propose(c, job.session, job.selection);
  }
  function chooseOption(number: number) {
    if (!choices || !choices.ranges[number - 1]) {
      note('That option is unavailable.');
      return;
    }
    const s = ref.current.sessions.find((a) => a.id === choices.session);
    if (!s || s.text !== choices.snapshot) {
      setError('The text changed; repeat the command.');
      return;
    }
    const result = edit(s.text, choices.command, choices.ranges[number - 1]);
    if (result.changed) updateText(s.id, result.text);
    setChoices(null);
    note(result.message);
  }
  async function togglePrivate() {
    if (
      starting.current ||
      recording.current ||
      queueActive() ||
      importing.current ||
      allJobs.current.length
    ) {
      setError('Stop dictation and resolve pending audio before switching sessions.');
      return;
    }
    starting.current = true;
    try {
      await Promise.all([flushState(), flushJobs()]);
      stopRead();
      pendingAudio.current?.pause();
      if (privateRef.current) {
        privateRef.current = false;
        setPrivateMode(false);
        const original = normalState.current!;
        change(() => original);
        normalState.current = null;
        note(
          'Private session closed. Its text and audio are no longer in the workspace.',
        );
      } else {
        normalState.current = ref.current;
        privateRef.current = true;
        setPrivateMode(true);
        const n = fresh();
        change((x) => ({ ...x, sessions: [n], active: n.id }));
        note('Private session started. Content is not saved automatically.');
      }
      setLast(null);
      setProposal(null);
      proposalRef.current = null;
      setChoices(null);
      setLearn(null);
      learnRef.current = null;
    } finally {
      starting.current = false;
    }
  }
  async function importAudio(file: File) {
    if (
      starting.current ||
      recording.current ||
      queueActive() ||
      importing.current ||
      allJobs.current.length
    )
      throw Error('Stop dictation and resolve pending chunks first.');
    const session = ref.current.sessions.find((a) => a.id === ref.current.active)!,
      settings = { ...ref.current.settings };
    importing.current = true;
    stalled.current = true;
    setImporting(true);
    try {
      if (!(await check())) throw Error('The engine is not ready.');
      await importRecording(
        file,
        (blob) =>
          enqueue({
            id: crypto.randomUUID(),
            session: session.id,
            blob,
            editing: false,
            snapshot: session.text,
            settings,
          }),
        setMessage,
      );
      void retry();
    } catch (e) {
      if (!allJobs.current.length) stalled.current = false;
      setError(String(e) + ' · Saved chunks remain in Pending audio.');
      throw e;
    } finally {
      importing.current = false;
      setImporting(false);
    }
  }
  function restoreBackup(next: State) {
    if (
      starting.current ||
      recording.current ||
      queueActive() ||
      importing.current ||
      allJobs.current.length
    ) {
      setError('Stop dictation and resolve pending audio before restoring a backup.');
      return;
    }
    change(() => next);
    setLast(null);
    setProposal(null);
    proposalRef.current = null;
    note('Backup restored.');
  }
  function splitSession() {
    const s = ref.current.sessions.find((a) => a.id === ref.current.active)!,
      at = selection.current[0];
    if (at <= 0 || at >= s.text.length) {
      note('Place the cursor inside the text before splitting.');
      return;
    }
    const next = fresh();
    next.text = s.text.slice(at);
    next.original = next.text;
    updateText(s.id, s.text.slice(0, at));
    change((x) => ({ ...x, sessions: [...x.sessions, next] }));
    note('Text split into two drafts. You can undo the change in the first one.');
  }
  function joinSession(id: string) {
    const other = ref.current.sessions.find((a) => a.id === id);
    if (!other) return;
    const current = ref.current.sessions.find((a) => a.id === ref.current.active)!;
    updateText(current.id, current.text + '\n\n' + other.text);
    note('Drafts joined. The other draft was preserved.');
  }
  function cleanup() {
    const cutoff = Date.now() - ref.current.settings.retentionDays * 86400000;
    if (!ref.current.settings.retentionDays) {
      note('Retention is set to unlimited.');
      return;
    }
    const protectedIds = new Set(allJobs.current.map((a) => a.session));
    const remove = ref.current.sessions.filter(
      (s) => s.created < cutoff && !s.favorite && !protectedIds.has(s.id),
    );
    if (!remove.length) {
      note('There are no old drafts to clean up.');
      return;
    }
    if (
      !confirm(
        `Delete ${remove.length} old drafts? Favorites and pending audio will be preserved.`,
      )
    )
      return;
    const ids = new Set(remove.map((s) => s.id));
    change((x) => {
      const sessions = x.sessions.filter((a) => !ids.has(a.id));
      if (!sessions.length) sessions.push(fresh());
      return {
        ...x,
        sessions,
        active: sessions.some((a) => a.id === x.active) ? x.active : sessions[0].id,
      };
    });
    note('Cleanup completed.');
  }
  async function eraseAll() {
    if (starting.current || recording.current || queueActive() || importing.current)
      return;
    if (
      !confirm(
        'Delete all GOSU Speech to Text drafts, history, settings, snippets, and pending audio? Export anything you want to keep first.',
      )
    )
      return;
    starting.current = true;
    try {
      await Promise.all([flushState(), flushJobs()]);
      await discard();
      const n = fresh();
      if (privateRef.current) {
        normalState.current = {
          sessions: [n],
          active: n.id,
          settings: defaults,
          snippets: [],
        };
        await set('voz-state', normalState.current);
        await set('voz-jobs', []);
      }
      change(() => ({
        sessions: [n],
        active: n.id,
        settings: defaults,
        snippets: [],
      }));
      setProposal(null);
      proposalRef.current = null;
      setChoices(null);
      setLearn(null);
      learnRef.current = null;
      setLast(null);
      note(
        'GOSU Speech to Text data deleted. Exported backups and downloaded models are managed separately.',
      );
    } finally {
      starting.current = false;
    }
  }
  function listenPending(blob: Blob) {
    pendingAudio.current?.pause();
    if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
    const url = URL.createObjectURL(blob),
      audio = new Audio(url);
    pendingAudio.current = audio;
    pendingUrl.current = url;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      pendingUrl.current = '';
    };
    void audio.play().catch((e) => {
      URL.revokeObjectURL(url);
      setError(String(e));
    });
  }

  function undo(id = ref.current.active) {
    manual.current.reset();
    const s = ref.current.sessions.find((s) => s.id === id)!;
    if (!s.versions.length) {
      note('There is no previous version.');
      return;
    }
    patchSession(id, (x) => ({
      ...x,
      text: x.versions[x.versions.length - 1],
      versions: x.versions.slice(0, -1),
      redo: pushHistory(x.redo || [], x.text),
    }));
    note('Change undone.');
  }
  async function copy() {
    if (!current.text) {
      setError('The draft is empty. Dictate or type before copying.');
      return;
    }
    try {
      if (isTauri()) await invoke('copy_text', { text: current.text });
      else await navigator.clipboard.writeText(current.text);
      note('Text copied. Paste with Ctrl+V.');
    } catch {
      setError('Could not copy. Select the text and use Ctrl+C.');
    }
  }
  async function paste() {
    if (!current.text) return;
    try {
      await invoke('paste_target', { text: current.text });
      note('Paste requested. Review the result in the destination.');
    } catch (e) {
      setError(String(e));
    }
  }
  async function pasteHere() {
    const text =
      ref.current.sessions.find((x) => x.id === ref.current.active)?.text || '';
    if (!text) {
      setError('The draft is empty.');
      return;
    }
    if (recording.current || queueActive()) {
      setError('Stop dictation and wait for processing before pasting.');
      return;
    }
    try {
      await invoke('paste_here', { text });
      note('Paste requested in the active window. Review the result.');
    } catch (e) {
      setError(String(e));
    }
  }
  function deleteSession() {
    if (
      starting.current ||
      recording.current ||
      queueActive() ||
      importing.current ||
      allJobs.current.some((job) => job.session === ref.current.active)
    )
      return;
    if (!confirm('Delete this draft and its history?')) return;
    const remaining = ref.current.sessions.filter(
      (session) => session.id !== ref.current.active,
    );
    const sessions = remaining.length ? remaining : [fresh()];
    manual.current.reset();
    change((x) => ({ ...x, sessions, active: sessions[0].id }));
  }
  function selectSession(session: Session) {
    if (starting.current || recording.current || queueActive() || importing.current)
      return;
    manual.current.reset();
    change((x) => ({ ...x, active: session.id }));
    setLast(null);
    selection.current = [session.text.length, session.text.length];
  }
  function newSession() {
    if (starting.current || listening || busy || importing.current) return;
    const s = fresh();
    change((x) => ({ ...x, sessions: [s, ...x.sessions], active: s.id }));
    setLast(null);
    selection.current = [0, 0];
    note('New draft.');
  }
  function download(name: string, data: string, type = 'application/json') {
    const u = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  async function compactToggle() {
    try {
      const w = getCurrentWindow();
      await w.setAlwaysOnTop(!compact);
      await w.setSize(new LogicalSize(compact ? 1180 : 490, compact ? 820 : 650));
      setCompact(!compact);
    } catch (e) {
      setError(String(e));
    }
  }
  async function importProfile(file: File) {
    try {
      const p = JSON.parse(await file.text());
      if (p.schema !== 1) throw Error();
      const settings = validateSettings(p.settings, true);
      change((x) => ({ ...x, settings }));
      note('Settings imported.');
    } catch {
      setError('Invalid profile. Settings were not changed.');
    }
  }

  useEffect(
    () => () => {
      recording.current = false;
      void capture.current?.stop(chunkCallback.current);
      pendingAudio.current?.pause();
      if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
      stopRead();
    },
    [],
  );
  const disabled = !loaded || listening || busy || isImporting || restarting;
  if (minimal.visible)
    return (
      <MinimalDictation
        phase={minimal.phase}
        target={minimal.target}
        text={minimal.text}
        error={minimal.error || error}
        level={level}
        shortcut={config.shortcut}
        panelShortcut={config.visibilityShortcut}
        viewShortcut={config.minimalShortcut}
        toggle={minimal.toggle}
        openEditor={minimal.openEditor}
        hide={minimal.hide}
        configureShortcut={async () => {
          await minimal.openEditor();
          setSettingsOpen(true);
        }}
        copy={async () => {
          try {
            await invoke('copy_text', { text: minimal.text });
          } catch (e) {
            setError(String(e));
          }
        }}
      />
    );

  return (
    <div
      className={
        'shell ' + (compact ? 'compact ' : '') + (config.contrast ? 'high-contrast' : '')
      }
    >
      <SessionSidebar
        state={state}
        disabled={disabled}
        query={query}
        setQuery={setQuery}
        semanticResults={semanticResults}
        setSemanticResults={setSemanticResults}
        searching={searching}
        semanticSearch={semanticSearch}
        onlyFavorites={onlyFavorites}
        setOnlyFavorites={setOnlyFavorites}
        newSession={newSession}
        selectSession={selectSession}
        openSettings={() => setSettingsOpen(true)}
      />

      <main>
        <header>
          <div className="breadcrumb">
            Your workspace <span>/</span> Dictation
          </div>
          <div className="header-actions">
            {isTauri() && (
              <>
                <button disabled={disabled} onClick={() => void minimal.show()}>
                  Minimal mode
                </button>
                <button aria-label="Toggle compact window" onClick={compactToggle}>
                  <Pin size={16} />
                </button>
              </>
            )}
            <button onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings2 size={18} />
            </button>
            <button
              className="header-copy"
              onClick={copy}
              disabled={!current.text}
              title="Copy the entire draft · Ctrl+Alt+C"
            >
              <Copy size={16} /> Copy <kbd>Ctrl Alt C</kbd>
            </button>
            <span className="badge">
              {isTauri() ? 'DESKTOP' : 'BROWSER'} · {BRAND.version}
            </span>
          </div>
        </header>
        <section className="workspace">
          <div className="eyebrow">
            <span /> FEWER KEYS. MORE IDEAS.
          </div>
          <h1>Think out loud.</h1>
          <p className="subtitle">
            Give your ideas room. Build your text one chunk at a time.
          </p>
          {isTauri() && (
            <details className="initial-shortcut">
              <summary>
                Dictation · {shortcutLabel(config.shortcut)} · Panel ·{' '}
                {shortcutLabel(config.minimalShortcut)} · Show/hide ·{' '}
                {shortcutLabel(config.visibilityShortcut)} · Configure
              </summary>
              <ShortcutPicker
                value={config.shortcut}
                otherShortcuts={[config.minimalShortcut, config.visibilityShortcut]}
                disabled={disabled}
                onChange={setShortcut}
                onCapture={captureShortcut}
                status={shortcutError || shortcutStatus}
              />
              <ShortcutPicker
                panel
                value={config.minimalShortcut}
                otherShortcuts={[config.shortcut, config.visibilityShortcut]}
                disabled={disabled}
                onChange={setMinimalShortcut}
                onCapture={captureShortcut}
                status={shortcutError || shortcutStatus}
              />
              <ShortcutPicker
                visibility
                value={config.visibilityShortcut}
                otherShortcuts={[config.shortcut, config.minimalShortcut]}
                disabled={disabled}
                onChange={setVisibilityShortcut}
                onCapture={captureShortcut}
                status={shortcutError || shortcutStatus}
              />
            </details>
          )}
          <label className="mobile-history">
            Draft
            <select
              aria-label="Open saved draft"
              disabled={disabled}
              value={state.active}
              onChange={(e) => change((x) => ({ ...x, active: e.target.value }))}
            >
              {state.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.text.slice(0, 50) || 'New dictation'}
                </option>
              ))}
            </select>
            <button onClick={newSession} disabled={disabled}>
              New
            </button>
          </label>
          <DictationEditor
            current={current}
            loaded={loaded}
            disabled={disabled}
            editing={editing}
            saved={saved}
            privateMode={privateMode}
            fontSize={config.fontSize}
            hasPending={jobs.some((job) => job.session === current.id)}
            proposal={proposal}
            choices={choices}
            learn={learn}
            last={last}
            onMode={setEditing}
            onSelection={(range) => {
              selection.current = range;
            }}
            onText={(text) => manualText(current.id, text)}
            confirmProposal={confirmProposal}
            cancelProposal={() => {
              setProposal(null);
              proposalRef.current = null;
            }}
            chooseOption={chooseOption}
            rememberRule={rememberRule}
            forgetRule={() => {
              setLearn(null);
              learnRef.current = null;
            }}
            chooseRange={chooseRange}
            note={note}
            restoreOriginal={() => updateText(current.id, current.original)}
            undo={() => undo()}
            redo={() => redo()}
            downloadText={() => download('dictation.txt', current.text, 'text/plain')}
            deleteSession={deleteSession}
          />
          <div className="capture-bar">
            <button
              className={'mic-button ' + (listening ? 'recording' : '')}
              disabled={!loaded}
              onClick={() => void toggle()}
            >
              {listening ? <Square size={20} /> : <Mic size={22} />}
              <span>
                {listening ? 'Stop' : editing ? 'Dictate correction' : 'Start dictation'}
              </span>
            </button>
            <div className="capture-status">
              <div className="wave" aria-hidden="true">
                {[0.4, 0.7, 1, 0.55, 0.85, 0.4, 0.65].map((h, i) => (
                  <i
                    key={i}
                    style={{
                      height: 5 + (listening ? level * 35 * h : 10 * h),
                    }}
                  />
                ))}
              </div>
              <span>
                {listening ? 'Listening' : busy ? 'Transcribing…' : 'At your pace'}
              </span>
            </div>
            <kbd>
              {isTauri()
                ? config.shortcut
                    .replace('CommandOrControl', 'Ctrl')
                    .replaceAll('+', ' + ')
                : 'Microphone button'}
            </kbd>
          </div>
          <div className="engine-status" role="status">
            {ready
              ? 'Engine ready · ' + model
              : 'Engine offline · ' + (engineIssue || 'Check the connection.')}
          </div>
          {isTauri() && (
            <details className="engine-diagnostics">
              <summary onClick={() => void showDiagnostics()}>Engine diagnostics</summary>
              <button onClick={() => void showDiagnostics()}>Refresh diagnostics</button>
              <button
                disabled={disabled || restarting}
                onClick={() => {
                  if (!starting.current) void restart();
                }}
              >
                {restarting ? 'Restarting…' : 'Restart engine'}
              </button>
              <button
                disabled={!diagnostics}
                onClick={() =>
                  void invoke('copy_text', { text: diagnostics }).catch((e) =>
                    setError(String(e)),
                  )
                }
              >
                Copy diagnostics
              </button>
              <pre>{diagnostics || 'Reading log…'}</pre>
            </details>
          )}
          <div role="status" aria-live="polite" className="message">
            {message}
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <div className="shortcut-status">
            {shortcutStatus}
            {isTauri()
              ? ' · Copy: Ctrl+Alt+C · Paste here: Ctrl+Alt+V · Correct: Ctrl+Alt+E · Dictate: Ctrl+Alt+D'
              : ' · Copy: Ctrl+Alt+C · Paste manually: Ctrl+V'}
          </div>
          <div className="output-actions">
            <button className="copy" onClick={copy} disabled={!current.text}>
              <Copy size={16} /> Copy text <kbd>Ctrl Alt C</kbd>
            </button>
            {isTauri() && (
              <button onClick={paste} disabled={!current.text || disabled}>
                <ArrowUpRight size={17} /> Paste into remembered destination ·
                experimental
              </button>
            )}
          </div>
          {editing && (
            <div className="hint">
              <strong>One command at a time.</strong> “Replace tomorrow with Thursday”,
              “delete last sentence”, “new paragraph”, “make it a list”, or “undo”. Select
              text to resolve ambiguity.
            </div>
          )}
          {jobs.length > 0 && (
            <div className="pending">
              <strong>
                {jobs.length} fragmento(s){' '}
                {busy ? 'processing or pending' : 'awaiting recovery'}
              </strong>
              <span>
                Temporary audio saved on this device until completed or deleted.
              </span>
              {jobs.slice(0, 10).map((job, i) => (
                <button
                  key={job.id}
                  disabled={listening}
                  onClick={() => listenPending(job.blob)}
                >
                  Play audio {i + 1}
                </button>
              ))}
              <button disabled={busy || listening || isImporting} onClick={retry}>
                <RotateCcw size={14} /> Retry
              </button>
              <button
                disabled={busy || listening || isImporting}
                onClick={() => {
                  if (confirm('Delete all pending audio?')) {
                    void discard().catch(() => {});
                  }
                }}
              >
                Delete audio
              </button>
            </div>
          )}
          <div className="natural-command">
            <label>
              Enter an editing request
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="For example: make it shorter or translate into English"
                maxLength={2000}
              />
            </label>
            <button
              disabled={disabled || !instruction.trim() || !config.llm}
              onClick={() => {
                setBusy(true);
                void propose(instruction)
                  .catch((e) => setError(String(e)))
                  .finally(() => setBusy(false));
              }}
            >
              Prepare local suggestion
            </button>
          </div>
          <Workbench
            state={state}
            disabled={disabled}
            privateMode={privateMode}
            notify={note}
            change={change}
            togglePrivate={togglePrivate}
            restore={restoreBackup}
            importAudio={importAudio}
            insert={insertText}
            join={joinSession}
            split={splitSession}
            cleanup={cleanup}
            erase={() => void eraseAll().catch((e) => setError(String(e)))}
            read={readText}
            stopRead={stopRead}
          />
          <footer>
            <span>
              <span className="local-dot" /> Local processing · No account
            </span>
            <button onClick={check}>
              {ready ? 'Engine connected · ' + model : 'Check engine'}
            </button>
          </footer>
        </section>
      </main>
      {settingsOpen && (
        <SettingsDialog
          config={config}
          shortcutStatus={shortcutError || shortcutStatus}
          setShortcut={setShortcut}
          setMinimalShortcut={setMinimalShortcut}
          setVisibilityShortcut={setVisibilityShortcut}
          captureShortcut={captureShortcut}
          disabled={disabled}
          token={token}
          setToken={setToken}
          devices={devices}
          change={change}
          check={check}
          microphones={microphones}
          download={download}
          importProfile={importProfile}
          close={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
