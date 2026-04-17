const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Room storage
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function cleanupRoom(code) {
  const room = rooms.get(code);
  if (room && room.players.length === 0) {
    rooms.delete(code);
  }
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('room:create', ({ name, difficulty }) => {
    const code = generateRoomCode();
    const room = {
      code,
      players: [{
        id: socket.id,
        name: name || 'Player 1',
        board: null,
        score: 0,
        lines: 0,
        level: difficulty || 1,
        alive: true,
        ready: false
      }],
      difficulty: difficulty || 1,
      state: 'waiting'
    };
    rooms.set(code, room);
    socket.join(code);
    currentRoom = code;
    socket.emit('room:created', { code });
  });

  socket.on('room:join', ({ code, name }) => {
    const room = rooms.get(code);
    if (!room) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('room:error', { message: 'Room is full' });
      return;
    }
    if (room.state !== 'waiting') {
      socket.emit('room:error', { message: 'Game already in progress' });
      return;
    }

    room.players.push({
      id: socket.id,
      name: name || 'Player 2',
      board: null,
      score: 0,
      lines: 0,
      level: room.difficulty,
      alive: true,
      ready: false
    });
    socket.join(code);
    currentRoom = code;

    io.to(code).emit('room:joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
    });
  });

  socket.on('room:leave', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(currentRoom);

    if (room.players.length > 0) {
      io.to(currentRoom).emit('room:joined', {
        players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
      });
    }

    cleanupRoom(currentRoom);
    currentRoom = null;
  });

  socket.on('player:ready', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) player.ready = true;

    io.to(currentRoom).emit('room:joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
    });

    // Check if both players are ready
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.state = 'countdown';
      let count = 3;
      const interval = setInterval(() => {
        io.to(currentRoom).emit('game:countdown', { seconds: count });
        count--;
        if (count < 0) {
          clearInterval(interval);
          room.state = 'playing';
          room.players.forEach(p => { p.alive = true; p.ready = false; });
          io.to(currentRoom).emit('game:start');
        }
      }, 1000);
    }
  });

  socket.on('game:state', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('opponent:state', data);
  });

  socket.on('game:garbage', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('opponent:garbage', data);
  });

  socket.on('game:topout', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) player.alive = false;

    const winner = room.players.find(p => p.alive);
    room.state = 'finished';
    room.rematchRequests = [];

    io.to(currentRoom).emit('game:over', {
      winnerId: winner ? winner.id : null,
      winnerName: winner ? winner.name : null,
      reason: 'topout'
    });
  });

  socket.on('game:rematch', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.state !== 'finished') return;

    if (!room.rematchRequests) room.rematchRequests = [];
    if (room.rematchRequests.includes(socket.id)) return;

    room.rematchRequests.push(socket.id);

    // Notify opponent that this player wants a rematch
    socket.to(currentRoom).emit('rematch:requested', {
      name: room.players.find(p => p.id === socket.id)?.name
    });

    // Both players requested — start countdown
    if (room.rematchRequests.length === 2) {
      room.state = 'countdown';
      room.rematchRequests = [];
      room.players.forEach(p => { p.alive = true; p.ready = false; });

      let count = 3;
      const interval = setInterval(() => {
        io.to(currentRoom).emit('game:countdown', { seconds: count });
        count--;
        if (count < 0) {
          clearInterval(interval);
          room.state = 'playing';
          io.to(currentRoom).emit('game:start');
        }
      }, 1000);
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);

    if (room.state === 'playing' && room.players.length === 1) {
      room.state = 'finished';
      const winner = room.players[0];
      io.to(currentRoom).emit('game:over', {
        winnerId: winner.id,
        winnerName: winner.name,
        reason: 'opponent_disconnected'
      });
      io.to(currentRoom).emit('opponent:disconnected');
    } else if (room.players.length > 0) {
      io.to(currentRoom).emit('room:joined', {
        players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready }))
      });
    }

    cleanupRoom(currentRoom);
  });
});

server.listen(PORT, () => {
  console.log(`Tetris server running on http://localhost:${PORT}`);
});
