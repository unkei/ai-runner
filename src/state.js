export const MIN_SQUAD_SIZE = 0;
export const MAX_SQUAD_SIZE = 180;
export const INITIAL_SQUAD_SIZE = 12;
export const INITIAL_PLAYER_X = 0.5;
export const PLAYER_Y = 0.84;
export const PLAYER_SPEED = 0.88;
export const TRACK_MIN_X = 0.12;
export const TRACK_MAX_X = 0.88;
export const ENEMY_BASE_SPEED = 0.15;
export const ENEMY_SPAWN_INTERVAL_SECONDS = 1.45;
export const GATE_SPAWN_INTERVAL_SECONDS = 4.875;
export const GATE_LOOKAHEAD_DISTANCE = 96;
export const COURSE_SPEED = 16;
export const ALLY_FIRE_INTERVAL = 1;
export const ALLY_FIRE_RANGE = 1.2;
export const ALLY_BULLET_SPEED = 0.675;
export const ALLY_BULLET_LIFETIME = 3.2;
export const ALLY_BULLET_HIT_RADIUS = 0.018;
export const ENEMY_PROJECTILE_SPEED = 0.82;
export const ARCHER_STAGE = 2;
export const BOSS_STAGE = 4;
export const MIDBOSS_WAVE_INTERVAL = 4;
export const STAGE_DISTANCE = 260;
export const CONTACT_RADIUS = 0.038;
export const ALLY_COLLISION_RADIUS = 0.022;
const ALLY_COLLISION_PASSES = 4;
const PERSPECTIVE_BASE = 0.32;
const PERSPECTIVE_Y_FACTOR = 0.86;
const PROJECTED_TRACK_WIDTH_FACTOR = 0.86;
const PROJECTED_Y_OFFSET = 0.05;
const PROJECTED_Y_FACTOR = 0.9;

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

export function projectWorldPoint(x, y) {
  const perspective = PERSPECTIVE_BASE + y * PERSPECTIVE_Y_FACTOR;
  const trackPosition = (x - TRACK_MIN_X) / (TRACK_MAX_X - TRACK_MIN_X);
  return {
    x: 0.5 + (trackPosition - 0.5) * perspective * PROJECTED_TRACK_WIDTH_FACTOR,
    y: PROJECTED_Y_OFFSET + y * PROJECTED_Y_FACTOR
  };
}

export function unprojectWorldPoint(x, y) {
  const worldY = (y - PROJECTED_Y_OFFSET) / PROJECTED_Y_FACTOR;
  const perspective = Math.max(0.01, PERSPECTIVE_BASE + worldY * PERSPECTIVE_Y_FACTOR);
  const trackPosition = 0.5 + (x - 0.5) / (perspective * PROJECTED_TRACK_WIDTH_FACTOR);
  return {
    x: TRACK_MIN_X + trackPosition * (TRACK_MAX_X - TRACK_MIN_X),
    y: worldY
  };
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

function wanderProfile(id, turn, centerOffset = 0) {
  const seed = (Math.imul(id + 17, 1103515245) + Math.imul(turn + 31, 12345)) >>> 0;
  const randomDirection = (seed & 1) === 0 ? -1 : 1;
  const inwardChance = ((seed >>> 24) & 255) / 255;
  const direction = Math.abs(centerOffset) >= 0.05 && inwardChance < 0.8
    ? -Math.sign(centerOffset)
    : randomDirection;
  const speedUnit = ((seed >>> 8) & 255) / 255;
  const durationUnit = ((seed >>> 16) & 255) / 255;
  return {
    wanderVelocity: direction * (0.035 + speedUnit * 0.055),
    wanderCooldown: 0.45 + durationUnit * 0.85
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
      x: clampPlayerX(playerX + offset.x + (ally.wanderX ?? 0) + (ally.pushX ?? 0)),
      y: PLAYER_Y + offset.y + (ally.pushY ?? 0)
    };
  });
}

export function createAlly(id, index = 0) {
  const wander = wanderProfile(id, 0);
  return {
    id,
    x: INITIAL_PLAYER_X,
    y: PLAYER_Y,
    formationX: 0,
    formationY: 0,
    hp: 1,
    maxHp: 1,
    targetEnemyId: null,
    shotsFired: 0,
    fireCooldown: 0.08 + ((id * 29 + index * 17) % 83) / 100,
    wanderX: 0,
    wanderTurn: 0,
    pushX: 0,
    pushY: 0,
    ...wander
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
    enemySpawnCooldown: 0.7,
    gateSpawnCooldown: 1.5,
    bossSpawned: false,
    enemyWavesSpawned: 0,
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
  const positiveOperation = random();
  const positiveValue = random();
  const negativeOperation = random();
  const negativeValue = random();
  const positive = positiveOperation < 0.6
    ? { operation: "+", value: 5 + Math.floor(positiveValue * 11) }
    : { operation: "x", value: 2 };
  const negative = negativeOperation < 0.75
    ? { operation: "-", value: 3 + Math.floor(negativeValue * 8) }
    : { operation: "/", value: 2 };
  const positiveOnLeft = random() < 0.5;
  const [left, right] = positiveOnLeft ? [positive, negative] : [negative, positive];
  return [
    { ...left, side: "left", x: 0.31 },
    { ...right, side: "right", x: 0.69 }
  ];
}

export function createGatePair(state, random = Math.random) {
  const pairId = state.nextId;
  const worldDistance = state.distance + GATE_LOOKAHEAD_DISTANCE;
  return chooseGatePair(random).map((gate, index) => ({
    id: state.nextId + index,
    pairId,
    worldDistance,
    width: 0.34,
    ...gate
  }));
}

export function projectGateY(worldDistance, playerDistance) {
  return projectCourseY(worldDistance, playerDistance);
}

export function projectCourseY(worldDistance, playerDistance) {
  const relativeDistance = worldDistance - playerDistance;
  const progress = 1 - relativeDistance / GATE_LOOKAHEAD_DISTANCE;
  return -0.08 + clamp(progress, 0, 1) * (PLAYER_Y + 0.08);
}

export function spawnGatePair(state, random = Math.random) {
  if (state.status !== "running") return state;
  const gates = createGatePair(state, random);
  return { ...state, nextId: state.nextId + gates.length, gates: [...state.gates, ...gates] };
}

export function createEnemy(state, x = 0.5, type = "grunt", options = {}) {
  const stage = currentStage(state.distance);
  const isBoss = type === "boss";
  const isMidboss = type === "midboss";
  const hp = isBoss ? 28 + stage * 6 : isMidboss ? 7 + stage * 2 : 1;
  return {
    id: options.id ?? state.nextId,
    waveId: options.waveId ?? state.nextId,
    type,
    x: clampPlayerX(x),
    y: options.y ?? (isBoss ? -0.16 : isMidboss ? -0.13 : -0.08),
    hp,
    maxHp: hp,
    targetAllyId: null,
    moveSpeed: isBoss ? 0.08 : isMidboss ? 0.105 : ENEMY_BASE_SPEED + stage * 0.012,
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
  const isHeavy = type === "boss" || type === "midboss";
  const enemyCount = isHeavy ? 1 : clampInteger(count ?? 10 + stage * 2, 1, 30);
  const waveId = state.nextId;
  const enemies = [];

  for (let index = 0; index < enemyCount; index += 1) {
    const columns = Math.min(8, enemyCount);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const rowCount = Math.min(columns, enemyCount - rowStart);
    const offsetX = (column - (rowCount - 1) / 2) * 0.055;
    enemies.push(createEnemy(state, x + offsetX, type, {
      id: state.nextId + index,
      waveId,
      y: (type === "boss" ? -0.16 : type === "midboss" ? -0.13 : -0.08) - row * 0.038
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
  const sourceY = ally.y - 0.012;
  const dx = enemy.x - ally.x;
  const dy = enemy.y - sourceY;
  const distance = Math.hypot(dx, dy);
  const directionX = distance > Number.EPSILON ? dx / distance : 0;
  const directionY = distance > Number.EPSILON ? dy / distance : -1;
  const source = projectWorldPoint(ally.x, sourceY);
  const target = projectWorldPoint(enemy.x, enemy.y);
  const travelTime = Math.max(distance / ALLY_BULLET_SPEED, Number.EPSILON);
  return {
    id,
    sourceAllyId: ally.id,
    x: ally.x,
    y: sourceY,
    velocityX: directionX * ALLY_BULLET_SPEED,
    velocityY: directionY * ALLY_BULLET_SPEED,
    projectedX: source.x,
    projectedY: source.y,
    projectedVelocityX: (target.x - source.x) / travelTime,
    projectedVelocityY: (target.y - source.y) / travelTime,
    damage: 1,
    remainingLifetime: ALLY_BULLET_LIFETIME
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
    const shotsFired = ally.shotsFired + 1;
    return {
      ...ally,
      targetEnemyId: target.id,
      shotsFired,
      fireCooldown: ALLY_FIRE_INTERVAL
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
  if (enemy.type === "midboss") return 24;
  if (enemy.type === "archer") return 6;
  return 4;
}

function segmentCircleHitFraction(start, end, center, radius) {
  const offsetX = start.x - center.x;
  const offsetY = start.y - center.y;
  if (offsetX * offsetX + offsetY * offsetY <= radius * radius) return 0;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const a = dx * dx + dy * dy;
  if (a <= Number.EPSILON) return null;
  const b = 2 * (offsetX * dx + offsetY * dy);
  const c = offsetX * offsetX + offsetY * offsetY - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const squareRoot = Math.sqrt(discriminant);
  const first = (-b - squareRoot) / (2 * a);
  const second = (-b + squareRoot) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  if (second >= 0 && second <= 1) return second;
  return null;
}

export function resolveAllyProjectiles(state, deltaSeconds) {
  if (state.allyBullets.length === 0) return state;
  const damageById = new Map();
  const movedBullets = [];

  for (const bullet of state.allyBullets) {
    const projectedX = bullet.projectedX + bullet.projectedVelocityX * deltaSeconds;
    const projectedY = bullet.projectedY + bullet.projectedVelocityY * deltaSeconds;
    const position = unprojectWorldPoint(projectedX, projectedY);
    const nextBullet = {
      ...bullet,
      x: position.x,
      y: position.y,
      projectedX,
      projectedY,
      remainingLifetime: bullet.remainingLifetime - deltaSeconds
    };
    let firstHit = null;
    for (const enemy of state.enemies) {
      const radius = enemy.type === "boss" ? ALLY_BULLET_HIT_RADIUS * 1.45 : ALLY_BULLET_HIT_RADIUS;
      const hitFraction = segmentCircleHitFraction(bullet, nextBullet, enemy, radius);
      if (hitFraction === null) continue;
      if (
        firstHit === null ||
        hitFraction < firstHit.fraction - Number.EPSILON ||
        (Math.abs(hitFraction - firstHit.fraction) <= Number.EPSILON && enemy.id < firstHit.enemy.id)
      ) {
        firstHit = { enemy, fraction: hitFraction };
      }
    }
    if (firstHit) {
      const enemy = firstHit.enemy;
      damageById.set(enemy.id, (damageById.get(enemy.id) ?? 0) + bullet.damage);
    } else if (
      nextBullet.remainingLifetime > 0 &&
      nextBullet.x >= TRACK_MIN_X - 0.12 &&
      nextBullet.x <= TRACK_MAX_X + 0.12 &&
      nextBullet.y >= -0.25 &&
      nextBullet.y <= 1.05
    ) {
      movedBullets.push(nextBullet);
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
  return {
    ...state,
    enemies,
    allyBullets: movedBullets,
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
  return {
    ...state,
    allies,
    enemies,
    squadSize: allies.length,
    allyBullets: state.allyBullets,
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
  const gatesByPairId = new Map();
  for (const gate of state.gates) {
    gatesByPairId.set(gate.pairId, [...(gatesByPairId.get(gate.pairId) ?? []), gate]);
  }
  const orderedPairs = [...gatesByPairId.values()].sort((first, second) => (
    first[0].worldDistance - second[0].worldDistance || first[0].pairId - second[0].pairId
  ));
  for (const gates of orderedPairs) {
    if (gates[0].worldDistance <= state.distance) {
      const selectedSide = state.playerX <= 0.5 ? "left" : "right";
      const selectedGate = gates.find((gate) => gate.side === selectedSide) ?? gates[0];
      nextState = setSquadSize(nextState, applyGateOperation(nextState.allies.length, selectedGate));
    } else {
      remainingGates.push(...gates);
    }
  }
  return { ...nextState, gates: remainingGates };
}

export function advanceAllyWander(state, deltaSeconds) {
  if (state.status !== "running" || state.allies.length === 0 || deltaSeconds <= 0) return state;
  const survivors = [];

  for (const ally of state.allies) {
    let remaining = deltaSeconds;
    let wanderX = ally.wanderX ?? 0;
    let wanderTurn = ally.wanderTurn ?? 0;
    let wanderVelocity = ally.wanderVelocity ?? wanderProfile(ally.id, wanderTurn).wanderVelocity;
    let wanderCooldown = ally.wanderCooldown ?? wanderProfile(ally.id, wanderTurn).wanderCooldown;
    let fell = false;

    while (remaining > Number.EPSILON && !fell) {
      if (wanderCooldown <= Number.EPSILON) {
        wanderTurn += 1;
        const centerOffset = ally.formationX + wanderX + (ally.pushX ?? 0);
        ({ wanderVelocity, wanderCooldown } = wanderProfile(ally.id, wanderTurn, centerOffset));
      }
      const step = Math.min(remaining, wanderCooldown);
      wanderX += wanderVelocity * step;
      wanderCooldown -= step;
      remaining -= step;
      const rawX = state.playerX + ally.formationX + wanderX + (ally.pushX ?? 0);
      fell = rawX < TRACK_MIN_X || rawX > TRACK_MAX_X;
    }

    if (!fell) {
      survivors.push({ ...ally, wanderX, wanderTurn, wanderVelocity, wanderCooldown });
    }
  }

  const allies = reflowAllies(survivors, state.playerX);
  const allyIds = new Set(allies.map((ally) => ally.id));
  return resolveAllyContacts({
    ...state,
    allies,
    squadSize: allies.length,
    enemyProjectiles: state.enemyProjectiles.filter((projectile) => allyIds.has(projectile.targetAllyId)),
    status: allies.length === 0 ? "game-over" : state.status
  });
}

export function resolveAllyContacts(state) {
  if (state.status !== "running" || state.allies.length < 2) return state;
  const allies = reflowAllies(state.allies, state.playerX)
    .sort((first, second) => first.id - second.id)
    .map((ally) => ({ ...ally }));
  const minimumDistance = ALLY_COLLISION_RADIUS * 2;

  for (let pass = 0; pass < ALLY_COLLISION_PASSES; pass += 1) {
    for (let firstIndex = 0; firstIndex < allies.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < allies.length; secondIndex += 1) {
        const first = allies[firstIndex];
        const second = allies[secondIndex];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minimumDistance) continue;

        const exactOverlap = distance <= Number.EPSILON;
        if (exactOverlap) {
          dx = ((first.id + second.id) & 1) === 0 ? -1 : 1;
          dy = 0;
          distance = 1;
        }
        const pushDistance = exactOverlap ? minimumDistance / 2 : (minimumDistance - distance) / 2;
        const pushX = dx / distance * pushDistance;
        const pushY = dy / distance * pushDistance;
        first.pushX = (first.pushX ?? 0) - pushX;
        first.pushY = (first.pushY ?? 0) - pushY;
        second.pushX = (second.pushX ?? 0) + pushX;
        second.pushY = (second.pushY ?? 0) + pushY;
        first.x -= pushX;
        first.y -= pushY;
        second.x += pushX;
        second.y += pushY;
      }
    }
  }

  const survivors = allies.filter((ally) => ally.x >= TRACK_MIN_X && ally.x <= TRACK_MAX_X);
  const reflowed = reflowAllies(survivors, state.playerX);
  const allyIds = new Set(reflowed.map((ally) => ally.id));
  return {
    ...state,
    allies: reflowed,
    squadSize: reflowed.length,
    enemyProjectiles: state.enemyProjectiles.filter((projectile) => allyIds.has(projectile.targetAllyId)),
    status: reflowed.length === 0 ? "game-over" : state.status
  };
}

export function tickFoundation(state, deltaSeconds) {
  if (state.status !== "running") return state;
  const elapsed = state.elapsed + deltaSeconds;
  const distance = state.distance + deltaSeconds * COURSE_SPEED;
  const stage = currentStage(distance);
  return { ...state, elapsed, distance, stage, score: Math.floor(distance) + state.killScore };
}

function moveWorldObjects(state, deltaSeconds) {
  const moved = withPlayerX(state, state.playerX + state.inputX * PLAYER_SPEED * deltaSeconds);
  return advanceAllyWander({
    ...moved,
    allies: moved.allies.map((ally) => ({ ...ally, fireCooldown: ally.fireCooldown - deltaSeconds })),
    enemies: moved.enemies.map((enemy) => ({ ...enemy, attackCooldown: enemy.attackCooldown - deltaSeconds })),
    gates: moved.gates
  }, deltaSeconds);
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
    const enemyWavesSpawned = nextState.enemyWavesSpawned + 1;
    nextState = spawnEnemyWave({
      ...nextState,
      enemyWavesSpawned,
      enemySpawnCooldown: nextState.enemySpawnCooldown + Math.max(0.8, ENEMY_SPAWN_INTERVAL_SECONDS - nextState.stage * 0.12)
    }, 0.24 + random() * 0.52, type);
    if (enemyWavesSpawned % MIDBOSS_WAVE_INTERVAL === 0) {
      nextState = spawnEnemyWave(nextState, 0.5, "midboss", 1);
    }
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
