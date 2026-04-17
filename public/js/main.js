import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { MultiplayerClient } from './multiplayer.js';
import * as UI from './ui.js';
import * as HighScores from './highscores.js';
import * as Sound from './sound.js';

let game = null;
let multiplayer = null;
let isMultiplayer = false;
let selectedDifficulty = 1;
let renderer = null; // For rendering next piece and opponent board
let opponentName = '';

// --- Difficulty selection ---
const diffButtons = document.getElementById('difficulty-buttons');
diffButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('.diff-btn');
  if (!btn) return;
  diffButtons.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDifficulty = parseInt(btn.dataset.level);
});

// --- Menu buttons ---
document.getElementById('btn-solo').addEventListener('click', () => {
  Sound.initAudio();
  Sound.resumeAudio();
  isMultiplayer = false;
  UI.hideOpponentSection();
  startSoloGame();
});

document.getElementById('btn-multiplayer').addEventListener('click', () => {
  Sound.initAudio();
  Sound.resumeAudio();
  isMultiplayer = true;
  initMultiplayer();
});

document.getElementById('btn-highscores').addEventListener('click', () => {
  UI.populateHighScores(HighScores.getHighScores());
  UI.showScreen('highscores-screen');
});

document.getElementById('btn-back-scores').addEventListener('click', () => {
  UI.showScreen('menu-screen');
});

// --- Game Over buttons ---
document.getElementById('btn-play-again').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  if (isMultiplayer) {
    UI.showScreen('lobby-screen');
  } else {
    startSoloGame();
  }
});

document.getElementById('btn-back-to-menu').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  if (game) game.stop();
  if (multiplayer) {
    multiplayer.leaveRoom();
    multiplayer.disconnect();
    multiplayer = null;
  }
  UI.showScreen('menu-screen');
});

document.getElementById('btn-save-score').addEventListener('click', () => {
  const nameInput = document.getElementById('highscore-name');
  const name = nameInput.value.trim() || 'Anonymous';
  if (game) {
    HighScores.addHighScore(name, game.score, game.lines, game.level);
  }
  UI.hideHighScoreEntry();
  UI.showToast('Score saved!');
});

// --- Solo game ---
function startSoloGame() {
  UI.showScreen('game-screen');
  UI.hideOpponentSection();

  const canvas = document.getElementById('game-canvas');
  const nextCanvas = document.getElementById('next-piece-canvas');

  // Create a renderer instance for next piece
  renderer = new Renderer(canvas);

  game = new Game(canvas, {
    level: selectedDifficulty,
    onScoreChange: (s) => UI.updateScore(s),
    onLinesChange: (l) => UI.updateLines(l),
    onLevelChange: (l) => UI.updateLevel(l),
    onLineClear: (count, rows) => {},
    onNextPiece: (type) => renderer.renderNextPiece(nextCanvas, type),
    onGameOver: (data) => handleGameOver(data),
    onBoardUpdate: () => {},
    onGarbage: () => {}
  });

  game.start();
}

function handleGameOver(data) {
  setTimeout(() => {
    if (isMultiplayer) {
      multiplayer.sendTopOut();
      // Wait for server to declare winner
    } else {
      UI.showGameOver(data, false);
      if (HighScores.isHighScore(data.score)) {
        UI.showHighScoreEntry();
      }
    }
  }, 800); // Wait for game over particles
}

// --- Multiplayer ---
async function initMultiplayer() {
  UI.showScreen('lobby-screen');
  UI.hideRoomInfo();

  if (!multiplayer) {
    multiplayer = new MultiplayerClient();
    try {
      // Load socket.io client script if not loaded
      if (typeof io === 'undefined') {
        await loadScript('/socket.io/socket.io.js');
      }
      await multiplayer.connect();
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

function setupMultiplayerCallbacks() {
  multiplayer.on('roomCreated', (data) => {
    UI.showRoomInfo(data.code);
  });

  multiplayer.on('roomJoined', (data) => {
    // Show room info panel for the joining player too
    if (multiplayer.roomCode) {
      UI.showRoomInfo(multiplayer.roomCode);
    }
    UI.updatePlayersList(data.players, multiplayer.id);

    // Find opponent name
    const opponent = data.players.find(p => p.id !== multiplayer.id);
    if (opponent) {
      opponentName = opponent.name;
    }
  });

  multiplayer.on('roomError', (data) => {
    UI.showToast(data.message);
  });

  multiplayer.on('countdown', (data) => {
    if (data.seconds === 3) {
      // Prepare game screen
      UI.showScreen('game-screen');
      UI.showOpponentSection(opponentName);
    }
    Sound.playCountdown();
    const overlay = document.getElementById('overlay-countdown');
    const text = document.getElementById('countdown-text');
    overlay.classList.remove('hidden');
    text.textContent = data.seconds;
    text.style.color = '';
    text.style.animation = 'none';
    text.offsetHeight;
    text.style.animation = 'countdownPulse 0.5s ease-out';
  });

  multiplayer.on('gameStart', () => {
    Sound.playCountdownGo();
    const overlay = document.getElementById('overlay-countdown');
    const text = document.getElementById('countdown-text');
    text.textContent = 'GO!';
    text.style.color = 'var(--dk-orange)';
    text.style.animation = 'none';
    text.offsetHeight;
    text.style.animation = 'countdownPulse 0.5s ease-out';
    setTimeout(() => {
      overlay.classList.add('hidden');
      text.style.color = '';
      startMultiplayerGame();
    }, 600);
  });

  multiplayer.on('opponentState', (data) => {
    const oppCanvas = document.getElementById('opponent-canvas');
    if (renderer && data.board) {
      renderer.renderOpponentBoard(oppCanvas, data.board);
    }
    UI.updateOpponentScore(data.score || 0);
  });

  multiplayer.on('opponentGarbage', (data) => {
    if (game && data.lines > 0) {
      game.receiveGarbage(data.lines);
    }
  });

  multiplayer.on('gameOver', (data) => {
    if (game) game.stop();
    multiplayer.stopSync();

    const won = data.winnerId === multiplayer.id;
    setTimeout(() => {
      UI.showGameOver({
        score: game?.score || 0,
        lines: game?.lines || 0,
        level: game?.level || 1,
        won
      }, true);

      // Save high score even in multiplayer
      if (game && HighScores.isHighScore(game.score)) {
        UI.showHighScoreEntry();
      }
    }, 500);
  });

  multiplayer.on('opponentDisconnected', () => {
    UI.showToast('Opponent disconnected');
  });
}

function startMultiplayerGame() {
  const canvas = document.getElementById('game-canvas');
  const nextCanvas = document.getElementById('next-piece-canvas');

  renderer = new Renderer(canvas);

  game = new Game(canvas, {
    level: selectedDifficulty,
    onScoreChange: (s) => UI.updateScore(s),
    onLinesChange: (l) => UI.updateLines(l),
    onLevelChange: (l) => UI.updateLevel(l),
    onLineClear: (count, rows) => {},
    onNextPiece: (type) => renderer.renderNextPiece(nextCanvas, type),
    onGameOver: (data) => handleGameOver(data),
    onBoardUpdate: (board, score, lines, level) => {
      // Sent via sync interval, not every update
    },
    onGarbage: (lines) => {
      multiplayer.sendGarbage(lines);
    }
  });

  // Start state sync
  multiplayer.startSync(() => {
    if (!game || game.state === 'idle') return null;
    return {
      board: game.board.getSnapshot(),
      score: game.score,
      lines: game.lines,
      level: game.level
    };
  });

  game.start();
}

// --- Lobby buttons ---
document.getElementById('btn-create-room').addEventListener('click', () => {
  if (!multiplayer) return;
  const name = document.getElementById('player-name').value.trim() || 'Player';
  multiplayer.createRoom(name, selectedDifficulty);
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  if (!multiplayer) return;
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code.length !== 4) {
    UI.showToast('Enter a 4-character room code');
    return;
  }
  const name = document.getElementById('player-name').value.trim() || 'Player';
  multiplayer.joinRoom(code, name);
});

document.getElementById('btn-ready').addEventListener('click', () => {
  if (!multiplayer) return;
  multiplayer.setReady();
});

document.getElementById('btn-leave-room').addEventListener('click', () => {
  if (!multiplayer) return;
  multiplayer.leaveRoom();
  UI.hideRoomInfo();
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
  if (multiplayer) {
    multiplayer.leaveRoom();
    multiplayer.disconnect();
    multiplayer = null;
  }
  UI.showScreen('menu-screen');
});
