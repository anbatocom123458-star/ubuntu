import { GAME_WIDTH, GAME_HEIGHT, PLAYER_SIZE, GRAVITY, MOVE_SPEED, JUMP_SPEED, MAX_FALL_SPEED, FLOOR_Y } from '../../shared/constants.js';

function resolvePlatform(player, platform) {
  const playerBottom = player.y + PLAYER_SIZE.height;
  const platformTop = platform.y;
  const overlapsHorizontally = player.x + PLAYER_SIZE.width > platform.x && player.x < platform.x + platform.w;

  if (player.vy >= 0 && overlapsHorizontally && playerBottom <= platformTop + 8 && playerBottom + player.vy >= platformTop) {
    player.y = platformTop - PLAYER_SIZE.height;
    player.vy = 0;
    player.grounded = true;
    return true;
  }

  return false;
}

function handleCheckpoint(player, room) {
  const checkpoint = room.state.checkpoints.find((entry) => {
    const overlaps = player.x + PLAYER_SIZE.width > entry.x && player.x < entry.x + entry.w;
    const vertical = player.y + PLAYER_SIZE.height > entry.y && player.y < entry.y + entry.h;
    return overlaps && vertical;
  });

  if (checkpoint) {
    player.checkpoint = { x: checkpoint.x, y: checkpoint.y - 70 };
    player.score += 50;
  }
}

function handleGoal(player, room) {
  const goal = room.state.goal;
  const overlaps = player.x + PLAYER_SIZE.width > goal.x && player.x < goal.x + goal.w;
  const vertical = player.y + PLAYER_SIZE.height > goal.y && player.y < goal.y + goal.h;

  if (overlaps && vertical && !player.finished) {
    player.finished = true;
    player.score += 250;
    room.status = 'finished';
  }
}

export function stepRoom(room) {
  room.players.forEach((player, index) => {
    const horizontal = (player.input.right ? 1 : 0) - (player.input.left ? 1 : 0);
    player.vx = horizontal === 0 ? player.vx * 0.8 : horizontal * MOVE_SPEED;

    if (player.input.jump && !player.wasJumping && player.grounded) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
    }

    player.vy += GRAVITY;
    if (player.vy > MAX_FALL_SPEED) {
      player.vy = MAX_FALL_SPEED;
    }

    player.x += player.vx;
    if (player.x < 0) player.x = 0;
    if (player.x + PLAYER_SIZE.width > GAME_WIDTH) player.x = GAME_WIDTH - PLAYER_SIZE.width;

    player.y += player.vy;
    player.grounded = false;

    for (const platform of room.state.platforms) {
      if (resolvePlatform(player, platform)) {
        break;
      }
    }

    if (player.y + PLAYER_SIZE.height >= FLOOR_Y) {
      player.y = FLOOR_Y - PLAYER_SIZE.height;
      player.vy = 0;
      player.grounded = true;
    }

    if (player.y > GAME_HEIGHT + 200) {
      player.y = player.checkpoint.y;
      player.x = player.checkpoint.x;
      player.vy = 0;
      player.grounded = true;
    }

    handleCheckpoint(player, room);
    handleGoal(player, room);
    player.wasJumping = player.input.jump;
  });

  return room;
}
