import { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { engineHealth } from '../transport';

export function useEngine(
  notify: (message: string) => void,
  onError: (message: string) => void,
) {
  const baseUrl = useRef('http://127.0.0.1:8765');
  const [token, setToken] = useState('');
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState('');
  const [issue, setIssue] = useState(isTauri() ? 'Starting local engine…' : '');
  const [diagnostics, setDiagnostics] = useState('');
  const [restarting, setRestarting] = useState(false);
  const restartingRef = useRef(false);
  const generation = useRef(0);

  async function connect() {
    const request = generation.current;
    let url = baseUrl.current;
    if (isTauri()) {
      const connection = await invoke<{ base_url: string; token: string }>(
        'engine_connection',
      );
      if (request !== generation.current) return false;
      url = connection.base_url;
      baseUrl.current = url;
      tokenRef.current = connection.token;
      setToken(connection.token);
    }
    const health = await engineHealth(url);
    if (request !== generation.current) return false;
    setReady(health.ready);
    setModel(health.model);
    setIssue(
      health.ready
        ? ''
        : health.error ||
            'Preparing the local model. The first download may take a while.',
    );
    return health.ready;
  }
  useEffect(() => {
    if (!isTauri()) return;
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const request = generation.current;
      let connected = false;
      if (!restartingRef.current) {
        try {
          connected = await connect();
        } catch (error) {
          if (!closed && request === generation.current) {
            setReady(false);
            setIssue(String(error));
          }
        }
      }
      if (!closed) timer = setTimeout(poll, connected ? 5000 : 2000);
    }
    void poll();
    return () => {
      closed = true;
      generation.current++;
      clearTimeout(timer);
    };
  }, []);

  async function check() {
    try {
      const available = await connect();
      if (available) notify('Local engine available.');
      return available;
    } catch (error) {
      setReady(false);
      setIssue(String(error));
      onError('The engine is unavailable. ' + String(error));
      return false;
    }
  }
  async function restart() {
    if (restartingRef.current) return;
    restartingRef.current = true;
    generation.current++;
    setRestarting(true);
    setReady(false);
    setIssue('Restarting local engine…');
    try {
      await invoke('engine_restart');
      notify('Engine restarted. Preparing connection and model…');
    } catch (error) {
      setIssue(String(error));
      onError(String(error));
    } finally {
      restartingRef.current = false;
      setRestarting(false);
    }
  }
  async function showDiagnostics() {
    try {
      setDiagnostics(await invoke<string>('engine_diagnostics'));
    } catch (error) {
      setDiagnostics(String(error));
    }
  }
  return {
    baseUrl,
    token,
    setToken,
    tokenRef,
    ready,
    model,
    engineIssue: issue,
    diagnostics,
    restarting,
    check,
    restart,
    showDiagnostics,
  };
}
