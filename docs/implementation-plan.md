# 3-Lane Auto Shooter Runner Implementation Plan

## Goal

Build a browser-playable clone of the common ad-style 3-lane forward runner:

- The player squad advances automatically through three lanes.
- Enemies approach from the front.
- The squad fires automatically and defeats enemies while moving.
- Gates and pickups increase or decrease squad size.
- The game is immediately playable from the first screen.

The implementation will use a lightweight HTML/CSS/JavaScript app so the repo can run without a package install step.

## Core Game Design

### View And Controls

- Portrait-friendly runner board with three fixed lanes.
- The player controls lateral lane movement only.
- Desktop controls: `ArrowLeft`, `ArrowRight`, `A`, `D`.
- Touch controls: swipe left/right and on-screen lane buttons.
- The forward motion is represented by enemies, gates, and pickups moving down the playfield toward the player.

### Player Squad

- Squad size starts at 5.
- Active squad size is clamped between 0 and 99.
- Any operation that reduces squad size to 0 immediately ends the run.
- Each squad member contributes fire rate and visual density.
- If squad size reaches 0, the run ends.
- The squad remains in one lane, with members rendered as a compact formation.

### Auto Fire

- The squad fires automatically at a fixed interval.
- Bullets travel upward in the current lane.
- One bullet is created per interval, and its damage is `max(1, floor(squadSize / 2))`.
- Bullets hit the nearest enemy in the same lane.

### Enemies

- Enemies spawn in random lanes.
- Each enemy has health, speed, and contact damage.
- Enemy difficulty increases over time.
- If an enemy reaches the squad in the same lane, it reduces squad size by its contact damage and disappears.
- Contact damage is applied before clamping and game-over evaluation.

### Gates And Items

- Gates occupy one lane and apply an operation on contact:
  - `+N`: add members.
  - `-N`: remove members.
  - `xN`: multiply squad size.
  - `/N`: divide squad size, rounded down.
- Pickups may add a small fixed count.
- Negative gates are allowed but should be visually distinct.
- Gate/item effects are applied once, then removed.
- Only the gate or pickup in the player's current lane applies.
- Gates, pickups, and enemies should not intentionally spawn in overlapping positions.
- If multiple objects reach the player on the same frame, resolve enemy contact first, then gates, then pickups.

### Run Progression

- Score increases from distance and defeated enemies.
- Difficulty ramps by increasing spawn rate, enemy health, and enemy speed.
- A run ends when squad size reaches 0.
- The player can restart immediately.

## Implementation Steps

### Step 1: Specification And Project Plan

Deliverables:

- This implementation plan.
- Documented feature slices and validation strategy.
- Initial draft PR.

Validation:

- Markdown review for scope clarity.

### Step 2: Playable App Foundation

Deliverables:

- Static web app entrypoint.
- Canvas or DOM playfield with three lanes.
- Game state loop.
- Player lane movement.
- Restartable run shell.
- Pure state module scaffolding for deterministic tests.
- Browser-runnable test harness for state helpers.

Validation:

- Manual browser smoke test.
- Deterministic tests for lane movement, squad clamping, and reset state.

### Step 3: Combat And Enemy Loop

Deliverables:

- Enemy spawning and movement.
- Auto fire bullets.
- Collision detection.
- Score and defeat handling.
- Game over when enemies deplete the squad.

Validation:

- Manual gameplay test.
- Unit-level checks for collision and damage helpers.

### Step 4: Gates, Pickups, Difficulty, And Polish

Deliverables:

- Additive, subtractive, multiply, and divide gates.
- Pickup items.
- Difficulty ramp.
- UI polish for score, squad count, controls, and end state.
- Mobile-friendly layout.

Validation:

- Manual desktop and mobile viewport checks.
- Unit-level checks for gate math and clamping.

### Step 5: Final Review, Test, PR Ready, And Merge

Deliverables:

- Independent review agent notes added to the PR.
- Independent QA agent notes added to the PR.
- All local tests passing.
- PR marked ready for review.
- PR merged to `main`.

Validation:

- Full local smoke test.
- Repository status clean after merge.

## File Structure Target

```text
/
  index.html
  src/
    game.js
    state.js
    render.js
    styles.css
    tests.js
  docs/
    implementation-plan.md
```

## Acceptance Criteria

- Opening `index.html` starts a playable 3-lane auto-shooter runner.
- The player can move between exactly three lanes.
- Enemies approach from the front and can be defeated by automatic fire.
- Enemy contact reduces squad size.
- Gates and pickups visibly alter squad size.
- Score, squad count, and game-over/restart states are visible.
- The game works with keyboard and touch/mouse controls.
- Restart returns the run to the initial state without a page reload.
- Desktop smoke test passes at 1280x720.
- Mobile smoke test passes at 390x844.
- Core deterministic tests pass.
- A short run has no browser console errors.
