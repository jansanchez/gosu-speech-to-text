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
  minimalShortcut: string;
  visibilityShortcut: string;
  toggleVisibility: () => Promise<void>;
  onVisibilityFailure: (requested: string, previous: string) => void;
  onPanelFailure: (requested: string, previous: string) => void;
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
  const [status, setStatus] = useState('Checking shortcuts…');
  const lastVisibilityGood = useRef<string | null>(null);
  const lastPanelGood = useRef<string | null>(null);
  const lastGood = useRef<string | null>(null);
  useEffect(() => {
    if (!options.loaded) return;
    if (options.capturing) {
      setStatus('Configuring shortcut…');
      return;
    }
    if (!isTauri()) {
      setStatus('Browser · shortcuts apply only within this page');
      return;
    }
    let disposed = false;
    const registered: string[] = [];
    const compositor = new Set<string>();
    let unlisten: (() => void) | undefined;
    let unlistenVisibility: (() => void) | undefined;
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
      [
        options.minimalShortcut,
        () =>
          void latest.current
            .showMinimal()
            .catch((e) => latest.current.onError(String(e))),
      ],
      [
        options.visibilityShortcut,
        () =>
          void latest.current
            .toggleVisibility()
            .catch((e) => latest.current.onError(String(e))),
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
        let panelFailed = false;
        let visibilityFailed = false;
        let primaryFailed = false,
          primaryGood = false;
        try {
          unlisten = await listen('dictation-toggle', () => {
            if (!disposed && !latest.current.capturing)
              void latest.current
                .primary()
                .catch((e) => latest.current.onError(String(e)));
          });
          unlistenVisibility = await listen('app-toggle-visibility', () => {
            if (!disposed && !latest.current.capturing)
              void latest.current
                .toggleVisibility()
                .catch((e) => latest.current.onError(String(e)));
          });
          unlistenShow = await listen('dictation-show', () => {
            if (!disposed && !latest.current.capturing)
              void latest.current
                .showMinimal()
                .catch((e) => latest.current.onError(String(e)));
          });
        } catch (error) {
          failures.push('Shortcut events: ' + String(error));
        }
        const good = new Set<string>();
        for (const [keys, action] of [
          [options.shortcut, 'dictation'],
          [options.minimalShortcut, 'panel'],
          [options.visibilityShortcut, 'visibility'],
        ] as const) {
          try {
            const handled = await invoke<boolean>('dictation_shortcut', {
              shortcut: keys,
              action,
            });
            if (handled) {
              compositor.add(keys);
              good.add(keys);
              if (await isRegistered(keys)) await unregister(keys);
            }
          } catch (error) {
            failures.push(keys + ': ' + String(error));
            if (action === 'panel') panelFailed = true;
            else if (action === 'visibility') visibilityFailed = true;
            else primaryFailed = true;
          }
        }
        for (const [keys, action] of entries) {
          if (disposed) break;
          if (compositor.has(keys)) continue;
          try {
            if (await isRegistered(keys)) await unregister(keys);
            await register(keys, (event) => {
              if (!disposed && !latest.current.capturing && event.state === 'Released')
                action();
            });
            registered.push(keys);
            good.add(keys);
            if (keys === options.shortcut) primaryGood = true;
          } catch (error) {
            failures.push(keys + ': ' + String(error));
            if (keys === options.shortcut) primaryFailed = true;
            if (keys === options.minimalShortcut) panelFailed = true;
            if (keys === options.visibilityShortcut) visibilityFailed = true;
          }
        }
        primaryGood = good.has(options.shortcut);
        if (!disposed) {
          if (good.has(options.visibilityShortcut) && !visibilityFailed)
            lastVisibilityGood.current = options.visibilityShortcut;
          else if (
            lastVisibilityGood.current &&
            lastVisibilityGood.current !== options.visibilityShortcut
          )
            latest.current.onVisibilityFailure(
              options.visibilityShortcut,
              lastVisibilityGood.current,
            );
          if (good.has(options.minimalShortcut) && !panelFailed)
            lastPanelGood.current = options.minimalShortcut;
          else if (
            lastPanelGood.current &&
            lastPanelGood.current !== options.minimalShortcut
          )
            latest.current.onPanelFailure(options.minimalShortcut, lastPanelGood.current);
          if (primaryGood && !primaryFailed) lastGood.current = options.shortcut;
          if (primaryFailed && lastGood.current && lastGood.current !== options.shortcut)
            latest.current.onPrimaryFailure(options.shortcut, lastGood.current);
          setStatus(
            failures.length
              ? 'Some shortcuts are unavailable. Review the notice.'
              : 'Desktop · global shortcuts active',
          );
          if (failures.length)
            latest.current.onError('Could not register: ' + failures.join(' / '));
        }
      });
    return () => {
      disposed = true;
      registry.__gosuShortcutChain = registry
        .__gosuShortcutChain!.catch(() => {})
        .then(async () => {
          unlisten?.();
          unlistenShow?.();
          unlistenVisibility?.();
          for (const action of ['dictation', 'panel', 'visibility'])
            await invoke('dictation_shortcut', { shortcut: null, action }).catch(
              () => {},
            );
          for (const keys of registered) await unregister(keys).catch(() => {});
        });
    };
  }, [
    options.shortcut,
    options.minimalShortcut,
    options.visibilityShortcut,
    options.loaded,
    options.capturing,
  ]);
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
