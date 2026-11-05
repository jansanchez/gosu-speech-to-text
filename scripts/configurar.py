"""Prepare, check and optionally run/package on the native operating system."""
import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import venv

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--build', action='store_true')
    mode.add_argument('--dev', action='store_true')
    args = parser.parse_args()
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError('Ejecuta con Python 3.12. Consulta BUILD-AND-RELEASE.md.')
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    cargo = shutil.which('cargo')
    if not npm or not cargo:
        raise RuntimeError('Falta Node/npm o Rust/Cargo. Consulta BUILD-AND-RELEASE.md.')
    python = ROOT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if not python.exists():
        if (ROOT / '.venv').exists():
            raise RuntimeError('.venv está incompleto. Consérvalo con otro nombre y prepara uno nuevo.')
        venv.EnvBuilder(with_pip=True).create(ROOT / '.venv')
    version = subprocess.check_output([str(python), '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], text=True).strip()
    if version != '3.12':
        raise RuntimeError('.venv debe usar Python 3.12. Consérvalo con otro nombre y prepara uno nuevo.')

    def run(*command):
        subprocess.run([str(value) for value in command], cwd=ROOT, check=True)

    run(python, '-m', 'pip', 'install', '-r', 'server/requirements-build.txt')
    run(npm, 'ci')
    run(npm, 'run', 'check')
    run(python, 'scripts/test-python.py')
    run(cargo, 'fmt', '--manifest-path', 'src-tauri/Cargo.toml', '--', '--check')
    run(cargo, 'check', '--locked', '--manifest-path', 'src-tauri/Cargo.toml')
    run(cargo, 'test', '--locked', '--manifest-path', 'src-tauri/Cargo.toml')
    if args.build:
        bundles = 'nsis' if os.name == 'nt' else 'app,dmg' if sys.platform == 'darwin' else 'appimage'
        run(npm, 'run', 'desktop:build', '--', '--bundles', bundles, '--', '--locked')
        run(python, 'scripts/checksums.py', pathlib.Path(os.environ.get('CARGO_TARGET_DIR', 'src-tauri/target')) / 'release/bundle')
        print('Paquetes: src-tauri/target/release/bundle/ (o CARGO_TARGET_DIR configurado).')
    elif args.dev:
        run(npm, 'run', 'desktop')
    else:
        print('Preparación y comprobaciones completadas. Usa --dev o --build.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print('Error:', error, file=sys.stderr)
        raise SystemExit(1)
