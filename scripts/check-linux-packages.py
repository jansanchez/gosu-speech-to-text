"""Inspect trusted, locally built Linux candidates; never run downloaded third-party files."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import shutil
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def run(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          timeout=180).stdout.strip()


def check_elf(path):
    with path.open('rb') as stream:
        header = stream.read(20)
    if (len(header) != 20 or header[:6] != b'\x7fELF\x02\x01'
            or struct.unpack('<H', header[18:20])[0] != 62):
        raise ValueError(f'Expected Linux x86_64 ELF executable: {path}')
    if not path.stat().st_mode & 0o111:
        raise ValueError(f'Executable permission missing: {path}')


def inspect_tree(root):
    check_elf(root / 'usr/bin/gosu-speech-to-text')
    engines = list(root.glob('usr/lib/*/engine/gosu-engine'))
    if len(engines) != 1:
        raise ValueError('Expected exactly one bundled engine.')
    engine = engines[0]
    check_elf(engine)
    runtime = engine.parent / '_internal'
    if not list(runtime.glob('libpython3.12.so*')):
        raise ValueError('Bundled Python 3.12 runtime missing.')
    if not list(runtime.rglob('libswresample*.so*')):
        raise ValueError('Bundled audio conversion library missing.')
    desktops = list((root / 'usr/share/applications').glob('*.desktop'))
    if not desktops:
        raise ValueError('Desktop entry missing.')
    return {'application': 'x86_64', 'engine': 'x86_64',
            'python_runtime': '3.12', 'audio_conversion_library': 'present'}


def inspect_bundle(bundle, version):
    results = []
    for kind, pattern in [('deb', 'deb/*.deb'), ('appimage', 'appimage/*.AppImage')]:
        packages = list(bundle.glob(pattern))
        if len(packages) != 1:
            raise ValueError(f'Expected exactly one {kind} candidate; use a clean build directory.')
        package = packages[0].resolve()
        with tempfile.TemporaryDirectory(prefix='gosu-package-') as directory:
            destination = Path(directory)
            metadata = {}
            if kind == 'deb':
                for field in ('Version', 'Architecture', 'Depends'):
                    metadata[field.lower()] = run('dpkg-deb', '-f', str(package), field)
                if metadata['version'] != version or metadata['architecture'] != 'amd64':
                    raise ValueError('DEB version or architecture does not match the candidate.')
                if not metadata['depends']:
                    raise ValueError('DEB runtime dependencies are empty.')
                run('dpkg-deb', '-x', str(package), str(destination))
                tree = destination
            else:
                if f'_{version}_' not in package.name:
                    raise ValueError('AppImage filename version does not match the candidate.')
                check_elf(package)
                # AppImage runtime extraction does not need FUSE or launch the application.
                run(str(package), '--appimage-extract', cwd=destination)
                tree = destination / 'squashfs-root'
            content = inspect_tree(tree)
        with package.open('rb') as stream:
            checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
        results.append({'package': package.name, 'sha256': checksum,
                        'metadata': metadata, 'content': content})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if platform.system() != 'Linux' or platform.machine() not in ('x86_64', 'AMD64'):
        parser.error('Run on Linux x86_64 with dpkg-deb available.')
    if not shutil.which('dpkg-deb'):
        parser.error('dpkg-deb is required. Inspect candidates on the Ubuntu CI builder or install your distribution\'s dpkg tools.')
    version = json.loads((ROOT / 'brand.json').read_text())['version']
    report = {'version': version, 'commit': run('git', 'rev-parse', 'HEAD'),
              'build_host': platform.platform(),
              'scope': 'Package structure only; installation and desktop acceptance pending.',
              'packages': inspect_bundle(args.bundle, version)}
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(args.output)


if __name__ == '__main__':
    main()
