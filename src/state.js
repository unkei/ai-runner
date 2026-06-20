export const MIN_SQUAD_SIZE = 0;
export const MAX_SQUAD_SIZE = 180;
export const INITIAL_SQUAD_SIZE = 12;
export const INITIAL_PLAYER_X = 0.5;
export const PLAYER_Y = 0.84;
export const PLAYER_SPEED = 0.88;
export const TRACK_MIN_X = 0.12;
export const TRACK_MAX_X = 0.88;
export const ENEMY_BASE_SPEED = 0.15;
export const ENEMY_SPAWN_INTERVAL_SECONDS = 2.2;
export const GATE_SPAWN_INTERVAL_SECONDS = 3.25;
export const ALLY_FIRE_INTERVAL = 0.72;
export const ALLY_FIRE_RANGE = 1.2;
export const ALLY_BULLET_SPEED = 1.35;
export const ENEMY_PROJECTILE_SPEED = 0.82;
export const ARCHER_STAGE = 2;
export const BOSS_STAGE = 4;
export const STAGE_DISTANCE = 260;
export const CONTACT_RADIUS = 0.038;
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

function distanceSquared(first, second) {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy;
}

function nearestEntity(source, candidates) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const candidateDistance = distanceSquared(source, candidate);
    if (
      candidateDistance < nearestDistance - Number.EPSILON ||
      (Math.abs(candidateDistance - nearestDistance) <= Number.EPSILON && candidate.id < (nearest?.id ?? Number.POSITIVE_INFINITY))
    ) {
      nearest = candidate;
      nearestDistance = candidateDistance;
    }
  }

  return nearest;
}

function formationOffset(index, count) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count) * 1.45)));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rowCount = Math.min(columns, count - row * columns);
  return {
    x: (column - (rowCount - 1) / 2) * 0.035 + ((row % 2) - 0.5) * 0.01,
    y: -row * 0.027
  };
}

export function reflowAllies(allies, playerX = INITIAL_PLAYER_X) {
  const ordered = [...allies].sort((a, b) => a.id - b.id);
  return ordered.map((ally, index) => {
    const offset = formationOffset(index, ordered.length);
    return {
      ...ally,
      formationX: offset.x,
      formationY: offset.y,
      x: clampPlayerX(playerX + offset.x),
      y: PLAYER_Y + offset.y
    };
  });
}

export function createAlly(id, index = 0) {
  return {
    id,
    x: INITIAL_PLAYER_X,
    y: PLAYER_Y,
    formationX: 0,
    formationY: 0,
    hp: 1,
    maxHp: 1,
    targetEnemyId: null,
    fireCooldown: 0.12 + (index % 5) * 0.065
  };
}

function createInitialAllies() {
  return reflowAllies(
    Array.from({ length: INITIAL_SQUAD_SIZE }, (_, index) => createAlly(index + 1, index)),
    INITIAL_PLAYER_X
  );
}

export function createInitialState() {
  const allies = createInitialAllies();
  return {
    status: "running",
    playerX: INITIAL_PLAYER_X,
    inputX: 0,
    allies,
    squadSize: allies.length,
    score: 0,
    killScore: 0,
    distance: 0,
    elapsed: 0,
    stage: 1,
    nextId: INITIAL_SQUAD_SIZE + 1,
    enemySpawnCooldown: 1.1,
    gateSpawnCooldown: 1.5,
    bossSpawned: false,
    enemies: [],
    gates: [],
    allyBullets: [],
    enemyProjectiles: []
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

function withPlayerX(state, x) {
  const playerX = clampPlayerX(x);
  const allies = reflowAllies(state.allies, playerX);
  return { ...state, playerX, allies, squadSize: allies.length };
}

export function movePlayer(state, direction, deltaSeconds = 1 / 12) {
  return withPlayerX(state, state.playerX + normalizeDirection(direction) * PLAYER_SPEED * deltaSeconds);
}

export function setPlayerX(state, x) {
  return withPlayerX(state, x);
}

export function setInputX(state, inputX) {
  return { ...state, inputX: normalizeDirection(inputX) };
}

export function setSquadSize(state, size) {
  const targetSize = clampSquadSize(size);
  let allies = [...state.allies].sort((a, b) => a.id - b.id);
  let nextId = state.nextId;

  if (targetSize < allies.length) {
    allies = allies.slice(0, targetSize);
  } else {
    while (allies.length < targetSize) {
      allies.push(createAlly(nextId, allies.length));
      nextId += 1;
    }
  }

  allies = reflowAllies(allies, state.playerX);
  return {
    ...state,
    allies,
    squadSize: allies.length,
    nextId,
    status: allies.length === 0 ? "game-over" : state.status
  };
}

export function applyGateOperation(squadSize, gate) {
  const value = Math.max(1, Math.trunc(Number(gate.value)) || 1);
  if (gate.operation === "+") return clampSquadSize(squadSize + value);
  if (gate.operation === "-") return clampSquadSize(squadSize - value);
  if (gate.operation === "x" || gate.operation === "*") return clampSquadSize(squadSize * value);
  if (gate.operation === "/") return clampSquadSize(Math.floor(squadSize / value));
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

export function spawnGatePair(state, random = Math.random) {
  if (state.status !== "running") return state;
  const gates = createGatePair(state, random);
  return { ...state, nextId: state.nextId + gates.length, gates: [...state.gates, ...gates] };
}

export function createEnemy(state, x = 0.5, type = "grunt", options = {}) {
  const stage = currentStage(state.distance);
  const isBoss = type === "boss";
  const hp = isBoss ? 28 + stage * 6 : 1;
  return {
    id: options.id ?? state.nextId,
    waveId: options.waveId ?? state.nextId,
    type,
    x: clampPlayerX(x),
    y: options.y ?? (isBoss ? -0.16 : -0.08),
    hp,
    maxHp: hp,
    targetAllyId: null,
    moveSpeed: isBoss ? 0.08 : ENEMY_BASE_SPEED + stage * 0.012,
    attackRange: type === "archer" ? 0.34 : 0,
    attackCooldown: type === "archer" ? 0.9 + ((options.id ?? state.nextId) % 4) * 0.1 : Number.POSITIVE_INFINITY
  };
}

export function spawnEnemy(state, x = 0.5, type = "grunt") {
  if (state.status !== "running") return state;
  const enemy = createEnemy(state, x, type);
  return {
    ...state,
    nextId: state.nextId + 1,
    enemies: [...state.enemies, enemy],
    bossSpawned: state.bossSpawned || type === "boss"
  };
}

export function spawnEnemyWave(state, x = 0.5, type = "grunt", count) {
  if (state.status !== "running") return state;
  const stage = currentStage(state.distance);
  const enemyCount = type === "boss" ? 1 : clampInteger(count ?? 3 + stage, 1, 9);
  const waveId = state.nextId;
  const enemies = [];

  for (let index = 0; index < enemyCount; index += 1) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const offsetX = (column - (Math.min(5, enemyCount) - 1) / 2) * 0.055;
    enemies.push(createEnemy(state, x + offsetX, type, {
      id: state.nextId + index,
      waveId,
      y: (type === "boss" ? -0.16 : -0.08) - row * 0.045
    }));
  }

  return {
    ...state,
    nextId: state.nextId + enemies.length,
    enemies: [...state.enemies, ...enemies],
    bossSpawned: state.bossSpawned || type === "boss"
  };
}

function moveToward(source, target, maxDistance) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || maxDistance <= 0) return { x: source.x, y: source.y };
  const ratio = Math.min(1, maxDistance / distance);
  return { x: source.x + dx * ratio, y: source.y + dy * ratio };
}

export function moveEnemiesIndependently(state, deltaSeconds) {
  if (state.status !== "running" || state.allies.length === 0) return state;
  const enemies = state.enemies.map((enemy) => {
    const target = nearestEntity(enemy, state.allies);
    if (!target) return { ...enemy, targetAllyId: null };
    const distance = Math.sqrt(distanceSquared(enemy, target));
    const stopDistance = enemy.type === "archer" ? enemy.attackRange * 0.72 : 0;
    const movement = Math.max(0, Math.min(enemy.moveSpeed * deltaSeconds, distance - stopDistance));
    const position = moveToward(enemy, target, movement);
    return { ...enemy, ...position, targetAllyId: target.id };
  });
  return { ...state, enemies };
}

function createAllyBullet(id, ally, enemy) {
  return {
    id,
    sourceAllyId: ally.id,
    targetEnemyId: enemy.id,
    x: ally.x,
    y: ally.y - 0.012,
    speed: ALLY_BULLET_SPEED,
    damage: 1
  };
}

export function resolveAllyFiring(state) {
  if (state.status !== "running" || state.enemies.length === 0) return state;
  let nextId = state.nextId;
  const bullets = [...state.allyBullets];
  const enemiesById = new Map(state.enemies.map((enemy) => [enemy.id, enemy]));
  const allies = state.allies.map((ally) => {
    let target = enemiesById.get(ally.targetEnemyId);
    if (!target || distanceSquared(ally, target) > ALLY_FIRE_RANGE * ALLY_FIRE_RANGE) {
      target = nearestEntity(ally, state.enemies);
    }
    if (!target || distanceSquared(ally, target) > ALLY_FIRE_RANGE * ALLY_FIRE_RANGE) {
      return { ...ally, targetEnemyId: null };
    }
    if (ally.fireCooldown > 0) return { ...ally, targetEnemyId: target.id };
    bullets.push(createAllyBullet(nextId, ally, target));
    nextId += 1;
    return {
      ...ally,
      targetEnemyId: target.id,
      fireCooldown: ALLY_FIRE_INTERVAL + (ally.id % 4) * 0.035
    };
  });
  return { ...state, allies, allyBullets: bullets, nextId };
}

function createEnemyProjectile(id, enemy, ally) {
  return {
    id,
    sourceEnemyId: enemy.id,
    targetAllyId: ally.id,
    x: enemy.x,
    y: enemy.y + 0.012,
    speed: ENEMY_PROJECTILE_SPEED,
    damage: 1
  };
}

export function resolveEnemyFiring(state) {
  if (state.status !== "running" || state.allies.length === 0) return state;
  let nextId = state.nextId;
  const projectiles = [...state.enemyProjectiles];
  const alliesById = new Map(state.allies.map((ally) => [ally.id, ally]));
  const enemies = state.enemies.map((enemy) => {
    if (enemy.type !== "archer") return enemy;
    let target = alliesById.get(enemy.targetAllyId);
    if (!target) target = nearestEntity(enemy, state.allies);
    if (!target || distanceSquared(enemy, target) > enemy.attackRange * enemy.attackRange) {
      return { ...enemy, targetAllyId: target?.id ?? null };
    }
    if (enemy.attackCooldown > 0) return { ...enemy, targetAllyId: target.id };
    projectiles.push(createEnemyProjectile(nextId, enemy, target));
    nextId += 1;
    return { ...enemy, targetAllyId: target.id, attackCooldown: 1.15 + (enemy.id % 3) * 0.12 };
  });
  return { ...state, enemies, enemyProjectiles: projectiles, nextId };
}

function advanceProjectile(projectile, target, deltaSeconds) {
  const distance = Math.sqrt(distanceSquared(projectile, target));
  const travel = projectile.speed * deltaSeconds;
  if (distance <= 0.018 || travel >= distance) return { hit: true, projectile };
  return { hit: false, projectile: { ...projectile, ...moveToward(projectile, target, travel) } };
}

function enemyScore(enemy) {
  if (enemy.type === "boss") return 120;
  if (enemy.type === "archer") return 6;
  return 4;
}

export function resolveAllyProjectiles(state, deltaSeconds) {
  if (state.allyBullets.length === 0) return state;
  const enemiesById = new Map(state.enemies.map((enemy) => [enemy.id, enemy]));
  const damageById = new Map();
  const movedBullets = [];

  for (const bullet of state.allyBullets) {
    const target = enemiesById.get(bullet.targetEnemyId);
    if (!target) continue;
    const result = advanceProjectile(bullet, target, deltaSeconds);
    if (result.hit) {
      damageById.set(target.id, (damageById.get(target.id) ?? 0) + bullet.damage);
    } else {
      movedBullets.push(result.projectile);
    }
  }

  let killScore = state.killScore;
  const enemies = [];
  for (const enemy of state.enemies) {
    const hp = Math.max(0, enemy.hp - (damageById.get(enemy.id) ?? 0));
    if (hp === 0) {
      killScore += enemyScore(enemy);
    } else {
      enemies.push({ ...enemy, hp });
    }
  }
  const aliveIds = new Set(enemies.map((enemy) => enemy.id));
  return {
    ...state,
    enemies,
    allyBullets: movedBullets.filter((bullet) => aliveIds.has(bullet.targetEnemyId)),
    killScore,
    score: Math.floor(state.distance) + killScore
  };
}

export function resolveEnemyProjectiles(state, deltaSeconds) {
  if (state.enemyProjectiles.length === 0) return state;
  const alliesById = new Map(state.allies.map((ally) => [ally.id, ally]));
  const damageById = new Map();
  const movedProjectiles = [];

  for (const projectile of state.enemyProjectiles) {
    const target = alliesById.get(projectile.targetAllyId);
    if (!target) continue;
    const result = advanceProjectile(projectile, target, deltaSeconds);
    if (result.hit) {
      damageById.set(target.id, (damageById.get(target.id) ?? 0) + projectile.damage);
    } else {
      movedProjectiles.push(result.projectile);
    }
  }

  const allies = reflowAllies(
    state.allies
      .map((ally) => ({ ...ally, hp: Math.max(0, ally.hp - (damageById.get(ally.id) ?? 0)) }))
      .filter((ally) => ally.hp > 0),
    state.playerX
  );
  const aliveIds = new Set(allies.map((ally) => ally.id));
  return {
    ...state,
    allies,
    squadSize: allies.length,
    enemyProjectiles: movedProjectiles.filter((projectile) => aliveIds.has(projectile.targetAllyId)),
    status: allies.length === 0 ? "game-over" : state.status
  };
}

export function resolveCombatantContacts(state) {
  if (state.status !== "running") return state;
  const candidates = [];
  for (const ally of state.allies) {
    for (const enemy of state.enemies) {
      const distance = Math.sqrt(distanceSquared(ally, enemy));
      const radius = enemy.type === "boss" ? CONTACT_RADIUS * 1.45 : CONTACT_RADIUS;
      if (distance <= radius) candidates.push({ allyId: ally.id, enemyId: enemy.id, distance });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.allyId - b.allyId || a.enemyId - b.enemyId);
  const removedAllies = new Set();
  const removedEnemies = new Set();
  for (const candidate of candidates) {
    if (removedAllies.has(candidate.allyId) || removedEnemies.has(candidate.enemyId)) continue;
    removedAllies.add(candidate.allyId);
    removedEnemies.add(candidate.enemyId);
  }
  let killScore = state.killScore;
  for (const enemy of state.enemies) {
    if (removedEnemies.has(enemy.id)) killScore += enemyScore(enemy);
  }
  const allies = reflowAllies(state.allies.filter((ally) => !removedAllies.has(ally.id)), state.playerX);
  const enemies = state.enemies.filter((enemy) => !removedEnemies.has(enemy.id));
  const allyIds = new Set(allies.map((ally) => ally.id));
  const enemyIds = new Set(enemies.map((enemy) => enemy.id));
  return {
    ...state,
    allies,
    enemies,
    squadSize: allies.length,
    allyBullets: state.allyBullets.filter((bullet) => enemyIds.has(bullet.targetEnemyId)),
    enemyProjectiles: state.enemyProjectiles.filter((projectile) => allyIds.has(projectile.targetAllyId)),
    killScore,
    score: Math.floor(state.distance) + killScore,
    status: allies.length === 0 ? "game-over" : state.status
  };
}

export function resolveGateContacts(state) {
  if (state.status !== "running") return state;
  let nextState = state;
  const remainingGates = [];
  const gatesByPairKey = new Map();
  for (const gate of state.gates) {
    const pairKey = Math.round(gate.y * 1000);
    gatesByPairKey.set(pairKey, [...(gatesByPairKey.get(pairKey) ?? []), gate]);
  }
  for (const gates of gatesByPairKey.values()) {
    const gateY = gates[0].y;
    if (Math.abs(gateY - PLAYER_Y) <= GATE_COLLECT_RADIUS_Y) {
      const selectedSide = state.playerX <= 0.5 ? "left" : "right";
      const selectedGate = gates.find((gate) => gate.side === selectedSide) ?? gates[0];
      nextState = setSquadSize(nextState, applyGateOperation(nextState.allies.length, selectedGate));
    } else if (gateY <= PLAYER_Y + GATE_COLLECT_RADIUS_Y) {
      remainingGates.push(...gates);
    }
  }
  return { ...nextState, gates: remainingGates };
}

export function tickFoundation(state, deltaSeconds) {
  if (state.status !== "running") return state;
  const elapsed = state.elapsed + deltaSeconds;
  const distance = state.distance + deltaSeconds * 24;
  const stage = currentStage(distance);
  return { ...state, elapsed, distance, stage, score: Math.floor(distance) + state.killScore };
}

function moveWorldObjects(state, deltaSeconds) {
  const moved = withPlayerX(state, state.playerX + state.inputX * PLAYER_SPEED * deltaSeconds);
  return {
    ...moved,
    allies: moved.allies.map((ally) => ({ ...ally, fireCooldown: ally.fireCooldown - deltaSeconds })),
    enemies: moved.enemies.map((enemy) => ({ ...enemy, attackCooldown: enemy.attackCooldown - deltaSeconds })),
    gates: moved.gates
      .map((gate) => ({ ...gate, y: gate.y + gate.speed * deltaSeconds }))
      .filter((gate) => gate.y < PLAYER_Y + GATE_COLLECT_RADIUS_Y)
  };
}

export function tickGame(state, deltaSeconds, random = Math.random) {
  if (state.status !== "running") return state;
  let nextState = tickFoundation(state, deltaSeconds);
  nextState = {
    ...nextState,
    enemySpawnCooldown: nextState.enemySpawnCooldown - deltaSeconds,
    gateSpawnCooldown: nextState.gateSpawnCooldown - deltaSeconds
  };

  while (nextState.gateSpawnCooldown <= 0) {
    nextState = spawnGatePair({
      ...nextState,
      gateSpawnCooldown: nextState.gateSpawnCooldown + Math.max(2, GATE_SPAWN_INTERVAL_SECONDS - nextState.stage * 0.16)
    }, random);
  }

  while (nextState.enemySpawnCooldown <= 0) {
    const type = nextState.stage >= ARCHER_STAGE && random() > 0.62 ? "archer" : "grunt";
    nextState = spawnEnemyWave({
      ...nextState,
      enemySpawnCooldown: nextState.enemySpawnCooldown + Math.max(1.2, ENEMY_SPAWN_INTERVAL_SECONDS - nextState.stage * 0.16)
    }, 0.24 + random() * 0.52, type);
  }

  if (nextState.stage >= BOSS_STAGE && !nextState.bossSpawned) {
    nextState = spawnEnemyWave(nextState, 0.5, "boss", 1);
  }

  nextState = moveWorldObjects(nextState, deltaSeconds);
  nextState = moveEnemiesIndependently(nextState, deltaSeconds);
  nextState = resolveAllyFiring(nextState);
  nextState = resolveEnemyFiring(nextState);
  nextState = resolveAllyProjectiles(nextState, deltaSeconds);
  nextState = resolveEnemyProjectiles(nextState, deltaSeconds);
  if (nextState.status === "running") nextState = resolveCombatantContacts(nextState);
  if (nextState.status === "running") nextState = resolveGateContacts(nextState);
  return nextState;
}
