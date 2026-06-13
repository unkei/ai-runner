export const LANE_COUNT = 3;
export const MIN_SQUAD_SIZE = 0;
export const MAX_SQUAD_SIZE = 99;
export const INITIAL_SQUAD_SIZE = 5;
export const INITIAL_LANE = 1;

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
    distance: 0,
    elapsed: 0
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
    score: Math.floor(distance)
  };
}
