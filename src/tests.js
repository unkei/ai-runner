import {
  ARCHER_STAGE,
  BOSS_STAGE,
  INITIAL_PLAYER_X,
  INITIAL_SQUAD_SIZE,
  PLAYER_Y,
  STAGE_DISTANCE,
  TRACK_MAX_X,
  TRACK_MIN_X,
  applyGateOperation,
  clampPlayerX,
  clampSquadSize,
  createInitialState,
  currentStage,
  movePlayer,
  resolveArrowContacts,
  resolveEnemyContacts,
  resolveEnemyFiring,
  resolveGateContacts,
  resetState,
  setInputX,
  setPlayerX,
  setSquadSize,
  spawnGatePair,
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
  assert(state.playerX === INITIAL_PLAYER_X, "initial player x should be centered");
  assert(state.squadSize === INITIAL_SQUAD_SIZE, "initial squad size should match constant");
  assert(state.score === 0, "initial score should be 0");
  assert(state.arrows.length === 0, "initial state should not contain arrows");
}

function testFreeMovementClampsToTrack() {
  let state = createInitialState();

  state = movePlayer(state, -1, 10);
  assert(state.playerX === TRACK_MIN_X, "left movement should clamp at track edge");

  state = movePlayer(state, 1, 10);
  assert(state.playerX === TRACK_MAX_X, "right movement should clamp at track edge");

  state = setPlayerX(state, 0.42);
  assert(state.playerX === 0.42, "setPlayerX should allow arbitrary in-track positions");
  assert(clampPlayerX(Number.NaN) === TRACK_MIN_X, "invalid x should clamp to minimum");
}

function testInputMovesContinuouslyDuringTick() {
  let state = setInputX(createInitialState(), 1);
  const moved = tickGame(
    {
      ...state,
      enemySpawnCooldown: 10,
      gateSpawnCooldown: 10
    },
    0.2,
    () => 0
  );

  assert(moved.playerX > state.playerX, "held input should move player during tick");
}

function testSquadSizeClampsAndEndsAtZero() {
  let state = createInitialState();

  state = setSquadSize(state, 400);
  assert(state.squadSize === 180, "squad size should clamp to max");
  assert(state.status === "running", "large squad should keep run active");

  state = setSquadSize(state, -3);
  assert(state.squadSize === 0, "squad size should clamp to 0");
  assert(state.status === "game-over", "zero squad should end the run");

  assert(clampSquadSize(42.8) === 42, "squad size clamp should truncate decimals");
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
  assert(applyGateOperation(5, { operation: "*", value: 3 }) === 15, "asterisk multiply gate should multiply");
  assert(applyGateOperation(5, { operation: "/", value: 2 }) === 2, "divide gate should floor");
  assert(applyGateOperation(100, { operation: "x", value: 3 }) === 180, "multiply gate should clamp to max");
  assert(applyGateOperation(5, { operation: "-", value: 8 }) === 0, "subtract gate should clamp to zero");
  assert(applyGateOperation(5, { operation: "/", value: 0 }) === 5, "invalid divide values should normalize to one");
}

function testSpawnGatePairCreatesTwoChoices() {
  const values = [0.1, 0.4, 0.9, 0.7];
  let index = 0;
  const state = spawnGatePair(createInitialState(), () => values[index++] ?? 0);

  assert(state.gates.length === 2, "gate spawn should create exactly two choices");
  assert(state.gates[0].side === "left", "first choice should be left");
  assert(state.gates[1].side === "right", "second choice should be right");
  assert(state.gates[0].id !== state.gates[1].id, "gate ids should differ");
}

function testGateContactAppliesOnlyChosenSideAndRemovesPair() {
  const state = {
    ...createInitialState(),
    playerX: 0.31,
    squadSize: 10,
    gates: [
      { id: 2, x: 0.31, y: PLAYER_Y, side: "left", operation: "+", value: 5, width: 0.34, speed: 0.2 },
      { id: 3, x: 0.69, y: PLAYER_Y, side: "right", operation: "x", value: 3, width: 0.34, speed: 0.2 }
    ]
  };
  const resolved = resolveGateContacts(state);

  assert(resolved.squadSize === 15, "chosen gate should apply");
  assert(resolved.gates.length === 0, "unchosen paired gate should be removed");
}

function testGateContactAlwaysChoosesOneSideAtCenter() {
  const state = {
    ...createInitialState(),
    playerX: 0.5,
    squadSize: 10,
    gates: [
      { id: 2, x: 0.31, y: PLAYER_Y, side: "left", operation: "+", value: 4, width: 0.34, speed: 0.2 },
      { id: 3, x: 0.69, y: PLAYER_Y, side: "right", operation: "x", value: 3, width: 0.34, speed: 0.2 }
    ]
  };
  const resolved = resolveGateContacts(state);

  assert(resolved.squadSize === 14, "center boundary should choose one gate instead of missing both");
  assert(resolved.gates.length === 0, "paired gates should be removed after boundary choice");
}

function testGateContactAlwaysChoosesOneSideAtEdges() {
  const leftEdge = resolveGateContacts({
    ...createInitialState(),
    playerX: TRACK_MIN_X,
    squadSize: 10,
    gates: [
      { id: 2, x: 0.31, y: PLAYER_Y, side: "left", operation: "+", value: 2, width: 0.34, speed: 0.2 },
      { id: 3, x: 0.69, y: PLAYER_Y, side: "right", operation: "x", value: 3, width: 0.34, speed: 0.2 }
    ]
  });
  const rightEdge = resolveGateContacts({
    ...createInitialState(),
    playerX: TRACK_MAX_X,
    squadSize: 10,
    gates: [
      { id: 2, x: 0.31, y: PLAYER_Y, side: "left", operation: "+", value: 2, width: 0.34, speed: 0.2 },
      { id: 3, x: 0.69, y: PLAYER_Y, side: "right", operation: "x", value: 3, width: 0.34, speed: 0.2 }
    ]
  });

  assert(leftEdge.squadSize === 12, "left edge should choose the left gate");
  assert(rightEdge.squadSize === 30, "right edge should choose the right gate");
}

function testEnemyContactTradesOneForOne() {
  const state = {
    ...createInitialState(),
    playerX: 0.5,
    squadSize: 12,
    enemies: [{ id: 2, type: "grunt", x: 0.5, y: PLAYER_Y, count: 8, maxCount: 8, speed: 0.2, fireCooldown: Infinity }]
  };
  const resolved = resolveEnemyContacts(state);

  assert(resolved.squadSize === 4, "squad should lose one member per enemy");
  assert(resolved.enemies.length === 0, "enemy group should be removed when fully matched");
  assert(resolved.killScore === 32, "defeated enemies should score deterministically");
  assert(resolved.status === "running", "surviving squad should keep running");
}

function testEnemyContactCanLeaveEnemyAndEndRun() {
  const state = {
    ...createInitialState(),
    playerX: 0.5,
    squadSize: 5,
    enemies: [{ id: 2, type: "grunt", x: 0.5, y: PLAYER_Y, count: 9, maxCount: 9, speed: 0.2, fireCooldown: Infinity }]
  };
  const resolved = resolveEnemyContacts(state);

  assert(resolved.squadSize === 0, "larger enemy group should defeat squad");
  assert(resolved.enemies[0].count === 4, "remaining enemy count should persist");
  assert(resolved.status === "game-over", "zero squad should end run");
}

function testBossContactTradesOneForOne() {
  const state = {
    ...createInitialState(),
    playerX: 0.5,
    squadSize: 50,
    enemies: [{ id: 2, type: "boss", x: 0.5, y: PLAYER_Y, count: 42, maxCount: 42, speed: 0.09, fireCooldown: Infinity }]
  };
  const resolved = resolveEnemyContacts(state);

  assert(resolved.squadSize === 8, "boss should cancel one-for-one against squad");
  assert(resolved.enemies.length === 0, "fully matched boss should be removed");
  assert(resolved.killScore === 336, "boss defeats should use boss score value");
}

function testArcherFiresAtLaterStages() {
  const archer = {
    id: 2,
    type: "archer",
    x: 0.5,
    y: 0.28,
    count: 10,
    maxCount: 10,
    speed: 0.2,
    fireCooldown: -0.1
  };
  const state = {
    ...createInitialState(),
    stage: ARCHER_STAGE,
    enemies: [archer]
  };
  const resolved = resolveEnemyFiring(state);

  assert(resolved.arrows.length === 1, "ready archer should fire an arrow");
  assert(resolved.enemies[0].fireCooldown > 0, "archer cooldown should reset after firing");
}

function testArrowContactDamagesSquad() {
  const state = {
    ...createInitialState(),
    playerX: 0.5,
    squadSize: 7,
    arrows: [{ id: 2, x: 0.5, y: PLAYER_Y, speed: 0.7, damage: 1 }]
  };
  const resolved = resolveArrowContacts(state);

  assert(resolved.squadSize === 6, "arrow should remove one squad member");
  assert(resolved.arrows.length === 0, "hit arrow should be removed");
}

function testMultipleArrowContactsCanEndRun() {
  const state = {
    ...createInitialState(),
    playerX: 0.5,
    squadSize: 2,
    arrows: [
      { id: 2, x: 0.5, y: PLAYER_Y, speed: 0.7, damage: 1 },
      { id: 3, x: 0.5, y: PLAYER_Y, speed: 0.7, damage: 1 }
    ]
  };
  const resolved = resolveArrowContacts(state);

  assert(resolved.squadSize === 0, "multiple arrows can reduce squad to zero");
  assert(resolved.status === "game-over", "arrow damage can end the run");
  assert(resolved.arrows.length === 0, "hit arrows should be removed");
}

function testBossSpawnsAtFinalStageOnce() {
  const state = tickGame(
    {
      ...createInitialState(),
      distance: (BOSS_STAGE - 1) * STAGE_DISTANCE,
      enemySpawnCooldown: 10,
      gateSpawnCooldown: 10
    },
    0,
    () => 0
  );
  const secondTick = tickGame(
    {
      ...state,
      enemySpawnCooldown: 10,
      gateSpawnCooldown: 10
    },
    0,
    () => 0
  );

  assert(state.enemies.some((enemy) => enemy.type === "boss"), "boss should spawn when final stage starts");
  assert(state.bossSpawned === true, "boss spawned flag should be set");
  assert(secondTick.enemies.filter((enemy) => enemy.type === "boss").length === 1, "boss should not spawn twice");
}

function testTickGameSpawnsEnemiesAndGatesDeterministically() {
  const values = [0.2, 0.6, 0.1, 0.4, 0.9, 0.7];
  let index = 0;
  const state = tickGame(createInitialState(), 2.4, () => values[index++] ?? 0);

  assert(state.enemies.length > 0, "tickGame should spawn enemies after cooldown");
  assert(state.gates.length === 2, "tickGame should spawn a two-choice gate pair");
}

function testResetStateReturnsFreshInitialState() {
  const changed = setSquadSize(movePlayer(createInitialState(), 1, 1), 0);
  const reset = resetState();

  assert(reset !== changed, "reset should return a fresh object");
  assert(reset.status === "running", "reset status should be running");
  assert(reset.playerX === INITIAL_PLAYER_X, "reset player x should be centered");
  assert(reset.squadSize === INITIAL_SQUAD_SIZE, "reset squad size should match initial");
  assert(reset.score === 0, "reset score should be 0");
}

export function runTests() {
  const tests = [
    testInitialState,
    testFreeMovementClampsToTrack,
    testInputMovesContinuouslyDuringTick,
    testSquadSizeClampsAndEndsAtZero,
    testFoundationTickScoresDistanceAndStage,
    testGateOperations,
    testSpawnGatePairCreatesTwoChoices,
    testGateContactAppliesOnlyChosenSideAndRemovesPair,
    testGateContactAlwaysChoosesOneSideAtCenter,
    testGateContactAlwaysChoosesOneSideAtEdges,
    testEnemyContactTradesOneForOne,
    testEnemyContactCanLeaveEnemyAndEndRun,
    testBossContactTradesOneForOne,
    testArcherFiresAtLaterStages,
    testArrowContactDamagesSquad,
    testMultipleArrowContactsCanEndRun,
    testBossSpawnsAtFinalStageOnce,
    testTickGameSpawnsEnemiesAndGatesDeterministically,
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
