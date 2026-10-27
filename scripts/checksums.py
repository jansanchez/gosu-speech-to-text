from pathlib import Path
import hashlib,sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'src-tauri/target/release/bundle')
files=sorted(p for p in root.rglob('*') if p.is_file() and p.suffix.lower() in {'.exe','.dmg','.deb','.appimage','.zip'})
if not files:raise SystemExit('No hay instaladores para calcular hashes.')
lines=[]
for file in files:
 digest=hashlib.sha256()
 with file.open('rb') as stream:
  while chunk:=stream.read(1024*1024):digest.update(chunk)
 lines.append(digest.hexdigest()+'  '+file.relative_to(root).as_posix())
(root/'SHA256SUMS.txt').write_text('\n'.join(lines)+'\n');print(root/'SHA256SUMS.txt')
