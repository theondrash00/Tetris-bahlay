let audioCtx = null;

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function createOsc(type, freq, duration, volume = 0.1) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

function createNoise(duration, volume = 0.05, filterFreq = null) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  if (filterFreq) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1;
    source.connect(filter);
    filter.connect(gain);
  } else {
    source.connect(gain);
  }

  gain.connect(audioCtx.destination);
  source.start(audioCtx.currentTime);
  source.stop(audioCtx.currentTime + duration);
}

export function playMove() {
  createOsc('sine', 200, 0.05, 0.06);
}

export function playRotate() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.08);
}

export function playSoftDrop() {
  createNoise(0.02, 0.02, 2000);
}

export function playHardDrop() {
  createOsc('sine', 80, 0.15, 0.12);
  createNoise(0.1, 0.08, 500);
}

export function playLock() {
  createNoise(0.08, 0.06, 1000);
}

export function playLineClear(lineCount) {
  if (!audioCtx) return;
  const isTetris = lineCount >= 4;
  const duration = isTetris ? 0.4 : 0.2;
  const endFreq = isTetris ? 1200 : 800;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(isTetris ? 150 : 200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(isTetris ? 0.1 : 0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration + 0.05);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration + 0.05);

  // Add shimmer noise
  createNoise(duration * 0.8, 0.04, 3000);
}

export function playLevelUp() {
  if (!audioCtx) return;
  const notes = [400, 500, 650];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = audioCtx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc.start(start);
    osc.stop(start + 0.15);
  });
}

export function playGameOver() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.8);

  createNoise(0.5, 0.06);
}

export function playGarbageReceived() {
  createOsc('sine', 60, 0.2, 0.1);
  createNoise(0.15, 0.06, 200);
}

export function playCountdown() {
  createOsc('sine', 440, 0.15, 0.1);
}

export function playCountdownGo() {
  createOsc('sine', 880, 0.25, 0.12);
}
