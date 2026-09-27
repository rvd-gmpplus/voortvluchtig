// Stelt de map _site samen: alleen wat spelers nodig hebben, precies zoals het op GitHub Pages komt.
// Gebruik: node tools/build-site.mjs   (CI test daarna tegen _site en publiceert die map)
// versie.txt bevat de commit, zodat de workflow na de deploy kan controleren wat er live staat.
import { cp, mkdir, rm, access, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, '_site');
const FILES = ['index.html', '.nojekyll', 'og-image.png', 'vendor'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const f of FILES) {
  await access(join(ROOT, f)); // faalt hard als een bestand ontbreekt
  await cp(join(ROOT, f), join(OUT, f), { recursive: true });
}
await writeFile(join(OUT, 'versie.txt'), (process.env.GITHUB_SHA || 'lokaal') + '\n');
console.log(`_site klaar: ${FILES.join(', ')}, versie.txt`);
