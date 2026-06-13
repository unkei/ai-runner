# Crowd Clash Runner Implementation Plan

## Goal

Build a browser-playable crowd-clash runner inspired by ad-style mobile games:

- The player controls a blue crowd moving forward on a 3D-feeling track.
- Movement is free on the horizontal axis, not snapped to lanes.
- Gates appear as two side-by-side choices that increase or decrease crowd size.
- Player and enemy crowds do not shoot bullets. On contact, matching characters cancel one-for-one.
- Later stages introduce archer enemies that fire arrows.
- The final stretch introduces a large boss that requires dozens of characters to cancel out.
- The run can be restarted immediately from the end state.

The implementation remains a lightweight HTML/CSS/JavaScript app with deterministic state helpers and no install step beyond the existing npm scripts.

## Delivery Rule

For future feature work in this repository, use this workflow unless the user explicitly overrides it:

1. Write or update an implementation specification plan first. Ask clarifying questions only when a reasonable implementation choice would be risky.
2. Split work into coherent steps. For each step, create a `codex/...` branch.
3. Use agents for implementation, review, and testing when the work is large enough to benefit from parallel checks.
4. Commit the completed step.
5. Push the branch and create a draft PR as soon as a branch has a meaningful commit.
6. Add implementation, review, and test notes as PR comments.
7. When validation is complete, mark the PR ready for review.
8. Merge the PR into `main`.
9. Repeat for the next step until the requested work is complete.

## Current Feature Slice

This slice converts the original 3-lane auto-shooter into the requested crowd-clash runner.

### Player And Controls

- Squad size starts at `12`.
- Active squad size is clamped between `0` and `180`.
- Horizontal position is continuous within the track bounds.
- Desktop controls:
  - `ArrowLeft` / `A`: move left while held.
  - `ArrowRight` / `D`: move right while held.
  - `Enter` or `Space`: restart from game over.
- Pointer controls:
  - Drag or tap the canvas to move directly to a horizontal position.
  - Hold the on-screen left/right buttons for continuous movement.
- The player is never aligned to three fixed lanes.

### Crowd Collision

- Player and enemy groups collide by count.
- If a player crowd of `P` meets an enemy crowd of `E`, both lose `min(P, E)`.
- If the player reaches `0`, the run ends.
- If the enemy still has remaining count, that enemy group persists.
- Score includes distance and defeated enemy counts.

### Gates

- Gates spawn as a pair of two choices, visually separated left and right.
- The selected gate is based on the player's free horizontal position.
- Applying one choice removes the paired unchosen gate.
- Supported operations:
  - `+N`: add members.
  - `-N`: remove members.
  - `xN` / `*N`: multiply members.
  - `/N`: divide members, rounded down.

### Enemy Progression

- Grunt enemies appear from the front in early stages.
- Starting from stage 2, some enemies are archers.
- Archers periodically fire arrows while still far enough from the player.
- Arrows remove one squad member on contact.
- Starting from stage 4, one boss spawns.
- The boss is a large enemy group sized to require dozens of player characters to cancel.

### Visual Direction

- Canvas rendering uses a portrait track with perspective-like scaling.
- Blue stick-figure crowds represent the player.
- Red/orange stick-figure crowds represent enemies.
- Count bubbles float over crowds.
- Gate bars match the two-choice visual pattern in the reference images.

## Implementation Steps Completed In This Slice

### Step 1: Specification And Delivery Rule

Deliverables:

- This plan updated from the old 3-lane shooter design to the current crowd-clash design.
- Delivery workflow rule documented.

Validation:

- Markdown scope review.

### Step 2: State Model Rewrite

Deliverables:

- Continuous `playerX` state.
- Two-choice gate pairs.
- One-for-one crowd collision.
- Arrow projectiles only for archer enemies.
- Boss spawn state.
- Deterministic helpers for tests.

Validation:

- Unit tests cover movement, gates, collision, arrows, boss spawn, and reset.

### Step 3: Rendering And Input Rewrite

Deliverables:

- Pseudo-3D canvas track.
- Stick-figure crowd rendering.
- Free horizontal pointer movement.
- Hold-to-move keyboard and button controls.
- Game-over overlay restart from click/tap/keyboard/button.

Validation:

- Browser smoke test checks no console errors and no horizontal overflow.
- Restart returns the run to the initial state.

### Step 4: Review, Test, PR, And Merge

Deliverables:

- Implementation agent notes.
- Review agent notes.
- Test agent notes.
- Commit, push, draft PR, PR comments, ready-for-review transition, and merge.

Validation:

- `npm test`
- Browser smoke test at the local development URL.
- Repository status clean after merge.

## File Structure

```text
/
  index.html
  src/
    game.js
    state.js
    styles.css
    tests.js
  docs/
    implementation-plan.md
```

## Acceptance Criteria

- The game is playable immediately from the first screen.
- The player controls a blue crowd of stick-figure characters.
- Movement is free left/right and not lane-snapped.
- Gates present two choices and alter squad size.
- The squad does not fire bullets.
- Enemy contact cancels equal numbers from both sides.
- Later stages include archer enemies that fire arrows.
- The final stage includes a large boss that cancels against many squad members.
- Restart works from the game-over screen without a page reload.
- Desktop browser smoke has no console errors.
- The layout has no horizontal overflow.
- Deterministic tests pass.
