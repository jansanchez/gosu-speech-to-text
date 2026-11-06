import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareDesktop } from './prepare-desktop.mjs';
import { stageEngine } from './stage-engine.mjs';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// PyInstaller removes wheel RPATHs. linuxdeploy still inspects these ELF files
// independently of the Python bootloader, so expose their bundled dependencies.
export function bundleEnvironment(root, platform, env) {
  if (platform !== 'linux') return { ...env };
  const directories = [];
  const visit = (directory) => {
    const entries = readdirSync(directory, { withFileTypes: true });
    if (entries.some((entry) => !entry.isDirectory() && entry.name.includes('.so')))
      directories.push(directory);
    for (const entry of entries)
      if (entry.isDirectory()) visit(join(directory, entry.name));
  };
  visit(join(root, 'engine-dist', 'gosu-engine'));
  return {
    ...env,
    LD_LIBRARY_PATH: [
      ...directories,
      ...(env.LD_LIBRARY_PATH ? [env.LD_LIBRARY_PATH] : []),
    ].join(':'),
  };
}
export async function buildDesktop({
  root = project,
  args = process.argv.slice(2),
  spawn = spawnSync,
  prepare = prepareDesktop,
  stage = stageEngine,
  platform = process.platform,
  env = process.env,
} = {}) {
  prepare({ root, bundle: true });
  // Forward all npm arguments to Tauri, not to the staging helper.
  const result = spawn(
    process.execPath,
    [
      join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js'),
      'build',
      '--config',
      'src-tauri/tauri.release.conf.json',
      ...args,
    ],
    { cwd: root, stdio: 'inherit', env: bundleEnvironment(root, platform, env) },
  );
  if (result.status !== 0)
    throw Error(
      'Tauri build failed: ' + (result.error?.message || 'review the output above'),
    );
  await stage({ root, args });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await buildDesktop();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
