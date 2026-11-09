import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('linux_packages', Path(__file__).parents[1] / 'scripts/check-linux-packages.py')
packages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packages)


class LinuxPackageTests(unittest.TestCase):
    def executable(self, path, machine=62):
        path.parent.mkdir(parents=True, exist_ok=True)
        header = bytearray(20)
        header[:6] = b'\x7fELF\x02\x01'
        header[18:20] = machine.to_bytes(2, 'little')
        path.write_bytes(header)
        path.chmod(0o755)

    def test_incomplete_engine_and_wrong_architecture_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app = root / 'usr/bin/gosu-speech-to-text'
            self.executable(app)
            with self.assertRaisesRegex(ValueError, 'bundled engine'):
                packages.inspect_tree(root)
            engine = root / 'usr/lib/GOSU Speech to Text/engine/gosu-engine'
            self.executable(engine, machine=183)
            with self.assertRaisesRegex(ValueError, 'x86_64'):
                packages.inspect_tree(root)
            self.executable(engine)
            with self.assertRaisesRegex(ValueError, 'Python'):
                packages.inspect_tree(root)
            runtime = engine.parent / '_internal'
            runtime.mkdir()
            (runtime / 'libpython3.12.so.1.0').touch()
            with self.assertRaisesRegex(ValueError, 'audio conversion'):
                packages.inspect_tree(root)
            (runtime / 'libswresample-hash.so.6.1.100').touch()
            desktop = root / 'usr/share/applications/gosu.desktop'
            desktop.parent.mkdir(parents=True)
            desktop.write_text('[Desktop Entry]\n')
            self.assertEqual(packages.inspect_tree(root)['engine'], 'x86_64')
            app.chmod(0o644)
            with self.assertRaisesRegex(ValueError, 'permission'):
                packages.inspect_tree(root)

    def test_missing_or_multiple_candidates_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaisesRegex(ValueError, 'exactly one deb'):
                packages.inspect_bundle(root, '0.6.0')
            (root / 'deb').mkdir()
            for name in ('one.deb', 'two.deb'):
                (root / 'deb' / name).touch()
            with self.assertRaisesRegex(ValueError, 'exactly one deb'):
                packages.inspect_bundle(root, '0.6.0')
