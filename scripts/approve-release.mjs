import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateRelease } from './check-release.mjs';

export function approval(version, requested, publish, event, ref) {
  if (publish !== 'true') return;
  if (event !== 'workflow_dispatch' || ref !== 'refs/heads/main')
    throw Error('Publishing requires manual approval from main.');
  if (requested !== version)
    throw Error('The approved version does not match brand.json.');
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
    throw Error('Expected six packages and one checksum manifest.');
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
        throw Error(`${file} failed: ${result.stderr || result.error?.message}`);
      return result.stdout.trim();
    };
    const tag = `v${version}`;
    const sha = run('git', ['rev-parse', 'HEAD']);
    if (sha !== process.env.GITHUB_SHA)
      throw Error('The checkout does not match the approved commit.');
    run('git', ['fetch', 'origin', '--tags']);
    const tags = run('git', ['tag', '--list', tag]);
    if (tags && run('git', ['rev-parse', `${tag}^{commit}`]) !== sha)
      throw Error('The tag already identifies another commit. Increment the version.');
    if (tags && run('git', ['cat-file', '-t', tag]) !== 'tag')
      throw Error('The existing tag is not annotated.');
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
          'A release or draft already exists for this version. Review it before retrying.',
        );
      const notes =
        releaseNotes(version, await readFile('CHANGELOG.md', 'utf8')) +
        `\nCommit: ${sha}\n\nPackages are unsigned and not notarized. Automated builds alone do not validate installation, microphone access, or permissions on each platform.\n`;
      await writeFile('release-notes.md', notes);
      const { readdir } = await import('node:fs/promises');
      const assets = (await readdir('release-assets')).map(
        (name) => `release-assets/${name}`,
      );
      if (assets.length !== 7)
        throw Error('Expected six packages and one checksum manifest.');
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
      console.log(`Release published: ${tag}`);
    }
  }
}
