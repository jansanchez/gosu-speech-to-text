"""Test the std-only Rust runtime path resolver without linking a GUI."""
from pathlib import Path
import os,subprocess,tempfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='gosu-path-tests-') as directory:
 binary=Path(directory)/('engine-path-tests.exe' if os.name=='nt' else 'engine-path-tests')
 subprocess.run(['rustc','--edition','2021','--test',str(root/'src-tauri/src/engine_paths.rs'),'-o',str(binary)],check=True)
 subprocess.run([str(binary)],check=True)
