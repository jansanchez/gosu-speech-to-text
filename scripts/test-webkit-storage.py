"""Probe native/AppImage IndexedDB interoperability using disposable databases only.

Run under xvfb-run and dbus-run-session. Requires Linux, cc and WebKitGTK headers.
A nonzero exit reports a runtime compatibility failure; no existing profile is opened.
"""
import argparse
import json
import os
from pathlib import Path
import shlex
import sqlite3
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('appimage', type=Path, help='Trusted GOSU AppImage built by this project')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='gosu-webkit-probe-') as directory:
        root = Path(directory)
        subprocess.run([str(args.appimage.resolve()), '--appimage-extract'], cwd=root,
                       stdout=subprocess.DEVNULL, check=True, timeout=90)
        appdir = root / 'squashfs-root'
        flags = shlex.split(subprocess.check_output(
            ['pkg-config', '--cflags', '--libs', 'webkit2gtk-4.1'], text=True))
        probe = root / 'indexeddb-probe'
        subprocess.run(['cc', str(ROOT / 'tests/native/indexeddb-probe.c'), '-o', str(probe), *flags],
                       check=True, timeout=60)
        native = {**os.environ, 'GDK_BACKEND': 'x11', 'WEBKIT_DISABLE_DMABUF_RENDERER': '1'}
        network_process = list(appdir.rglob('WebKitNetworkProcess'))
        if len(network_process) != 1:
            raise ValueError('Expected one bundled WebKit network process.')
        bundled = {**native, 'LD_LIBRARY_PATH': str(appdir / 'usr/lib'),
                   'WEBKIT_EXEC_PATH': str(network_process[0].parent),
                   'GIO_MODULE_DIR': str(appdir / 'usr/lib/gio/modules'),
                   'GSETTINGS_SCHEMA_DIR': str(appdir / 'usr/share/glib-2.0/schemas'),
                   'GTK_PATH': str(appdir / 'usr/lib/gtk-3.0'),
                   'GTK_EXE_PREFIX': str(appdir / 'usr'),
                   'GTK_DATA_PREFIX': str(appdir), 'APPDIR': str(appdir), 'GTK_MODULES': ''}
        results = []
        for label, profile, env in (
            ('native-fresh', root / 'native', native),
            ('bundled-fresh', root / 'bundled', bundled),
            ('bundled-opens-native', root / 'native', bundled),
            ('native-opens-bundled', root / 'bundled', native),
        ):
            result = subprocess.run([str(probe), str(profile)], cwd=appdir / 'usr',
                                    env=env, capture_output=True, text=True, timeout=30)
            metadata = []
            for database in profile.rglob('IndexedDB.sqlite3'):
                with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as connection:
                    metadata.extend(connection.execute(
                        "select value from IDBDatabaseInfo where key='MetadataVersion'").fetchall())
            results.append({'case': label, 'exit': result.returncode, 'metadata_versions': metadata,
                            'result': result.stdout.strip(),
                            'errors': result.stderr[-2000:] if result.returncode else ''})
        print(json.dumps({'scope': 'Synthetic IDB opening only; no microphone, user data or installer acceptance.',
                          'results': results}, indent=2))
        return int(any(result['exit'] for result in results))


if __name__ == '__main__':
    raise SystemExit(main())
