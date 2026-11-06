import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateRelease } from './check-release.mjs';

export function approval(version, requested, publish, event, ref) {
  if (publish !== 'true') return;
  if (event !== 'workflow_dispatch' || ref !== 'refs/heads/main')
    throw Error('Solo se publica con aprobación manual desde main.');
  if (requested !== version)
    throw Error('La versión aprobada no coincide con brand.json.');
}

export function releaseNotes(version, changelog) {
  validateRelease(version, changelog);
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## [${version}] — `));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return (
    lines
      .slice(start + 1, end < 0 ? undefined : end)
      .join('\n')
      .trim() + '\n'
  );
}

export function uploadRelease(run, tag, version, assets) {
  if (assets.length !== 7)
    throw Error('Se esperaban seis paquetes y un manifiesto de hashes.');
  run('gh', [
    'release',
    'create',
    tag,
    '--verify-tag',
    '--draft',
    '--title',
    `GOSU Speech to Text ${version}`,
    '--notes-file',
    'release-notes.md',
  ]);
  run('gh', ['release', 'upload', tag, ...assets]);
  run('gh', ['release', 'edit', tag, '--draft=false']);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const version = JSON.parse(await readFile('brand.json', 'utf8')).version;
  approval(
    version,
    process.env.VERSION,
    process.env.PUBLISH,
    process.env.GITHUB_EVENT_NAME,
    process.env.GITHUB_REF,
  );
  if (process.env.PUBLISH === 'true') {
    const run = (file, args) => {
      const result = spawnSync(file, args, { encoding: 'utf8' });
      if (result.status !== 0)
        throw Error(`${file} falló: ${result.stderr || result.error?.message}`);
      return result.stdout.trim();
    };
    const tag = `v${version}`;
    const sha = run('git', ['rev-parse', 'HEAD']);
    if (sha !== process.env.GITHUB_SHA)
      throw Error('El checkout no coincide con el commit aprobado.');
    run('git', ['fetch', 'origin', '--tags']);
    const tags = run('git', ['tag', '--list', tag]);
    if (tags && run('git', ['rev-parse', `${tag}^{commit}`]) !== sha)
      throw Error('La etiqueta ya identifica otro commit. Incrementa la versión.');
    if (tags && run('git', ['cat-file', '-t', tag]) !== 'tag')
      throw Error('La etiqueta existente no es anotada.');
    if (process.argv.includes('--publish')) {
      // Reject existing releases, including drafts, instead of overwriting assets.
      const releases = JSON.parse(
        run('gh', [
          'api',
          '--paginate',
          '--slurp',
          'repos/{owner}/{repo}/releases?per_page=100',
        ]),
      ).flat();
      if (releases.some((release) => release.tag_name === tag))
        throw Error(
          'Ya existe una release o borrador de esta versión. Revisar antes de reintentar.',
        );
      const notes =
        releaseNotes(version, await readFile('CHANGELOG.md', 'utf8')) +
        `\nCommit: ${sha}\n\nPaquetes sin firma ni notarización. La compilación automatizada no certifica por sí sola instalación, micrófono ni permisos en cada plataforma.\n`;
      await writeFile('release-notes.md', notes);
      const { readdir } = await import('node:fs/promises');
      const assets = (await readdir('release-assets')).map(
        (name) => `release-assets/${name}`,
      );
      if (assets.length !== 7)
        throw Error('Se esperaban seis paquetes y un manifiesto de hashes.');
      if (!tags) {
        run('git', ['config', 'user.name', 'github-actions[bot]']);
        run('git', [
          'config',
          'user.email',
          '41898282+github-actions[bot]@users.noreply.github.com',
        ]);
        run('git', ['tag', '-a', tag, '-m', `GOSU Speech to Text ${version}`]);
        run('git', ['push', 'origin', `refs/tags/${tag}`]);
      }
      uploadRelease(run, tag, version, assets);
      console.log(`Release publicada: ${tag}`);
    }
  }
}
