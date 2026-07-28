import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nicknameInput = document.getElementById('nickname');
const roomCodeInput = document.getElementById('roomCode');
const passwordInput = document.getElementById('password');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const statusEl = document.getElementById('status');
const playerListEl = document.getElementById('playerList');
const hudEl = document.getElementById('hud');
const mobileButtons = document.querySelectorAll('[data-action]');

const socketUrl = new URLSearchParams(window.location.search).get('socket') || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '');
const socket = socketUrl ? io(socketUrl, { transports: ['websocket'], reconnection: false }) : null;
let room = null;
let gameState = null;
let demoMode = false;
let inputState = { left: false, right: false, jump: false, pause: false };
let lastTime = performance.now();

function buildDemoState() {
  return {
    roomCode: 'DEMO',
    status: 'playing',
    timer: 0,
    platforms: [
      { x: 0, y: 620, w: 1280, h: 100 },
      { x: 240, y: 540, w: 220, h: 18 },
      { x: 520, y: 445, w: 220, h: 18 },
      { x: 850, y: 350, w: 220, h: 18 }
    ],
    checkpoints: [{ x: 300, y: 470, w: 28, h: 90 }, { x: 940, y: 300, w: 28, h: 80 }],
    goal: { x: 1188, y: 210, w: 24, h: 80 },
    players: [{ nickname: 'Demo Runner', x: 90, y: 300, vx: 0, vy: 0, grounded: true, wasJumping: false, score: 0, color: '#facc15' }]
  };
}

let demoState = buildDemoState();

function updateHud() {
  const mode = demoMode ? 'Demo Mode' : (room ? `Room ${room.code}` : 'Lobby');
  hudEl.innerHTML = `<strong>${mode}</strong><br/>Players: ${room?.players?.length || demoState.players.length}<br/>Status: ${gameState?.status || 'Lobby'}`;
}

function updatePlayersList() {
  playerListEl.innerHTML = '';
  const players = room?.players || demoState.players;
  players.forEach((player) => {
    const item = document.createElement('li');
    item.textContent = `${player.nickname}${room?.hostSocketId === player.socketId ? ' (Host)' : ''}`;
    playerListEl.appendChild(item);
  });
}

function setStatus(message) {
  statusEl.textContent = message;
}

function sendInput() {
  if (socket?.connected) {
    socket.emit('input', inputState);
  }
}

function handleAction(action) {
  if (action === 'left') inputState.left = true;
  if (action === 'right') inputState.right = true;
  if (action === 'jump') inputState.jump = true;
  sendInput();
}

function releaseAction(action) {
  if (action === 'left') inputState.left = false;
  if (action === 'right') inputState.right = false;
  if (action === 'jump') inputState.jump = false;
  sendInput();
}

function updateDemoState(delta) {
  const player = demoState.players[0];
  const horizontal = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);
  player.vx = horizontal === 0 ? player.vx * 0.82 : horizontal * 280;
  if (inputState.jump && !player.wasJumping && player.grounded) {
    player.vy = -460;
    player.grounded = false;
  }
  player.vy += 1400 * delta;
  player.x += player.vx * delta;
  player.y += player.vy * delta;

  if (player.x < 0) player.x = 0;
  if (player.x + 36 > 1280) player.x = 1280 - 36;
  player.grounded = false;

  for (const platform of demoState.platforms) {
    const playerBottom = player.y + 54;
    const platformTop = platform.y;
    const overlaps = player.x + 36 > platform.x && player.x < platform.x + platform.w;
    if (player.vy >= 0 && overlaps && playerBottom <= platformTop + 8 && playerBottom + player.vy * delta >= platformTop) {
      player.y = platformTop - 54;
      player.vy = 0;
      player.grounded = true;
      break;
    }
  }

  if (player.y + 54 >= 620) {
    player.y = 566;
    player.vy = 0;
    player.grounded = true;
  }

  for (const checkpoint of demoState.checkpoints) {
    const overlaps = player.x + 36 > checkpoint.x && player.x < checkpoint.x + checkpoint.w;
    const vertical = player.y + 54 > checkpoint.y && player.y < checkpoint.y + checkpoint.h;
    if (overlaps && vertical && player.score < 50) {
      player.score += 50;
    }
  }

  const goal = demoState.goal;
  const goalHit = player.x + 36 > goal.x && player.x < goal.x + goal.w && player.y + 54 > goal.y && player.y < goal.y + goal.h;
  if (goalHit) {
    player.score += 250;
  }

  player.wasJumping = inputState.jump;
  gameState = demoState;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.45, '#1d4ed8');
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(1000, 120, 64, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  [80, 260, 520, 760].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 120, 24, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderScene() {
  drawBackground();
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 620, canvas.width, 100);

  if ((gameState?.platforms || demoState.platforms)) {
    const platforms = gameState?.platforms || demoState.platforms;
    platforms.forEach((platform) => {
      ctx.fillStyle = platform.y < 470 ? '#3b82f6' : '#5b8c5a';
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    });
  }

  if ((gameState?.checkpoints || demoState.checkpoints)) {
    const checkpoints = gameState?.checkpoints || demoState.checkpoints;
    checkpoints.forEach((checkpoint) => {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.w, checkpoint.h);
    });
  }

  const goal = gameState?.goal || demoState.goal;
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);

  const players = gameState?.players || demoState.players;
  players.forEach((player) => {
    ctx.fillStyle = player.color || '#fff';
    ctx.fillRect(player.x, player.y, 36, 54);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText(player.nickname, player.x - 12, player.y - 10);
    ctx.fillText(`Score ${player.score}`, player.x - 12, player.y + 74);
  });
}

function renderFrame(timestamp) {
  const delta = Math.min(0.032, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  if (demoMode) {
    updateDemoState(delta);
  }
  renderScene();
  requestAnimationFrame(renderFrame);
}

createBtn.addEventListener('click', () => {
  if (!socket) {
    setStatus('Local demo mode is active.');
    return;
  }
  socket.emit('createRoom', { nickname: nicknameInput.value, password: passwordInput.value });
});

joinBtn.addEventListener('click', () => {
  if (!socket) {
    setStatus('Local demo mode is active.');
    return;
  }
  socket.emit('joinRoom', { code: roomCodeInput.value, password: passwordInput.value, nickname: nicknameInput.value });
});

startBtn.addEventListener('click', () => {
  if (!socket) {
    setStatus('Local demo mode is active.');
    return;
  }
  socket.emit('startGame');
});

window.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'a':
    case 'arrowleft':
      inputState.left = true;
      break;
    case 'd':
    case 'arrowright':
      inputState.right = true;
      break;
    case ' ':
      inputState.jump = true;
      event.preventDefault();
      break;
  }
  sendInput();
});

window.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'a':
    case 'arrowleft':
      inputState.left = false;
      break;
    case 'd':
    case 'arrowright':
      inputState.right = false;
      break;
    case ' ':
      inputState.jump = false;
      break;
  }
  sendInput();
});

mobileButtons.forEach((button) => {
  button.addEventListener('pointerdown', () => {
    handleAction(button.dataset.action);
  });
  button.addEventListener('pointerup', () => {
    releaseAction(button.dataset.action);
  });
  button.addEventListener('pointerleave', () => {
    releaseAction(button.dataset.action);
  });
});

if (socket) {
  socket.on('connect', () => {
    setStatus('Connected to the live room server.');
    demoMode = false;
    updateHud();
  });

  socket.on('connect_error', () => {
    demoMode = true;
    setStatus('Socket server unavailable. Demo mode is running.');
    updateHud();
  });

  socket.on('roomJoined', ({ room: roomData }) => {
    room = roomData;
    roomCodeInput.value = room.code;
    setStatus(`Joined room ${room.code}`);
    updatePlayersList();
    updateHud();
  });

  socket.on('roomState', (roomData) => {
    room = roomData;
    updatePlayersList();
    updateHud();
  });

  socket.on('gameState', (state) => {
    gameState = state;
    updateHud();
  });

  socket.on('error', ({ message }) => {
    setStatus(message);
  });
} else {
  demoMode = true;
  setStatus('No live socket server found. Demo mode is running.');
}

updatePlayersList();
updateHud();
requestAnimationFrame(renderFrame);
