// @ts-check
// Balanswacht. Speelt op 12 vaste kaarten (seeds) hele potjes versneld na met twee bots, op alle drie
// de niveaus, en schrijft de uitkomst naar de job-samenvatting in GitHub Actions.
//
// - Rood (blokkeert de deploy) alleen als het spel kapot is: een niveau is onwinbaar of altijd
//   gewonnen, je wordt vrijwel direct op het droppunt gepakt, of Makkelijk/Normaal/Moeilijk staan
//   niet meer in de goede volgorde.
// - Waarschuwing (blokkeert niet) als Normaal duidelijk afwijkt van tests/balance.json (2 of meer
//   gewonnen potjes, meer dan 15 s stilstaan of meer dan 60 s mediaan). Zo kun je de
//   balans bewust bijstellen via CFG; werk daarna balance.json bij met de nieuwe waarden.
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { seedScript, harnessScript } = require('./balance-harness');
const REF = require('./balance.json');

const LEVELS = ['makkelijk', 'normaal', 'moeilijk'];
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

test('balans: alle niveaus speelbaar, in de goede volgorde, Normaal dicht bij de referentie', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'simulatie is apparaatonafhankelijk; één keer draaien volstaat');
  test.setTimeout(300_000);
  const raw = Object.fromEntries(LEVELS.map((l) => [l, { stil: [], vlucht: [] }]));
  for (let seed = 1; seed <= REF.seeds; seed++) {
    const page = await browser.newPage();
    await page.addInitScript(seedScript, seed);
    await page.goto('/');
    await expect(page.locator('#btnStart')).toBeEnabled();
    await page.evaluate(harnessScript);
    for (const level of LEVELS) {
      raw[level].stil.push(await page.evaluate(([s, l]) => window.__balans.run('stil', s, l), [seed * 10 + 1, level]));
      raw[level].vlucht.push(await page.evaluate(([s, l]) => window.__balans.run('vlucht', s, l), [seed * 10 + 2, level]));
    }
    await page.close();
  }
  const m = Object.fromEntries(LEVELS.map((l) => [l, {
    stilGepaktNa: median(raw[l].stil.map((r) => r.t)),
    vluchtGewonnen: raw[l].vlucht.filter((r) => r.won).length,
    vluchtMediaan: median(raw[l].vlucht.map((r) => r.t)),
  }]));

  const rows = LEVELS.map((l) => `| ${l} | ${m[l].stilGepaktNa} s | ${m[l].vluchtGewonnen}/${REF.seeds} | ${m[l].vluchtMediaan} s |`);
  const table = ['### Balans (bots, 12 vaste kaarten)', '', '| Niveau | Stilstaan: gepakt na | Vluchten: gewonnen | Vluchten: mediaan overleefd |', '|---|---|---|---|', ...rows, ''].join('\n');
  console.log(table);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + '\n');

  const ref = REF.niveaus.normaal, n = m.normaal;
  const drift = [];
  if (Math.abs(n.vluchtGewonnen - ref.vluchtGewonnen) >= 2) drift.push(`vluchten gewonnen ${n.vluchtGewonnen} (referentie ${ref.vluchtGewonnen})`);
  if (Math.abs(n.stilGepaktNa - ref.stilGepaktNa) > 15) drift.push(`stilstaan gepakt na ${n.stilGepaktNa} s (referentie ${ref.stilGepaktNa} s)`);
  if (Math.abs(n.vluchtMediaan - ref.vluchtMediaan) > 60) drift.push(`vluchten mediaan ${n.vluchtMediaan} s (referentie ${ref.vluchtMediaan} s)`);
  if (drift.length) console.log(`::warning title=Balans Normaal verschoven::${drift.join('; ')}. Bewust? Werk tests/balance.json bij.`);
  const zip = REF.zip.normaal;
  const zipRegel = `Originele versie (zip) op Normaal: stilstaan ${zip.stilGepaktNa} s, vluchten ${zip.vluchtGewonnen}/${REF.seeds}, mediaan ${zip.vluchtMediaan} s.`;
  console.log(zipRegel);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, zipRegel + '\n');

  for (const l of LEVELS) {
    expect(m[l].vluchtGewonnen, `${l}: vluchten is nooit te winnen`).toBeGreaterThan(0);
    expect(m[l].vluchtGewonnen, `${l}: vluchten wint altijd`).toBeLessThan(REF.seeds);
    expect(m[l].stilGepaktNa, `${l}: je wordt vrijwel direct gepakt`).toBeGreaterThanOrEqual(15);
  }
  expect(m.makkelijk.vluchtMediaan, 'Makkelijk is niet makkelijker dan Normaal').toBeGreaterThanOrEqual(m.normaal.vluchtMediaan);
  expect(m.normaal.vluchtMediaan, 'Moeilijk is niet moeilijker dan Normaal').toBeGreaterThanOrEqual(m.moeilijk.vluchtMediaan);
  expect(m.makkelijk.stilGepaktNa).toBeGreaterThanOrEqual(m.normaal.stilGepaktNa);
  expect(m.normaal.stilGepaktNa).toBeGreaterThanOrEqual(m.moeilijk.stilGepaktNa);
});
