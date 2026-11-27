(() => {
'use strict';

const W = 941, H = 1672, HOR = 385, VP = 470, K = 5;
const MODE_TIME = 10, OFFER_TIME = 4;
const YAV_TIME = 30, YAV_CHANCE = 0.025;
const EMIR_PRAYER_TIME = 10, EMIR_BOOST_TIME = 6;
const REV_TIME = 10, REV_SLOW = 0.6;            // Mustafa Eymen: ters kontrol süresi, yavaşlama çarpanı
const NIYAZI_PUSH = 1000, BUMP_TIME = 1.8;
const FOG_TIME = 7, SPEEDUP_TIME = 7, STUN_TIME = 1.8, SHIELD_TIME = 20;   // Ezra sis, Kutay hızlanma, Muhammed Ali sersemletme, Buğlem kalkan süresi
const BUGRA_STEAL = 250, ELIF_GIVE = 250;                                     // Ahmet Buğra'nın çaldığı / Elif İrem'in verdiği 6/B (o anki koşunun parasından)
const RARE_LIST = ['niyazi', 'mustafa', 'buglem', 'elif', 'ezra', 'kutay', 'bugra', 'muhammed'];   // Yavuz/Emir dışındaki nadir karakterler (her biri YAV_CHANCE)
const RARE_DEF = {
  buglem: 'BUĞLEM', elif: 'ELİF İREM', ezra: 'EZRA ZEREN', kutay: 'KUTAY', bugra: 'AHMET BUĞRA', muhammed: 'MUHAMMED ALİ'
};      // Niyazi: geri itme (m) ve animasyon süresi
const JUMP_H = 260, JUMP_LEN = 0.72, YAV_JUMP_H = 640, YAV_JUMP_LEN = 0.98;
const BOSS_EVERY = 6000, BOSS_HP = 5, BOSS_LIVES = 3, BOSS_REWARD = 30;
const BOSS_FEET = 860, BOSS_H = 560;
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
  ders: 'assets/img/ali_surucu.jpg',
  sinif: 'assets/img/sinif.jpg',
  seyit: 'assets/img/seyit.png',
  yavuz: 'assets/img/yavuz.png',
  emir: 'assets/img/emir.png',
  niyazi: 'assets/img/niyazi.png',
  mustafa: 'assets/img/yeni_mustafa_resmi.png',
  ahmet: 'assets/img/ahmet_deniz.png',
  buglem: 'assets/img/buglem.png',
  elif: 'assets/img/elif_irem.png',
  ezra: 'assets/img/ezra_zeren.png',
  muhammed: 'assets/img/muhammed_ali.png',
  bugra: 'assets/img/ahmet_bugra.png',
  kutay: 'assets/img/kutay.png',
  merve: 'assets/img/merve.png',
  kid67: 'assets/img/kid67.png',
  scare: 'assets/img/jumpscare.jpg'
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
let testMode = store.get('test', false);
const CHARS = [
  { id: 'kosan', name: 'METİN OKTAY', desc: 'KLASİK KOŞUCU · YETENEK YOK', cost: 0, spr: 'kosan', col: '#3b6bff' },
  { id: 'yavuz', name: 'YAVUZ', desc: 'ZIPLAMASI %25 DAHA YÜKSEK', cost: 150, spr: 'yavuz', col: '#c0162f' },
  { id: 'merve', name: 'MERVE MİNA', desc: 'HER KOŞUDA İLK ÇARPMAYI AFFEDER', cost: 250, spr: 'merve', col: '#d81b3c' },
  { id: 'bugra', name: 'AHMET DENİZ', desc: 'KOSTÜM · HİÇBİR YETENEĞİ YOK · BİR İŞE YARAMAZ', cost: 14000, spr: 'ahmet', img: 'ahmet_deniz.png', col: '#5aa0ff' }
];
const TRAILS = [
  { id: '', name: 'İZ YOK', cost: 0 },
  { id: 'gold', name: 'ALTIN IŞILTI', cost: 100, cols: ['#ffd23f', '#fff6c0', '#ff9d00'] },
  { id: 'fire', name: 'MAVİ ALEV', cost: 150, cols: ['#6fb3ff', '#ffffff', '#2a5bff'] },
  { id: 'rain', name: 'GÖKKUŞAĞI', cost: 300, cols: ['#ff4d4d', '#ffd23f', '#5dff8a', '#4da3ff', '#b06bff'] }
];
const AURAS = [
  { id: '', name: 'AURA YOK', cost: 0 },
  { id: 'pink', name: 'PEMBE AURA', cost: 120, col: '#ff6bd5' },
  { id: 'green', name: 'YEŞİL AURA', cost: 120, col: '#5dff8a' },
  { id: 'purple', name: 'MOR AURA', cost: 200, col: '#b06bff' }
];
const prof = Object.assign({ wallet: 0, owned: {}, ch: 'kosan', trail: '', aura: '' }, store.get('prof', {}));
const stats = Object.assign({ run: 0, coin: 0, clear: 0, slide: 0, yavuz: 0, boss: 0, bossClean: 0, kid: 0, bestDist: 0 }, store.get('stats', {}));
const ach = store.get('ach', {});
let dm = store.get('dm', null);
const COMBO_WINDOW = 1.1;
let shield = 0, slideT = 0, comboN = 0, lastCoinT = -9, ev = null, evNext = 30;
let kid = null, kidLift = 0, infaz = null, scare = null, adminOn = false, infazSnd = null, infazOn = false;
const infazKeys = new Set();
const KID_CHANCE = 0.00002, INFAZ_TIME = 30;
SFX.setEnabled(soundOn);
let scoreBest = (store.get('scores', [])[0] || {}).d || 0;

const MODE_LABEL = { board: 'AKILLI TAHTA', phone: 'TELEFON', pc: 'BİLGİSAYAR' };
const MODE_HINT = {
  board: 'EKRANDAKİ TUŞLARLA OYNA',
  phone: 'KAYDIR · ↑ ZIPLA · ↓ KAY',
  pc: '← → ŞERİT · BOŞLUK ZIPLA · ↓ KAY'
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
  fly: { h: 200, pw: 'fly', avatar: 'poci' },
  yavuz: { h: 330, pw: 'yavuz', avatar: 'yavuz' },
  emir: { h: 360, pw: 'emir', avatar: 'emir' },
  niyazi: { h: 340, pw: 'niyazi', avatar: 'niyazi' },
  mustafa: { h: 340, pw: 'mustafa', avatar: 'mustafa' },
  teneke: { h: 170, low: true, prop: 'teneke' },
  buglem: { h: 340, pw: 'rare', avatar: 'buglem' },
  elif: { h: 340, pw: 'rare', avatar: 'elif' },
  ezra: { h: 340, pw: 'rare', avatar: 'ezra' },
  kutay: { h: 340, pw: 'rare', avatar: 'kutay' },
  bugra: { h: 340, pw: 'rare', avatar: 'bugra' },
  muhammed: { h: 340, pw: 'rare', avatar: 'muhammed' },
  borb: { h: 130, pw: 'borb' },
  asma: { h: 120, hang: true },
  kid: { h: 300, pw: 'kid' }
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
let yav = null, yavSnd = null, jumpHt = JUMP_H, jumpLen = JUMP_LEN;
let emirPrayerT = 0, emirBoostT = 0, emirShoutT = 0;
let revT = 0, fogT = 0, speedT = 0, stunT = 0, shieldT = 0;                                              // ters kontrol sayacı (Mustafa Eymen)
let bumpT = 0, bumpTotal = 0, bumpLeft = 0, bumpRate = 0, bumpHit = false;   // Niyazi göbek atma
let houses = [], houseAt = 0, ahmetPending = false;        // yol kenarı evler + Ahmet Deniz
let boss = null, bossNext = BOSS_EVERY;

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
  el.classList.remove('combo');
  el.textContent = txt;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}

function flashComboMessage(txt) {
  const el = $('flashMsg');
  el.textContent = txt;
  el.classList.remove('on');
  el.classList.add('combo');
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
  stopYav(); emirPrayerT = 0; emirBoostT = 0; emirShoutT = 0; jumpHt = JUMP_H; jumpLen = JUMP_LEN;
  revT = 0; fogT = 0; speedT = 0; stunT = 0; shieldT = 0; bumpT = 0; bumpLeft = 0; bumpHit = false; ahmetPending = false; houseAt = 6; seedHouses();
  boss = null; bossNext = BOSS_EVERY;
  shield = prof.ch === 'merve' ? 1 : 0; slideT = 0; comboN = 0; lastCoinT = -9; ev = null; evNext = 30;
  kid = null; kidLift = 0; infaz = null; scare = null; stopInfazMusic();
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
  stopYav();
  boss = null;
  kid = null; kidLift = 0; infaz = null; scare = null; slideT = 0; stopInfazMusic(); refreshBadges();
  revT = 0; fogT = 0; speedT = 0; stunT = 0; shieldT = 0; bumpT = 0; houses = [];
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
  const wasHit = st === 'hit';
  const d = Math.floor(dist);
  const c = coins;
  hideOffer();
  stopGameAudio();
  SFX.stopAll();
  if (wasHit) recordLocalRun(d, c);
  goMenu();
  SFX.play('dikidis', { volume: 0.9 });
  if (wasHit) globalAfterRun(d, c);
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
  if (!mode && !boss && run > 120 && !ahmetPending && !houses.some(h => h.ahmet && !h.done) && Math.random() < YAV_CHANCE) ahmetPending = true;
  if (!mode && run >= seyitNext) {
    seyitNext = run + 120 + Math.random() * 120;
    objs.push({ ty: 'seyit', lane: rnd([-1, 0, 1]), d });
    return;
  }
  if (!mode && !boss && run > 250 && !objs.some(o => o.ty === 'kid' && !o.dead) && Math.random() < KID_CHANCE) {
    objs.push({ ty: 'kid', lane: 0, d });
    SFX.effect('kidNear');
    return;
  }
  if (ev && ev.type === 'yagmur') {
    for (const L of [-1, 0, 1]) for (let k = 0; k < 3; k++) objs.push({ ty: 'coin', lane: L, d: d + k * 1.4 });
    return;
  }
  const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);
  const hard = Math.min(1, run / 2700);
  const rareReady = !mode && !yav && run > 120 && revT <= 0 && bumpT <= 0 && !objs.some(o => (o.ty === 'yavuz' || o.ty === 'emir' || RARE_LIST.includes(o.ty)) && !o.dead);
  const rareRoll = Math.random();
  const newRare = rareReady && rareRoll >= YAV_CHANCE * 2 && rareRoll < YAV_CHANCE * (2 + RARE_LIST.length);
  const nObs = newRare ? 1 : (Math.random() < 0.32 + hard * 0.4 ? 2 : 1);   // yeni karakter satırı tek engelli: diğer şerit boş kalır
  for (let i = 0; i < nObs; i++) {
    const r = Math.random();
    let ty;
    if (run > 150 && Math.random() < 0.14) ty = 'asma';
    else if (r < 0.32) ty = rnd(['koni', 'bariyer', 'kitap', 'sise']);
    else if (r < 0.62) ty = rnd(['pano', 'cop']);
    else ty = 'dolap';
    objs.push({ ty, lane: lanes[i], d });
  }
  const free = lanes[nObs];
  if (rareReady && rareRoll < YAV_CHANCE) {
    objs.push({ ty: 'yavuz', lane: free, d: d + 1 });
  } else if (rareReady && rareRoll < YAV_CHANCE * 2) {
    objs.push({ ty: 'emir', lane: free, d: d + 1 });
  } else if (rareReady && nObs === 1 && rareRoll >= YAV_CHANCE * 2 && rareRoll < YAV_CHANCE * (2 + RARE_LIST.length)) {
    // her biri YAV_CHANCE; yalnız tek engelli sıralarda → yanındaki şerit boş kalır, tek çıkış kapanmaz
    objs.push({ ty: RARE_LIST[Math.floor(rareRoll / YAV_CHANCE) - 2], lane: free, d: d + 1 });
  } else if (!mode && Math.random() < 0.1) {
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

function stopYavSnd() {
  if (yavSnd) { try { yavSnd.pause(); yavSnd.currentTime = 0; } catch (e) {} yavSnd = null; }
}
function stopYav() {
  yav = null;
  stopYavSnd();
}
function yavActive() { return !!yav && yav.leave < 0; }
function pickYavuz() {
  bump('yavuz');
  if (yav) {
    yav.t = YAV_TIME;
    yav.leave = -1;
  } else {
    yav = { t: YAV_TIME, ent: 0, px, thr: -1, leave: -1 };
  }
  flashMessage('YAVUZ ARKANDA!');
  SFX.effect('pickup');
  flash = Math.max(flash, 0.4);
  const p = proj(0);
  spawnBurst(laneX(px, p), p.y - 120 * p.sc, 12, ['#ffd23f', '#ffffff', '#ff9d00'], 520, 900);
}
function updateYav(dt, hold) {
  yav.ent = Math.min(1, yav.ent + dt * 2.2);
  yav.px += (px - yav.px) * Math.min(1, dt * 8);
  if (yav.thr >= 0) {
    yav.thr += dt / 0.5;
    if (yav.thr >= 1) yav.thr = -1;
  }
  if (yav.leave < 0) {
    if (!hold) yav.t -= dt;
    if (yav.t <= 0) {
      yav.leave = 0;
      flashMessage('YAVUZ GİTTİ!');
    }
  } else {
    yav.leave += dt / 0.9;
    if (yav.leave >= 1) yav = null;
  }
}

function pickEmir() {
  SFX.effect('pickup');
  flash = Math.max(flash, 0.35);
  if (Math.random() < 0.5) {
    emirPrayerT = EMIR_PRAYER_TIME;
    emirBoostT = 0;
    emirShoutT = 0;
    flashMessage('EMİR 10 SANİYELİK NAMAZ MOLASI VERDİ!');
  } else {
    emirBoostT = EMIR_BOOST_TIME;
    emirPrayerT = 0;
    emirShoutT = 2.2;
    inv = Math.max(inv, EMIR_BOOST_TIME);
    flashMessage('İMAN GÜCÜÜÜÜÜÜÜ!');
    SFX.effect('whoosh');
  }
  updateHud();
}

/* ---------- Niyazi · Mustafa Eymen · Ahmet Deniz ---------- */
function pickNiyazi() {
  bumpTotal = Math.min(NIYAZI_PUSH, Math.floor(dist));
  bumpLeft = bumpTotal;
  bumpRate = bumpTotal / (BUMP_TIME * 0.75);
  bumpT = BUMP_TIME;
  bumpHit = false;
  inv = Math.max(inv, BUMP_TIME + 0.6);
  clearNear(60);
  SFX.effect('pickup');
  flashMessage('NİYAZİ GÖBEK ATTI!' + (bumpTotal > 0 ? ' -' + bumpTotal + ' M' : ''));
  updateHud();
}
function updateBump(dt) {
  bumpT = Math.max(0, bumpT - dt);
  const u = 1 - bumpT / BUMP_TIME;
  if (!bumpHit && u >= 0.25) {
    bumpHit = true;
    shake = 1;
    flash = Math.max(flash, 0.5);
    SFX.effect('smash');
    const p = proj(0);
    spawnBurst(laneX(px, p) + 50, p.y - 200 * p.sc, 18, ['#ff8a3d', '#ffd23f', '#ffffff'], 760, 1100);
  }
  if (u >= 0.25 && bumpLeft > 0) {
    const take = Math.min(bumpLeft, bumpRate * dt);
    bumpLeft -= take;
    dist = Math.max(0, dist - take);
    scroll -= take;
    if (scroll < 0) scroll += 2400;
    for (const hs of houses) hs.d += take * 0.5;
  }
  px += (lane - px) * Math.min(1, dt * 14);
  tilt *= Math.pow(0.02, dt);
  if (jumpT >= 0) {
    jumpT += dt / jumpLen;
    if (jumpT >= 1) jumpT = -1;
  }
  if (inv > 0) inv -= dt;
  if (slideT > 0) slideT -= dt;
  if (yav) updateYav(dt, true);
  if (bumpT === 0) {
    seedHouses();
    spawnAt = 40;
    flashMessage('GERİ İTİLDİN! DEVAM ET!');
  }
  updateHud();
}
function addRunCoins(n) {
  if (mode) modeStars += n; else coins += n;
}
// koşudaki parayı azaltır (ana cüzdana dokunmaz). Önce moddaki yıldızlar, sonra mod yıldız toplamı, kalan coin'den düşer; para yetmezse coin eksiye düşer.
function takeRunCoins(n) {
  let left = n;
  if (mode) { const t = Math.min(modeStars, left); modeStars -= t; left -= t; }
  if (left > 0) { const t = Math.min(modeStarsTotal, left); modeStarsTotal -= t; left -= t; }
  coins -= left;
}
function pickRare(ty) {
  const p = proj(0);
  flash = Math.max(flash, 0.3);
  if (ty === 'buglem') {                                   // iyi: 20 sn kalkan (bir çarpmada kırılır, 20 sn'de çarpmazsan söner)
    if (shield > 0) { flashMessage('KALKANIN ZATEN VAR!'); }
    else { shield = 1; shieldT = SHIELD_TIME; flashMessage('BUĞLEM 20 SN KALKAN VERDİ!'); }
    SFX.effect('pickup');
  } else if (ty === 'elif') {                              // iyi: koşudaki paraya +250 6/B
    addRunCoins(ELIF_GIVE);
    flashMessage('ELİF İREM +' + ELIF_GIVE + ' 6/B VERDİ!');
    SFX.effect('pickup');
    spawnBurst(laneX(px, p), p.y - 120 * p.sc, 16, ['#ffd23f', '#fff6c0', '#ff9d00'], 560, 900);
  } else if (ty === 'muhammed') {                          // kötü: yumruk, 1,8 sn sersemletir (kontroller kilitli)
    stunT = STUN_TIME;
    shake = 1;
    flashMessage('MUHAMMED ALİ YUMRUK ATTI!');
    SFX.effect('smash');
    buzz(120);
    spawnBurst(laneX(px, p), p.y - 170 * p.sc, 14, ['#ffffff', '#ffd23f', '#ff6b6b'], 600, 1100);
  } else if (ty === 'ezra') {                              // kötü: sis topunu ileri sıkar, ileride sis olur
    fogT = FOG_TIME;
    flashMessage('EZRA ZEREN SİS TOPU SIKTI!');
    SFX.effect('whoosh');
    for (const dd of [3, 7, 12, 18, 26, 36]) {
      const q = proj(dd);
      spawnBurst(laneX(px, q), q.y - 60 * q.sc, 10, ['#e6ebf4', '#c8d0de', '#ffffff'], 260, 700);
    }
  } else if (ty === 'bugra') {                             // kötü: koşudaki paradan 250 6/B çalar, yetmezse koşu parası eksiye düşer
    takeRunCoins(BUGRA_STEAL);
    flashMessage('AHMET BUĞRA -' + BUGRA_STEAL + ' 6/B ALDI!' + (coins < 0 ? ' PARAN EKSİDE!' : ''));
    SFX.effect('smash');
    shake = Math.max(shake, 0.5);
  } else if (ty === 'kutay') {                             // karışık: 7 sn %45 hız
    speedT = SPEEDUP_TIME;
    flashMessage('KUTAY HIZLANDIRDI!');
    SFX.effect('whoosh');
  }
  updateHud();
}
function pickMustafa() {
  revT = REV_TIME;
  flash = Math.max(flash, 0.35);
  SFX.effect('pickup');
  flashMessage('KONTROLLER TERS!');
  updateHud();
}

const HOUSE_COLS = [
  { wall: '#d8c39a', roof: '#a8412f', trim: '#8a7550' },
  { wall: '#c98f74', roof: '#6d3b2b', trim: '#8f5a43' },
  { wall: '#9db8cc', roof: '#3f5a73', trim: '#6b8499' },
  { wall: '#b7c98f', roof: '#7a3a2e', trim: '#859a5f' },
  { wall: '#dcaab4', roof: '#6a3a4a', trim: '#a97885' }
];
function addHousePair(d, ahmetSide) {
  for (const side of [-1, 1]) {
    houses.push({
      side, d,
      wm: ahmetSide === side ? 1.3 : 0.9 + Math.random() * 0.25, hm: ahmetSide === side ? 1.3 : 0.9 + Math.random() * 0.3,
      ci: Math.floor(Math.random() * HOUSE_COLS.length), seed: Math.random(),
      ahmet: ahmetSide === side, t: 0, hello: false, thrown: false, done: false
    });
  }
}
function seedHouses() {
  houses = [];
  for (let d = 6; d < 48; d += 9) addHousePair(d + Math.random() * 3, 0);
}
function throwFromBalcony(hs) {
  const free = [-1, 0, 1].filter(L => !objs.some(o => !o.dead && o.lane === L && Math.abs(o.d - (hs.d - 12)) < 5));
  const lane = rnd(free.length ? free : [-1, 0, 1]);
  const ty = Math.random() < 0.7 ? rnd(['kitap', 'teneke', 'sise']) : 'emir';   // %70 çöp, %30 Emir
  objs.push({ ty, lane, d: hs.d, d0: hs.d, air: 1, aird: 12, side: hs.side, spin: Math.random() * 6.28, lift0: 390 * hs.hm });
  SFX.effect('whoosh');
}
function landThrown(o) {
  const p = proj(Math.max(o.d, 0));
  spawnBurst(laneX(o.lane, p), p.y - 10, 7, o.ty === 'emir' ? ['#7dffb2', '#ffffff'] : ['#9aa3b5', '#c9ced8', '#ffffff'], 320, 800);
}
function updateHouses(dt, sp) {
  houseAt -= sp * dt;
  if (houseAt <= 0) {
    if (ahmetPending) {
      addHousePair(40 + sp * 0.8, rnd([-1, 1]));
      ahmetPending = false;
    } else {
      addHousePair(46 + Math.random() * 2, 0);
    }
    houseAt = 8.5 + Math.random() * 3;
  }
  for (const hs of houses) {
    hs.d -= sp * dt;
    if (!hs.ahmet || hs.done) continue;
    hs.t += dt;
    if (!hs.hello && hs.t > 0.45) { hs.hello = true; flashMessage('AHMET DENİZ BALKONDA!'); }
    if (!hs.thrown && hs.t > 0.8) { hs.thrown = true; throwFromBalcony(hs); }
    if (hs.t > 2.5) hs.done = true;
  }
  houses = houses.filter(h => h.d > -1.6);
}

function pick(o) {
  o.dead = 1;
  if (o.ty === 'kid') {
    o.dead = 0;
    startKid(o);
    return;
  }
  if (o.ty === 'yavuz') {
    pickYavuz();
    return;
  }
  if (o.ty === 'emir') {
    pickEmir();
    return;
  }
  if (o.ty === 'niyazi') {
    pickNiyazi();
    return;
  }
  if (o.ty === 'mustafa') {
    pickMustafa();
    return;
  }
  if (RARE_DEF[o.ty]) {
    pickRare(o.ty);
    return;
  }
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
  bump('coin');
  comboN = (t - lastCoinT < COMBO_WINDOW) ? comboN + 1 : 1;
  lastCoinT = t;
  if (comboN % 8 === 0) {
    if (mode) modeStars++; else coins++;
    flashComboMessage('KOMBO +1');
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
  stopYavSnd();
  deathSnd = SFX.play('dikidis', { volume: 0.85 });
  buzz(200);
  SFX.effect('crash');
  updateHud();
  setTimeout(() => {
    if (st === 'hit') offerShow();
  }, 450);
}

function offerShow() {
  if (st !== 'hit') return;
  const cost = contN === 0 ? 250 : 500;
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
  if (boss) {
    objs = objs.filter(o => !o.bs);
    boss.q = [];
    boss.counter = null;
    boss.lives = 2;
    boss.cd = 1.2;
    boss.waveOn = false;
  }
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
  stopYav();
  boss = null;
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
  recordLocalRun(d, coins);
  if (!beatOver) SFX.effect('lose');
  globalAfterRun(d, coins);
}

function recordLocalRun(d, c) {
  addWallet(Math.max(0, c) + modeStarsTotal);
  noteRun(d);
  const L = store.get('scores', []);
  L.push({ d, c, k: Date.now() });
  L.sort((a, b) => b.d - a.d);
  const top = L.slice(0, 10);
  store.set('scores', top);
  scoreBest = top[0].d;
  updateBest();
}

/* ---------- update ---------- */
function move(dx) {
  if (st !== 'play' || emirPrayerT > 0 || stunT > 0) return;
  if (revT > 0) dx = -dx;
  const nl = clamp(lane + dx, -1, 1);
  if (nl !== lane) {
    lane = nl;
    tilt = dx * 0.18;
    if (!mode && !pw) SFX.play('lane', { volume: 0.65 });
  }
}
function jump() { if (revT > 0) slideReal(); else jumpReal(); }
function slide() { if (revT > 0) jumpReal(); else slideReal(); }
function jumpReal() {
  if (st !== 'play' || emirPrayerT > 0 || stunT > 0) return;
  if (pw === 'fly') return;
  if (jumpT >= 0) return;
  jumpT = 0;
  if (yavActive()) {
    jumpHt = YAV_JUMP_H;
    jumpLen = YAV_JUMP_LEN;
    yav.thr = 0;
    stopYavSnd();
    yavSnd = SFX.play('yavuz', { volume: 1 });
    const p = proj(0);
    spawnBurst(laneX(px, p), p.y - 20 * p.sc, 10, ['#ffd23f', '#ffffff', '#ff9d00'], 520, 1000);
  } else {
    jumpHt = JUMP_H * (prof.ch === 'yavuz' ? 1.25 : 1);
    jumpLen = JUMP_LEN * (prof.ch === 'yavuz' ? 1.1 : 1);
  }
  SFX.effect('jump');
}

function updatePlay(dt) {
  if (emirPrayerT > 0) {
    emirPrayerT = Math.max(0, emirPrayerT - dt);
    if (emirPrayerT === 0) flashMessage('NAMAZ MOLASI BİTTİ!');
    updateHud();
    return;
  }
  if (revT > 0) {
    revT = Math.max(0, revT - dt);
    if (revT === 0) flashMessage('KONTROLLER DÜZELDİ!');
  }
  if (fogT > 0) fogT = Math.max(0, fogT - dt);
  if (speedT > 0) speedT = Math.max(0, speedT - dt);
  if (stunT > 0) stunT = Math.max(0, stunT - dt);
  if (shieldT > 0) {
    shieldT = Math.max(0, shieldT - dt);
    if (shield <= 0) shieldT = 0;
    else if (shieldT === 0) { shield = 0; flashMessage('KALKAN SÖNDÜ'); }
  }
  if (bumpT > 0) { updateBump(dt); return; }
  if (emirBoostT > 0) {
    emirBoostT = Math.max(0, emirBoostT - dt);
    if (emirBoostT === 0) {
      clearNear(30, false);
      inv = Math.max(inv, 0.6);
    }
  }
  if (emirShoutT > 0) emirShoutT = Math.max(0, emirShoutT - dt);
  if (comboN > 0 && t - lastCoinT >= COMBO_WINDOW) comboN = 0;
  if (boss) { updateBoss(dt); return; }
  const sp = speed * (pw === 'turbo' ? 1.7 : 1) * (emirBoostT > 0 ? 2.35 : 1) * (ev ? ev.mul : 1) * (revT > 0 ? REV_SLOW : 1) * (speedT > 0 ? 1.45 : 1);
  dist += sp * dt * (mode ? 2 : 1);
  run += sp * dt;
  speed = 15.5 + 15.5 * (1 - Math.exp(-run / 1500));
  scroll += sp * dt;
  px += (lane - px) * Math.min(1, dt * 14);
  tilt *= Math.pow(0.02, dt);
  if (jumpT >= 0) {
    jumpT += dt / jumpLen;
    if (jumpT >= 1) jumpT = -1;
  }
  if (inv > 0) inv -= dt;
  if (slideT > 0) slideT -= dt;
  updateEvents(dt);
  if (yav) updateYav(dt);
  if (pw) {
    pwT -= dt;
    if (pwT <= 0) endPower();
  }
  const flyTarget = pw === 'fly' ? 1 : 0;
  flyH += (flyTarget - flyH) * Math.min(1, dt * 7);

  for (const o of objs) o.d -= sp * dt;
  for (const o of objs) {
    if (o.air > 0) {
      o.air = Math.max(0, 1 - (o.d0 - o.d) / o.aird);
      if (o.air === 0) landThrown(o);
    }
  }
  updateHouses(dt, sp);
  for (const o of objs) {
    if (o.ty === 'kid' && !o.dead && o.d < 5 && emirBoostT <= 0) { startKid(o); return; }
  }

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

  if (st === 'play' && !boss && !mode && dashLeft <= 0 && jumpT < 0 && dist >= bossNext) startBoss();

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
    if (o.dead || o.air > 0 || o.lane !== cl || o.d > 0.6 || o.d < -0.2) continue;
    const T = TYPES[o.ty];
    if (T.coin) { collect(o); continue; }
    if (emirBoostT > 0 && o.ty === 'kid') { o.dead = 1; continue; }
    if (T.pw) { pick(o); continue; }
    if (emirBoostT > 0) {
      o.dead = 1;
      const ep = proj(Math.max(o.d, 0));
      spawnBurst(laneX(o.lane, ep), ep.y - 80 * ep.sc, 8, ['#ffd23f', '#fff6c0', '#ffffff'], 500, 900);
      SFX.effect('smash');
      continue;
    }
    if (T.seyit) {
      if (mode || pw) {
        o.dead = 1;
        SFX.effect('smash');
        continue;
      }
      if (inv > 0 || pw === 'fly' || flyH > 0.3) continue;
      if (jumpHt > YAV_JUMP_H - 1 && jh > 0.52) continue;
      startBeat(o);
      return;
    }
    if (T.low && jh > 0.35) { cleared(o); continue; }
    if (T.hang && slideT > 0) { cleared(o); continue; }
    if (jumpHt > YAV_JUMP_H - 1 && jh > 0.52) continue;
    if (inv > 0) continue;
    if (pw === 'fly' || flyH > 0.3) continue;
    if (pw) {
      o.dead = 1;
      flash = Math.max(flash, 0.3);
      SFX.effect('smash');
      continue;
    }
    if (tryShield(o)) continue;
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
  $('kidBtn').style.display = (adminOn && st === 'play' && !boss && !kid) ? 'flex' : 'none';
  $('testBoss').style.display = (testMode && st === 'play' && !boss) ? 'flex' : 'none';
  $('dist').textContent = Math.floor(dist) + ' m';
  $('cn').textContent = mode ? modeStars : coins + modeStarsTotal;
  $('coinLabel').textContent = mode ? 'SENTA' : '6/B';
  const pe = $('pw');
  const yavOn = !!yav && yav.leave < 0;
  if (pw || yavOn || emirBoostT > 0 || emirPrayerT > 0 || revT > 0 || fogT > 0 || speedT > 0 || stunT > 0 || shieldT > 0) {
    const parts = [];
    if (pw) parts.push((pw === 'turbo' ? 'DERS BOŞ ' : pw === 'exam' ? 'KONUŞMA SINAVI ' : 'POÇİ KAÇIŞI ') + Math.ceil(pwT) + 's');
    if (yavOn) parts.push('YAVUZ ' + Math.ceil(yav.t) + 's');
    if (emirPrayerT > 0) parts.push('NAMAZ MOLASI ' + Math.ceil(emirPrayerT) + 's');
    if (emirBoostT > 0) parts.push('İMAN GÜCÜ ' + Math.ceil(emirBoostT) + 's');
    if (revT > 0) parts.push('TERS KONTROL ' + Math.ceil(revT) + 's');
    if (fogT > 0) parts.push('SİS ' + Math.ceil(fogT) + 's');
    if (speedT > 0) parts.push('HIZLANDIN ' + Math.ceil(speedT) + 's');
    if (stunT > 0) parts.push('SERSEMLEDİN ' + Math.ceil(stunT) + 's');
    if (shieldT > 0) parts.push('KALKAN ' + Math.ceil(shieldT) + 's');
    pe.hidden = false;
    pe.style.display = 'flex';
    pe.textContent = parts.join(' · ');
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

  if (kind === 'teneke') {
    const bw = h * 0.62;
    g.fillStyle = '#1d6fd1';
    rr(-bw / 2, -h * 0.9, bw, h * 0.9, h * 0.07);
    g.fill();
    g.fillStyle = '#e8f1ff';
    g.fillRect(-bw / 2, -h * 0.62, bw, h * 0.26);
    g.fillStyle = '#1d6fd1';
    g.font = '900 ' + Math.max(6, h * 0.17) + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SU', 0, -h * 0.49);
    g.fillStyle = '#0f4a96';
    g.fillRect(-bw * 0.28, -h * 1.0, bw * 0.56, h * 0.11);
    g.fillStyle = '#7fb4f5';
    g.fillRect(-bw * 0.36, -h * 0.84, bw * 0.12, h * 0.7);
  } else if (kind === 'koni') {
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

  if (o.air > 0) { drawThrown(o, p, T, far); return; }

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
  if (o.ty === 'kid') {
    const hh = T.h * p.sc, j = (Math.random() - 0.5) * 10 * p.sc;
    g.save();
    g.shadowColor = '#2a55ff';
    g.shadowBlur = 20 + 30 * p.sc;
    drawSprite('kid67', x + j, p.y - 150 * p.sc - Math.abs(Math.sin(t * 3)) * 20 * p.sc, hh, far * (0.55 + 0.4 * Math.random()), 0);
    g.restore();
    return;
  }
  if (o.ty === 'borb') {
    const r = T.h * 0.5 * p.sc;
    const y = p.y - (100 + 12 * Math.sin(t * 5 + o.d)) * p.sc - r * 0.4;
    g.save();
    g.globalAlpha = far;
    const gl = g.createRadialGradient(x, y, 2, x, y, r * 2.1);
    gl.addColorStop(0, 'rgba(255,230,120,.8)');
    gl.addColorStop(1, 'rgba(255,200,60,0)');
    g.fillStyle = gl;
    g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    drawStar(x, y, r * 1.1, t * 3 + o.d);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x, y, r * 0.3, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = Math.max(1.5, r * 0.07);
    g.beginPath();
    g.arc(x, y, r * 1.45, t * 4, t * 4 + 4.2);
    g.stroke();
    g.restore();
    return;
  }
  if (o.ty === 'emir') {
    const hh = T.h * p.sc;
    const hop = Math.abs(Math.sin(t * 5 + o.d)) * 12 * p.sc;
    shadow(x, p.y, hh * 0.62);
    g.save();
    g.shadowColor = '#7dffb2';
    g.shadowBlur = 18 + 30 * p.sc;
    drawSprite('emir', x, p.y - hop, hh, far);
    g.restore();
    const fs = Math.max(10, 42 * p.sc);
    g.save();
    g.globalAlpha = far;
    g.font = '900 ' + fs + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(2, fs * 0.16);
    g.strokeStyle = '#10251b';
    g.fillStyle = '#7dffb2';
    g.strokeText('EMİR', x, p.y - hh - fs * 0.7 - hop);
    g.fillText('EMİR', x, p.y - hh - fs * 0.7 - hop);
    g.restore();
    return;
  }
  if (RARE_DEF[o.ty]) {
    drawRare(o, p, x, far, o.ty, RARE_DEF[o.ty], '#d6e4ff', '#0b1226', '#e8f0ff');
    if (o.ty === 'ezra') {                                    // eline aldığı sis topu (namlu ileriye bakar)
      const hh = TYPES.ezra.h * p.sc;
      g.save();
      g.globalAlpha = far;
      g.translate(x + hh * 0.2, p.y - hh * 0.46);
      g.rotate(-0.12);
      g.fillStyle = '#2a2f3a'; rr(-hh * 0.04, -hh * 0.3, hh * 0.08, hh * 0.34, hh * 0.015); g.fill();
      g.fillStyle = '#6b7385'; rr(-hh * 0.055, -hh * 0.34, hh * 0.11, hh * 0.06, hh * 0.02); g.fill();
      g.fillStyle = 'rgba(230,235,245,.8)';
      g.beginPath(); g.arc(0, -hh * 0.4, hh * 0.05 + Math.sin(t * 6) * hh * 0.008, 0, 7); g.fill();
      g.restore();
    }
    return;
  }
  if (o.ty === 'niyazi') { drawRare(o, p, x, far, 'niyazi', 'NİYAZİ', '#ff8a3d', '#2a1206', '#ffb070'); return; }
  if (o.ty === 'mustafa') { drawRare(o, p, x, far, 'mustafa', 'MUSTAFA EYMEN', '#6bd0ff', '#06202e', '#9fe3ff'); return; }
  if (o.ty === 'yavuz') {
    const hh = T.h * p.sc;
    const hop = Math.abs(Math.sin(t * 5 + o.d)) * 14 * p.sc;
    shadow(x, p.y, hh * 0.6);
    g.save();
    g.shadowColor = '#ffd23f';
    g.shadowBlur = 10 + 36 * p.sc;
    drawSprite('yavuz', x, p.y - hop, hh, far);
    g.restore();
    const fs = Math.max(10, 44 * p.sc);
    g.save();
    g.globalAlpha = far;
    g.font = '900 ' + fs + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(2, fs * 0.16);
    g.strokeStyle = '#1a1206';
    g.fillStyle = '#ffd23f';
    g.strokeText('YAVUZ', x, p.y - hh - fs * 0.7 - hop);
    g.fillText('YAVUZ', x, p.y - hh - fs * 0.7 - hop);
    g.restore();
    return;
  }
  if (T.pw) {
    const r = T.h * 0.5 * p.sc;
    const y = p.y - (120 + 16 * Math.sin(t * 4 + o.d)) * p.sc - r;
    drawPowerup(T.avatar, x, y, r, far);
    return;
  }
  if (T.hang) { drawHang(x, p, far); return; }
  shadow(x, p.y, T.h * p.sc * 0.7);
  if (o.bs) {
    const lift = Math.max(0, (o.d - 9) / 6) * 300;
    g.save();
    g.shadowColor = T.low ? 'rgba(255,205,60,.95)' : 'rgba(255,60,60,.95)';
    g.shadowBlur = 8 + 22 * p.sc;
    drawProp(T.prop, x, p.y - lift * p.sc, T.h * p.sc, far);
    g.restore();
    return;
  }
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

function drawYavuz(front) {
  if (!yav) return;
  const isFront = yav.ent < 0.45 && yav.leave < 0;
  if (isFront !== front) return;
  const p = proj(0);
  const e = 1 - Math.pow(1 - yav.ent, 3);
  const lv = yav.leave >= 0 ? yav.leave : 0;
  const k = yav.thr >= 0 ? Math.sin(Math.PI * yav.thr) : 0;
  const bob = (yav.thr >= 0 || lv > 0 || jumpT >= 0) ? 0 : Math.abs(Math.sin(t * 12 + 1.3)) * 12;
  const x = laneX(yav.px, p) + (-72 * e + 58 * k) - 230 * lv;
  const feet = p.y - 30 * e - bob - 90 * k - 60 * lv;
  const h = 345 * (1 - 0.07 * e) * (1 + 0.05 * k) * (1 - 0.3 * lv);
  const alpha = 1 - lv;
  shadow(laneX(yav.px, p) + (-72 * e) - 230 * lv, p.y - 30 * e, 200 * (1 - 0.3 * lv), 0.27 * alpha);
  g.save();
  g.shadowColor = '#ffd23f';
  g.shadowBlur = 22 + 8 * Math.sin(t * 6);
  drawSprite('yavuz', x, feet, h, alpha, 0.2 * k + Math.sin(t * 12 + 1.3) * 0.02);
  g.restore();
}

function drawPlayer() {
  const p = proj(0);
  const jumpH = jumpT >= 0 ? Math.sin(Math.PI * jumpT) * jumpHt : 0;
  const fly = flyH * (300 + 18 * Math.sin(t * 5));
  const bob = (jumpT >= 0 || st === 'hit' || st === 'over') ? 0 : Math.abs(Math.sin(t * 12)) * 14;
  const fallen = st === 'hit' || st === 'over';
  let x = laneX(px, p);
  let y = p.y - fly - bob;
  let rot = tilt + Math.sin(t * 12) * 0.03;
  let spr = charDef().spr;
  if (bumpT > 0) {
    const bu = 1 - bumpT / BUMP_TIME;
    const be = Math.sin(Math.PI * clamp((bu - 0.2) / 0.8, 0, 1));
    x -= 120 * be; y -= 70 * be; rot -= 0.55 * be;
  }

  if (fallen) {
    const k = clamp(caughtT, 0, 1);
    if (prof.ch === 'kosan') spr = 'duran';
    rot = k * 1.42;
    x += k * 80;
    y = p.y + k * 16;
  } else {
    y -= jumpH;
    if (kidLift > 0) {
      y -= kidLift;
      x += (Math.random() - 0.5) * 8;
      rot += 0.25;
    }
    if (prof.trail && st === 'play' && Math.random() < 0.8) {
      const tr = TRAILS.find(q => q.id === prof.trail);
      if (tr && tr.cols) particles.push({ x: x + (Math.random() - 0.5) * 60, y: p.y - 10 - Math.random() * 40, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120, life: 0.5 + Math.random() * 0.4, col: rnd(tr.cols), sz: 6 + Math.random() * 8, g: 0 });
    }
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
  } else if (prof.aura) {
    const au = AURAS.find(q => q.id === prof.aura);
    if (au) { g.shadowColor = au.col; g.shadowBlur = 40 + 10 * Math.sin(t * 6); }
  }
  const pal = inv > 0 ? (Math.sin(t * 30) > 0 ? 1 : 0.35) : 1;
  if (slideT > 0 && !fallen) drawPosed(spr, x, y, 380, pal, rot + 0.28, 1.12, 0.6);
  else drawSprite(spr, x, y, 380, pal, rot);
  g.restore();
  if (shield > 0 && !fallen) {
    g.save();
    g.globalAlpha = 0.6 + 0.2 * Math.sin(t * 5);
    g.strokeStyle = '#ffd23f';
    g.lineWidth = 8;
    g.beginPath();
    g.ellipse(x, y - 190, 150, 215, 0, 0, 7);
    g.stroke();
    g.restore();
  }

  if (stunT > 0 && !fallen) {
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + i * 2.1;
      drawStar(x + Math.cos(a) * 70, y - 390 + Math.sin(a) * 18, 14, a);
    }
  }
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

/* ---------- MERVE MİNA boss fight ---------- */
const TINT = {};
function tinted(name, color) {
  const im = IMG[name];
  if (!im || !im.complete || !im.naturalWidth) return null;
  const key = name + color;
  if (!TINT[key]) {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    TINT[key] = c;
  }
  return TINT[key];
}

function jag(x0, y0, x1, y1, n, amp) {
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const k = i / n;
    pts.push([x0 + (x1 - x0) * k + (Math.random() - 0.5) * amp, y0 + (y1 - y0) * k + (Math.random() - 0.5) * amp]);
  }
  pts.push([x1, y1]);
  return pts;
}

function makeCrack(cx, cy, scale = 1, life = 3.2) {
  const N = 15, rays = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const len = (260 + Math.random() * 480) * scale;
    rays.push(jag(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, 7, 26 * scale));
  }
  const rings = [];
  for (const idx of [1, 2, 3, 4, 5]) {
    for (let i = 0; i < N; i++) {
      const a = rays[i][idx], b = rays[(i + 1) % N][idx];
      if (a && b && Math.random() > 0.3) rings.push({ a, b, k: idx / 7 });
    }
  }
  return { x: cx, y: cy, t: 0, life, rays, rings };
}

function drawCrack(c) {
  const grow = Math.min(1, c.t / 0.24);
  const fade = c.t > c.life ? Math.max(0, 1 - (c.t - c.life) / 0.7) : 1;
  g.save();
  g.globalAlpha = fade;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,.65)';
  g.shadowBlur = 8;
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? 'rgba(255,255,255,.95)' : 'rgba(150,200,255,.45)';
    g.lineWidth = pass ? 2.6 : 6.5;
    g.beginPath();
    for (const r of c.rays) {
      const m = r.length - 1;
      const f = m * grow;
      const full = Math.floor(f);
      g.moveTo(r[0][0], r[0][1]);
      for (let i = 1; i <= full; i++) g.lineTo(r[i][0], r[i][1]);
      if (full < m) {
        const fr = f - full;
        g.lineTo(r[full][0] + (r[full + 1][0] - r[full][0]) * fr, r[full][1] + (r[full + 1][1] - r[full][1]) * fr);
      }
    }
    for (const s of c.rings) {
      if (grow < s.k) continue;
      g.moveTo(s.a[0], s.a[1]);
      g.lineTo(s.b[0], s.b[1]);
    }
    g.stroke();
  }
  g.restore();
}

function makeBodyCracks(im) {
  const w0 = im.naturalWidth, h0 = im.naturalHeight, cx = w0 * 0.5, cy = h0 * 0.42;
  const lines = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const len = h0 * (0.3 + Math.random() * 0.35);
    const main = jag(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, 8, 22);
    lines.push(main);
    const b0 = main[3 + ((Math.random() * 3) | 0)];
    const a2 = a + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.5);
    lines.push(jag(b0[0], b0[1], b0[0] + Math.cos(a2) * len * 0.4, b0[1] + Math.sin(a2) * len * 0.4, 4, 14));
  }
  return { lines, cv: document.createElement('canvas') };
}

function makeShards(im, x, feet, h, sx, sy) {
  const sc = h / im.naturalHeight;
  const w = im.naturalWidth * sc * sx, hh = h * sy;
  const left = x - w / 2, top = feet - hh;
  const COLS = 7, ROWS = 9;
  const cw = w / COLS, ch = hh / ROWS;
  const bx = x, by = top + hh * 0.45;
  let data = null;
  try {
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const cx = c.getContext('2d');
    cx.drawImage(im, 0, 0);
    data = cx.getImageData(0, 0, c.width, c.height);
  } catch (e) { data = null; }
  const tw = im.naturalWidth / COLS, th = im.naturalHeight / ROWS;
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (data) {
        let a = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const px0 = Math.min(data.width - 1, Math.floor(c * tw + tw * (i + 0.5) / 3));
            const py0 = Math.min(data.height - 1, Math.floor(r * th + th * (j + 0.5) / 3));
            a += data.data[(py0 * data.width + px0) * 4 + 3];
          }
        }
        if (a < 60) continue;
      }
      const x0 = left + c * cw, y0 = top + r * ch;
      const tris = Math.random() < 0.5
        ? [[[0, 0], [cw, 0], [cw, ch]], [[0, 0], [cw, ch], [0, ch]]]
        : [[[0, 0], [cw, 0], [0, ch]], [[cw, 0], [cw, ch], [0, ch]]];
      for (const tri of tris) {
        const gx = x0 + (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
        const gy = y0 + (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const dx = gx - bx, dy = gy - by, dl = Math.hypot(dx, dy) || 1;
        const pwr = 380 + Math.random() * 700;
        out.push({
          x: gx, y: gy,
          vx: dx / dl * pwr + (Math.random() - 0.5) * 200,
          vy: dy / dl * pwr * 0.8 - 450 - Math.random() * 500,
          rot: 0, vr: (Math.random() - 0.5) * 14,
          life: 2.2 + Math.random() * 0.9,
          pts: tri.map(q => [x0 + q[0] - gx, y0 + q[1] - gy]),
          ox: left - gx, oy: top - gy, w, h: hh
        });
      }
    }
  }
  return out;
}

function startBoss() {
  endPower();
  flyH = 0; dashLeft = 0; inv = 0;
  objs = [];
  boss = {
    ph: 'intro', t: 0, ts: 1, slow: 0, freeze: 0,
    hp: BOSS_HP, lives: BOSS_LIVES, rage: false,
    flinch: 0, thr: -1, q: [], ft: 0, cd: 0.6, wave: 0, waveOn: false,
    counter: null, rings: [], cracks: [], crackBody: null, shards: null,
    segFlash: [0, 0, 0, 0, 0], mt: 0, ms: 0, flags: {}, hint: false, title: 0
  };
  SFX.effect('bossWarn');
  updateHud();
}

function endBoss() {
  bump('boss');
  if (boss && boss.lives === BOSS_LIVES) bump('bossClean');
  boss = null;
  objs = [];
  coins += BOSS_REWARD;
  bossNext = (Math.floor(dist / BOSS_EVERY) + 1) * BOSS_EVERY;
  spawnAt = 66;
  seyitNext = Math.max(seyitNext, run + 150);
  inv = 2.2;
  flash = 0.8;
  shake = 0.6;
  SFX.effect('win');
  flashMessage('BOSS YENİLDİ! +' + BOSS_REWARD + ' ★');
  updateHud();
}

function startWave() {
  const b = boss;
  const w = b.wave++;
  const kinds = ['gap', 'jump', 'zig'];
  const kind = w < 3 ? kinds[w] : rnd(kinds);
  const LOW = ['koni', 'bariyer', 'kitap', 'sise'], TALL = ['pano', 'cop', 'dolap'];
  const base = b.ft + 1.0;
  const step = b.rage ? 0.7 : 0.85;
  const row = (at, gapLane, allLow) => {
    for (const L of [-1, 0, 1]) {
      if (L === gapLane) continue;
      b.q.push({ at, lane: L, ty: allLow || Math.random() < 0.55 ? rnd(LOW) : rnd(TALL) });
    }
  };
  let last = base, orbLane = 'cur';
  if (kind === 'gap') {
    const gl = rnd([-1, 0, 1]);
    row(base, gl, false);
    orbLane = gl;
  } else if (kind === 'jump') {
    row(base, 9, true);
    orbLane = 'cur';
    last = base + 0.1;
  } else {
    let gl = rnd([-1, 0, 1]);
    for (let i = 0; i < 3; i++) {
      row(base + i * step, gl, false);
      last = base + i * step;
      orbLane = gl;
      const opts = [-1, 0, 1].filter(L => L !== gl && Math.abs(L - gl) === 1);
      gl = rnd(opts);
    }
  }
  b.q.push({ at: last + (kind === 'jump' ? 0.6 : 0.45), lane: orbLane, orb: true });
  b.waveOn = true;
}

function bossHurt(o) {
  if (tryShield(o)) return;
  o.dead = 1;
  buzz(100);
  boss.lives--;
  const p = proj(0);
  spawnBurst(laneX(px, p), p.y - 160, 14, ['#ff4d4d', '#ffffff', '#ffd23f'], 620, 1300);
  if (boss.lives <= 0) {
    hit(o);
    return;
  }
  inv = 1.6;
  flash = Math.max(flash, 0.55);
  shake = 1;
  SFX.effect('smash');
  SFX.effect('bossOuch');
}

function bossOrb(o) {
  o.dead = 1;
  const p = proj(0);
  const jH = jumpT >= 0 ? Math.sin(Math.PI * jumpT) * jumpHt : 0;
  boss.counter = { t: 0, x0: laneX(px, p), y0: p.y - 220 - jH, trail: [] };
  SFX.effect('orb');
  flash = Math.max(flash, 0.25);
}

function bossDamage() {
  const b = boss;
  b.counter = null;
  b.hp--;
  b.segFlash[Math.max(0, b.hp)] = 1;
  b.flinch = 1;
  b.freeze = 0.07;
  b.slow = 0.25;
  flash = Math.max(flash, 0.6);
  shake = 1.3;
  SFX.effect('bossHit');
  spawnBurst(VP, BOSS_FEET - 300, 22, ['#ffffff', '#ffd23f', '#ff4d6d', '#c46bff'], 900, 1500);
  b.rings.push({ x: VP, y: BOSS_FEET - 300, t: 0, air: true });
  if (b.hp <= 0) {
    b.ph = 'defeat';
    b.t = 0;
    b.q = [];
    b.flags = {};
    objs = [];
    const im = IMG.merve;
    if (im && im.naturalWidth) b.crackBody = makeBodyCracks(im);
    SFX.effect('bossRage');
    return;
  }
  if (b.hp === 2 && !b.rage) {
    b.rage = true;
    flashMessage('MERVE ÖFKELENDİ!');
    SFX.effect('bossRage');
  } else {
    flashMessage('VURDUN!');
  }
}

function bossMusic(dt) {
  const b = boss;
  b.ms += dt;
  const step = b.rage ? 0.15 : 0.19;
  while (b.ms >= step) {
    b.ms -= step;
    const i = b.mt++ % 8;
    if (i === 0 || i === 4 || (b.rage && i === 7)) SFX.tone(130, 38, 0.16, 'sine', 0.3);
    if (i === 2 || i === 6) SFX.noise(0.09, 0.1, 4200);
    SFX.noise(0.025, 0.03, 9000);
    const bass = [55, 55, 82, 55, 65, 65, 73, 49][i];
    SFX.tone(bass, bass, step * 0.9, 'sawtooth', 0.045);
    if (b.rage && i % 2) {
      const lead = [440, 523, 659, 523][(i - 1) / 2];
      SFX.tone(lead, lead, step * 0.8, 'square', 0.02);
    }
  }
}

function updateBoss(dt) {
  const b = boss;
  for (const r of b.rings) r.t += dt * 1.5;
  b.rings = b.rings.filter(r => r.t < 1);
  for (const c of b.cracks) c.t += dt;
  b.cracks = b.cracks.filter(c => c.t < c.life + 0.7);
  for (let i = 0; i < 5; i++) if (b.segFlash[i] > 0) b.segFlash[i] = Math.max(0, b.segFlash[i] - dt * 2.2);
  b.flinch = Math.max(0, b.flinch - dt * 2.4);
  if (b.freeze > 0) { b.freeze -= dt; return; }
  b.slow = Math.max(0, b.slow - dt);
  b.ts = (b.ph === 'defeat' && b.t < 0.9) ? 0.4 : (b.slow > 0 ? 0.28 : 1);
  const sdt = dt * b.ts;

  const sk = b.ph === 'intro' ? Math.max(0.35, 1 - b.t * 0.25) : b.ph === 'fight' ? 0.75 : Math.max(0, 0.6 - b.t * 0.15);
  scroll += 15.5 * sk * sdt;
  px += (lane - px) * Math.min(1, dt * 14);
  tilt *= Math.pow(0.02, dt);
  if (jumpT >= 0) {
    jumpT += sdt / jumpLen;
    if (jumpT >= 1) jumpT = -1;
  }
  if (inv > 0) inv -= dt;
  if (slideT > 0) slideT -= dt;
  if (yav) updateYav(dt, true);
  if (b.thr >= 0) {
    b.thr += sdt / 0.45;
    if (b.thr >= 1) b.thr = -1;
  }
  b.t += sdt;
  const jh = jumpT >= 0 ? Math.sin(Math.PI * jumpT) : 0;

  if (b.ph === 'intro') {
    const t0 = b.t;
    if (t0 > 0.8 && t0 < 2.3) {
      shake = Math.max(shake, 0.12 + (t0 - 0.8) * 0.22);
      if (Math.random() < dt * 22) {
        particles.push({
          x: Math.random() * W, y: 120 + Math.random() * 120,
          vx: (Math.random() - 0.5) * 40, vy: 180 + Math.random() * 260,
          life: 0.9 + Math.random() * 0.6, col: rnd(['#9aa3b5', '#c9ced8', '#6b7385']),
          sz: 5 + Math.random() * 9, g: 200
        });
      }
    }
    if (!b.flags.rumble && t0 >= 0.9) { b.flags.rumble = 1; SFX.effect('bossRumble'); }
    if (!b.flags.slam && t0 >= 2.3) {
      b.flags.slam = 1;
      flash = 1;
      shake = 2.3;
      SFX.effect('bossSlam');
      b.rings.push({ x: VP, y: BOSS_FEET, t: 0 });
      b.cracks.push(makeCrack(VP, BOSS_FEET - 240, 1, 3.0));
      spawnBurst(VP - 120, BOSS_FEET, 18, ['#9aa3b5', '#c9ced8', '#ffffff', '#6b7385'], 760, 1300);
      spawnBurst(VP + 120, BOSS_FEET, 18, ['#9aa3b5', '#c9ced8', '#ffffff', '#6b7385'], 760, 1300);
    }
    if (t0 >= 3.4) {
      b.title = Math.min(1, (t0 - 3.4) / 0.45);
      if (!b.flags.title) {
        b.flags.title = 1;
        flash = Math.max(flash, 0.5);
        shake = Math.max(shake, 1);
        SFX.effect('bossTitle');
      }
    }
    if (t0 >= 5.9) {
      b.ph = 'fight';
      b.t = 0;
      b.ft = 0;
      b.cd = 0.6;
      flashMessage('SAVAŞ BAŞLADI!');
    }
    return;
  }

  if (b.ph === 'defeat') {
    const t0 = b.t;
    if (!b.shards) {
      shake = Math.max(shake, 0.25 + t0 * 1.3);
      if (Math.random() < dt * 14) spawnBurst(VP + (Math.random() - 0.5) * 200, BOSS_FEET - 120 - Math.random() * 300, 3, ['#ffffff', '#ffd23f', '#ff4d6d'], 520, 1300);
      if (t0 >= 0.6) {
        const im = IMG.merve;
        const pose = bossPose(b);
        b.shards = (im && im.naturalWidth) ? makeShards(im, VP + pose.dx, BOSS_FEET + pose.dy + BOSS_H * 0.05, BOSS_H, pose.sx, pose.sy) : [];
        flash = 1;
        shake = 2.8;
        SFX.effect('shatter');
        b.rings.push({ x: VP, y: BOSS_FEET - 300, t: 0, air: true });
        b.cracks.push(makeCrack(VP, BOSS_FEET - 300, 1.5, 2.6));
        spawnBurst(VP, BOSS_FEET - 280, 36, ['#ffffff', '#ffd23f', '#ff4d6d', '#c46bff', '#9fd4ff'], 1100, 1500);
      }
    } else {
      for (const q of b.shards) {
        q.vy += 1900 * sdt;
        q.x += q.vx * sdt;
        q.y += q.vy * sdt;
        q.rot += q.vr * sdt;
        q.life -= sdt;
      }
      b.shards = b.shards.filter(q => q.life > 0);
    }
    if (t0 >= 1.2 && !b.flags.win) { b.flags.win = 1; SFX.effect('bossWin'); }
    if (t0 >= 4.7) endBoss();
    return;
  }

  /* fight */
  b.ft += sdt;
  bossMusic(dt);
  let threw = false;
  const rest = [];
  for (const it of b.q) {
    if (b.ft < it.at) { rest.push(it); continue; }
    if (it.orb) {
      const L = it.lane === 'cur' ? clamp(Math.round(px), -1, 1) : it.lane;
      objs.push({ ty: 'borb', lane: L, d: 15, bs: true, orb: true });
      if (!b.hint) { b.hint = true; flashMessage('YILDIZI TOPLA!'); }
    } else {
      objs.push({ ty: it.ty, lane: it.lane, d: 15, bs: true });
      threw = true;
    }
  }
  b.q = rest;
  if (threw) { b.thr = 0; SFX.effect('bossThrow'); }

  const SS = b.rage ? 19 : 16;
  const cl = Math.round(px);
  for (const o of objs) {
    if (!o.bs || o.dead) continue;
    o.d -= SS * sdt;
    if (o.orb) {
      if (o.lane === cl && o.d < 0.9 && o.d > -0.4 && jh < 0.5) bossOrb(o);
      continue;
    }
    if (o.lane !== cl || o.d > 0.6 || o.d < -0.2) continue;
    const T = TYPES[o.ty];
    if (T.low && jh > 0.35) continue;
    if (jumpHt > YAV_JUMP_H - 1 && jh > 0.52) continue;
    if (inv > 0) continue;
    bossHurt(o);
    if (st !== 'play') return;
  }
  objs = objs.filter(o => !o.dead && o.d > -1.3);

  if (b.counter) {
    const c = b.counter;
    c.t += sdt / 0.42;
    const k = Math.min(1, c.t);
    const k2 = k * k * (3 - 2 * k);
    c.trail.push([c.x0 + (VP - c.x0) * k2 - Math.sin(k2 * Math.PI) * 120, c.y0 + (BOSS_FEET - 300 - c.y0) * k2 - Math.sin(k2 * Math.PI) * 160]);
    if (c.trail.length > 14) c.trail.shift();
    if (c.t >= 1) {
      bossDamage();
      return;
    }
  }

  const active = b.q.length || objs.some(o => o.bs && !o.dead) || b.counter;
  if (!active) {
    if (b.waveOn) { b.waveOn = false; b.cd = b.rage ? 0.6 : 0.9; }
    b.cd -= sdt;
    if (b.cd <= 0) startWave();
  }
}

function bossPose(b) {
  const o = { vis: true, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 };
  if (b.ph === 'intro') {
    if (b.t < 1.8) o.vis = false;
    else if (b.t < 2.3) {
      const k = (b.t - 1.8) / 0.5;
      o.dy = -(1 - k * k) * 1300;
    } else {
      const k = b.t - 2.3;
      const sq = Math.exp(-k * 6) * Math.cos(k * 16) * 0.13;
      o.sy = 1 - sq;
      o.sx = 1 + sq * 0.7;
    }
  }
  if (b.ph !== 'intro' || b.t >= 2.3) o.dy += Math.sin(t * 2.2) * 7;
  if (b.thr >= 0) {
    const k = Math.sin(Math.PI * b.thr);
    o.rot += 0.05 * k;
    o.sy += 0.05 * k;
    o.dy += 10 * k;
  }
  if (b.flinch > 0) o.dx += (Math.random() - 0.5) * 44 * b.flinch;
  if (b.ph === 'defeat' && !b.shards) {
    const p = Math.min(1, b.t / 0.6);
    o.dx += (Math.random() - 0.5) * (8 + 46 * p);
    o.dy += (Math.random() - 0.5) * 10 * p;
  }
  if (b.ph === 'defeat' && b.shards) o.vis = false;
  return o;
}

function drawBoss() {
  const b = boss, im = IMG.merve;
  if (!im || !im.complete || !im.naturalWidth) return;
  const o = bossPose(b);
  if (b.ph === 'intro') {
    if (b.t > 1.2 && b.t < 2.3) {
      const k = clamp((b.t - 1.2) / 1.1, 0, 1);
      shadow(VP, BOSS_FEET, 700 * k, 0.55 * k);
    } else if (b.t >= 2.3) shadow(VP, BOSS_FEET + 6, 560, 0.45);
  } else if (!b.shards) shadow(VP, BOSS_FEET + 6, 560, 0.45);

  const w = BOSS_H * im.naturalWidth / im.naturalHeight;
  if (o.vis) {
    const x = VP + o.dx, feet = BOSS_FEET + o.dy + BOSS_H * 0.05;
    g.save();
    if (b.rage || b.ph === 'defeat') {
      g.shadowColor = 'rgba(255,40,40,.9)';
      g.shadowBlur = 50 + 20 * Math.sin(t * 10);
    } else {
      g.shadowColor = 'rgba(190,60,255,.75)';
      g.shadowBlur = 34;
    }
    g.translate(x, feet);
    g.rotate(o.rot);
    g.scale(o.sx, o.sy);
    g.drawImage(im, -w / 2, -BOSS_H, w, BOSS_H);
    g.restore();
    if (b.flinch > 0) {
      const tc = tinted('merve', '#ff2a2a');
      if (tc) {
        g.save();
        g.globalAlpha = b.flinch * 0.75;
        g.translate(x, feet);
        g.rotate(o.rot);
        g.scale(o.sx, o.sy);
        g.drawImage(tc, -w / 2, -BOSS_H, w, BOSS_H);
        g.restore();
      }
    }
    if (b.ph === 'defeat' && b.crackBody) {
      const bc = b.crackBody, p = Math.min(1, b.t / 0.6);
      bc.cv.width = im.naturalWidth;
      bc.cv.height = im.naturalHeight;
      const c2 = bc.cv.getContext('2d');
      c2.lineCap = 'round';
      c2.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        c2.strokeStyle = pass ? '#ffffff' : 'rgba(255,210,63,.8)';
        c2.lineWidth = pass ? 3 : 8;
        c2.beginPath();
        for (const ln of bc.lines) {
          const m = ln.length - 1, f = m * p, full = Math.floor(f);
          c2.moveTo(ln[0][0], ln[0][1]);
          for (let i = 1; i <= full; i++) c2.lineTo(ln[i][0], ln[i][1]);
          if (full < m) {
            const fr = f - full;
            c2.lineTo(ln[full][0] + (ln[full + 1][0] - ln[full][0]) * fr, ln[full][1] + (ln[full + 1][1] - ln[full][1]) * fr);
          }
        }
        c2.stroke();
      }
      c2.globalCompositeOperation = 'destination-in';
      c2.drawImage(im, 0, 0);
      g.save();
      g.translate(x, feet);
      g.rotate(o.rot);
      g.scale(o.sx, o.sy);
      g.drawImage(bc.cv, -w / 2, -BOSS_H, w, BOSS_H);
      g.restore();
    }
  }
  if (b.shards) {
    for (const q of b.shards) {
      g.save();
      g.globalAlpha = Math.min(1, q.life * 1.2);
      g.translate(q.x, q.y);
      g.rotate(q.rot);
      g.beginPath();
      g.moveTo(q.pts[0][0], q.pts[0][1]);
      g.lineTo(q.pts[1][0], q.pts[1][1]);
      g.lineTo(q.pts[2][0], q.pts[2][1]);
      g.closePath();
      g.clip();
      g.drawImage(im, q.ox, q.oy, q.w, q.h);
      g.restore();
    }
  }
}

function drawBossFloor() {
  const b = boss;
  if (b.ph !== 'fight' || !b.q.length) return;
  const pulse = 0.5 + 0.5 * Math.sin(t * 16);
  const p0 = proj(0.3), p1 = proj(15);
  for (const it of b.q) {
    if (it.orb) continue;
    const low = TYPES[it.ty].low;
    const rgb = low ? '255,205,60' : '255,60,60';
    g.save();
    g.fillStyle = 'rgba(' + rgb + ',' + (0.2 + 0.16 * pulse) + ')';
    g.beginPath();
    g.moveTo(laneX(it.lane - 0.44, p1), p1.y);
    g.lineTo(laneX(it.lane + 0.44, p1), p1.y);
    g.lineTo(laneX(it.lane + 0.44, p0), p0.y);
    g.lineTo(laneX(it.lane - 0.44, p0), p0.y);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(' + rgb + ',.85)';
    g.lineWidth = 4;
    g.lineJoin = 'round';
    for (let k = 0; k < 5; k++) {
      const d = (t * 9 + k * 3.2) % 15;
      const p = proj(d);
      const cx = laneX(it.lane, p), hw = (2 / 3) * p.h * 0.3, hh = (2 / 3) * p.h * 0.22;
      g.beginPath();
      g.moveTo(cx - hw, p.y - hh);
      g.lineTo(cx, p.y);
      g.lineTo(cx + hw, p.y - hh);
      g.stroke();
    }
    g.restore();
  }
}

function bossBarK(b) {
  if (b.ph === 'intro') {
    if (b.t < 0.7) return easeOutCubic(b.t / 0.7);
    if (b.t < 5.2) return 1;
    return 1 - easeOutCubic(clamp((b.t - 5.2) / 0.7, 0, 1));
  }
  if (b.ph === 'defeat') {
    if (b.t < 0.5) return easeOutCubic(b.t / 0.5);
    if (b.t < 4.0) return 1;
    return 1 - easeOutCubic(clamp((b.t - 4.0) / 0.6, 0, 1));
  }
  return 0;
}

function bossText(txt, x, y, size, fill, stroke, spacing, maxW = 860) {
  const font = s => '900 ' + s + 'px "Arial Black","Segoe UI",system-ui,sans-serif';
  g.font = font(size);
  const meas = () => {
    let tot = 0;
    for (const ch of txt) tot += g.measureText(ch).width + spacing;
    return tot - spacing;
  };
  let tot = meas();
  if (tot > maxW) {
    size = size * maxW / tot;
    spacing = spacing * maxW / tot;
    g.font = font(size);
    tot = meas();
  }
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(4, size * 0.12);
  let cx = x - tot / 2;
  for (const ch of txt) {
    const cw = g.measureText(ch).width;
    if (stroke) { g.strokeStyle = stroke; g.strokeText(ch, cx, y); }
    g.fillStyle = fill;
    g.fillText(ch, cx, y);
    cx += cw + spacing;
  }
}

function drawHeart(x, y, s, fill, stroke) {
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.8, y - s * 1.1, x, y - s * 0.35);
  g.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.lineWidth = 3;
  g.strokeStyle = stroke;
  g.stroke();
}

function drawBossHud(b, alpha) {
  const x0 = 180, y0 = 258, w = 580, h = 30, n = BOSS_HP, gap = 10;
  const sw = (w - gap * (n - 1)) / n;
  g.save();
  g.globalAlpha = alpha;
  g.font = '900 30px "Arial Black","Segoe UI",system-ui,sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.lineWidth = 6;
  g.lineJoin = 'round';
  g.strokeStyle = '#12060a';
  g.fillStyle = b.rage ? '#ffb0b0' : '#ffd9e0';
  g.strokeText('MERVE MİNA', x0, y0 - 6);
  g.fillText('MERVE MİNA', x0, y0 - 6);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (sw + gap);
    g.fillStyle = 'rgba(10,6,14,.78)';
    rr(x, y0, sw, h, 8);
    g.fill();
    if (i < b.hp) {
      const gr = g.createLinearGradient(0, y0, 0, y0 + h);
      gr.addColorStop(0, b.rage ? '#ff5a3c' : '#ff6b8a');
      gr.addColorStop(1, b.rage ? '#a50f0f' : '#c4163f');
      g.fillStyle = gr;
      rr(x + 3, y0 + 3, sw - 6, h - 6, 6);
      g.fill();
    } else if (b.segFlash[i] > 0) {
      g.fillStyle = 'rgba(255,255,255,' + b.segFlash[i] + ')';
      rr(x + 3, y0 + 3, sw - 6, h - 6, 6);
      g.fill();
    }
    g.lineWidth = 3;
    g.strokeStyle = b.rage ? '#ff5a5a' : '#ffd23f';
    rr(x, y0, sw, h, 8);
    g.stroke();
  }
  if (b.ph === 'fight' || st === 'hit') {
    for (let i = 0; i < BOSS_LIVES; i++) {
      const on = i < b.lives;
      g.globalAlpha = alpha * (on && inv > 0 && Math.sin(t * 30) > 0 ? 0.4 : 1);
      drawHeart(x0 + 24 + i * 62, 346, 22, on ? '#ff3b57' : 'rgba(20,10,16,.75)', on ? '#ffffff' : '#7a5a66');
    }
  }
  g.restore();
}

function drawBossFx(dt) {
  const b = boss;
  if (b.ph === 'intro' && b.t < 2.4) {
    const a = (0.1 + 0.1 * Math.sin(b.t * 14)) * Math.min(1, b.t * 2) * (b.t > 1.9 ? Math.max(0, (2.4 - b.t) / 0.5) : 1);
    g.fillStyle = 'rgba(255,0,0,' + a + ')';
    g.fillRect(0, 0, W, H);
  }
  for (const r of b.rings) {
    const k = r.t, rx = 80 + k * 760;
    g.save();
    g.globalAlpha = (1 - k) * 0.85;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 10 * (1 - k) + 2;
    g.beginPath();
    g.ellipse(r.x, r.y, rx, r.air ? rx : rx * 0.22, 0, 0, 7);
    g.stroke();
    g.restore();
  }
  if (b.counter) {
    const c = b.counter;
    for (let i = 0; i < c.trail.length; i++) {
      const q = c.trail[i], f = (i + 1) / c.trail.length;
      g.save();
      g.globalAlpha = f * 0.6;
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.arc(q[0], q[1], 30 * f, 0, 7);
      g.fill();
      g.restore();
    }
    const q = c.trail[c.trail.length - 1];
    if (q) {
      const k = Math.min(1, c.t);
      drawStar(q[0], q[1], 62 * (1 - 0.4 * k), t * 14);
      g.save();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(q[0], q[1], 16, 0, 7);
      g.fill();
      g.restore();
    }
  }
  for (const c of b.cracks) drawCrack(c);

  const bk = bossBarK(b);
  if (bk > 0) {
    const bh = 150 * bk;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, bh);
    g.fillRect(0, H - bh, W, bh);
  }

  if (b.ph === 'intro') {
    if (b.t > 0.3 && b.t < 2.1) {
      g.save();
      g.globalAlpha = Math.sin(b.t * 18) > -0.3 ? 1 : 0.25;
      bossText('UYARI!', W / 2, 640, 170, '#ff2a2a', '#ffffff', 10);
      bossText('BÜYÜK TEHLİKE YAKLAŞIYOR', W / 2, 770, 40, '#ffd23f', '#1a0a0a', 4);
      g.restore();
    }
    if (b.t >= 3.4 && b.t < 5.5) {
      const k = b.title, fo = b.t > 5.0 ? Math.max(0, 1 - (b.t - 5.0) / 0.5) : 1;
      const sc = 1 + (1 - easeOutBack(k)) * 1.2;
      g.save();
      g.globalAlpha = Math.min(1, k * 2) * fo;
      g.translate(W / 2 + (Math.random() - 0.5) * 6 * (1 - k), 1010);
      g.scale(sc, sc);
      g.shadowColor = 'rgba(255,40,90,.9)';
      g.shadowBlur = 40;
      bossText('MERVE MİNA', 0, 0, 112, '#ffffff', '#b0102e', 6);
      g.shadowBlur = 0;
      bossText('BOSS SAVAŞI', 0, 92, 42, '#ffd23f', '#1a0a0a', 14);
      g.restore();
    }
    if (b.t >= 3.4) drawBossHud(b, b.t > 5.0 ? 1 : Math.min(1, b.title));
  } else if (b.ph === 'fight') {
    drawBossHud(b, 1);
  } else if (b.ph === 'defeat') {
    drawBossHud(b, b.t < 3.6 ? 1 : Math.max(0, 1 - (b.t - 3.6) / 0.4));
    if (b.t >= 1.2 && b.t < 4.3) {
      const k = clamp((b.t - 1.2) / 0.5, 0, 1), fo = b.t > 3.8 ? Math.max(0, 1 - (b.t - 3.8) / 0.5) : 1;
      const sc = 1 + (1 - easeOutBack(k)) * 0.9;
      g.save();
      g.globalAlpha = k * fo;
      g.translate(W / 2, 1000);
      g.scale(sc, sc);
      g.shadowColor = 'rgba(255,210,63,.9)';
      g.shadowBlur = 36;
      bossText('MERVE MİNA', 0, -70, 54, '#ffffff', '#12060a', 8);
      bossText('YENİLDİ!', 0, 22, 124, '#ffd23f', '#7a3d00', 6);
      g.shadowBlur = 0;
      if (b.t >= 2.0) bossText('+' + BOSS_REWARD + ' ★  BOSS ÖDÜLÜ', 0, 118, 40, '#ffffff', '#12060a', 5);
      g.restore();
    }
  }
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
  stopYav();
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

/* ---------- namaz animasyonu ---------- */
const PRAYER_SEQ = [
  { n: 'KIYAM', d: 1.3, leg: 0, rot: 0 },
  { n: 'RÜKÛ', d: 0.9, leg: 0, rot: 1.45 },
  { n: 'KIYAM', d: 0.7, leg: 0, rot: 0 },
  { n: 'SECDE', d: 1.1, leg: 0.5, rot: 2.15 },
  { n: 'OTURUŞ', d: 0.7, leg: 0.5, rot: 0 },
  { n: 'SECDE', d: 1.1, leg: 0.5, rot: 2.15 }
];
const PRAYER_CYCLE = PRAYER_SEQ.reduce((a, q) => a + q.d, 0);
function prayerPose(tt) {
  const c = Math.floor(tt / PRAYER_CYCLE);
  let r = tt - c * PRAYER_CYCLE, i = 0;
  while (i < PRAYER_SEQ.length - 1 && r >= PRAYER_SEQ[i].d) { r -= PRAYER_SEQ[i].d; i++; }
  const cur = PRAYER_SEQ[i];
  const prev = (c === 0 && i === 0) ? cur : PRAYER_SEQ[(i + PRAYER_SEQ.length - 1) % PRAYER_SEQ.length];
  const b = clamp(r / 0.45, 0, 1), e = b * b * (3 - 2 * b);
  return { name: cur.n, leg: prev.leg + (cur.leg - prev.leg) * e, rot: prev.rot + (cur.rot - prev.rot) * e, rakat: c + 1 };
}
function drawEmirPrayer(x, feetY, h, pose) {
  const im = IMG.emir;
  const ry = feetY - 0.12 * h;
  g.save();
  g.beginPath();
  g.moveTo(x - 205, ry - 55); g.lineTo(x + 205, ry - 55); g.lineTo(x + 300, ry + 55); g.lineTo(x - 300, ry + 55);
  g.closePath();
  const rg = g.createLinearGradient(0, ry - 55, 0, ry + 55);
  rg.addColorStop(0, '#1b6b46'); rg.addColorStop(1, '#0d4a2f');
  g.fillStyle = rg; g.fill();
  g.lineWidth = 5; g.strokeStyle = '#e6c46a'; g.stroke();
  g.beginPath();
  g.moveTo(x - 170, ry - 40); g.lineTo(x + 170, ry - 40); g.lineTo(x + 248, ry + 40); g.lineTo(x - 248, ry + 40);
  g.closePath();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(230,196,106,.65)'; g.stroke();
  g.restore();
  if (!im || !im.complete || !im.naturalWidth) return;
  const W0 = im.naturalWidth, H0 = im.naturalHeight, cut = Math.round(H0 * 0.483);
  const w = h * W0 / H0, topH = h * cut / H0, botH = h * (H0 - cut) / H0;
  const legH = botH * (1 - pose.leg);
  const glow = g.createRadialGradient(x, feetY - h * 0.38, 20, x, feetY - h * 0.38, h * 0.62);
  glow.addColorStop(0, 'rgba(125,255,178,.28)');
  glow.addColorStop(1, 'rgba(125,255,178,0)');
  g.save();
  g.fillStyle = glow;
  g.fillRect(x - h * 0.7, feetY - h * 1.1, h * 1.4, h * 1.3);
  g.restore();
  const ov = 2, ky = legH / (H0 - cut);
  g.drawImage(im, 0, cut - ov, W0, H0 - cut + ov, x - w / 2, feetY - legH - ov * ky, w, legH + ov * ky);
  g.save();
  g.translate(x, feetY - legH);
  g.rotate(pose.rot);
  g.drawImage(im, 0, 0, W0, cut + ov, -w / 2, -topH, w, topH + ov * (topH / cut));
  g.restore();
}

/* ---------- yol kenarı evler · Ahmet Deniz ---------- */
function drawHouses() {
  if (!houses.length) return;
  const list = houses.filter(h => h.d > -1.5 && h.d < 90).sort((a, b) => b.d - a.d);
  for (const hs of list) drawHouse(hs);
}
function drawHouse(hs) {
  const p = proj(hs.d);
  if (p.y < HOR + 3) return;
  const far = clamp((p.y - HOR) / 50, 0, 1);
  const sc = p.sc;
  const hw = 440 * sc * hs.wm, hh = 620 * sc * hs.hm;
  const cx = VP + hs.side * (1.52 * p.h - 220 * sc + hw / 2);
  const by = p.y, L = cx - hw / 2, T0 = by - hh;
  const C = HOUSE_COLS[hs.ci];
  const floorY = by - hh * 0.48;
  const act = hs.ahmet && !hs.done;
  g.save();
  g.globalAlpha = far;
  shadow(cx, by, hw * 1.05, 0.25);
  g.fillStyle = C.wall; g.fillRect(L, T0, hw, hh);
  g.fillStyle = 'rgba(6,10,20,.28)'; g.fillRect(L, T0, hw, hh);
  g.fillStyle = C.roof;
  g.beginPath();
  g.moveTo(L - hw * 0.06, T0); g.lineTo(L + hw * 1.06, T0); g.lineTo(L + hw * 0.82, T0 - hh * 0.2); g.lineTo(L + hw * 0.18, T0 - hh * 0.2);
  g.closePath(); g.fill();
  const lit = k => (hs.seed * 7 + k) % 1 > 0.45 ? '#ffe39a' : '#2b3345';
  g.fillStyle = lit(0.1); g.fillRect(L + hw * 0.08, T0 + hh * 0.13, hw * 0.2, hh * 0.24);
  g.fillStyle = lit(0.6); g.fillRect(L + hw * 0.72, T0 + hh * 0.13, hw * 0.2, hh * 0.24);
  g.fillStyle = lit(0.3); g.fillRect(L + hw * 0.08, floorY + hh * 0.1, hw * 0.2, hh * 0.2);
  g.fillStyle = lit(0.8); g.fillRect(L + hw * 0.72, floorY + hh * 0.1, hw * 0.2, hh * 0.2);
  g.fillStyle = C.trim; g.fillRect(cx - hw * 0.1, by - hh * 0.3, hw * 0.2, hh * 0.3);
  const bx = cx - hw * 0.34, bw = hw * 0.68;
  g.fillStyle = act ? '#ffe39a' : '#2a2f3d';
  g.fillRect(cx - hw * 0.14, floorY - hh * 0.3, hw * 0.28, hh * 0.3);
  if (act) {
    const pop = 1 - Math.pow(1 - clamp(hs.t / 0.45, 0, 1), 3);
    const out = clamp((hs.t - 1.8) / 0.6, 0, 1);
    const vis = pop * (1 - out);
    const aH = hh * 0.32;
    let lean = 0;
    if (hs.t >= 0.45 && hs.t < 0.8) lean = hs.side * 0.28 * ((hs.t - 0.45) / 0.35);
    else if (hs.t >= 0.8) lean = -hs.side * 0.35 * Math.max(0, 1 - (hs.t - 0.8) / 0.3);
    g.save();
    g.beginPath(); g.rect(bx, floorY - hh * 0.42, bw, hh * 0.42); g.clip();
    drawSprite('ahmet', cx, floorY + (1 - vis) * aH * 0.95, aH, 1, lean);
    g.restore();
  }
  g.fillStyle = '#5b6070'; g.fillRect(bx, floorY, bw, hh * 0.035);
  g.strokeStyle = '#7b8196'; g.lineWidth = Math.max(1, sc * 3);
  const ry = floorY - hh * 0.15;
  g.beginPath(); g.moveTo(bx, ry); g.lineTo(bx + bw, ry); g.stroke();
  const nb = 9;
  for (let i = 0; i <= nb; i++) { g.beginPath(); g.moveTo(bx + bw * i / nb, ry); g.lineTo(bx + bw * i / nb, floorY); g.stroke(); }
  if (act && hs.t > 0.2) {
    const fs = Math.max(16, 42 * sc);
    g.font = '900 ' + fs + 'px "Arial Black",system-ui,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, fs * 0.16); g.strokeStyle = '#1a1206'; g.fillStyle = '#ffd23f';
    g.strokeText('AHMET DENİZ', cx, T0 - hh * 0.2 - fs * 0.8);
    g.fillText('AHMET DENİZ', cx, T0 - hh * 0.2 - fs * 0.8);
  }
  g.restore();
}
function drawThrown(o, p, T, far) {
  const u = 1 - o.air;
  const lat = o.side * 2.1 * (1 - u) + o.lane * u;
  const x = VP + lat * (2 / 3) * p.h;
  const lift = o.lift0 * (1 - u * u) + Math.sin(Math.PI * u) * 90;
  const y = p.y - lift * p.sc;
  const hl = T.h * p.sc;
  shadow(laneX(o.lane, p), p.y, hl * 0.7, 0.1 + 0.2 * u);
  g.save();
  g.translate(x, y - hl * 0.5);
  g.rotate(o.spin + u * (o.ty === 'emir' ? 5 : 11));
  g.translate(-x, -(y - hl * 0.5));
  if (o.ty === 'emir') {
    g.shadowColor = '#7dffb2'; g.shadowBlur = 18 + 30 * p.sc;
    drawSprite('emir', x, y, hl, far);
  } else {
    drawProp(T.prop, x, y, hl, far);
  }
  g.restore();
}
function drawRare(o, p, x, far, spr, label, glow, strokeCol, fillCol) {
  const hh = TYPES[o.ty].h * p.sc;
  const hop = Math.abs(Math.sin(t * 5 + o.d)) * 12 * p.sc;
  shadow(x, p.y, hh * 0.62);
  g.save();
  g.shadowColor = glow;
  g.shadowBlur = 18 + 30 * p.sc;
  drawSprite(spr, x, p.y - hop, hh, far);
  g.restore();
  const fs = Math.max(10, 40 * p.sc);
  g.save();
  g.globalAlpha = far;
  g.font = '900 ' + fs + 'px "Arial Black",system-ui,sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, fs * 0.16);
  g.strokeStyle = strokeCol; g.fillStyle = fillCol;
  g.strokeText(label, x, p.y - hh - fs * 0.7 - hop);
  g.fillText(label, x, p.y - hh - fs * 0.7 - hop);
  g.restore();
}

/* ---------- Ezra Zeren'in sisi ---------- */
function drawFog() {
  if (fogT <= 0 || (st !== 'play' && st !== 'pause')) return;
  const a = Math.min(1, (FOG_TIME - fogT) / 0.6, fogT / 0.8);
  const gr = g.createLinearGradient(0, 0, 0, 670);
  gr.addColorStop(0, 'rgba(205,214,228,' + (0.96 * a) + ')');
  gr.addColorStop(0.55, 'rgba(205,214,228,' + (0.85 * a) + ')');
  gr.addColorStop(1, 'rgba(205,214,228,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, 670);
}

/* ---------- Niyazi göbek atma ---------- */
function drawBump() {
  if (bumpT <= 0) return;
  const u = 1 - bumpT / BUMP_TIME;
  const p = proj(0);
  const x0 = laneX(px, p);
  const arrive = clamp(u / 0.25, 0, 1);
  const e = 1 - Math.pow(1 - arrive, 3);
  const leave = clamp((u - 0.8) / 0.2, 0, 1);
  const nx = x0 + 175 + (1 - e) * 620 + leave * 620;
  const sway = Math.sin(t * 18) * 0.07;
  const sq = 1 + Math.sin(t * 18 + 1) * 0.05;
  const feet = p.y + 50 - Math.abs(Math.sin(t * 9)) * 14;
  shadow(nx, p.y + 20, 360, 0.3 * (1 - leave));
  g.save();
  g.shadowColor = '#ff8a3d';
  g.shadowBlur = 26;
  drawSprite('niyazi', nx, feet, 520, 1 - leave * 0.8, sway, sq);
  g.restore();
  if (u >= 0.25 && u < 0.95) {
    const k = clamp((u - 0.25) / 0.12, 0, 1);
    const pop = 1 + 0.35 * Math.sin(Math.PI * Math.min(1, k * 1.4));
    g.save();
    g.globalAlpha = 1 - clamp((u - 0.85) / 0.1, 0, 1);
    g.translate(W / 2, 560);
    g.scale(pop, pop);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 120px "Arial Black",system-ui,sans-serif';
    g.lineWidth = 14; g.strokeStyle = '#2a1206'; g.fillStyle = '#ff8a3d';
    g.strokeText('GÖBEK!', 0, 0); g.fillText('GÖBEK!', 0, 0);
    g.font = '900 54px "Arial Black",system-ui,sans-serif';
    g.lineWidth = 9; g.strokeStyle = '#2a0b0b'; g.fillStyle = '#ff5a5a';
    const pushed = Math.round(bumpTotal - bumpLeft);
    g.strokeText('-' + pushed + ' M', 0, 96); g.fillText('-' + pushed + ' M', 0, 96);
    g.restore();
  }
}

/* ---------- Mustafa Eymen'in telefonu ---------- */
function fitText(txt, maxW, px0) {
  let s0 = px0;
  g.font = '900 ' + s0 + 'px "Arial Black",system-ui,sans-serif';
  while (g.measureText(txt).width > maxW && s0 > 8) { s0 -= 1; g.font = '900 ' + s0 + 'px "Arial Black",system-ui,sans-serif'; }
}
function drawPhoneBody(x, y, w) {
  const k = w / 262, u = REV_TIME - revT;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 26;
  rr(0, 0, 262, 470, 34); g.fillStyle = '#0c0d12'; g.fill();
  g.shadowBlur = 0; g.lineWidth = 5; g.strokeStyle = '#3b3f4d'; g.stroke();
  rr(12, 16, 238, 438, 24); g.fillStyle = '#15161d'; g.fill();
  g.save();
  rr(12, 16, 238, 438, 24); g.clip();
  rr(26, 30, 40, 28, 8); g.fillStyle = '#ff2a2a'; g.fill();
  g.beginPath(); g.moveTo(41, 37); g.lineTo(41, 51); g.lineTo(54, 44); g.closePath(); g.fillStyle = '#fff'; g.fill();
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.font = '800 20px system-ui,sans-serif'; g.fillText('Shorts', 74, 45);
  g.textAlign = 'center';
  g.fillStyle = '#ffffff'; fitText('YT SHORTS', 214, 30); g.fillText('YT SHORTS', 131, 98);
  g.fillStyle = '#ffd23f'; fitText('KOMİK YORUMLAR TR', 214, 22); g.fillText('KOMİK YORUMLAR TR', 131, 132);
  const vg = g.createLinearGradient(30, 158, 232, 270);
  vg.addColorStop(0, '#6a3cff'); vg.addColorStop(1, '#ff3c8e');
  rr(30, 158, 202, 112, 14); g.fillStyle = vg; g.fill();
  g.font = '44px system-ui,sans-serif'; g.fillStyle = '#fff';
  g.fillText('😂', 131, 214 + Math.sin(t * 8) * 4);
  g.save();
  g.beginPath(); g.rect(24, 282, 214, 150); g.clip();
  const off = (u * 40) % 50;
  for (let i = -1; i < 4; i++) {
    const cy = 290 + i * 50 + (50 - off);
    g.fillStyle = ['#ff8a3d', '#6bd0ff', '#7dffb2', '#ff6bd5'][((i + Math.floor(u * 0.8)) % 4 + 4) % 4];
    g.beginPath(); g.arc(42, cy + 16, 13, 0, 7); g.fill();
    g.fillStyle = '#3a3d4d'; rr(64, cy + 4, 90, 9, 4); g.fill();
    g.fillStyle = '#2a2d3b'; rr(64, cy + 20, 140, 9, 4); g.fill();
    g.font = '15px system-ui,sans-serif'; g.textAlign = 'right'; g.fillStyle = '#fff';
    g.fillText('😂', 230, cy + 16);
  }
  g.restore();
  g.fillStyle = '#ff2a2a'; g.fillRect(12, 446, 238 * clamp(revT / REV_TIME, 0, 1), 8);
  g.restore();
  g.restore();
}
function drawPhone() {
  if (revT <= 0 || (st !== 'play' && st !== 'pause')) return;
  const u = REV_TIME - revT;
  const e = 1 - Math.pow(1 - clamp(u / 1.5, 0, 1), 3);
  const dockX = 22, dockY = 430, dw = 262;
  if (u < 1.9) {
    const a = u < 1.5 ? 1 : 1 - (u - 1.5) / 0.4;
    const mx = W - 190 + (1 - clamp(u / 0.35, 0, 1)) * 340;
    drawSprite('mustafa', mx, 1590, 520, a, -0.04 + Math.sin(t * 10) * 0.015);
  }
  const sx = W - 360, sy = 1000, sc = 1.5 - 0.5 * e;
  g.save();
  g.globalAlpha = 0.97;
  drawPhoneBody(sx + (dockX - sx) * e, sy + (dockY - sy) * e, dw * sc);
  g.restore();
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const cxp = dockX + dw / 2;
  const lines = [
    ['KONTROLLER TERS!', 30, '#ff5a5a', '#2a0b0b', 506],
    ['SAĞ-SOL TERS', 22, '#ffffff', '#0a0f1a', 548],
    ['ZIPLA-KAY TERS', 22, '#ffffff', '#0a0f1a', 580],
    ['YAVAŞSIN!', 22, '#ffd23f', '#1a1206', 612]
  ];
  for (const [txt, fpx, fill, stroke, dy] of lines) {
    fitText(txt, 250, fpx);
    g.lineWidth = 6; g.strokeStyle = stroke; g.fillStyle = fill;
    g.strokeText(txt, cxp, dockY + dy);
    g.fillText(txt, cxp, dockY + dy);
  }
  g.restore();
}

function drawEmirEffect() {
  if (emirPrayerT > 0) {
    g.save();
    g.fillStyle = 'rgba(3, 8, 14, .88)';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 58px "Arial Black",system-ui,sans-serif';
    g.lineWidth = 8;
    g.strokeStyle = '#10251b';
    g.fillStyle = '#7dffb2';
    g.strokeText('NAMAZ MOLASI', W / 2, 280);
    g.fillText('NAMAZ MOLASI', W / 2, 280);
    const pose = prayerPose(EMIR_PRAYER_TIME - emirPrayerT);
    drawEmirPrayer(W / 2, 1300, 650, pose);
    g.font = '900 54px "Arial Black",system-ui,sans-serif';
    g.lineWidth = 7;
    g.strokeStyle = '#10251b';
    g.fillStyle = '#ffffff';
    g.strokeText(pose.name, W / 2, 400);
    g.fillText(pose.name, W / 2, 400);
    g.font = '800 34px system-ui,sans-serif';
    g.fillStyle = '#9fe9bd';
    g.fillText(Math.min(2, pose.rakat) + '. RAKAT', W / 2, 466);
    g.font = '900 78px "Arial Black",system-ui,sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText(Math.ceil(emirPrayerT) + ' SANİYE', W / 2, 1390);
    g.font = '700 30px system-ui,sans-serif';
    g.fillStyle = '#c5d3df';
    g.fillText('EMİR OYUNA MOLA VERDİRDİ', W / 2, 1480);
    g.restore();
  } else if (emirShoutT > 0) {
    g.save();
    const a = Math.min(1, emirShoutT * 1.8);
    g.globalAlpha = a;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 68px "Arial Black",system-ui,sans-serif';
    g.lineWidth = 10;
    g.strokeStyle = '#14220f';
    g.fillStyle = '#baff72';
    g.strokeText('İMAN GÜCÜÜÜÜÜÜÜ!', W / 2, 250);
    g.fillText('İMAN GÜCÜÜÜÜÜÜÜ!', W / 2, 250);
    g.restore();
  }
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
  } else if (st === 'infaz') {
    drawInfaz(dt);
  } else if (st === 'scare') {
    drawScare(dt);
  } else if (st === 'over' && beatOver) {
    drawBeatOver();
  } else if (st === 'menu') {
    drawMenu();
  } else {
    drawChase(dt);
    if (boss) { drawBoss(); drawBossFloor(); }
    const hb = (st === 'hit' || st === 'over') ? hitBy : null;
    const vis = objs.filter(o => o !== hb && !o.dead);
    const far = vis.filter(o => o.d >= 0).sort((a, b) => b.d - a.d);
    const near = vis.filter(o => o.d < 0);
    if (!boss) drawHouses();
    for (const o of far) drawObj(o);
    drawFog();
    drawYavuz(false);
    const pp = drawPlayer();
    drawYavuz(true);
    drawBump();
    for (const o of near) drawObj(o);
    drawParticles(dt);
    if (boss) drawBossFx(dt);
    if (mode) {
      g.fillStyle = 'rgba(255,170,40,.07)';
      g.fillRect(0, 0, W, H);
    }
    if (st === 'hit' || st === 'over') {
      drawHitActor(pp);
      drawCaught();
    }
    if (st === 'kid') drawKidFx(dt);
  }
  drawEmirEffect();
  drawPhone();
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
  else if (st === 'kid') updateKid(dt);
  else if (st === 'infaz') updateInfaz(dt);
  else if (st === 'scare') updateScare(dt);
  else if (st === 'over') caughtT = 1;
  else if (st === 'menu') menuScroll += dt * 9;
  render(dt);
}
requestAnimationFrame(loop);

/* ---------- profil · karakter · görev · başarım · mağaza ---------- */
function saveProf() { store.set('prof', prof); }
function owned(id) { return !id || id === 'kosan' || !!prof.owned[id]; }
function charDef() { return CHARS.find(c => c.id === prof.ch) || CHARS[0]; }
function addWallet(n) { if (n > 0) { prof.wallet += n; saveProf(); } }
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

const MISSIONS = [
  { id: 'dist', stat: 'dist', max: true, needs: [600, 1000, 1600], rew: [20, 30, 45], text: n => 'TEK KOŞUDA ' + n + ' m GİT' },
  { id: 'coin', stat: 'coin', needs: [30, 50, 80], rew: [15, 25, 35], text: n => n + ' TANE 6/B TOPLA' },
  { id: 'clear', stat: 'clear', needs: [12, 20, 35], rew: [15, 25, 35], text: n => n + ' ENGELİ ZIPLAYARAK YA DA KAYARAK AŞ' },
  { id: 'slide', stat: 'slide', needs: [8, 14, 22], rew: [15, 20, 30], text: n => n + ' KEZ KAY' },
  { id: 'yavuz', stat: 'yavuz', needs: [1, 2, 3], rew: [25, 40, 55], text: n => 'YAVUZ\'U ' + n + ' KEZ YAKALA' },
  { id: 'run', stat: 'run', needs: [2, 3, 5], rew: [15, 20, 30], text: n => n + ' KOŞU YAP' }
];
const ACHS = [
  { id: 'k1', t: 'İLK 1.000 METRE', c: () => stats.bestDist >= 1000 },
  { id: 'k5', t: '5.000 METREYE ULAŞ', c: () => stats.bestDist >= 5000 },
  { id: 'boss', t: 'MERVE MİNA\'YI YEN', c: () => stats.boss >= 1 },
  { id: 'clean', t: 'MERVE\'Yİ CAN KAYBETMEDEN YEN', c: () => stats.bossClean >= 1 },
  { id: 'coin', t: 'TOPLAM 500 6/B TOPLA', c: () => stats.coin >= 500 },
  { id: 'yav', t: 'YAVUZ\'U 10 KEZ YAKALA', c: () => stats.yavuz >= 10 },
  { id: 'slide', t: '50 KEZ KAY', c: () => stats.slide >= 50 },
  { id: 'runs', t: '25 KOŞU YAP', c: () => stats.run >= 25 },
  { id: 'k67', t: '67 KID\'LE KARŞILAŞ', c: () => stats.kid >= 1 },
  { id: 'chars', t: 'TÜM KARAKTERLERİ AÇ', c: () => CHARS.every(c => owned(c.id)) }
];

function dayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
function ensureMissions() {
  const k = dayKey();
  if (dm && dm.day === k) return;
  let seed = 0;
  for (const ch of k) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pool = MISSIONS.slice(), list = [];
  for (let i = 0; i < 3; i++) {
    const m = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const tier = Math.floor(rng() * m.needs.length);
    list.push({ id: m.id, need: m.needs[tier], rew: m.rew[tier], got: 0, claimed: false });
  }
  dm = { day: k, list };
  store.set('dm', dm);
}
function checkAch() {
  let any = false;
  for (const a of ACHS) {
    if (ach[a.id] || !a.c()) continue;
    ach[a.id] = 1;
    prof.wallet += 50;
    any = true;
    if (st === 'play') flashMessage('BAŞARIM: ' + a.t);
  }
  if (any) { store.set('ach', ach); saveProf(); }
}
function bump(stat, n = 1) {
  stats[stat] = (stats[stat] || 0) + n;
  ensureMissions();
  for (const m of dm.list) {
    const d = MISSIONS.find(x => x.id === m.id);
    if (d.stat === stat && !d.max) m.got = Math.min(m.need, m.got + n);
  }
  store.set('stats', stats);
  store.set('dm', dm);
  checkAch();
}
function noteRun(d) {
  stats.bestDist = Math.max(stats.bestDist, d);
  ensureMissions();
  for (const m of dm.list) if (m.id === 'dist') m.got = Math.max(m.got, Math.min(m.need, d));
  store.set('dm', dm);
  bump('run');
}
function claimable() {
  ensureMissions();
  return dm.list.some(m => !m.claimed && m.got >= m.need);
}
function refreshBadges() {
  const b = $('msBtn');
  if (b) b.textContent = claimable() ? 'GÖREVLER ●' : 'GÖREVLER';
}

const rowH = (title, sub, btn) =>
  '<div class="row"><div style="flex:1;min-width:0;text-align:left"><div style="color:#fff;font-weight:900">' + title +
  '</div><div style="font-size:1.8cqh;color:#9fb3e0;font-weight:700">' + sub + '</div></div>' + btn + '</div>';
const sBtn = (id, label, dim) =>
  '<button class="b b2" id="' + id + '" style="width:26cqw;height:5.4cqh;font-size:2cqh;flex:none' + (dim ? ';opacity:.5' : '') + '">' + label + '</button>';
const walletP = () => '<p>6/B CÜZDANIN: <b style="color:#ffd23f">' + prof.wallet + '</b></p>';

function openChars() {
  let h = '<h2>KARAKTER SEÇİMİ</h2>' + walletP() +
    '<div class="char-grid">';
  for (const c of CHARS) {
    const have = owned(c.id), sel = prof.ch === c.id;
    const avatar = c.img || (c.spr === 'kosan' ? 'kosan.png' : c.spr === 'yavuz' ? 'yavuz.png' : 'merve.png');
    h += '<div class="char-card' + (sel ? ' selected' : '') + '">' +
      '<div class="char-art"><img src="assets/img/' + avatar + '" alt="' + c.name + '"></div>' +
      '<div class="char-info"><b>' + c.name + '</b><small>' + c.desc + '</small></div>' +
      '<button class="b b2 char-action" id="ch_' + c.id + '">' +
      (sel ? 'SEÇİLİ' : have ? 'SEÇ' : '★ ' + c.cost) + '</button></div>';
  }
  h += '</div><button class="b b2" id="chBack">KAPAT</button>';
  openModal(h);
  for (const c of CHARS) {
    $('ch_' + c.id).onclick = () => {
      if (!owned(c.id)) {
        if (prof.wallet < c.cost) { SFX.effect('ui'); return; }
        prof.wallet -= c.cost;
        prof.owned[c.id] = 1;
        checkAch();
      }
      prof.ch = c.id;
      saveProf();
      SFX.effect('ui');
      openChars();
    };
  }
  $('chBack').onclick = closeModal;
}

function openShop() {
  let h = '<h2>MAĞAZA</h2>' + walletP() + '<p>İZ EFEKTLERİ</p>';
  TRAILS.forEach((it, i) => {
    const have = !it.cost || prof.owned['t_' + it.id], sel = prof.trail === it.id;
    h += rowH(it.name, it.cost ? (have ? 'SAHİPSİN' : it.cost + ' 6/B') : 'VARSAYILAN', sBtn('tr_' + i, sel ? 'SEÇİLİ' : have ? 'SEÇ' : '★ ' + it.cost, !have && prof.wallet < it.cost));
  });
  h += '<p>AURALAR</p>';
  AURAS.forEach((it, i) => {
    const have = !it.cost || prof.owned['a_' + it.id], sel = prof.aura === it.id;
    h += rowH(it.name, it.cost ? (have ? 'SAHİPSİN' : it.cost + ' 6/B') : 'VARSAYILAN', sBtn('au_' + i, sel ? 'SEÇİLİ' : have ? 'SEÇ' : '★ ' + it.cost, !have && prof.wallet < it.cost));
  });
  h += '<button class="b b2" id="shBack">KAPAT</button>';
  openModal(h);
  const bind = (list, pre, key, field) => list.forEach((it, i) => {
    $(pre + i).onclick = () => {
      const k = key + it.id;
      if (it.cost && !prof.owned[k]) {
        if (prof.wallet < it.cost) { SFX.effect('ui'); return; }
        prof.wallet -= it.cost;
        prof.owned[k] = 1;
      }
      prof[field] = it.id;
      saveProf();
      SFX.effect('ui');
      openShop();
    };
  });
  bind(TRAILS, 'tr_', 't_', 'trail');
  bind(AURAS, 'au_', 'a_', 'aura');
  $('shBack').onclick = closeModal;
}

function openMissions() {
  ensureMissions();
  let h = '<h2>GÖREVLER</h2>' + walletP() + '<p>BUGÜNÜN GÖREVLERİ</p>';
  dm.list.forEach((m, i) => {
    const d = MISSIONS.find(x => x.id === m.id), done = m.got >= m.need;
    const btn = m.claimed ? sBtn('ms_' + i, 'ALINDI', true) : done ? sBtn('ms_' + i, '★ ' + m.rew + ' AL', false) : sBtn('ms_' + i, m.got + '/' + m.need, true);
    h += rowH(d.text(m.need), 'ÖDÜL: ' + m.rew + ' 6/B', btn);
  });
  h += '<p>BAŞARIMLAR</p>';
  for (const a of ACHS) h += rowH(a.t, ach[a.id] ? 'AÇILDI ✓ (+50 6/B)' : 'KİLİTLİ', '');
  h += '<button class="b b2" id="msBack">KAPAT</button>';
  openModal(h);
  dm.list.forEach((m, i) => {
    $('ms_' + i).onclick = () => {
      if (m.claimed || m.got < m.need) return;
      m.claimed = true;
      addWallet(m.rew);
      store.set('dm', dm);
      SFX.effect('win');
      refreshBadges();
      openMissions();
    };
  });
  $('msBack').onclick = closeModal;
}

async function shareScore() {
  const d = $('od').textContent, c = $('oc').textContent;
  const cv2 = document.createElement('canvas');
  cv2.width = 1080; cv2.height = 1350;
  const x = cv2.getContext('2d');
  const bgI = IMG.sinif;
  if (bgI && bgI.naturalWidth) {
    const sc = Math.max(1080 / bgI.naturalWidth, 1350 / bgI.naturalHeight);
    x.drawImage(bgI, (1080 - bgI.naturalWidth * sc) / 2, (1350 - bgI.naturalHeight * sc) / 2, bgI.naturalWidth * sc, bgI.naturalHeight * sc);
  } else {
    x.fillStyle = '#0a1026';
    x.fillRect(0, 0, 1080, 1350);
  }
  const gr = x.createLinearGradient(0, 0, 0, 1350);
  gr.addColorStop(0, 'rgba(5,8,22,.78)');
  gr.addColorStop(1, 'rgba(5,8,22,.92)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 1080, 1350);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  const T = (txt, y, size, fill, stroke) => {
    x.font = '900 ' + size + 'px "Arial Black","Segoe UI",system-ui,sans-serif';
    if (stroke) { x.lineWidth = size * 0.12; x.strokeStyle = stroke; x.strokeText(txt, 540, y); }
    x.fillStyle = fill;
    x.fillText(txt, 540, y);
  };
  T('6/B RUN', 190, 150, '#ffd23f', '#5a3a00');
  T('POÇİLERDEN KAÇIŞ', 300, 46, '#cfe0ff');
  T('MESAFE', 560, 56, '#9fb3e0');
  T(d, 700, 210, '#ffffff', '#16265e');
  T('TOPLANAN 6/B: ' + c, 880, 64, '#ffd23f');
  T(charDef().name, 990, 48, '#cfe0ff');
  if (stats.boss > 0) T('★ MERVE MİNA\'YI YENDİ ★', 1080, 50, '#ff7a90');
  T('SEN KAÇ METRE GİDEBİLİRSİN?', 1210, 48, '#ffffff');
  T('6/B STUDIOS', 1290, 36, '#7f93bf');
  cv2.toBlob(async blob => {
    if (!blob) return;
    const file = new File([blob], '6b-run-skor.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: '6/B RUN: ' + d + ' koştum! Sen kaç metre gidebilirsin?' });
        return;
      } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '6b-run-skor.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

/* ---------- kayma · kalkan · rastgele olaylar ---------- */
function slideReal() {
  if (st !== 'play' || slideT > 0 || jumpT >= 0 || stunT > 0) return;
  slideT = 0.62;
  SFX.effect('slide');
  bump('slide');
}
function cleared(o) {
  if (o.cl) return;
  o.cl = 1;
  bump('clear');
}
function tryShield(o) {
  if (shield <= 0) return false;
  shield--;
  shieldT = 0;
  o.dead = 1;
  inv = 1.6;
  flash = Math.max(flash, 0.5);
  shake = 0.8;
  SFX.effect('smash');
  buzz(80);
  flashMessage('KALKAN KIRILDI!');
  const p = proj(0);
  spawnBurst(laneX(px, p), p.y - 160 * p.sc, 14, ['#ffd23f', '#ffffff', '#ff6b8a'], 620, 1200);
  return true;
}
function updateEvents(dt) {
  if (ev) {
    ev.t -= dt;
    if (ev.t <= 0) ev = null;
    return;
  }
  evNext -= dt;
  if (evNext > 0 || run < 200 || mode || pw) return;
  const type = rnd(['zil', 'yoklama', 'yagmur']);
  ev = type === 'zil' ? { type, t: 8, mul: 1.3 } : type === 'yoklama' ? { type, t: 6, mul: 0.65 } : { type, t: 6, mul: 1 };
  evNext = 35 + Math.random() * 25;
  flashMessage(type === 'zil' ? 'ZİL ÇALDI! HIZLAN!' : type === 'yoklama' ? 'YOKLAMA! HERKES YAVAŞLADI' : 'ÇİKOLATA YAĞMURU!');
  SFX.effect(type === 'zil' ? 'zil' : 'ui');
}
function drawHang(x, p, far) {
  const sc = p.sc, bw = (2 / 3) * p.h * 0.95;
  const bottom = p.y - 330 * sc, top = bottom - 70 * sc;
  g.save();
  g.globalAlpha = far;
  shadow(x, p.y, bw, 0.25);
  g.strokeStyle = '#2a2f45';
  g.lineWidth = Math.max(2, 8 * sc);
  g.beginPath();
  g.moveTo(x - bw * 0.4, top); g.lineTo(x - bw * 0.4, top - 900 * sc);
  g.moveTo(x + bw * 0.4, top); g.lineTo(x + bw * 0.4, top - 900 * sc);
  g.stroke();
  g.save();
  g.beginPath();
  g.rect(x - bw / 2, top, bw, bottom - top);
  g.clip();
  g.fillStyle = '#ffd23f';
  g.fillRect(x - bw / 2, top, bw, bottom - top);
  g.fillStyle = '#1a1a1a';
  const hh = bottom - top, st2 = bw / 9;
  for (let i = -2; i < 12; i++) {
    const sx = x - bw / 2 + i * st2 * 1.4;
    g.beginPath();
    g.moveTo(sx, top);
    g.lineTo(sx + st2 * 0.7, top);
    g.lineTo(sx + st2 * 0.7 - hh, bottom);
    g.lineTo(sx - hh, bottom);
    g.closePath();
    g.fill();
  }
  g.restore();
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = Math.max(2, 6 * sc);
  g.strokeRect(x - bw / 2, top, bw, bottom - top);
  g.restore();
}

/* ---------- 67 KID · İNFAZ ODASI ---------- */
const MT = 80, GCELL = 40, GW = 144, GH = 108;
const INFAZ_FLOORS = [
  { n: 'SAHNE', x: 22, y: 2, w: 18, h: 8, c: '#221430' },
  { n: 'ARKA SAHNE', x: 4, y: 2, w: 14, h: 8, c: '#1a1a24' },
  { n: '', x: 18, y: 5, w: 4, h: 3, c: '#17171f' },
  { n: 'YEMEK ALANI', x: 14, y: 13, w: 34, h: 16, c: '#1a1a24' },
  { n: '', x: 29, y: 10, w: 4, h: 3, c: '#17171f' },
  { n: 'PİRATE COVE', x: 2, y: 14, w: 10, h: 10, c: '#24122a' },
  { n: '', x: 12, y: 18, w: 2, h: 3, c: '#17171f' },
  { n: 'TUVALETLER', x: 54, y: 3, w: 16, h: 12, c: '#13232e' },
  { n: '', x: 48, y: 14, w: 6, h: 3, c: '#17171f' },
  { n: 'MUTFAK', x: 54, y: 19, w: 16, h: 12, c: '#1d201a' },
  { n: '', x: 48, y: 22, w: 6, h: 3, c: '#17171f' },
  { n: 'BATI KORİDORU', x: 16, y: 29, w: 6, h: 20, c: '#18181f' },
  { n: 'MALZEME DEPOSU', x: 6, y: 34, w: 10, h: 7, c: '#211c16' },
  { n: 'DOĞU KORİDORU', x: 42, y: 29, w: 6, h: 20, c: '#18181f' },
  { n: 'GÜVENLİK OFİSİ', x: 24, y: 44, w: 16, h: 10, c: '#141c28' },
  { n: '', x: 22, y: 46, w: 2, h: 3, c: '#17171f' },
  { n: '', x: 40, y: 46, w: 2, h: 3, c: '#17171f' }
];
const INFAZ_SOLIDS = [
  { x: 18, y: 16, w: 3, h: 2 }, { x: 24, y: 16, w: 3, h: 2 }, { x: 30, y: 16, w: 3, h: 2 }, { x: 36, y: 16, w: 3, h: 2 },
  { x: 18, y: 22, w: 3, h: 2 }, { x: 24, y: 22, w: 3, h: 2 }, { x: 30, y: 22, w: 3, h: 2 }, { x: 36, y: 22, w: 3, h: 2 },
  { k: 'curtain', x: 3, y: 15, w: 6, h: 3 },
  { k: 'counter', x: 56, y: 21, w: 12, h: 2 }, { k: 'counter', x: 56, y: 27, w: 12, h: 2 },
  { k: 'stall', x: 56, y: 3, w: 2, h: 5 }, { k: 'stall', x: 60, y: 3, w: 2, h: 5 }, { k: 'stall', x: 64, y: 3, w: 2, h: 5 },
  { k: 'desk', x: 28, y: 50, w: 8, h: 2 },
  { k: 'table', x: 8, y: 4, w: 4, h: 2 },
  { k: 'shelf', x: 7, y: 35, w: 2, h: 5 }
];
let infazGrid = null, infazRoom = null;

function buildInfazGrid() {
  if (infazGrid) return;
  infazGrid = new Uint8Array(GW * GH);
  infazRoom = new Int16Array(GW * GH).fill(-1);
  INFAZ_FLOORS.forEach((f, i) => {
    for (let cy = f.y * 2; cy < (f.y + f.h) * 2; cy++) {
      for (let cx = f.x * 2; cx < (f.x + f.w) * 2; cx++) {
        infazGrid[cy * GW + cx] = 1;
        infazRoom[cy * GW + cx] = i;
      }
    }
  });
  for (const s of INFAZ_SOLIDS) {
    for (let cy = s.y * 2; cy < (s.y + s.h) * 2; cy++) {
      for (let cx = s.x * 2; cx < (s.x + s.w) * 2; cx++) infazGrid[cy * GW + cx] = 0;
    }
  }
}
function walkable(x, y) {
  const cx = Math.floor(x / GCELL), cy = Math.floor(y / GCELL);
  return cx >= 0 && cy >= 0 && cx < GW && cy < GH && infazGrid[cy * GW + cx] === 1;
}
function canStand(x, y, r) {
  return walkable(x - r, y - r) && walkable(x + r, y - r) && walkable(x - r, y + r) && walkable(x + r, y + r);
}
function roomIdx(cx, cy) {
  return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : infazRoom[cy * GW + cx];
}

function startInfazMusic() {
  stopInfazMusic();
  infazOn = true;
  const first = store.get('infazTrack', Math.random() < 0.5 ? 'music1' : 'music2');
  const other = first === 'music1' ? 'music2' : 'music1';
  store.set('infazTrack', other);
  const play = key => {
    if (!infazOn) return;
    infazSnd = SFX.play(key, { volume: 0.85 });
    if (infazSnd) infazSnd.addEventListener('ended', () => play(key === 'music1' ? 'music2' : 'music1'));
  };
  play(first);
}
function stopInfazMusic() {
  infazOn = false;
  if (infazSnd) { try { infazSnd.pause(); infazSnd.currentTime = 0; } catch (e) {} infazSnd = null; }
}

function cleanForCutscene() {
  hideOffer();
  stopGameAudio();
  stopYavSnd();
  if (mode) {
    modeStarsTotal += modeStars;
    modeStars = 0;
    mode = null;
    $('modeBanner').classList.remove('on');
  }
  pw = null; pwT = 0; flyH = 0; dashLeft = 0; ev = null;
}

function startKid(o) {
  if (st !== 'play' || kid) return;
  if (o) o.dead = 1;
  cleanForCutscene();
  kid = { t: 0, grabbed: false };
  kidLift = 0;
  st = 'kid';
  toggleHud(false);
  SFX.effect('kidStatic');
}

function updateKid(dt) {
  const k = kid;
  k.t += dt;
  scroll += 2 * dt;
  px += (lane - px) * Math.min(1, dt * 14);
  if (jumpT >= 0) {
    jumpT += dt / jumpLen;
    if (jumpT >= 1) jumpT = -1;
  }
  if (!k.grabbed && k.t >= 2.35) {
    k.grabbed = true;
    flash = 1;
    shake = 2;
    SFX.effect('kidGrab');
    buzz([120, 60, 240]);
  }
  kidLift = k.grabbed ? (k.t - 2.35) * 420 : 0;
  if (k.t >= 3.5) enterInfaz();
}

function bez(a, b, c, d, u) {
  const v = 1 - u;
  return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
}
function drawHand(tx, ty, reach, close) {
  const ox = W + 160, oy = 250, c1x = W * 0.85, c1y = 120, c2x = tx + 260, c2y = ty - 380;
  const pts = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * reach;
    pts.push([bez(ox, c1x, c2x, tx, u), bez(oy, c1y, c2y, ty, u)]);
  }
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [w, col] of [[100, '#07123a'], [80, '#1f3f9a']]) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
  const e = pts[pts.length - 1], q = pts[pts.length - 3];
  const ang = Math.atan2(e[1] - q[1], e[0] - q[0]);
  g.fillStyle = '#1f3f9a';
  g.strokeStyle = '#07123a';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(e[0], e[1], 72, 0, 7);
  g.fill();
  g.stroke();
  const spread = 1 - close * 0.9, len = 110 * (1 - close * 0.35);
  for (const off of [-0.55, -0.18, 0.18, 0.55]) {
    const a = ang + off * spread;
    const sx = e[0] + Math.cos(a) * 50, sy = e[1] + Math.sin(a) * 50;
    const fx = e[0] + Math.cos(a) * (50 + len), fy = e[1] + Math.sin(a) * (50 + len);
    for (const [w, col] of [[44, '#07123a'], [30, '#1f3f9a']]) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(fx, fy);
      g.stroke();
    }
  }
  const ta = ang + 1.35 * (1 - close * 0.4);
  for (const [w, col] of [[44, '#07123a'], [30, '#1f3f9a']]) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(e[0] + Math.cos(ta) * 40, e[1] + Math.sin(ta) * 40);
    g.lineTo(e[0] + Math.cos(ta) * 120, e[1] + Math.sin(ta) * 120);
    g.stroke();
  }
  g.restore();
}

function drawKidFx(dt) {
  const k = kid, p = proj(0);
  const tx = laneX(px, p), ty = p.y - 190 - kidLift;
  const dark = Math.min(1, k.t / 0.8);
  g.fillStyle = 'rgba(0,0,12,' + (0.6 * dark) + ')';
  g.fillRect(0, 0, W, H);
  const n = Math.floor(160 * dark);
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(90,130,255,.5)' : 'rgba(255,255,255,.45)';
    g.fillRect(Math.random() * W, Math.random() * H, 4 + Math.random() * 10, 2 + Math.random() * 3);
  }
  const im = IMG.kid67;
  if (im && im.naturalWidth) {
    const grow = easeOutCubic(Math.min(1, k.t / 1.8));
    const size = 380 + 420 * grow;
    const cx = W / 2 + (Math.random() - 0.5) * 14, cy = 520 - 40 * grow;
    const a = Math.min(1, k.t / 0.5) * (k.t > 3.0 ? Math.max(0, 1 - (k.t - 3.0) / 0.5) : 1);
    g.save();
    g.globalAlpha = a * 0.4;
    g.globalCompositeOperation = 'lighter';
    g.drawImage(im, cx - size / 2 - 12, cy - size / 2, size, size);
    g.drawImage(im, cx - size / 2 + 12, cy - size / 2, size, size);
    g.restore();
    g.save();
    g.globalAlpha = a;
    g.drawImage(im, cx - size / 2, cy - size / 2, size, size);
    g.restore();
  }
  if (k.t > 0.9) {
    const u = clamp((k.t - 0.9) / 1.3, 0, 1);
    const reach = u * u * (3 - 2 * u);
    drawHand(tx, ty, Math.max(0.05, reach), clamp((k.t - 2.0) / 0.35, 0, 1));
  }
  if (k.t > 2.9) {
    g.fillStyle = 'rgba(0,0,0,' + clamp((k.t - 2.9) / 0.55, 0, 1) + ')';
    g.fillRect(0, 0, W, H);
  }
}

function enterInfaz() {
  buildInfazGrid();
  kid = null;
  kidLift = 0;
  st = 'infaz';
  infaz = { t: 0, left: INFAZ_TIME, x: 32 * MT, y: 47 * MT, face: 1, walk: 0, fade: 1, joy: null, hb: 0, step: 0, room: 'GÜVENLİK OFİSİ' };
  infazKeys.clear();
  startInfazMusic();
  bump('kid');
}

function infazTouch(e, type) {
  if (!infaz) return;
  if (type === 'start') infaz.joy = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
  else if (type === 'move' && infaz.joy) { infaz.joy.x = e.clientX; infaz.joy.y = e.clientY; }
  else if (type === 'end') infaz.joy = null;
}

function updateInfaz(dt) {
  const f = infaz;
  f.t += dt;
  if (f.fade > 0) f.fade = Math.max(0, f.fade - dt * 1.2);
  f.left -= dt;
  let ix = 0, iy = 0;
  if (infazKeys.has('arrowleft') || infazKeys.has('a')) ix -= 1;
  if (infazKeys.has('arrowright') || infazKeys.has('d')) ix += 1;
  if (infazKeys.has('arrowup') || infazKeys.has('w')) iy -= 1;
  if (infazKeys.has('arrowdown') || infazKeys.has('s')) iy += 1;
  if (!ix && !iy && f.joy) {
    const dx = f.joy.x - f.joy.x0, dy = f.joy.y - f.joy.y0, m = Math.hypot(dx, dy);
    if (m > 14) {
      const s = Math.min(1, (m - 14) / 70);
      ix = dx / m * s;
      iy = dy / m * s;
    }
  }
  const mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; }
  const moving = mag > 0.05;
  if (moving) {
    const nx = f.x + ix * 560 * dt, ny = f.y + iy * 560 * dt;
    if (canStand(nx, f.y, 26)) f.x = nx;
    if (canStand(f.x, ny, 26)) f.y = ny;
    if (ix) f.face = ix > 0 ? 1 : -1;
    f.walk += dt;
    f.step -= dt;
    if (f.step <= 0) { f.step = 0.3; SFX.tone(95, 60, 0.07, 'sine', 0.07); }
  }
  const ri = roomIdx(Math.floor(f.x / GCELL), Math.floor(f.y / GCELL));
  if (ri >= 0 && INFAZ_FLOORS[ri].n) f.room = INFAZ_FLOORS[ri].n;
  if (f.left < 10) {
    f.hb -= dt;
    if (f.hb <= 0) { f.hb = 0.45 + f.left * 0.04; SFX.tone(62, 40, 0.14, 'sine', 0.3); }
  }
  if (f.left <= 0) startScare();
}

function drawInfazProps(f) {
  const M = MT;
  for (const s of INFAZ_SOLIDS) {
    const x = s.x * M, y = s.y * M, w = s.w * M, h = s.h * M;
    if (x > f.x + W / 2 + 100 || x + w < f.x - W / 2 - 100 || y > f.y + H / 2 + 100 || y + h < f.y - H / 2 - 100) continue;
    if (!s.k || s.k === 'table') {
      g.fillStyle = '#4a2f1a'; rr(x, y + 10, w, h - 10, 14); g.fill();
      g.fillStyle = '#6b4526'; rr(x + 6, y + 4, w - 12, h - 20, 12); g.fill();
      g.fillStyle = '#ff6bd5';
      for (const hx of [x + w * 0.3, x + w * 0.7]) {
        g.beginPath(); g.moveTo(hx - 14, y + 14); g.lineTo(hx + 14, y + 14); g.lineTo(hx, y - 24); g.closePath(); g.fill();
      }
    } else if (s.k === 'curtain') {
      g.fillStyle = '#5a1f78'; rr(x, y, w, h, 10); g.fill();
      g.strokeStyle = '#9b4fd0'; g.lineWidth = 4;
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(x + i * w / 8, y + 6); g.lineTo(x + i * w / 8, y + h - 6); g.stroke(); }
      drawStar(x + w / 2, y + h / 2, 34, 0);
    } else if (s.k === 'counter') {
      g.fillStyle = '#6a7078'; rr(x, y, w, h, 10); g.fill();
      g.fillStyle = '#8a9099'; rr(x + 6, y + 6, w - 12, h * 0.45, 8); g.fill();
    } else if (s.k === 'stall') {
      g.fillStyle = '#2d5a7a'; rr(x, y, w, h, 8); g.fill();
      g.fillStyle = '#1a3a52'; g.fillRect(x + w * 0.2, y + h * 0.6, w * 0.6, h * 0.4);
    } else if (s.k === 'desk') {
      g.fillStyle = '#3a3f4a'; rr(x, y, w, h, 12); g.fill();
      for (const mx of [x + w * 0.22, x + w * 0.62]) {
        g.fillStyle = '#0a0f1a'; rr(mx, y + 10, w * 0.16, h * 0.55, 6); g.fill();
        g.fillStyle = 'rgba(80,160,255,' + (0.7 + 0.2 * Math.sin(t * 9 + mx)) + ')';
        rr(mx + 6, y + 16, w * 0.16 - 12, h * 0.55 - 14, 4); g.fill();
      }
    } else if (s.k === 'shelf') {
      g.fillStyle = '#3d3326'; rr(x, y, w, h, 8); g.fill();
      g.fillStyle = '#6a5a3e';
      for (let i = 1; i < 5; i++) g.fillRect(x + 4, y + i * h / 5, w - 8, 6);
    }
  }
  const mascots = [[26, 4.2, '#6b3a1c', 'F'], [31, 4.2, '#6a3fa0', 'B'], [36, 4.2, '#d9b514', 'C']];
  for (const [mx, my, col] of mascots) {
    const cx = mx * M, cy = my * M;
    if (Math.abs(cx - f.x) > W && Math.abs(cy - f.y) > H) continue;
    g.fillStyle = col; rr(cx - 36, cy - 10, 72, 96, 22); g.fill();
    g.beginPath(); g.arc(cx, cy - 26, 40, 0, 7); g.fill();
    g.beginPath(); g.arc(cx - 30, cy - 58, 14, 0, 7); g.arc(cx + 30, cy - 58, 14, 0, 7); g.fill();
    const blink = Math.sin(t * 1.3 + mx) > 0.94 ? 0 : 1;
    g.fillStyle = 'rgba(255,255,255,' + (0.9 * blink) + ')';
    g.beginPath(); g.arc(cx - 15, cy - 30, 8, 0, 7); g.arc(cx + 15, cy - 30, 8, 0, 7); g.fill();
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 38px "Arial Black",system-ui,sans-serif';
  g.fillStyle = 'rgba(255,255,255,.17)';
  for (const fl of INFAZ_FLOORS) {
    if (!fl.n) continue;
    g.fillText(fl.n, (fl.x + fl.w / 2) * M, (fl.y + 1.1) * M);
  }
}

function drawInfaz(dt) {
  const f = infaz, G = GCELL;
  g.fillStyle = '#050509';
  g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W / 2 - f.x, H / 2 - f.y);
  const cx0 = Math.max(0, Math.floor((f.x - W / 2) / G) - 1), cx1 = Math.min(GW - 1, Math.ceil((f.x + W / 2) / G) + 1);
  const cy0 = Math.max(0, Math.floor((f.y - H / 2) / G) - 1), cy1 = Math.min(GH - 1, Math.ceil((f.y + H / 2) / G) + 1);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const ri = infazRoom[cy * GW + cx];
      if (ri < 0) continue;
      g.fillStyle = INFAZ_FLOORS[ri].c;
      g.fillRect(cx * G, cy * G, G + 1, G + 1);
      if ((cx + cy) & 1) { g.fillStyle = 'rgba(255,255,255,.025)'; g.fillRect(cx * G, cy * G, G, G); }
      g.fillStyle = '#4a4a68';
      if (roomIdx(cx, cy - 1) < 0) g.fillRect(cx * G, cy * G, G, 6);
      if (roomIdx(cx, cy + 1) < 0) g.fillRect(cx * G, cy * G + G - 6, G, 6);
      if (roomIdx(cx - 1, cy) < 0) g.fillRect(cx * G, cy * G, 6, G);
      if (roomIdx(cx + 1, cy) < 0) g.fillRect(cx * G + G - 6, cy * G, 6, G);
    }
  }
  drawInfazProps(f);
  shadow(f.x, f.y + 38, 90, 0.35);
  g.save();
  g.shadowColor = charDef().col;
  g.shadowBlur = 18;
  drawSprite(charDef().spr, f.x, f.y + 40, 130, 1, Math.sin(f.walk * 14) * 0.07, f.face);
  g.restore();
  g.restore();

  const fear = 1 - clamp(f.left / INFAZ_TIME, 0, 1);
  const R = (760 - 260 * fear) * (0.97 + 0.03 * Math.random());
  const fog = g.createRadialGradient(W / 2, H / 2, R * 0.28, W / 2, H / 2, R);
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(0.6, 'rgba(0,0,0,0.5)');
  fog.addColorStop(1, 'rgba(0,0,0,0.985)');
  g.fillStyle = fog;
  g.fillRect(0, 0, W, H);

  if (f.left < 10) {
    const k = 1 - f.left / 10;
    const dg = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
    dg.addColorStop(0, 'rgba(160,0,0,0)');
    dg.addColorStop(1, 'rgba(160,0,0,' + ((0.25 + 0.15 * Math.sin(t * 10)) * k + 0.1 * k) + ')');
    g.fillStyle = dg;
    g.fillRect(0, 0, W, H);
  }

  const left = Math.max(0, f.left);
  const secs = Math.ceil(left);
  const pulse = left < 10 ? 1 + 0.07 * Math.sin(t * 12) : 1;
  g.save();
  g.translate(W / 2, 205);
  g.scale(pulse, pulse);
  bossText('İNFAZ EDİLMENE', 0, -95, 40, '#ff3b3b', '#1a0000', 5);
  bossText('00:' + (secs < 10 ? '0' : '') + secs, 0, 0, 130, left < 10 ? '#ff5a5a' : '#ffffff', '#240000', 4);
  g.restore();

  if (f.t < 2.8) {
    const a = Math.min(1, f.t / 0.4) * (f.t > 2.2 ? (2.8 - f.t) / 0.6 : 1);
    g.save();
    g.globalAlpha = a;
    bossText('İNFAZ ODASI', W / 2, 820, 120, '#ff2a2a', '#1a0000', 8);
    g.restore();
  }
  g.save();
  g.globalAlpha = 0.55;
  bossText(f.room, W / 2, 1600, 40, '#ffffff', '#000000', 4);
  g.restore();

  if (f.joy) {
    const rc = cv.getBoundingClientRect(), k = W / rc.width;
    const bx = (f.joy.x0 - rc.left) * k, by = (f.joy.y0 - rc.top) * k;
    let dx = (f.joy.x - f.joy.x0) * k, dy = (f.joy.y - f.joy.y0) * k;
    const m = Math.hypot(dx, dy);
    if (m > 110) { dx = dx / m * 110; dy = dy / m * 110; }
    g.save();
    g.globalAlpha = 0.4;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    g.beginPath(); g.arc(bx, by, 110, 0, 7); g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(bx + dx, by + dy, 46, 0, 7); g.fill();
    g.restore();
  }

  if (f.fade > 0) { g.fillStyle = 'rgba(0,0,0,' + f.fade + ')'; g.fillRect(0, 0, W, H); }
}

function startScare() {
  stopInfazMusic();
  st = 'scare';
  scare = { t: 0, fired: false };
  const d = Math.floor(dist);
  recordLocalRun(d, coins);
  const saved = cleanName(store.get('name', ''));
  if (SB_ON && saved && d > 0) sbSubmit(saved, d, coins).catch(() => {});
}

function updateScare(dt) {
  const s = scare;
  s.t += dt;
  if (!s.fired && s.t >= 0.75) {
    s.fired = true;
    SFX.play('infazScare', { volume: 1.0 });
    buzz([250, 80, 250, 80, 500]);
  }
  if (s.fired && s.t < 2.45) shake = Math.max(shake, 0.7);
  if (s.t >= 2.75) {
    scare = null;
    infaz = null;
    kid = null;
    goMenu();
  }
}

function drawScare(dt) {
  const s = scare;
  if (s.t < 0.75 && infaz) {
    drawInfaz(dt);
    g.fillStyle = 'rgba(0,0,0,' + (clamp(s.t / 0.75, 0, 1) * (Math.random() < 0.3 ? 0.6 : 1)) + ')';
    g.fillRect(0, 0, W, H);
    return;
  }
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  if (s.t >= 2.45) return;
  const im = IMG.scare;
  if (im && im.naturalWidth) {
    const k = clamp((s.t - 0.75) / 1.5, 0, 1);
    const sc = Math.max(W / im.naturalWidth, H / im.naturalHeight) * (1.02 + 0.28 * k);
    const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
    g.drawImage(im, (W - w) / 2 + (Math.random() - 0.5) * 36, (H - h) / 2 + (Math.random() - 0.5) * 36, w, h);
  }
  if (Math.random() < 0.14) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, W, H); }
}

addEventListener('keydown', e => {
  if (st !== 'infaz') return;
  infazKeys.add(e.key.toLowerCase());
  if (e.key.indexOf('Arrow') === 0 || e.key === ' ') e.preventDefault();
});
addEventListener('keyup', e => infazKeys.delete(e.key.toLowerCase()));
addEventListener('blur', () => infazKeys.clear());
cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch' && st === 'infaz') infazTouch(e, 'start'); });
cv.addEventListener('pointermove', e => { if (e.pointerType !== 'touch' && st === 'infaz') infazTouch(e, 'move'); });
addEventListener('pointerup', e => { if (e.pointerType !== 'touch' && st === 'infaz') infazTouch(null, 'end'); });

/* ---------- input ---------- */
function typingInField(e) {
  const el = e.target;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}
addEventListener('keydown', e => {
  if (typingInField(e)) return;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { move(-1); e.preventDefault(); }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { move(1); e.preventDefault(); }
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { slide(); e.preventDefault(); }
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
  if (st === 'infaz') { infazTouch(e.changedTouches[0], 'start'); return; }
  const t0 = e.changedTouches[0];
  touchStart = { x: t0.clientX, y: t0.clientY, done: false };
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  if (st === 'infaz') { infazTouch(e.changedTouches[0], 'move'); return; }
  if (!touchStart || touchStart.done) return;
  const t0 = e.changedTouches[0];
  const dx = t0.clientX - touchStart.x;
  const dy = t0.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) {
    touchStart.done = true;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) jump(); else slide();
  }
}, { passive: false });
cv.addEventListener('touchend', e => {
  e.preventDefault();
  if (st === 'infaz') { infazTouch(null, 'end'); touchStart = null; return; }
  if (touchStart && !touchStart.done) tapAt(e.changedTouches[0].clientX);
  touchStart = null;
}, { passive: false });
cv.addEventListener('touchcancel', () => { touchStart = null; if (st === 'infaz') infazTouch(null, 'end'); });

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
  else if (dy < 0) jump(); else slide();
  mouseStart = null;
});

function skipBeat() {
  if (st === 'beat' && beat && beat.t > 1.1) finishBeat();
}
cv.addEventListener('pointerdown', skipBeat);
addEventListener('keydown', e => {
  if (typingInField(e)) return;
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
const cleanName = v => String(v || '').replace(/[\p{C}<>&"'`/\\]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 15);

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
function playerToken() {
  let t = '';
  try {
    t = localStorage.getItem('sixb_token') || '';
    if (!t) {
      t = (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
      localStorage.setItem('sixb_token', t);
    }
  } catch (e) {
    t = t || 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
  }
  return t;
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
    body: JSON.stringify({ p_id: playerId(), p_name: name, p_dist: d, p_coins: coins, p_token: playerToken() })
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
  if ((st !== 'over' && st !== 'menu') || $('modal').classList.contains('on')) return;
  askLeaderName(d, coins);
}

function askLeaderName(d, coins) {
  globalBusy = true;
  openModal(
    '<h2>LİDERLİĞE NASIL<br>KAYDEDİLMEK İSTİYORSUN?</h2>' +
    '<p>' + d + ' m ile ilk 10\'a girdin!</p>' +
    '<input id="lbName" maxlength="15" autocomplete="nickname" placeholder="ADIN">' +
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
const lbFoot = '<button class="b b2" id="myName">İSMİMİ DEĞİŞTİR</button><button class="b b2" id="admOpen">YÖNETİCİ MODU</button><button class="b b2" id="cl">KAPAT</button>';
function openLb(html) {
  openModal(html + lbFoot);
  $('mp').dataset.mode = 'lb';
  $('cl').onclick = closeModal;
  $('myName').onclick = playerRename;
  $('admOpen').onclick = adminLogin;
}
$('lbBtn').onclick = async () => {
  SFX.effect('ui');
  if (!SB_ON) {
    openLb('<h2>LİDERLİK</h2>' + localRowsHtml() + '<p class="lbnote">GLOBAL TABLO HENÜZ AÇILMADI</p>');
    return;
  }
  openLb('<h2>LİDERLİK</h2><p>YÜKLENİYOR…</p>');
  try {
    const top = await sbTop(10);
    if (!document.getElementById('modal').classList.contains('on') || $('mp').dataset.mode !== 'lb') return;
    openLb('<h2>LİDERLİK</h2>' + globalRowsHtml(top));
  } catch (e) {
    if (!$('modal').classList.contains('on') || $('mp').dataset.mode !== 'lb') return;
    openLb('<h2>LİDERLİK</h2>' + localRowsHtml() + '<p class="lbnote">BAĞLANTI YOK — YEREL SKORLAR</p>');
  }
};

/* ---------- oyuncu kendi adını değiştirir ---------- */
async function sbRenameMe(name) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/rename_me', {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p_id: playerId(), p_token: playerToken(), p_name: name })
  });
  const txt = await r.text();
  if (!r.ok) {
    let msg = txt;
    try { msg = JSON.parse(txt).message || txt; } catch (e) {}
    const err = new Error(msg || ('HTTP ' + r.status));
    err.status = r.status;
    throw err;
  }
}
function renameErrText(e) {
  const m = String((e && e.message) || '');
  if (m.indexOf('INVALID_NAME') !== -1) return 'AD EN AZ 2 KARAKTER OLMALI';
  if (m.indexOf('INVALID_TOKEN') !== -1) return 'KAYIT BULUNAMADI — ÖNCE LİDERLİĞE GİR';
  if (e.status === 404) return 'SUNUCU GÜNCELLENMEDİ';
  return 'İŞLEM YAPILAMADI — TEKRAR DENE';
}

function playerRename() {
  if (!SB_ON) {
    openModal('<h2>İSMİMİ DEĞİŞTİR</h2><p>Liderlik sunucusu ayarlı değil.</p>' + lbCloseBtn);
    $('cl').onclick = closeModal;
    return;
  }
  const saved = cleanName(store.get('name', ''));
  if (!saved) {
    openModal('<h2>İSMİMİ DEĞİŞTİR</h2><p>Liderlikte henüz bir adın yok.<br>İlk 10\'a girince adın sorulacak.</p>' + lbCloseBtn);
    $('cl').onclick = closeModal;
    return;
  }
  openModal(
    '<h2>İSMİMİ DEĞİŞTİR</h2>' +
    '<input id="myNameIn" maxlength="15" autocomplete="nickname" value="' + escHtml(saved) + '">' +
    '<p class="lbnote err" id="myNameErr"></p>' +
    '<button class="b b1" id="myNameSave">KAYDET</button>' +
    '<button class="b b2" id="myNameBack">GERİ</button>'
  );
  $('mp').dataset.mode = 'name';
  const inp = $('myNameIn');
  const err = $('myNameErr');
  setTimeout(() => { inp.focus(); inp.select(); }, 80);
  const save = async () => {
    const nm = cleanName(inp.value);
    if (nm.length < 2) { err.textContent = 'AD EN AZ 2 KARAKTER OLMALI'; inp.focus(); return; }
    $('myNameSave').disabled = true;
    $('myNameSave').textContent = 'KAYDEDİLİYOR…';
    try {
      await sbRenameMe(nm);
      store.set('name', nm);
      openModal('<h2>ADIN DEĞİŞTİ</h2><p>Yeni adın:<br><b>' + escHtml(nm) + '</b></p><button class="b b1" id="myNameOk">TAMAM</button>');
      $('myNameOk').onclick = () => { $('lbBtn').onclick(); };
    } catch (e) {
      $('myNameSave').disabled = false;
      $('myNameSave').textContent = 'KAYDET';
      err.textContent = renameErrText(e);
    }
  };
  $('myNameSave').onclick = save;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  $('myNameBack').onclick = () => { $('lbBtn').onclick(); };
}

/* ---------- yönetici modu ---------- */
let adminPass = '';

async function sbAdmin(action, id, name) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/admin_scores', {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p_pass: adminPass, p_action: action, p_id: id || null, p_name: name || null })
  });
  const txt = await r.text();
  if (!r.ok) {
    let msg = txt;
    try { msg = JSON.parse(txt).message || txt; } catch (e) {}
    const err = new Error(msg || ('HTTP ' + r.status));
    err.status = r.status;
    throw err;
  }
  return null;
}
function adminErrText(e) {
  const m = String((e && e.message) || '');
  if (m.indexOf('ADMIN_PASSWORD') !== -1 || e.status === 401 || e.status === 403) return 'ŞİFRE YANLIŞ';
  if (m.indexOf('INVALID_NAME') !== -1) return 'AD EN AZ 2 KARAKTER OLMALI';
  return 'İŞLEM YAPILAMADI — TEKRAR DENE';
}

function adminLogin() {
  adminPass = '';
  if (!SB_ON) {
    openModal('<h2>YÖNETİCİ MODU</h2><p>Liderlik sunucusu ayarlı değil.</p>' + lbCloseBtn);
    $('cl').onclick = closeModal;
    return;
  }
  openModal(
    '<h2>YÖNETİCİ GİRİŞİ</h2>' +
    '<input id="admPass" type="password" maxlength="32" autocomplete="current-password" placeholder="ŞİFRE">' +
    '<p class="lbnote err" id="admErr"></p>' +
    '<button class="b b1" id="admGo">GİRİŞ</button>' +
    '<button class="b b2" id="admCancel">İPTAL</button>'
  );
  const inp = $('admPass');
  const err = $('admErr');
  setTimeout(() => inp.focus(), 80);
  const go = async () => {
    if (!inp.value) { err.textContent = 'ŞİFRE GİR'; return; }
    $('admGo').disabled = true;
    $('admGo').textContent = 'KONTROL…';
    adminPass = inp.value;
    try {
      await sbAdmin('check');
      adminOn = true;
      adminPanel();
    } catch (e) {
      adminPass = '';
      $('admGo').disabled = false;
      $('admGo').textContent = 'GİRİŞ';
      err.textContent = adminErrText(e);
      inp.focus();
    }
  };
  $('admGo').onclick = go;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  $('admCancel').onclick = () => { adminPass = ''; closeModal(); };
}

async function adminPanel() {
  openModal('<h2>YÖNETİCİ MODU</h2><p>YÜKLENİYOR…</p>' + lbCloseBtn);
  $('mp').dataset.mode = 'admin';
  $('cl').onclick = closeModal;
  let top;
  try {
    top = await sbTop(100);
  } catch (e) {
    if ($('mp').dataset.mode !== 'admin' || !$('modal').classList.contains('on')) return;
    openModal('<h2>YÖNETİCİ MODU</h2><p>LİDERLİK YÜKLENEMEDİ.</p>' + lbCloseBtn);
    $('cl').onclick = closeModal;
    return;
  }
  if ($('mp').dataset.mode !== 'admin' || !$('modal').classList.contains('on')) return;
  const rows = top.length
    ? top.map((s, i) =>
      '<div class="row admin"><span>' + (i + 1) + '.</span>' +
      '<span class="lbname">' + escHtml(s.name) + '</span>' +
      '<span class="adist">' + (s.dist | 0) + ' m</span>' +
      '<span class="abtns"><button class="abtn" data-i="' + i + '">AD</button><button class="abtn del" data-d="' + i + '">SİL</button></span></div>'
    ).join('')
    : '<p>Henüz kayıt yok.</p>';
  openModal(
    '<h2>YÖNETİCİ MODU</h2>' +
    (top.length ? '<p class="lbnote">İLK ' + top.length + ' KAYIT</p>' : '') +
    rows +
    '<button class="b b2" id="admOut">ÇIKIŞ</button><button class="b b2" id="cl">KAPAT</button>'
  );
  $('mp').dataset.mode = 'admin';
  for (const b of $('mp').querySelectorAll('[data-i]')) b.onclick = () => adminRename(top[+b.dataset.i]);
  for (const b of $('mp').querySelectorAll('[data-d]')) b.onclick = () => adminDelete(top[+b.dataset.d]);
  $('admOut').onclick = () => { adminPass = ''; closeModal(); };
  $('cl').onclick = closeModal;
}

function adminRename(s) {
  openModal(
    '<h2>ADI DEĞİŞTİR</h2>' +
    '<p>' + escHtml(s.name) + ' · ' + (s.dist | 0) + ' m</p>' +
    '<input id="admName" maxlength="15" value="' + escHtml(s.name) + '">' +
    '<p class="lbnote err" id="admErr"></p>' +
    '<button class="b b1" id="admSave">KAYDET</button>' +
    '<button class="b b2" id="admBack">GERİ</button>'
  );
  const inp = $('admName');
  const err = $('admErr');
  setTimeout(() => { inp.focus(); inp.select(); }, 80);
  const save = async () => {
    const nm = cleanName(inp.value);
    if (nm.length < 2) { err.textContent = 'AD EN AZ 2 KARAKTER OLMALI'; inp.focus(); return; }
    $('admSave').disabled = true;
    $('admSave').textContent = 'KAYDEDİLİYOR…';
    try {
      await sbAdmin('rename', s.player_id, nm);
      adminPanel();
    } catch (e) {
      $('admSave').disabled = false;
      $('admSave').textContent = 'KAYDET';
      err.textContent = adminErrText(e);
    }
  };
  $('admSave').onclick = save;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  $('admBack').onclick = adminPanel;
}

function adminDelete(s) {
  openModal(
    '<h2>KAYDI SİL</h2>' +
    '<p><b>' + escHtml(s.name) + '</b> · ' + (s.dist | 0) + ' m<br>Bu kayıt kalıcı olarak silinsin mi?</p>' +
    '<p class="lbnote err" id="admErr"></p>' +
    '<button class="b b1" id="admDel">SİL</button>' +
    '<button class="b b2" id="admBack">VAZGEÇ</button>'
  );
  $('admBack').onclick = adminPanel;
  $('admDel').onclick = async () => {
    $('admDel').disabled = true;
    $('admDel').textContent = 'SİLİNİYOR…';
    try {
      await sbAdmin('delete', s.player_id);
      adminPanel();
    } catch (e) {
      $('admDel').disabled = false;
      $('admDel').textContent = 'SİL';
      $('admErr').textContent = adminErrText(e);
    }
  };
}

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

for (const [id, fn] of [['tL', () => move(-1)], ['tJ', jump], ['tS', slide], ['tR', () => move(1)]]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}

$('chBtn').onclick = () => { SFX.effect('ui'); openChars(); };
$('msBtn').onclick = () => { SFX.effect('ui'); openMissions(); };
$('shBtn').onclick = () => { SFX.effect('ui'); openShop(); };
$('share').onclick = shareScore;
$('kidBtn').onclick = e => {
  e.stopPropagation();
  e.currentTarget.blur();
  if (st !== 'play' || boss || kid) return;
  objs.push({ ty: 'kid', lane: 0, d: 34 });
  SFX.effect('kidNear');
};
refreshBadges();

$('testBoss').onclick = e => {
  e.stopPropagation();
  e.currentTarget.blur();
  if (st !== 'play' || boss) return;
  if (mode) endMode();
  startBoss();
};

$('setBtn').onclick = () => {
  const draw = () => {
    openModal('<h2>AYARLAR</h2><button class="b b2" id="snd">SES: ' + (soundOn ? 'AÇIK' : 'KAPALI') + '</button><button class="b b2" id="modeSet">MOD: ' + MODE_LABEL[playMode] + '</button><button class="b b2" id="testSet">TEST MODU: ' + (testMode ? 'AÇIK' : 'KAPALI') + '</button><button class="b b2" id="admBtn">YÖNETİCİ MODU</button><button class="b b2" id="cl">KAPAT</button>');
    $('snd').onclick = () => {
      soundOn = !soundOn;
      store.set('sound', soundOn);
      SFX.setEnabled(soundOn);
      SFX.effect('ui');
      draw();
    };
    $('modeSet').onclick = () => { closeModal(); setScreen('modes'); };
    $('testSet').onclick = () => {
      testMode = !testMode;
      store.set('test', testMode);
      SFX.effect('ui');
      draw();
    };
    $('admBtn').onclick = adminLogin;
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
