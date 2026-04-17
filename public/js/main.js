import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { MultiplayerClient } from './multiplayer.js';
import { BotPlayer, BOT_PERSONALITIES } from './bot.js';
import * as UI from './ui.js';
import * as HighScores from './highscores.js';
import * as Sound from './sound.js';

let game = null;
let multiplayer = null;
let isMultiplayer = false;
let isBotGame = false;
let selectedDifficulty = 1;
let renderer = null;
let opponentName = '';
let myName = 'Player';

// Bot state
let botGame = null;
let botPlayer = null;
let botSyncInterval = null;
let lastBotKey = 'rookie';
let botGameOverHandled = false;

// --- Difficulty selection ---
const LEVEL_HINTS = [
  null,
  { speed: 'Slow',     score: '1×',  color: '#9ac434' }, // 1
  { speed: 'Slow',     score: '2×',  color: '#9ac434' }, // 2
  { speed: 'Medium',   score: '3×',  color: '#9ac434' }, // 3
  { speed: 'Medium',   score: '4×',  color: '#f0a800' }, // 4
  { speed: 'Fast',     score: '5×',  color: '#f0a800' }, // 5
  { speed: 'Fast',     score: '6×',  color: '#f0a800' }, // 6
  { speed: 'Very fast', score: '7×', color: '#f46c22' }, // 7
  { speed: 'Very fast', score: '8×', color: '#f46c22' }, // 8
  { speed: 'Extreme',  score: '9×',  color: '#e03030' }, // 9
  { speed: 'Max speed', score: '10×', color: '#e03030' }, // 10
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
  selectedDifficulty = parseInt(btn.dataset.level);
  updateDifficultyHint(selectedDifficulty);
});

updateDifficultyHint(1);

// --- Menu buttons ---
document.getElementById('btn-solo').addEventListener('click', () => {
  Sound.initAudio();
  Sound.resumeAudio();
  isMultiplayer = false;
  isBotGame = false;
  UI.hideOpponentSection();
  startSoloGame();
});

document.getElementById('btn-vs-bot').addEventListener('click', () => {
  Sound.initAudio();
  Sound.resumeAudio();
  UI.showScreen('bot-select-screen');
});

document.getElementById('btn-multiplayer').addEventListener('click', () => {
  Sound.initAudio();
  Sound.resumeAudio();
  isMultiplayer = true;
  isBotGame = false;
  initMultiplayer();
});

document.getElementById('btn-highscores').addEventListener('click', () => {
  UI.populateHighScores(HighScores.getHighScores());
  UI.showScreen('highscores-screen');
});

document.getElementById('btn-whats-new').addEventListener('click', () => {
  UI.showScreen('whats-new-screen');
});

document.getElementById('btn-back-whats-new').addEventListener('click', () => {
  UI.showScreen('menu-screen');
});

document.getElementById('btn-back-scores').addEventListener('click', () => {
  UI.showScreen('menu-screen');
});

// --- Bot select screen ---
document.getElementById('btn-back-bot-select').addEventListener('click', () => {
  UI.showScreen('menu-screen');
});

document.querySelectorAll('.bot-card').forEach(card => {
  card.addEventListener('click', () => {
    const botKey = card.dataset.bot;
    lastBotKey = botKey;
    isMultiplayer = false;
    isBotGame = true;
    startBotGame(botKey);
  });
});

// --- Game Over buttons ---
document.getElementById('btn-play-again').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  startSoloGame();
});

document.getElementById('btn-rematch').addEventListener('click', () => {
  if (!multiplayer) return;
  multiplayer.sendRematch();
  UI.showToast('Rematch requested — waiting for opponent...');
  document.getElementById('btn-rematch').disabled = true;
});

document.getElementById('btn-rematch-bot').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  startBotGame(lastBotKey);
});

document.getElementById('btn-back-to-menu').addEventListener('click', () => {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  if (game) game.stop();
  stopBotGame();
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
  UI.setMyNameLabel('');

  const canvas = document.getElementById('game-canvas');
  const nextCanvas = document.getElementById('next-piece-canvas');

  renderer = new Renderer(canvas);

  game = new Game(canvas, {
    level: selectedDifficulty,
    onScoreChange: (s) => UI.updateScore(s),
    onLinesChange: (l) => UI.updateLines(l),
    onLevelChange: (l) => UI.updateLevel(l),
    onLineClear: () => {},
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
    } else if (isBotGame) {
      // handled via handleBotGameOver
    } else {
      UI.showGameOver(data, false, false);
      if (HighScores.isHighScore(data.score)) {
        UI.showHighScoreEntry();
      }
    }
  }, 800);
}

// --- Bot game ---
function startBotGame(botKey) {
  stopBotGame();
  botGameOverHandled = false;

  const personality = BOT_PERSONALITIES[botKey] || BOT_PERSONALITIES.rookie;
  myName = document.getElementById('player-name')?.value.trim() || 'Player';

  UI.showScreen('game-screen');
  UI.showOpponentSection(personality.name);
  UI.setMyNameLabel(myName);

  const canvas = document.getElementById('game-canvas');
  const nextCanvas = document.getElementById('next-piece-canvas');
  renderer = new Renderer(canvas);

  // Hidden canvas for bot rendering
  const botCanvas = document.createElement('canvas');
  botCanvas.width = 300;
  botCanvas.height = 600;

  UI.showCountdown(3, () => {
    // Player game
    game = new Game(canvas, {
      level: selectedDifficulty,
      onScoreChange: (s) => UI.updateScore(s),
      onLinesChange: (l) => UI.updateLines(l),
      onLevelChange: (l) => UI.updateLevel(l),
      onLineClear: () => {},
      onNextPiece: (type) => renderer.renderNextPiece(nextCanvas, type),
      onGameOver: (data) => {
        if (!botGameOverHandled) handleBotGameOver(false, data);
      },
      onBoardUpdate: () => {},
      onGarbage: (lines) => {
        if (botGame && botGame.state === 'playing') botGame.receiveGarbage(lines);
      }
    });

    // Bot game (no keyboard)
    botGame = new Game(botCanvas, {
      level: selectedDifficulty,
      noKeyboard: true,
      onScoreChange: () => {},
      onLinesChange: () => {},
      onLevelChange: () => {},
      onLineClear: () => {},
      onNextPiece: () => {},
      onGameOver: () => {
        if (!botGameOverHandled) handleBotGameOver(true, game ? { score: game.score, lines: game.lines, level: game.level } : { score: 0, lines: 0, level: 1 });
      },
      onBoardUpdate: () => {},
      onGarbage: (lines) => {
        if (game && game.state === 'playing') game.receiveGarbage(lines);
      }
    });

    game.start();
    botGame.start();

    botPlayer = new BotPlayer(botGame, botKey);
    botPlayer.start();

    // Sync bot board to opponent canvas at 10fps
    const oppCanvas = document.getElementById('opponent-canvas');
    botSyncInterval = setInterval(() => {
      if (botGame && botGame.board) {
        renderer.renderOpponentBoard(oppCanvas, botGame.board.getSnapshot());
        UI.updateOpponentScore(botGame.score || 0);
      }
    }, 100);
  });
}

function handleBotGameOver(playerWon, data) {
  botGameOverHandled = true;
  if (game) game.stop();
  stopBotGame();

  const gameData = data || { score: game?.score || 0, lines: game?.lines || 0, level: game?.level || 1 };

  setTimeout(() => {
    UI.showGameOver({ ...gameData, won: playerWon }, false, true);
    if (playerWon && game && HighScores.isHighScore(gameData.score)) {
      UI.showHighScoreEntry();
    }
  }, 500);
}

function stopBotGame() {
  if (botPlayer) {
    botPlayer.stop();
    botPlayer = null;
  }
  if (botSyncInterval) {
    clearInterval(botSyncInterval);
    botSyncInterval = null;
  }
  if (botGame) {
    botGame.stop();
    botGame = null;
  }
  isBotGame = false;
}

// --- Multiplayer ---
async function initMultiplayer() {
  UI.showScreen('lobby-screen');
  UI.hideRoomInfo();

  if (!multiplayer) {
    multiplayer = new MultiplayerClient();
    try {
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
    if (multiplayer.roomCode) {
      UI.showRoomInfo(multiplayer.roomCode);
    }
    UI.updatePlayersList(data.players, multiplayer.id);

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
      UI.hideGameOver();
      UI.hideHighScoreEntry();
      document.getElementById('btn-rematch').disabled = false;
      UI.showScreen('game-screen');
      UI.showOpponentSection(opponentName);
      UI.setMyNameLabel(myName);
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
      }, true, false);

      if (game && HighScores.isHighScore(game.score)) {
        UI.showHighScoreEntry();
      }
    }, 500);
  });

  multiplayer.on('opponentDisconnected', () => {
    UI.showToast('Opponent disconnected');
  });

  multiplayer.on('rematchRequested', (data) => {
    UI.showToast(`${data.name} wants a rematch! Click REMATCH to accept.`, 5000);
    const overlay = document.getElementById('overlay-gameover');
    if (overlay.classList.contains('hidden') && game) {
      UI.showGameOver({
        score: game.score,
        lines: game.lines,
        level: game.level,
        won: true
      }, true, false);
    }
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
    onLineClear: () => {},
    onNextPiece: (type) => renderer.renderNextPiece(nextCanvas, type),
    onGameOver: (data) => handleGameOver(data),
    onBoardUpdate: () => {},
    onGarbage: (lines) => {
      multiplayer.sendGarbage(lines);
    }
  });

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
document.getElementById('btn-copy-code').addEventListener('click', () => {
  const code = document.getElementById('room-code-value').textContent;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    UI.showToast('Room code copied!');
  });
});

document.getElementById('btn-create-room').addEventListener('click', () => {
  if (!multiplayer) return;
  myName = document.getElementById('player-name').value.trim() || 'Player';
  multiplayer.createRoom(myName, selectedDifficulty);
});

document.getElementById('btn-join-room').addEventListener('click', () => {
  if (!multiplayer) return;
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code.length !== 4) {
    UI.showToast('Enter a 4-character room code');
    return;
  }
  myName = document.getElementById('player-name').value.trim() || 'Player';
  multiplayer.joinRoom(code, myName);
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
