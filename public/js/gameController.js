import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { BotPlayer, BOT_PERSONALITIES } from './bot.js';
import { COLS, ROWS, CELL_SIZE } from './constants.js';
import * as UI from './ui.js';
import * as HighScores from './highscores.js';

const { showTauntLegend, hideTauntLegend, showOpponentTaunt } = UI;

export const state = {
  game: null,
  multiplayer: null,
  renderer: null,
  isMultiplayer: false,
  isBotGame: false,
  selectedDifficulty: 1,
  opponentName: '',
  myName: 'Player',
  botGame: null,
  botPlayer: null,
  botSyncInterval: null,
  lastBotKey: 'rookie',
  botGameOverHandled: false
};

const BOT_SYNC_RATE = 100;

function getCanvases() {
  return {
    canvas: document.getElementById('game-canvas'),
    nextCanvas: document.getElementById('next-piece-canvas'),
    oppCanvas: document.getElementById('opponent-canvas')
  };
}

function createGame(canvas, overrides = {}) {
  const { nextCanvas } = getCanvases();
  return new Game(canvas, {
    level: state.selectedDifficulty,
    onScoreChange: (s) => UI.updateScore(s),
    onLinesChange: (l) => UI.updateLines(l),
    onLevelChange: (l) => UI.updateLevel(l),
    onLineClear: () => {},
    onNextPiece: (type) => state.renderer.renderNextPiece(nextCanvas, type),
    onGameOver: () => {},
    onGarbage: () => {},
    ...overrides
  });
}

function teardown() {
  if (state.game) { state.game.stop(); state.game = null; }
  stopBotGame();
  if (state.multiplayer) {
    state.multiplayer.leaveRoom();
    state.multiplayer.stopSync();
  }
}

export function stopBotGame() {
  if (state.botPlayer) { state.botPlayer.stop(); state.botPlayer = null; }
  if (state.botSyncInterval) { clearInterval(state.botSyncInterval); state.botSyncInterval = null; }
  if (state.botGame) { state.botGame.stop(); state.botGame = null; }
  state.isBotGame = false;
}

export function handleGameOver(data) {
  setTimeout(() => {
    if (state.isMultiplayer) {
      state.multiplayer.sendTopOut();
    } else if (state.isBotGame) {
      // handled via handleBotGameOver
    } else {
      UI.showGameOver(data, false, false);
      if (HighScores.isHighScore(data.score)) {
        UI.showHighScoreEntry();
      }
    }
  }, 800);
}

export function startSoloGame() {
  teardown();
  state.isMultiplayer = false;
  state.isBotGame = false;

  UI.showScreen('game-screen');
  UI.hideOpponentSection();
  UI.setMyNameLabel('');
  hideTauntLegend();

  const { canvas } = getCanvases();
  state.renderer = new Renderer(canvas);

  state.game = createGame(canvas, {
    onGameOver: (data) => handleGameOver(data)
  });
  state.game.start();
}

export function startBotGame(botKey) {
  teardown();
  state.isMultiplayer = false;
  state.isBotGame = true;
  state.lastBotKey = botKey;
  state.botGameOverHandled = false;

  const personality = BOT_PERSONALITIES[botKey] || BOT_PERSONALITIES.rookie;
  const nameInput = document.getElementById('player-name');
  state.myName = nameInput?.value.trim() || 'Player';

  UI.showScreen('game-screen');
  UI.showOpponentSection(personality.name);
  UI.setMyNameLabel(state.myName);

  const { canvas, oppCanvas } = getCanvases();
  state.renderer = new Renderer(canvas);

  const botCanvas = document.createElement('canvas');
  botCanvas.width = COLS * CELL_SIZE;
  botCanvas.height = ROWS * CELL_SIZE;

  showTauntLegend();
  UI.showCountdown(3, () => {
    state.game = createGame(canvas, {
      onGameOver: (data) => {
        if (!state.botGameOverHandled) handleBotGameOver(false, data);
      },
      onGarbage: (lines) => {
        if (state.botGame && state.botGame.state === 'playing') state.botGame.receiveGarbage(lines);
      },
      onTaunt: (msg) => showOpponentTaunt(msg)
    });

    state.botGame = new Game(botCanvas, {
      level: state.selectedDifficulty,
      noKeyboard: true,
      onScoreChange: () => {},
      onLinesChange: () => {},
      onLevelChange: () => {},
      onLineClear: () => {},
      onNextPiece: () => {},
      onGameOver: () => {
        if (!state.botGameOverHandled) {
          const data = state.game
            ? { score: state.game.score, lines: state.game.lines, level: state.game.level }
            : { score: 0, lines: 0, level: 1 };
          handleBotGameOver(true, data);
        }
      },
      onGarbage: (lines) => {
        if (state.game && state.game.state === 'playing') state.game.receiveGarbage(lines);
      }
    });

    state.game.start();
    state.botGame.start();

    state.botPlayer = new BotPlayer(state.botGame, botKey, (msg) => showOpponentTaunt(msg));
    state.botPlayer.start();

    state.botSyncInterval = setInterval(() => {
      if (state.botGame && state.botGame.board) {
        state.renderer.renderOpponentBoard(oppCanvas, state.botGame.board.getSnapshot());
        UI.updateOpponentScore(state.botGame.score || 0);
      }
    }, BOT_SYNC_RATE);
  });
}

function handleBotGameOver(playerWon, data) {
  state.botGameOverHandled = true;
  if (state.game) state.game.stop();
  stopBotGame();

  const gameData = data || { score: state.game?.score || 0, lines: state.game?.lines || 0, level: state.game?.level || 1 };

  setTimeout(() => {
    UI.showGameOver({ ...gameData, won: playerWon }, false, true);
    if (playerWon && HighScores.isHighScore(gameData.score)) {
      UI.showHighScoreEntry();
    }
  }, 500);
}

export function startMultiplayerGame() {
  const { canvas } = getCanvases();
  state.renderer = new Renderer(canvas);
  showTauntLegend();

  state.game = createGame(canvas, {
    onGameOver: (data) => handleGameOver(data),
    onGarbage: (lines) => state.multiplayer.sendGarbage(lines),
    onTaunt: (msg) => state.multiplayer.sendTaunt(msg)
  });

  state.multiplayer.startSync(() => {
    if (!state.game || state.game.state === 'idle') return null;
    return {
      board: state.game.board.getEncodedSnapshot(),
      score: state.game.score,
      lines: state.game.lines,
      level: state.game.level
    };
  });

  state.game.start();
}

export function backToMenu() {
  UI.hideGameOver();
  UI.hideHighScoreEntry();
  hideTauntLegend();
  if (state.game) state.game.stop();
  stopBotGame();
  if (state.multiplayer) {
    state.multiplayer.leaveRoom();
    state.multiplayer.disconnect();
    state.multiplayer = null;
  }
  UI.showScreen('menu-screen');
}
