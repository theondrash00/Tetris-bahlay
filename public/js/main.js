import { MultiplayerClient } from './multiplayer.js';
import * as UI from './ui.js';
import * as HighScores from './highscores.js';
import * as Sound from './sound.js';
import { state, startSoloGame, startBotGame, backToMenu } from './gameController.js';
import { setupMultiplayerCallbacks } from './multiplayerCallbacks.js';

// --- Difficulty selection ---
const LEVEL_HINTS = [
  null,
  { speed: 'Slow', score: '1×', color: '#9ac434' },
  { speed: 'Slow', score: '2×', color: '#9ac434' },
  { speed: 'Medium', score: '3×', color: '#9ac434' },
  { speed: 'Medium', score: '4×', color: '#f0a800' },
  { speed: 'Fast', score: '5×', color: '#f0a800' },
  { speed: 'Fast', score: '6×', color: '#f0a800' },
  { speed: 'Very fast', score: '7×', color: '#f46c22' },
  { speed: 'Very fast', score: '8×', color: '#f46c22' },
  { speed: 'Extreme', score: '9×', color: '#e03030' },
  { speed: 'Max speed', score: '10×', color: '#e03030' }
];

function updateDifficultyHint(level) {
  const hint = document.getElementById('difficulty-hint');
  if (!hint) return;
  const data = LEVEL_HINTS[level];
  if (!data) return;
  hint.innerHTML = `<span class="hint-speed" style="color:${data.color}">${data.speed}</span> &nbsp;·&nbsp; <span class="hint-score" style="color:${data.color}">${data.score} score</span>`;
}

const diffButtons = document.getElementById('difficulty-buttons');
diffButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.diff-btn');
  if (!btn) return;
  diffButtons.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.selectedDifficulty = parseInt(btn.dataset.level);
  updateDifficultyHint(state.selectedDifficulty);
});
updateDifficultyHint(1);

// --- Menu buttons ---
function primeAudio() { Sound.initAudio(); Sound.resumeAudio(); }

document.getElementById('btn-solo').addEventListener('click', () => {
  primeAudio();
  startSoloGame();
});

document.getElementById('btn-vs-bot').addEventListener('click', () => {
  primeAudio();
  UI.showScreen('bot-select-screen');
});

document.getElementById('btn-multiplayer').addEventListener('click', () => {
  primeAudio();
  state.isMultiplayer = true;
  state.isBotGame = false;
  initMultiplayer();
});

document.getElementById('btn-highscores').addEventListener('click', () => {
  UI.populateHighScores(HighScores.getHighScores());
  UI.showScreen('highscores-screen');
});

document.getElementById('btn-whats-new').addEventListener('click', () => UI.showScreen('whats-new-screen'));
document.getElementById('btn-back-whats-new').addEventListener('click', () => UI.showScreen('menu-screen'));
document.getElementById('btn-back-scores').addEventListener('click', () => UI.showScreen('menu-screen'));
document.getElementById('btn-back-bot-select').addEventListener('click', () => UI.showScreen('menu-screen'));

document.querySelectorAll('.bot-card').forEach(card => {
  card.addEventListener('click', () => startBotGame(card.dataset.bot));
});

// --- Game Over buttons ---
document.getElementById('btn-play-again').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  startSoloGame();
});

document.getElementById('btn-rematch').addEventListener('click', () => {
  if (!state.multiplayer) return;
  state.multiplayer.sendRematch();
  UI.showToast('Rematch requested — waiting for opponent...');
  document.getElementById('btn-rematch').disabled = true;
});

document.getElementById('btn-rematch-bot').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  startBotGame(state.lastBotKey);
});

document.getElementById('btn-back-to-menu').addEventListener('click', backToMenu);

document.getElementById('btn-save-score').addEventListener('click', () => {
  const name = document.getElementById('highscore-name').value.trim() || 'Anonymous';
  if (state.game) {
    HighScores.addHighScore(name, state.game.score, state.game.lines, state.game.level);
  }
  UI.hideHighScoreEntry();
  UI.showToast('Score saved!');
});

// --- Multiplayer ---
async function initMultiplayer() {
  UI.showScreen('lobby-screen');
  UI.hideRoomInfo();

  if (!state.multiplayer) {
    state.multiplayer = new MultiplayerClient();
    try {
      if (typeof io === 'undefined') {
        await loadScript('/socket.io/socket.io.js');
      }
      await state.multiplayer.connect();
    } catch (err) {
      UI.showToast('Failed to connect to server');
      console.error('Multiplayer connection error:', err);
      UI.showScreen('menu-screen');
      return;
    }
    setupMultiplayerCallbacks();
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// --- Lobby buttons ---
document.getElementById('btn-copy-code').addEventListener('click', () => {
  const code = document.getElementById('room-code-value').textContent;
  if (!code) return;
  navigator.clipboard.writeText(code)
    .then(() => UI.showToast('Room code copied!'))
    .catch(() => UI.showToast('Failed to copy — try manually'));
});

document.getElementById('btn-copy-link').addEventListener('click', () => {
  const code = document.getElementById('room-code-value').textContent;
  if (!code) return;
  const url = `${location.origin}${location.pathname}?join=${code}`;
  navigator.clipboard.writeText(url)
    .then(() => UI.showToast('Invite link copied!'))
    .catch(() => UI.showToast('Failed to copy — try manually'));
});

document.getElementById('btn-create-room').addEventListener('click', () => {
  if (!state.multiplayer) return;
  state.myName = document.getElementById('player-name').value.trim() || 'Player';
  state.multiplayer.createRoom(state.myName, state.selectedDifficulty);
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  if (!state.multiplayer) return;
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code.length !== 4) {
    UI.showToast('Enter a 4-character room code');
    return;
  }
  state.myName = document.getElementById('player-name').value.trim() || 'Player';
  state.multiplayer.joinRoom(code, state.myName);
});

document.getElementById('btn-ready').addEventListener('click', () => state.multiplayer?.setReady());

document.getElementById('btn-leave-room').addEventListener('click', () => {
  if (!state.multiplayer) return;
  state.multiplayer.leaveRoom();
  UI.hideRoomInfo();
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
  if (state.multiplayer) {
    state.multiplayer.leaveRoom();
    state.multiplayer.disconnect();
    state.multiplayer = null;
  }
  UI.showScreen('menu-screen');
  history.replaceState(null, '', location.pathname);
});

// --- Auto-join via invite link (?join=XXXX) ---
const joinCode = new URLSearchParams(location.search).get('join');
if (joinCode && joinCode.length === 4) {
  document.getElementById('room-code-input').value = joinCode.toUpperCase();
  state.isMultiplayer = true;
  state.isBotGame = false;
  initMultiplayer();
}
