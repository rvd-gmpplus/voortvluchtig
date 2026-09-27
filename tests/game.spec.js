// @ts-check
// Rook- en regressietests voor VOORTVLUCHTIG. De game draait in echte browsers met software-WebGL.
// De spelstatus (state, player, hunters, CFG, RUN, ...) staat als top-level let/const in de pagina en
// is daarom via page.evaluate("...") met een string-expressie leesbaar.
//
// Tests wachten op speltijd (tNow) of stappen de simulatie zelf door, nooit op de wandklok alleen:
// software-WebGL in CI kan traag zijn, en dan loopt de speltijd achter.
// Tests met @kern draaien ook in WebKit (iPhone-emulatie); Firefox draait alleen de @firefox-test,
// omdat headless Firefox in CI geen WebGL-context kan maken.
const { test, expect } = require('@playwright/test');

/** Opent de game en wacht tot de startknop klaarstaat. Verzamelt fouten en verzoeken. */
async function openGame(page) {
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  // De eerste frame compileert alle shaders; met software-WebGL kan dat even duren.
  try {
    await expect(page.locator('#btnStart')).toBeEnabled({ timeout: 20_000 });
  } catch (e) {
    const diag = await page.evaluate(() => ({
      foutscherm: getComputedStyle(document.getElementById('errScr')).display,
      titel: document.getElementById('errTitle').textContent,
      renderer: typeof window.THREE === 'object' ? 'THREE geladen' : 'THREE ontbreekt',
    }));
    throw new Error(`Startknop bleef uit. ${JSON.stringify(diag)} fouten=${JSON.stringify(errors)}`);
  }
  return { errors, requests };
}

const val = (page, expr) => page.evaluate(expr);

async function start(page) {
  await page.locator('#btnStart').click();
  await expect.poll(() => val(page, 'state')).toBe('play');
}

/** Wacht tot er `seconds` speltijd verstreken is. */
async function advance(page, seconds) {
  const t0 = await val(page, 'tNow');
  await expect.poll(() => val(page, 'tNow'), { timeout: 30_000 }).toBeGreaterThanOrEqual(t0 + seconds);
}

/** Zet de jagers ver weg, zodat een test niet toevallig eindigt doordat iemand gepakt wordt. */
async function parkHunters(page) {
  await page.evaluate(`hunters.forEach((h) => { h.mode = 'drive'; h.x = h.spawn.x; h.z = h.spawn.z; h.wps = []; h.fig.visible = false; });
    intel.t = -999; CFG.intelFreshDrive = 0;`);
}

const isMobile = (info) => info.project.name === 'mobiel' || info.project.name === 'iphone';
const isChromium = (info) => info.project.name === 'desktop' || info.project.name === 'mobiel';

test('laadt zonder fouten en zonder verzoeken naar andere hosts @kern', async ({ page, baseURL }) => {
  const { errors, requests } = await openGame(page);
  await expect(page.locator('#btnStart')).toHaveText(/Start de ontsnapping/);
  await start(page);
  await advance(page, 1);
  expect(await val(page, 'typeof renderer')).toBe('object');
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
  await advance(page, 1);
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
  await advance(page, 0.7);
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
  await advance(page, 0.3);
  const a = await val(page, '({x: player.x, z: player.z, t: tNow})');
  await advance(page, 1.5);
  const b = await val(page, '({x: player.x, z: player.z, t: tNow, tired: player.tired})');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  const speed = Math.hypot(b.x - a.x, b.z - a.z) / (b.t - a.t);
  const walk = await val(page, 'CFG.walk');
  expect(b.tired).toBe(true);
  expect(speed).toBeLessThan(walk * 1.1);
});

test('pauze bevriest klok en jagers, toont fps, P hervat', async ({ page }, info) => {
  test.skip(isMobile(info), 'toetsenbordtest');
  await openGame(page);
  await start(page);
  await advance(page, 0.5);
  await page.keyboard.press('KeyP');
  await expect(page.locator('#pauseScr')).toBeVisible();
  await expect(page.locator('#fps')).toHaveText(/^Beeld: \d+ fps$/);
  const t1 = await val(page, 'tNow');
  await page.waitForTimeout(700);
  expect(await val(page, 'tNow')).toBe(t1);
  await page.keyboard.press('KeyP');
  await expect(page.locator('#pauseScr')).toBeHidden();
  await advance(page, 0.2);
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
  await expect.poll(() => val(page, 'keys.up')).toBe(true);
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

test('overleven tot de tijd op is geeft winst en een record', async ({ page }) => {
  await openGame(page);
  await page.evaluate('CFG.surviveTime = 1.5');
  await start(page);
  await parkHunters(page);
  // speltijd doorstappen in plaats van op de wandklok te wachten
  await page.evaluate(`for (let i = 0; i < 40 && state === 'play'; i++) stepGame(0.05)`);
  await expect(page.locator('#endScr')).toBeVisible();
  await expect(page.locator('#endTitle')).toContainText('snapt');
  await expect(page.locator('#endStats')).toContainText('Nieuw record');
  expect(await val(page, "store.get('best.normaal', 0)")).toBe(2);
});

test('een jager op je positie betekent gepakt', async ({ page }) => {
  await openGame(page);
  await start(page);
  await page.evaluate(`hunters[0].mode = 'drive'; hunters[0].wps = []; hunters[0].x = player.x; hunters[0].z = player.z;
    for (let i = 0; i < 5 && state === 'play'; i++) stepGame(0.02)`);
  await expect(page.locator('#endScr')).toBeVisible();
  await expect(page.locator('#endTitle')).toContainText('pakt');
});

test('jager te voet loopt om een huis heen in plaats van vast te lopen', async ({ page }) => {
  await openGame(page);
  // Doel ligt recht achter het huis op (-180,-60); de speler staat ver weg, zodat geen jager de speler ziet.
  const best = await page.evaluate(`(() => {
    reset(); setState('play'); player.x = -440; player.z = 440;
    const h = hunters[0];
    h.mode = 'foot'; h.fx = -180; h.fz = -40; h.carX = -180; h.carZ = -40; h.searchUntil = 0;
    let best = 1e9;
    for (let i = 0; i < 300 && best >= 4; i++) {           // hoogstens 10 s speltijd
      intel.x = -180; intel.z = -80; intel.t = tNow;
      senseStep(h);
      if (h.mode === 'foot') footStep(h, 1 / 30); else if (h.mode === 'return') returnStep(h, 1 / 30);
      tNow += 1 / 30;
      best = Math.min(best, Math.hypot(h.fx + 180, h.fz + 80));
    }
    setState('menu');
    return best;
  })()`);
  expect(best).toBeLessThan(4);
});

test('camera kijkt niet door een huis heen', async ({ page }) => {
  await openGame(page);
  await start(page);
  await parkHunters(page);
  // Speler tegen de zuidmuur van het huis op (-300,-180), camera draait er dwars doorheen.
  await page.evaluate('player.x = -300; player.z = -175.9; camYaw = Math.PI; camPitch = .42;');
  await advance(page, 0.2);
  const blocked = await page.evaluate(`(() => {
    const head = new THREE.Vector3(player.x, 1.7, player.z);
    const toCam = camera.position.clone().sub(head);
    const r = new THREE.Raycaster(head, toCam.clone().normalize(), 0, toCam.length());
    return r.intersectObjects(camBlockers, false).length;
  })()`);
  expect(blocked).toBe(0);
});

test('een boomstam tussen jager en speler blokkeert het zicht', async ({ page }) => {
  await openGame(page);
  const r = await page.evaluate(`(() => {
    reset(); setState('play');
    const t = treePos[0], h = hunters[0];
    h.mode = 'foot'; h.fx = t.x - 20; h.fz = t.z; h.losT = 0;
    player.x = t.x + 3; player.z = t.z; hiddenNow = false; player.bike = null;
    senseStep(h); const achterStam = h.sees;
    player.z = t.z + 6; h.losT = 0; senseStep(h); const vrij = h.sees;
    setState('menu');
    return {achterStam, vrij};
  })()`);
  expect(r).toEqual({ achterStam: false, vrij: true });
});

test('moeilijkheid: factoren op CFG, onthouden, Normaal gelijk aan CFG', async ({ page }) => {
  await openGame(page);
  const normaal = await val(page, `({...RUN})`);
  expect(normaal).toMatchObject({ level: 'normaal', hunters: 3, bushCount: 44 });
  expect(await val(page, 'RUN.footSpeed === CFG.footSpeed && RUN.carSpeed === CFG.carSpeed && RUN.pingInterval === CFG.pingInterval')).toBe(true);
  await page.locator('.lvl[data-level="makkelijk"]').click();
  await expect(page.locator('.lvl[data-level="makkelijk"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#ruleHunters')).toHaveText('twee');
  expect(await val(page, '({h: hunters.length, b: bushes.length, n: bushMesh.count})')).toEqual({ h: 2, b: 88, n: 88 });
  // een CFG-aanpassing werkt door op elk niveau
  const speeds = await val(page, `(() => { CFG.footSpeed = 10; const out = {};
    for (const l of Object.keys(DIFF)) { applyDifficulty(l); out[l] = RUN.footSpeed / CFG.footSpeed; } return out; })()`);
  expect(speeds).toEqual({ makkelijk: 0.9, normaal: 1, moeilijk: 1.1 });
  await page.reload();
  await expect(page.locator('#btnStart')).toBeEnabled();
  expect(await val(page, 'RUN.level')).toBe('makkelijk');
});

test('elke CFG-sleutel wordt in de code gebruikt', async ({ page, request }) => {
  await openGame(page);
  const html = await (await request.get('/')).text();
  const code = html.slice(html.indexOf('\n};', html.indexOf('const CFG = {'))); // alles na het CFG-object
  const keys = await val(page, 'Object.keys(CFG)');
  const unused = keys.filter((k) => !code.includes('CFG.' + k));
  expect(unused).toEqual([]);
});

test('tekenbudget: de hele kaart in beeld blijft onder 160 tekenaanroepen (origineel: 344, nu 130)', async ({ page }, info) => {
  test.skip(!isChromium(info), 'getal is engine-onafhankelijk; Chromium volstaat');
  await openGame(page);
  const calls = await page.evaluate(`(() => {
    applyDifficulty('makkelijk');
    const cam = new THREE.PerspectiveCamera(70, 1, 1, 1000); // hoog genoeg om de hele kaart te zien
    cam.position.set(0, 700, 0.1); cam.lookAt(0, 0, 0);
    renderer.info.autoReset = false; renderer.info.reset();
    renderer.render(scene, cam);
    const n = renderer.info.render.calls;
    renderer.info.autoReset = true; applyDifficulty('normaal');
    return n;
  })()`);
  expect(calls).toBeLessThanOrEqual(160);
});

test('onverwachte fout: spel loopt door en toont een meldlink', async ({ page }) => {
  await openGame(page);
  await start(page);
  await page.evaluate(`setTimeout(() => { throw new Error('testfout'); })`);
  await expect(page.locator('#errBar')).toBeVisible();
  await expect(page.locator('#errBarLink')).toHaveAttribute('href', /issues\/new\?template=probleem\.yml.*fout=.*testfout/);
  expect(await val(page, 'state')).toBe('play');
});

test('foutscherm met meldlink als Three.js niet laadt @kern', async ({ page }) => {
  await page.route('**/vendor/three.min.js', (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('#errScr')).toBeVisible();
  await expect(page.locator('#errTitle')).toHaveText('Spel kon niet laden');
  await expect(page.locator('#startScr')).toBeHidden();
  await expect(page.locator('#errReport')).toHaveAttribute('href', /browser=/);
});

test('script draait volledig; zonder WebGL volgt netjes het foutscherm @firefox', async ({ page }) => {
  // Headless Firefox heeft in CI geen WebGL. Deze test bewijst dan dat het hele script in Gecko
  // zonder syntax- of runtimefouten draait tot aan de renderer, en dat de speler een nette uitleg krijgt.
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => !document.getElementById('btnStart').disabled
    || getComputedStyle(document.getElementById('errScr')).display !== 'none', null, { timeout: 20_000 });
  const fout = await page.evaluate(() => getComputedStyle(document.getElementById('errScr')).display !== 'none');
  if (fout) {
    await expect(page.locator('#errTitle')).toHaveText('3D wordt niet ondersteund');
    expect(errors.filter((m) => !/WebGL context/i.test(m))).toEqual([]);
  } else {
    expect(errors).toEqual([]);
  }
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

test('mobiel: knoppen zichtbaar, tikken start en pauzeert @kern', async ({ page }, info) => {
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

test('gepubliceerde map is compleet: elke lokale verwijzing bestaat', async ({ page, request }) => {
  await openGame(page);
  const refs = await page.evaluate(`[...document.querySelectorAll('[src],[href]')]
    .map((el) => el.getAttribute('src') || el.getAttribute('href'))`);
  const og = await page.getAttribute('meta[property="og:image"]', 'content');
  const base = 'https://rvd-gmpplus.github.io/voortvluchtig/';
  expect(og && og.startsWith(base)).toBe(true);
  const local = refs.filter((r) => r && !/^(https?:|data:|#|mailto:)/.test(r));
  local.push(String(og).slice(base.length));
  if (process.env.SITE_DIR) local.push('versie.txt');
  for (const path of local) {
    const res = await request.get('/' + path.replace(/^\.?\//, ''));
    expect(res.status(), path).toBe(200);
  }
});
