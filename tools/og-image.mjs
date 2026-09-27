// Maakt og-image.png (1200x630), de afbeelding die chat-apps tonen als iemand de link deelt.
// Gebruik: node tools/og-image.mjs   (vereist: npx playwright install chromium, of PW_CHROMIUM_PATH)
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { seedScript } = require('../tests/balance-harness.js');
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.addInitScript(seedScript, 7); // vaste kaart, zodat de afbeelding reproduceerbaar is
await page.goto(pathToFileURL(ROOT + 'index.html').href);
await page.waitForFunction(() => !document.getElementById('btnStart').disabled);
await page.evaluate(() => {
  startGame();
  pauseGame(); document.getElementById('pauseScr').style.display = 'none'; // stilstaand beeld
  player.x = 150; player.z = 150; player.rot = 2.3;
  pMesh.position.set(player.x, 0, player.z); pMesh.rotation.y = player.rot;
  // een jager te voet op weg naar de speler, en de rode ring van de laatste locatiedeling
  const h = hunters[0];
  h.fig.visible = true; h.fig.position.set(166, 0, 171); h.fig.rotation.y = Math.atan2(150 - 166, 150 - 171);
  pingRing.visible = true; pingRing.position.set(150, .06, 150); pingRing.scale.set(1, 1, 1);
  pingRing.material.opacity = .85;
  camYaw = -2.35; camPitch = .26; camDist = 13; camEff = 13;
  for (const id of ['topLeft', 'mini', 'stamWrap', 'btnPause', 'msgs', 'btnCol']) document.getElementById(id).style.display = 'none';
  const t = document.createElement('div');
  t.innerHTML = '<div style="font-size:18px;font-weight:900;letter-spacing:5px;color:#ff6b70">LIVE KLOPJACHT IN DE BROWSER</div>'
    + '<div style="font-size:108px;font-weight:900;font-style:italic;letter-spacing:-3px;line-height:1;text-transform:uppercase">Voort<span style="color:#e5484d">vluchtig</span></div>'
    + '<div style="font-size:30px;font-weight:700;margin-top:10px">Blijf 5 minuten uit handen van de jagers</div>';
  Object.assign(t.style, { position: 'fixed', left: '56px', bottom: '48px', zIndex: 50, color: '#fff',
    fontFamily: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", textShadow: '0 4px 24px rgba(0,0,0,.55)' });
  document.body.appendChild(t);
  const shade = document.createElement('div');
  Object.assign(shade.style, { position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none',
    background: 'linear-gradient(0deg, rgba(7,9,12,.85) 0%, rgba(7,9,12,.35) 45%, rgba(7,9,12,0) 70%)' });
  document.body.appendChild(shade);
});
await page.waitForTimeout(800);
await page.screenshot({ path: ROOT + 'og-image.png' });
await browser.close();
console.log('og-image.png geschreven');
