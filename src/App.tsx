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
    [message, setMessage] = useState('Tu voz, con espacio para pensar.'),
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
        setMessage('Hay fragmentos de audio pendientes. Reinténtalos o elimínalos.');
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
      session.title = 'Dictado rápido';
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
  function setShortcut(shortcut: string) {
    setShortcutError('');
    change((s) => ({ ...s, settings: { ...s.settings, shortcut } }));
  }
  const shortcutStatus = useGlobalShortcuts({
    capturing: shortcutCapturing,
    onPrimaryFailure: (requested, previous) => {
      if (ref.current.settings.shortcut === requested) {
        setShortcut(previous);
        setShortcutError(
          'No se pudo activar esa combinación. Se conservó el atajo anterior.',
        );
      }
    },
    shortcut: config.shortcut,
    loaded,
    recording,
    starting,
    toggle,
    primary: minimal.toggle,
    showMinimal: minimal.show,
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
      setError('No se pudo acceder al micrófono: ' + String(e));
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
          'Micrófono detenido. Hay audio pendiente: comprueba el motor y pulsa Reintentar.',
        );
      else
        setMessage('Micrófono detenido. Los fragmentos pendientes siguen procesándose.');
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
          'Espera a que el motor se conecte; en desarrollo web introduce la clave de la terminal.',
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
          setError('Se desconectó el micrófono. El borrador se conserva.');
        },
        config.sensitivity,
      );
      recording.current = true;
      setListening(true);
      note(
        mode
          ? 'Escuchando una orden de corrección.'
          : 'Escuchando. Haz una pausa para ver el siguiente tramo.',
      );
    } catch (e) {
      setError('No se pudo iniciar el micrófono: ' + String(e));
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
        'Resultados por significado de hasta 300 borradores. Las puntuaciones son similitud, no porcentajes de acierto.',
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
      note('No hay cambios para rehacer.');
      return;
    }
    patchSession(id, (x) => ({
      ...x,
      text: x.redo![x.redo!.length - 1],
      versions: pushHistory(x.versions, x.text),
      redo: x.redo!.slice(0, -1),
    }));
    note('Cambio rehecho.');
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
      setError('Este sistema no ofrece lectura de voz en el navegador integrado.');
      return;
    }
    speechSynthesis.cancel();
    const local = speechSynthesis.getVoices().filter((v) => v.localService);
    if (!local.length) {
      setError(
        'No hay una voz local disponible. Instala una voz del sistema y vuelve a intentarlo.',
      );
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
        'El borrador cambió. Cancela la propuesta y vuelve a pedirla sobre el texto actual.',
      );
      return;
    }
    updateText(s.id, p.text);
    setProposal(null);
    proposalRef.current = null;
    note('Propuesta aplicada. Puedes deshacerla.');
  }
  function rememberRule() {
    const rule = learnRef.current;
    if (!rule) {
      note('Primero aplica una orden «cambia X por Y».');
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
    note('Regla personal confirmada. Puedes olvidarla en Herramientas.');
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
        'Activa Edición natural local en Herramientas para esta petición. Las órdenes concretas siguen disponibles.',
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
      'Propuesta preparada. Revisa y di «confirmar cambio» o «cancelar cambio» en Corregir.',
    );
  }
  async function applyCommand(command: string, job: Job) {
    const c = command.trim().replace(/[.!?]+$/, '');
    const action = control(c);
    if (action === 'dictate') {
      setEditing(false);
      note('Modo dictado activado.');
      return;
    }
    if (action === 'edit') {
      setEditing(true);
      note('Modo corrección activado.');
      return;
    }
    if (action === 'favorite' || action === 'unfavorite') {
      patchSession(job.session, (s) => ({
        ...s,
        favorite: action === 'favorite',
      }));
      note('Favorito actualizado.');
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
      note('Propuesta cancelada.');
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
      note('Nuevo dictado creado.');
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
        note('No encontré ese texto.');
        return;
      }
      if (hay.indexOf(needle, i + 1) >= 0) {
        note('Ese texto aparece varias veces. Selecciona una aparición con el cursor.');
        return;
      }
      chooseRange([i, i + needle.length]);
      note('Texto seleccionado. Puedes dictar una corrección.');
      return;
    }
    const template = c.match(
      /^(?:insertar plantilla|inserta plantilla|insert template)\s+(.+)$/i,
    );
    if (template) {
      const matches =
        ref.current.snippets?.filter(
          (a) => a.name.toLocaleLowerCase() === template[1].toLocaleLowerCase(),
        ) || [];
      if (matches.length !== 1) {
        note('No hay una plantilla única con ese nombre. Revisa Herramientas.');
        return;
      }
      insertText(matches[0].text);
      note('Plantilla insertada.');
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
      note('Hay varias apariciones. Di «opción uno», «opción dos» o usa los botones.');
      return;
    }
    if (result.changed) {
      updateText(job.session, result.text);
      const rule = c.match(/^(?:cambia|reemplaza)\s+(.+?)\s+por\s+(.+)$/i);
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
      note('Esa opción no está disponible.');
      return;
    }
    const s = ref.current.sessions.find((a) => a.id === choices.session);
    if (!s || s.text !== choices.snapshot) {
      setError('El texto cambió; repite la orden.');
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
      setError(
        'Termina el dictado y resuelve los audios pendientes antes de cambiar de sesión.',
      );
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
        note('Sesión privada cerrada. Su texto y audio ya no están en la bandeja.');
      } else {
        normalState.current = ref.current;
        privateRef.current = true;
        setPrivateMode(true);
        const n = fresh();
        change((x) => ({ ...x, sessions: [n], active: n.id }));
        note('Sesión privada iniciada. No se guarda automáticamente.');
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
      throw Error('Primero termina el dictado y resuelve los fragmentos pendientes.');
    const session = ref.current.sessions.find((a) => a.id === ref.current.active)!,
      settings = { ...ref.current.settings };
    importing.current = true;
    stalled.current = true;
    setImporting(true);
    try {
      if (!(await check())) throw Error('El motor no está listo.');
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
      setError(String(e) + ' · Los tramos ya guardados siguen en Pendientes.');
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
      setError(
        'Termina el dictado y resuelve los audios pendientes antes de restaurar un respaldo.',
      );
      return;
    }
    change(() => next);
    setLast(null);
    setProposal(null);
    proposalRef.current = null;
    note('Respaldo restaurado.');
  }
  function splitSession() {
    const s = ref.current.sessions.find((a) => a.id === ref.current.active)!,
      at = selection.current[0];
    if (at <= 0 || at >= s.text.length) {
      note('Coloca el cursor dentro del texto antes de dividir.');
      return;
    }
    const next = fresh();
    next.text = s.text.slice(at);
    next.original = next.text;
    updateText(s.id, s.text.slice(0, at));
    change((x) => ({ ...x, sessions: [...x.sessions, next] }));
    note('Texto dividido en dos borradores. Puedes deshacer el cambio en el primero.');
  }
  function joinSession(id: string) {
    const other = ref.current.sessions.find((a) => a.id === id);
    if (!other) return;
    const current = ref.current.sessions.find((a) => a.id === ref.current.active)!;
    updateText(current.id, current.text + '\n\n' + other.text);
    note('Textos unidos. Se conservó el otro borrador.');
  }
  function cleanup() {
    const cutoff = Date.now() - ref.current.settings.retentionDays * 86400000;
    if (!ref.current.settings.retentionDays) {
      note('La conservación está configurada sin límite.');
      return;
    }
    const protectedIds = new Set(allJobs.current.map((a) => a.session));
    const remove = ref.current.sessions.filter(
      (s) => s.created < cutoff && !s.favorite && !protectedIds.has(s.id),
    );
    if (!remove.length) {
      note('No hay borradores antiguos para limpiar.');
      return;
    }
    if (
      !confirm(
        `¿Eliminar ${remove.length} borradores antiguos? Los favoritos y audios pendientes se conservan.`,
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
    note('Limpieza completada.');
  }
  async function eraseAll() {
    if (starting.current || recording.current || queueActive() || importing.current)
      return;
    if (
      !confirm(
        '¿Borrar todos los dictados, versiones, preferencias, plantillas y audios pendientes de GOSU Speech to Text? Exporta antes lo que quieras conservar.',
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
        'Datos de GOSU Speech to Text borrados. Las copias exportadas y modelos descargados se administran por separado.',
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
      note('No hay una versión anterior.');
      return;
    }
    patchSession(id, (x) => ({
      ...x,
      text: x.versions[x.versions.length - 1],
      versions: x.versions.slice(0, -1),
      redo: pushHistory(x.redo || [], x.text),
    }));
    note('Cambio deshecho.');
  }
  async function copy() {
    if (!current.text) {
      setError('El borrador está vacío. Dicta o escribe antes de copiar.');
      return;
    }
    try {
      if (isTauri()) await invoke('copy_text', { text: current.text });
      else await navigator.clipboard.writeText(current.text);
      note('Texto copiado. Pégalo con Ctrl+V.');
    } catch {
      setError('No se pudo copiar. Selecciona el texto y usa Ctrl+C.');
    }
  }
  async function paste() {
    if (!current.text) return;
    try {
      await invoke('paste_target', { text: current.text });
      note('Pegado solicitado. Revisa el resultado en el destino.');
    } catch (e) {
      setError(String(e));
    }
  }
  async function pasteHere() {
    const text =
      ref.current.sessions.find((x) => x.id === ref.current.active)?.text || '';
    if (!text) {
      setError('El borrador está vacío.');
      return;
    }
    if (recording.current || queueActive()) {
      setError('Termina el dictado y espera a que se procese antes de pegar.');
      return;
    }
    try {
      await invoke('paste_here', { text });
      note('Pegado solicitado en la ventana activa. Revisa el resultado.');
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
    if (!confirm('¿Eliminar este borrador y su historial?')) return;
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
    note('Nuevo borrador.');
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
      note('Preferencias importadas.');
    } catch {
      setError('Perfil inválido. No se cambió la configuración.');
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
            Tu espacio <span>/</span> Dictado
          </div>
          <div className="header-actions">
            {isTauri() && (
              <>
                <button disabled={disabled} onClick={() => void minimal.show()}>
                  Modo mínimo
                </button>
                <button aria-label="Alternar ventana compacta" onClick={compactToggle}>
                  <Pin size={16} />
                </button>
              </>
            )}
            <button onClick={() => setSettingsOpen(true)} aria-label="Preferencias">
              <Settings2 size={18} />
            </button>
            <button
              className="header-copy"
              onClick={copy}
              disabled={!current.text}
              title="Copiar todo el borrador · Ctrl+Alt+C"
            >
              <Copy size={16} /> Copiar <kbd>Ctrl Alt C</kbd>
            </button>
            <span className="badge">
              {isTauri() ? 'ESCRITORIO' : 'NAVEGADOR'} · {BRAND.version}
            </span>
          </div>
        </header>
        <section className="workspace">
          <div className="eyebrow">
            <span /> MENOS TECLAS. MÁS IDEAS.
          </div>
          <h1>Piensa en voz alta.</h1>
          <p className="subtitle">
            Dale espacio a tus ideas. El texto lo construimos por tramos.
          </p>
          {isTauri() && (
            <details className="initial-shortcut">
              <summary>
                Tu atajo de dictado · {shortcutLabel(config.shortcut)} · Configurar
              </summary>
              <ShortcutPicker
                value={config.shortcut}
                disabled={disabled}
                onChange={setShortcut}
                onCapture={captureShortcut}
                status={shortcutError || shortcutStatus}
              />
            </details>
          )}
          <label className="mobile-history">
            Borrador
            <select
              aria-label="Abrir borrador guardado"
              disabled={disabled}
              value={state.active}
              onChange={(e) => change((x) => ({ ...x, active: e.target.value }))}
            >
              {state.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.text.slice(0, 50) || 'Nuevo dictado'}
                </option>
              ))}
            </select>
            <button onClick={newSession} disabled={disabled}>
              Nuevo
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
            downloadText={() => download('dictado.txt', current.text, 'text/plain')}
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
                {listening
                  ? 'Terminar'
                  : editing
                    ? 'Dictar corrección'
                    : 'Empezar a dictar'}
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
                {listening ? 'Escuchando' : busy ? 'Transcribiendo…' : 'A tu ritmo'}
              </span>
            </div>
            <kbd>
              {isTauri()
                ? config.shortcut
                    .replace('CommandOrControl', 'Ctrl')
                    .replaceAll('+', ' + ')
                : 'Botón de micrófono'}
            </kbd>
          </div>
          <div className="engine-status" role="status">
            {ready
              ? 'Motor listo · ' + model
              : 'Motor sin conexión · ' + (engineIssue || 'Comprueba la conexión.')}
          </div>
          {isTauri() && (
            <details className="engine-diagnostics">
              <summary onClick={() => void showDiagnostics()}>
                Diagnóstico del motor
              </summary>
              <button onClick={() => void showDiagnostics()}>
                Actualizar diagnóstico
              </button>
              <button
                disabled={disabled || restarting}
                onClick={() => {
                  if (!starting.current) void restart();
                }}
              >
                {restarting ? 'Reiniciando…' : 'Reiniciar motor'}
              </button>
              <button
                disabled={!diagnostics}
                onClick={() =>
                  void invoke('copy_text', { text: diagnostics }).catch((e) =>
                    setError(String(e)),
                  )
                }
              >
                Copiar diagnóstico
              </button>
              <pre>{diagnostics || 'Leyendo registro…'}</pre>
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
              ? ' · Copiar: Ctrl+Alt+C · Pegar aquí: Ctrl+Alt+V · Corregir: Ctrl+Alt+E · Dictar: Ctrl+Alt+D'
              : ' · Copiar: Ctrl+Alt+C · Pegar manualmente: Ctrl+V'}
          </div>
          <div className="output-actions">
            <button className="copy" onClick={copy} disabled={!current.text}>
              <Copy size={16} /> Copiar texto <kbd>Ctrl Alt C</kbd>
            </button>
            {isTauri() && (
              <button onClick={paste} disabled={!current.text || disabled}>
                <ArrowUpRight size={17} /> Pegar en destino recordado · experimental
              </button>
            )}
          </div>
          {editing && (
            <div className="hint">
              <strong>Una orden a la vez.</strong> «Cambia mañana por jueves», «borra la
              última frase», «nuevo párrafo», «pon eso en una lista» o «deshacer». Para
              ambigüedades, selecciona el texto.
            </div>
          )}
          {jobs.length > 0 && (
            <div className="pending">
              <strong>
                {jobs.length} fragmento(s){' '}
                {busy ? 'en proceso o pendientes' : 'pendientes de recuperar'}
              </strong>
              <span>
                Audio temporal guardado en este equipo hasta completar o eliminar.
              </span>
              {jobs.slice(0, 10).map((job, i) => (
                <button
                  key={job.id}
                  disabled={listening}
                  onClick={() => listenPending(job.blob)}
                >
                  Escuchar audio {i + 1}
                </button>
              ))}
              <button disabled={busy || listening || isImporting} onClick={retry}>
                <RotateCcw size={14} /> Reintentar
              </button>
              <button
                disabled={busy || listening || isImporting}
                onClick={() => {
                  if (confirm('¿Eliminar todos los audios pendientes?')) {
                    void discard().catch(() => {});
                  }
                }}
              >
                Eliminar audios
              </button>
            </div>
          )}
          <div className="natural-command">
            <label>
              Escribir una petición de edición
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Por ejemplo: hazlo más breve o traduce al inglés"
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
              Preparar propuesta local
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
              <span className="local-dot" /> Procesamiento local · Sin cuenta
            </span>
            <button onClick={check}>
              {ready ? 'Motor conectado · ' + model : 'Comprobar motor'}
            </button>
          </footer>
        </section>
      </main>
      {settingsOpen && (
        <SettingsDialog
          config={config}
          shortcutStatus={shortcutError || shortcutStatus}
          setShortcut={setShortcut}
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
