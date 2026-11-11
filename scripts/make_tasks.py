"""GNU Make task runner. Only Python's standard library is needed to bootstrap."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BRAND = json.loads((ROOT/'brand.json').read_text(encoding='utf-8'))
HELP = """GOSU Speech to Text · GNU Make tasks for Linux
  make doctor       Check tools and native dependencies
  make setup        Create Python 3.12 .venv and install dependencies
  make dev / run    Open the desktop with its automatic engine
  make test         Run interface, logic, and API tests
  make check        Check docs, formatting, tests, builds, and Rust
  make frontend     Build React/TypeScript only
  make engine       Package Python for this OS and architecture
  make appimage     Check and build AppImage with SHA256SUMS
  make deb          Check and build DEB with SHA256SUMS
  make bundle       Check and build AppImage and DEB
  make arch         Check/build native Arch/CachyOS candidate for pacman
  make build        Alias for make appimage
  make extension    Build and package the Chrome extension
  make smoke        Check the bundled engine (downloads tiny if missing)
  make install      Install AppImage and menu entry under ~/.local
  make uninstall    Remove only files managed by make install
  make clean        Remove generated output; preserve .venv and user data

Installation accepts PREFIX=/another/path. Do not use sudo for ~/.local.
See LINUX-MAKE.md for Arch/Ubuntu dependencies and Wayland limitations.
"""

def run(*args, **kwargs):
    print('+', ' '.join(str(a) for a in args), flush=True)
    subprocess.run([str(a) for a in args], cwd=ROOT, check=True, **kwargs)

def tool(name):
    path = shutil.which(name)
    if not path:
        raise RuntimeError('Missing '+name+'. See LINUX-MAKE.md and reopen the terminal after installing it.')
    return path

def venv_python():
    return ROOT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')

def version_of(python):
    return subprocess.check_output([str(python), '-c', 'import sys;print("%s.%s"%sys.version_info[:2])'], text=True).strip()

def setup():
    npm = tool('npm.cmd' if os.name == 'nt' else 'npm')
    python = venv_python()
    if python.exists():
        if version_of(python) != '3.12':
            raise RuntimeError('The existing .venv does not use Python 3.12. Rename it as a backup before running make setup; it has not been deleted.')
    else:
        executable = shutil.which('python3.12')
        if executable:
            run(executable, '-m', 'venv', '.venv')
        elif sys.version_info[:2] == (3, 12):
            run(sys.executable, '-m', 'venv', '.venv')
        elif shutil.which('uv'):
            run(tool('uv'), 'python', 'install', '3.12')
            run(tool('uv'), 'venv', '--python', '3.12', '--seed', '.venv')
        else:
            raise RuntimeError('Python 3.12 is missing. On Arch install uv and rerun make setup; system Python is preserved.')
    if subprocess.run([str(python), '-m', 'pip', '--version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
        run(python, '-m', 'ensurepip', '--upgrade')
    run(python, '-m', 'pip', 'install', '-r', 'server/requirements-build.txt')
    run(npm, 'ci')
    print('Ready. Run make dev or make appimage.')

def ensure():
    if not venv_python().is_file() or not (ROOT / 'node_modules').is_dir():
        setup()

def tests():
    ensure()
    run(tool('npm.cmd' if os.name == 'nt' else 'npm'), 'test')
    run(venv_python(), 'scripts/test-python.py')

def frontend():
    if not (ROOT / 'node_modules').is_dir():
        run(tool('npm'), 'ci')
    run(tool('npm'), 'run', 'build')

def engine():
    ensure()
    run(venv_python(), 'scripts/build-engine.py')

def native_requirements():
    tool('cargo')
    if sys.platform == 'linux':
        pkgconfig=tool('pkg-config')
        if subprocess.run([pkgconfig,'--exists','webkit2gtk-4.1']).returncode:
            raise RuntimeError('WebKitGTK 4.1 development files are missing. Install the packages in LINUX-MAKE.md before building.')

def build(bundles):
    if sys.platform != 'linux':
        raise RuntimeError('Build Linux packages on Linux. For macOS/Windows see GUIA-0.3.md.')
    native_requirements()
    run(sys.executable, 'scripts/make_tasks.py', 'check')
    run(tool('npm'), 'run', 'desktop:build', '--', '--bundles', bundles, '--', '--locked')
    run(sys.executable, 'scripts/checksums.py', Path(os.environ.get('CARGO_TARGET_DIR', 'src-tauri/target')) / 'release/bundle')
    print('Packages: src-tauri/target/release/bundle/')

def install_paths(prefix):
    prefix = Path(prefix).expanduser().absolute()
    if '\n' in str(prefix) or '\r' in str(prefix):
        raise RuntimeError('The prefix contains control characters.')
    return {
        'binary': prefix / 'lib/gosu-speech-to-text/GOSU-Speech-to-Text.AppImage',
        'link': prefix / 'bin/gosu-speech-to-text',
        'icon': prefix / 'share/icons/hicolor/512x512/apps/org.voz.prototype.png',
        'desktop': prefix / 'share/applications/org.voz.prototype.desktop',
        'marker': prefix / 'lib/gosu-speech-to-text/install.json',
    }

def install(prefix):
    if sys.platform != 'linux':
        raise RuntimeError('make install installs a Linux AppImage.')
    packages = sorted((ROOT / 'src-tauri/target/release/bundle/appimage').glob('*.AppImage'), key=lambda p: p.stat().st_mtime)
    if not packages:
        build('appimage')
        packages = sorted((ROOT / 'src-tauri/target/release/bundle/appimage').glob('*.AppImage'), key=lambda p: p.stat().st_mtime)
    if not packages:
        raise RuntimeError('No AppImage was generated.')
    paths = install_paths(prefix)
    link = paths['link']
    if (link.exists() or link.is_symlink()) and not (link.is_symlink() and link.resolve() == paths['binary'].resolve()):
        raise RuntimeError(str(link)+' belongs to another installation. It was not replaced.')
    if paths['binary'].exists():
        try:
            owner=json.loads(paths['marker'].read_text()) if paths['marker'].is_file() else {}
        except (ValueError,OSError):
            owner={}
        if not isinstance(owner,dict) or owner.get('managed_by')!='gosu-speech-to-text-make-v1':
            raise RuntimeError('The destination contains an unmanaged AppImage. Choose another PREFIX.')
    for path in paths.values():
        path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(packages[-1], paths['binary'])
    paths['binary'].chmod(paths['binary'].stat().st_mode | 0o111)
    if not link.is_symlink():
        link.symlink_to(paths['binary'])
    shutil.copy2(ROOT / 'src-tauri/icons/icon.png', paths['icon'])
    executable = str(paths['binary']).replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('$', '\\$')
    paths['desktop'].write_text('[Desktop Entry]\nType=Application\nName=GOSU Speech to Text\nComment=Local dictation and correction\nExec="'+executable+'"\nIcon=org.voz.prototype\nTerminal=false\nCategories=Utility;Accessibility;\n', encoding='utf-8')
    paths['marker'].write_text(json.dumps({'managed_by':'gosu-speech-to-text-make-v1','version':BRAND['version']}))
    updater = shutil.which('update-desktop-database')
    if updater:
        subprocess.run([updater, str(paths['desktop'].parent)], check=False)
    migrate_legacy_install(prefix,paths)
    print('Installed:', paths['binary'])
    print('Open GOSU Speech to Text from the menu or run:', link)

def migrate_legacy_install(prefix, paths):
    # Only the previous installer-owned files are removed. Keep data and user files.
    prefix=Path(prefix).expanduser().absolute()
    old=prefix/'lib/voz';marker=old/'install.json';binary=old/'Voz.AppImage';link=prefix/'bin/voz'
    try:
        owner=json.loads(marker.read_text()) if marker.is_file() else {}
    except (ValueError,OSError):return
    if not isinstance(owner,dict) or owner.get('managed_by')!='voz-make-v1':return
    if link.is_symlink() and link.resolve()==binary.resolve():link.unlink()
    binary.unlink(missing_ok=True);marker.unlink(missing_ok=True)
    try:old.rmdir()
    except OSError:pass
    print('Previous name migrated to GOSU Speech to Text. Data is preserved.')

def uninstall(prefix):
    paths = install_paths(prefix)
    try:
        marker=json.loads(paths['marker'].read_text()) if paths['marker'].is_file() else {}
    except (ValueError,OSError):
        marker={}
    if not isinstance(marker,dict) or marker.get('managed_by') != 'gosu-speech-to-text-make-v1':
        raise RuntimeError('No installation managed by this Makefile exists at that PREFIX.')
    if paths['link'].is_symlink() and paths['link'].resolve() == paths['binary'].resolve():
        paths['link'].unlink()
    for key in ['desktop','icon','binary','marker']:
        paths[key].unlink(missing_ok=True)
    print('Application removed. Dictations, models, backups, and the development environment are preserved.')

def clean():
    for relative in ['dist','extension-dist','engine-dist','build-engine','src-tauri/target','gosu-speech-to-text-chrome.zip']:
        path = ROOT / relative
        if path.is_symlink() or path.is_file():
            path.unlink()
        elif path.is_dir():
            shutil.rmtree(path)
        print('Generated output cleaned:', relative)

def doctor():
    missing = []
    for name in ['node','npm','cargo','rustc','pkg-config']:
        path = shutil.which(name)
        print(('OK ' if path else 'MISSING ')+name+((': '+path) if path else ''))
        if not path: missing.append(name)
    python = venv_python()
    print('Python 3.12:', str(python) if python.exists() else shutil.which('python3.12') or 'can be installed with uv during make setup')
    if not python.exists() and not shutil.which('python3.12') and not shutil.which('uv') and sys.version_info[:2] != (3,12):missing.append('Python 3.12 or uv')
    if sys.platform == 'linux' and shutil.which('pkg-config'):
        result = subprocess.run(['pkg-config','--exists','webkit2gtk-4.1'])
        print('WebKitGTK 4.1:', 'OK' if result.returncode == 0 else 'MISSING; see LINUX-MAKE.md')
        if result.returncode:missing.append('WebKitGTK 4.1')
    session = os.environ.get('XDG_SESSION_TYPE','unknown')
    print('Desktop session:',session)
    print('Optional X11 pasting:',shutil.which('xdotool') or 'install xdotool and xprop for X11; Wayland requires Hyprland or compatible portals')
    if missing:raise RuntimeError('Pending: '+', '.join(missing)+'. Install system dependencies as described in LINUX-MAKE.md.')

def main():
    parser=argparse.ArgumentParser(description=HELP,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('task',choices=['help','doctor','setup','dev','test','check','frontend','engine','appimage','deb','bundle','arch','extension','smoke','install','uninstall','clean'])
    parser.add_argument('--prefix',default=str(Path.home()/'.local'))
    args=parser.parse_args()
    if args.task=='help':print(HELP)
    elif args.task=='doctor':doctor()
    elif args.task=='setup':setup()
    elif args.task=='dev':native_requirements();ensure();run(tool('npm'),'run','desktop')
    elif args.task=='test':tests()
    elif args.task=='check':
        ensure()
        run(tool('npm'), 'run', 'check')
        run(venv_python(), 'scripts/test-python.py')
        native_requirements()
        run(tool('cargo'), 'fmt', '--manifest-path', 'src-tauri/Cargo.toml', '--', '--check')
        run(tool('cargo'), 'check', '--locked', '--manifest-path', 'src-tauri/Cargo.toml')
        run(tool('cargo'), 'test', '--locked', '--manifest-path', 'src-tauri/Cargo.toml')
    elif args.task=='frontend':frontend()
    elif args.task=='engine':engine()
    elif args.task in {'appimage','deb','bundle'}:build('appimage,deb' if args.task=='bundle' else args.task)
    elif args.task=='arch':
        native_requirements()
        tool('makepkg');tool('pacman');tool('bsdtar')
        run(sys.executable, 'scripts/make_tasks.py', 'check')
        run(tool('npm'), 'run', 'desktop:build', '--', '--no-bundle', '--', '--locked')
        run(sys.executable, 'scripts/package-arch.py')
    elif args.task=='extension':
        if not (ROOT/'node_modules').is_dir():run(tool('npm'),'ci')
        run(tool('npm'),'run','extension:build');run(sys.executable,'scripts/package-extension.py')
    elif args.task=='smoke':ensure();run(venv_python(),'scripts/smoke-engine.py')
    elif args.task=='install':install(args.prefix)
    elif args.task=='uninstall':uninstall(args.prefix)
    elif args.task=='clean':clean()

if __name__=='__main__':
    try:main()
    except (RuntimeError,subprocess.CalledProcessError,OSError) as error:
        print('Error:',error,file=sys.stderr);raise SystemExit(1)
