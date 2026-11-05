import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateRelease(version, changelog, ref) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw Error('La versión debe ser X.Y.Z sin ceros iniciales.');
  if (!changelog.split(/\r?\n/).some((line) => line.startsWith(`## [${version}] — `)))
    throw Error('Falta la entrada de esta versión en CHANGELOG.md.');
  if (ref?.startsWith('refs/tags/') && ref !== `refs/tags/v${version}`)
    throw Error(`La etiqueta debe ser v${version}; recibida: ${ref}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = new URL('../', import.meta.url);
  const brand = JSON.parse(await readFile(new URL('brand.json', root), 'utf8'));
  validateRelease(
    brand.version,
    await readFile(new URL('CHANGELOG.md', root), 'utf8'),
    process.env.GITHUB_REF,
  );
  console.log(`Release coherente: v${brand.version}`);
}
