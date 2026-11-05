"""Preparation must preserve existing environments and stop before packaging on failure."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('configurar', Path(__file__).resolve().parents[1] / 'scripts/configurar.py')
configurar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(configurar)


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        python = self.root / '.venv' / ('Scripts/python.exe' if configurar.os.name == 'nt' else 'bin/python')
        python.parent.mkdir(parents=True)
        python.write_text('existing environment')
        self.python = python

    def test_wrong_python_preserves_environment_without_installing(self):
        with patch.object(configurar, 'ROOT', self.root), patch.object(configurar.sys, 'argv', ['configurar.py', '--build']), patch.object(configurar.sys, 'version_info', (3, 12)), patch.object(configurar.shutil, 'which', return_value='tool'), patch.object(configurar.subprocess, 'check_output', return_value='3.11\n'), patch.object(configurar.subprocess, 'run') as run:
            with self.assertRaisesRegex(RuntimeError, 'Python 3.12'):
                configurar.main()
            run.assert_not_called()
        self.assertEqual(self.python.read_text(), 'existing environment')

    def test_failed_check_never_launches_packaging(self):
        commands = []

        def run(command, **kwargs):
            commands.append(command)
            if command[1:] == ['run', 'check']:
                raise subprocess.CalledProcessError(1, command)

        with patch.object(configurar, 'ROOT', self.root), patch.object(configurar.sys, 'argv', ['configurar.py', '--build']), patch.object(configurar.sys, 'version_info', (3, 12)), patch.object(configurar.shutil, 'which', return_value='tool'), patch.object(configurar.subprocess, 'check_output', return_value='3.12\n'), patch.object(configurar.subprocess, 'run', side_effect=run):
            with self.assertRaises(subprocess.CalledProcessError):
                configurar.main()
        self.assertFalse(any('desktop:build' in command for command in commands))
        self.assertEqual(self.python.read_text(), 'existing environment')
