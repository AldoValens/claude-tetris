'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

function drawBlockRetro(context, x, y, colorIndex, size, alpha, colors) {
  const color = colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBlockNeon(context, x, y, colorIndex, size, alpha, colors) {
  const color = colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.shadowBlur = 12;
  context.shadowColor = color;
  context.fillStyle = color;
  context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.globalAlpha = 1;
}

function drawBlockPastel(context, x, y, colorIndex, size, alpha, colors) {
  const color = colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  const px = x * size + 2;
  const py = y * size + 2;
  const s = size - 4;
  const radius = 5;
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(px, py, s, s, radius);
  } else {
    context.rect(px, py, s, s);
  }
  context.fill();
  context.globalAlpha = 1;
}

function drawBlockPixel(context, x, y, colorIndex, size, alpha, colors) {
  const color = colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const cell = Math.max(2, Math.floor(s / 4));
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let ry = 0; ry * cell < s; ry++) {
    for (let rx = 0; rx * cell < s; rx++) {
      if ((rx + ry) % 2 === 0) continue;
      const w = Math.min(cell, s - rx * cell);
      const h = Math.min(cell, s - ry * cell);
      context.fillRect(px + rx * cell, py + ry * cell, w, h);
    }
  }
  context.globalAlpha = 1;
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: COLORS,
    boardBg: '#1a1a25',
    gridColor: '#22222e',
    draw: drawBlockRetro,
  },
  neon: {
    label: 'Neón',
    colors: [
      null,
      '#00e5ff',
      '#fff176',
      '#e040fb',
      '#69f0ae',
      '#ff1744',
      '#536dfe',
      '#ff9100',
    ],
    boardBg: '#000000',
    gridColor: '#1a1a1a',
    draw: drawBlockNeon,
  },
  pastel: {
    label: 'Pastel',
    colors: [
      null,
      '#b2ebf2',
      '#fff9c4',
      '#e1bee7',
      '#c8e6c9',
      '#ffcdd2',
      '#c5cae9',
      '#ffe0b2',
    ],
    boardBg: '#faf6f2',
    gridColor: '#e6ddd4',
    draw: drawBlockPastel,
  },
  pixel: {
    label: 'Pixel Art',
    colors: COLORS,
    boardBg: '#1a1a25',
    gridColor: '#22222e',
    draw: drawBlockPixel,
  },
};

let currentSkin = 'retro';
try {
  const stored = localStorage.getItem('tetris-skin');
  if (stored && SKINS[stored]) currentSkin = stored;
} catch (e) { /* localStorage unavailable */ }

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const skinSelect = document.getElementById('skin-select');
const pauseMenu = document.getElementById('pause-menu');
const startLevelSelect = document.getElementById('start-level');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const pauseControls = document.getElementById('pause-controls');

const startScreen = document.getElementById('start-screen');
const playBtn = document.getElementById('play-btn');
const startRecordsEl = document.getElementById('start-records');
const startResetBtn = document.getElementById('start-reset-btn');
const nameEntry = document.getElementById('name-entry');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const overlayRecordsEl = document.getElementById('overlay-records');
const overlayResetBtn = document.getElementById('overlay-reset-btn');

const RECORDS_KEY = 'tetris-records-v1';

let board, current, next, score, lines, level, baseLevel, paused, lastTime, dropAccum, dropInterval, animId;
let gameOver = true;
let records = loadRecords();

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = baseLevel + Math.floor(lines / 10);
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
    if (cleared > records.maxLines) {
      records.maxLines = cleared;
      saveRecords(records);
    }
  }
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return { scores: [], maxLines: 0 };
    const parsed = JSON.parse(raw);
    return {
      scores: Array.isArray(parsed.scores) ? parsed.scores : [],
      maxLines: typeof parsed.maxLines === 'number' ? parsed.maxLines : 0,
    };
  } catch {
    return { scores: [], maxLines: 0 };
  }
}

function saveRecords(rec) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(rec));
  } catch {}
}

function clearRecords() {
  try {
    localStorage.removeItem(RECORDS_KEY);
  } catch {}
}

function qualifiesForTopFive(rec, candidateScore) {
  if (rec.scores.length < 5) return true;
  const weakest = rec.scores[rec.scores.length - 1];
  return candidateScore > weakest.score;
}

function addRecord(rec, name, candidateScore, candidateLines) {
  const entry = { name, score: candidateScore, lines: candidateLines, date: new Date().toISOString() };
  const merged = rec.scores.concat([entry]);
  merged.sort((a, b) => b.score - a.score);
  rec.scores = merged.slice(0, 5);
  saveRecords(rec);
  return entry;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderRecordsTable(container, rec, highlightEntry) {
  const rows = rec.scores.map((r, i) => {
    const highlighted = highlightEntry && r.score === highlightEntry.score && r.date === highlightEntry.date;
    return `<tr class="${highlighted ? 'records-highlight' : ''}">` +
      `<td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.score.toLocaleString()}</td><td>${r.lines}</td></tr>`;
  }).join('');
  container.innerHTML =
    `<table class="records-table">` +
    `<thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th></tr></thead>` +
    `<tbody>${rows || '<tr><td colspan="4">Sin records aún</td></tr>'}</tbody>` +
    `</table>` +
    `<p class="records-max-lines">Mejor Tetris: ${rec.maxLines} líneas</p>`;
}

function resetRecords() {
  if (!confirm('¿Seguro que quieres borrar los records?')) return;
  clearRecords();
  records = { scores: [], maxLines: 0 };
  renderRecordsTable(startRecordsEl, records, null);
  renderRecordsTable(overlayRecordsEl, records, null);
}

function submitScore() {
  const name = nameInput.value.trim() || 'Jugador';
  const entry = addRecord(records, name, score, lines);
  nameEntry.classList.add('hidden');
  renderRecordsTable(overlayRecordsEl, records, entry);
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin] || SKINS.retro;
  skin.draw(context, x, y, colorIndex, size, alpha, skin.colors);
}

function drawGrid() {
  const skin = SKINS[currentSkin] || SKINS.retro;
  ctx.strokeStyle = skin.gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  if (qualifiesForTopFive(records, score)) {
    nameEntry.classList.remove('hidden');
    nameInput.value = '';
  } else {
    nameEntry.classList.add('hidden');
  }
  renderRecordsTable(overlayRecordsEl, records, null);
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseMenu.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    pauseMenu.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init(startLevel = 1) {
  board = createBoard();
  score = 0;
  lines = 0;
  baseLevel = startLevel;
  level = baseLevel;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

for (let i = 1; i <= 15; i++) {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = i;
  startLevelSelect.appendChild(opt);
}

document.addEventListener('keydown', e => {
  const isFormControl = ['SELECT', 'BUTTON', 'INPUT'].includes(e.target.tagName);
  if (!isFormControl && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => init());

resumeBtn.addEventListener('click', togglePause);

pauseRestartBtn.addEventListener('click', () => {
  const selectedLevel = parseInt(startLevelSelect.value, 10) || 1;
  init(selectedLevel);
});

toggleControlsBtn.addEventListener('click', () => {
  pauseControls.classList.toggle('hidden');
});

function applySkin(skinKey) {
  currentSkin = SKINS[skinKey] ? skinKey : 'retro';
  try {
    localStorage.setItem('tetris-skin', currentSkin);
  } catch (e) { /* localStorage unavailable */ }
  document.body.dataset.skin = currentSkin;
  draw();
  drawNext();
}

function initSkinSelect() {
  document.body.dataset.skin = currentSkin;
  if (!skinSelect) return;
  for (const key in SKINS) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = SKINS[key].label;
    if (key === currentSkin) option.selected = true;
    skinSelect.appendChild(option);
  }
  skinSelect.addEventListener('change', () => applySkin(skinSelect.value));
}

playBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

saveScoreBtn.addEventListener('click', submitScore);
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitScore();
});

startResetBtn.addEventListener('click', resetRecords);
overlayResetBtn.addEventListener('click', resetRecords);

renderRecordsTable(startRecordsEl, records, null);
renderRecordsTable(overlayRecordsEl, records, null);

initSkinSelect();
