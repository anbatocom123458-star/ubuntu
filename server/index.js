import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms/roomManager.js';
import { stepRoom } from './physics/engine.js';
import { TICK_INTERVAL_MS } from '../shared/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

app.use(express.static(path.join(__dirname, '../client')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'jump-together' });
});

const roomManager = new RoomManager();

function toClientRoom(room) {
  return {
    ...room,
    players: room.players.map((player) => ({
      ...player,
      input: undefined
    }))
  };
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ nickname, password }) => {
    const room = roomManager.createRoom({
      hostSocketId: socket.id,
      hostName: nickname || 'Host',
      password: password || ''
    });
    socket.join(room.code);
    socket.emit('roomJoined', { room: toClientRoom(room), player: room.players[0] });
    io.to(room.code).emit('roomState', toClientRoom(room));
  });

  socket.on('joinRoom', ({ code, password, nickname }) => {
    const room = roomManager.joinRoom(code, password, nickname, socket.id);
    if (!room) {
      socket.emit('error', { message: 'Room not found or password invalid.' });
      return;
    }

    socket.join(room.code);
    const player = room.players.find((entry) => entry.socketId === socket.id);
    socket.emit('roomJoined', { room: toClientRoom(room), player });
    io.to(room.code).emit('roomState', toClientRoom(room));
  });

  socket.on('startGame', () => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;
    roomManager.startGame(room);
    io.to(room.code).emit('roomState', toClientRoom(room));
    io.to(room.code).emit('gameState', {
      roomCode: room.code,
      players: room.players.map((player) => ({ ...player, input: undefined })),
      platforms: room.state.platforms,
      timer: room.timer,
      status: 'playing'
    });
  });

  socket.on('input', (inputState) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (!room) return;
    const player = room.players.find((entry) => entry.socketId === socket.id);
    if (!player) return;
    player.input = {
      left: Boolean(inputState.left),
      right: Boolean(inputState.right),
      jump: Boolean(inputState.jump),
      pause: Boolean(inputState.pause)
    };
  });

  socket.on('disconnect', () => {
    const room = roomManager.removePlayer(socket.id);
    if (room) {
      io.to(room.code).emit('roomState', toClientRoom(room));
    }
  });
});

setInterval(() => {
  roomManager.listActive().forEach((room) => {
    if (!room.gameStarted) return;
    stepRoom(room);
    room.timer += 1;
    io.to(room.code).emit('gameState', {
      roomCode: room.code,
      players: room.players.map((player) => ({ ...player, input: undefined })),
      platforms: room.state.platforms,
      timer: room.timer,
      status: 'playing'
    });
  });
}, TICK_INTERVAL_MS);

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => {
  console.log(`Jump Together listening on port ${port}`);
});
