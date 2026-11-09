(() => {
'use strict';

const W = 941, H = 1672, HOR = 385, VP = 470, K = 5;
const MODE_TIME = 10, OFFER_TIME = 4;
const cv = document.getElementById('c');
const g = cv.getContext('2d');
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = a => a[Math.floor(Math.random() * a.length)];

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
function rr(x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

const IMG = {};
const IMG_SRC = {
  kosan: 'assets/img/kosan.png',
  duran: 'assets/img/duran.png',
  poci: 'assets/img/poci.png',
  yakalanmis: 'assets/img/yakalanmis.png',
  exam: 'assets/img/sigma_jane.webp',
  ders: 'assets/img/sewete_abla.jpg',
  sinif: 'assets/img/sinif.jpg',
  seyit: 'assets/img/seyit.png'
};
for (const k in IMG_SRC) {
  const im = new Image();
  im.src = IMG_SRC[k];
  IMG[k] = im;
}

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('sixb_' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('sixb_' + k, JSON.stringify(v)); } catch (e) {}
  }
};
let soundOn = store.get('sound', true);
SFX.setEnabled(soundOn);
let scoreBest = (store.get('scores', [])[0] || {}).d || 0;

const MODE_LABEL = { board: 'AKILLI TAHTA', phone: 'TELEFON', pc: 'BİLGİSAYAR' };
const MODE_HINT = {
  board: 'EKRANDAKİ TUŞLARLA OYNA',
  phone: 'KAYDIR VEYA DOKUN',
  pc: '← → ŞERİT · BOŞLUK ZIPLA'
};
let playMode = store.get('mode', 'phone');

function applyMode(m) {
  if (!MODE_LABEL[m]) m = 'phone';
  playMode = m;
  document.body.classList.remove('mode-board', 'mode-phone', 'mode-pc');
  document.body.classList.add('mode-' + m);
  for (const el of document.querySelectorAll('.mode-btn')) el.classList.toggle('sel', el.dataset.mode === m);
  $('playHint').textContent = MODE_HINT[m];
  $('modeChip').textContent = 'MOD: ' + MODE_LABEL[m];
  store.set('mode', m);
}

const proj = d => {
  const s = K / (Math.max(d, -4.6) + K);
  const y = HOR + 1175 * s;
  const h = 47 + 470 * s;
  return { s, y, h, sc: h / 517 };
};
const laneX = (lane, p) => VP + lane * (2 / 3) * p.h;

const TYPES = {
  koni: { h: 150, low: true, prop: 'koni' },
  bariyer: { h: 175, low: true, prop: 'bariyer' },
  kitap: { h: 140, low: true, prop: 'kitap' },
  sise: { h: 165, low: true, prop: 'sise' },
  pano: { h: 340, prop: 'pano' },
  cop: { h: 300, prop: 'cop' },
  dolap: { h: 400, prop: 'dolap' },
  seyit: { h: 420, prop: 'seyit', seyit: true },
  coin: { h: 120, coin: true },
  turbo: { h: 210, pw: 'turbo', avatar: 'ders' },
  exam: { h: 220, pw: 'exam', avatar: 'exam' },
  fly: { h: 200, pw: 'fly', avatar: 'poci' }
};

let st = 'menu';
let objs = [], particles = [];
let lane = 0, px = 0, jumpT = -1, speed = 15.5, dist = 0, coins = 0, spawnAt = 18;
let run = 0, scroll = 0, menuScroll = 0, t = 0;
let pw = null, pwT = 0, flyH = 0, dashLeft = 0, tilt = 0, inv = 0;
let mode = null, modeNext = 100, modeStars = 0, modeStarsTotal = 0;
let seyitNext = 380;
let beat = null, beatOver = false;
let chase = null, offer = null, contN = 0, bestPrev = 0, recDone = false;
let flash = 0, shake = 0, hitBy = null, caughtT = 0, overT = 0;
let modeMusic = null, pwLoop = null, deathSnd = null, lastCoinSfx = 0;

/* ---------- UI ---------- */
function setScreen(name) {
  $('modes').classList.toggle('on', name === 'modes');
  $('menu').classList.toggle('on', name === 'menu');
  $('over').classList.toggle('on', name === 'over');
}
function toggleHud(on) { $('hud').classList.toggle('on', on); }
function openModal(html) { $('mp').innerHTML = html; $('mp').dataset.mode = ''; $('modal').classList.add('on'); }
function closeModal() { $('modal').classList.remove('on'); }
function updateBest() { $('best').textContent = 'REKOR: ' + scoreBest + ' m · 6/B STUDIOS'; }

function flashMessage(txt) {
  const el = $('flashMsg');
  el.textContent = txt;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
function showToast(id) {
  const el = $(id);
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), id === 'rk' ? 3000 : 2200);
}
function notifyCoin() {
  const now = performance.now();
  if (now - lastCoinSfx > 55) {
    lastCoinSfx = now;
    SFX.effect('coin');
  }
}

/* ---------- run flow ---------- */
function resetRun() {
  objs = []; particles = [];
  lane = 0; px = 0; jumpT = -1; speed = 15.5; dist = 0; coins = 0; spawnAt = 18;
  run = 0; scroll = 0; pw = null; pwT = 0; flyH = 0; dashLeft = 0; tilt = 0; inv = 0;
  mode = null; modeStars = 0; modeStarsTotal = 0; modeNext = 100;
  chase = null; offer = null; contN = 0; recDone = false;
  flash = 0; shake = 0; hitBy = null; caughtT = 0; overT = 0;
  beat = null; beatOver = false;
  seyitNext = 60 + Math.random() * 80;
  bestPrev = scoreBest;
  $('offer').classList.remove('on');
  $('modeBanner').classList.remove('on');
  $('modeEnd').classList.remove('on');
  $('rk').classList.remove('on');
  $('flashMsg').classList.remove('on');
  $('pw').hidden = true;
  $('pw').style.display = 'none';
  $('dist').textContent = '0 m';
  $('cn').textContent = '0';
  $('coinLabel').textContent = '6/B';
}

function startRun() {
  stopGameAudio();
  SFX.stopAll();
  resetRun();
  st = 'play';
  setScreen(null);
  toggleHud(true);
  chase = { t: 0 };
  updateHud();
}

function stopGameAudio() {
  if (modeMusic) { modeMusic.stop(0); modeMusic = null; }
  if (pwLoop) { pwLoop.stop(0); pwLoop = null; }
}

function goMenu() {
  stopGameAudio();
  st = 'menu';
  caughtT = 0; chase = null; hitBy = null; offer = null;
  beat = null; beatOver = false;
  hideOffer();
  objs = [];
  $('modeBanner').classList.remove('on');
  $('modeEnd').classList.remove('on');
  setScreen('menu');
  toggleHud(false);
  updateBest();
}

function giveUp() {
  hideOffer();
  stopGameAudio();
  SFX.stopAll();
  goMenu();
  SFX.play('dikidis', { volume: 0.9 });
}

function togglePause() {
  if (st !== 'play') return;
  st = 'pause';
  openModal('<h2>DURAKLATILDI</h2><button class="b b1" id="res">DEVAM</button><button class="b b2" id="qhome">ANA MENÜ</button>');
  $('res').onclick = () => { closeModal(); st = 'play'; };
  $('qhome').onclick = () => { closeModal(); goMenu(); };
}

/* ---------- spawn ---------- */
function spawnRow(d) {
  if (!mode && run >= seyitNext) {
    seyitNext = run + 120 + Math.random() * 120;
    objs.push({ ty: 'seyit', lane: rnd([-1, 0, 1]), d });
    return;
  }
  const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const hard = Math.min(1, run / 2700);
  const nObs = Math.random() < 0.32 + hard * 0.4 ? 2 : 1;
  for (let i = 0; i < nObs; i++) {
    const r = Math.random();
    let ty;
    if (r < 0.32) ty = rnd(['koni', 'bariyer', 'kitap', 'sise']);
    else if (r < 0.62) ty = rnd(['pano', 'cop']);
    else ty = 'dolap';
    objs.push({ ty, lane: lanes[i], d });
  }
  const free = lanes[nObs];
  if (!mode && Math.random() < 0.1) {
    objs.push({ ty: rnd(['turbo', 'exam', 'fly']), lane: free, d: d + 1 });
  } else {
    for (let k = 0; k < 4; k++) objs.push({ ty: 'coin', lane: free, d: d + k * 1.4 });
  }
}

/* ---------- powers ---------- */
function setPower(kind, dur) {
  pw = kind;
  pwT = dur;
  if (pwLoop) { pwLoop.stop(120); pwLoop = null; }
  if (kind === 'turbo') pwLoop = SFX.loop('ders', { volume: 0.85 });
  else if (kind === 'exam') pwLoop = SFX.loop('jole', { volume: 0.85 });
  else if (kind === 'fly') { pwLoop = SFX.loop('alo', { volume: 0.8 }); SFX.effect('whoosh'); }
  else SFX.effect('whoosh');
}
function endPower() {
  if (pwLoop) { pwLoop.stop(200); pwLoop = null; }
  clearNear(30, false);
  pw = null;
  pwT = 0;
  updateHud();
}

function pick(o) {
  o.dead = 1;
  if (o.ty === 'turbo') {
    setPower('turbo', 4);
    flashMessage('DERS BOŞ!');
  } else if (o.ty === 'exam') {
    setPower('exam', 1.5);
    dashLeft = 99;
    for (const L of [-1, 0, 1]) {
      for (let d = 4; d < 46; d += 4.2) {
        objs.push({ ty: 'coin', lane: L, d: d + (L + 1) * 0.5 });
      }
    }
    flashMessage('KONUŞMA SINAVI!');
    shake = 0.6;
  } else {
    setPower('fly', 5);
    flashMessage('POÇİ KAÇIŞI!');
  }
  SFX.effect('pickup');
  flash = Math.max(flash, 0.4);
}

function startMode() {
  mode = { t: 0 };
  modeStars = 0;
  modeNext += 100;
  modeMusic = SFX.loop('mode', { volume: 0.9 });
  $('modeBanner').classList.add('on');
  $('cn').textContent = '0';
  $('coinLabel').textContent = 'SENTA';
  flash = Math.max(flash, 0.6);
  SFX.effect('mode');
}

function endMode() {
  if (!mode) return;
  if (modeMusic) { modeMusic.stop(400); modeMusic = null; }
  modeStarsTotal += modeStars;
  clearNear(42);
  mode = null;
  modeNext = coins + 100;
  seyitNext = Math.max(seyitNext, run + 180);
  $('modeBanner').classList.remove('on');
  showToast('modeEnd');
  shake = 1.2;
  flash = Math.max(flash, 0.8);
  SFX.effect('win');
}

function collect(o) {
  if (o.dead) return;
  o.dead = 1;
  if (mode) {
    modeStars++;
  } else {
    coins++;
  }
  notifyCoin();
  const p = proj(Math.max(o.d, 0));
  spawnBurst(laneX(o.lf != null ? o.lf : o.lane, p), p.y - 80 * p.sc, 4, ['#ffd23f', '#fff6c0', '#ff9d00'], 260, 400);
}

/* ---------- crash / over ---------- */
function hit(o) {
  st = 'hit';
  caughtT = 0; overT = 0; hitBy = o; flash = 1; shake = 1; inv = 0;
  if (mode) {
    if (modeMusic) { modeMusic.stop(200); modeMusic = null; }
    modeStarsTotal += modeStars;
    modeStars = 0;
    mode = null;
    $('modeBanner').classList.remove('on');
  }
  endPower();
  deathSnd = SFX.play('dikidis', { volume: 0.85 });
  SFX.effect('crash');
  updateHud();
  setTimeout(() => {
    if (st === 'hit') offerShow();
  }, 450);
}

function offerShow() {
  if (st !== 'hit') return;
  const cost = contN ? 30 : 15;
  const have = coins + modeStarsTotal;
  if (contN >= 2 || have < cost) {
    finishOver();
    return;
  }
  offer = { t: OFFER_TIME, cost };
  $('offerCost').textContent = '★ ' + cost + ' · DEVAM ET';
  $('offerStars').textContent = 'SENTA: ' + have + ' · kaldığın yerden';
  $('offerBar').style.width = '100%';
  $('offer').classList.add('on');
}

function hideOffer() {
  offer = null;
  $('offer').classList.remove('on');
}

function continueRun() {
  if (st !== 'hit' || !offer) return;
  const have = coins + modeStarsTotal;
  if (have < offer.cost) return;
  const payCoins = Math.min(coins, offer.cost);
  coins -= payCoins;
  modeStarsTotal = Math.max(0, modeStarsTotal - (offer.cost - payCoins));
  if (deathSnd) {
    try { deathSnd.pause(); deathSnd.currentTime = 0; } catch (e) {}
    deathSnd = null;
  }
  contN++;
  hideOffer();
  clearNear(42);
  seyitNext = Math.max(seyitNext, run + 320);
  hitBy = null;
  inv = 2.2;
  flash = 0.6;
  shake = 0;
  caughtT = 0;
  overT = 0;
  st = 'play';
  updateHud();
  SFX.effect('resume');
}

function finishOver() {
  if (st === 'over') return;
  hideOffer();
  st = 'over';
  caughtT = 1;
  toggleHud(false);
  const ttl = $('overTitle');
  ttl.textContent = beatOver ? "SEYİT'İN DAYAĞI!" : 'YAKALANDIN!';
  ttl.classList.toggle('beat', beatOver);
  setScreen('over');
  const d = Math.floor(dist);
  $('od').textContent = d + ' m';
  $('oc').textContent = coins + (modeStarsTotal ? ' · ★' + modeStarsTotal : '');
  const L = store.get('scores', []);
  L.push({ d, c: coins, k: Date.now() });
  L.sort((a, b) => b.d - a.d);
  const top = L.slice(0, 10);
  store.set('scores', top);
  scoreBest = top[0].d;
  updateBest();
  if (!beatOver) SFX.effect('lose');
  globalAfterRun(d, coins);
}

/* ---------- update ---------- */
function move(dx) {
  if (st !== 'play') return;
  const nl = clamp(lane + dx, -1, 1);
  if (nl !== lane) {
    lane = nl;
    tilt = dx * 0.18;
    if (!mode && !pw) SFX.play('lane', { volume: 0.65 });
  }
}
function jump() {
  if (st !== 'play') return;
  if (pw === 'fly') return;
  if (jumpT >= 0) return;
  jumpT = 0;
  SFX.effect('jump');
}

function updatePlay(dt) {
  const sp = speed * (pw === 'turbo' ? 1.7 : 1);
  dist += sp * dt * (mode ? 2 : 1);
  run += sp * dt;
  speed = 15.5 + 15.5 * (1 - Math.exp(-run / 1500));
  scroll += sp * dt;
  px += (lane - px) * Math.min(1, dt * 14);
  tilt *= Math.pow(0.02, dt);
  if (jumpT >= 0) {
    jumpT += dt / 0.72;
    if (jumpT >= 1) jumpT = -1;
  }
  if (inv > 0) inv -= dt;
  if (pw) {
    pwT -= dt;
    if (pwT <= 0) endPower();
  }
  const flyTarget = pw === 'fly' ? 1 : 0;
  flyH += (flyTarget - flyH) * Math.min(1, dt * 7);

  for (const o of objs) o.d -= sp * dt;

  if (dashLeft > 0) dashStep(dt);

  spawnAt -= sp * dt;
  if (spawnAt <= 40) {
    spawnRow(46);
    spawnAt = 46 + Math.max(7.5, 13.5 - run / 480);
  }

  if (mode) {
    mode.t += dt;
    $('modeClock').textContent = Math.max(1, Math.ceil(MODE_TIME - mode.t)) + ' SANİYE';
    if (mode.t >= MODE_TIME) endMode();
  } else if (!mode && coins >= modeNext && pw !== 'exam') {
    startMode();
  }

  collide(dt);

  objs = objs.filter(o => !o.dead && o.d > -1.1);

  if (!recDone && bestPrev > 0 && dist > bestPrev) {
    recDone = true;
    showToast('rk');
    SFX.effect('win');
  }

  updateHud();
}

function dashStep(dt) {
  const ex = Math.min(dashLeft, (99 / 1.5) * dt * 1.05);
  dashLeft -= ex;
  dist += ex;
  scroll += ex;
  spawnAt -= ex;
  for (const o of objs) o.d -= ex;
  for (const o of objs) {
    const T = TYPES[o.ty];
    if (o.dead || o.d > 1.5 || o.d < -1) continue;
    if (T.coin) { collect(o); continue; }
    if (T.pw) continue;
    o.dead = 1;
    shake = Math.max(shake, 0.45);
    const p = proj(Math.max(o.d, 0));
    spawnBurst(laneX(o.lane, p), p.y - 80 * p.sc, 10, ['#ffd23f', '#ffffff', '#ff9d00', '#1b3fa0'], 720, 1400);
    SFX.effect('smash');
  }
}

function collide(dt) {
  const cl = Math.round(px);
  const jh = jumpT >= 0 ? Math.sin(Math.PI * jumpT) : 0;
  const magnet = mode || pw === 'fly' || pw === 'exam';
  if (magnet) {
    for (const o of objs) {
      const T = TYPES[o.ty];
      if (!T.coin || o.dead || o.d > 14) continue;
      if (o.lf == null) o.lf = o.lane;
      o.lf += (px - o.lf) * Math.min(1, dt * 9);
      if (o.d < 1.2 && Math.abs(o.lf - px) < 0.6) collect(o);
    }
  }
  for (const o of objs) {
    if (o.dead || o.lane !== cl || o.d > 0.6 || o.d < -0.2) continue;
    const T = TYPES[o.ty];
    if (T.coin) { collect(o); continue; }
    if (T.pw) { pick(o); continue; }
    if (T.seyit) {
      if (mode || pw) {
        o.dead = 1;
        SFX.effect('smash');
        continue;
      }
      if (inv > 0 || pw === 'fly' || flyH > 0.3) continue;
      startBeat(o);
      return;
    }
    if (T.low && jh > 0.35) continue;
    if (inv > 0) continue;
    if (pw === 'fly' || flyH > 0.3) continue;
    if (pw) {
      o.dead = 1;
      flash = Math.max(flash, 0.3);
      SFX.effect('smash');
      continue;
    }
    hit(o);
    break;
  }
}

function updateHit(dt) {
  caughtT = Math.min(1, caughtT + dt * 2.4);
  overT += dt;
  if (offer) {
    offer.t -= dt;
    $('offerBar').style.width = Math.max(0, (offer.t / OFFER_TIME) * 100) + '%';
    if (offer.t <= 0) {
      hideOffer();
      finishOver();
    }
  }
}

function updateHud() {
  $('dist').textContent = Math.floor(dist) + ' m';
  $('cn').textContent = mode ? modeStars : coins + modeStarsTotal;
  $('coinLabel').textContent = mode ? 'SENTA' : '6/B';
  const pe = $('pw');
  if (pw) {
    pe.hidden = false;
    pe.style.display = 'flex';
    pe.textContent = (pw === 'turbo' ? 'DERS BOŞ ' : pw === 'exam' ? 'KONUŞMA SINAVI ' : 'POÇİ KAÇIŞI ') + Math.ceil(pwT) + 's';
  } else {
    pe.hidden = true;
    pe.style.display = 'none';
  }
}

/* ---------- drawing helpers ---------- */
function shadow(x, y, w, alpha = 0.3) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,' + alpha + ')';
  g.beginPath();
  g.ellipse(x, y, w / 2, w / 8, 0, 0, 7);
  g.fill();
  g.restore();
}
function drawSprite(name, x, feetY, h, alpha = 1, rot = 0, flip = 1) {
  const im = IMG[name];
  if (!im || !im.complete || !im.naturalWidth) return;
  const w = h * im.width / im.height;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, feetY);
  g.rotate(rot);
  g.scale(flip, 1);
  g.drawImage(im, -w / 2, -h, w, h);
  g.restore();
}
function drawStar(x, y, r, spin) {
  g.save();
  g.translate(x, y);
  g.rotate(spin);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 ? r * 0.45 : r;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
  g.fillStyle = '#ffd23f';
  g.shadowColor = '#ffd23f';
  g.shadowBlur = r;
  g.fill();
  g.restore();
}
function spawnBurst(x, y, n, colors, speed, gv) {
  for (let i = 0; i < n; i++) {
    const a = -Math.random() * Math.PI;
    const v = speed * (0.3 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.6 + Math.random() * 0.5,
      col: rnd(colors),
      sz: 6 + Math.random() * 14,
      g: gv
    });
  }
}
function clearNear(limit, fx = true) {
  for (const o of objs) {
    const T = TYPES[o.ty];
    if (T.coin || T.pw || o.dead || o.d > limit || o.d < -1) continue;
    o.dead = 1;
    if (!fx) continue;
    const p = proj(Math.max(o.d, 0));
    spawnBurst(laneX(o.lf != null ? o.lf : o.lane, p), p.y - 60 * p.sc, 8, ['#9aa3b5', '#6b7385', '#c9ced8'], 420, 900);
  }
}
function drawParticles(dt) {  for (const q of particles) {
    q.life -= dt;
    q.vy += q.g * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
  }
  particles = particles.filter(q => q.life > 0);
  for (const q of particles) {
    g.globalAlpha = Math.min(1, q.life * 2);
    g.fillStyle = q.col;
    g.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
  }
  g.globalAlpha = 1;
}

/* ---------- world ---------- */
function drawWorld() {
  const off = st === 'menu' ? menuScroll : scroll;

  const im = IMG.sinif;
  if (im && im.complete && im.naturalWidth) {
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const iw = im.naturalWidth * s, ih = im.naturalHeight * s;
    g.drawImage(im, (W - iw) / 2, (H - ih) / 2, iw, ih);
  } else {
    g.fillStyle = '#1a2134';
    g.fillRect(0, 0, W, H);
  }

  const shade = g.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(4,7,15,.66)');
  shade.addColorStop(0.24, 'rgba(5,9,18,.26)');
  shade.addColorStop(0.55, 'rgba(5,9,18,.22)');
  shade.addColorStop(1, 'rgba(3,6,12,.6)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);

  const vig = g.createRadialGradient(W / 2, H * 0.2, H * 0.06, W / 2, H * 0.5, H * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,5,10,.48)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);

  const botH = 47 + 470 * ((H - HOR) / 1175);
  const topHalf = (2 / 3) * 47, botHalf = (2 / 3) * botH;

  const ground = g.createLinearGradient(0, HOR, 0, H);
  ground.addColorStop(0, 'rgba(10,14,26,0)');
  ground.addColorStop(0.35, 'rgba(8,12,22,.18)');
  ground.addColorStop(1, 'rgba(5,8,16,.5)');
  g.fillStyle = ground;
  g.fillRect(0, HOR, W, H - HOR);

  g.beginPath();
  g.moveTo(VP - topHalf, HOR);
  g.lineTo(VP + topHalf, HOR);
  g.lineTo(VP + botHalf, H);
  g.lineTo(VP - botHalf, H);
  g.closePath();
  const road = g.createLinearGradient(0, HOR, 0, H);
  road.addColorStop(0, 'rgba(46,52,70,.5)');
  road.addColorStop(0.25, 'rgba(35,41,58,.8)');
  road.addColorStop(1, 'rgba(20,25,38,.94)');
  g.fillStyle = road;
  g.fill();

  g.strokeStyle = '#8b93a8';
  g.lineWidth = 9;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(VP + side * topHalf, HOR);
    g.lineTo(VP + side * botHalf, H);
    g.stroke();
  }

  g.fillStyle = 'rgba(255,255,255,.5)';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 34; k++) {
      const d0 = k * 2.4 - (off % 2.4);
      const d1 = d0 + 1.1;
      if (d0 < -4.5) continue;
      const a = proj(d0), b = proj(d1);
      if (a.y < HOR || b.y > H + 60) continue;
      const xa = VP + side * a.h / 3, xb = VP + side * b.h / 3;
      const wa = 2 + 6 * a.s, wb = 2 + 6 * b.s;
      g.beginPath();
      g.moveTo(xa - wa, a.y);
      g.lineTo(xa + wa, a.y);
      g.lineTo(xb + wb, b.y);
      g.lineTo(xb - wb, b.y);
      g.closePath();
      g.fill();
    }
  }
}
/* ---------- props ---------- */
function drawProp(kind, x, feetY, h, alpha) {
  if (h < 4) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, feetY);

  if (kind === 'koni') {
    const w = h * 0.62;
    g.fillStyle = '#2b2f3d';
    rr(-w * 0.45, -h * 0.09, w * 0.9, h * 0.09, h * 0.02);
    g.fill();
    g.beginPath();
    g.moveTo(-w * 0.34, -h * 0.06);
    g.lineTo(w * 0.34, -h * 0.06);
    g.lineTo(w * 0.1, -h * 0.86);
    g.lineTo(-w * 0.1, -h * 0.86);
    g.closePath();
    g.fillStyle = '#ff7a1a';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#f4f1e8';
    g.fillRect(-w, -h * 0.56, w * 2, h * 0.14);
    g.restore();
  } else if (kind === 'bariyer') {
    const bw = h * 1.35, bh = h * 0.3;
    g.fillStyle = '#3a3f4e';
    g.fillRect(-bw * 0.42, -h * 0.52, bw * 0.08, h * 0.52);
    g.fillRect(bw * 0.34, -h * 0.52, bw * 0.08, h * 0.52);
    rr(-bw / 2, -h * 0.86, bw, bh, h * 0.03);
    g.fillStyle = '#c92b2b';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#f4f1e8';
    for (let i = -3; i < 8; i++) {
      g.save();
      g.translate(-bw / 2 + i * bw / 5, -h * 0.86);
      g.rotate(0.5);
      g.fillRect(0, -bh, bw / 10, bh * 3);
      g.restore();
    }
    g.restore();
    g.fillStyle = '#2a0b0b';
    rr(-bw * 0.2, -h * 0.82, bw * 0.4, bh * 0.62, h * 0.02);
    g.fill();
    g.fillStyle = '#fff';
    g.font = '900 ' + Math.max(6, h * 0.13) + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('POÇİ', 0, -h * 0.76);
  } else if (kind === 'kitap') {
    const bw = h * 0.9, bh = h * 0.22;
    const cols = ['#2b6cb0', '#c53030', '#2f855a'];
    for (let i = 0; i < 3; i++) {
      const y = -h * 0.06 - i * bh * 0.92;
      rr(-bw / 2 + (i % 2) * bw * 0.06, y - bh, bw * 0.92, bh, h * 0.02);
      g.fillStyle = cols[i];
      g.fill();
      g.fillStyle = '#f4f1e8';
      g.fillRect(-bw / 2 + (i % 2) * bw * 0.06 + bw * 0.06, y - bh * 0.86, bw * 0.8, bh * 0.16);
    }
  } else if (kind === 'sise') {
    const w = h * 0.34;
    rr(-w / 2, -h * 0.74, w, h * 0.74, w * 0.22);
    g.fillStyle = 'rgba(90,180,255,.9)';
    g.fill();
    g.fillStyle = '#dfe9ff';
    g.fillRect(-w * 0.18, -h * 0.98, w * 0.36, h * 0.26);
    g.fillStyle = '#1b4a8a';
    rr(-w * 0.3, -h * 0.62, w * 0.6, h * 0.24, h * 0.02);
    g.fill();
    g.fillStyle = '#fff';
    g.font = '900 ' + Math.max(4, h * 0.1) + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('6/B', 0, -h * 0.5);
  } else if (kind === 'dolap') {
    const w = h * 0.44;
    const gr = g.createLinearGradient(-w / 2, -h, w / 2, 0);
    gr.addColorStop(0, '#5d6a86');
    gr.addColorStop(1, '#39435c');
    rr(-w / 2, -h, w, h * 0.97, w * 0.06);
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = '#1c2333';
    g.lineWidth = Math.max(2, h * 0.012);
    rr(-w / 2, -h, w, h * 0.97, w * 0.06);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -h * 0.97);
    g.lineTo(0, -h * 0.02);
    g.stroke();
    g.fillStyle = '#1e2638';
    for (let i = 0; i < 3; i++) {
      g.fillRect(-w * 0.36, -h * 0.9 + i * h * 0.035, w * 0.26, h * 0.014);
      g.fillRect(w * 0.1, -h * 0.9 + i * h * 0.035, w * 0.26, h * 0.014);
    }
    g.fillStyle = '#e9edf7';
    g.fillRect(-w * 0.08, -h * 0.5, w * 0.16, h * 0.1);
    g.fillStyle = '#2b3448';
    g.font = '900 ' + Math.max(4, h * 0.055) + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('6/B', 0, -h * 0.45);
  } else if (kind === 'pano') {
    const w = h * 0.72;
    g.fillStyle = '#3a3f4e';
    g.fillRect(-w * 0.38, -h * 0.5, w * 0.08, h * 0.5);
    g.fillRect(w * 0.3, -h * 0.5, w * 0.08, h * 0.5);
    rr(-w / 2, -h, w, h * 0.58, h * 0.03);
    g.fillStyle = '#8a5a2b';
    g.fill();
    g.strokeStyle = '#4a2d12';
    g.lineWidth = Math.max(2, h * 0.014);
    rr(-w / 2, -h, w, h * 0.58, h * 0.03);
    g.stroke();
    const papers = [[-0.3, -0.84, 0.2, 0.2], [0.06, -0.78, 0.18, 0.24], [-0.16, -0.6, 0.22, 0.2], [0.16, -0.58, 0.14, 0.16]];
    for (let i = 0; i < papers.length; i++) {
      const p = papers[i];
      g.fillStyle = i % 2 ? '#fff8e0' : '#e8f0ff';
      g.fillRect(w * p[0], h * p[1], w * p[2], h * p[3]);
    }
    g.fillStyle = '#ffd23f';
    g.font = '900 ' + Math.max(5, h * 0.09) + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('6/B', 0, -h * 0.66);
  } else if (kind === 'cop') {
    const w = h * 0.46;
    g.fillStyle = '#2b6b4a';
    g.beginPath();
    g.moveTo(-w * 0.42, -h * 0.78);
    g.lineTo(w * 0.42, -h * 0.78);
    g.lineTo(w * 0.34, 0);
    g.lineTo(-w * 0.34, 0);
    g.closePath();
    g.fill();
    g.fillStyle = '#1f5238';
    rr(-w * 0.5, -h * 0.9, w, h * 0.14, h * 0.02);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    for (let i = 0; i < 3; i++) g.fillRect(-w * 0.26, -h * 0.66 + i * h * 0.16, w * 0.52, h * 0.03);
    g.fillStyle = '#e9f7ef';
    g.font = '900 ' + Math.max(4, h * 0.1) + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('6/B', 0, -h * 0.34);
  }
  g.restore();
}

function drawCoin(x, y, r, alpha, phase) {
  if (r < 1) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  const spin = Math.abs(Math.cos(t * 3.2 + phase));
  g.scale(Math.max(0.22, spin), 1);
  g.shadowColor = '#ffd23f';
  g.shadowBlur = r * 0.7;
  const gr = g.createRadialGradient(-r * 0.22, -r * 0.25, r * 0.1, 0, 0, r);
  gr.addColorStop(0, '#fff8cf');
  gr.addColorStop(0.5, '#ffd23f');
  gr.addColorStop(1, '#d68a00');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, r, 0, 7);
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = Math.max(1.2, r * 0.1);
  g.strokeStyle = '#8a4b00';
  g.stroke();
  g.fillStyle = '#6a3c00';
  g.font = '900 ' + Math.max(3, r * 0.5) + 'px "Arial Black",system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('6/B', 0, r * 0.04);
  g.restore();
}

function drawPowerup(imgName, x, y, r, alpha) {
  if (r < 2) return;
  const im = IMG[imgName];
  g.save();
  g.globalAlpha = alpha;
  g.shadowColor = imgName === 'ders' ? '#ff6b8a' : imgName === 'exam' ? '#ffd23f' : '#6f94ff';
  g.shadowBlur = r * 0.9;
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fillStyle = '#0a1026';
  g.fill();
  g.shadowBlur = 0;
  if (im && im.complete && im.naturalWidth) {
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.clip();
    const s = Math.max((2 * r) / im.width, (2 * r) / im.height);
    const dw = im.width * s, dh = im.height * s;
    g.drawImage(im, x - dw / 2, y - dh / 2, dw, dh);
    g.restore();
  }
  g.lineWidth = Math.max(2, r * 0.12);
  g.strokeStyle = imgName === 'ders' ? '#ff8aa6' : imgName === 'exam' ? '#ffd23f' : '#8fb0ff';
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.6)';
  g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath();
  g.arc(x, y, r * 1.18, t * 3, t * 3 + 4.2);
  g.stroke();
  g.restore();
}

function drawWall(T, p, x, alpha) {
  const lw = (2 / 3) * p.h * 0.86;
  const bh = T.low ? lw * 0.42 : lw * 1.05;
  const y = p.y;
  g.save();
  g.globalAlpha = alpha;
  const gr = g.createLinearGradient(0, y - bh, 0, y);
  gr.addColorStop(0, '#c9cdd8');
  gr.addColorStop(1, '#7c8494');
  g.fillStyle = gr;
  g.strokeStyle = '#232838';
  g.lineWidth = Math.max(2, 6 * p.sc);
  rr(x - lw / 2, y - bh, lw, bh, Math.max(3, 12 * p.sc));
  g.fill();
  g.stroke();
  const fs = Math.min(bh * 0.52, lw * 0.3);
  if (fs > 6) {
    g.fillStyle = '#1a2030';
    g.font = '900 ' + fs + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(T.low ? 'SENTA' : 'POÇİ', x, y - bh / 2 + fs * 0.04);
  }
  g.restore();
}

function drawObj(o) {
  if (o.d < -1) return;
  const p = proj(o.d);
  if (p.y < HOR - 5) return;
  const T = TYPES[o.ty];
  const x = laneX(o.lf != null ? o.lf : o.lane, p);
  const far = Math.min(1, (p.y - HOR) / 60) * (o.d < 0 ? Math.max(0, 1 + o.d) : 1);

  if (T.seyit) {
    shadow(x, p.y, T.h * p.sc * 0.8);
    const hy = p.y - T.h * p.sc * 0.5;
    g.save();
    g.globalAlpha = far;
    const glow = g.createRadialGradient(x, hy, 4, x, hy, T.h * p.sc * 0.85);
    glow.addColorStop(0, 'rgba(220,30,30,' + (0.3 + 0.12 * Math.sin(t * 5 + o.d)) + ')');
    glow.addColorStop(1, 'rgba(220,30,30,0)');
    g.fillStyle = glow;
    g.fillRect(x - T.h * p.sc, p.y - T.h * p.sc * 1.35, T.h * p.sc * 2, T.h * p.sc * 1.45);
    g.restore();
    drawSprite('seyit', x, p.y, T.h * p.sc, far);
    return;
  }

  if (mode && !T.coin && !T.pw) {
    shadow(x, p.y, (2 / 3) * p.h * 0.9);
    drawWall(T, p, x, far);
    return;
  }
  if (T.coin) {
    const cy = p.y - (74 + 14 * Math.sin(t * 6 + o.d)) * p.sc;
    if (mode) {
      g.save();
      g.globalAlpha = far;
      drawStar(x, cy, T.h * 0.6 * p.sc, t * 4 + o.d);
      g.restore();
    } else {
      drawCoin(x, cy, T.h * 0.5 * p.sc, far, o.d);
    }
    return;
  }
  if (T.pw) {
    const r = T.h * 0.5 * p.sc;
    const y = p.y - (120 + 16 * Math.sin(t * 4 + o.d)) * p.sc - r;
    drawPowerup(T.avatar, x, y, r, far);
    return;
  }
  shadow(x, p.y, T.h * p.sc * 0.7);
  drawProp(T.prop, x, p.y, T.h * p.sc, far);
}

/* ---------- actors ---------- */
function drawChase(dt) {
  if (!chase) return;
  chase.t += dt;
  const im = IMG.poci;
  if (!im || !im.complete || !im.naturalWidth) return;
  if (chase.t < 2) {
    const k = chase.t / 2;
    const h = 360 + 240 * k;
    const x = VP + Math.sin(chase.t * 3) * 26;
    const y = 850 - 100 * k;
    drawSprite('poci', x, y, h, 0.96, Math.sin(chase.t * 2) * 0.03);
  } else if (chase.t < 2.7) {
    const k = (chase.t - 2) / 0.7;
    drawSprite('poci', VP - k * 180, 750 - k * 620, 600 * (1 - k * 0.45), 1 - k, -k * 0.25);
  } else {
    chase = null;
  }
}

function drawPlayer() {
  const p = proj(0);
  const jumpH = jumpT >= 0 ? Math.sin(Math.PI * jumpT) * 260 : 0;
  const fly = flyH * (300 + 18 * Math.sin(t * 5));
  const bob = (jumpT >= 0 || st === 'hit' || st === 'over') ? 0 : Math.abs(Math.sin(t * 12)) * 14;
  const fallen = st === 'hit' || st === 'over';
  let x = laneX(px, p);
  let y = p.y - fly - bob;
  let rot = tilt + Math.sin(t * 12) * 0.03;
  let spr = 'kosan';

  if (fallen) {
    const k = clamp(caughtT, 0, 1);
    spr = 'duran';
    rot = k * 1.42;
    x += k * 80;
    y = p.y + k * 16;
  } else {
    y -= jumpH;
  }

  const lift = Math.max(0, p.y - y);
  shadow(x, p.y, 220 * Math.max(0.4, 1 - lift / 700), 0.27);

  if (flyH > 0.05 && !fallen) {
    drawSprite('poci', x, y + 40, 300 * flyH, 0.9, 0);
  }

  g.save();
  if (mode) {
    g.shadowColor = '#ffd400';
    g.shadowBlur = 40 + 20 * Math.sin(t * 12);
  } else if (pw) {
    g.shadowColor = pw === 'turbo' ? '#ffe14a' : pw === 'fly' ? '#8fb0ff' : '#ffd23f';
    g.shadowBlur = 45 + 15 * Math.sin(t * 20);
  }
  drawSprite(spr, x, y, 380, inv > 0 ? (Math.sin(t * 30) > 0 ? 1 : 0.35) : 1, rot);
  g.restore();

  if (fallen) {
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + i * 2.1;
      drawStar(x + Math.cos(a) * 72, y - 110 + Math.sin(a) * 24, 14, a);
    }
  }

  if (pw === 'turbo' && !fallen) {
    g.save();
    g.globalAlpha = 0.32;
    g.fillStyle = '#fff3a0';
    for (let i = 0; i < 7; i++) {
      g.fillRect(x - 160 + Math.random() * 320, y - 340 + Math.random() * 300, 4, 40 + Math.random() * 60);
    }
    g.restore();
  }

  return { x, y };
}

function drawCaught() {
  const k = caughtT;
  const vg = g.createRadialGradient(W / 2, H * 0.5, H * 0.18, W / 2, H * 0.5, H * 0.8);
  vg.addColorStop(0, 'rgba(140,0,0,0)');
  vg.addColorStop(1, 'rgba(150,0,0,' + (0.5 * k) + ')');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  const im = IMG.yakalanmis;
  if (im && im.complete && im.naturalWidth) {
    const h = 1000;
    const w = h * im.width / im.height;
    const x = W * 0.68 + (1 - k) * W * 0.62;
    const y = H * 0.42 + Math.sin(t * 2) * 8;
    g.save();
    g.globalAlpha = Math.min(1, k * 1.4);
    g.translate(x, y);
    g.rotate(-0.05);
    g.drawImage(im, -w / 2, -h / 2, w, h);
    g.restore();
  }
}

function drawHitActor(pp) {
  if (!hitBy) return;
  const T = TYPES[hitBy.ty];
  if (T.coin || T.pw) return;
  const side = hitBy.lane >= 1 ? -1 : 1;
  const k = Math.min(1, caughtT * 4);
  const p = proj(0);
  drawProp(T.prop, pp.x + side * (160 + 90 * k), p.y - 20 - 30 * k, T.h * 0.9, 1);
}

/* ---------- seyit beatdown cutscene ---------- */
const BEAT_HITS = [0.95, 1.55, 2.15, 2.75, 3.35, 3.92];
const BEAT_END = 6.7;
const BEAT_GY = 1298;
const BEAT_IX = 505, BEAT_IY = 912;
const BEAT_WORDS = ['GÜM!', 'PAT!', 'ŞAK!', 'BAM!', 'ÇAT!', 'GÜMMM!'];

function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
function beatSmooth(a, b, x) {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}

function drawPosed(name, x, feetY, h, alpha, rot, sx = 1, sy = 1) {
  const im = IMG[name];
  if (!im || !im.complete || !im.naturalWidth) return;
  const w = h * im.width / im.height;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, feetY);
  g.rotate(rot);
  g.scale(sx, sy);
  g.drawImage(im, -w / 2, -h, w, h);
  g.restore();
}

function beatBurst(x, y, n, colors, pow) {
  if (!beat) return;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 3.1;
    const v = pow * (0.25 + Math.random());
    beat.parts.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.45 + Math.random() * 0.7,
      col: rnd(colors),
      sz: 4 + Math.random() * 13,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 10
    });
  }
}

function startBeat(o) {
  if (st !== 'play') return;
  if (o) o.dead = 1;
  st = 'beat';
  hitBy = null;
  inv = 0;
  offer = null;
  hideOffer();
  if (mode) {
    if (modeMusic) { modeMusic.stop(120); modeMusic = null; }
    modeStarsTotal += modeStars;
    modeStars = 0;
    mode = null;
    $('modeBanner').classList.remove('on');
  }
  if (pwLoop) { pwLoop.stop(120); pwLoop = null; }
  pw = null; pwT = 0; flyH = 0; dashLeft = 0;
  beat = {
    t: 0,
    punched: 0,
    swung: 0,
    freeze: 0,
    landed: false,
    parts: [],
    motes: []
  };
  for (let i = 0; i < 28; i++) {
    beat.motes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 3,
      v: 8 + Math.random() * 24,
      a: 0.05 + Math.random() * 0.14,
      ph: Math.random() * 6.28
    });
  }
  toggleHud(false);
  SFX.stopAll();
  deathSnd = SFX.play('dikidis', { volume: 0.85 });
  SFX.effect('seyit');
  flash = 1;
  shake = 1.4;
  updateHud();
}

function updateBeat(dt) {
  const b = beat;
  if (!b) return;
  if (b.freeze > 0) { b.freeze -= dt; return; }
  let sdt = dt;
  if (b.t > 3.94 && b.t < 4.9) sdt = dt * 0.55;
  b.t += sdt;

  for (const m of b.motes) {
    m.y -= m.v * sdt;
    m.x += Math.sin(b.t * 0.8 + m.ph) * 10 * sdt;
    if (m.y < -12) { m.y = H + 12; m.x = Math.random() * W; }
  }

  while (b.swung < BEAT_HITS.length && b.t >= BEAT_HITS[b.swung] - 0.27) {
    b.swung++;
    SFX.effect('swing');
  }
  while (b.punched < BEAT_HITS.length && b.t >= BEAT_HITS[b.punched]) {
    const i = b.punched++;
    SFX.effect('punch');
    if (i === BEAT_HITS.length - 1) {
      SFX.effect('crash');
      b.freeze = 0.1;
      flash = 1;
      shake = 1.9;
      beatBurst(BEAT_IX - 30, BEAT_IY + 40, 30, ['#ffffff', '#ffe9a0', '#ff5a3c', '#2b4bb0'], 980);
    } else {
      b.freeze = 0.055;
      flash = Math.max(flash, 0.62);
      shake = 1.15;
      beatBurst(BEAT_IX, BEAT_IY, 13, ['#fff6c0', '#ffffff', '#ff9d00', '#9fd4ff'], 540);
    }
  }

  if (!b.landed && b.t >= BEAT_HITS[5] + 0.87) {
    b.landed = true;
    shake = Math.max(shake, 0.95);
    beatBurst(556, BEAT_GY + 18, 34, ['#9aa3b5', '#c9ced8', '#ffffff', '#6b7385'], 700);
    SFX.effect('smash');
  }

  for (const q of b.parts) {
    q.life -= sdt;
    q.vy += 1500 * sdt;
    q.x += q.vx * sdt;
    q.y += q.vy * sdt;
    q.rot += q.vr * sdt;
  }
  b.parts = b.parts.filter(q => q.life > 0);

  if (b.t >= BEAT_END) finishBeat();
}

function finishBeat() {
  if (st !== 'beat') return;
  if (deathSnd) {
    try { deathSnd.pause(); deathSnd.currentTime = 0; } catch (e) {}
    deathSnd = null;
  }
  beatOver = true;
  finishOver();
}

function beatPlayerPose(tt) {
  const baseX = 372, baseFeet = BEAT_GY + 8, baseH = 505;
  let x = baseX, feet = baseFeet, rot = 0, sx = 1, sy = 1, h = baseH, spr = 'kosan';

  for (let i = 0; i < 5; i++) {
    const d = tt - BEAT_HITS[i];
    if (d < 0) continue;
    const q = Math.exp(-7 * d) * Math.cos(d * 16);
    if (q > 0.001) {
      x -= 112 * q;
      feet -= 30 * Math.max(0, q);
      rot -= 0.3 * q;
      sx += 0.22 * q;
      sy -= 0.24 * q;
    }
  }

  const fd = tt - BEAT_HITS[5];
  if (fd >= 0) {
    spr = 'duran';
    if (fd < 0.87) {
      const k = fd / 0.87;
      const e = easeOutCubic(k);
      x = baseX + 188 * e;
      feet = baseFeet - 305 * Math.sin(Math.PI * Math.min(1, k * 0.93));
      rot = -0.12 - 1.4 * e;
      h = baseH * (1 + 0.05 * Math.sin(Math.PI * k));
      sx = 1; sy = 1;
    } else {
      x = baseX + 188;
      feet = baseFeet;
      rot = -1.52;
      spr = 'duran';
      const b = fd - 0.87;
      const hop = b < 0.06 ? 0 : Math.max(0, Math.sin(b * 14) * Math.exp(-b * 5)) * 15;
      feet -= hop;
      rot += 0.018 * Math.sin(b * 6) * Math.exp(-b * 3);
    }
  }
  return { x, feet, rot, sx, sy, h, spr };
}

function drawBeatCracks(x, y, k) {
  if (k <= 0.01) return;
  g.save();
  g.globalAlpha = 0.55 * k;
  g.strokeStyle = '#0a0c11';
  g.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.4;
    let cx = x, cy = y;
    g.beginPath();
    g.moveTo(cx, cy);
    for (let j = 1; j <= 3; j++) {
      const wob = Math.sin(i * 12.9898 + j * 78.233) * 0.34;
      const len = (24 + j * 30) * k;
      cx += Math.cos(a + wob) * len;
      cy += Math.sin(a + wob) * len * 0.34;
      g.lineTo(cx, cy);
    }
    g.lineWidth = Math.max(1.5, 5 - i * 0.35);
    g.stroke();
  }
  g.restore();
}

function drawBeatImpactStar(x, y, r, rot, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 10;
    const rad = i % 2 ? r * 0.46 : r;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
  g.fillStyle = '#fff6dc';
  g.shadowColor = '#ff7a2a';
  g.shadowBlur = r * 0.7;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#ff5a3c';
  g.stroke();
  g.restore();
}

function drawBeatPunch(lunge, tt) {
  if (lunge < 0.03) return;
  const sx = 648, sy = 838;
  const fx = 496 + Math.sin(tt * 47) * 5;
  const fy = 906 + Math.sin(tt * 39) * 4;
  const x = sx + (fx - sx) * lunge;
  const y = sy + (fy - sy) * lunge;
  const ang = Math.atan2(y - sy, x - sx);
  const r = 46 + 22 * lunge;
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = '#0b0e14';
  g.lineWidth = 74 + 8 * lunge;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(x, y);
  g.stroke();
  g.strokeStyle = '#46587d';
  g.lineWidth = 62 + 8 * lunge;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(x, y);
  g.stroke();
  g.strokeStyle = '#252d42';
  g.lineWidth = 46 + 6 * lunge;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(x, y);
  g.stroke();
  g.save();
  g.globalAlpha = 0.55;
  g.strokeStyle = '#a9bde4';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(sx - Math.sin(ang) * 26, sy + Math.cos(ang) * 26);
  g.lineTo(x - Math.sin(ang) * 26, y + Math.cos(ang) * 26);
  g.stroke();
  g.restore();
  g.strokeStyle = '#e3b58d';
  g.lineWidth = 32;
  g.beginPath();
  g.moveTo(x - Math.cos(ang) * 52, y - Math.sin(ang) * 52);
  g.lineTo(x, y);
  g.stroke();
  for (let i = 2; i >= 0; i--) {
    const k = lunge - i * 0.16;
    if (k <= 0) continue;
    g.globalAlpha = 0.14 * k;
    g.fillStyle = '#eec3a0';
    g.beginPath();
    g.arc(sx + (fx - sx) * k, sy + (fy - sy) * k, r * (1 - i * 0.06), 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
  g.translate(x, y);
  g.rotate(ang);

  g.fillStyle = '#e9edf7';
  g.strokeStyle = '#20242f';
  g.lineWidth = 4;
  rr(-r * 1.02, -r * 0.52, r * 0.26, r * 1.04, 6);
  g.fill();
  g.stroke();

  g.fillStyle = '#eec3a0';
  g.strokeStyle = '#482313';
  g.lineWidth = 7;
  g.beginPath();
  g.ellipse(0, 0, r * 0.95, r * 0.88, 0, 0, 7);
  g.fill();
  g.stroke();
  for (let i = 0; i < 4; i++) {
    const ky = -r * 0.52 + i * r * 0.35;
    g.beginPath();
    g.arc(r * 0.58, ky, r * 0.23, 0, 7);
    g.fill();
    g.stroke();
  }
  g.strokeStyle = 'rgba(72,35,19,.5)';
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const ky = -r * 0.34 + i * r * 0.35;
    g.beginPath();
    g.moveTo(r * 0.36, ky + r * 0.04);
    g.lineTo(r * 0.76, ky + r * 0.04);
    g.stroke();
  }
  g.strokeStyle = '#482313';
  g.lineWidth = 7;
  g.fillStyle = '#eec3a0';
  g.beginPath();
  g.ellipse(-r * 0.1, r * 0.58, r * 0.42, r * 0.26, 0.16, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.beginPath();
  g.ellipse(-r * 0.28, -r * 0.32, r * 0.3, r * 0.19, -0.4, 0, 7);
  g.fill();

  g.globalAlpha = 0.4 * lunge;
  g.strokeStyle = '#fff';
  g.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(-r * 2.1 - i * 24, (i - 1) * r * 0.45, r * 0.9 + i * 10, -1.15, 1.15);
    g.stroke();
  }
  g.restore();
}

function drawBeatScene(dt) {
  const b = beat;
  if (!b) return;
  const tt = b.t;

  g.fillStyle = 'rgba(3,5,12,' + (0.5 + 0.2 * beatSmooth(0, 0.55, tt)) + ')';
  g.fillRect(0, 0, W, H);

  let pulse = 0, lunge = 0, wind = 0;
  for (let i = 0; i < BEAT_HITS.length; i++) {
    const ti = BEAT_HITS[i];
    const d = tt - ti;
    if (d >= 0 && d < 0.42) {
      const k = d / 0.42;
      pulse = Math.max(pulse, Math.pow(1 - k, 1.5));
    }
    const w = (tt - (ti - 0.32)) / 0.32;
    if (w > 0 && w < 1) wind = Math.max(wind, Math.sin(w * Math.PI * 0.5));
    const d2 = tt - ti;
    if (d2 >= -0.14 && d2 <= 0.26) {
      const l = d2 < 0 ? beatSmooth(-0.14, 0, d2) : 1 - beatSmooth(0, 0.26, d2);
      lunge = Math.max(lunge, l);
    }
  }

  const fd = tt - BEAT_HITS[5];
  const lyingK = beatSmooth(0.87, 1.2, fd);
  const pp = beatPlayerPose(tt);

  const zoom = 1 + 0.018 * beatSmooth(0, 1.2, tt) + 0.05 * pulse + 0.055 * beatSmooth(4.9, 6.3, tt);
  const camRot = 0.011 * Math.sin(tt * 1.1) * pulse;

  g.save();
  g.translate(W / 2, H * 0.56);
  g.rotate(camRot);
  g.scale(zoom, zoom);
  g.translate(-W / 2, -H * 0.56);

  const halo = g.createRadialGradient(690, 810, 50, 690, 810, 660);
  halo.addColorStop(0, 'rgba(190,24,18,.3)');
  halo.addColorStop(0.5, 'rgba(110,12,16,.13)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#ffe9c0';
  for (const m of b.motes) {
    g.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(tt * 2 + m.ph));
    g.beginPath();
    g.arc(m.x, m.y, m.r, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;

  shadow(372, BEAT_GY + 22, 430, 0.3);
  shadow(700 - 70 * lunge, BEAT_GY + 20, 470, 0.34);

  if (lunge > 0.04) {
    g.save();
    g.globalAlpha = 0.34 * lunge;
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const yy = 750 + i * 58 + Math.sin(tt * 40 + i * 2) * 7;
      const len = 110 + 190 * lunge;
      g.lineWidth = 3 + (i % 2) * 4;
      g.beginPath();
      g.moveTo(640 + i * 10, yy);
      g.lineTo(640 + i * 10 + len, yy - 16);
      g.stroke();
    }
    g.restore();
  }

  const seyH = 1120 * (1 + 0.006 * Math.sin(tt * 2));
  const seyX = 700 - 88 * lunge + 20 * wind + Math.sin(tt * 1.3) * 4;
  const seyFeet = BEAT_GY + (452 - 425) / 452 * seyH;
  const seyRot = -0.06 * lunge + 0.032 * wind + 0.006 * Math.sin(tt * 1.7);
  const seySX = 1 + 0.05 * lunge + 0.02 * wind;
  const seySY = 1 + 0.011 * Math.sin(tt * 2.1) + 0.035 * lunge - 0.028 * wind;

  for (let i = 3; i >= 1; i--) {
    const a = 0.13 * lunge / i;
    if (a > 0.012) {
      drawPosed('seyit', seyX + i * 26 * lunge, seyFeet, seyH * (1 - i * 0.012), a, seyRot - i * 0.014, seySX, seySY);
    }
  }

  g.save();
  g.shadowColor = 'rgba(255,40,30,' + (0.35 + 0.45 * pulse) + ')';
  g.shadowBlur = 26 + 46 * pulse;
  drawPosed('seyit', seyX, seyFeet, seyH, 1, seyRot, seySX, seySY);
  g.restore();

  if (fd > 0 && fd < 0.95) {
    for (let j = 3; j >= 1; j--) {
      const gp = beatPlayerPose(tt - j * 0.055);
      drawPosed(gp.spr, gp.x, gp.feet, gp.h, 0.15 * (1 - j * 0.22), gp.rot, gp.sx, gp.sy);
    }
  }

  const lift = Math.max(0, pp.feet - BEAT_GY - 8);
  const shW = lyingK > 0 ? 260 + 220 * lyingK : Math.max(140, 300 - lift * 0.45);
  shadow(pp.x - 170 * lyingK, BEAT_GY + 20, shW, 0.28);
  g.save();
  if (pulse > 0.06) {
    g.shadowColor = 'rgba(255,70,40,' + (0.5 * pulse) + ')';
    g.shadowBlur = 34 * pulse;
  }
  drawPosed(pp.spr, pp.x, pp.feet, pp.h * (1 - lift / 2400), 1, pp.rot, pp.sx, pp.sy);
  g.restore();


  if (lyingK > 0.15) {
    const hx = pp.x + Math.sin(pp.rot) * pp.h * 0.76;
    const hy = pp.feet - Math.cos(pp.rot) * pp.h * 0.76;
    for (let i = 0; i < 3; i++) {
      const a = tt * 3.2 + i * 2.1;
      drawStar(hx + Math.cos(a) * 66, hy - 26 + Math.sin(a) * 20, 17, a);
    }
    drawBeatCracks(560, BEAT_GY + 14, beatSmooth(0.87, 1.1, fd));
  }

  for (let i = 0; i < BEAT_HITS.length; i++) {
    const d = tt - BEAT_HITS[i];
    if (d < 0 || d > 0.48) continue;
    const k = d / 0.48;
    const e = easeOutCubic(k);
    const a = 1 - k;
    g.save();
    g.globalAlpha = a;
    g.lineCap = 'round';
    for (let j = 0; j < 8; j++) {
      const ang = i * 0.6 + j * Math.PI / 4;
      const r0 = 44 + 86 * e, r1 = 104 + 215 * e;
      g.strokeStyle = j % 2 ? '#ff6a3c' : '#fff2b0';
      g.lineWidth = (j % 2 ? 8 : 15) * a + 2;
      g.beginPath();
      g.moveTo(BEAT_IX + Math.cos(ang) * r0, BEAT_IY + Math.sin(ang) * r0);
      g.lineTo(BEAT_IX + Math.cos(ang) * r1, BEAT_IY + Math.sin(ang) * r1);
      g.stroke();
    }
    g.restore();
  }

  if (pulse > 0.02) {
    drawBeatImpactStar(BEAT_IX + Math.sin(tt * 50) * 5, BEAT_IY, 82 * pulse + 24, tt * 2.4, Math.min(1, pulse * 1.4));
    g.save();
    g.globalAlpha = 0.75 * pulse;
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.lineWidth = 24 * pulse + 4;
    g.beginPath();
    g.moveTo(BEAT_IX - 92, BEAT_IY - 78);
    g.lineTo(BEAT_IX + 104, BEAT_IY + 86);
    g.stroke();
    g.restore();
  }

  drawBeatPunch(lunge, tt);

  for (let i = 0; i < BEAT_HITS.length; i++) {
    const d = tt - BEAT_HITS[i];
    if (d < 0 || d > 0.6) continue;
    const k = d / 0.6;
    const pop = easeOutBack(clamp(d / 0.14, 0, 1));
    const sc = (0.34 + 0.66 * pop) * (1 + 0.1 * easeOutCubic(k));
    g.save();
    g.globalAlpha = clamp(d / 0.05, 0, 1) * (1 - beatSmooth(0.4, 0.6, d));
    g.translate(i === 5 ? 452 : BEAT_IX + (i % 2 ? 138 : -128), 752 - i * 5);
    g.rotate((i % 2 ? -0.17 : 0.14) + (i === 5 ? -0.05 : 0));
    g.scale(sc, sc);
    g.font = '900 ' + (i === 5 ? 104 : 86) + 'px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 22;
    g.strokeStyle = '#250404';
    g.strokeText(BEAT_WORDS[i], 0, 0);
    g.lineWidth = 9;
    g.strokeStyle = '#ffffff';
    g.strokeText(BEAT_WORDS[i], 0, 0);
    g.fillStyle = i === 5 ? '#ff3b2f' : '#ffe14a';
    g.fillText(BEAT_WORDS[i], 0, 0);
    g.restore();
  }

  for (const q of b.parts) {
    g.save();
    g.globalAlpha = Math.min(1, q.life * 2.2);
    g.translate(q.x, q.y);
    g.rotate(q.rot);
    g.fillStyle = q.col;
    g.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz);
    g.restore();
  }

  if (wind > 0.25) {
    g.save();
    g.globalAlpha = 0.2 * wind;
    g.fillStyle = '#ff9d5c';
    g.beginPath();
    g.ellipse(seyX - 20, BEAT_GY - 10, 280, 34, 0, 0, 7);
    g.fill();
    g.restore();
  }

  g.restore();

  const vg = g.createRadialGradient(W / 2, H * 0.48, H * 0.22, W / 2, H * 0.52, H * 0.82);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,0,2,' + (0.55 + 0.2 * lyingK) + ')');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  const bar = 92 * beatSmooth(0, 0.4, tt);
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, bar);
  g.fillRect(0, H - bar, W, bar);
  if (bar > 40) {
    g.globalAlpha = beatSmooth(0.25, 0.6, tt);
    g.font = '900 19px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('6/B STUDIOS', 30, bar / 2 + 2);
    g.textAlign = 'right';
    g.fillStyle = 'rgba(255,120,100,.8)';
    g.fillText('SAHNE 01 · DAYAK', W - 30, bar / 2 + 2);
    if (tt > 1.35) {
      g.globalAlpha = 0.35 + 0.3 * Math.sin(tt * 4);
      g.fillStyle = '#fff';
      g.textAlign = 'right';
      g.fillText('DOKUN = ATLA', W - 30, H - bar / 2 + 2);
    }
    g.globalAlpha = 1;
  }

  const introD = tt - 0.12;
  if (introD > 0 && tt < 0.98) {
    const inK = clamp(introD / 0.22, 0, 1);
    const outK = clamp((tt - 0.64) / 0.3, 0, 1);
    const sc = (0.72 + 0.28 * easeOutBack(inK)) * (1 + 0.12 * outK);
    g.save();
    g.globalAlpha = Math.min(1, introD * 9) * (1 - outK);
    g.translate(W / 2, 366);
    g.rotate(-0.055);
    g.scale(sc, sc);
    g.fillStyle = 'rgba(176,14,10,.85)';
    g.fillRect(-352, -96, 704, 192);
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.fillRect(-352, -96, 704, 9);
    g.font = '900 158px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 26;
    g.strokeStyle = '#2a0303';
    g.strokeText('SEYİT!', 0, 2);
    g.lineWidth = 10;
    g.strokeStyle = '#ffd9a0';
    g.strokeText('SEYİT!', 0, 2);
    g.fillStyle = '#fff';
    g.fillText('SEYİT!', 0, 2);
    g.restore();

    const subK = clamp((introD - 0.16) / 0.2, 0, 1);
    if (subK > 0) {
      g.save();
      g.globalAlpha = subK * (1 - outK);
      g.translate(W / 2, 528 + (1 - easeOutBack(subK)) * 26);
      g.rotate(0.02);
      g.font = '900 37px "Arial Black","Segoe UI",system-ui,sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#141d3a';
      rr(-154, -28, 308, 56, 28);
      g.fillStyle = '#ffd23f';
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = '#141d3a';
      g.stroke();
      g.fillStyle = '#141d3a';
      g.fillText('KAÇAMADIN!', 0, 2);
      g.restore();
    }
  }

  if (tt > 4.9) {
    const nameK = clamp((tt - 4.9) / 0.4, 0, 1);
    g.save();
    g.globalAlpha = nameK;
    g.translate(110 - (1 - easeOutCubic(nameK)) * 300, 214);
    g.fillStyle = 'rgba(120,8,10,.93)';
    rr(0, 0, 344, 112, 18);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffd23f';
    rr(0, 0, 344, 112, 18);
    g.stroke();
    g.fillStyle = '#ffd23f';
    g.fillRect(0, 18, 8, 76);
    g.fillStyle = '#fff';
    g.font = '900 60px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('SEYİT', 34, 46);
    g.fillStyle = '#ffd9a0';
    g.font = '900 19px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.fillText("6/B'NİN EN BÜYÜĞÜ", 36, 86);
    g.restore();
  }

  if (tt > 4.78) {
    const spK = clamp((tt - 4.78) / 0.3, 0, 1);
    const sc = 0.78 + 0.22 * easeOutBack(spK);
    g.save();
    g.globalAlpha = spK;
    g.translate(462, 808);
    g.scale(sc, sc);
    g.fillStyle = '#f3f6ff';
    g.strokeStyle = '#1a2030';
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(-206, -58, 412, 116, 28);
    g.moveTo(178, 4);
    g.lineTo(266, -56);
    g.lineTo(198, 34);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#141d3a';
    g.font = '900 33px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('BİR DAHA KOŞMA.', 0, 2);
    g.restore();
  }

  if (tt > 5.42) {
    const stK = clamp((tt - 5.42) / 0.26, 0, 1);
    const sc = 0.55 + 0.45 * easeOutBack(stK);
    g.save();
    g.globalAlpha = clamp(stK * 4, 0, 1);
    g.translate(472, 1028);
    g.rotate(-0.13);
    g.scale(sc, sc);
    g.strokeStyle = '#ff2f22';
    g.lineWidth = 10;
    g.strokeRect(-262, -60, 524, 120);
    g.strokeStyle = 'rgba(255,47,34,.5)';
    g.lineWidth = 3;
    g.strokeRect(-246, -46, 492, 92);
    g.fillStyle = '#ff2f22';
    g.font = '900 60px "Arial Black","Segoe UI",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('CANLANMA YOK', 0, 2);
    g.restore();
  }

  drawBeatSceneFade(tt);
}

function drawBeatSceneFade(tt) {
  const fade = beatSmooth(6.0, 6.6, tt);
  if (fade <= 0) return;
  g.fillStyle = 'rgba(0,0,0,' + fade + ')';
  g.fillRect(0, 0, W, H);
}

function drawBeatOver() {
  g.fillStyle = 'rgba(5,3,8,.72)';
  g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W * 0.62, H * 0.44, 60, W * 0.62, H * 0.55, H * 0.8);
  vg.addColorStop(0, 'rgba(200,22,18,.24)');
  vg.addColorStop(1, 'rgba(0,0,0,.62)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#ffe9c0';
  for (let i = 0; i < 24; i++) {
    const ph = i * 1.7;
    const x = ((i * 137 + t * 14) % (W + 80)) - 40;
    const y = ((i * 211 - t * 22) % (H + 80) + H + 80) % (H + 80);
    g.globalAlpha = 0.05 + 0.09 * (0.5 + 0.5 * Math.sin(t * 1.8 + ph));
    g.beginPath();
    g.arc(x, y, 1 + (i % 3), 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;

  const seyH = 1240 * (1 + 0.006 * Math.sin(t * 1.9));
  const seyX = 660;
  const seyFeet = 1450 + (452 - 425) / 452 * seyH;
  g.save();
  g.shadowColor = 'rgba(255,40,30,.5)';
  g.shadowBlur = 40 + 18 * Math.sin(t * 2.4);
  drawPosed('seyit', seyX, seyFeet, seyH, 1, 0.012 * Math.sin(t * 1.1), 1, 1 + 0.007 * Math.sin(t * 1.9));
  g.restore();

  shadow(320, 1004, 460, 0.32);
  drawPosed('duran', 540, 972, 440, 1, -1.52, 1, 1);
  const hx = 540 + Math.sin(-1.52) * 440 * 0.76;
  const hy = 972 - Math.cos(-1.52) * 440 * 0.76;
  for (let i = 0; i < 3; i++) {
    const a = t * 3 + i * 2.1;
    drawStar(hx + Math.cos(a) * 58, hy - 20 + Math.sin(a) * 16, 14, a);
  }

  g.save();
  g.globalAlpha = 0.92;
  g.translate(110, 400);
  g.fillStyle = 'rgba(120,8,10,.93)';
  rr(0, 0, 344, 112, 18);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#ffd23f';
  rr(0, 0, 344, 112, 18);
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.fillRect(0, 18, 8, 76);
  g.fillStyle = '#fff';
  g.font = '900 60px "Arial Black","Segoe UI",system-ui,sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('SEYİT', 34, 46);
  g.fillStyle = '#ffd9a0';
  g.font = '900 19px "Arial Black","Segoe UI",system-ui,sans-serif';
  g.fillText("6/B'NİN EN BÜYÜĞÜ", 36, 86);
  g.restore();
}

/* ---------- menu ---------- */
function drawMenu() {
  const bob = Math.sin(t * 2) * 3.5;
  shadow(W * 0.5, 1211, 320, 0.2);
  drawSprite('duran', W * 0.5, 1205 + bob, 580, 1, Math.sin(t * 1.4) * 0.015);
}

/* ---------- render ---------- */
function render(dt) {
  g.clearRect(0, 0, W, H);
  g.save();
  if (shake > 0) {
    g.translate((Math.random() - 0.5) * 30 * shake, (Math.random() - 0.5) * 30 * shake);
    shake = Math.max(0, shake - dt * 2.5);
  }
  drawWorld();

  if (st === 'beat') {
    drawBeatScene(dt);
  } else if (st === 'over' && beatOver) {
    drawBeatOver();
  } else if (st === 'menu') {
    drawMenu();
  } else {
    drawChase(dt);
    const hb = (st === 'hit' || st === 'over') ? hitBy : null;
    const vis = objs.filter(o => o !== hb && !o.dead);
    const far = vis.filter(o => o.d >= 0).sort((a, b) => b.d - a.d);
    const near = vis.filter(o => o.d < 0);
    for (const o of far) drawObj(o);
    const pp = drawPlayer();
    for (const o of near) drawObj(o);
    drawParticles(dt);
    if (mode) {
      g.fillStyle = 'rgba(255,170,40,.07)';
      g.fillRect(0, 0, W, H);
    }
    if (st === 'hit' || st === 'over') {
      drawHitActor(pp);
      drawCaught();
    }
  }
  g.restore();
  if (flash > 0) {
    g.fillStyle = 'rgba(255,255,255,' + (flash * 0.7) + ')';
    g.fillRect(0, 0, W, H);
    flash = Math.max(0, flash - dt * 2);
  }
}

/* ---------- loop ---------- */
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  if (st === 'play') updatePlay(dt);
  else if (st === 'beat') updateBeat(dt);
  else if (st === 'hit') updateHit(dt);
  else if (st === 'over') caughtT = 1;
  else if (st === 'menu') menuScroll += dt * 9;
  render(dt);
}
requestAnimationFrame(loop);

/* ---------- input ---------- */
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { move(-1); e.preventDefault(); }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { move(1); e.preventDefault(); }
  else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { jump(); e.preventDefault(); }
  else if (e.key === 'Escape') { if (st === 'play') togglePause(); }
});

function tapAt(clientX) {
  const r = cv.getBoundingClientRect();
  const fx = (clientX - r.left) / r.width;
  if (fx < 0.33) move(-1);
  else if (fx > 0.67) move(1);
  else jump();
}

let touchStart = null;
cv.addEventListener('touchstart', e => {
  e.preventDefault();
  const t0 = e.changedTouches[0];
  touchStart = { x: t0.clientX, y: t0.clientY, done: false };
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!touchStart || touchStart.done) return;
  const t0 = e.changedTouches[0];
  const dx = t0.clientX - touchStart.x;
  const dy = t0.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) {
    touchStart.done = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump();
  }
}, { passive: false });
cv.addEventListener('touchend', e => {
  e.preventDefault();
  if (touchStart && !touchStart.done) tapAt(e.changedTouches[0].clientX);
  touchStart = null;
}, { passive: false });
cv.addEventListener('touchcancel', () => { touchStart = null; });

let mouseStart = null;
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') return;
  mouseStart = { x: e.clientX, y: e.clientY };
});
cv.addEventListener('pointerup', e => {
  if (e.pointerType === 'touch' || !mouseStart) return;
  const dx = e.clientX - mouseStart.x;
  const dy = e.clientY - mouseStart.y;
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  if (m < 18) tapAt(e.clientX);
  else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
  mouseStart = null;
});

function skipBeat() {
  if (st === 'beat' && beat && beat.t > 1.1) finishBeat();
}
cv.addEventListener('pointerdown', skipBeat);
addEventListener('keydown', e => {
  if (st === 'beat' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) {
    skipBeat();
    e.preventDefault();
  }
});

/* ---------- global liderlik (Supabase) ---------- */
const SB_URL = String((window.SB_CONFIG && window.SB_CONFIG.url) || '').replace(/\/+$/, '');
const SB_KEY = String((window.SB_CONFIG && window.SB_CONFIG.key) || '');
const SB_ON = !!(SB_URL && SB_KEY);
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanName = v => String(v || '').replace(/[\p{C}<>&"'`/\\]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);

function playerId() {
  let p = '';
  try {
    p = localStorage.getItem('sixb_pid') || '';
    if (!p) {
      p = (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('sixb_pid', p);
    }
  } catch (e) {
    p = p || 'p' + Date.now().toString(36);
  }
  return p;
}
function sbHeaders(extra) {
  const h = Object.assign({ apikey: SB_KEY }, extra || {});
  if (SB_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SB_KEY;
  return h;
}
async function sbTop(limit = 10) {
  const r = await fetch(SB_URL + '/rest/v1/scores?select=player_id,name,dist,coins&order=dist.desc,updated_at.asc&limit=' + limit, {
    headers: sbHeaders(),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('lb ' + r.status);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}
async function sbSubmit(name, d, coins) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/submit_score', {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p_id: playerId(), p_name: name, p_dist: d, p_coins: coins })
  });
  if (!r.ok) throw new Error('submit ' + r.status);
}

let globalBusy = false;
async function globalAfterRun(d, coins) {
  if (!SB_ON || d < 1 || globalBusy) return;
  let top;
  try { top = await sbTop(10); } catch (e) { return; }
  const cut = top.length < 10 ? -1 : top[top.length - 1].dist;
  if (d <= cut) return;
  const saved = cleanName(store.get('name', ''));
  if (saved) {
    sbSubmit(saved, d, coins).catch(() => {});
    return;
  }
  if (st !== 'over' || $('modal').classList.contains('on')) return;
  askLeaderName(d, coins);
}

function askLeaderName(d, coins) {
  globalBusy = true;
  openModal(
    '<h2>LİDERLİĞE NASIL<br>KAYDEDİLMEK İSTİYORSUN?</h2>' +
    '<p>' + d + ' m ile ilk 10\'a girdin!</p>' +
    '<input id="lbName" maxlength="14" autocomplete="nickname" placeholder="ADIN">' +
    '<button class="b b1" id="lbSave">KAYDET</button>' +
    '<button class="b b2" id="lbSkip">VAZGEÇ</button>'
  );
  $('mp').dataset.mode = 'name';
  const inp = $('lbName');
  setTimeout(() => inp.focus(), 80);
  const save = async () => {
    const nm = cleanName(inp.value);
    if (nm.length < 2) {
      inp.style.borderColor = '#ff6b6b';
      inp.focus();
      return;
    }
    store.set('name', nm);
    $('lbSave').disabled = true;
    $('lbSave').textContent = 'KAYDEDİLİYOR…';
    try {
      await sbSubmit(nm, d, coins);
      let rank = 0;
      try {
        const top = await sbTop(10);
        rank = top.findIndex(s => s.player_id === playerId()) + 1;
      } catch (e) {}
      globalBusy = false;
      openModal('<h2>LİDERLİĞE GİRDİN!</h2><p>' + escHtml(nm) + ' · ' + d + ' m' + (rank ? '<br>GLOBAL SIRALAMA: #' + rank : '') + '</p><button class="b b1" id="lbOk">TAMAM</button>');
      $('lbOk').onclick = closeModal;
    } catch (e) {
      globalBusy = false;
      closeModal();
    }
  };
  $('lbSave').onclick = save;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  $('lbSkip').onclick = () => { globalBusy = false; closeModal(); };
}

function localRowsHtml() {
  const L = store.get('scores', []);
  if (!L.length) return '<p>Henüz skor yok.<br>İlk kaçışı sen yap!</p>';
  return L.slice(0, 10).map((s, i) => '<div class="row"><span>' + (i + 1) + '.</span><span class="lbname">SEN</span><span>' + s.d + ' m</span></div>').join('');
}
function globalRowsHtml(top) {
  if (!top.length) return '<p>Henüz skor yok.<br>İlk kaçışı sen yap!</p>';
  const me = playerId();
  return top.map((s, i) => '<div class="row' + (s.player_id === me ? ' me' : '') + '"><span>' + (i + 1) + '.</span><span class="lbname">' + escHtml(s.name) + '</span><span>' + (s.dist | 0) + ' m</span></div>').join('');
}
const lbCloseBtn = '<button class="b b2" id="cl">KAPAT</button>';
$('lbBtn').onclick = async () => {
  SFX.effect('ui');
  if (!SB_ON) {
    openModal('<h2>LİDERLİK</h2>' + localRowsHtml() + '<p class="lbnote">GLOBAL TABLO HENÜZ AÇILMADI</p>' + lbCloseBtn);
    $('cl').onclick = closeModal;
    return;
  }
  openModal('<h2>LİDERLİK</h2><p>YÜKLENİYOR…</p>' + lbCloseBtn);
  $('mp').dataset.mode = 'lb';
  $('cl').onclick = closeModal;
  try {
    const top = await sbTop(10);
    if (!document.getElementById('modal').classList.contains('on') || $('mp').dataset.mode !== 'lb') return;
    openModal('<h2>LİDERLİK</h2>' + globalRowsHtml(top) + lbCloseBtn);
    $('mp').dataset.mode = 'lb';
    $('cl').onclick = closeModal;
  } catch (e) {
    if (!$('modal').classList.contains('on') || $('mp').dataset.mode !== 'lb') return;
    openModal('<h2>LİDERLİK</h2>' + localRowsHtml() + '<p class="lbnote">BAĞLANTI YOK — YEREL SKORLAR</p>' + lbCloseBtn);
    $('cl').onclick = closeModal;
  }
};

/* ---------- buttons ---------- */
$('play').onclick = () => { SFX.effect('ui'); startRun(); };
$('again').onclick = () => { startRun(); SFX.play('alo', { volume: 0.85 }); };
$('home').onclick = () => { SFX.stopAll(); goMenu(); };
$('pause').onclick = togglePause;
$('offerContinue').onclick = e => { e.stopPropagation(); continueRun(); };
$('offerQuit').onclick = e => { e.stopPropagation(); giveUp(); };

for (const el of document.querySelectorAll('.mode-btn')) {
  el.onclick = () => {
    applyMode(el.dataset.mode);
    SFX.effect('ui');
    setScreen('menu');
    updateBest();
  };
}
$('modeChip').onclick = () => { SFX.effect('ui'); setScreen('modes'); };

for (const [id, fn] of [['tL', () => move(-1)], ['tJ', jump], ['tR', () => move(1)]]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}

$('setBtn').onclick = () => {
  const draw = () => {
    openModal('<h2>AYARLAR</h2><button class="b b2" id="snd">SES: ' + (soundOn ? 'AÇIK' : 'KAPALI') + '</button><button class="b b2" id="modeSet">MOD: ' + MODE_LABEL[playMode] + '</button><button class="b b2" id="cl">KAPAT</button>');
    $('snd').onclick = () => {
      soundOn = !soundOn;
      store.set('sound', soundOn);
      SFX.setEnabled(soundOn);
      SFX.effect('ui');
      draw();
    };
    $('modeSet').onclick = () => { closeModal(); setScreen('modes'); };
    $('cl').onclick = () => { closeModal(); };
  };
  draw();
};

/* ---------- splash ---------- */
let splashGone = false;
function hideSplash() {
  if (splashGone) return;
  splashGone = true;
  const s = $('splash');
  s.classList.add('out');
  setTimeout(() => { s.style.display = 'none'; }, 700);
}
$('splash').addEventListener('pointerdown', hideSplash);
setTimeout(hideSplash, 2800);
window.addEventListener('load', () => setTimeout(hideSplash, 1500));

applyMode(playMode);
updateBest();
setScreen('modes');
toggleHud(false);
updateHud();

/* ---------- uygulama olarak yükle (PWA) ---------- */
const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
let installEvt = window.__bip || null;
let installWaiters = [];

function bip(e) {
  e.preventDefault();
  installEvt = e;
  try { localStorage.removeItem('sixb_installed'); } catch (err) {}
  $('installBtn').hidden = false;
  const w = installWaiters;
  installWaiters = [];
  for (const f of w) f(e);
}
addEventListener('beforeinstallprompt', bip);

function iosHelp() {
  openModal('<h2>UYGULAMA OLARAK KUR</h2><p>Safari\'de alttaki <b>Paylaş</b> düğmesine basıp <b>Ana Ekrana Ekle</b>\'yi seç.</p><button class="b b1" id="insClose">TAMAM</button>');
  $('insClose').onclick = closeModal;
}
function waitInstall(ms) {
  return new Promise(res => {
    if (installEvt) { res(installEvt); return; }
    const f = e => { clearTimeout(t); res(e); };
    installWaiters.push(f);
    const t = setTimeout(() => {
      installWaiters = installWaiters.filter(x => x !== f);
      res(null);
    }, ms);
  });
}
async function promptInstall() {
  let evt = installEvt;
  if (!evt) evt = await waitInstall(2000);
  if (!evt) {
    if (iosDevice) iosHelp();
    return;
  }
  installEvt = null;
  window.__bip = null;
  try {
    const p = evt.prompt();
    if (p && p.catch) p.catch(() => {});
  } catch (e) {
    return;
  }
  try {
    const res = await evt.userChoice;
    if (res && res.outcome === 'accepted') {
      try { localStorage.setItem('sixb_installed', '1'); } catch (e) {}
      $('installBtn').hidden = true;
    }
  } catch (e) {}
}
addEventListener('appinstalled', () => {
  installEvt = null;
  try { localStorage.setItem('sixb_installed', '1'); } catch (e) {}
  $('installBtn').hidden = true;
});
$('installBtn').onclick = promptInstall;
try {
  if (installEvt) localStorage.removeItem('sixb_installed');
  if (standalone || localStorage.getItem('sixb_installed') === '1') $('installBtn').hidden = true;
} catch (e) {}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

})();
