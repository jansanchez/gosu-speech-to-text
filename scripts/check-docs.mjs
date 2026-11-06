import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = (await readdir(root)).filter((name) => name.endsWith('.md'));
const failures = [];
for (const file of files) {
  const source = await readFile(resolve(root, file), 'utf8');
  for (const match of source.matchAll(/\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(target)) continue;
    const local = decodeURIComponent(target.split(/[?#]/)[0]);
    if (!local) continue;
    try {
      await access(resolve(dirname(resolve(root, file)), local));
    } catch {
      failures.push(`${file}: ${target}`);
    }
  }
}
if (failures.length) {
  console.error('Missing local documentation links:\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation: valid local links in ${files.length} files.`);
}
