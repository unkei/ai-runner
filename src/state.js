export const LANE_COUNT = 3;
export const MIN_SQUAD_SIZE = 0;
export const MAX_SQUAD_SIZE = 99;
export const INITIAL_SQUAD_SIZE = 5;
export const INITIAL_LANE = 1;
export const PLAYER_Y = 0.86;
export const BULLET_SPEED = 1.65;
export const ENEMY_BASE_SPEED = 0.18;
export const FIRE_INTERVAL_SECONDS = 0.36;
export const ENEMY_SPAWN_INTERVAL_SECONDS = 1.05;
export const HIT_RADIUS = 0.045;

export function clamp(value, min, max) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(numericValue)));
}

export function createInitialState() {
  return {
    status: "running",
    lane: INITIAL_LANE,
    squadSize: INITIAL_SQUAD_SIZE,
    score: 0,
    killScore: 0,
    distance: 0,
    elapsed: 0,
    nextId: 1,
    fireCooldown: FIRE_INTERVAL_SECONDS,
    enemySpawnCooldown: 0.65,
    bullets: [],
    enemies: []
  };
}

export function resetState() {
  return createInitialState();
}

export function clampSquadSize(size) {
  return clamp(size, MIN_SQUAD_SIZE, MAX_SQUAD_SIZE);
}

export function normalizeDirection(direction) {
  const numericDirection = Number(direction);

  if (!Number.isFinite(numericDirection) || numericDirection === 0) {
    return 0;
  }

  return numericDirection < 0 ? -1 : 1;
}

export function moveLane(state, direction) {
  const nextLane = clamp(state.lane + normalizeDirection(direction), 0, LANE_COUNT - 1);
  return {
    ...state,
    lane: nextLane
  };
}

export function setSquadSize(state, size) {
  const squadSize = clampSquadSize(size);
  return {
    ...state,
    squadSize,
    status: squadSize <= 0 ? "game-over" : state.status
  };
}

export function createBullet(state) {
  return {
    id: state.nextId,
    lane: state.lane,
    y: PLAYER_Y - 0.08,
    damage: Math.max(1, Math.floor(state.squadSize / 2))
  };
}

export function createEnemy(state, lane = 0) {
  const difficulty = 1 + Math.floor(state.elapsed / 18);
  return {
    id: state.nextId,
    lane,
    y: -0.08,
    health: 2 + difficulty,
    maxHealth: 2 + difficulty,
    speed: ENEMY_BASE_SPEED + difficulty * 0.015,
    contactDamage: 1 + Math.floor(difficulty / 2)
  };
}

export function spawnBullet(state) {
  if (state.status !== "running" || state.squadSize <= 0) {
    return state;
  }

  const bullet = createBullet(state);
  return {
    ...state,
    nextId: state.nextId + 1,
    bullets: [...state.bullets, bullet]
  };
}

export function spawnEnemy(state, lane = 0) {
  if (state.status !== "running") {
    return state;
  }

  const enemy = createEnemy(state, clamp(lane, 0, LANE_COUNT - 1));
  return {
    ...state,
    nextId: state.nextId + 1,
    enemies: [...state.enemies, enemy]
  };
}

export function moveCombatants(state, deltaSeconds) {
  return {
    ...state,
    bullets: state.bullets
      .map((bullet) => ({
        ...bullet,
        y: bullet.y - BULLET_SPEED * deltaSeconds
      }))
      .filter((bullet) => bullet.y > -0.12),
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      y: enemy.y + enemy.speed * deltaSeconds
    }))
  };
}

export function resolveBulletHits(state) {
  const enemiesById = new Map(state.enemies.map((enemy) => [enemy.id, { ...enemy }]));
  const spentBulletIds = new Set();
  let killScore = state.killScore ?? 0;

  const sortedBullets = [...state.bullets].sort((a, b) => a.y - b.y);

  for (const bullet of sortedBullets) {
    const targets = [...enemiesById.values()]
      .filter((enemy) => enemy.lane === bullet.lane && Math.abs(enemy.y - bullet.y) <= HIT_RADIUS)
      .sort((a, b) => Math.abs(a.y - bullet.y) - Math.abs(b.y - bullet.y));

    const target = targets[0];
    if (!target) {
      continue;
    }

    spentBulletIds.add(bullet.id);
    target.health -= bullet.damage;

    if (target.health <= 0) {
      enemiesById.delete(target.id);
      killScore += 25 + target.maxHealth * 5;
    } else {
      enemiesById.set(target.id, target);
    }
  }

  return {
    ...state,
    killScore,
    bullets: state.bullets.filter((bullet) => !spentBulletIds.has(bullet.id)),
    enemies: [...enemiesById.values()],
    score: Math.floor(state.distance) + killScore
  };
}

export function resolveEnemyContacts(state) {
  let squadSize = state.squadSize;
  const remainingEnemies = [];

  for (const enemy of state.enemies) {
    if (enemy.y >= PLAYER_Y && enemy.lane === state.lane) {
      squadSize -= enemy.contactDamage;
    } else if (enemy.y < 1.12) {
      remainingEnemies.push(enemy);
    }
  }

  const nextState = setSquadSize(
    {
      ...state,
      enemies: remainingEnemies
    },
    squadSize
  );

  return nextState;
}

export function tickGame(state, deltaSeconds, random = Math.random) {
  if (state.status !== "running") {
    return state;
  }

  let nextState = tickFoundation(state, deltaSeconds);

  nextState = {
    ...nextState,
    fireCooldown: nextState.fireCooldown - deltaSeconds,
    enemySpawnCooldown: nextState.enemySpawnCooldown - deltaSeconds
  };

  while (nextState.fireCooldown <= 0) {
    nextState = spawnBullet({
      ...nextState,
      fireCooldown: nextState.fireCooldown + FIRE_INTERVAL_SECONDS
    });
  }

  while (nextState.enemySpawnCooldown <= 0) {
    nextState = spawnEnemy(
      {
        ...nextState,
        enemySpawnCooldown: nextState.enemySpawnCooldown + Math.max(0.45, ENEMY_SPAWN_INTERVAL_SECONDS - nextState.elapsed * 0.008)
      },
      Math.floor(random() * LANE_COUNT)
    );
  }

  nextState = moveCombatants(nextState, deltaSeconds);
  nextState = resolveBulletHits(nextState);
  nextState = resolveEnemyContacts(nextState);

  return nextState;
}

export function tickFoundation(state, deltaSeconds) {
  if (state.status !== "running") {
    return state;
  }

  const elapsed = state.elapsed + deltaSeconds;
  const distance = state.distance + deltaSeconds * 24;

  return {
    ...state,
    elapsed,
    distance,
    score: Math.floor(distance) + (state.killScore ?? 0)
  };
}
