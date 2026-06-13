export const MIN_SQUAD_SIZE = 0;
export const MAX_SQUAD_SIZE = 180;
export const INITIAL_SQUAD_SIZE = 12;
export const INITIAL_PLAYER_X = 0.5;
export const PLAYER_Y = 0.84;
export const PLAYER_SPEED = 0.88;
export const TRACK_MIN_X = 0.12;
export const TRACK_MAX_X = 0.88;
export const ENEMY_BASE_SPEED = 0.16;
export const ENEMY_SPAWN_INTERVAL_SECONDS = 2.2;
export const GATE_SPAWN_INTERVAL_SECONDS = 3.25;
export const ARROW_SPEED = 0.72;
export const ARROW_DAMAGE = 1;
export const ARCHER_STAGE = 2;
export const BOSS_STAGE = 4;
export const STAGE_DISTANCE = 260;
export const CONTACT_RADIUS_X = 0.14;
export const CONTACT_RADIUS_Y = 0.065;
export const GATE_COLLECT_RADIUS_Y = 0.065;

export function clamp(value, min, max) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return Math.min(max, Math.max(min, numericValue));
}

export function clampInteger(value, min, max) {
  return Math.trunc(clamp(value, min, max));
}

export function clampSquadSize(size) {
  return clampInteger(size, MIN_SQUAD_SIZE, MAX_SQUAD_SIZE);
}

export function clampPlayerX(x) {
  return clamp(x, TRACK_MIN_X, TRACK_MAX_X);
}

export function currentStage(distance) {
  return Math.max(1, Math.floor(distance / STAGE_DISTANCE) + 1);
}

export function createInitialState() {
  return {
    status: "running",
    playerX: INITIAL_PLAYER_X,
    inputX: 0,
    squadSize: INITIAL_SQUAD_SIZE,
    score: 0,
    killScore: 0,
    distance: 0,
    elapsed: 0,
    stage: 1,
    nextId: 1,
    enemySpawnCooldown: 1.1,
    gateSpawnCooldown: 1.5,
    bossSpawned: false,
    enemies: [],
    gates: [],
    arrows: []
  };
}

export function resetState() {
  return createInitialState();
}

export function normalizeDirection(direction) {
  const numericDirection = Number(direction);

  if (!Number.isFinite(numericDirection) || numericDirection === 0) {
    return 0;
  }

  return numericDirection < 0 ? -1 : 1;
}

export function movePlayer(state, direction, deltaSeconds = 1 / 12) {
  const nextX = clampPlayerX(state.playerX + normalizeDirection(direction) * PLAYER_SPEED * deltaSeconds);
  return {
    ...state,
    playerX: nextX
  };
}

export function setPlayerX(state, x) {
  return {
    ...state,
    playerX: clampPlayerX(x)
  };
}

export function setInputX(state, inputX) {
  return {
    ...state,
    inputX: normalizeDirection(inputX)
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

export function applyGateOperation(squadSize, gate) {
  const value = Math.max(1, Math.trunc(Number(gate.value)) || 1);

  if (gate.operation === "+") {
    return clampSquadSize(squadSize + value);
  }

  if (gate.operation === "-") {
    return clampSquadSize(squadSize - value);
  }

  if (gate.operation === "x" || gate.operation === "*") {
    return clampSquadSize(squadSize * value);
  }

  if (gate.operation === "/") {
    return clampSquadSize(Math.floor(squadSize / value));
  }

  return clampSquadSize(squadSize);
}

export function chooseGatePair(random = Math.random) {
  const first = random() < 0.6
    ? { operation: "+", value: 5 + Math.floor(random() * 11) }
    : { operation: "x", value: 2 };
  const second = random() < 0.54
    ? { operation: "-", value: 3 + Math.floor(random() * 8) }
    : { operation: "+", value: 3 + Math.floor(random() * 8) };

  return [
    { ...first, side: "left", x: 0.31 },
    { ...second, side: "right", x: 0.69 }
  ];
}

export function createGatePair(state, random = Math.random) {
  return chooseGatePair(random).map((gate, index) => ({
    id: state.nextId + index,
    y: -0.08,
    speed: 0.24,
    width: 0.34,
    ...gate
  }));
}

export function createEnemy(state, x = 0.5, type = "grunt") {
  const stage = currentStage(state.distance);
  const isBoss = type === "boss";
  const isArcher = type === "archer";
  const count = isBoss
    ? 34 + stage * 9
    : 8 + stage * 3 + Math.floor((state.elapsed % 9) / 3);

  return {
    id: state.nextId,
    type,
    x: clampPlayerX(x),
    y: isBoss ? -0.18 : -0.1,
    count,
    maxCount: count,
    speed: isBoss ? 0.09 : ENEMY_BASE_SPEED + stage * 0.012,
    fireCooldown: isArcher ? 1.0 : Number.POSITIVE_INFINITY
  };
}

export function createArrow(state, enemy) {
  return {
    id: state.nextId,
    x: enemy.x,
    y: enemy.y + 0.035,
    speed: ARROW_SPEED,
    damage: ARROW_DAMAGE
  };
}

export function spawnGatePair(state, random = Math.random) {
  if (state.status !== "running") {
    return state;
  }

  const gates = createGatePair(state, random);
  return {
    ...state,
    nextId: state.nextId + gates.length,
    gates: [...state.gates, ...gates]
  };
}

export function spawnEnemy(state, x = 0.5, type = "grunt") {
  if (state.status !== "running") {
    return state;
  }

  const enemy = createEnemy(state, x, type);
  return {
    ...state,
    nextId: state.nextId + 1,
    enemies: [...state.enemies, enemy],
    bossSpawned: state.bossSpawned || type === "boss"
  };
}

export function spawnArrow(state, enemy) {
  if (state.status !== "running") {
    return state;
  }

  const arrow = createArrow(state, enemy);
  return {
    ...state,
    nextId: state.nextId + 1,
    arrows: [...state.arrows, arrow]
  };
}

export function moveWorld(state, deltaSeconds) {
  return {
    ...state,
    playerX: clampPlayerX(state.playerX + state.inputX * PLAYER_SPEED * deltaSeconds),
    enemies: state.enemies
      .map((enemy) => ({
        ...enemy,
        y: enemy.y + enemy.speed * deltaSeconds,
        fireCooldown: enemy.fireCooldown - deltaSeconds
      }))
      .filter((enemy) => enemy.y < 1.14 && enemy.count > 0),
    gates: state.gates
      .map((gate) => ({
        ...gate,
        y: gate.y + gate.speed * deltaSeconds
      }))
      .filter((gate) => gate.y < PLAYER_Y + GATE_COLLECT_RADIUS_Y),
    arrows: state.arrows
      .map((arrow) => ({
        ...arrow,
        y: arrow.y + arrow.speed * deltaSeconds
      }))
      .filter((arrow) => arrow.y < 1.12)
  };
}

export function resolveGateContacts(state) {
  if (state.status !== "running") {
    return state;
  }

  let squadSize = state.squadSize;
  const remainingGates = [];
  const gatesByPairKey = new Map();

  for (const gate of state.gates) {
    const pairKey = Math.round(gate.y * 1000);
    gatesByPairKey.set(pairKey, [...(gatesByPairKey.get(pairKey) ?? []), gate]);
  }

  for (const gates of gatesByPairKey.values()) {
    const gateY = gates[0].y;
    const overlapsY = Math.abs(gateY - PLAYER_Y) <= GATE_COLLECT_RADIUS_Y;

    if (overlapsY) {
      const selectedSide = state.playerX <= 0.5 ? "left" : "right";
      const selectedGate = gates.find((gate) => gate.side === selectedSide) ?? gates[0];
      squadSize = applyGateOperation(squadSize, selectedGate);
      continue;
    }

    if (gateY <= PLAYER_Y + GATE_COLLECT_RADIUS_Y) {
      remainingGates.push(...gates);
    }
  }

  return setSquadSize({ ...state, gates: remainingGates }, squadSize);
}

export function resolveEnemyContacts(state) {
  if (state.status !== "running") {
    return state;
  }

  let squadSize = state.squadSize;
  let killScore = state.killScore ?? 0;
  const remainingEnemies = [];

  for (const enemy of state.enemies) {
    const overlapsX = Math.abs(enemy.x - state.playerX) <= CONTACT_RADIUS_X + Math.min(0.14, enemy.count * 0.0018);
    const overlapsY = Math.abs(enemy.y - PLAYER_Y) <= CONTACT_RADIUS_Y || enemy.y > PLAYER_Y;

    if (overlapsX && overlapsY) {
      const defeated = Math.min(squadSize, enemy.count);
      squadSize -= defeated;
      const enemyCount = enemy.count - defeated;
      killScore += defeated * (enemy.type === "boss" ? 8 : 4);

      if (enemyCount > 0) {
        remainingEnemies.push({ ...enemy, count: enemyCount, y: PLAYER_Y - CONTACT_RADIUS_Y });
      }
    } else if (enemy.y < 1.12) {
      remainingEnemies.push(enemy);
    }
  }

  return setSquadSize(
    {
      ...state,
      enemies: remainingEnemies,
      killScore,
      score: Math.floor(state.distance) + killScore
    },
    squadSize
  );
}

export function resolveArrowContacts(state) {
  if (state.status !== "running") {
    return state;
  }

  let squadSize = state.squadSize;
  const remainingArrows = [];

  for (const arrow of state.arrows) {
    const overlapsX = Math.abs(arrow.x - state.playerX) <= CONTACT_RADIUS_X * 0.78;
    const overlapsY = Math.abs(arrow.y - PLAYER_Y) <= CONTACT_RADIUS_Y;

    if (overlapsX && overlapsY) {
      squadSize -= arrow.damage;
    } else if (arrow.y <= PLAYER_Y + CONTACT_RADIUS_Y) {
      remainingArrows.push(arrow);
    }
  }

  return setSquadSize({ ...state, arrows: remainingArrows }, squadSize);
}

export function resolveEnemyFiring(state) {
  if (state.status !== "running") {
    return state;
  }

  let nextState = state;
  const enemies = [];

  for (const enemy of nextState.enemies) {
    if (enemy.type !== "archer" || enemy.fireCooldown > 0 || enemy.y > PLAYER_Y - 0.16) {
      enemies.push(enemy);
      continue;
    }

    nextState = spawnArrow(nextState, enemy);
    enemies.push({ ...enemy, fireCooldown: Math.max(0.8, 1.5 - nextState.stage * 0.08) });
  }

  return {
    ...nextState,
    enemies
  };
}

export function tickFoundation(state, deltaSeconds) {
  if (state.status !== "running") {
    return state;
  }

  const elapsed = state.elapsed + deltaSeconds;
  const distance = state.distance + deltaSeconds * 24;
  const stage = currentStage(distance);

  return {
    ...state,
    elapsed,
    distance,
    stage,
    score: Math.floor(distance) + (state.killScore ?? 0)
  };
}

export function tickGame(state, deltaSeconds, random = Math.random) {
  if (state.status !== "running") {
    return state;
  }

  let nextState = tickFoundation(state, deltaSeconds);

  nextState = {
    ...nextState,
    enemySpawnCooldown: nextState.enemySpawnCooldown - deltaSeconds,
    gateSpawnCooldown: nextState.gateSpawnCooldown - deltaSeconds
  };

  while (nextState.gateSpawnCooldown <= 0) {
    nextState = spawnGatePair(
      {
        ...nextState,
        gateSpawnCooldown: nextState.gateSpawnCooldown + Math.max(2.0, GATE_SPAWN_INTERVAL_SECONDS - nextState.stage * 0.16)
      },
      random
    );
  }

  while (nextState.enemySpawnCooldown <= 0) {
    const type = nextState.stage >= ARCHER_STAGE && random() > 0.62 ? "archer" : "grunt";
    nextState = spawnEnemy(
      {
        ...nextState,
        enemySpawnCooldown: nextState.enemySpawnCooldown + Math.max(1.1, ENEMY_SPAWN_INTERVAL_SECONDS - nextState.stage * 0.18)
      },
      0.2 + random() * 0.6,
      type
    );
  }

  if (nextState.stage >= BOSS_STAGE && !nextState.bossSpawned) {
    nextState = spawnEnemy(nextState, 0.5, "boss");
  }

  nextState = moveWorld(nextState, deltaSeconds);
  nextState = resolveEnemyFiring(nextState);
  nextState = resolveArrowContacts(nextState);
  if (nextState.status === "running") {
    nextState = resolveEnemyContacts(nextState);
  }
  if (nextState.status === "running") {
    nextState = resolveGateContacts(nextState);
  }

  return nextState;
}
