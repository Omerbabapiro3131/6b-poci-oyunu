<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>6/B RUN – Poçilerden Kaçış</title>
<meta name="theme-color" content="#05080f">
<meta name="description" content="6/B RUN — Poçilerden kaçış. 6/B Studios yapımı ücretsiz koşu oyunu.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%23ffc42e'/%3E%3Ccircle cx='32' cy='32' r='24' fill='%230a1026'/%3E%3Ctext x='32' y='42' font-family='Arial Black,Arial' font-size='22' font-weight='900' fill='%23fff' text-anchor='middle'%3E6/B%3C/text%3E%3C/svg%3E">
<link rel="manifest" href="manifest-6b.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="6/B RUN">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<script>window.__bip=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;});</script>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="wrap">
  <canvas id="c" width="941" height="1672"></canvas>

  <div id="splash">
    <div class="splash-badge"><span>6/B</span></div>
    <div class="splash-brand">6/B STUDIOS</div>
    <div class="splash-sub">PATRİCK JÖLELERİNİ SUNAR</div>
  </div>

  <div id="hud">
    <button class="pill" id="pause" aria-label="Duraklat"></button>
    <div class="pill" id="dist">0 m</div>
    <div class="pill" id="coinPill"><i class="coin"></i><span id="coinLabel">6/B</span><span id="cn">0</span></div>
    <div class="pill" id="pw" hidden></div>
    <div id="rk">YENİ REKOR!</div>
    <div id="modeBanner">
      <div class="mb-title">POÇİ MODU</div>
      <div class="mb-row"><span>2X PUAN</span><span id="modeClock">10 SANİYE</span></div>
    </div>
    <div id="modeEnd">POÇİ MODU BİTTİ!</div>
    <div id="flashMsg"></div>
    <div id="offer">
      <button id="offerContinue"><span id="offerCost">★ 15 · DEVAM ET</span><small id="offerStars">SENTA: 0</small></button>
      <div class="obar"><i id="offerBar"></i></div>
      <button id="offerQuit">POÇİLİKDEN VAZGEÇ</button>
    </div>
  </div>

  <div id="touch">
    <button class="tbtn" id="tL">SOL</button>
    <button class="tbtn jump" id="tJ">ZIPLA</button>
    <button class="tbtn" id="tR">SAĞ</button>
  </div>

  <div class="scr" id="modes">
    <div class="mode-top">
      <div class="mode-title">NASIL OYNUYORSUN?</div>
      <div class="mode-sub">MODUNU SEÇ</div>
    </div>
    <div class="mode-list">
      <button class="mode-btn" id="modeBoard" data-mode="board">
        <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="9" width="54" height="36" rx="5"/><path d="M32 45v9M21 54h22"/></svg>
        <span class="mtxt"><b>AKILLI TAHTA</b><small>BÜYÜK TUŞLAR</small></span>
      </button>
      <button class="mode-btn" id="modePhone" data-mode="phone">
        <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="19" y="5" width="26" height="54" rx="7"/><path d="M29 50h6"/></svg>
        <span class="mtxt"><b>TELEFON</b><small>KAYDIR · DOKUN</small></span>
      </button>
      <button class="mode-btn" id="modePc" data-mode="pc">
        <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="33" rx="4"/><path d="M32 43v9M22 55h20"/></svg>
        <span class="mtxt"><b>BİLGİSAYAR</b><small>KLAVYE · ← → BOŞLUK</small></span>
      </button>
    </div>
    <div class="mode-foot">6/B STUDIOS PATRİCK JÖLELERİNİ SUNAR</div>
  </div>

  <div class="scr" id="menu">
    <div class="code-tag">BU SİTE 3.119 SATIR KOD</div>
    <div class="menu-top">
      <div class="logo">6/B <b>RUN</b></div>
      <div class="tag">POÇİLERDEN KAÇIŞ</div>
    </div>
    <div class="menu-bottom">
      <button class="b b1" id="play"><span class="tri"></span>OYNA</button>
      <div class="menu-row">
        <button class="b b2 small" id="lbBtn">LİDERLİK</button>
        <button class="b b2 small" id="setBtn">AYARLAR</button>
      </div>
      <button class="mode-chip" id="modeChip">MOD: TELEFON</button>
      <button class="mode-chip install" id="installBtn">UYGULAMA OLARAK YÜKLE</button>
      <div id="playHint">KAYDIR VEYA DOKUN</div>
      <div id="best">REKOR: 0 m · 6/B STUDIOS</div>
      <div class="credit">6/B STUDIOS PATRİCK JÖLELERİNİ SUNAR</div>
    </div>
  </div>

  <div class="scr" id="over">
    <div class="over-title" id="overTitle">YAKALANDIN!</div>
    <div class="over-panel">
      <div class="stats">
        <div class="stat"><span>MESAFE</span><b id="od">0 m</b></div>
        <div class="stat"><span>TOPLANAN 6/B</span><b id="oc">0</b></div>
      </div>
      <div class="btns">
        <button class="b b1" id="again">TEKRAR OYNA</button>
        <button class="b b2" id="home">ANA MENÜ</button>
      </div>
    </div>
  </div>

  <div id="modal" class="modal"><div class="panel" id="mp"></div></div>
</div>
<script src="js/config.js"></script>
<script src="js/audio.js"></script>
<script src="js/game.js"></script>
</body>
</html>
