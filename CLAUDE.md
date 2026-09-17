# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla Tetris — plain HTML5 Canvas + CSS + JavaScript. No dependencies, no `package.json`, no build step, no bundler/transpiler.

## Running

Nothing to install or compile. Either:
- Open `index.html` directly in a browser, or
- Serve the directory with any static server (e.g. `python3 -m http.server 8000`, `npx serve .`) and open it in the browser.

## Testing

There is no test suite. Verify changes by playing the game in the browser (check the browser console for errors, and manually exercise movement, rotation, line-clear, level-up, pause, and game-over/restart).

## Architecture (`game.js`)

Everything lives in one file, `game.js`, as a flat set of functions plus module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, ...).

- **Board**: a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index `1–7`.
- **Pieces**: `PIECES[type]` are square matrices; `rotateCW` rotates via transpose + row reversal.
- **Collision**: `collide(shape, ox, oy)` checks board bounds and existing filled cells.
- **Wall kicks**: `tryRotate` retries the rotated shape at x offsets `[0, -1, 1, -2, 2]` before giving up.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates elapsed time in `dropAccum`, and drops the piece one row once `dropAccum >= dropInterval`.
- **Line clears**: `clearLines()` scans bottom-up, splices out full rows and unshifts empty ones at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` (indexed by lines cleared at once) × `level`; hard drop adds 2 points/cell dropped, soft drop adds 1 point/row.
- **Leveling**: `level` increases every 10 lines; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece**: `ghostY()` projects the current piece straight down; drawn at `globalAlpha = 0.2`.

Tunable constants at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, the `<canvas id="board">` `width`/`height` in `index.html` must be updated to match (`COLS × BLOCK`, `ROWS × BLOCK`).

See `README.md` (Spanish) for controls and a fuller walkthrough.
