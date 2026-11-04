const SFX = (() => {
  const SRC = {
    lane: 'assets/audio/degistiren.mp3',
    mode: 'assets/audio/boostlu_poci.mp3',
    ders: 'assets/audio/pexian.mp3',
    jole: 'assets/audio/jole_music.mp3',
    alo: 'assets/audio/alo_arif.mp3',
    dikidis: 'assets/audio/dikidis.mp3'
  };
  let enabled = true;
  let ac = null;
  const shots = new Set();
  const loops = new Set();

  function ensure() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ac = new C(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  const unlock = () => ensure();
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

  function play(key, { volume = 0.9, rate = 1 } = {}) {
    if (!enabled || !SRC[key]) return null;
    ensure();
    try {
      const a = new Audio(SRC[key]);
      a.volume = Math.max(0, Math.min(1, volume));
      a.playbackRate = rate;
      a.preload = 'auto';
      a.play().catch(() => {});
      shots.add(a);
      a.addEventListener('ended', () => shots.delete(a));
      return a;
    } catch (e) { return null; }
  }

  function loop(key, { volume = 0.85 } = {}) {
    if (!enabled || !SRC[key]) return { el: null, stop() {} };
    ensure();
    let a;
    try {
      a = new Audio(SRC[key]);
      a.loop = true;
      a.volume = Math.max(0, Math.min(1, volume));
      a.play().catch(() => {});
      loops.add(a);
    } catch (e) { return { el: null, stop() {} }; }
    return {
      el: a,
      stop(ms = 250) {
        loops.delete(a);
        if (ms <= 0) { try { a.pause(); a.currentTime = 0; } catch (e) {} return; }
        const t0 = performance.now();
        const v0 = a.volume;
        const step = now => {
          const k = Math.min(1, (now - t0) / ms);
          a.volume = Math.max(0, v0 * (1 - k));
          if (k < 1) requestAnimationFrame(step);
          else { try { a.pause(); a.currentTime = 0; } catch (e) {} }
        };
        requestAnimationFrame(step);
      }
    };
  }

  function stopAll() {
    shots.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    shots.clear();
    loops.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    loops.clear();
  }

  function setEnabled(v) {
    enabled = !!v;
    if (!enabled) stopAll();
  }

  function tone(f1, f2, dur, type, vol, delay = 0) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const gn = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  function noiseBurst(dur, vol, cutoff = 1400) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const gn = c.createGain();
    gn.gain.value = vol;
    src.connect(f).connect(gn).connect(c.destination);
    src.start();
  }

  function effect(name) {
    if (!enabled) return;
    switch (name) {
      case 'jump': tone(300, 640, 0.16, 'square', 0.09); break;
      case 'coin':
        tone(880, 880, 0.07, 'sine', 0.1);
        tone(1320, 1320, 0.12, 'sine', 0.07, 0.06);
        break;
      case 'crash':
        noiseBurst(0.4, 0.32, 900);
        tone(150, 45, 0.5, 'sawtooth', 0.16);
        break;
      case 'smash':
        noiseBurst(0.18, 0.18, 1600);
        tone(220, 90, 0.18, 'square', 0.08);
        break;
      case 'pickup':
        tone(523, 523, 0.09, 'triangle', 0.12);
        tone(659, 659, 0.09, 'triangle', 0.12, 0.08);
        tone(784, 784, 0.16, 'triangle', 0.12, 0.16);
        break;
      case 'mode':
        tone(392, 392, 0.12, 'triangle', 0.12);
        tone(523, 523, 0.12, 'triangle', 0.12, 0.1);
        tone(659, 659, 0.12, 'triangle', 0.12, 0.2);
        tone(784, 784, 0.28, 'triangle', 0.13, 0.3);
        break;
      case 'win':
        tone(523, 523, 0.1, 'square', 0.1);
        tone(659, 659, 0.1, 'square', 0.1, 0.09);
        tone(784, 784, 0.1, 'square', 0.1, 0.18);
        tone(1047, 1047, 0.34, 'square', 0.11, 0.27);
        break;
      case 'resume':
        tone(440, 880, 0.28, 'triangle', 0.12);
        break;
      case 'whoosh':
        noiseBurst(0.5, 0.16, 2600);
        tone(180, 720, 0.45, 'sawtooth', 0.07);
        break;
      case 'punch':
        noiseBurst(0.2, 0.36, 1000);
        tone(130, 44, 0.3, 'sawtooth', 0.22);
        break;
      case 'swing':
        noiseBurst(0.1, 0.1, 3200);
        tone(640, 220, 0.14, 'triangle', 0.05);
        break;
      case 'seyit':
        tone(55, 32, 1.1, 'sawtooth', 0.2);
        tone(196, 98, 0.7, 'square', 0.05);
        noiseBurst(0.25, 0.18, 500);
        break;
      case 'lose':
        tone(320, 120, 0.5, 'sawtooth', 0.1);
        break;
      case 'ui': tone(660, 880, 0.08, 'square', 0.06); break;
      default: break;
    }
  }

  return { play, loop, stopAll, setEnabled, effect };
})();
