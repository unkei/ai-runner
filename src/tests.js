import {
  INITIAL_LANE,
  INITIAL_SQUAD_SIZE,
  clampSquadSize,
  createInitialState,
  moveLane,
  resetState,
  setSquadSize,
  tickFoundation
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
