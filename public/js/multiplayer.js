import { SYNC_RATE } from './constants.js';

export class MultiplayerClient {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.callbacks = {};
    this.syncInterval = null;
  }

  connect() {
    // Socket.io client is served automatically by the server at /socket.io/socket.io.js
    return new Promise((resolve, reject) => {
      if (typeof io === 'undefined') {
        reject(new Error('Socket.io client not loaded'));
        return;
      }
      this.socket = io();
      this.socket.on('connect', () => {
        this.setupListeners();
        resolve();
      });
      this.socket.on('connect_error', (err) => {
        reject(err);
      });
    });
  }

  disconnect() {
    this.stopSync();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.roomCode = null;
  }

  get id() {
    return this.socket?.id;
  }

  // Room management
  createRoom(name, difficulty) {
    this.socket.emit('room:create', { name, difficulty });
  }

  joinRoom(code, name) {
    this.roomCode = code.toUpperCase();
    this.socket.emit('room:join', { code: this.roomCode, name });
  }

  leaveRoom() {
    this.socket.emit('room:leave');
    this.roomCode = null;
    this.stopSync();
  }

  setReady() {
    this.socket.emit('player:ready');
  }

  // Game state sync
  startSync(getStateCallback) {
    this.stopSync();
    this.syncInterval = setInterval(() => {
      const state = getStateCallback();
      if (state) {
        this.socket.emit('game:state', state);
      }
    }, SYNC_RATE);
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  sendGarbage(lines) {
    if (lines > 0) {
      this.socket.emit('game:garbage', { lines });
    }
  }

  sendTopOut() {
    this.socket.emit('game:topout');
  }

  sendRematch() {
    this.socket.emit('game:rematch');
  }

  // Callbacks
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  setupListeners() {
    this.socket.on('room:created', (data) => {
      this.roomCode = data.code;
      this.callbacks.roomCreated?.(data);
    });

    this.socket.on('room:joined', (data) => {
      this.callbacks.roomJoined?.(data);
    });

    this.socket.on('room:error', (data) => {
      this.roomCode = null;
      this.callbacks.roomError?.(data);
    });

    this.socket.on('game:countdown', (data) => {
      this.callbacks.countdown?.(data);
    });

    this.socket.on('game:start', () => {
      this.callbacks.gameStart?.();
    });

    this.socket.on('opponent:state', (data) => {
      this.callbacks.opponentState?.(data);
    });

    this.socket.on('opponent:garbage', (data) => {
      this.callbacks.opponentGarbage?.(data);
    });

    this.socket.on('game:over', (data) => {
      this.stopSync();
      this.callbacks.gameOver?.(data);
    });

    this.socket.on('opponent:disconnected', () => {
      this.stopSync();
      this.callbacks.opponentDisconnected?.();
    });

    this.socket.on('rematch:requested', (data) => {
      this.callbacks.rematchRequested?.(data);
    });
  }
}
