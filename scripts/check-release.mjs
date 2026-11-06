import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateRelease(version, changelog, ref) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw Error('Version must use X.Y.Z without leading zeros.');
  if (!changelog.split(/\r?\n/).some((line) => line.startsWith(`## [${version}] — `)))
    throw Error('This version is missing from CHANGELOG.md.');
  if (ref?.startsWith('refs/tags/') && ref !== `refs/tags/v${version}`)
    throw Error(`The tag must be v${version}; received: ${ref}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = new URL('../', import.meta.url);
  const brand = JSON.parse(await readFile(new URL('brand.json', root), 'utf8'));
  validateRelease(
    brand.version,
    await readFile(new URL('CHANGELOG.md', root), 'utf8'),
    process.env.GITHUB_REF,
  );
  console.log(`Release metadata consistent: v${brand.version}`);
}
