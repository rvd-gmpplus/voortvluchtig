// @ts-check
// Rook- en regressietests voor VOORTVLUCHTIG. De game draait in echte Chromium met software-WebGL.
// De spelstatus (state, player, hunters, CFG, ...) staat als top-level let/const in de pagina en is
// daarom via page.evaluate("...") met een string-expressie leesbaar.
const { test, expect } = require('@playwright/test');

/** Opent de game en wacht tot de startknop klaarstaat. Verzamelt fouten en verzoeken. */
async function openGame(page) {
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await expect(page.locator('#btnStart')).toBeEnabled();
  return { errors, requests };
}

const val = (page, expr) => page.evaluate(expr);

async function start(page) {
  await page.locator('#btnStart').click();
  await expect.poll(() => val(page, 'state')).toBe('play');
}

/** Zet de jagers ver weg, zodat een test niet toevallig eindigt doordat iemand gepakt wordt. */
async function parkHunters(page) {
  await page.evaluate(`hunters.forEach((h) => { h.mode = 'drive'; h.x = h.spawn.x; h.z = h.spawn.z; h.wps = []; h.fig.visible = false; });
    intel.t = -999; CFG.intelFreshDrive = 0;`);
}

const isMobile = (info) => info.project.name === 'mobiel';

test('laadt zonder fouten en zonder verzoeken naar andere hosts', async ({ page, baseURL }) => {
  const { errors, requests } = await openGame(page);
  await expect(page.locator('#btnStart')).toHaveText(/Start de ontsnapping/);
  await start(page);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
  const host = new URL(String(baseURL)).host;
  expect(requests.filter((u) => !u.startsWith('data:') && new URL(u).host !== host)).toEqual([]);
});

test('lopen verplaatst de speler', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await start(page);
  const before = await val(page, '({x: player.x, z: player.z})');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  const after = await val(page, '({x: player.x, z: player.z})');
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(3);
});

test('WASD werkt op fysieke positie (AZERTY: Z-toets op de W-plek)', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await start(page);
  const before = await val(page, '({x: player.x, z: player.z})');
  await page.evaluate(`dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyW', key: 'z'}))`);
  await page.waitForTimeout(700);
  await page.evaluate(`dispatchEvent(new KeyboardEvent('keyup', {code: 'KeyW', key: 'z'}))`);
  const after = await val(page, '({x: player.x, z: player.z})');
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(2);
});

test('uitgeput sprinten gaat niet sneller dan wandelen', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await start(page);
  await parkHunters(page);
  await page.evaluate('player.stam = 0.5');
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(300);
  const a = await val(page, '({x: player.x, z: player.z, t: tNow})');
  await page.waitForTimeout(1500);
  const b = await val(page, '({x: player.x, z: player.z, t: tNow, tired: player.tired})');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  const speed = Math.hypot(b.x - a.x, b.z - a.z) / (b.t - a.t);
  const walk = await val(page, 'CFG.walk');
  expect(b.tired).toBe(true);
  expect(speed).toBeLessThan(walk * 1.1);
});

test('pauze bevriest klok en jagers, P hervat', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await start(page);
  await page.keyboard.press('KeyP');
  await expect(page.locator('#pauseScr')).toBeVisible();
  const t1 = await val(page, 'tNow');
  await page.waitForTimeout(1000);
  expect(await val(page, 'tNow')).toBe(t1);
  await page.keyboard.press('KeyP');
  await expect(page.locator('#pauseScr')).toBeHidden();
  await page.waitForTimeout(500);
  expect(await val(page, 'tNow')).toBeGreaterThan(t1);
});

test('tabblad verbergen pauzeert het spel', async ({ page }) => {
  await openGame(page);
  await start(page);
  await page.evaluate(`Object.defineProperty(document, 'hidden', {value: true, configurable: true});
    document.dispatchEvent(new Event('visibilitychange'));`);
  expect(await val(page, 'state')).toBe('paused');
});

test('focus kwijt: ingedrukte toets blijft niet hangen', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await start(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(200);
  expect(await val(page, 'keys.up')).toBe(true);
  await page.evaluate(`dispatchEvent(new Event('blur'))`);
  expect(await val(page, 'keys.up')).toBe(false);
  expect(await val(page, 'state')).toBe('paused');
  await page.keyboard.up('KeyW');
});

test('Spatie op de gefocuste startknop en Enter op het eindscherm werken', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await page.locator('#btnStart').focus();
  await page.keyboard.press('Space');
  await expect.poll(() => val(page, 'state')).toBe('play');
  await page.evaluate('endGame(false)');
  await expect(page.locator('#endScr')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect.poll(() => val(page, 'state')).toBe('play');
});

test('overleven tot de tijd op is geeft winst', async ({ page }) => {
  await openGame(page);
  await page.evaluate('CFG.surviveTime = 1.5');
  await start(page);
  // speltijd loopt alleen door zolang er frames zijn; ruime wandkloktijd voor trage software-WebGL
  await expect(page.locator('#endScr')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#endTitle')).toContainText('snapt');
});

test('een jager op je positie betekent gepakt', async ({ page }) => {
  await openGame(page);
  await start(page);
  await page.evaluate(`hunters[0].mode = 'drive'; hunters[0].wps = []; hunters[0].x = player.x; hunters[0].z = player.z;`);
  await expect(page.locator('#endScr')).toBeVisible();
  await expect(page.locator('#endTitle')).toContainText('pakt');
});

test('jager te voet loopt om een huis heen in plaats van vast te lopen', async ({ page }) => {
  await openGame(page);
  await start(page);
  // Speler ver weg, zodat geen jager de speler ziet. Het doel ligt recht achter het huis op (-180,-60).
  await page.evaluate(`player.x = -440; player.z = 440;
    hunters.forEach((h, i) => { if (i) { h.mode = 'drive'; h.x = h.spawn.x; h.z = h.spawn.z; h.wps = []; } });
    const h = hunters[0];
    h.mode = 'foot'; h.fx = -180; h.fz = -40; h.carX = -180; h.carZ = -40; h.fig.visible = true;
    h.searchUntil = 0; h.stuckT = 0; h.detourT = 0;
    intel.x = -180; intel.z = -80; intel.t = tNow;`);
  let best = 1e9;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const d = await val(page, `(intel.t = tNow, Math.hypot(hunters[0].fx + 180, hunters[0].fz + 80))`);
    best = Math.min(best, d);
    if (best < 4) break;
  }
  expect(best).toBeLessThan(4);
});

test('camera kijkt niet door een huis heen', async ({ page }) => {
  await openGame(page);
  await start(page);
  await parkHunters(page);
  // Speler tegen de zuidmuur van het huis op (-300,-180), camera draait er dwars doorheen.
  await page.evaluate('player.x = -300; player.z = -175.9; camYaw = Math.PI; camPitch = .42;');
  await page.waitForTimeout(400);
  const blocked = await page.evaluate(`(() => {
    const head = new THREE.Vector3(player.x, 1.7, player.z);
    const toCam = camera.position.clone().sub(head);
    const r = new THREE.Raycaster(head, toCam.clone().normalize(), 0, toCam.length());
    return r.intersectObjects(camBlockers, false).length;
  })()`);
  expect(blocked).toBe(0);
});

test('foutscherm als Three.js niet laadt', async ({ page }) => {
  await page.route('**/vendor/three.min.js', (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('#errScr')).toBeVisible();
  await expect(page.locator('#errTitle')).toHaveText('Spel kon niet laden');
  await expect(page.locator('#startScr')).toBeHidden();
});

test('foutscherm als WebGL niet start', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).startsWith('webgl') || type === 'experimental-webgl') return null;
      return orig.call(this, type, ...rest);
    };
  });
  await page.goto('/');
  await expect(page.locator('#errScr')).toBeVisible();
  await expect(page.locator('#errTitle')).toHaveText('3D wordt niet ondersteund');
});

test('mobiel: knoppen zichtbaar, tikken start en pauzeert', async ({ page }, info) => {
  test.skip(!isMobile(info), 'aanraaktest');
  await openGame(page);
  await page.locator('#btnStart').tap();
  await expect.poll(() => val(page, 'state')).toBe('play');
  await expect(page.locator('#btnSprint')).toBeVisible();
  await expect(page.locator('#btnHide')).toBeVisible();
  await page.locator('#btnPause').tap();
  await expect(page.locator('#pauseScr')).toBeVisible();
  await page.locator('#btnResume').tap();
  await expect.poll(() => val(page, 'state')).toBe('play');
});

test('smalle telefoon: melding overlapt timer, minikaart en pauzeknop niet', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openGame(page);
  await start(page);
  await page.evaluate(`msg('📍 LOCATIE GEDEELD')`);
  const rects = await page.evaluate(`(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return {l: b.left, r: b.right, t: b.top, b: b.bottom}; };
    return {msg: r(document.querySelector('#msgs .msg:last-child')), top: r($('topLeft')), mini: r($('mini')), pause: r($('btnPause'))};
  })()`);
  const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  expect(overlap(rects.msg, rects.top)).toBe(false);
  expect(overlap(rects.msg, rects.mini)).toBe(false);
  expect(overlap(rects.msg, rects.pause)).toBe(false);
});
