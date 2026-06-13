import {
  LANE_COUNT,
  moveLane,
  PLAYER_Y,
  resetState,
  tickGame
} from "./state.js";

const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const squadElement = document.querySelector("#squad");
const restartButton = document.querySelector("#restart");
const leftButton = document.querySelector("#left");
const rightButton = document.querySelector("#right");

let state = resetState();
let lastFrame = performance.now();
let touchStartX = null;

function laneCenter(lane) {
  return (canvas.width / LANE_COUNT) * lane + canvas.width / LANE_COUNT / 2;
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawTrack();
  drawGates();
  drawPickups();
  drawEnemies();
  drawBullets();
  drawSquad();
  drawOverlay();
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
  const baseY = canvas.height * PLAYER_Y;
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

function drawBullets() {
  context.fillStyle = "#fef08a";

  for (const bullet of state.bullets) {
    const x = laneCenter(bullet.lane);
    const y = bullet.y * canvas.height;
    context.beginPath();
    context.roundRect(x - 5, y - 15, 10, 22, 5);
    context.fill();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    const x = laneCenter(enemy.lane);
    const y = enemy.y * canvas.height;
    const healthRatio = Math.max(0, enemy.health / enemy.maxHealth);

    context.fillStyle = "#fb7185";
    context.strokeStyle = "#4c0519";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(x - 24, y - 24, 48, 48, 10);
    context.fill();
    context.stroke();

    context.fillStyle = "#0f172a";
    context.fillRect(x - 22, y - 34, 44, 6);
    context.fillStyle = "#22c55e";
    context.fillRect(x - 22, y - 34, 44 * healthRatio, 6);
  }
}

function gateLabel(gate) {
  return `${gate.operation}${gate.value}`;
}

function drawGates() {
  for (const gate of state.gates) {
    const x = laneCenter(gate.lane);
    const y = gate.y * canvas.height;
    const isPositive = gate.operation === "+" || gate.operation === "x" || gate.operation === "*";

    context.fillStyle = isPositive ? "#22c55e" : "#ef4444";
    context.strokeStyle = isPositive ? "#14532d" : "#7f1d1d";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(x - 42, y - 24, 84, 48, 8);
    context.fill();
    context.stroke();

    context.fillStyle = "#f8fafc";
    context.font = "800 24px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(gateLabel(gate), x, y + 8);
  }
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const x = laneCenter(pickup.lane);
    const y = pickup.y * canvas.height;

    context.fillStyle = "#a78bfa";
    context.strokeStyle = "#4c1d95";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, 20, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#f8fafc";
    context.font = "800 18px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`+${pickup.value}`, x, y + 6);
  }
}

function drawOverlay() {
  if (state.status !== "game-over") {
    return;
  }

  context.fillStyle = "rgba(2, 6, 23, 0.72)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f8fafc";
  context.font = "800 38px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 12);
  context.font = "700 18px system-ui, sans-serif";
  context.fillText("Press Restart", canvas.width / 2, canvas.height / 2 + 26);
}

function updateHud() {
  scoreElement.textContent = String(state.score);
  squadElement.textContent = String(state.squadSize);
  restartButton.textContent = state.status === "game-over" ? "Try Again" : "Restart";
}

function resetRun() {
  state = resetState();
  lastFrame = performance.now();
  render();
}

function move(direction) {
  if (state.status !== "running") {
    return;
  }

  state = moveLane(state, direction);
  render();
}

function frame(now) {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  state = tickGame(state, deltaSeconds);
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
