# Gameplay Motion Tuning Plan

## Current And Requested Behavior

The current game lets every ally fire on a staggered interval between 0.52 and 0.98 seconds. Allies are reflowed into exact formation coordinates whenever the state advances, so they appear planted instead of walking independently. Gates and their number labels advance using world distance, while the track bands use a separate fixed pixel-scroll formula; the two visual speeds do not agree.

The requested behavior is:

- each ally must wait at least one second between shots;
- allies should wander independently with deterministic, random-looking lateral movement;
- allies that wander beyond a track edge should fall off and be removed from the squad;
- track bands and gate labels should be projected from the same world-distance model so their forward motion stays synchronized.

## Scope

### In Scope

- Set the reusable ally firing interval to one second while retaining staggered initial shots.
- Add per-ally wander state and advance it during normal game ticks.
- Remove allies that cross the left or right track boundary and end the run if none remain.
- Preserve each survivor's wander state when the player moves, a gate changes squad size, or damage/contact removes allies.
- Animate stick-figure limbs from elapsed time and ally identity so lateral movement reads as walking.
- Derive road-band positions from the same world-distance projection used by gates.
- Add deterministic state tests and update gameplay documentation.

### Out Of Scope

- Changes to enemy movement, enemy firing cadence, spawn balance, gate arithmetic, stage length, or player controls.
- New art assets, audio, physics, or a general animation framework.
- Changing the course speed or the gate approach duration.

## State Model And Rendering Changes

- Allies gain a lateral wander velocity and a deterministic time until their next direction change. New allies receive values derived from their stable id and formation index.
- Formation reflow updates formation metadata and the vertical row position, but preserves each ally's live lateral displacement instead of resetting it on every tick.
- Normal ticks update player input first, then advance ally wander. Crossing `TRACK_MIN_X` or `TRACK_MAX_X` removes that ally and cleans up projectiles targeting removed allies.
- Successful firing resets `fireCooldown` to exactly `1` second. Initial cooldowns remain deterministically staggered within the first second.
- Stick figures receive a gait phase; arms and legs alternate based on elapsed time and entity id.
- Road bands are represented as fixed repeating world-distance markers ahead of the player. Their screen Y coordinate is calculated with `projectGateY`, making their motion identical to gates and labels at equal world distances.

## Deterministic Test Cases And Browser Validation

Automated state tests will verify:

1. an ally that fires cannot fire again before one full second and can fire at one second;
2. allies initialized with different ids have varied wander timing/direction;
3. wander movement changes lateral positions without resetting the formation's vertical layout;
4. an ally crossing either track edge is removed, targeted enemy projectiles are cleaned up, and losing the last ally ends the run;
5. road-marker projection and gate projection return the same Y value for the same world distance;
6. existing movement, combat, gate, projectile, boss, reset, and spawn tests remain green.

Browser validation will cover:

- the browser harness reports all tests passing;
- desktop at 1280x720 shows walking allies, synchronized road/gate motion, and no console errors;
- mobile at 390x844 has no horizontal overflow;
- restart restores the initial squad and running state.

## Ordered Implementation Steps And Commit Boundaries

1. **Plan** — add this implementation plan and open the draft pull request.
2. **State and tests** — implement the one-second cooldown, ally wander/fall behavior, shared road projection helper, and deterministic unit coverage.
3. **Rendering and documentation** — animate walking poses, render projected road bands, and document the tuned gameplay.
4. **Review and validation** — review the complete diff, resolve blocking findings, run automated/browser checks, update the pull request, and merge only after all requirements pass.

## Acceptance Criteria

- No ally fires more often than once per second after firing.
- Individual allies visibly drift rather than remaining locked to static X positions.
- An ally is removed once its center crosses either track boundary; the run ends when this removes the final ally.
- Road bands and gate labels at the same world distance share the same projected movement.
- Walking animation is visible during play without changing collision coordinates.
- Existing controls and combat remain functional.
- Automated tests and required desktop/mobile browser checks pass.
- The pull request is reviewed, marked ready, merged, and local `main` is fast-forwarded to clean `origin/main`.

## Risks And Assumptions

- "Screen edge" is interpreted as the playable track boundary, because characters outside it are no longer on the course; canvas and HUD bounds are not gameplay coordinates.
- Random walking must remain testable, so it uses deterministic id-based variation rather than consuming spawn randomness each frame.
- Wander speed must be low enough to preserve player steering as the dominant control, but high enough to be visually apparent.
- Removing allies at track edges can reduce squad size without enemy contact; this is intentional and will use the existing game-over rule.
