// @ts-check
// Balanswacht voor moeilijkheid Normaal. Speelt op 12 vaste kaarten (seeds) hele potjes versneld na
// met twee bots en controleert dat de uitkomst binnen een band blijft.
//
// Referentie (27 september 2026, 12 seeds): de oorspronkelijke versie uit de zip en deze versie gaven
// allebei stilstaan = gepakt na 58,1 s en vluchten = 5 van 12 gewonnen (mediaan 135 s oud, 130 s nieuw).
// Faalt deze test na een CFG-aanpassing, dan is Normaal merkbaar makkelijker of moeilijker geworden.
// Is dat de bedoeling, pas dan de banden hieronder aan en noteer de nieuwe referentie.
const { test, expect } = require('@playwright/test');
const { seedScript, harnessScript } = require('./balance-harness');

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const BANDS = {
  stilGepaktNa: [40, 90],        // seconden; referentie 58,1
  vluchtGewonnen: [3, 8],        // van de 12; referentie 5
  vluchtMediaan: [90, 220],      // seconden; referentie 130
};

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

test('balans Normaal blijft binnen de referentieband', async ({ browser }, info) => {
  test.skip(info.project.name === 'mobiel', 'simulatie is apparaatonafhankelijk; één keer draaien volstaat');
  test.setTimeout(180_000);
  const stil = [], vlucht = [];
  for (const seed of SEEDS) {
    const page = await browser.newPage();
    await page.addInitScript(seedScript, seed);
    await page.goto('/');
    await expect(page.locator('#btnStart')).toBeEnabled();
    await page.evaluate(harnessScript);
    stil.push(await page.evaluate((s) => window.__balans.run('stil', s), seed * 10 + 1));
    vlucht.push(await page.evaluate((s) => window.__balans.run('vlucht', s), seed * 10 + 2));
    await page.close();
  }
  const stilT = median(stil.map((r) => r.t));
  const wins = vlucht.filter((r) => r.won).length;
  const vluchtT = median(vlucht.map((r) => r.t));
  console.log(`balans Normaal: stil gepakt na ${stilT} s, vlucht ${wins}/12 gewonnen, mediaan ${vluchtT} s`);
  expect(stilT).toBeGreaterThanOrEqual(BANDS.stilGepaktNa[0]);
  expect(stilT).toBeLessThanOrEqual(BANDS.stilGepaktNa[1]);
  expect(wins).toBeGreaterThanOrEqual(BANDS.vluchtGewonnen[0]);
  expect(wins).toBeLessThanOrEqual(BANDS.vluchtGewonnen[1]);
  expect(vluchtT).toBeGreaterThanOrEqual(BANDS.vluchtMediaan[0]);
  expect(vluchtT).toBeLessThanOrEqual(BANDS.vluchtMediaan[1]);
});
