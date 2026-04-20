import * as UI from './ui.js';
import * as Sound from './sound.js';
import * as HighScores from './highscores.js';
import { state, startMultiplayerGame } from './gameController.js';
import { COUNTDOWN_GO_DURATION } from './constants.js';

function pulseCountdown(text, value, color = '') {
  text.textContent = value;
  text.style.color = color;
  text.style.animation = 'none';
  void text.offsetHeight;
  text.style.animation = 'countdownPulse 0.5s ease-out';
}

export function setupMultiplayerCallbacks() {
  const mp = state.multiplayer;

  mp.on('roomCreated', (data) => UI.showRoomInfo(data.code));

  mp.on('roomJoined', (data) => {
    if (mp.roomCode) UI.showRoomInfo(mp.roomCode);
    UI.updatePlayersList(data.players, mp.id);
    const opponent = data.players.find(p => p.id !== mp.id);
    if (opponent) state.opponentName = opponent.name;
  });

  mp.on('roomError', (data) => UI.showToast(data.message));

  mp.on('countdown', (data) => {
    if (data.seconds === 3) {
      UI.hideGameOver();
      UI.hideHighScoreEntry();
      document.getElementById('btn-rematch').disabled = false;
      UI.showScreen('game-screen');
      UI.showOpponentSection(state.opponentName);
      UI.setMyNameLabel(state.myName);
    }
    Sound.playCountdown();
    const overlay = document.getElementById('overlay-countdown');
    overlay.classList.remove('hidden');
    pulseCountdown(document.getElementById('countdown-text'), data.seconds);
  });

  mp.on('gameStart', () => {
    Sound.playCountdownGo();
    const overlay = document.getElementById('overlay-countdown');
    const text = document.getElementById('countdown-text');
    pulseCountdown(text, 'GO!', 'var(--dk-orange)');
    setTimeout(() => {
      overlay.classList.add('hidden');
      text.style.color = '';
      startMultiplayerGame();
    }, COUNTDOWN_GO_DURATION);
  });

  mp.on('opponentState', (data) => {
    const oppCanvas = document.getElementById('opponent-canvas');
    if (state.renderer && data.board) {
      state.renderer.renderOpponentBoard(oppCanvas, data.board);
    }
    UI.updateOpponentScore(data.score || 0);
  });

  mp.on('opponentGarbage', (data) => {
    if (state.game && data.lines > 0) state.game.receiveGarbage(data.lines);
  });

  mp.on('gameOver', (data) => {
    if (state.game) state.game.stop();
    mp.stopSync();
    const won = data.winnerId === mp.id;
    setTimeout(() => {
      UI.showGameOver({
        score: state.game?.score || 0,
        lines: state.game?.lines || 0,
        level: state.game?.level || 1,
        won
      }, true, false);
      if (state.game && HighScores.isHighScore(state.game.score)) {
        UI.showHighScoreEntry();
      }
    }, 500);
  });

  mp.on('opponentDisconnected', () => UI.showToast('Opponent disconnected'));

  mp.on('rematchRequested', (data) => {
    UI.showToast(`${data.name} wants a rematch! Click REMATCH to accept.`, 5000);
    const overlay = document.getElementById('overlay-gameover');
    if (overlay.classList.contains('hidden') && state.game) {
      UI.showGameOver({
        score: state.game.score,
        lines: state.game.lines,
        level: state.game.level,
        won: true
      }, true, false);
    }
  });
}
