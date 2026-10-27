from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1];source=root/'extension-dist'
if not (source/'manifest.json').exists():raise SystemExit('Primero ejecuta npm run extension:build')
with zipfile.ZipFile(root/'gosu-speech-to-text-chrome.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for file in sorted(source.rglob('*')):
  if file.is_file():archive.write(file,file.relative_to(source))
print(root/'gosu-speech-to-text-chrome.zip')
