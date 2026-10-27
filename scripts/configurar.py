"""Cross-platform development setup and native build. Requires Python 3.12, Node 22 and Rust."""
import argparse,os,pathlib,shutil,subprocess,sys,venv
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--build',action='store_true');parser.add_argument('--dev',action='store_true');args=parser.parse_args()
if sys.version_info[:2]!=(3,12):raise SystemExit('Ejecuta este script con Python 3.12. Consulta GUIA-0.3.md.')
npm=shutil.which('npm.cmd' if os.name=='nt' else 'npm')
if not npm or not shutil.which('cargo'):raise SystemExit('Falta Node/npm o Rust/Cargo. Consulta BUILD-AND-RELEASE.md y vuelve a abrir la terminal después de instalarlos.')
python=root/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
if not python.exists():venv.EnvBuilder(with_pip=True).create(root/'.venv')
def run(*command):subprocess.run([str(x) for x in command],cwd=root,check=True)
run(python,'-m','pip','install','-r','server/requirements-build.txt');run(npm,'ci');run(npm,'test');run(python,'-m','unittest','discover','-s','server','-p','test_*.py','-v')
if args.build:
 bundles='nsis' if os.name=='nt' else 'app,dmg' if sys.platform=='darwin' else 'appimage'
 run(npm,'run','desktop:build','--','--bundles',bundles)
 run(python,'scripts/checksums.py')
 print('Paquetes: src-tauri/target/release/bundle/')
elif args.dev:run(npm,'run','desktop')
else:print('Preparación completada. Ejecuta npm run desktop o añade --build para crear instaladores.')
