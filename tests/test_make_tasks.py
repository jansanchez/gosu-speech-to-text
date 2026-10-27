import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from scripts import make_tasks

@unittest.skipUnless(sys.platform=='linux','Linux Make installation tests')
class MakeTasksTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.base=Path(self.temp.name);self.root=self.base/'source';self.root.mkdir()
  self.patch=patch.object(make_tasks,'ROOT',self.root);self.patch.start()
  image=self.root/'src-tauri/target/release/bundle/appimage/GOSU_Speech_to_Text.AppImage';image.parent.mkdir(parents=True);image.write_bytes(b'appimage-fixture')
  icon=self.root/'src-tauri/icons/icon.png';icon.parent.mkdir(parents=True);icon.write_bytes(b'icon-fixture')
  self.prefix=self.base/'installed with spaces'
 def tearDown(self):self.patch.stop();self.temp.cleanup()
 def quiet(self,fn,*args):
  with contextlib.redirect_stdout(io.StringIO()):return fn(*args)
 def test_install_uninstall_preserves_user_content(self):
  with patch('scripts.make_tasks.shutil.which',return_value=None):self.quiet(make_tasks.install,self.prefix)
  paths=make_tasks.install_paths(self.prefix)
  self.assertEqual(paths['binary'].read_bytes(),b'appimage-fixture');self.assertEqual(paths['link'].resolve(),paths['binary'])
  self.assertIn('Exec="',paths['desktop'].read_text());self.assertTrue(paths['binary'].stat().st_mode&0o111)
  keep=paths['binary'].parent/'user-note.txt';keep.write_text('preserve')
  self.quiet(make_tasks.uninstall,self.prefix)
  self.assertTrue(keep.exists());self.assertFalse(paths['binary'].exists());self.assertFalse(paths['link'].is_symlink())
 def test_existing_command_is_not_replaced(self):
  target=self.prefix/'bin/gosu-speech-to-text';target.parent.mkdir(parents=True);target.write_text('another program')
  with self.assertRaises(RuntimeError):self.quiet(make_tasks.install,self.prefix)
  self.assertEqual(target.read_text(),'another program')
 def test_uninstall_requires_ownership_marker(self):
  target=self.prefix/'lib/gosu-speech-to-text/GOSU-Speech-to-Text.AppImage';target.parent.mkdir(parents=True);target.write_text('unmanaged')
  with self.assertRaises(RuntimeError):self.quiet(make_tasks.uninstall,self.prefix)
  self.assertEqual(target.read_text(),'unmanaged')
  (target.parent/'install.json').write_text('{}')
  with self.assertRaises(RuntimeError):self.quiet(make_tasks.install,self.prefix)
  self.assertEqual(target.read_text(),'unmanaged')
 def test_clean_preserves_venv_and_does_not_follow_symlink(self):
  env=self.root/'.venv';env.mkdir();(env/'keep').write_text('environment')
  outside=self.base/'outside';outside.mkdir();(outside/'keep').write_text('external')
  import shutil
  target=self.root/'src-tauri/target';shutil.rmtree(target);target.symlink_to(outside,target_is_directory=True)
  (self.root/'dist').mkdir();(self.root/'dist/app.js').write_text('generated')
  self.quiet(make_tasks.clean)
  self.assertTrue((outside/'keep').exists());self.assertTrue((env/'keep').exists());self.assertFalse((self.root/'dist').exists());self.assertFalse(target.is_symlink())

 def test_legacy_installer_is_migrated_without_removing_other_files(self):
  import json
  legacy=self.prefix/'lib/voz';legacy.mkdir(parents=True)
  binary=legacy/'Voz.AppImage';binary.write_bytes(b'old')
  (legacy/'install.json').write_text(json.dumps({'managed_by':'voz-make-v1','version':'0.3.0'}))
  keep=legacy/'user-note.txt';keep.write_text('keep')
  link=self.prefix/'bin/voz';link.parent.mkdir(parents=True);link.symlink_to(binary)
  with patch('scripts.make_tasks.shutil.which',return_value=None):self.quiet(make_tasks.install,self.prefix)
  self.assertTrue(keep.exists());self.assertFalse(binary.exists());self.assertFalse(link.is_symlink())
  paths=make_tasks.install_paths(self.prefix);self.assertTrue(paths['binary'].exists());self.assertEqual(paths['link'].resolve(),paths['binary'])

if __name__=='__main__':unittest.main()
