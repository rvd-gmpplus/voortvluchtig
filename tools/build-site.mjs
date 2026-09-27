// Stelt de map _site samen: alleen wat spelers nodig hebben, precies zoals het op GitHub Pages komt.
// Gebruik: node tools/build-site.mjs   (CI test daarna tegen _site en publiceert die map)
import { cp, mkdir, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, '_site');
const FILES = ['index.html', '.nojekyll', 'vendor'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const f of FILES) {
  await access(join(ROOT, f)); // faalt hard als een bestand ontbreekt
  await cp(join(ROOT, f), join(OUT, f), { recursive: true });
}
console.log(`_site klaar: ${FILES.join(', ')}`);
