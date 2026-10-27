"""Apply this source release over an existing checkout, preserving dependencies and data."""
import argparse,datetime,pathlib,shutil
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('project',type=pathlib.Path);parser.add_argument('--dry-run',action='store_true');args=parser.parse_args();target=args.project.resolve()
if root==target or not (target/'src-tauri/Cargo.toml').is_file():raise SystemExit('Elige el proyecto anterior como destino y ejecuta el actualizador desde el ZIP nuevo.')
exclude={'.git','.venv','node_modules','target','dist','extension-dist','engine-dist','build-engine','__pycache__','.voz-backups'}
files=[p for p in root.rglob('*') if p.is_file() and not exclude.intersection(p.relative_to(root).parts) and not any(part.startswith('.venv.before-startup-') for part in p.relative_to(root).parts) and p.suffix not in {'.log','.pyc','.zip'} and p.name!='.gitignore']
backup=target/'.voz-backups'/('0.3-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for source in files:
 relative=source.relative_to(root);destination=target/relative
 if args.dry_run:print(relative);continue
 if destination.exists():
  saved=backup/relative;saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(destination,saved)
 destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination)
if not args.dry_run:
 ignore=target/'.gitignore';text=ignore.read_text() if ignore.exists() else ''
 if '.voz-backups/' not in text:ignore.write_text(text+'\n.voz-backups/\n')
 print('Actualizado. Respaldo:',backup)
print('Desde el proyecto: npm ci && npm run desktop')
