import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';

// Cleanup must finish before another render registers the same accelerators.
const registry = globalThis as typeof globalThis & {
  __gosuShortcutChain?: Promise<void>;
};
registry.__gosuShortcutChain ??= Promise.resolve();
export function waitForShortcutRegistration() {
  return registry.__gosuShortcutChain!;
}
type Options = {
  capturing: boolean;
  onPrimaryFailure: (requested: string, previous: string) => void;
  shortcut: string;
  loaded: boolean;
  recording: MutableRefObject<boolean>;
  starting: MutableRefObject<boolean>;
  toggle: (editing?: boolean) => Promise<void>;
  primary: () => Promise<void>;
  showMinimal: () => Promise<void>;
  copy: () => Promise<void>;
  paste: () => Promise<void>;
  onError: (message: string) => void;
};

export function useGlobalShortcuts(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [status, setStatus] = useState('Comprobando atajos…');
  const lastGood = useRef<string | null>(null);
  useEffect(() => {
    if (!options.loaded) return;
    if (options.capturing) {
      setStatus('Configurando atajo…');
      return;
    }
    if (!isTauri()) {
      setStatus('Navegador · atajos solo dentro de esta página');
      return;
    }
    let disposed = false;
    const registered: string[] = [];
    let compositor = false;
    let unlisten: (() => void) | undefined;
    let unlistenShow: (() => void) | undefined;
    async function toggle(mode?: boolean) {
      const o = latest.current;
      if (o.capturing) return;
      try {
        if (!o.recording.current && !o.starting.current) await invoke('remember_target');
        await o.toggle(mode);
      } catch (error) {
        o.onError(String(error));
      }
    }
    const entries: [string, () => void][] = [
      [
        options.shortcut,
        () => {
          if (!latest.current.capturing)
            void latest.current.primary().catch((e) => latest.current.onError(String(e)));
        },
      ],
      ['Control+Alt+C', () => void latest.current.copy()],
      ['Control+Alt+V', () => void latest.current.paste()],
      ['Control+Alt+E', () => void toggle(true)],
      ['Control+Alt+D', () => void toggle(false)],
    ];
    registry.__gosuShortcutChain = registry
      .__gosuShortcutChain!.catch(() => {})
      .then(async () => {
        const failures: string[] = [];
        let primaryFailed = false,
          primaryGood = false;
        try {
          unlisten = await listen('dictation-toggle', () => {
            if (!disposed && !latest.current.capturing)
              void latest.current
                .primary()
                .catch((e) => latest.current.onError(String(e)));
          });
          unlistenShow = await listen('dictation-show', () => {
            if (!disposed)
              void latest.current
                .showMinimal()
                .catch((e) => latest.current.onError(String(e)));
          });
          compositor = await invoke<boolean>('dictation_shortcut', {
            shortcut: options.shortcut,
          });
          // Native X11 grabs can remain after a WebView reload. Only release our own.
          if (compositor) primaryGood = true;
          if (compositor && (await isRegistered(options.shortcut)))
            await unregister(options.shortcut);
        } catch (error) {
          failures.push('Atajo de dictado: ' + String(error));
          primaryFailed = true;
        }
        for (const [keys, action] of entries) {
          if (disposed) break;
          if (compositor && keys === options.shortcut) continue;
          try {
            if (await isRegistered(keys)) await unregister(keys);
            await register(keys, (event) => {
              if (!disposed && !latest.current.capturing && event.state === 'Released')
                action();
            });
            registered.push(keys);
            if (keys === options.shortcut) primaryGood = true;
          } catch (error) {
            failures.push(keys + ': ' + String(error));
            if (keys === options.shortcut) primaryFailed = true;
          }
        }
        if (!disposed) {
          if (primaryGood && !primaryFailed) lastGood.current = options.shortcut;
          if (primaryFailed && lastGood.current && lastGood.current !== options.shortcut)
            latest.current.onPrimaryFailure(options.shortcut, lastGood.current);
          setStatus(
            failures.length
              ? 'Hay atajos no disponibles. Revisa el aviso.'
              : 'Escritorio · atajos globales activos',
          );
          if (failures.length)
            latest.current.onError('No se pudieron registrar: ' + failures.join(' / '));
        }
      });
    return () => {
      disposed = true;
      registry.__gosuShortcutChain = registry
        .__gosuShortcutChain!.catch(() => {})
        .then(async () => {
          unlisten?.();
          unlistenShow?.();
          if (compositor)
            await invoke('dictation_shortcut', { shortcut: null }).catch(() => {});
          for (const keys of registered) await unregister(keys).catch(() => {});
        });
    };
  }, [options.shortcut, options.loaded, options.capturing]);
  useEffect(() => {
    if (isTauri()) return;
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && !event.shiftKey && event.code === 'KeyC') {
        event.preventDefault();
        void latest.current.copy();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return status;
}
