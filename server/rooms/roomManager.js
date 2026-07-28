import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_ROOM_SIZE, GAME_WIDTH, GAME_HEIGHT, PLAYER_SIZE, FLOOR_Y } from '../../shared/constants.js';

function createRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const pick = (alphabet, length) => Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${pick(letters, 4)}${pick(digits, 4)}`;
}

function buildPlatforms() {
  return [
    { x: 0, y: FLOOR_Y, w: GAME_WIDTH, h: 100 },
    { x: 220, y: 560, w: 220, h: 18 },
    { x: 510, y: 470, w: 220, h: 18 },
    { x: 820, y: 380, w: 220, h: 18 },
    { x: 1040, y: 290, w: 200, h: 18 }
  ];
}

function buildLevelState() {
  return {
    platforms: buildPlatforms(),
    checkpoints: [{ x: 280, y: 470, w: 28, h: 90 }, { x: 940, y: 300, w: 28, h: 80 }],
    goal: { x: 1188, y: 210, w: 24, h: 80 }
  };
}

function createPlayer(socketId, nickname, color, x, y) {
  return {
    id: uuidv4(),
    socketId,
    nickname,
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: true,
    wasJumping: false,
    input: { left: false, right: false, jump: false, pause: false },
    color,
    score: 0,
    finished: false,
    checkpoint: { x, y }
  };
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom({ hostSocketId, hostName, password }) {
    const room = {
      id: uuidv4(),
      code: createRoomCode(),
      hostSocketId,
      password: password || '',
      players: [],
      gameStarted: false,
      status: 'lobby',
      timer: 0,
      state: buildLevelState()
    };

    room.players.push(createPlayer(hostSocketId, hostName || 'Host', '#62d0ff', 90, 300));
    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(code, password, nickname, socketId) {
    const room = Array.from(this.rooms.values()).find((candidate) => candidate.code.toUpperCase() === code.toUpperCase());
    if (!room) return null;
    if (room.password && room.password !== password) return null;
    if (room.players.length >= DEFAULT_ROOM_SIZE) return null;

    const player = createPlayer(socketId, nickname || `Player ${room.players.length + 1}`, `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`, 120 + room.players.length * 90, 300);
    room.players.push(player);
    return room;
  }

  getRoomForSocket(socketId) {
    return Array.from(this.rooms.values()).find((room) => room.players.some((player) => player.socketId === socketId));
  }

  startGame(room) {
    room.gameStarted = true;
    room.status = 'playing';
    room.timer = 0;
    room.players.forEach((player, index) => {
      player.x = 90 + index * 90;
      player.y = 300;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
      player.wasJumping = false;
      player.finished = false;
      player.score = 0;
      player.checkpoint = { x: 90 + index * 90, y: 300 };
    });
    return room;
  }

  removePlayer(socketId) {
    const room = this.getRoomForSocket(socketId);
    if (!room) return null;

    room.players = room.players.filter((player) => player.socketId !== socketId);
    if (!room.players.length) {
      this.rooms.delete(room.id);
      return null;
    }

    if (room.hostSocketId === socketId) {
      room.hostSocketId = room.players[0].socketId;
    }

    return room;
  }

  listActive() {
    return Array.from(this.rooms.values());
  }
}
