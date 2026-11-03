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
  sinif: 'assets/img/sinif.jpg'
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
function openModal(html) { $('mp').innerHTML = html; $('modal').classList.add('on'); }
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
  else if (kind === 'exam') pwLoop = SFX.loop('mode', { volume: 0.9 });
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
  SFX.effect('lose');
}

/* ---------- update ---------- */
function move(dx) {
  if (st !== 'play') return;
  const nl = clamp(lane + dx, -1, 1);
  if (nl !== lane) {
    lane = nl;
    tilt = dx * 0.18;
    SFX.play('lane', { volume: 0.65 });
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

  if (st === 'menu') {
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

$('lbBtn').onclick = () => {
  const L = store.get('scores', []);
  const rows = L.length
    ? L.slice(0, 10).map((s, i) => '<div class="row"><span>' + (i + 1) + '.</span><span>' + s.d + ' m</span><span>' + s.c + ' · 6/B</span></div>').join('')
    : '<p>Henüz skor yok.<br>İlk kaçışı sen yap!</p>';
  openModal('<h2>LİDERLİK</h2>' + rows + '<button class="b b2" id="cl">KAPAT</button>');
  $('cl').onclick = () => { closeModal(); };
};

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
})();
