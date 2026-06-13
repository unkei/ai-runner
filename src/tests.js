import {
  INITIAL_LANE,
  INITIAL_SQUAD_SIZE,
  PLAYER_Y,
  applyGateOperation,
  clampSquadSize,
  createInitialState,
  moveCombatants,
  moveLane,
  resolveGates,
  resetState,
  resolveBulletHits,
  resolveEnemyContacts,
  resolvePickups,
  spawnBullet,
  spawnEnemy,
  spawnGate,
  spawnPickup,
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

function testGateOperations() {
  assert(applyGateOperation(5, { operation: "+", value: 4 }) === 9, "add gate should add");
  assert(applyGateOperation(5, { operation: "-", value: 4 }) === 1, "subtract gate should subtract");
  assert(applyGateOperation(5, { operation: "x", value: 3 }) === 15, "multiply gate should multiply");
  assert(applyGateOperation(5, { operation: "*", value: 3 }) === 15, "asterisk multiply gate should multiply");
  assert(applyGateOperation(5, { operation: "/", value: 2 }) === 2, "divide gate should floor");
  assert(applyGateOperation(60, { operation: "x", value: 2 }) === 99, "multiply gate should clamp to max");
  assert(applyGateOperation(5, { operation: "-", value: 8 }) === 0, "subtract gate should clamp to zero");
  assert(applyGateOperation(5, { operation: "/", value: 0 }) === 5, "invalid divide values should normalize to one");
}

function testGateCollisionAppliesCurrentLaneOnly() {
  const state = {
    ...createInitialState(),
    squadSize: 5,
    gates: [
      { id: 2, lane: 1, y: PLAYER_Y, operation: "+", value: 5, speed: 0.2 },
      { id: 3, lane: 0, y: PLAYER_Y, operation: "x", value: 3, speed: 0.2 }
    ]
  };
  const resolved = resolveGates(state);

  assert(resolved.squadSize === 10, "current-lane gate should apply");
  assert(resolved.gates.length === 1, "other-lane gate should remain");
  assert(resolved.gates[0].id === 3, "remaining gate should be the other-lane gate");
}

function testPassedGateCannotBeCollectedLate() {
  const state = {
    ...createInitialState(),
    squadSize: 5,
    gates: [{ id: 2, lane: 1, y: PLAYER_Y + 0.08, operation: "+", value: 5, speed: 0.2 }]
  };
  const resolved = resolveGates(state);

  assert(resolved.squadSize === 5, "passed gate should not apply late");
  assert(resolved.gates.length === 0, "passed gate should be removed as missed");
}

function testNegativeGateCanEndRun() {
  const state = {
    ...createInitialState(),
    squadSize: 2,
    gates: [{ id: 2, lane: 1, y: PLAYER_Y, operation: "-", value: 5, speed: 0.2 }]
  };
  const resolved = resolveGates(state);

  assert(resolved.squadSize === 0, "negative gate should clamp to zero");
  assert(resolved.status === "game-over", "negative gate can end run");
}

function testPickupCollisionAddsSquad() {
  const state = {
    ...createInitialState(),
    squadSize: 98,
    pickups: [
      { id: 2, lane: 1, y: PLAYER_Y, value: 3, speed: 0.2 },
      { id: 3, lane: 0, y: PLAYER_Y, value: 3, speed: 0.2 }
    ]
  };
  const resolved = resolvePickups(state);

  assert(resolved.squadSize === 99, "pickup should add squad members and clamp to max");
  assert(resolved.pickups.length === 1, "only current-lane pickup should be removed");
  assert(resolved.pickups[0].id === 3, "other-lane pickup should remain");
}

function testPassedPickupCannotBeCollectedLate() {
  const state = {
    ...createInitialState(),
    squadSize: 5,
    pickups: [{ id: 2, lane: 1, y: PLAYER_Y + 0.08, value: 3, speed: 0.2 }]
  };
  const resolved = resolvePickups(state);

  assert(resolved.squadSize === 5, "passed pickup should not apply late");
  assert(resolved.pickups.length === 0, "passed pickup should be removed as missed");
}

function testSpawnGateAndPickupUseLaneAndIds() {
  let state = spawnGate(createInitialState(), 2, "x", 2);
  state = spawnPickup(state, 0, 4);

  assert(state.gates[0].lane === 2, "gate should use provided lane");
  assert(state.gates[0].operation === "x", "gate should use provided operation");
  assert(state.pickups[0].lane === 0, "pickup should use provided lane");
  assert(state.pickups[0].value === 4, "pickup should use provided value");
  assert(state.pickups[0].id !== state.gates[0].id, "gate and pickup ids should differ");
}

function testSpawnGateAndPickupSanitizeInputs() {
  const withGate = spawnGate(createInitialState(), 12, "/", Number.NaN);
  const withPickup = spawnPickup(createInitialState(), -4, Number.NaN);

  assert(withGate.gates[0].lane === 2, "gate lane should clamp to the rightmost lane");
  assert(withGate.gates[0].value === 1, "invalid gate values should normalize to one");
  assert(withPickup.pickups[0].lane === 0, "pickup lane should clamp to the leftmost lane");
  assert(withPickup.pickups[0].value === 1, "invalid pickup values should normalize to one");
}

function testEnemyContactPrecedesGatesAndPickups() {
  const state = {
    ...createInitialState(),
    squadSize: 1,
    fireCooldown: 10,
    enemySpawnCooldown: 10,
    gateSpawnCooldown: 10,
    pickupSpawnCooldown: 10,
    enemies: [{ id: 1, lane: 1, y: PLAYER_Y, health: 3, maxHealth: 3, speed: 0, contactDamage: 2 }],
    gates: [{ id: 2, lane: 1, y: PLAYER_Y, operation: "+", value: 50, speed: 0 }],
    pickups: [{ id: 3, lane: 1, y: PLAYER_Y, value: 50, speed: 0 }]
  };
  const resolved = tickGame(state, 0, () => 0);

  assert(resolved.status === "game-over", "enemy contact should resolve first and end the run");
  assert(resolved.squadSize === 0, "later gates and pickups should not rescue a defeated squad");
  assert(resolved.gates.length === 1, "gates should not resolve after enemy-caused game-over");
  assert(resolved.pickups.length === 1, "pickups should not resolve after enemy-caused game-over");
}

function testTickGameSpawnsCombatantsDeterministically() {
  const bulletState = tickGame(createInitialState(), 0.4, () => 0.99);
  const enemyState = tickGame(createInitialState(), 0.7, () => 0.99);

  assert(bulletState.bullets.length > 0, "tickGame should spawn bullets after cooldown");
  assert(enemyState.enemies.length > 0, "tickGame should spawn enemies after cooldown");
  assert(enemyState.enemies[0].lane === 2, "random value should choose deterministic lane");
}

function testTickGameSpawnsGatesAndPickups() {
  const values = [0.1, 0.9, 0.66, 0.8, 0.75];
  let index = 0;
  const state = tickGame(createInitialState(), 2.2, () => values[index++] ?? 0);

  assert(state.gates.length > 0, "tickGame should spawn gates after cooldown");
  assert(state.pickups.length > 0, "tickGame should spawn pickups after cooldown");
}

function testDifficultyRampIncreasesEnemyStats() {
  const early = spawnEnemy(createInitialState(), 1).enemies[0];
  const late = spawnEnemy(
    {
      ...createInitialState(),
      elapsed: 54
    },
    1
  ).enemies[0];

  assert(late.health > early.health, "difficulty should increase enemy health over time");
  assert(late.contactDamage > early.contactDamage, "difficulty should increase contact damage over time");
  assert(late.speed > early.speed, "difficulty should increase enemy speed over time");
}

function testSpawnCooldownFloorsHoldAtHighElapsed() {
  let randomIndex = 0;
  const randomValues = [0.5, 0.2, 0.5, 0.2];
  const state = tickGame(
    {
      ...createInitialState(),
      elapsed: 400,
      fireCooldown: 10,
      enemySpawnCooldown: 0,
      gateSpawnCooldown: 0,
      pickupSpawnCooldown: 0
    },
    0,
    () => randomValues[randomIndex++] ?? 0.5
  );

  assert(state.enemySpawnCooldown === 0.45, "enemy spawn cooldown should respect floor");
  assert(state.gateSpawnCooldown === 1.6, "gate spawn cooldown should respect floor");
  assert(state.pickupSpawnCooldown === 1.3, "pickup spawn cooldown should respect floor");
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
    testGateOperations,
    testGateCollisionAppliesCurrentLaneOnly,
    testPassedGateCannotBeCollectedLate,
    testNegativeGateCanEndRun,
    testPickupCollisionAddsSquad,
    testPassedPickupCannotBeCollectedLate,
    testSpawnGateAndPickupUseLaneAndIds,
    testSpawnGateAndPickupSanitizeInputs,
    testEnemyContactPrecedesGatesAndPickups,
    testTickGameSpawnsCombatantsDeterministically,
    testTickGameSpawnsGatesAndPickups,
    testDifficultyRampIncreasesEnemyStats,
    testSpawnCooldownFloorsHoldAtHighElapsed,
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
