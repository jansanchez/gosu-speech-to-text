"""Run with the project's Python environment on EACH target OS/architecture."""
from pathlib import Path
import subprocess,sys,ssl
root=Path(__file__).resolve().parents[1]
args=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--onedir','--name','gosu-engine','--distpath',str(root/'engine-dist'),'--workpath',str(root/'build-engine'),'--specpath',str(root/'build-engine'),'--paths',str(root)]
# Preserve additional trust-policy data when Python is supplied by a managed runtime.
trust_file=Path(ssl.__file__).with_name('codex-rejected-cas.pem')
if trust_file.exists():
    args += ['--add-data',str(trust_file)+':.']
for package in ['faster_whisper','ctranslate2','onnxruntime','tokenizers','av']:
    args += ['--collect-all',package]
for package in ['faster-whisper','ctranslate2','onnxruntime','tokenizers','av','huggingface-hub','fastapi','uvicorn','certifi']:
    args += ['--copy-metadata',package]
args += ['--hidden-import','uvicorn.logging','--hidden-import','uvicorn.loops.auto','--hidden-import','uvicorn.protocols.http.auto','--hidden-import','uvicorn.lifespan.on',str(root/'server/engine.py')]
subprocess.run(args,cwd=root,check=True)
