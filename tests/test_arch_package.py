import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('arch_package', Path(__file__).parents[1] / 'scripts/package-arch.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


@unittest.skipUnless(sys.platform == 'linux', 'Native Linux package and symlink permissions')
class ArchPackageTests(unittest.TestCase):
    def elf(self, path, machine=62):
        path.parent.mkdir(parents=True, exist_ok=True)
        header = bytearray(20)
        header[:6] = b'\x7fELF\x02\x01'
        header[18:20] = machine.to_bytes(2, 'little')
        path.write_bytes(header)
        path.chmod(0o755)

    def test_incomplete_engine_is_rejected_before_staging(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.elf(root / 'src-tauri/target/release/gosu-speech-to-text')
            self.elf(root / 'src-tauri/target/release/engine/gosu-engine')
            with self.assertRaisesRegex(ValueError, 'Complete staged'):
                package.stage(root, root / 'payload', {})
            self.assertFalse((root / 'payload').exists())

    def test_complete_engine_and_notices_are_preserved_without_bundling_webkit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.elf(root / 'src-tauri/target/release/gosu-speech-to-text')
            self.elf(root / 'src-tauri/target/release/engine/gosu-engine')
            runtime = root / 'src-tauri/target/release/engine/_internal'
            runtime.mkdir()
            (runtime / 'libpython3.12.so.1.0').write_bytes(b'runtime')
            (runtime / 'libpython3.12.so').symlink_to('libpython3.12.so.1.0')
            for name in ('LICENSE', 'THIRD-PARTY.md', 'PRIVACY.md', 'INSTALL-LINUX.md',
                         'src-tauri/icons/icon.png', 'vendor-notices/notice.txt'):
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(name)
            payload = root / 'payload'
            package.stage(root, payload, {'commit': 'fixture'})
            self.assertEqual((payload / 'opt/gosu-speech-to-text/engine/_internal/libpython3.12.so').read_bytes(), b'runtime')
            self.assertTrue((payload / 'usr/bin/gosu-speech-to-text').is_symlink())
            self.assertTrue((payload / 'usr/share/doc/gosu-speech-to-text/vendor-notices/notice.txt').is_file())
            self.assertFalse(list(payload.rglob('libwebkit*')))
            with self.assertRaises(FileExistsError):
                package.stage(root, payload, {})
