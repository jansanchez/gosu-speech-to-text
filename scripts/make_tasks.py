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
HELP = '''GOSU Speech to Text · comandos GNU Make para Linux
  make doctor       Revisa Node, Python, Rust y dependencias nativas
  make setup        Crea .venv Python 3.12 e instala dependencias
  make dev / run    Abre el escritorio; motor automático
  make test         Pruebas de interfaz/lógica y API
  make check        Pruebas, frontend de producción y cargo check --locked
  make frontend     Compila solo React/TypeScript
  make engine       Empaqueta el motor Python para este SO/arquitectura
  make appimage     Pruebas + motor + AppImage + SHA256SUMS
  make deb          Pruebas + motor + DEB + SHA256SUMS
  make bundle       Pruebas + motor + AppImage y DEB
  make build        Alias de make appimage
  make extension    Compila y comprime la extensión Chrome
  make smoke        Comprueba el motor empaquetado (descarga tiny si falta)
  make install      Instala AppImage y acceso de menú en ~/.local
  make uninstall    Retira solo los archivos instalados por make install
  make clean        Elimina salidas generadas; conserva .venv y datos

La instalación acepta PREFIX=/otra/ruta. No uses sudo para ~/.local.
Consulta LINUX-MAKE.md para requisitos Arch/Ubuntu y límites Wayland.
'''

def run(*args, **kwargs):
    print('+', ' '.join(str(a) for a in args), flush=True)
    subprocess.run([str(a) for a in args], cwd=ROOT, check=True, **kwargs)

def tool(name):
    path = shutil.which(name)
    if not path:
        raise RuntimeError('Falta '+name+'. Consulta LINUX-MAKE.md y vuelve a abrir la terminal tras instalarlo.')
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
            raise RuntimeError('La .venv existente no usa Python 3.12. Renómbrala como respaldo antes de ejecutar make setup; no se ha borrado.')
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
            raise RuntimeError('Falta Python 3.12. En Arch instala uv y repite make setup; el Python del sistema se conserva.')
    if subprocess.run([str(python), '-m', 'pip', '--version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
        run(python, '-m', 'ensurepip', '--upgrade')
    run(python, '-m', 'pip', 'install', '-r', 'server/requirements-build.txt')
    run(npm, 'ci')
    print('Preparado. Ejecuta make dev o make appimage.')

def ensure():
    if not venv_python().is_file() or not (ROOT / 'node_modules').is_dir():
        setup()

def tests():
    ensure()
    run(tool('npm.cmd' if os.name == 'nt' else 'npm'), 'test')
    run(venv_python(), '-m', 'unittest', 'discover', '-s', 'server', '-p', 'test_*.py', '-v')
    run(venv_python(), '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py', '-v')

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
            raise RuntimeError('Falta WebKitGTK 4.1 de desarrollo. Instala los paquetes de LINUX-MAKE.md antes de compilar.')

def build(bundles):
    if sys.platform != 'linux':
        raise RuntimeError('Los paquetes Linux se generan en Linux. Para macOS/Windows consulta GUIA-0.3.md.')
    native_requirements()
    tests()
    run(tool('npm'), 'run', 'desktop:build', '--', '--bundles', bundles)
    run(sys.executable, 'scripts/checksums.py')
    print('Paquetes: src-tauri/target/release/bundle/')

def install_paths(prefix):
    prefix = Path(prefix).expanduser().absolute()
    if '\n' in str(prefix) or '\r' in str(prefix):
        raise RuntimeError('El prefijo contiene caracteres de control.')
    return {
        'binary': prefix / 'lib/gosu-speech-to-text/GOSU-Speech-to-Text.AppImage',
        'link': prefix / 'bin/gosu-speech-to-text',
        'icon': prefix / 'share/icons/hicolor/512x512/apps/org.voz.prototype.png',
        'desktop': prefix / 'share/applications/org.voz.prototype.desktop',
        'marker': prefix / 'lib/gosu-speech-to-text/install.json',
    }

def install(prefix):
    if sys.platform != 'linux':
        raise RuntimeError('make install instala un AppImage Linux.')
    packages = sorted((ROOT / 'src-tauri/target/release/bundle/appimage').glob('*.AppImage'), key=lambda p: p.stat().st_mtime)
    if not packages:
        build('appimage')
        packages = sorted((ROOT / 'src-tauri/target/release/bundle/appimage').glob('*.AppImage'), key=lambda p: p.stat().st_mtime)
    if not packages:
        raise RuntimeError('No se generó ningún AppImage.')
    paths = install_paths(prefix)
    link = paths['link']
    if (link.exists() or link.is_symlink()) and not (link.is_symlink() and link.resolve() == paths['binary'].resolve()):
        raise RuntimeError(str(link)+' pertenece a otra instalación. No se ha reemplazado.')
    if paths['binary'].exists():
        try:
            owner=json.loads(paths['marker'].read_text()) if paths['marker'].is_file() else {}
        except (ValueError,OSError):
            owner={}
        if not isinstance(owner,dict) or owner.get('managed_by')!='gosu-speech-to-text-make-v1':
            raise RuntimeError('El destino contiene un AppImage ajeno al instalador. Elige otro PREFIX.')
    for path in paths.values():
        path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(packages[-1], paths['binary'])
    paths['binary'].chmod(paths['binary'].stat().st_mode | 0o111)
    if not link.is_symlink():
        link.symlink_to(paths['binary'])
    shutil.copy2(ROOT / 'src-tauri/icons/icon.png', paths['icon'])
    executable = str(paths['binary']).replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('$', '\\$')
    paths['desktop'].write_text('[Desktop Entry]\nType=Application\nName=GOSU Speech to Text\nComment=Dictado y corrección local\nExec="'+executable+'"\nIcon=org.voz.prototype\nTerminal=false\nCategories=Utility;Accessibility;\n', encoding='utf-8')
    paths['marker'].write_text(json.dumps({'managed_by':'gosu-speech-to-text-make-v1','version':BRAND['version']}))
    updater = shutil.which('update-desktop-database')
    if updater:
        subprocess.run([updater, str(paths['desktop'].parent)], check=False)
    migrate_legacy_install(prefix,paths)
    print('Instalado:', paths['binary'])
    print('Abre GOSU Speech to Text desde el menú o ejecuta:', link)

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
    print('Nombre anterior migrado a GOSU Speech to Text. Los datos se conservan.')

def uninstall(prefix):
    paths = install_paths(prefix)
    try:
        marker=json.loads(paths['marker'].read_text()) if paths['marker'].is_file() else {}
    except (ValueError,OSError):
        marker={}
    if not isinstance(marker,dict) or marker.get('managed_by') != 'gosu-speech-to-text-make-v1':
        raise RuntimeError('No hay una instalación administrada por este Makefile en ese PREFIX.')
    if paths['link'].is_symlink() and paths['link'].resolve() == paths['binary'].resolve():
        paths['link'].unlink()
    for key in ['desktop','icon','binary','marker']:
        paths[key].unlink(missing_ok=True)
    print('Aplicación retirada. Se conservan dictados, modelos, respaldos y entorno de desarrollo.')

def clean():
    for relative in ['dist','extension-dist','engine-dist','build-engine','src-tauri/target','gosu-speech-to-text-chrome.zip']:
        path = ROOT / relative
        if path.is_symlink() or path.is_file():
            path.unlink()
        elif path.is_dir():
            shutil.rmtree(path)
        print('Salida generada limpiada:', relative)

def doctor():
    missing = []
    for name in ['node','npm','cargo','rustc','pkg-config']:
        path = shutil.which(name)
        print(('OK ' if path else 'FALTA ')+name+((': '+path) if path else ''))
        if not path: missing.append(name)
    python = venv_python()
    print('Python 3.12:', str(python) if python.exists() else shutil.which('python3.12') or 'se puede instalar con uv durante make setup')
    if not python.exists() and not shutil.which('python3.12') and not shutil.which('uv') and sys.version_info[:2] != (3,12):missing.append('Python 3.12 o uv')
    if sys.platform == 'linux' and shutil.which('pkg-config'):
        result = subprocess.run(['pkg-config','--exists','webkit2gtk-4.1'])
        print('WebKitGTK 4.1:', 'OK' if result.returncode == 0 else 'FALTA; consulta LINUX-MAKE.md')
        if result.returncode:missing.append('WebKitGTK 4.1')
    session = os.environ.get('XDG_SESSION_TYPE','desconocida')
    print('Sesión gráfica:',session)
    print('Pegado X11 opcional:',shutil.which('xdotool') or 'instala xdotool; en Wayland usa copiar/pegar manual')
    if missing:raise RuntimeError('Pendiente: '+', '.join(missing)+'. Las dependencias del sistema se instalan según LINUX-MAKE.md.')

def main():
    parser=argparse.ArgumentParser(description=HELP,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('task',choices=['help','doctor','setup','dev','test','check','frontend','engine','appimage','deb','bundle','extension','smoke','install','uninstall','clean'])
    parser.add_argument('--prefix',default=str(Path.home()/'.local'))
    args=parser.parse_args()
    if args.task=='help':print(HELP)
    elif args.task=='doctor':doctor()
    elif args.task=='setup':setup()
    elif args.task=='dev':native_requirements();ensure();run(tool('npm'),'run','desktop')
    elif args.task=='test':tests()
    elif args.task=='check':tests();frontend();native_requirements();run(tool('cargo'),'check','--locked','--manifest-path','src-tauri/Cargo.toml')
    elif args.task=='frontend':frontend()
    elif args.task=='engine':engine()
    elif args.task in {'appimage','deb','bundle'}:build('appimage,deb' if args.task=='bundle' else args.task)
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
