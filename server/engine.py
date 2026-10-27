"""Local sidecar: JSON handshake on stdout, diagnostics on stderr."""
import json
import os
import socket
import sys
import threading

print('GOSU Speech to Text: iniciando motor local.', file=sys.stderr, flush=True)
import uvicorn
from server.app import app, TOKEN


def watch_parent():
    if sys.platform == 'win32':
        # A blocking CRT stdin read can interfere with native DLL initialization.
        # Wait for the actual parent process instead; never read stdin on Windows.
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.WaitForSingleObject.restype = wintypes.DWORD
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        kernel.CloseHandle.restype = wintypes.BOOL
        handle = kernel.OpenProcess(0x00100000, False, os.getppid())  # SYNCHRONIZE
        if not handle:
            print('Aviso: no se pudo vigilar el proceso padre; la app conserva el cierre explicito del motor.', file=sys.stderr, flush=True)
            return
        try:
            result = kernel.WaitForSingleObject(handle, 0xFFFFFFFF)
        finally:
            kernel.CloseHandle(handle)
        if result == 0:  # WAIT_OBJECT_0: parent exited
            os._exit(0)
        print('Aviso: fallo la vigilancia del proceso padre.', file=sys.stderr, flush=True)
        return
    # POSIX pipe lifetime monitor; started only after native imports finish.
    while os.read(sys.stdin.fileno(), 4096):
        pass
    os._exit(0)


def main():
    # Match the successful standalone import before starting any watcher thread
    # or the server event loop. Keep a timed traceback if imports still stall.
    import faulthandler
    print('Importando Faster Whisper y bibliotecas nativas...', file=sys.stderr, flush=True)
    faulthandler.dump_traceback_later(60, repeat=False, file=sys.stderr)
    try:
        from faster_whisper import WhisperModel  # noqa: F401; primes module cache
    finally:
        faulthandler.cancel_dump_traceback_later()
    print('Reconocedor importado. Iniciando servidor local...', file=sys.stderr, flush=True)
    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    sock.listen(128)
    print(json.dumps({'base_url': f'http://127.0.0.1:{sock.getsockname()[1]}', 'token': TOKEN}), flush=True)
    threading.Thread(target=watch_parent, daemon=True).start()
    uvicorn.Server(uvicorn.Config(app, log_level='info')).run(sockets=[sock])


if __name__ == '__main__':
    main()
