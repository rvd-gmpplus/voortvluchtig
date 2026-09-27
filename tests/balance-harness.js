// Balansmeting voor VOORTVLUCHTIG, gedeeld door tests/balance.spec.js en tools/balance-report.mjs.
//
// seedScript() komt via page.addInitScript in de pagina, vóór Three.js en het spel. Het maakt
// Math.random voorspelbaar met twee aparte stromen: één voor Three.js (uuid's) en één voor het spel
// zelf. Zo levert dezelfde seed dezelfde kaart op, ook als een versie meer of minder Three-objecten
// aanmaakt. harnessScript() speelt daarna hele potjes versneld na met een eenvoudige bot.

function seedScript(seed) {
  const mulberry = (s) => () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let game = mulberry(seed);
  const three = mulberry(seed ^ 0x9e3779b9);
  Math.random = function () {
    const stack = new Error().stack || '';
    return stack.includes('three.min.js') ? three() : game();
  };
  window.__reseed = (s) => { game = mulberry(s); };
}

function harnessScript() {
  const hx = (h) => (h.mode === 'drive' ? h.x : h.fx);
  const hz = (h) => (h.mode === 'drive' ? h.z : h.fz);

  // 'stil': blijft op het droppunt staan (meet hoe snel de jagers je vinden).
  // 'vlucht': vlucht van de dichtstbijzijnde jager (sprint onder 35 m), verstopt zich anders in een struik.
  function bot(kind) {
    joy.active = true; joy.x = 0; joy.y = 0; sprintHold = false;
    if (kind === 'stil') return;
    let nd = 1e9, nx = 0, nz = 0;
    for (const h of hunters) {
      const d = Math.hypot(hx(h) - player.x, hz(h) - player.z);
      if (d < nd) { nd = d; nx = hx(h); nz = hz(h); }
    }
    if (nd < 70) {
      let dx = player.x - nx, dz = player.z - nz;
      const edge = (CFG.worldEdge || 470) - 15;
      if (Math.abs(player.x) > edge && Math.sign(dx) === Math.sign(player.x)) dx = 0;
      if (Math.abs(player.z) > edge && Math.sign(dz) === Math.sign(player.z)) dz = 0;
      const l = Math.hypot(dx, dz) || 1;
      joy.x = dx / l; joy.y = -dz / l; sprintHold = nd < 35;
      if (player.crouch) toggleCrouch();
      return;
    }
    let bd = 1e9, bx = 0, bz = 0;
    for (const b of bushes) {
      const d = Math.hypot(b.x - player.x, b.z - player.z);
      if (d < bd) { bd = d; bx = b.x; bz = b.z; }
    }
    if (bd > 1.2 && bd < 80) {
      joy.x = (bx - player.x) / bd; joy.y = -(bz - player.z) / bd;
      if (player.crouch) toggleCrouch();
    } else if (bd <= 1.2 && !player.crouch) toggleCrouch();
  }

  // Eén spelstap. Nieuwe versie: stepGame. Oude versie (ter vergelijking): dezelfde logica als animate().
  function step(dt) {
    if (typeof stepGame === 'function') return stepGame(dt);
    tNow += dt; timeLeft -= dt;
    if (timeLeft <= 0) { endGame(true); return; }
    nextPing -= dt;
    if (nextPing <= 0) { nextPing = CFG.pingInterval; pings++; intel.x = player.x; intel.z = player.z; intel.t = tNow; }
    playerStep(dt);
    for (const h of hunters) {
      senseStep(h);
      if (state !== 'play') break;
      if (h.mode === 'drive') driveStep(h, dt); else if (h.mode === 'foot') footStep(h, dt); else returnStep(h, dt);
      if (state !== 'play') break;
    }
  }

  function setPlay(s) { if (typeof setState === 'function') setState(s); else state = s; }

  function run(kind, reseed, level = 'normaal', dt = 1 / 30) {
    if (window.__reseed) window.__reseed(reseed);
    if (typeof applyDifficulty === 'function') applyDifficulty(level);
    reset(); camYaw = 0;
    setPlay('play');
    const max = Math.ceil(CFG.surviveTime / dt) + 5;
    let n = 0;
    while (state === 'play' && n < max) { bot(kind); step(dt); n++; }
    const won = timeLeft <= 0;
    const t = Math.min(tNow, CFG.surviveTime);
    setPlay('menu');
    document.getElementById('endScr').style.display = 'none';
    joy.active = false; joy.x = 0; joy.y = 0; sprintHold = false;
    return { won, t: Math.round(t * 10) / 10 };
  }

  window.__balans = { run };
}

module.exports = { seedScript, harnessScript };
