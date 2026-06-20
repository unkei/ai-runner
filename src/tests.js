import {
  BOSS_STAGE,
  INITIAL_PLAYER_X,
  INITIAL_SQUAD_SIZE,
  MIDBOSS_WAVE_INTERVAL,
  PLAYER_Y,
  STAGE_DISTANCE,
  TRACK_MAX_X,
  TRACK_MIN_X,
  applyGateOperation,
  clampPlayerX,
  clampSquadSize,
  createEnemy,
  createInitialState,
  currentStage,
  moveEnemiesIndependently,
  movePlayer,
  resolveAllyFiring,
  resolveAllyProjectiles,
  resolveCombatantContacts,
  resolveEnemyFiring,
  resolveEnemyProjectiles,
  resolveGateContacts,
  resetState,
  setInputX,
  setPlayerX,
  setSquadSize,
  spawnEnemy,
  spawnEnemyWave,
  spawnGatePair,
  tickFoundation,
  tickGame
} from "./state.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueIds(entities) {
  return new Set(entities.map((entity) => entity.id)).size === entities.length;
}

function testInitialStateCreatesIndependentAllies() {
  const state = createInitialState();
  assert(state.status === "running", "initial status should be running");
  assert(state.playerX === INITIAL_PLAYER_X, "initial player x should be centered");
  assert(state.allies.length === INITIAL_SQUAD_SIZE, "initial allies should match initial squad size");
  assert(state.squadSize === state.allies.length, "squad HUD count should derive from allies");
  assert(uniqueIds(state.allies), "initial allies should have unique ids");
  assert(state.allyBullets.length === 0, "initial state should not contain ally bullets");
  assert(state.enemyProjectiles.length === 0, "initial state should not contain enemy projectiles");
}

function testFreeMovementReflowsAlliesAndClamps() {
  let state = movePlayer(createInitialState(), -1, 10);
  assert(state.playerX === TRACK_MIN_X, "left movement should clamp at track edge");
  assert(state.allies.every((ally) => ally.x >= TRACK_MIN_X), "ally positions should remain on track");
  state = movePlayer(state, 1, 10);
  assert(state.playerX === TRACK_MAX_X, "right movement should clamp at track edge");
  state = setPlayerX(state, 0.42);
  assert(state.playerX === 0.42, "setPlayerX should allow arbitrary in-track positions");
  assert(clampPlayerX(Number.NaN) === TRACK_MIN_X, "invalid x should clamp to minimum");
}

function testHeldInputMovesDuringTick() {
  const state = setInputX(createInitialState(), 1);
  const moved = tickGame({ ...state, enemySpawnCooldown: 10, gateSpawnCooldown: 10 }, 0.2, () => 0);
  assert(moved.playerX > state.playerX, "held input should move player during tick");
}

function testSetSquadSizeCreatesAndRemovesEntities() {
  let state = setSquadSize(createInitialState(), 15);
  assert(state.allies.length === 15, "growing squad should create ally entities");
  assert(uniqueIds(state.allies), "grown squad should retain unique ids");
  const oldestIds = state.allies.slice(0, 4).map((ally) => ally.id).join(",");
  state = setSquadSize(state, 4);
  assert(state.allies.length === 4, "shrinking squad should remove ally entities");
  assert(state.allies.map((ally) => ally.id).join(",") === oldestIds, "shrinking should preserve oldest ids");
  state = setSquadSize(state, 0);
  assert(state.status === "game-over", "zero allies should end the run");
  assert(clampSquadSize(400) === 180, "squad size should clamp to max");
}

function testFoundationTickScoresDistanceAndStage() {
  const state = tickFoundation(createInitialState(), 1);
  assert(state.distance === 24, "one second should advance distance");
  assert(state.score === 24, "score should follow floored distance");
  assert(currentStage(STAGE_DISTANCE) === 2, "stage should increase at stage distance");
}

function testGateOperations() {
  assert(applyGateOperation(5, { operation: "+", value: 4 }) === 9, "add gate should add");
  assert(applyGateOperation(5, { operation: "-", value: 4 }) === 1, "subtract gate should subtract");
  assert(applyGateOperation(5, { operation: "x", value: 3 }) === 15, "multiply gate should multiply");
  assert(applyGateOperation(5, { operation: "/", value: 2 }) === 2, "divide gate should floor");
}

function testGateContactMutatesAllyEntities() {
  const base = setSquadSize(createInitialState(), 3);
  const resolved = resolveGateContacts({
    ...base,
    playerX: 0.31,
    gates: [
      { id: 50, x: 0.31, y: PLAYER_Y, side: "left", operation: "+", value: 2, speed: 0.2 },
      { id: 51, x: 0.69, y: PLAYER_Y, side: "right", operation: "x", value: 3, speed: 0.2 }
    ]
  });
  assert(resolved.allies.length === 5, "selected gate should add real ally entities");
  assert(resolved.squadSize === 5, "HUD count should follow ally entities after gate");
  assert(uniqueIds(resolved.allies), "gate-created allies should have unique ids");
  assert(resolved.gates.length === 0, "gate pair should be removed after selection");
}

function testSpawnGatePairCreatesTwoChoices() {
  const values = [0.1, 0.4, 0.9, 0.7];
  let index = 0;
  const state = spawnGatePair(createInitialState(), () => values[index++] ?? 0);
  assert(state.gates.length === 2, "gate spawn should create exactly two choices");
  assert(state.gates[0].id !== state.gates[1].id, "gate ids should differ");
}

function testEnemyWaveCreatesIndependentEntities() {
  const state = spawnEnemyWave(createInitialState(), 0.5, "grunt", 4);
  assert(state.enemies.length === 4, "wave should create one entity per enemy");
  assert(uniqueIds(state.enemies), "enemy ids should be unique");
  assert(new Set(state.enemies.map((enemy) => enemy.waveId)).size === 1, "wave members should share a wave id");
  assert(state.enemies.every((enemy) => enemy.hp === 1), "normal enemies should have individual hp");
}

function testDefaultEnemyWavesAreLargeFrontalFormations() {
  const firstStage = spawnEnemyWave(createInitialState(), 0.5, "grunt");
  assert(firstStage.enemies.length === 8, "first-stage wave should contain eight enemies");
  assert(new Set(firstStage.enemies.map((enemy) => enemy.x)).size === 6, "large wave should span six frontal columns");
  assert(new Set(firstStage.enemies.map((enemy) => enemy.y)).size === 2, "large wave should use multiple rows");
  assert(firstStage.enemies.every((enemy) => enemy.x >= TRACK_MIN_X && enemy.x <= TRACK_MAX_X), "wave should remain on track");

  const lateState = { ...createInitialState(), distance: STAGE_DISTANCE * 10 };
  const lateWave = spawnEnemyWave(lateState, 0.5, "grunt");
  assert(lateWave.enemies.length === 18, "large waves should cap at eighteen enemies");
}

function testEveryFourthWaveAddsOneMidboss() {
  let state = { ...createInitialState(), enemySpawnCooldown: 0, gateSpawnCooldown: 10 };
  for (let wave = 1; wave <= MIDBOSS_WAVE_INTERVAL; wave += 1) {
    state = tickGame({ ...state, enemySpawnCooldown: 0 }, 0, () => 0);
    const midbosses = state.enemies.filter((enemy) => enemy.type === "midboss");
    assert(midbosses.length === (wave === MIDBOSS_WAVE_INTERVAL ? 1 : 0), "midboss cadence should be every fourth wave");
  }
  const midboss = state.enemies.find((enemy) => enemy.type === "midboss");
  assert(midboss.hp === 9, "first-stage midboss should require nine hits");
}

function testMidbossTakesMultipleHitsAndScoresOnce() {
  const base = createInitialState();
  const midboss = { ...createEnemy(base, 0.5, "midboss"), id: 88, x: 0.5, y: 0.5 };
  const bullet = (id) => ({ id, sourceAllyId: 1, targetEnemyId: midboss.id, x: midboss.x, y: midboss.y, speed: 1, damage: 1 });
  let resolved = resolveAllyProjectiles({ ...base, enemies: [midboss], allyBullets: [bullet(60)] }, 0);
  assert(resolved.enemies[0].hp === midboss.hp - 1, "one hit should not defeat a midboss");
  resolved = resolveAllyProjectiles({
    ...resolved,
    allyBullets: Array.from({ length: resolved.enemies[0].hp }, (_, index) => bullet(70 + index))
  }, 0);
  assert(resolved.enemies.length === 0, "remaining hits should defeat the midboss");
  assert(resolved.killScore === 24, "midboss defeat should score once");
}

function testEnemiesChooseAndMoveTowardDifferentAllies() {
  const base = setSquadSize(createInitialState(), 2);
  const allies = [
    { ...base.allies[0], x: 0.25, y: PLAYER_Y },
    { ...base.allies[1], x: 0.75, y: PLAYER_Y }
  ];
  const first = { ...createEnemy(base, 0.22), id: 90, x: 0.22, y: 0.25 };
  const second = { ...createEnemy(base, 0.78), id: 91, x: 0.78, y: 0.25 };
  const moved = moveEnemiesIndependently({ ...base, allies, enemies: [first, second] }, 0.2);
  assert(moved.enemies[0].targetAllyId === allies[0].id, "left enemy should select left ally");
  assert(moved.enemies[1].targetAllyId === allies[1].id, "right enemy should select right ally");
  assert(moved.enemies[0].y > first.y && moved.enemies[1].y > second.y, "each enemy should move independently");
}

function testAlliesAcquireTargetsAndFireWithoutBeingConsumed() {
  let state = setSquadSize(createInitialState(), 2);
  state = {
    ...state,
    allies: state.allies.map((ally) => ({ ...ally, fireCooldown: 0 })),
    enemies: [
      { ...createEnemy(state, 0.3), id: 80, x: 0.3, y: 0.3 },
      { ...createEnemy(state, 0.7), id: 81, x: 0.7, y: 0.3 }
    ],
    nextId: 100
  };
  const fired = resolveAllyFiring(state);
  assert(fired.allyBullets.length === 2, "each ready ally should fire its own bullet");
  assert(fired.allies.length === 2, "shooting should not consume allies");
  assert(fired.allies.every((ally) => ally.targetEnemyId !== null), "each shooter should retain a target id");
}

function testAllyFireTimingsStayStaggered() {
  let state = createInitialState();
  assert(new Set(state.allies.map((ally) => ally.fireCooldown)).size > 4, "initial firing times should be broadly staggered");
  state = {
    ...state,
    allies: state.allies.map((ally) => ({ ...ally, fireCooldown: 0 })),
    enemies: [{ ...createEnemy(state, 0.5), id: 80, x: 0.5, y: 0.3 }],
    nextId: 100
  };
  const fired = resolveAllyFiring(state);
  assert(fired.allies.every((ally) => ally.shotsFired === 1), "each firing ally should track its shot count");
  assert(new Set(fired.allies.map((ally) => ally.fireCooldown)).size > 4, "repeat firing times should remain staggered");
}

function testOneAllyCanDefeatMultipleEnemiesSequentially() {
  let state = setSquadSize(createInitialState(), 1);
  const ally = { ...state.allies[0], fireCooldown: 0 };
  const firstEnemy = { ...createEnemy(state, ally.x), id: 70, x: ally.x, y: ally.y - 0.01 };
  state = resolveAllyFiring({ ...state, allies: [ally], enemies: [firstEnemy], nextId: 100 });
  state = resolveAllyProjectiles(state, 0);
  assert(state.enemies.length === 0, "first enemy should be defeated");
  assert(state.allies.length === 1, "ally should survive its first shot");

  const secondEnemy = { ...createEnemy(state, state.allies[0].x), id: 71, x: state.allies[0].x, y: state.allies[0].y - 0.01 };
  state = resolveAllyFiring({
    ...state,
    allies: [{ ...state.allies[0], fireCooldown: 0, targetEnemyId: null }],
    enemies: [secondEnemy]
  });
  state = resolveAllyProjectiles(state, 0);
  assert(state.enemies.length === 0, "same ally should defeat a second enemy");
  assert(state.allies.length === 1, "same ally should remain reusable");
}

function testOrphanedAllyBulletIsRemoved() {
  const state = {
    ...createInitialState(),
    allyBullets: [{ id: 40, sourceAllyId: 1, targetEnemyId: 999, x: 0.5, y: 0.5, speed: 1, damage: 1 }]
  };
  assert(resolveAllyProjectiles(state, 0.1).allyBullets.length === 0, "bullet without living target should be removed");
}

function testOverkillScoresEnemyOnlyOnce() {
  const base = createInitialState();
  const enemy = { ...createEnemy(base, 0.5), id: 88, x: 0.5, y: 0.5 };
  const bullet = (id) => ({ id, sourceAllyId: id, targetEnemyId: enemy.id, x: enemy.x, y: enemy.y, speed: 1, damage: 1 });
  const resolved = resolveAllyProjectiles({ ...base, enemies: [enemy], allyBullets: [bullet(60), bullet(61)] }, 0);
  assert(resolved.enemies.length === 0, "overkill should remove enemy");
  assert(resolved.killScore === 4, "overkill should score one normal enemy once");
}

function testArcherProjectileDamagesOnlyTargetAlly() {
  let state = setSquadSize(createInitialState(), 2);
  const target = state.allies[0];
  const archer = {
    ...createEnemy(state, target.x, "archer"),
    id: 77,
    x: target.x,
    y: target.y - 0.1,
    targetAllyId: target.id,
    attackCooldown: 0
  };
  state = resolveEnemyFiring({ ...state, enemies: [archer], nextId: 90 });
  assert(state.enemyProjectiles.length === 1, "ready archer should fire one projectile");
  state = {
    ...state,
    enemyProjectiles: state.enemyProjectiles.map((projectile) => ({ ...projectile, x: target.x, y: target.y }))
  };
  const resolved = resolveEnemyProjectiles(state, 0);
  assert(resolved.allies.length === 1, "enemy projectile should remove one 1-hp ally");
  assert(resolved.allies[0].id !== target.id, "only targeted ally should be removed");
}

function testEnemyProjectileCanEndRun() {
  let state = setSquadSize(createInitialState(), 1);
  const target = state.allies[0];
  state = {
    ...state,
    enemyProjectiles: [{ id: 30, sourceEnemyId: 90, targetAllyId: target.id, x: target.x, y: target.y, speed: 1, damage: 1 }]
  };
  const resolved = resolveEnemyProjectiles(state, 0);
  assert(resolved.allies.length === 0, "last ally should be removed by enemy hit");
  assert(resolved.status === "game-over", "last ally hit should end run");
}

function testContactRemovesOneMatchedPair() {
  let state = setSquadSize(createInitialState(), 2);
  const ally = state.allies[0];
  const distantAlly = { ...state.allies[1], x: TRACK_MAX_X, y: PLAYER_Y };
  state = {
    ...state,
    allies: [ally, distantAlly],
    enemies: [
      { ...createEnemy(state, ally.x), id: 70, x: ally.x, y: ally.y },
      { ...createEnemy(state, ally.x), id: 71, x: ally.x, y: ally.y }
    ]
  };
  const resolved = resolveCombatantContacts(state);
  assert(resolved.allies.length === 1, "one ally should only be used in one contact");
  assert(resolved.enemies.length === 1, "only one of two overlapping enemies should be removed");
  assert(resolved.killScore === 4, "contacted enemy should score once");
}

function testTwoContactsRemoveTwoIndependentPairs() {
  let state = setSquadSize(createInitialState(), 2);
  const enemies = state.allies.map((ally, index) => ({
    ...createEnemy(state, ally.x),
    id: 80 + index,
    x: ally.x,
    y: ally.y
  }));
  const resolved = resolveCombatantContacts({ ...state, enemies });
  assert(resolved.allies.length === 0, "two allies should be removed by two contacts");
  assert(resolved.enemies.length === 0, "two enemies should be removed by two contacts");
  assert(resolved.status === "game-over", "losing all allies in contacts should end run");
}

function testBossHasMultipleHpButContactStillMutuallyEliminates() {
  let state = setSquadSize(createInitialState(), 2);
  const ally = state.allies[0];
  const boss = { ...createEnemy(state, ally.x, "boss"), id: 90, x: ally.x, y: ally.y };
  assert(boss.hp > 1, "boss should have multiple hp");
  const resolved = resolveCombatantContacts({ ...state, enemies: [boss] });
  assert(resolved.enemies.length === 0, "boss should disappear on direct contact");
  assert(resolved.allies.length === 1, "only contacted ally should disappear with boss");
}

function testBossSpawnsOnceAtFinalStage() {
  const state = tickGame({
    ...createInitialState(),
    distance: (BOSS_STAGE - 1) * STAGE_DISTANCE,
    enemySpawnCooldown: 10,
    gateSpawnCooldown: 10
  }, 0, () => 0);
  const second = tickGame({ ...state, enemySpawnCooldown: 10, gateSpawnCooldown: 10 }, 0, () => 0);
  assert(state.enemies.some((enemy) => enemy.type === "boss"), "boss should spawn at final stage");
  assert(second.enemies.filter((enemy) => enemy.type === "boss").length === 1, "boss should spawn only once");
}

function testTickSpawnsEnemyEntitiesAndGates() {
  const values = [0.2, 0.6, 0.1, 0.4, 0.9, 0.7];
  let index = 0;
  const state = tickGame(createInitialState(), 2.4, () => values[index++] ?? 0);
  assert(state.enemies.length > 1, "tick should spawn a wave of individual enemies");
  assert(state.gates.length === 2, "tick should spawn a gate pair");
}

function testResetReturnsFreshIndependentState() {
  let changed = setSquadSize(createInitialState(), 1);
  changed = spawnEnemy(changed, 0.5, "archer");
  const reset = resetState();
  assert(reset !== changed, "reset should return a fresh object");
  assert(reset.allies.length === INITIAL_SQUAD_SIZE, "reset should restore ally entities");
  assert(reset.enemies.length === 0, "reset should clear enemies");
  assert(reset.allyBullets.length === 0 && reset.enemyProjectiles.length === 0, "reset should clear projectiles");
  assert(reset.score === 0, "reset should clear score");
}

export function runTests() {
  const tests = [
    testInitialStateCreatesIndependentAllies,
    testFreeMovementReflowsAlliesAndClamps,
    testHeldInputMovesDuringTick,
    testSetSquadSizeCreatesAndRemovesEntities,
    testFoundationTickScoresDistanceAndStage,
    testGateOperations,
    testGateContactMutatesAllyEntities,
    testSpawnGatePairCreatesTwoChoices,
    testEnemyWaveCreatesIndependentEntities,
    testDefaultEnemyWavesAreLargeFrontalFormations,
    testEveryFourthWaveAddsOneMidboss,
    testMidbossTakesMultipleHitsAndScoresOnce,
    testEnemiesChooseAndMoveTowardDifferentAllies,
    testAlliesAcquireTargetsAndFireWithoutBeingConsumed,
    testAllyFireTimingsStayStaggered,
    testOneAllyCanDefeatMultipleEnemiesSequentially,
    testOrphanedAllyBulletIsRemoved,
    testOverkillScoresEnemyOnlyOnce,
    testArcherProjectileDamagesOnlyTargetAlly,
    testEnemyProjectileCanEndRun,
    testContactRemovesOneMatchedPair,
    testTwoContactsRemoveTwoIndependentPairs,
    testBossHasMultipleHpButContactStillMutuallyEliminates,
    testBossSpawnsOnceAtFinalStage,
    testTickSpawnsEnemyEntitiesAndGates,
    testResetReturnsFreshIndependentState
  ];
  for (const test of tests) test();
  return tests.length;
}

const isNode = typeof process !== "undefined" && process.argv[1]?.endsWith("tests.js");
if (isNode) {
  const count = runTests();
  console.log(`${count} tests passed`);
}
