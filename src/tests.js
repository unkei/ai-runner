import {
  INITIAL_LANE,
  INITIAL_SQUAD_SIZE,
  PLAYER_Y,
  clampSquadSize,
  createInitialState,
  moveCombatants,
  moveLane,
  resetState,
  resolveBulletHits,
  resolveEnemyContacts,
  spawnBullet,
  spawnEnemy,
  setSquadSize,
  tickFoundation,
  tickGame
} from "./state.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testInitialState() {
  const state = createInitialState();

  assert(state.status === "running", "initial status should be running");
  assert(state.lane === INITIAL_LANE, "initial lane should be center lane");
  assert(state.squadSize === INITIAL_SQUAD_SIZE, "initial squad size should be 5");
  assert(state.score === 0, "initial score should be 0");
}

function testLaneMovementClampsToThreeLanes() {
  let state = createInitialState();

  state = moveLane(state, -1);
  state = moveLane(state, -1);
  assert(state.lane === 0, "left movement should clamp at lane 0");

  state = moveLane(state, 1);
  state = moveLane(state, 1);
  state = moveLane(state, 1);
  assert(state.lane === 2, "right movement should clamp at lane 2");
}

function testInvalidLaneMovementDoesNotMove() {
  const state = moveLane(createInitialState(), "bad-input");

  assert(state.lane === INITIAL_LANE, "invalid movement should keep current lane");
}

function testSquadSizeClampsAndEndsAtZero() {
  let state = createInitialState();

  state = setSquadSize(state, 120);
  assert(state.squadSize === 99, "squad size should clamp to 99");
  assert(state.status === "running", "large squad should keep run active");

  state = setSquadSize(state, -3);
  assert(state.squadSize === 0, "squad size should clamp to 0");
  assert(state.status === "game-over", "zero squad should end the run");

  assert(clampSquadSize(42.8) === 42, "squad size clamp should truncate decimals");
}

function testFoundationTickScoresDistance() {
  const state = tickFoundation(createInitialState(), 1);

  assert(state.distance === 24, "one second should advance distance");
  assert(state.score === 24, "score should follow floored distance");
}

function testSpawnBulletUsesSquadDamageAndLane() {
  const state = spawnBullet(createInitialState());
  const bullet = state.bullets[0];

  assert(state.bullets.length === 1, "spawnBullet should add one bullet");
  assert(bullet.lane === INITIAL_LANE, "bullet should use current lane");
  assert(bullet.damage === 2, "bullet damage should be floor squad half");
}

function testSpawnEnemyUsesProvidedLane() {
  const state = spawnEnemy(createInitialState(), 2);
  const enemy = state.enemies[0];

  assert(state.enemies.length === 1, "spawnEnemy should add one enemy");
  assert(enemy.lane === 2, "enemy should use provided lane");
  assert(enemy.health > 0, "enemy should have health");
  assert(enemy.contactDamage > 0, "enemy should have contact damage");
}

function testCombatantsMoveInOppositeDirections() {
  const state = {
    ...createInitialState(),
    bullets: [{ id: 1, lane: 1, y: 0.8, damage: 2 }],
    enemies: [{ id: 2, lane: 1, y: 0.1, health: 3, maxHealth: 3, speed: 0.2, contactDamage: 1 }]
  };
  const moved = moveCombatants(state, 0.5);

  assert(moved.bullets[0].y < state.bullets[0].y, "bullets should move away from squad");
  assert(moved.enemies[0].y > state.enemies[0].y, "enemies should move toward squad");
}

function testBulletHitDefeatsEnemyAndScores() {
  const state = {
    ...createInitialState(),
    distance: 12.4,
    score: 12,
    bullets: [{ id: 1, lane: 1, y: 0.3, damage: 10 }],
    enemies: [{ id: 2, lane: 1, y: 0.32, health: 3, maxHealth: 3, speed: 0.2, contactDamage: 1 }]
  };
  const resolved = resolveBulletHits(state);
  const afterDistanceTick = tickFoundation(resolved, 1);

  assert(resolved.bullets.length === 0, "hit bullet should be removed");
  assert(resolved.enemies.length === 0, "defeated enemy should be removed");
  assert(resolved.killScore === 40, "defeated enemy should add deterministic kill score");
  assert(resolved.score === 52, "score should combine distance and kill score");
  assert(afterDistanceTick.score === 76, "kill score should persist after distance scoring");
}

function testBulletHitPartiallyDamagesEnemyWithoutScore() {
  const state = {
    ...createInitialState(),
    bullets: [{ id: 1, lane: 1, y: 0.3, damage: 2 }],
    enemies: [{ id: 2, lane: 1, y: 0.32, health: 5, maxHealth: 5, speed: 0.2, contactDamage: 1 }]
  };
  const resolved = resolveBulletHits(state);

  assert(resolved.bullets.length === 0, "partial hit should spend bullet");
  assert(resolved.enemies.length === 1, "partial hit should keep enemy");
  assert(resolved.enemies[0].health === 3, "partial hit should reduce enemy health");
  assert(resolved.killScore === 0, "partial hit should not add kill score");
  assert(resolved.score === 0, "partial hit should not add score");
}

function testBulletHitUsesLaneCollision() {
  const state = {
    ...createInitialState(),
    bullets: [{ id: 1, lane: 1, y: 0.3, damage: 10 }],
    enemies: [{ id: 2, lane: 0, y: 0.32, health: 3, maxHealth: 3, speed: 0.2, contactDamage: 1 }]
  };
  const resolved = resolveBulletHits(state);

  assert(resolved.bullets.length === 1, "missed bullet should remain");
  assert(resolved.enemies[0].health === 3, "enemy in another lane should not be damaged");
}

function testBulletHitTargetsNearestEnemy() {
  const state = {
    ...createInitialState(),
    bullets: [{ id: 1, lane: 1, y: 0.3, damage: 2 }],
    enemies: [
      { id: 2, lane: 1, y: 0.26, health: 5, maxHealth: 5, speed: 0.2, contactDamage: 1 },
      { id: 3, lane: 1, y: 0.31, health: 5, maxHealth: 5, speed: 0.2, contactDamage: 1 }
    ]
  };
  const resolved = resolveBulletHits(state);
  const nearEnemy = resolved.enemies.find((enemy) => enemy.id === 3);
  const farEnemy = resolved.enemies.find((enemy) => enemy.id === 2);

  assert(nearEnemy.health === 3, "nearest enemy should take damage");
  assert(farEnemy.health === 5, "farther enemy should remain undamaged");
}

function testEnemyContactDamagesSquadAndCanEndRun() {
  const state = {
    ...createInitialState(),
    squadSize: 1,
    enemies: [{ id: 2, lane: 1, y: PLAYER_Y, health: 3, maxHealth: 3, speed: 0.2, contactDamage: 2 }]
  };
  const resolved = resolveEnemyContacts(state);

  assert(resolved.enemies.length === 0, "contact enemy should be removed");
  assert(resolved.squadSize === 0, "contact damage should clamp squad to zero");
  assert(resolved.status === "game-over", "zero squad should end the run");
}

function testTickGameSpawnsCombatantsDeterministically() {
  const bulletState = tickGame(createInitialState(), 0.4, () => 0.99);
  const enemyState = tickGame(createInitialState(), 0.7, () => 0.99);

  assert(bulletState.bullets.length > 0, "tickGame should spawn bullets after cooldown");
  assert(enemyState.enemies.length > 0, "tickGame should spawn enemies after cooldown");
  assert(enemyState.enemies[0].lane === 2, "random value should choose deterministic lane");
}

function testResetStateReturnsFreshInitialState() {
  const changed = setSquadSize(moveLane(createInitialState(), 1), 0);
  const reset = resetState();

  assert(reset !== changed, "reset should return a fresh object");
  assert(reset.status === "running", "reset status should be running");
  assert(reset.lane === INITIAL_LANE, "reset lane should be centered");
  assert(reset.squadSize === INITIAL_SQUAD_SIZE, "reset squad size should be 5");
  assert(reset.score === 0, "reset score should be 0");
}

export function runTests() {
  const tests = [
    testInitialState,
    testLaneMovementClampsToThreeLanes,
    testInvalidLaneMovementDoesNotMove,
    testSquadSizeClampsAndEndsAtZero,
    testFoundationTickScoresDistance,
    testSpawnBulletUsesSquadDamageAndLane,
    testSpawnEnemyUsesProvidedLane,
    testCombatantsMoveInOppositeDirections,
    testBulletHitDefeatsEnemyAndScores,
    testBulletHitPartiallyDamagesEnemyWithoutScore,
    testBulletHitUsesLaneCollision,
    testBulletHitTargetsNearestEnemy,
    testEnemyContactDamagesSquadAndCanEndRun,
    testTickGameSpawnsCombatantsDeterministically,
    testResetStateReturnsFreshInitialState
  ];

  for (const test of tests) {
    test();
  }

  return tests.length;
}

const isNode = typeof process !== "undefined" && process.argv[1]?.endsWith("tests.js");

if (isNode) {
  const count = runTests();
  console.log(`${count} tests passed`);
}
