"""Package an already built native Arch/CachyOS candidate without installing it."""
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def output(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def check_executable(path):
    with path.open('rb') as stream:
        header = stream.read(20)
    if (len(header) != 20 or header[:6] != b'\x7fELF\x02\x01'
            or struct.unpack('<H', header[18:20])[0] != 62
            or not path.stat().st_mode & 0o111):
        raise ValueError(f'Expected executable Linux x86_64 ELF: {path}')


def stage(root, destination, provenance):
    binary = root / 'src-tauri/target/release/gosu-speech-to-text'
    engine = root / 'src-tauri/target/release/engine'
    check_executable(binary)
    check_executable(engine / 'gosu-engine')
    if not list((engine / '_internal').glob('libpython3.12.so*')):
        raise ValueError('Complete staged Python engine required; run make arch.')
    app = destination / 'opt/gosu-speech-to-text'
    app.mkdir(parents=True, exist_ok=False)
    shutil.copy2(binary, app / binary.name)
    shutil.copytree(engine, app / 'engine', symlinks=True)
    launcher = destination / 'usr/bin/gosu-speech-to-text'
    launcher.parent.mkdir(parents=True)
    launcher.symlink_to('/opt/gosu-speech-to-text/gosu-speech-to-text')
    desktop = destination / 'usr/share/applications/org.voz.prototype.desktop'
    desktop.parent.mkdir(parents=True)
    desktop.write_text('[Desktop Entry]\nType=Application\nName=GOSU Speech to Text\n'
                       'Comment=Local dictation and transcription\n'
                       'Exec=/opt/gosu-speech-to-text/gosu-speech-to-text\n'
                       'Icon=gosu-speech-to-text\nTerminal=false\n'
                       'Categories=Utility;Accessibility;\n', encoding='utf8')
    icon = destination / 'usr/share/pixmaps/gosu-speech-to-text.png'
    icon.parent.mkdir(parents=True)
    shutil.copy2(root / 'src-tauri/icons/icon.png', icon)
    license_path = destination / 'usr/share/licenses/gosu-speech-to-text'
    license_path.mkdir(parents=True)
    shutil.copy2(root / 'LICENSE', license_path / 'LICENSE')
    docs = destination / 'usr/share/doc/gosu-speech-to-text'
    docs.mkdir(parents=True)
    for name in ('THIRD-PARTY.md', 'PRIVACY.md', 'INSTALL-LINUX.md'):
        shutil.copy2(root / name, docs / name)
    shutil.copytree(root / 'vendor-notices', docs / 'vendor-notices')
    (docs / 'candidate.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf8')


def main():
    if platform.system() != 'Linux' or platform.machine() != 'x86_64' or os.geteuid() == 0:
        raise SystemExit('Build as an ordinary user on Arch/CachyOS Linux x86_64.')
    release = platform.freedesktop_os_release()
    if 'arch' not in (release.get('ID', '') + ' ' + release.get('ID_LIKE', '')).split():
        raise SystemExit('Build this native package on Arch/CachyOS, not an Ubuntu builder.')
    for tool in ('makepkg', 'pacman', 'bsdtar'):
        if not shutil.which(tool):
            raise SystemExit(f'Missing {tool}; install Arch base-devel and packaging tools.')
    version = json.loads((ROOT / 'brand.json').read_text())['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Expected numeric application version.')
    commit = output('git', 'rev-parse', 'HEAD')
    dirty = bool(output('git', 'status', '--porcelain'))
    revision = output('git', 'rev-list', '--count', 'HEAD')
    candidate = f'{version}.r{revision}.g{commit[:8]}' + ('.dirty' if dirty else '')
    webkit = output('pacman', '-Q', 'webkit2gtk-4.1').split()[1].rsplit('-', 1)[0]
    if not re.fullmatch(r'\d+\.\d+\.\d+', webkit):
        raise ValueError('Unsupported WebKit package version format.')
    destination = ROOT / 'src-tauri/target/release/bundle/archlinux' / candidate
    if destination.exists():
        raise ValueError(f'Candidate output already exists; it was not overwritten: {destination}')
    provenance = {'version': version, 'commit': commit, 'dirty': dirty,
                  'package_version': candidate, 'webkit': webkit,
                  'host': platform.platform(), 'scope': 'Native candidate; real desktop acceptance pending.'}
    with tempfile.TemporaryDirectory(prefix='gosu-arch-package-') as directory:
        workspace = Path(directory)
        stage(ROOT, workspace / 'payload', provenance)
        template = (ROOT / 'packaging/arch/PKGBUILD.in').read_text()
        (workspace / 'PKGBUILD').write_text(template.replace('@VERSION@', candidate).replace('@WEBKIT@', webkit))
        subprocess.run(['makepkg', '--noconfirm'], cwd=workspace, check=True,
                       env={**os.environ, 'PKGDEST': str(workspace)}, timeout=600)
        packages = list(workspace.glob('gosu-speech-to-text-*.pkg.tar.zst'))
        if len(packages) != 1:
            raise ValueError('Expected exactly one native package.')
        package = packages[0]
        entries = output('bsdtar', '-tf', str(package)).splitlines()
        required = {'opt/gosu-speech-to-text/gosu-speech-to-text',
                    'opt/gosu-speech-to-text/engine/gosu-engine',
                    'usr/share/applications/org.voz.prototype.desktop'}
        if not required.issubset({entry.removeprefix('./') for entry in entries}):
            raise ValueError('Native package is incomplete.')
        with package.open('rb') as stream:
            checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
        destination.mkdir(parents=True, exist_ok=False)
        shutil.copy2(package, destination / package.name)
        (destination / 'SHA256SUMS.txt').write_text(f'{checksum}  {package.name}\n', encoding='utf8')
        (destination / 'candidate.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf8')
    print(f'Native candidate: {destination}')
    print('Review the package, then install with sudo pacman -U <exact-package-path>.')
    print('Installation was not performed. Do not substitute this package for Ubuntu/AppImage artifacts.')


if __name__ == '__main__':
    main()
