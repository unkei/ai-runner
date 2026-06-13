import {
  LANE_COUNT,
  createInitialState,
  moveLane,
  tickFoundation
} from "./state.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const squadElement = document.querySelector("#squad");
const restartButton = document.querySelector("#restart");
const leftButton = document.querySelector("#left");
const rightButton = document.querySelector("#right");

let state = createInitialState();
let lastFrame = performance.now();
let touchStartX = null;

function laneCenter(lane) {
  return (canvas.width / LANE_COUNT) * lane + canvas.width / LANE_COUNT / 2;
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawTrack();
  drawSquad();
  updateHud();
}

function drawTrack() {
  const laneWidth = canvas.width / LANE_COUNT;
  const scroll = state.distance % 64;

  context.fillStyle = "#10141f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    context.fillStyle = lane === state.lane ? "#1b2a3f" : "#151c2b";
    context.fillRect(lane * laneWidth + 4, 0, laneWidth - 8, canvas.height);
  }

  context.strokeStyle = "#526070";
  context.lineWidth = 2;
  context.setLineDash([18, 22]);
  context.lineDashOffset = scroll;

  for (let lane = 1; lane < LANE_COUNT; lane += 1) {
    context.beginPath();
    context.moveTo(lane * laneWidth, 0);
    context.lineTo(lane * laneWidth, canvas.height);
    context.stroke();
  }

  context.setLineDash([]);
}

function drawSquad() {
  const centerX = laneCenter(state.lane);
  const baseY = canvas.height - 92;
  const visibleMembers = Math.min(state.squadSize, 15);
  const columns = 5;

  context.fillStyle = "#67e8f9";
  context.strokeStyle = "#052f3a";
  context.lineWidth = 3;

  for (let index = 0; index < visibleMembers; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = centerX + (column - 2) * 18;
    const y = baseY - row * 20;

    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  context.fillStyle = "#f8fafc";
  context.font = "700 18px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(String(state.squadSize), centerX, baseY + 36);
}

function updateHud() {
  scoreElement.textContent = String(state.score);
  squadElement.textContent = String(state.squadSize);
}

function resetRun() {
  state = createInitialState();
  lastFrame = performance.now();
  render();
}

function move(direction) {
  state = moveLane(state, direction);
  render();
}

function frame(now) {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  state = tickFoundation(state, deltaSeconds);
  render();
  requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    move(-1);
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    move(1);
  }
});

canvas.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
});

canvas.addEventListener("touchend", (event) => {
  if (touchStartX === null) {
    return;
  }

  const deltaX = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) > 24) {
    move(deltaX < 0 ? -1 : 1);
  }
  touchStartX = null;
});

leftButton.addEventListener("click", () => move(-1));
rightButton.addEventListener("click", () => move(1));
restartButton.addEventListener("click", resetRun);

render();
requestAnimationFrame(frame);
