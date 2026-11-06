import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('release_assets', Path(__file__).parents[1] / 'scripts/release-assets.py')
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


class ReleaseAssetsTests(unittest.TestCase):
    def fixture(self, root):
        for platform, patterns in assets.PACKAGES.items():
            folder = root / ('gosu-speech-to-text-' + platform)
            folder.mkdir(parents=True)
            lines = []
            for pattern in patterns:
                package = folder / pattern.replace('*', 'GOSU with spaces')
                package.parent.mkdir(parents=True, exist_ok=True)
                package.write_bytes(platform.encode())
                lines.append(f'{assets.digest(package)}  {package.relative_to(folder).as_posix()}\n')
            if platform != 'chrome':
                (folder / 'SHA256SUMS.txt').write_text(''.join(lines))
            (folder / 'private-runtime-file.zip').write_bytes(b'not an installer')

    def test_exact_packages_and_unique_platform_names(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root / 'source')
            assets.assemble(root / 'source', root / 'out')
            self.assertEqual(len(list((root / 'out').iterdir())), 7)
            self.assertEqual(len((root / 'out/SHA256SUMS.txt').read_text().splitlines()), 6)
            self.assertFalse(any('private-runtime' in p.name for p in (root / 'out').iterdir()))

    def test_missing_artifact_and_tampered_package_do_not_create_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root / 'source')
            package = next((root / 'source/gosu-speech-to-text-linux-x64/deb').glob('*.deb'))
            package.write_bytes(b'tampered')
            with self.assertRaises(ValueError):
                assets.assemble(root / 'source', root / 'out')
            self.assertFalse((root / 'out').exists())
            with self.assertRaises(ValueError):
                assets.assemble(root, root / 'out')
