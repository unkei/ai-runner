import {
  PLAYER_Y,
  TRACK_MAX_X,
  TRACK_MIN_X,
  movePlayer,
  resetState,
  setInputX,
  setPlayerX,
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
let pointerActive = false;
const heldDirections = new Set();

function updateKeyboardInput() {
  const leftHeld = heldDirections.has("left");
  const rightHeld = heldDirections.has("right");
  state = setInputX(state, (rightHeld ? 1 : 0) + (leftHeld ? -1 : 0));
}

function worldXToCanvas(x, y = PLAYER_Y) {
  const perspective = 0.32 + y * 0.86;
  const trackLeft = canvas.width * (0.5 - perspective * 0.43);
  const trackRight = canvas.width * (0.5 + perspective * 0.43);
  return trackLeft + ((x - TRACK_MIN_X) / (TRACK_MAX_X - TRACK_MIN_X)) * (trackRight - trackLeft);
}

function worldYToCanvas(y) {
  return canvas.height * (0.05 + y * 0.9);
}

function worldToCanvas(x, y) {
  return {
    x: worldXToCanvas(x, y),
    y: worldYToCanvas(y),
    scale: 0.44 + y * 0.78
  };
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawTrack();
  drawProgress();
  drawGates();
  drawArrows();
  drawEnemies();
  drawSquad();
  drawOverlay();
  updateHud();
}

function drawSky() {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#38c9ef");
  gradient.addColorStop(0.56, "#9be9f4");
  gradient.addColorStop(1, "#dff7fb");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(255,255,255,0.22)";
  for (const block of [
    [24, 132, 72, 34],
    [338, 186, 54, 46],
    [44, 418, 46, 72],
    [330, 18, 82, 44]
  ]) {
    context.save();
    context.translate(block[0], block[1]);
    context.rotate(-0.25);
    context.fillRect(0, 0, block[2], block[3]);
    context.restore();
  }
}

function drawTrack() {
  const topY = canvas.height * 0.04;
  const bottomY = canvas.height * 0.98;
  const topHalf = canvas.width * 0.17;
  const bottomHalf = canvas.width * 0.48;

  context.fillStyle = "#f8fdff";
  context.beginPath();
  context.moveTo(canvas.width / 2 - topHalf, topY);
  context.lineTo(canvas.width / 2 + topHalf, topY);
  context.lineTo(canvas.width / 2 + bottomHalf, bottomY);
  context.lineTo(canvas.width / 2 - bottomHalf, bottomY);
  context.closePath();
  context.fill();

  context.strokeStyle = "#e7fbff";
  context.lineWidth = 8;
  context.stroke();

  const scroll = (state.distance * 0.9) % 150;
  for (let y = -120 + scroll; y < canvas.height + 120; y += 150) {
    const depth = y / canvas.height;
    const half = canvas.width * (0.18 + depth * 0.3);
    context.fillStyle = "rgba(193, 221, 230, 0.32)";
    context.beginPath();
    context.moveTo(canvas.width / 2 - half * 0.74, y + 46);
    context.lineTo(canvas.width / 2 + half * 0.74, y + 46);
    context.lineTo(canvas.width / 2 + half, y + 92);
    context.lineTo(canvas.width / 2 - half, y + 92);
    context.closePath();
    context.fill();
  }
}

function drawProgress() {
  const width = 158;
  const x = canvas.width / 2 - width / 2;
  const y = 20;
  const progress = (state.distance % 260) / 260;

  context.fillStyle = "rgba(24, 75, 105, 0.46)";
  context.beginPath();
  context.roundRect(x, y, width, 12, 6);
  context.fill();
  context.fillStyle = "#28c7f2";
  context.beginPath();
  context.roundRect(x, y, width * progress, 12, 6);
  context.fill();

  context.fillStyle = "#f8fafc";
  context.strokeStyle = "#63d8f7";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(x, y + 6, 14, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#38bdf8";
  context.font = "800 16px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(String(state.stage), x, y + 12);

  context.fillStyle = "#f8fafc";
  context.strokeStyle = "#64748b";
  context.beginPath();
  context.arc(x + width, y + 6, 14, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#0f172a";
  context.font = "800 15px system-ui, sans-serif";
  context.fillText("GO", x + width, y + 11);
}

function drawBubble(x, y, value, fill) {
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(x - 26, y - 44, 52, 30, 15);
  context.fill();
  context.beginPath();
  context.moveTo(x - 6, y - 15);
  context.lineTo(x + 6, y - 15);
  context.lineTo(x, y - 6);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 20px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(String(value), x, y - 22);
}

function drawStickFigure(x, y, scale, fill, stroke = "rgba(15,23,42,0.14)") {
  const head = 7.2 * scale;
  const body = 17 * scale;
  const leg = 13 * scale;

  context.strokeStyle = stroke;
  context.lineWidth = Math.max(2, 3 * scale);
  context.lineCap = "round";
  context.fillStyle = fill;

  context.beginPath();
  context.ellipse(x + 6 * scale, y + body + leg - 1, 10 * scale, 3.2 * scale, -0.18, 0, Math.PI * 2);
  context.fillStyle = "rgba(15, 23, 42, 0.16)";
  context.fill();

  context.fillStyle = fill;
  context.beginPath();
  context.arc(x, y, head, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.moveTo(x, y + head);
  context.lineTo(x, y + body);
  context.moveTo(x - 9 * scale, y + 11 * scale);
  context.lineTo(x + 9 * scale, y + 14 * scale);
  context.moveTo(x, y + body);
  context.lineTo(x - 7 * scale, y + body + leg);
  context.moveTo(x, y + body);
  context.lineTo(x + 7 * scale, y + body + leg);
  context.stroke();
}

function formationOffsets(count) {
  const visible = Math.min(count, 72);
  const offsets = [];
  const columns = Math.ceil(Math.sqrt(visible * 1.45));
  const spacingX = 17;
  const spacingY = 17;

  for (let index = 0; index < visible; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, visible - row * columns);
    offsets.push({
      x: (column - (rowCount - 1) / 2) * spacingX + ((row % 2) - 0.5) * 6,
      y: -row * spacingY
    });
  }

  return offsets;
}

function drawCrowd(centerX, baseY, count, color, countFill, scale = 1, isBoss = false) {
  const offsets = formationOffsets(count);

  for (let index = offsets.length - 1; index >= 0; index -= 1) {
    const offset = offsets[index];
    const depth = 1 - Math.min(0.45, Math.abs(offset.y) / 260);
    drawStickFigure(centerX + offset.x * scale, baseY + offset.y * scale, scale * depth, color);
  }

  if (isBoss) {
    drawStickFigure(centerX, baseY - 40 * scale, scale * 2.4, color, "rgba(76,5,25,0.3)");
  }

  drawBubble(centerX, baseY - 14 * scale, count, countFill);
}

function drawSquad() {
  const point = worldToCanvas(state.playerX, PLAYER_Y);
  drawCrowd(point.x, point.y, state.squadSize, "#38c9f5", "#16aee5", point.scale);
}

function drawEnemies() {
  const enemies = [...state.enemies].sort((a, b) => a.y - b.y);

  for (const enemy of enemies) {
    const point = worldToCanvas(enemy.x, enemy.y);
    const color = enemy.type === "archer" ? "#f97316" : "#ef3026";
    drawCrowd(point.x, point.y, enemy.count, color, "#ef3026", point.scale, enemy.type === "boss");

    if (enemy.type === "archer") {
      context.strokeStyle = "#7c2d12";
      context.lineWidth = 2.5 * point.scale;
      context.beginPath();
      context.arc(point.x + 18 * point.scale, point.y - 3 * point.scale, 10 * point.scale, -1.25, 1.25);
      context.stroke();
    }
  }
}

function gateLabel(gate) {
  return `${gate.operation}${gate.value}`;
}

function drawGates() {
  const pairs = new Map();
  for (const gate of state.gates) {
    const key = Math.round(gate.y * 1000);
    pairs.set(key, [...(pairs.get(key) ?? []), gate]);
  }

  for (const gates of pairs.values()) {
    const y = worldYToCanvas(gates[0].y);
    const leftX = worldXToCanvas(0.31, gates[0].y);
    const rightX = worldXToCanvas(0.69, gates[0].y);
    const centerX = (leftX + rightX) / 2;
    const height = 52 * (0.62 + gates[0].y * 0.65);

    context.fillStyle = "rgba(34, 211, 238, 0.72)";
    context.fillRect(leftX - 90, y - height / 2, rightX - leftX + 180, height);
    context.strokeStyle = "rgba(14, 116, 144, 0.55)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(centerX, y - height / 2 - 12);
    context.lineTo(centerX, y + height / 2 + 12);
    context.stroke();

    for (const gate of gates) {
      const x = worldXToCanvas(gate.x, gate.y);
      const positive = gate.operation === "+" || gate.operation === "x" || gate.operation === "*";
      context.fillStyle = positive ? "#ffffff" : "#fee2e2";
      context.strokeStyle = positive ? "#67e8f9" : "#fb7185";
      context.lineWidth = 4;
      context.font = "900 34px system-ui, sans-serif";
      context.textAlign = "center";
      context.strokeText(gateLabel(gate), x, y + 12);
      context.fillText(gateLabel(gate), x, y + 12);
    }
  }
}

function drawArrows() {
  for (const arrow of state.arrows) {
    const point = worldToCanvas(arrow.x, arrow.y);
    context.strokeStyle = "#7c2d12";
    context.fillStyle = "#facc15";
    context.lineWidth = 3 * point.scale;
    context.beginPath();
    context.moveTo(point.x, point.y - 18 * point.scale);
    context.lineTo(point.x, point.y + 18 * point.scale);
    context.stroke();
    context.beginPath();
    context.moveTo(point.x, point.y + 24 * point.scale);
    context.lineTo(point.x - 6 * point.scale, point.y + 10 * point.scale);
    context.lineTo(point.x + 6 * point.scale, point.y + 10 * point.scale);
    context.closePath();
    context.fill();
  }
}

function drawOverlay() {
  if (state.status !== "game-over") {
    return;
  }

  context.fillStyle = "rgba(2, 6, 23, 0.66)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f8fafc";
  context.font = "900 40px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 18);
  context.font = "800 18px system-ui, sans-serif";
  context.fillText("Click, tap, or press Enter to restart", canvas.width / 2, canvas.height / 2 + 22);
}

function updateHud() {
  scoreElement.textContent = String(state.score);
  squadElement.textContent = String(state.squadSize);
  restartButton.textContent = state.status === "game-over" ? "Try Again" : "Restart";
}

function resetRun() {
  heldDirections.clear();
  state = resetState();
  lastFrame = performance.now();
  render();
}

function canvasToPlayerX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  return TRACK_MIN_X + ratio * (TRACK_MAX_X - TRACK_MIN_X);
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
    heldDirections.add("left");
    updateKeyboardInput();
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    heldDirections.add("right");
    updateKeyboardInput();
  }

  if ((event.key === "Enter" || event.key === " ") && state.status === "game-over") {
    resetRun();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    heldDirections.delete("left");
    updateKeyboardInput();
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    heldDirections.delete("right");
    updateKeyboardInput();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (state.status === "game-over") {
    resetRun();
    return;
  }

  pointerActive = true;
  canvas.setPointerCapture(event.pointerId);
  state = setPlayerX(state, canvasToPlayerX(event.clientX));
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointerActive || state.status !== "running") {
    return;
  }

  state = setPlayerX(state, canvasToPlayerX(event.clientX));
});

canvas.addEventListener("pointerup", (event) => {
  pointerActive = false;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

canvas.addEventListener("click", () => {
  if (state.status === "game-over") {
    resetRun();
  }
});

leftButton.addEventListener("pointerdown", () => {
  state = setInputX(state, -1);
});
rightButton.addEventListener("pointerdown", () => {
  state = setInputX(state, 1);
});
leftButton.addEventListener("pointerup", () => {
  state = setInputX(state, 0);
});
rightButton.addEventListener("pointerup", () => {
  state = setInputX(state, 0);
});
leftButton.addEventListener("pointerleave", () => {
  state = setInputX(state, 0);
});
rightButton.addEventListener("pointerleave", () => {
  state = setInputX(state, 0);
});
leftButton.addEventListener("pointercancel", () => {
  state = setInputX(state, 0);
});
rightButton.addEventListener("pointercancel", () => {
  state = setInputX(state, 0);
});
leftButton.addEventListener("click", () => {
  state = movePlayer(state, -1, 0.16);
});
rightButton.addEventListener("click", () => {
  state = movePlayer(state, 1, 0.16);
});
restartButton.addEventListener("click", resetRun);

render();
requestAnimationFrame(frame);
